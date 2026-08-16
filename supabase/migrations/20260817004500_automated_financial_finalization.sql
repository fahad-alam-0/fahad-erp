-- Migration 010: Automated Safe & Idempotent Repair Financial Finalization Architecture
-- Description: Implements private.try_auto_finalize_repair_financials and hooks it into private.add_repair_payment and private.update_repair_status.
-- Automatically generates immutable profit snapshots when a repair job is assigned, fully paid, and reaches READY_FOR_PICKUP or DELIVERED status.

-- 1. Helper function for automated idempotent finalization
CREATE OR REPLACE FUNCTION private.try_auto_finalize_repair_financials(
    p_repair_id uuid
)
RETURNS boolean AS $$
DECLARE
    v_repair public.repair_jobs%ROWTYPE;
    v_tech_profile public.profiles%ROWTYPE;
    v_service_revenue numeric(12,2);
    v_parts_cost numeric(12,2);
    v_net_profit numeric(12,2);
    v_total_payments numeric(12,2);
    v_owner_pct numeric(5,2);
    v_tech_pct numeric(5,2);
    v_owner_share numeric(12,2);
    v_tech_share numeric(12,2);
    v_snapshot_id uuid;
BEGIN
    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- IDEMPOTENCY CHECK: If already finalized, do nothing!
    IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
        RETURN false;
    END IF;

    -- REQUIREMENT CHECKS: Must be assigned, non-cancelled, and in READY_FOR_PICKUP or DELIVERED
    IF v_repair.technician_id IS NULL THEN
        RETURN false;
    END IF;

    IF v_repair.status IN ('CANCELLED'::public.repair_status, 'RECEIVED'::public.repair_status) THEN
        RETURN false;
    END IF;

    IF v_repair.status NOT IN ('READY_FOR_PICKUP'::public.repair_status, 'DELIVERED'::public.repair_status) THEN
        RETURN false;
    END IF;

    v_service_revenue := COALESCE(v_repair.service_revenue, v_repair.quoted_amount, 0);
    IF v_service_revenue <= 0 THEN
        RETURN false;
    END IF;

    -- Verify total payments collected equal or exceed service revenue
    SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
    FROM public.repair_payments
    WHERE repair_id = p_repair_id;

    IF v_total_payments < v_service_revenue THEN
        RETURN false; -- Not fully paid yet
    END IF;

    -- Calculate total parts cost
    SELECT COALESCE(SUM(total_cost), 0) INTO v_parts_cost
    FROM public.repair_parts
    WHERE repair_id = p_repair_id;

    v_net_profit := GREATEST(0, v_service_revenue - v_parts_cost);

    -- Read assigned technician profile role
    SELECT * INTO v_tech_profile
    FROM public.profiles
    WHERE id = v_repair.technician_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF v_tech_profile.role = 'OWNER'::public.user_role THEN
        v_owner_pct := 100.00;
        v_tech_pct := 0.00;
        v_owner_share := v_net_profit;
        v_tech_share := 0.00;
    ELSIF v_tech_profile.role = 'TECHNICIAN'::public.user_role THEN
        v_owner_pct := 30.00;
        v_tech_pct := 70.00;
        v_tech_share := ROUND(v_net_profit * 0.70, 2);
        v_owner_share := v_net_profit - v_tech_share;
    ELSE
        RETURN false;
    END IF;

    -- Insert immutable profit snapshot
    INSERT INTO public.repair_profit_snapshots (
        repair_id,
        technician_id,
        service_revenue,
        parts_cost,
        net_repair_profit,
        owner_percentage,
        technician_percentage,
        owner_share,
        technician_share,
        finalized_by
    ) VALUES (
        p_repair_id,
        v_repair.technician_id,
        v_service_revenue,
        v_parts_cost,
        v_net_profit,
        v_owner_pct,
        v_tech_pct,
        v_owner_share,
        v_tech_share,
        COALESCE(auth.uid(), v_repair.created_by)
    ) RETURNING id INTO v_snapshot_id;

    -- Update repair job status to FINALIZED and PAID
    UPDATE public.repair_jobs
    SET financial_status = 'FINALIZED'::public.repair_financial_status,
        payment_status = 'PAID'::public.repair_payment_status,
        service_revenue = v_service_revenue,
        updated_at = now()
    WHERE id = p_repair_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Hook auto-finalization into private.add_repair_payment
CREATE OR REPLACE FUNCTION private.add_repair_payment(
    p_repair_id uuid,
    p_payment_method text,
    p_amount numeric(12,2),
    p_payment_reference text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_repair public.repair_jobs%ROWTYPE;
    v_total_payments numeric(12,2);
    v_method public.payment_method;
    v_payment_id uuid;
    v_auto_finalized boolean := false;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    IF v_repair.status = 'CANCELLED'::public.repair_status THEN
        RAISE EXCEPTION 'Cannot record payment for a CANCELLED repair job';
    END IF;

    BEGIN
        v_method := p_payment_method::public.payment_method;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
    END;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
    FROM public.repair_payments
    WHERE repair_id = p_repair_id;

    IF v_repair.service_revenue > 0 AND (v_total_payments + p_amount) > v_repair.service_revenue THEN
        RAISE EXCEPTION 'Total payments (%) cannot exceed service revenue (%)', (v_total_payments + p_amount), v_repair.service_revenue;
    END IF;

    INSERT INTO public.repair_payments (
        repair_id,
        payment_method,
        amount,
        payment_reference,
        notes,
        created_by
    ) VALUES (
        p_repair_id,
        v_method,
        p_amount,
        trim(p_payment_reference),
        trim(p_notes),
        v_user_id
    ) RETURNING id INTO v_payment_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
    FROM public.repair_payments
    WHERE repair_id = p_repair_id;

    IF v_repair.service_revenue > 0 AND v_total_payments >= v_repair.service_revenue THEN
        UPDATE public.repair_jobs
        SET payment_status = 'PAID'::public.repair_payment_status,
            updated_at = now()
        WHERE id = p_repair_id;
    END IF;

    -- Attempt automated safe finalization if condition is met
    v_auto_finalized := private.try_auto_finalize_repair_financials(p_repair_id);

    v_result := jsonb_build_object(
        'payment_id', v_payment_id,
        'repair_id', p_repair_id,
        'total_payments', v_total_payments,
        'service_revenue', v_repair.service_revenue,
        'auto_finalized', v_auto_finalized
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Hook auto-finalization into private.update_repair_status
CREATE OR REPLACE FUNCTION private.update_repair_status(
    p_repair_id uuid,
    p_new_status text,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_user_role public.user_role;
    v_repair public.repair_jobs%ROWTYPE;
    v_target_status public.repair_status;
    v_history_id uuid;
    v_auto_finalized boolean := false;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    BEGIN
        v_target_status := p_new_status::public.repair_status;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid repair status: %', p_new_status;
    END;

    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    IF v_repair.status = v_target_status THEN
        RAISE EXCEPTION 'Repair job is already in status %', p_new_status;
    END IF;

    IF v_repair.status = 'DELIVERED'::public.repair_status THEN
        RAISE EXCEPTION 'DELIVERED repair jobs cannot transition to another status';
    END IF;

    IF v_repair.status = 'CANCELLED'::public.repair_status THEN
        RAISE EXCEPTION 'CANCELLED repair jobs cannot transition to another status';
    END IF;

    v_user_role := private.get_current_user_role();

    IF private.is_staff() THEN
        IF v_target_status = 'CANCELLED'::public.repair_status THEN
            RAISE EXCEPTION 'STAFF cannot cancel repair jobs';
        END IF;
    ELSIF private.is_technician() THEN
        IF v_repair.technician_id IS NULL OR v_repair.technician_id <> v_user_id THEN
            RAISE EXCEPTION 'TECHNICIAN can only update status for repairs assigned to themselves';
        END IF;

        IF v_target_status = 'CANCELLED'::public.repair_status THEN
            RAISE EXCEPTION 'Only an OWNER may cancel repair jobs';
        END IF;
    ELSIF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Unauthorized role for status update';
    END IF;

    UPDATE public.repair_jobs
    SET status = v_target_status,
        updated_at = now()
    WHERE id = p_repair_id;

    INSERT INTO public.repair_status_history (
        repair_id,
        old_status,
        new_status,
        notes,
        changed_by
    ) VALUES (
        p_repair_id,
        v_repair.status,
        v_target_status,
        trim(p_notes),
        v_user_id
    ) RETURNING id INTO v_history_id;

    -- Attempt automated safe finalization if condition is met
    v_auto_finalized := private.try_auto_finalize_repair_financials(p_repair_id);

    v_result := jsonb_build_object(
        'repair_id', p_repair_id,
        'old_status', v_repair.status,
        'new_status', v_target_status,
        'history_id', v_history_id,
        'auto_finalized', v_auto_finalized
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

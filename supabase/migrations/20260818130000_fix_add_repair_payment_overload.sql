-- Migration 022: Fix add_repair_payment RPC Function Overload Ambiguity
-- Description: Safely drops all obsolete text/numeric overloaded variants of add_repair_payment
-- and establishes a single canonical enum-based procedure:
-- private.add_repair_payment(uuid, public.payment_method, numeric, text, text)
-- and public.add_repair_payment(uuid, public.payment_method, numeric, text, text).

-- 1. SAFELY DROP ALL OBSOLETE / CONFLICTING OVERLOADS IN PRIVATE & PUBLIC SCHEMAS
DROP FUNCTION IF EXISTS private.add_repair_payment(uuid, text, numeric, text, text);
DROP FUNCTION IF EXISTS private.add_repair_payment(uuid, numeric, numeric, text, text);
DROP FUNCTION IF EXISTS private.add_repair_payment(uuid, public.payment_method, numeric, text, text);

DROP FUNCTION IF EXISTS public.add_repair_payment(uuid, text, numeric, text, text);
DROP FUNCTION IF EXISTS public.add_repair_payment(uuid, numeric, numeric, text, text);
DROP FUNCTION IF EXISTS public.add_repair_payment(uuid, public.payment_method, numeric, text, text);

-- 2. CREATE CANONICAL PRIVATE FUNCTION
CREATE OR REPLACE FUNCTION private.add_repair_payment(
    p_repair_id uuid,
    p_payment_method public.payment_method,
    p_amount numeric(12,2),
    p_payment_reference text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_repair public.repair_jobs%ROWTYPE;
    v_existing_payments numeric(12,2);
    v_total_payments numeric(12,2);
    v_remaining_due numeric(12,2);
    v_payment_id uuid;
    v_new_payment_status public.repair_payment_status;
    v_auto_finalized boolean := false;
    v_result jsonb;
BEGIN
    -- 1. Authentication & Active User Verification
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to record repair payments';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    -- 2. Validate Payment Amount
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    -- 3. Deterministic Row Locking
    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    -- 4. Terminal Status Checks
    IF v_repair.status = 'CANCELLED'::public.repair_status THEN
        RAISE EXCEPTION 'Cannot record payment for a CANCELLED repair job';
    END IF;

    IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
        RAISE EXCEPTION 'Cannot record payment for a financially FINALIZED repair job';
    END IF;

    -- 5. Calculate Existing Payments & Prevent Overpayment
    SELECT COALESCE(SUM(amount), 0) INTO v_existing_payments
    FROM public.repair_payments
    WHERE repair_id = p_repair_id;

    v_remaining_due := GREATEST(0, COALESCE(v_repair.service_revenue, v_repair.quoted_amount, 0) - v_existing_payments);

    IF (v_repair.service_revenue > 0 OR v_repair.quoted_amount > 0) AND (v_existing_payments + p_amount) > COALESCE(v_repair.service_revenue, v_repair.quoted_amount, 0) THEN
        RAISE EXCEPTION 'Payment amount (%) exceeds remaining balance due (%)', p_amount, v_remaining_due;
    END IF;

    -- 6. Insert Repair Payment Record
    INSERT INTO public.repair_payments (
        repair_id,
        payment_method,
        amount,
        payment_reference,
        notes,
        created_by
    ) VALUES (
        p_repair_id,
        p_payment_method,
        p_amount,
        trim(p_payment_reference),
        trim(p_notes),
        v_user_id
    ) RETURNING id INTO v_payment_id;

    -- 7. Recalculate Total Payments
    v_total_payments := v_existing_payments + p_amount;

    -- 8. Update Payment Status on Repair Job
    v_new_payment_status := CASE
        WHEN COALESCE(v_repair.service_revenue, v_repair.quoted_amount, 0) > 0 AND v_total_payments >= COALESCE(v_repair.service_revenue, v_repair.quoted_amount, 0) THEN 'PAID'::public.repair_payment_status
        ELSE 'UNPAID'::public.repair_payment_status
    END;

    UPDATE public.repair_jobs
    SET payment_status = v_new_payment_status,
        updated_at = now()
    WHERE id = p_repair_id;

    -- 9. Attempt Idempotent Automated Financial Finalization
    IF EXISTS (
        SELECT 1 FROM pg_proc
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE pg_namespace.nspname = 'private' AND pg_proc.proname = 'try_auto_finalize_repair_financials'
    ) THEN
        v_auto_finalized := private.try_auto_finalize_repair_financials(p_repair_id);
    END IF;

    -- 10. Build Result JSON
    v_result := jsonb_build_object(
        'payment_id', v_payment_id,
        'repair_id', p_repair_id,
        'amount', p_amount,
        'payment_method', p_payment_method,
        'total_payments', v_total_payments,
        'service_revenue', v_repair.service_revenue,
        'payment_status', v_new_payment_status,
        'auto_finalized', v_auto_finalized
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. CREATE PUBLIC DELEGATE WRAPPER FUNCTION
CREATE OR REPLACE FUNCTION public.add_repair_payment(
    p_repair_id uuid,
    p_payment_method public.payment_method,
    p_amount numeric(12,2),
    p_payment_reference text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
BEGIN
    RETURN private.add_repair_payment(
        p_repair_id,
        p_payment_method,
        p_amount,
        p_payment_reference,
        p_notes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. GRANT EXPLICIT PERMISSIONS
REVOKE EXECUTE ON FUNCTION private.add_repair_payment(uuid, public.payment_method, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.add_repair_payment(uuid, public.payment_method, numeric, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.add_repair_payment(uuid, public.payment_method, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_repair_payment(uuid, public.payment_method, numeric, text, text) TO authenticated;

-- 5. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

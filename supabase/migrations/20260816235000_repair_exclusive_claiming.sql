-- Migration 009: Shared Repair Queue & Atomic Exclusive Claiming Architecture
-- Description: Updates repair intake to initialize as UNASSIGNED, updates RLS for shared queue visibility, and implements atomic private.claim_repair procedure.

-- 1. Refresh RLS Policy for Shared Repair Queue Visibility
DROP POLICY IF EXISTS repair_jobs_select ON public.repair_jobs;
DROP POLICY IF EXISTS repair_jobs_all_roles_select ON public.repair_jobs;

CREATE POLICY repair_jobs_all_roles_select ON public.repair_jobs
    FOR SELECT TO authenticated
    USING (
        private.is_owner()
        OR private.is_staff()
        OR (private.is_technician() AND (technician_id IS NULL OR technician_id = auth.uid()))
    );

-- 2. Update private.create_repair_job to Default Tickets as UNASSIGNED
CREATE OR REPLACE FUNCTION private.create_repair_job(
    p_customer_id uuid,
    p_device_type text,
    p_device_brand text,
    p_reported_problem text,
    p_device_model text DEFAULT NULL,
    p_serial_number text DEFAULT NULL,
    p_intake_notes text DEFAULT NULL,
    p_expected_completion_at timestamptz DEFAULT NULL,
    p_quoted_amount numeric(12,2) DEFAULT NULL,
    p_discount numeric(12,2) DEFAULT 0,
    p_technician_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_user_role public.user_role;
    v_effective_tech_id uuid := NULL;
    v_job_id uuid;
    v_job_number text;
    v_service_revenue numeric(12,2) := 0;
    v_tech_role public.user_role;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;

    IF p_device_type IS NULL OR trim(p_device_type) = '' THEN
        RAISE EXCEPTION 'Device type is required';
    END IF;

    IF p_device_brand IS NULL OR trim(p_device_brand) = '' THEN
        RAISE EXCEPTION 'Device brand is required';
    END IF;

    IF p_reported_problem IS NULL OR trim(p_reported_problem) = '' THEN
        RAISE EXCEPTION 'Reported problem is required';
    END IF;

    IF p_quoted_amount IS NOT NULL AND p_quoted_amount < 0 THEN
        RAISE EXCEPTION 'Quoted amount cannot be negative';
    END IF;

    IF p_discount IS NULL OR p_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative';
    END IF;

    IF p_quoted_amount IS NOT NULL AND p_discount > p_quoted_amount THEN
        RAISE EXCEPTION 'Discount (%) cannot exceed quoted amount (%)', p_discount, p_quoted_amount;
    END IF;

    v_user_role := private.get_current_user_role();

    -- SHARED QUEUE PRINCIPLE: New repairs start UNASSIGNED unless explicitly assigned by OWNER
    IF p_technician_id IS NOT NULL THEN
        IF NOT private.is_owner() THEN
            RAISE EXCEPTION 'Only an OWNER may assign a technician during repair job creation';
        END IF;

        SELECT role INTO v_tech_role
        FROM public.profiles
        WHERE id = p_technician_id AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Technician profile not found or inactive';
        END IF;

        IF v_tech_role NOT IN ('OWNER'::public.user_role, 'TECHNICIAN'::public.user_role) THEN
            RAISE EXCEPTION 'Only an OWNER or TECHNICIAN profile may be assigned to a repair';
        END IF;
        v_effective_tech_id := p_technician_id;
    END IF;

    v_service_revenue := CASE
        WHEN p_quoted_amount IS NOT NULL THEN (p_quoted_amount - p_discount)
        ELSE 0
    END;

    v_job_number := 'REP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('private.repair_job_number_seq')::text, 6, '0');

    INSERT INTO public.repair_jobs (
        job_number,
        customer_id,
        device_type,
        device_brand,
        device_model,
        serial_number,
        reported_problem,
        intake_notes,
        technician_id,
        received_at,
        expected_completion_at,
        quoted_amount,
        discount,
        service_revenue,
        status,
        payment_status,
        financial_status,
        created_by
    ) VALUES (
        v_job_number,
        p_customer_id,
        trim(p_device_type),
        trim(p_device_brand),
        trim(p_device_model),
        trim(p_serial_number),
        trim(p_reported_problem),
        trim(p_intake_notes),
        v_effective_tech_id,
        now(),
        p_expected_completion_at,
        p_quoted_amount,
        p_discount,
        v_service_revenue,
        'RECEIVED'::public.repair_status,
        'UNPAID'::public.repair_payment_status,
        'PENDING'::public.repair_financial_status,
        v_user_id
    ) RETURNING id INTO v_job_id;

    INSERT INTO public.repair_status_history (
        repair_id,
        old_status,
        new_status,
        notes,
        changed_by
    ) VALUES (
        v_job_id,
        NULL,
        'RECEIVED'::public.repair_status,
        'Initial intake ticket created (Unassigned Shared Queue)',
        v_user_id
    );

    v_result := jsonb_build_object(
        'repair_id', v_job_id,
        'job_number', v_job_number,
        'status', 'RECEIVED',
        'service_revenue', v_service_revenue,
        'assigned_technician_id', v_effective_tech_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION private.create_repair_job(uuid, text, text, text, text, text, text, timestamptz, numeric, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_repair_job(uuid, text, text, text, text, text, text, timestamptz, numeric, numeric, uuid) TO authenticated;


-- 3. Atomic Exclusive Claim Stored Procedure
CREATE OR REPLACE FUNCTION private.claim_repair(
    p_repair_id uuid
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_user_role public.user_role;
    v_repair public.repair_jobs%ROWTYPE;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    v_user_role := private.get_current_user_role();
    IF v_user_role NOT IN ('OWNER'::public.user_role, 'TECHNICIAN'::public.user_role) THEN
        RAISE EXCEPTION 'Only an OWNER or TECHNICIAN profile may claim a repair job';
    END IF;

    -- Atomic row lock FOR UPDATE
    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    IF v_repair.status = 'CANCELLED'::public.repair_status THEN
        RAISE EXCEPTION 'Cannot claim a CANCELLED repair job';
    END IF;

    IF v_repair.status = 'DELIVERED'::public.repair_status THEN
        RAISE EXCEPTION 'Cannot claim a DELIVERED repair job';
    END IF;

    -- CRITICAL EXCLUSIVE CLAIM CHECK
    IF v_repair.technician_id IS NOT NULL THEN
        IF v_repair.technician_id = v_user_id THEN
            RAISE EXCEPTION 'You have already claimed this repair job';
        ELSE
            RAISE EXCEPTION 'Repair job has already been claimed by another specialist';
        END IF;
    END IF;

    -- Update technician assignment atomically
    UPDATE public.repair_jobs
    SET technician_id = v_user_id,
        updated_at = now()
    WHERE id = p_repair_id;

    -- Log status history entry for claim event
    INSERT INTO public.repair_status_history (
        repair_id,
        old_status,
        new_status,
        notes,
        changed_by
    ) VALUES (
        p_repair_id,
        v_repair.status,
        v_repair.status,
        'Repair job claimed by ' || v_user_role || ' (ID: ' || v_user_id || ')',
        v_user_id
    );

    v_result := jsonb_build_object(
        'repair_id', p_repair_id,
        'job_number', v_repair.job_number,
        'claimed_by', v_user_id,
        'role', v_user_role,
        'status', v_repair.status
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION private.claim_repair(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.claim_repair(uuid) TO authenticated;

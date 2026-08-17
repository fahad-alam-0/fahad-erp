-- Migration 016: Fix duplicate update_repair_status function overload
-- Description: Safely drops the duplicate text-overload private.update_repair_status(uuid, text, text)
-- and retains a single canonical enum-based function private.update_repair_status(uuid, public.repair_status, text).

-- 1. Safely drop the text-overload version
DROP FUNCTION IF EXISTS private.update_repair_status(uuid, text, text);

-- 2. Create/Replace the single canonical enum-based function
CREATE OR REPLACE FUNCTION private.update_repair_status(
    p_repair_id uuid,
    p_new_status public.repair_status,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_repair public.repair_jobs%ROWTYPE;
    v_old_status public.repair_status;
    v_history_id uuid;
    v_auto_finalized boolean := false;
    v_result jsonb;
BEGIN
    -- 1. Authentication check
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    -- 2. Lock repair job row for update
    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    v_old_status := v_repair.status;

    -- If status hasn't changed, return no-op result
    IF v_old_status = p_new_status THEN
        RETURN jsonb_build_object(
            'repair_id', p_repair_id,
            'old_status', v_old_status,
            'new_status', p_new_status,
            'updated', false,
            'auto_finalized', false
        );
    END IF;

    -- 3. Terminal state checks
    IF v_old_status = 'DELIVERED'::public.repair_status THEN
        RAISE EXCEPTION 'DELIVERED repair jobs cannot transition to another status';
    END IF;

    IF v_old_status = 'CANCELLED'::public.repair_status THEN
        RAISE EXCEPTION 'CANCELLED repair jobs cannot transition to another status';
    END IF;

    -- 4. Financial finalization immutability check
    IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
        IF NOT (v_old_status = 'READY_FOR_PICKUP'::public.repair_status AND p_new_status = 'DELIVERED'::public.repair_status) THEN
            RAISE EXCEPTION 'Financially FINALIZED repairs may only transition from READY_FOR_PICKUP to DELIVERED';
        END IF;
    END IF;

    -- 5. Role authorization check
    IF private.is_staff() THEN
        IF p_new_status = 'CANCELLED'::public.repair_status THEN
            RAISE EXCEPTION 'STAFF cannot cancel repair jobs';
        END IF;
    ELSIF private.is_technician() THEN
        IF v_repair.technician_id IS NULL OR v_repair.technician_id <> v_user_id THEN
            RAISE EXCEPTION 'TECHNICIAN can only update status for repairs assigned to themselves';
        END IF;

        IF p_new_status = 'CANCELLED'::public.repair_status THEN
            RAISE EXCEPTION 'Only an OWNER may cancel repair jobs';
        END IF;
    ELSIF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Unauthorized role for status update';
    END IF;

    -- 6. State machine workflow graph validation
    IF p_new_status = 'CANCELLED'::public.repair_status THEN
        IF NOT private.is_owner() THEN
            RAISE EXCEPTION 'Only an OWNER may cancel repair jobs';
        END IF;

        IF v_old_status IN ('DELIVERED'::public.repair_status, 'CANCELLED'::public.repair_status) THEN
            RAISE EXCEPTION 'Cannot cancel a DELIVERED or already CANCELLED repair';
        END IF;

        IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
            RAISE EXCEPTION 'Cannot cancel a financially FINALIZED repair';
        END IF;
    ELSE
        IF v_old_status = 'RECEIVED'::public.repair_status THEN
            IF p_new_status NOT IN ('DIAGNOSING'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from RECEIVED to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'DIAGNOSING'::public.repair_status THEN
            IF p_new_status NOT IN ('WAITING_FOR_PARTS'::public.repair_status, 'IN_REPAIR'::public.repair_status, 'READY_FOR_PICKUP'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from DIAGNOSING to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'WAITING_FOR_PARTS'::public.repair_status THEN
            IF p_new_status NOT IN ('IN_REPAIR'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from WAITING_FOR_PARTS to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'IN_REPAIR'::public.repair_status THEN
            IF p_new_status NOT IN ('WAITING_FOR_PARTS'::public.repair_status, 'TESTING'::public.repair_status, 'READY_FOR_PICKUP'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from IN_REPAIR to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'TESTING'::public.repair_status THEN
            IF p_new_status NOT IN ('WAITING_FOR_PARTS'::public.repair_status, 'IN_REPAIR'::public.repair_status, 'READY_FOR_PICKUP'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from TESTING to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'READY_FOR_PICKUP'::public.repair_status THEN
            IF p_new_status NOT IN ('DELIVERED'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from READY_FOR_PICKUP to %', p_new_status;
            END IF;
        END IF;
    END IF;

    -- 7. Execute status update
    UPDATE public.repair_jobs
    SET status = p_new_status,
        updated_at = now()
    WHERE id = p_repair_id;

    -- 8. Record status history
    INSERT INTO public.repair_status_history (
        repair_id,
        old_status,
        new_status,
        notes,
        changed_by
    ) VALUES (
        p_repair_id,
        v_old_status,
        p_new_status,
        trim(p_notes),
        v_user_id
    ) RETURNING id INTO v_history_id;

    -- 9. Attempt automated financial finalization if conditions met
    v_auto_finalized := private.try_auto_finalize_repair_financials(p_repair_id);

    -- 10. Build & return result JSON
    v_result := jsonb_build_object(
        'repair_id', p_repair_id,
        'old_status', v_old_status,
        'new_status', p_new_status,
        'history_id', v_history_id,
        'auto_finalized', v_auto_finalized,
        'updated', true
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Security Hardening
REVOKE EXECUTE ON FUNCTION private.update_repair_status(uuid, public.repair_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.update_repair_status(uuid, public.repair_status, text) TO authenticated;

-- Migration 018: Permanent User Deletion, Primary Ownership Transfer, and Admin Role Hierarchy
-- Created: 2026-08-17
-- Description: Adds 'ADMIN' value to user_role enum, updates private helper functions for Admin access, creates public.audit_logs table, creates private.delete_user_permanently transaction RPC, and creates private.transfer_primary_ownership RPC.

-- 1. ADD ADMIN VALUE TO USER_ROLE ENUM
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ADMIN';

-- 2. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    details jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. UPDATE ROLE CHECK HELPERS IN PRIVATE SCHEMA
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN private.get_current_user_role() = 'ADMIN'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_admin_or_owner()
RETURNS boolean AS $$
BEGIN
    RETURN private.get_current_user_role() IN ('OWNER'::public.user_role, 'ADMIN'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. UPDATE RLS POLICIES TO GRANT ADMIN FULL OPERATIONAL ACCESS
CREATE POLICY audit_logs_admin_owner_select ON public.audit_logs
    FOR SELECT TO authenticated
    USING (private.is_admin_or_owner());

-- Update Profiles Select to allow ADMIN to see all profiles
DROP POLICY IF EXISTS profiles_select_self_or_owner ON public.profiles;
CREATE POLICY profiles_select_all_authenticated ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

-- 5. PERMANENT USER DELETION RPC (ATOMIC TRANSACTION)
CREATE OR REPLACE FUNCTION private.delete_user_permanently(
    p_target_user_id uuid
)
RETURNS void AS $$
DECLARE
    v_caller_id uuid;
    v_target_role public.user_role;
    v_target_name text;
    v_repair_ids uuid[];
    v_sale_ids uuid[];
    v_purchase_ids uuid[];
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Only the Primary OWNER may permanently delete users';
    END IF;

    IF v_caller_id = p_target_user_id THEN
        RAISE EXCEPTION 'Primary ownership must be transferred before this account can be removed.';
    END IF;

    SELECT role, full_name INTO v_target_role, v_target_name
    FROM public.profiles
    WHERE id = p_target_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'Target user profile does not exist';
    END IF;

    IF v_target_role = 'OWNER'::public.user_role THEN
        RAISE EXCEPTION 'Primary ownership must be transferred before this account can be removed.';
    END IF;

    -- Collect all repair jobs assigned to or created by target user
    SELECT ARRAY_AGG(id) INTO v_repair_ids
    FROM public.repair_jobs
    WHERE technician_id = p_target_user_id OR created_by = p_target_user_id;

    -- A. Delete repair profit snapshots
    IF v_repair_ids IS NOT NULL AND array_length(v_repair_ids, 1) > 0 THEN
        DELETE FROM public.repair_profit_snapshots
        WHERE repair_id = ANY(v_repair_ids)
           OR technician_id = p_target_user_id
           OR finalized_by = p_target_user_id;
    ELSE
        DELETE FROM public.repair_profit_snapshots
        WHERE technician_id = p_target_user_id OR finalized_by = p_target_user_id;
    END IF;

    -- B. Delete repair status history
    IF v_repair_ids IS NOT NULL AND array_length(v_repair_ids, 1) > 0 THEN
        DELETE FROM public.repair_status_history
        WHERE repair_id = ANY(v_repair_ids) OR changed_by = p_target_user_id;
    ELSE
        DELETE FROM public.repair_status_history WHERE changed_by = p_target_user_id;
    END IF;

    -- C. Delete repair parts
    IF v_repair_ids IS NOT NULL AND array_length(v_repair_ids, 1) > 0 THEN
        DELETE FROM public.repair_parts
        WHERE repair_id = ANY(v_repair_ids) OR created_by = p_target_user_id;
    ELSE
        DELETE FROM public.repair_parts WHERE created_by = p_target_user_id;
    END IF;

    -- D. Delete repair payments
    IF v_repair_ids IS NOT NULL AND array_length(v_repair_ids, 1) > 0 THEN
        DELETE FROM public.repair_payments
        WHERE repair_id = ANY(v_repair_ids) OR created_by = p_target_user_id;
    ELSE
        DELETE FROM public.repair_payments WHERE created_by = p_target_user_id;
    END IF;

    -- E. Delete repair jobs
    IF v_repair_ids IS NOT NULL AND array_length(v_repair_ids, 1) > 0 THEN
        DELETE FROM public.repair_jobs
        WHERE id = ANY(v_repair_ids) OR technician_id = p_target_user_id OR created_by = p_target_user_id;
    ELSE
        DELETE FROM public.repair_jobs
        WHERE technician_id = p_target_user_id OR created_by = p_target_user_id;
    END IF;

    -- F. Delete sales created by target user
    SELECT ARRAY_AGG(id) INTO v_sale_ids
    FROM public.sales
    WHERE created_by = p_target_user_id;

    IF v_sale_ids IS NOT NULL AND array_length(v_sale_ids, 1) > 0 THEN
        DELETE FROM public.sale_items WHERE sale_id = ANY(v_sale_ids);
        DELETE FROM public.sale_payments WHERE sale_id = ANY(v_sale_ids);
        DELETE FROM public.sales WHERE id = ANY(v_sale_ids);
    END IF;

    -- G. Delete inventory movements & purchases created by target user
    DELETE FROM public.inventory_movements WHERE created_by = p_target_user_id;

    SELECT ARRAY_AGG(id) INTO v_purchase_ids
    FROM public.purchases
    WHERE created_by = p_target_user_id;

    IF v_purchase_ids IS NOT NULL AND array_length(v_purchase_ids, 1) > 0 THEN
        DELETE FROM public.purchase_items WHERE purchase_id = ANY(v_purchase_ids);
        DELETE FROM public.purchases WHERE id = ANY(v_purchase_ids);
    END IF;

    -- H. Record Audit Event
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
        v_caller_id,
        'PERMANENT_USER_DELETION',
        jsonb_build_object(
            'deleted_user_id', p_target_user_id,
            'deleted_user_name', v_target_name,
            'deleted_user_role', v_target_role,
            'timestamp', now()
        )
    );

    -- I. Delete Profile & Auth User
    DELETE FROM public.profiles WHERE id = p_target_user_id;
    DELETE FROM auth.users WHERE id = p_target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 6. PRIMARY OWNERSHIP TRANSFER RPC (ATOMIC TRANSACTION)
CREATE OR REPLACE FUNCTION private.transfer_primary_ownership(
    p_new_owner_id uuid
)
RETURNS void AS $$
DECLARE
    v_caller_id uuid;
    v_target_role public.user_role;
    v_target_active boolean;
    v_target_name text;
    v_caller_name text;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Only the current Primary OWNER may transfer primary ownership';
    END IF;

    IF v_caller_id = p_new_owner_id THEN
        RAISE EXCEPTION 'Target user is already the current Primary Owner';
    END IF;

    SELECT role, is_active, full_name INTO v_target_role, v_target_active, v_target_name
    FROM public.profiles
    WHERE id = p_new_owner_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'Target user profile does not exist';
    END IF;

    IF NOT v_target_active THEN
        RAISE EXCEPTION 'Primary ownership can only be transferred to an ACTIVE user account';
    END IF;

    SELECT full_name INTO v_caller_name
    FROM public.profiles
    WHERE id = v_caller_id;

    -- 1. Demote current owner to ADMIN
    UPDATE public.profiles
    SET role = 'ADMIN'::public.user_role,
        updated_at = now()
    WHERE id = v_caller_id;

    -- 2. Promote target user to OWNER
    UPDATE public.profiles
    SET role = 'OWNER'::public.user_role,
        updated_at = now()
    WHERE id = p_new_owner_id;

    -- 3. Record Audit Event
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
        v_caller_id,
        'OWNERSHIP_TRANSFER',
        jsonb_build_object(
            'previous_owner_id', v_caller_id,
            'previous_owner_name', v_caller_name,
            'new_owner_id', p_new_owner_id,
            'new_owner_name', v_target_name,
            'timestamp', now()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7. REFACTORED USER ROLE MODIFICATION RPC
CREATE OR REPLACE FUNCTION private.set_user_role(
    target_user_id uuid,
    new_role public.user_role
)
RETURNS void AS $$
DECLARE
    v_caller_id uuid;
    v_caller_role public.user_role;
    v_target_role public.user_role;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_caller_role := private.get_current_user_role();

    IF v_caller_role NOT IN ('OWNER'::public.user_role, 'ADMIN'::public.user_role) THEN
        RAISE EXCEPTION 'Only an active OWNER or ADMIN may modify user roles';
    END IF;

    SELECT role INTO v_target_role
    FROM public.profiles
    WHERE id = target_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'Target user profile does not exist';
    END IF;

    IF v_target_role = 'OWNER'::public.user_role OR new_role = 'OWNER'::public.user_role THEN
        RAISE EXCEPTION 'Primary OWNER role cannot be modified here. Use Primary Ownership Transfer instead.';
    END IF;

    -- ADMIN can only manage STAFF and TECHNICIAN roles
    IF v_caller_role = 'ADMIN'::public.user_role THEN
        IF v_target_role = 'ADMIN'::public.user_role OR new_role = 'ADMIN'::public.user_role THEN
            RAISE EXCEPTION 'Only the Primary OWNER can promote or demote ADMIN users.';
        END IF;
    END IF;

    UPDATE public.profiles
    SET role = new_role,
        updated_at = now()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 8. GRANT EXECUTE PRIVILEGES
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_or_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION private.delete_user_permanently(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.transfer_primary_ownership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_user_role(uuid, public.user_role) TO authenticated;

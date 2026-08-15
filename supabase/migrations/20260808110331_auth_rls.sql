-- Migration 003: Auth Foundation, Role Management, and RLS Security for Fahad ERP
-- Created: 2026-08-08
-- Description: Private role helpers, auto-profile trigger on auth.users, admin role promotion function, explicit table grants to authenticated, and non-recursive role-based RLS policies.

-- ====================================================
-- 1. ROLE HELPER FUNCTIONS IN PRIVATE SCHEMA
-- ====================================================

-- Get current user role safely without RLS recursion
CREATE OR REPLACE FUNCTION private.get_current_user_role()
RETURNS public.user_role AS $$
DECLARE
    v_role public.user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = true;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Check current user active status safely without RLS recursion
CREATE OR REPLACE FUNCTION private.is_current_user_active()
RETURNS boolean AS $$
DECLARE
    v_active boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    SELECT is_active INTO v_active
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN COALESCE(v_active, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Role check helpers
CREATE OR REPLACE FUNCTION private.is_owner()
RETURNS boolean AS $$
BEGIN
    RETURN private.get_current_user_role() = 'OWNER'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_technician()
RETURNS boolean AS $$
BEGIN
    RETURN private.get_current_user_role() = 'TECHNICIAN'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean AS $$
BEGIN
    RETURN private.get_current_user_role() = 'STAFF'::public.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ====================================================
-- 2. AUTOMATIC PROFILE CREATION TRIGGER
-- ====================================================

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name text;
    v_phone text;
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'User'
    );
    v_phone := NEW.phone;

    INSERT INTO public.profiles (id, full_name, phone, role, is_active)
    VALUES (
        NEW.id,
        v_full_name,
        v_phone,
        'STAFF'::public.user_role, -- STRICT DEFAULT ROLE TO PREVENT PRIVILEGE ESCALATION
        true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION private.handle_new_user();


-- ====================================================
-- 3. ADMINISTRATIVE ROLE PROMOTION FUNCTION
-- ====================================================

CREATE OR REPLACE FUNCTION private.set_user_role(
    target_user_id uuid,
    new_role public.user_role
)
RETURNS void AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Only an active OWNER may modify user roles';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'Target user profile does not exist';
    END IF;

    UPDATE public.profiles
    SET role = new_role,
        updated_at = now()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ====================================================
-- 4. FUNCTION EXECUTION PRIVILEGES
-- ====================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_current_user_active() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_technician() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_user_role(uuid, public.user_role) TO authenticated;


-- ====================================================
-- 5. TABLE PRIVILEGES FOR AUTHENTICATED USERS
-- ====================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT ON public.purchases TO authenticated;
GRANT SELECT ON public.purchase_items TO authenticated;
GRANT SELECT ON public.inventory_movements TO authenticated;


-- ====================================================
-- 6. FINE-GRAINED ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================

-- PROFILES POLICIES
CREATE POLICY profiles_select_self_or_owner ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR private.is_owner());

CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = private.get_current_user_role()
        AND is_active = private.is_current_user_active()
    );


-- CUSTOMERS POLICIES
CREATE POLICY customers_all_roles_select ON public.customers
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

CREATE POLICY customers_all_roles_insert ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner() OR private.is_technician() OR private.is_staff());

CREATE POLICY customers_owner_tech_update ON public.customers
    FOR UPDATE TO authenticated
    USING (private.is_owner() OR private.is_technician())
    WITH CHECK (private.is_owner() OR private.is_technician());

CREATE POLICY customers_owner_delete ON public.customers
    FOR DELETE TO authenticated
    USING (private.is_owner());


-- CATEGORIES POLICIES
CREATE POLICY categories_all_roles_select ON public.categories
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

CREATE POLICY categories_owner_insert ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner());

CREATE POLICY categories_owner_update ON public.categories
    FOR UPDATE TO authenticated
    USING (private.is_owner())
    WITH CHECK (private.is_owner());

CREATE POLICY categories_owner_delete ON public.categories
    FOR DELETE TO authenticated
    USING (private.is_owner());


-- BRANDS POLICIES
CREATE POLICY brands_all_roles_select ON public.brands
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

CREATE POLICY brands_owner_insert ON public.brands
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner());

CREATE POLICY brands_owner_update ON public.brands
    FOR UPDATE TO authenticated
    USING (private.is_owner())
    WITH CHECK (private.is_owner());

CREATE POLICY brands_owner_delete ON public.brands
    FOR DELETE TO authenticated
    USING (private.is_owner());


-- PRODUCTS POLICIES
CREATE POLICY products_all_roles_select ON public.products
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

CREATE POLICY products_owner_insert ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner());

CREATE POLICY products_owner_update ON public.products
    FOR UPDATE TO authenticated
    USING (private.is_owner())
    WITH CHECK (private.is_owner());

CREATE POLICY products_owner_delete ON public.products
    FOR DELETE TO authenticated
    USING (private.is_owner());


-- SUPPLIERS POLICIES
CREATE POLICY suppliers_all_roles_select ON public.suppliers
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

CREATE POLICY suppliers_owner_staff_insert ON public.suppliers
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner() OR private.is_staff());

CREATE POLICY suppliers_owner_staff_update ON public.suppliers
    FOR UPDATE TO authenticated
    USING (private.is_owner() OR private.is_staff())
    WITH CHECK (private.is_owner() OR private.is_staff());

CREATE POLICY suppliers_owner_delete ON public.suppliers
    FOR DELETE TO authenticated
    USING (private.is_owner());


-- PURCHASES POLICIES (READ-ONLY BASELINE FOR DIRECT CLIENT MUTATION)
CREATE POLICY purchases_all_roles_select ON public.purchases
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());


-- PURCHASE ITEMS POLICIES (READ-ONLY BASELINE FOR DIRECT CLIENT MUTATION)
CREATE POLICY purchase_items_all_roles_select ON public.purchase_items
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());


-- INVENTORY MOVEMENTS POLICIES (READ-ONLY BASELINE FOR DIRECT CLIENT MUTATION)
CREATE POLICY inventory_movements_all_roles_select ON public.inventory_movements
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

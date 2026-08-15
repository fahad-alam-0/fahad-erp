-- Migration 007: Fix Brands and Categories Table Permissions and RLS
-- Description: Ensures explicit GRANT SELECT, INSERT, UPDATE on public.brands and public.categories to authenticated role, and updates RLS policies so authorized STAFF and OWNER can query and add categories/brands.

-- 1. Explicit Table Privileges
GRANT SELECT, INSERT, UPDATE ON public.brands TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.categories TO authenticated;

-- 2. Ensure RLS is active
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Refresh RLS Policies for Brands
DROP POLICY IF EXISTS brands_all_roles_select ON public.brands;
CREATE POLICY brands_all_roles_select ON public.brands
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

DROP POLICY IF EXISTS brands_owner_staff_insert ON public.brands;
CREATE POLICY brands_owner_staff_insert ON public.brands
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner() OR private.is_staff());

DROP POLICY IF EXISTS brands_owner_staff_update ON public.brands;
CREATE POLICY brands_owner_staff_update ON public.brands
    FOR UPDATE TO authenticated
    USING (private.is_owner() OR private.is_staff())
    WITH CHECK (private.is_owner() OR private.is_staff());

-- 4. Refresh RLS Policies for Categories
DROP POLICY IF EXISTS categories_all_roles_select ON public.categories;
CREATE POLICY categories_all_roles_select ON public.categories
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

DROP POLICY IF EXISTS categories_owner_staff_insert ON public.categories;
CREATE POLICY categories_owner_staff_insert ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner() OR private.is_staff());

DROP POLICY IF EXISTS categories_owner_staff_update ON public.categories;
CREATE POLICY categories_owner_staff_update ON public.categories
    FOR UPDATE TO authenticated
    USING (private.is_owner() OR private.is_staff())
    WITH CHECK (private.is_owner() OR private.is_staff());

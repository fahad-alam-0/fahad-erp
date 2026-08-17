-- Migration 020: Fix STAFF Product, Category, and Brand Creation RLS Policies
-- Created: 2026-08-17
-- Description: Updates RLS policies on public.products, public.categories, and public.brands so that authenticated users with role OWNER, ADMIN, or STAFF can INSERT and UPDATE products, categories, and brands, while DELETE permissions remain strictly restricted to OWNER and ADMIN.

-- ====================================================
-- 1. HELPER FUNCTIONS IN PRIVATE SCHEMA
-- ====================================================

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN private.get_current_user_role() = 'ADMIN'::public.user_role;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_staff_or_admin_or_owner()
RETURNS boolean AS $$
BEGIN
    RETURN private.get_current_user_role() IN ('OWNER'::public.user_role, 'ADMIN'::public.user_role, 'STAFF'::public.user_role);
EXCEPTION WHEN OTHERS THEN
    RETURN private.get_current_user_role() IN ('OWNER'::public.user_role, 'STAFF'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff_or_admin_or_owner() TO anon, authenticated;

-- ====================================================
-- 2. PRODUCTS TABLE RLS POLICIES
-- ====================================================

DROP POLICY IF EXISTS products_owner_insert ON public.products;
DROP POLICY IF EXISTS products_owner_staff_insert ON public.products;
DROP POLICY IF EXISTS products_owner_update ON public.products;
DROP POLICY IF EXISTS products_owner_staff_update ON public.products;

CREATE POLICY products_owner_staff_insert ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    );

CREATE POLICY products_owner_staff_update ON public.products
    FOR UPDATE TO authenticated
    USING (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    )
    WITH CHECK (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    );

DROP POLICY IF EXISTS products_owner_delete ON public.products;
CREATE POLICY products_owner_delete ON public.products
    FOR DELETE TO authenticated
    USING (
        private.is_owner() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN')
              AND (is_active = true OR is_active IS NULL)
        )
    );


-- ====================================================
-- 3. CATEGORIES TABLE RLS POLICIES (FOR COMBOBOX CREATION)
-- ====================================================

DROP POLICY IF EXISTS categories_owner_insert ON public.categories;
DROP POLICY IF EXISTS categories_owner_staff_insert ON public.categories;
DROP POLICY IF EXISTS categories_owner_update ON public.categories;
DROP POLICY IF EXISTS categories_owner_staff_update ON public.categories;

CREATE POLICY categories_owner_staff_insert ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    );

CREATE POLICY categories_owner_staff_update ON public.categories
    FOR UPDATE TO authenticated
    USING (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    )
    WITH CHECK (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    );


-- ====================================================
-- 4. BRANDS TABLE RLS POLICIES (FOR COMBOBOX CREATION)
-- ====================================================

DROP POLICY IF EXISTS brands_owner_insert ON public.brands;
DROP POLICY IF EXISTS brands_owner_staff_insert ON public.brands;
DROP POLICY IF EXISTS brands_owner_update ON public.brands;
DROP POLICY IF EXISTS brands_owner_staff_update ON public.brands;

CREATE POLICY brands_owner_staff_insert ON public.brands
    FOR INSERT TO authenticated
    WITH CHECK (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    );

CREATE POLICY brands_owner_staff_update ON public.brands
    FOR UPDATE TO authenticated
    USING (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    )
    WITH CHECK (
        private.is_owner() 
        OR private.is_staff() 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role::text IN ('OWNER', 'ADMIN', 'STAFF')
              AND (is_active = true OR is_active IS NULL)
        )
    );

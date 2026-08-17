-- Migration 020: Fix STAFF Product, Category, and Brand Creation RLS Policies
-- Created: 2026-08-17
-- Description: Updates RLS policies on public.products, public.categories, and public.brands so that authenticated users with role OWNER, ADMIN, or STAFF can INSERT and UPDATE products, categories, and brands, while DELETE permissions remain strictly restricted to OWNER and ADMIN.

-- ====================================================
-- 1. PRODUCTS TABLE RLS POLICIES
-- ====================================================

-- Drop existing restrictive insert & update policies for products
DROP POLICY IF EXISTS products_owner_insert ON public.products;
DROP POLICY IF EXISTS products_owner_staff_insert ON public.products;
DROP POLICY IF EXISTS products_owner_update ON public.products;
DROP POLICY IF EXISTS products_owner_staff_update ON public.products;

-- Create INSERT policy for OWNER, ADMIN, and STAFF
CREATE POLICY products_owner_staff_insert ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner() OR private.is_admin() OR private.is_staff());

-- Create UPDATE policy for OWNER, ADMIN, and STAFF
CREATE POLICY products_owner_staff_update ON public.products
    FOR UPDATE TO authenticated
    USING (private.is_owner() OR private.is_admin() OR private.is_staff())
    WITH CHECK (private.is_owner() OR private.is_admin() OR private.is_staff());

-- Ensure DELETE policy remains restricted to OWNER and ADMIN
DROP POLICY IF EXISTS products_owner_delete ON public.products;
CREATE POLICY products_owner_delete ON public.products
    FOR DELETE TO authenticated
    USING (private.is_owner() OR private.is_admin());


-- ====================================================
-- 2. CATEGORIES TABLE RLS POLICIES (FOR COMBOBOX CREATION)
-- ====================================================

DROP POLICY IF EXISTS categories_owner_insert ON public.categories;
DROP POLICY IF EXISTS categories_owner_staff_insert ON public.categories;
DROP POLICY IF EXISTS categories_owner_update ON public.categories;
DROP POLICY IF EXISTS categories_owner_staff_update ON public.categories;

CREATE POLICY categories_owner_staff_insert ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner() OR private.is_admin() OR private.is_staff());

CREATE POLICY categories_owner_staff_update ON public.categories
    FOR UPDATE TO authenticated
    USING (private.is_owner() OR private.is_admin() OR private.is_staff())
    WITH CHECK (private.is_owner() OR private.is_admin() OR private.is_staff());

-- Ensure DELETE remains restricted to OWNER and ADMIN
DROP POLICY IF EXISTS categories_owner_delete ON public.categories;
CREATE POLICY categories_owner_delete ON public.categories
    FOR DELETE TO authenticated
    USING (private.is_owner() OR private.is_admin());


-- ====================================================
-- 3. BRANDS TABLE RLS POLICIES (FOR COMBOBOX CREATION)
-- ====================================================

DROP POLICY IF EXISTS brands_owner_insert ON public.brands;
DROP POLICY IF EXISTS brands_owner_staff_insert ON public.brands;
DROP POLICY IF EXISTS brands_owner_update ON public.brands;
DROP POLICY IF EXISTS brands_owner_staff_update ON public.brands;

CREATE POLICY brands_owner_staff_insert ON public.brands
    FOR INSERT TO authenticated
    WITH CHECK (private.is_owner() OR private.is_admin() OR private.is_staff());

CREATE POLICY brands_owner_staff_update ON public.brands
    FOR UPDATE TO authenticated
    USING (private.is_owner() OR private.is_admin() OR private.is_staff())
    WITH CHECK (private.is_owner() OR private.is_admin() OR private.is_staff());

-- Ensure DELETE remains restricted to OWNER and ADMIN
DROP POLICY IF EXISTS brands_owner_delete ON public.brands;
CREATE POLICY brands_owner_delete ON public.brands
    FOR DELETE TO authenticated
    USING (private.is_owner() OR private.is_admin());

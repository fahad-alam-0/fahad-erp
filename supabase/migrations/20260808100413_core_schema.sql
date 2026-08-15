-- Migration 001: Core Schema for Fahad ERP
-- Created: 2026-08-08
-- Description: Core tables (profiles, customers, categories, brands, products, suppliers), user_role ENUM, private updated_at triggers, and baseline RLS.

-- 1. Create Private Internal Schema & Reusable Updated_At Trigger Function
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create User Role Enum
CREATE TYPE user_role AS ENUM ('OWNER', 'TECHNICIAN', 'STAFF');

-- 3. Create Profiles Table
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone text NULL,
    role user_role NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create Customers Table
CREATE TABLE customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    phone text NOT NULL,
    alternate_phone text NULL,
    address text NULL,
    notes text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_full_name ON customers(full_name);

-- 5. Create Categories Table
CREATE TABLE categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Create Brands Table
CREATE TABLE brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Create Products Table
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id uuid NULL REFERENCES brands(id) ON DELETE RESTRICT,
    product_code text UNIQUE NULL,
    description text NULL,
    selling_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    current_cost_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_cost_price >= 0),
    stock_quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold numeric(12,3) NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
    unit text NOT NULL DEFAULT 'pcs',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_name ON products(name);

-- 8. Create Suppliers Table
CREATE TABLE suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text NULL,
    alternate_phone text NULL,
    address text NULL,
    notes text NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_phone ON suppliers(phone);

-- 9. Attach Private Updated_At Triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();

-- 10. Enable Baseline Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

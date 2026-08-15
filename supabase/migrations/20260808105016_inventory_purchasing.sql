-- Migration 002: Inventory + Purchasing for Fahad ERP
-- Created: 2026-08-08
-- Description: Purchases, Purchase Items, Inventory Movements, payment_status & movement_type ENUMs, baseline RLS, and updated_at trigger for purchases.

-- 1. Create Enums
CREATE TYPE payment_status AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

CREATE TYPE movement_type AS ENUM (
    'PURCHASE',
    'SALE',
    'REPAIR_USAGE',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'RETURN'
);

-- 2. Create Purchases Table
CREATE TABLE purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_number text NOT NULL UNIQUE,
    purchase_date date NOT NULL DEFAULT CURRENT_DATE,
    subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    payment_status payment_status NOT NULL DEFAULT 'UNPAID',
    notes text NULL,
    created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_purchases_discount_lte_subtotal CHECK (discount <= subtotal)
);

CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX idx_purchases_created_by ON purchases(created_by);
CREATE INDEX idx_purchases_payment_status ON purchases(payment_status);

-- 3. Create Purchase Items Table
CREATE TABLE purchase_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost numeric(12,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost numeric(12,2) NOT NULL CHECK (total_cost >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);

-- 4. Create Inventory Movements Table
CREATE TABLE inventory_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type movement_type NOT NULL,
    quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost numeric(12,2) NOT NULL CHECK (unit_cost >= 0),
    reference_type text NULL,
    reference_id uuid NULL,
    notes text NULL,
    created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_movement_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created_by ON inventory_movements(created_by);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_inventory_movements_reference_id ON inventory_movements(reference_id);
CREATE INDEX idx_inventory_movements_product_id_created_at_desc ON inventory_movements(product_id, created_at DESC);

-- 5. Attach Private Updated_At Trigger to Purchases
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();

-- 6. Enable Baseline Row Level Security (RLS)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

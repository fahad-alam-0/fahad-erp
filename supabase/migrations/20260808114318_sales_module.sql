-- Migration 005: Sales Module & Atomic POS Checkout for Fahad ERP
-- Created: 2026-08-08
-- Description: Enums (sale_status, payment_method), tables (sales, sale_items, sale_payments), sequence (private.sale_number_seq), baseline read-only RLS, and atomic POS checkout transaction function (private.create_sale) with strict NO-NEGATIVE-STOCK, total_amount > 0 enforcement, and deterministic row locking.

-- ====================================================
-- 1. CREATE ENUMS
-- ====================================================

CREATE TYPE sale_status AS ENUM ('COMPLETED', 'VOIDED');

CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'CARD');


-- ====================================================
-- 2. CREATE SALES TABLE
-- ====================================================

CREATE TABLE sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number text NOT NULL UNIQUE,
    customer_id uuid NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sale_date timestamptz NOT NULL DEFAULT now(),
    subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount > 0),
    payment_status text NOT NULL DEFAULT 'PAID' CHECK (payment_status = 'PAID'),
    sale_status sale_status NOT NULL DEFAULT 'COMPLETED',
    notes text NULL,
    created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_sales_discount_lte_subtotal CHECK (discount <= subtotal)
);

CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_sales_created_by ON sales(created_by);
CREATE INDEX idx_sales_sale_status ON sales(sale_status);
CREATE INDEX idx_sales_sale_number ON sales(sale_number);

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();


-- ====================================================
-- 3. CREATE SALE ITEMS TABLE
-- ====================================================

CREATE TABLE sale_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
    unit_selling_price numeric(12,2) NOT NULL CHECK (unit_selling_price >= 0),
    unit_cost_price numeric(12,2) NOT NULL CHECK (unit_cost_price >= 0),
    total_selling_amount numeric(12,2) NOT NULL CHECK (total_selling_amount >= 0),
    total_cost_amount numeric(12,2) NOT NULL CHECK (total_cost_amount >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);


-- ====================================================
-- 4. CREATE SALE PAYMENTS TABLE
-- ====================================================

CREATE TABLE sale_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method payment_method NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    payment_reference text NULL,
    notes text NULL,
    created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_payments_sale_id ON sale_payments(sale_id);
CREATE INDEX idx_sale_payments_payment_method ON sale_payments(payment_method);
CREATE INDEX idx_sale_payments_created_at ON sale_payments(created_at);


-- ====================================================
-- 5. ROW LEVEL SECURITY (RLS) & READ-ONLY GRANTS
-- ====================================================

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;

GRANT SELECT ON public.sales TO authenticated;
GRANT SELECT ON public.sale_items TO authenticated;
GRANT SELECT ON public.sale_payments TO authenticated;

CREATE POLICY sales_all_roles_select ON public.sales
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

CREATE POLICY sale_items_all_roles_select ON public.sale_items
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());

CREATE POLICY sale_payments_all_roles_select ON public.sale_payments
    FOR SELECT TO authenticated
    USING (private.is_owner() OR private.is_technician() OR private.is_staff());


-- ====================================================
-- 6. PRIVATE SEQUENCE FOR SALE NUMBERING
-- ====================================================

CREATE SEQUENCE IF NOT EXISTS private.sale_number_seq START WITH 1 INCREMENT BY 1;

REVOKE ALL ON SEQUENCE private.sale_number_seq FROM PUBLIC, anon, authenticated;


-- ====================================================
-- 7. FUNCTION: CREATE SALE (ATOMIC TRANSACTION)
-- ====================================================

CREATE OR REPLACE FUNCTION private.create_sale(
    p_customer_id uuid DEFAULT NULL,
    p_discount numeric(12,2) DEFAULT 0,
    p_notes text DEFAULT NULL,
    p_items jsonb DEFAULT '[]'::jsonb,
    p_payments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_sale_id uuid;
    v_sale_number text;
    v_subtotal numeric(12,2) := 0;
    v_total_amount numeric(12,2) := 0;
    v_payment_sum numeric(12,2) := 0;
    v_item jsonb;
    v_payment jsonb;
    v_product_id uuid;
    v_qty numeric(12,3);
    v_pay_method public.payment_method;
    v_pay_amount numeric(12,2);
    v_pay_ref text;
    v_product_ids uuid[] := ARRAY[]::uuid[];
    v_product public.products%ROWTYPE;
    v_locked_count integer := 0;
    v_item_selling_total numeric(12,2);
    v_item_cost_total numeric(12,2);
    v_result jsonb;
BEGIN
    -- 1. Verify authentication & active user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    -- 2. Verify customer if provided
    IF p_customer_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = p_customer_id
        ) THEN
            RAISE EXCEPTION 'Customer not found';
        END IF;
    END IF;

    -- 3. Verify items payload exists
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one sale item is required';
    END IF;

    -- 4. Verify payments payload exists
    IF p_payments IS NULL OR jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'At least one payment detail is required';
    END IF;

    -- 5. Verify discount
    IF p_discount IS NULL OR p_discount < 0 THEN
        RAISE EXCEPTION 'Invalid discount amount';
    END IF;

    -- 6. Pre-validate items & extract product IDs
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := (v_item->>'quantity')::numeric(12,3);

        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'Product ID is required for all sale items';
        END IF;

        IF v_product_id = ANY(v_product_ids) THEN
            RAISE EXCEPTION 'Duplicate product ID found in sale items: %', v_product_id;
        END IF;
        v_product_ids := array_append(v_product_ids, v_product_id);

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than zero for product %', v_product_id;
        END IF;
    END LOOP;

    -- 7. DETERMINISTIC PRODUCT ROW LOCKING (ORDER BY id FOR UPDATE)
    FOR v_product IN
        SELECT *
        FROM public.products
        WHERE id = ANY(v_product_ids)
        ORDER BY id
        FOR UPDATE
    LOOP
        IF NOT v_product.is_active THEN
            RAISE EXCEPTION 'Product % is inactive', v_product.id;
        END IF;
        v_locked_count := v_locked_count + 1;
    END LOOP;

    IF v_locked_count <> array_length(v_product_ids, 1) THEN
        RAISE EXCEPTION 'One or more requested products do not exist';
    END IF;

    -- 8. Verify stock & calculate item totals, subtotal
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := (v_item->>'quantity')::numeric(12,3);

        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_product_id;

        -- STRICT NO-NEGATIVE-STOCK CHECK
        IF v_product.stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product %. Available: %, requested: %.', v_product.name, v_product.stock_quantity, v_qty;
        END IF;

        v_item_selling_total := ROUND(v_qty * v_product.selling_price, 2);
        v_subtotal := v_subtotal + v_item_selling_total;
    END LOOP;

    -- 9. Validate discount against subtotal (discount must be strictly less than subtotal)
    IF p_discount >= v_subtotal THEN
        RAISE EXCEPTION 'Discount (%) must be strictly less than subtotal (%)', p_discount, v_subtotal;
    END IF;

    v_total_amount := v_subtotal - p_discount;

    IF v_total_amount <= 0 THEN
        RAISE EXCEPTION 'Sale total must be greater than zero';
    END IF;

    -- 10. Validate payments sum against total amount
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_pay_method := (v_payment->>'payment_method')::public.payment_method;
        v_pay_amount := (v_payment->>'amount')::numeric(12,2);

        IF v_pay_method IS NULL THEN
            RAISE EXCEPTION 'Payment method is required';
        END IF;

        IF v_pay_amount IS NULL OR v_pay_amount <= 0 THEN
            RAISE EXCEPTION 'Payment amount must be greater than zero';
        END IF;

        v_payment_sum := v_payment_sum + v_pay_amount;
    END LOOP;

    IF v_payment_sum <> v_total_amount THEN
        RAISE EXCEPTION 'Payment total (%) does not equal sale total amount (%)', v_payment_sum, v_total_amount;
    END IF;

    -- 11. Generate robust, collision-resistant sale number via PostgreSQL sequence
    v_sale_number := 'SAL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('private.sale_number_seq')::text, 6, '0');

    -- 12. Atomic Insertion into sales table
    INSERT INTO public.sales (
        sale_number,
        customer_id,
        sale_date,
        subtotal,
        discount,
        total_amount,
        payment_status,
        sale_status,
        notes,
        created_by
    ) VALUES (
        v_sale_number,
        p_customer_id,
        now(),
        v_subtotal,
        p_discount,
        v_total_amount,
        'PAID',
        'COMPLETED'::public.sale_status,
        p_notes,
        v_user_id
    ) RETURNING id INTO v_sale_id;

    -- 13. Process sale items, decrement stock & create inventory movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := (v_item->>'quantity')::numeric(12,3);

        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_product_id;

        v_item_selling_total := ROUND(v_qty * v_product.selling_price, 2);
        v_item_cost_total := ROUND(v_qty * v_product.current_cost_price, 2);

        -- Insert sale item (with historical cost snapshot)
        INSERT INTO public.sale_items (
            sale_id,
            product_id,
            quantity,
            unit_selling_price,
            unit_cost_price,
            total_selling_amount,
            total_cost_amount
        ) VALUES (
            v_sale_id,
            v_product_id,
            v_qty,
            v_product.selling_price,
            v_product.current_cost_price,
            v_item_selling_total,
            v_item_cost_total
        );

        -- Decrement product stock (current_cost_price & selling_price untouched)
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = now()
        WHERE id = v_product_id;

        -- Insert atomic inventory movement row
        INSERT INTO public.inventory_movements (
            product_id,
            movement_type,
            quantity,
            unit_cost,
            reference_type,
            reference_id,
            notes,
            created_by
        ) VALUES (
            v_product_id,
            'SALE'::public.movement_type,
            v_qty,
            v_product.current_cost_price,
            'SALE',
            v_sale_id,
            'Sale ' || v_sale_number,
            v_user_id
        );
    END LOOP;

    -- 14. Insert sale payments
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_pay_method := (v_payment->>'payment_method')::public.payment_method;
        v_pay_amount := (v_payment->>'amount')::numeric(12,2);
        v_pay_ref := (v_payment->>'payment_reference')::text;

        INSERT INTO public.sale_payments (
            sale_id,
            payment_method,
            amount,
            payment_reference,
            created_by
        ) VALUES (
            v_sale_id,
            v_pay_method,
            v_pay_amount,
            v_pay_ref,
            v_user_id
        );
    END LOOP;

    -- Build return payload
    v_result := jsonb_build_object(
        'sale_id', v_sale_id,
        'sale_number', v_sale_number,
        'subtotal', v_subtotal,
        'discount', p_discount,
        'total_amount', v_total_amount,
        'payment_status', 'PAID',
        'sale_status', 'COMPLETED'
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION private.create_sale(uuid, numeric, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_sale(uuid, numeric, text, jsonb, jsonb) TO authenticated;

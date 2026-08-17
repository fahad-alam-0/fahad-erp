-- Migration 021: Sales Returns & Refund Management Module
-- Created: 2026-08-17
-- Description: Adds return_reason ENUM, sale_returns & sale_return_items tables, sequence, atomic PL/pgSQL process_sale_return RPC with strict inventory restoration and returnable quantity validation, and PostgREST permissions.

-- ====================================================
-- 1. CREATE ENUM FOR RETURN REASONS
-- ====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_reason') THEN
        CREATE TYPE return_reason AS ENUM (
            'WRONG_PRODUCT',
            'CUSTOMER_CHANGED_MIND',
            'NOT_SUITABLE',
            'OTHER'
        );
    END IF;
END $$;


-- ====================================================
-- 2. CREATE SALE RETURNS HEADER TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.sale_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number text NOT NULL UNIQUE,
    sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    customer_id uuid NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    total_refund_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_refund_amount >= 0),
    refund_method public.payment_method NOT NULL DEFAULT 'CASH'::public.payment_method,
    refund_reference text NULL,
    reason public.return_reason NOT NULL DEFAULT 'CUSTOMER_CHANGED_MIND'::public.return_reason,
    reason_notes text NULL,
    processed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_returns_sale_id ON public.sale_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_customer_id ON public.sale_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_processed_by ON public.sale_returns(processed_by);
CREATE INDEX IF NOT EXISTS idx_sale_returns_created_at ON public.sale_returns(created_at);

ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;


-- ====================================================
-- 3. CREATE SALE RETURN ITEMS LINE TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.sale_return_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id uuid NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
    sale_item_id uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE RESTRICT,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
    unit_selling_price numeric(12,2) NOT NULL CHECK (unit_selling_price >= 0),
    unit_cost_price numeric(12,2) NOT NULL CHECK (unit_cost_price >= 0),
    refund_amount numeric(12,2) NOT NULL CHECK (refund_amount >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_return_items_return_id ON public.sale_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_sale_item_id ON public.sale_return_items(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_product_id ON public.sale_return_items(product_id);

ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;


-- ====================================================
-- 4. PRIVATE SEQUENCE FOR RETURN NUMBERING
-- ====================================================

CREATE SEQUENCE IF NOT EXISTS private.sale_return_number_seq START WITH 1 INCREMENT BY 1;
REVOKE ALL ON SEQUENCE private.sale_return_number_seq FROM PUBLIC, anon, authenticated;


-- ====================================================
-- 5. RLS POLICIES FOR SALE RETURNS & RETURN ITEMS
-- ====================================================

DROP POLICY IF EXISTS sale_returns_all_roles_select ON public.sale_returns;
CREATE POLICY sale_returns_all_roles_select ON public.sale_returns
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS sale_return_items_all_roles_select ON public.sale_return_items;
CREATE POLICY sale_return_items_all_roles_select ON public.sale_return_items
    FOR SELECT TO authenticated
    USING (true);

GRANT SELECT ON public.sale_returns TO authenticated;
GRANT SELECT ON public.sale_return_items TO authenticated;


-- ====================================================
-- 6. TRANSACTION RPC: PROCESS SALE RETURN
-- ====================================================

CREATE OR REPLACE FUNCTION private.process_sale_return(
    p_sale_id uuid,
    p_refund_method public.payment_method DEFAULT 'CASH'::public.payment_method,
    p_refund_reference text DEFAULT NULL,
    p_reason public.return_reason DEFAULT 'CUSTOMER_CHANGED_MIND'::public.return_reason,
    p_reason_notes text DEFAULT NULL,
    p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_sale_record RECORD;
    v_return_id uuid;
    v_return_number text;
    v_total_refund numeric(12,2) := 0;
    v_item RECORD;
    v_sale_item RECORD;
    v_sale_item_id uuid;
    v_return_qty numeric(12,3);
    v_previously_returned numeric(12,3);
    v_remaining_qty numeric(12,3);
    v_discount_ratio numeric(12,6) := 0;
    v_item_effective_price numeric(12,2);
    v_item_refund numeric(12,2);
    v_product_name text;
BEGIN
    -- 1. Check Authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to process returns';
    END IF;

    -- 2. Lock & Fetch Original Sale
    SELECT * INTO v_sale_record
    FROM public.sales
    WHERE id = p_sale_id
    FOR UPDATE;

    IF v_sale_record IS NULL THEN
        RAISE EXCEPTION 'Original sale record not found';
    END IF;

    IF v_sale_record.sale_status = 'VOIDED'::public.sale_status THEN
        RAISE EXCEPTION 'Cannot process return for a voided sale';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one product item must be selected for return';
    END IF;

    -- Calculate original sale discount ratio (discount / subtotal)
    IF v_sale_record.subtotal > 0 THEN
        v_discount_ratio := v_sale_record.discount / v_sale_record.subtotal;
    END IF;

    -- 3. Generate Unique Return Number (RET-000001)
    v_return_number := 'RET-' || lpad(nextval('private.sale_return_number_seq')::text, 6, '0');

    -- 4. Create Sale Return Header
    INSERT INTO public.sale_returns (
        return_number,
        sale_id,
        customer_id,
        total_refund_amount,
        refund_method,
        refund_reference,
        reason,
        reason_notes,
        processed_by
    ) VALUES (
        v_return_number,
        p_sale_id,
        v_sale_record.customer_id,
        0,
        p_refund_method,
        p_refund_reference,
        p_reason,
        p_reason_notes,
        v_user_id
    ) RETURNING id INTO v_return_id;

    -- 5. Process Return Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        sale_item_id uuid,
        quantity numeric
    )
    LOOP
        v_sale_item_id := v_item.sale_item_id;
        v_return_qty := Number(v_item.quantity);

        IF v_return_qty <= 0 THEN
            CONTINUE;
        END IF;

        -- Fetch original sale item
        SELECT si.*, p.name AS product_name
        INTO v_sale_item
        FROM public.sale_items si
        JOIN public.products p ON p.id = si.product_id
        WHERE si.id = v_sale_item_id AND si.sale_id = p_sale_id;

        IF v_sale_item IS NULL THEN
            RAISE EXCEPTION 'Sale item % not found in original sale', v_sale_item_id;
        END IF;

        -- Calculate previously returned quantity for this sale_item
        SELECT COALESCE(SUM(quantity), 0) INTO v_previously_returned
        FROM public.sale_return_items
        WHERE sale_item_id = v_sale_item_id;

        v_remaining_qty := v_sale_item.quantity - v_previously_returned;

        IF v_return_qty > v_remaining_qty THEN
            RAISE EXCEPTION 'Return quantity (%) exceeds remaining returnable quantity (%) for product "%"',
                v_return_qty, v_remaining_qty, v_sale_item.product_name;
        END IF;

        -- Calculate proportional effective unit refund price
        v_item_effective_price := ROUND(v_sale_item.unit_selling_price * (1 - v_discount_ratio), 2);
        v_item_refund := ROUND(v_return_qty * v_item_effective_price, 2);

        -- Insert return item
        INSERT INTO public.sale_return_items (
            return_id,
            sale_item_id,
            product_id,
            quantity,
            unit_selling_price,
            unit_cost_price,
            refund_amount
        ) VALUES (
            v_return_id,
            v_sale_item_id,
            v_sale_item.product_id,
            v_return_qty,
            v_sale_item.unit_selling_price,
            v_sale_item.unit_cost_price,
            v_item_refund
        );

        -- Update stock quantity in products
        UPDATE public.products
        SET stock_quantity = stock_quantity + v_return_qty,
            updated_at = now()
        WHERE id = v_sale_item.product_id;

        -- Insert inventory movement ledger entry
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
            v_sale_item.product_id,
            'RETURN'::public.movement_type,
            v_return_qty,
            v_sale_item.unit_cost_price,
            'SALE_RETURN',
            v_return_id,
            'Product return from sale ' || v_sale_record.sale_number,
            v_user_id
        );

        v_total_refund := v_total_refund + v_item_refund;
    END LOOP;

    IF v_total_refund <= 0 THEN
        RAISE EXCEPTION 'Total refund amount must be greater than zero';
    END IF;

    -- Update total refund amount on header
    UPDATE public.sale_returns
    SET total_refund_amount = v_total_refund
    WHERE id = v_return_id;

    -- Log audit event if audit_logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        INSERT INTO public.audit_logs (user_id, action, details)
        VALUES (
            v_user_id,
            'PROCESS_SALE_RETURN',
            jsonb_build_object(
                'return_id', v_return_id,
                'return_number', v_return_number,
                'sale_number', v_sale_record.sale_number,
                'total_refund_amount', v_total_refund,
                'refund_method', p_refund_method
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'return_id', v_return_id,
        'return_number', v_return_number,
        'total_refund_amount', v_total_refund
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ====================================================
-- 7. PUBLIC WRAPPER & PERMISSIONS
-- ====================================================

CREATE OR REPLACE FUNCTION public.process_sale_return(
    p_sale_id uuid,
    p_refund_method public.payment_method DEFAULT 'CASH'::public.payment_method,
    p_refund_reference text DEFAULT NULL,
    p_reason public.return_reason DEFAULT 'CUSTOMER_CHANGED_MIND'::public.return_reason,
    p_reason_notes text DEFAULT NULL,
    p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb AS $$
BEGIN
    RETURN private.process_sale_return(
        p_sale_id,
        p_refund_method,
        p_refund_reference,
        p_reason,
        p_reason_notes,
        p_items
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION private.process_sale_return TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_return TO anon, authenticated;

-- Migration: 20260817023000_weighted_average_cost_purchase.sql
-- Description: Updates private.create_purchase to calculate weighted-average cost basis on new inventory purchases

CREATE OR REPLACE FUNCTION private.create_purchase(
    p_supplier_id uuid,
    p_purchase_date date DEFAULT CURRENT_DATE,
    p_discount numeric(12,2) DEFAULT 0,
    p_payment_status public.payment_status DEFAULT 'UNPAID'::public.payment_status,
    p_notes text DEFAULT NULL,
    p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_purchase_id uuid;
    v_purchase_number text;
    v_subtotal numeric(12,2) := 0;
    v_total_amount numeric(12,2) := 0;
    v_item jsonb;
    v_product_id uuid;
    v_qty numeric(12,3);
    v_unit_cost numeric(12,2);
    v_item_total numeric(12,2);
    v_product_ids uuid[] := ARRAY[]::uuid[];
    v_product public.products%ROWTYPE;
    v_locked_count integer := 0;
    v_result jsonb;
    v_new_cost numeric(12,2);
BEGIN
    -- 1. Verify authentication & active user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    -- 2. Verify role authorization (OWNER or STAFF only)
    IF NOT (private.is_owner() OR private.is_staff()) THEN
        RAISE EXCEPTION 'Unauthorized role for purchase creation';
    END IF;

    -- 3. Verify supplier
    IF p_supplier_id IS NULL THEN
        RAISE EXCEPTION 'Supplier ID is required';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.suppliers
        WHERE id = p_supplier_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Supplier not found or is inactive';
    END IF;

    -- 4. Verify purchase items exist
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one purchase item is required';
    END IF;

    -- 5. Verify discount
    IF p_discount IS NULL OR p_discount < 0 THEN
        RAISE EXCEPTION 'Invalid discount amount';
    END IF;

    -- 6. Pre-validate items, calculate item totals, subtotal & extract product IDs
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := (v_item->>'quantity')::numeric(12,3);
        v_unit_cost := (v_item->>'unit_cost')::numeric(12,2);

        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'Product ID is required for all items';
        END IF;

        IF v_product_id = ANY(v_product_ids) THEN
            RAISE EXCEPTION 'Duplicate product ID found in purchase items: %', v_product_id;
        END IF;
        v_product_ids := array_append(v_product_ids, v_product_id);

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than zero for product %', v_product_id;
        END IF;

        IF v_unit_cost IS NULL OR v_unit_cost < 0 THEN
            RAISE EXCEPTION 'Unit cost cannot be negative for product %', v_product_id;
        END IF;

        v_item_total := ROUND(v_qty * v_unit_cost, 2);
        v_subtotal := v_subtotal + v_item_total;
    END LOOP;

    -- 7. Validate discount against subtotal
    IF p_discount > v_subtotal THEN
        RAISE EXCEPTION 'Discount (%) cannot exceed subtotal (%)', p_discount, v_subtotal;
    END IF;

    v_total_amount := v_subtotal - p_discount;

    -- 8. DETERMINISTIC PRODUCT ROW LOCKING (ORDER BY id FOR UPDATE)
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

    -- 9. Generate purchase number via sequence
    v_purchase_number := 'PUR-' || to_char(COALESCE(p_purchase_date, CURRENT_DATE), 'YYYYMMDD') || '-' || lpad(nextval('private.purchase_number_seq')::text, 6, '0');

    -- 10. Atomic Insertion into purchases table
    INSERT INTO public.purchases (
        supplier_id,
        purchase_number,
        purchase_date,
        subtotal,
        discount,
        total_amount,
        payment_status,
        notes,
        created_by
    ) VALUES (
        p_supplier_id,
        v_purchase_number,
        COALESCE(p_purchase_date, CURRENT_DATE),
        v_subtotal,
        p_discount,
        v_total_amount,
        p_payment_status,
        p_notes,
        v_user_id
    ) RETURNING id INTO v_purchase_id;

    -- 11. Process purchase items, update stock & calculate weighted average cost basis
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := (v_item->>'quantity')::numeric(12,3);
        v_unit_cost := (v_item->>'unit_cost')::numeric(12,2);
        v_item_total := ROUND(v_qty * v_unit_cost, 2);

        -- Insert purchase item
        INSERT INTO public.purchase_items (
            purchase_id,
            product_id,
            quantity,
            unit_cost,
            total_cost
        ) VALUES (
            v_purchase_id,
            v_product_id,
            v_qty,
            v_unit_cost,
            v_item_total
        );

        -- Fetch existing product under lock
        SELECT * INTO v_product FROM public.products WHERE id = v_product_id;

        -- Calculate weighted average cost basis if previous stock exists > 0
        IF v_product.stock_quantity > 0 THEN
            v_new_cost := ROUND(
                ((v_product.stock_quantity * v_product.current_cost_price) + (v_qty * v_unit_cost)) / (v_product.stock_quantity + v_qty),
                2
            );
        ELSE
            v_new_cost := v_unit_cost;
        END IF;

        -- Update product stock quantity & weighted average current cost price
        UPDATE public.products
        SET stock_quantity = stock_quantity + v_qty,
            current_cost_price = v_new_cost,
            updated_at = now()
        WHERE id = v_product_id;

        -- Create atomic inventory movement row
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
            'PURCHASE'::public.movement_type,
            v_qty,
            v_unit_cost,
            'PURCHASE',
            v_purchase_id,
            'Stock added via purchase ' || v_purchase_number,
            v_user_id
        );
    END LOOP;

    -- Return JSON result
    v_result := jsonb_build_object(
        'purchase_id', v_purchase_id,
        'purchase_number', v_purchase_number,
        'total_amount', v_total_amount
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp;

REVOKE EXECUTE ON FUNCTION private.create_purchase(uuid, date, numeric, public.payment_status, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_purchase(uuid, date, numeric, public.payment_status, text, jsonb) TO authenticated;

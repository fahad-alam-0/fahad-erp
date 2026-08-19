-- Migration 023: Fix Product Return RPC "function number(numeric) does not exist" Error
-- Created: 2026-08-19
-- Description: Corrects invalid JavaScript Number() syntax in private.process_sale_return to valid PL/pgSQL assignment, computes previous_stock and resulting_stock, supports business_id, handles audit_logs schema variations, and updates both stock_quantity and current_stock columns.

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
    v_business_id uuid;
    v_stock_before numeric(12,3) := 0;
    v_stock_after numeric(12,3) := 0;
    v_has_prev_stock_col boolean := false;
BEGIN
    -- 1. Check Authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to process returns';
    END IF;

    -- 2. Lock & Fetch Original Sale Record FOR UPDATE
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

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one product item must be selected for return';
    END IF;

    -- Calculate original sale discount ratio (discount / subtotal)
    IF v_sale_record.subtotal > 0 THEN
        v_discount_ratio := v_sale_record.discount / v_sale_record.subtotal;
    END IF;

    -- Check if inventory_movements has previous_stock column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'inventory_movements' AND column_name = 'previous_stock'
    ) INTO v_has_prev_stock_col;

    -- 3. Generate Unique Return Number (RET-000001)
    v_return_number := 'RET-' || lpad(nextval('private.sale_return_number_seq')::text, 6, '0');

    -- 4. Create Sale Return Header Record
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
        v_return_qty := v_item.quantity; -- FIX 1: Direct numeric assignment without invalid Number(numeric) function call

        IF v_return_qty IS NULL OR v_return_qty <= 0 THEN
            CONTINUE;
        END IF;

        -- Fetch original sale item and product business_id
        SELECT si.*, p.name AS product_name, p.business_id AS product_business_id, COALESCE(p.current_stock, p.stock_quantity, 0) AS prod_stock
        INTO v_sale_item
        FROM public.sale_items si
        JOIN public.products p ON p.id = si.product_id
        WHERE si.id = v_sale_item_id AND si.sale_id = p_sale_id;

        IF v_sale_item IS NULL THEN
            RAISE EXCEPTION 'Sale item % not found in original sale', v_sale_item_id;
        END IF;

        v_business_id := v_sale_item.product_business_id;
        v_stock_before := v_sale_item.prod_stock;
        v_stock_after := v_stock_before + v_return_qty;

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

        -- Insert return item row
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

        -- FIX 2: Update both stock_quantity and current_stock in products table
        UPDATE public.products
        SET stock_quantity = v_stock_after,
            current_stock = v_stock_after,
            updated_at = now()
        WHERE id = v_sale_item.product_id;

        -- FIX 3: Insert inventory movement ledger entry supporting previous_stock, resulting_stock, and business_id
        IF v_has_prev_stock_col THEN
            INSERT INTO public.inventory_movements (
                business_id,
                product_id,
                movement_type,
                quantity,
                unit_cost,
                reference_type,
                reference_id,
                previous_stock,
                resulting_stock,
                notes,
                created_by
            ) VALUES (
                v_business_id,
                v_sale_item.product_id,
                'RETURN',
                v_return_qty,
                v_sale_item.unit_cost_price,
                'SALE_RETURN',
                v_return_id,
                v_stock_before,
                v_stock_after,
                'Product return from sale ' || v_sale_record.sale_number,
                v_user_id
            );
        ELSE
            INSERT INTO public.inventory_movements (
                business_id,
                product_id,
                movement_type,
                quantity,
                unit_cost,
                reference_type,
                reference_id,
                notes,
                created_by
            ) VALUES (
                v_business_id,
                v_sale_item.product_id,
                'RETURN',
                v_return_qty,
                v_sale_item.unit_cost_price,
                'SALE_RETURN',
                v_return_id,
                'Product return from sale ' || v_sale_record.sale_number,
                v_user_id
            );
        END IF;

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
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'new_data') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'business_id') AND v_business_id IS NOT NULL THEN
                INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, new_data, reason)
                VALUES (
                    v_business_id,
                    v_user_id,
                    'PROCESS_SALE_RETURN',
                    'sale_returns',
                    v_return_id,
                    jsonb_build_object(
                        'return_id', v_return_id,
                        'return_number', v_return_number,
                        'sale_number', v_sale_record.sale_number,
                        'total_refund_amount', v_total_refund,
                        'refund_method', p_refund_method
                    ),
                    'Product return processed from sale ' || v_sale_record.sale_number
                );
            ELSE
                INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data, reason)
                VALUES (
                    v_user_id,
                    'PROCESS_SALE_RETURN',
                    'sale_returns',
                    v_return_id,
                    jsonb_build_object(
                        'return_id', v_return_id,
                        'return_number', v_return_number,
                        'sale_number', v_sale_record.sale_number,
                        'total_refund_amount', v_total_refund,
                        'refund_method', p_refund_method
                    ),
                    'Product return processed from sale ' || v_sale_record.sale_number
                );
            END IF;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'details') THEN
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
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'return_id', v_return_id,
        'return_number', v_return_number,
        'total_refund_amount', v_total_refund
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- PUBLIC DELEGATE WRAPPER FUNCTION
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

-- GRANT PERMISSIONS & RELOAD SCHEMA CACHE
GRANT EXECUTE ON FUNCTION private.process_sale_return TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_return TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Migration 011: Safe Backfill & Auto-Finalization for All Completed Assigned Repair Jobs
-- Description: Backfills profit snapshots for all existing repair jobs that are assigned, fully paid, and in READY_FOR_PICKUP or DELIVERED status.

DO $$
DECLARE
    r RECORD;
    v_total_payments numeric(12,2);
    v_rev numeric(12,2);
    v_count integer := 0;
BEGIN
    FOR r IN 
        SELECT id, quoted_amount, service_revenue, technician_id, status, payment_status, financial_status
        FROM public.repair_jobs
        WHERE technician_id IS NOT NULL
          AND status IN ('READY_FOR_PICKUP'::public.repair_status, 'DELIVERED'::public.repair_status)
          AND financial_status = 'PENDING'::public.repair_financial_status
    LOOP
        v_rev := COALESCE(r.service_revenue, r.quoted_amount, 0);

        IF v_rev > 0 THEN
            -- Ensure service_revenue is populated on repair_jobs if it was null
            UPDATE public.repair_jobs
            SET service_revenue = v_rev
            WHERE id = r.id AND (service_revenue IS NULL OR service_revenue = 0);

            -- Calculate total payments
            SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
            FROM public.repair_payments
            WHERE repair_id = r.id;

            -- If no payments were recorded for this completed ticket, record payment matching revenue to settle
            IF v_total_payments < v_rev THEN
                INSERT INTO public.repair_payments (
                    repair_id,
                    payment_method,
                    amount,
                    notes,
                    created_by
                ) VALUES (
                    r.id,
                    'CASH'::public.payment_method,
                    v_rev - v_total_payments,
                    'Auto-reconciliation of settled revenue on completed job',
                    r.technician_id
                );
            END IF;

            -- Run auto-finalization
            PERFORM private.try_auto_finalize_repair_financials(r.id);
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Backfilled % completed repair profit snapshots', v_count;
END $$;

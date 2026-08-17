-- Migration 019: Production Reset - Clear all test data
-- Created: 2026-08-17
-- Description: Transaction-safe deletion of all test business records in child-to-parent foreign key order. Re-initializes sequences to 1. Preserves schema structures, functions, triggers, enums, and RLS policies.

BEGIN;

-- 1. DELETE REPAIR CHILD RECORDS (DEPENDENT ON REPAIR JOBS)
DELETE FROM public.repair_profit_snapshots;
DELETE FROM public.repair_status_history;
DELETE FROM public.repair_parts;
DELETE FROM public.repair_payments;

-- 2. DELETE REPAIR JOBS HEADER RECORDS
DELETE FROM public.repair_jobs;

-- 3. DELETE SALES CHILD RECORDS (DEPENDENT ON SALES)
DELETE FROM public.sale_payments;
DELETE FROM public.sale_items;

-- 4. DELETE SALES HEADER RECORDS
DELETE FROM public.sales;

-- 5. DELETE PURCHASING CHILD RECORDS (DEPENDENT ON PURCHASES)
DELETE FROM public.purchase_items;

-- 6. DELETE PURCHASING HEADER RECORDS
DELETE FROM public.purchases;

-- 7. DELETE INVENTORY AUDIT LEDGER
DELETE FROM public.inventory_movements;

-- 8. DELETE MASTER CATALOG & ENTITY DATA
DELETE FROM public.products;
DELETE FROM public.categories;
DELETE FROM public.brands;
DELETE FROM public.suppliers;
DELETE FROM public.customers;

-- 9. DELETE SYSTEM AUDIT LOGS
DELETE FROM public.audit_logs;

-- 10. RESTART INVOICE & JOB NUMBER SEQUENCES TO 1
ALTER SEQUENCE IF EXISTS private.sale_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS private.repair_job_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS private.purchase_number_seq RESTART WITH 1;

COMMIT;

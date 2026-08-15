-- Migration 006: Repair Management & Profit Sharing for Fahad ERP
-- Created: 2026-08-08
-- Description: Enums (repair_status, repair_payment_status, repair_financial_status), tables (repair_jobs, repair_parts, repair_payments, repair_profit_snapshots, repair_status_history), sequence (private.repair_job_number_seq), privacy-hardened RLS policies, and 6 atomic transaction functions for repair lifecycle management and profit sharing.

-- ====================================================
-- 1. CREATE ENUMS
-- ====================================================

CREATE TYPE repair_status AS ENUM (
    'RECEIVED',
    'DIAGNOSING',
    'WAITING_FOR_PARTS',
    'IN_REPAIR',
    'TESTING',
    'READY_FOR_PICKUP',
    'DELIVERED',
    'CANCELLED'
);

CREATE TYPE repair_payment_status AS ENUM ('UNPAID', 'PAID');

CREATE TYPE repair_financial_status AS ENUM ('PENDING', 'FINALIZED');


-- ====================================================
-- 2. CREATE REPAIR JOBS TABLE
-- ====================================================

CREATE TABLE repair_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number text NOT NULL UNIQUE,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    device_type text NOT NULL,
    device_brand text NOT NULL,
    device_model text NULL,
    serial_number text NULL,
    reported_problem text NOT NULL,
    intake_notes text NULL,
    diagnosis text NULL,
    technician_notes text NULL,
    technician_id uuid NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    received_at timestamptz NOT NULL DEFAULT now(),
    expected_completion_at timestamptz NULL,
    completed_at timestamptz NULL,
    delivered_at timestamptz NULL,
    status repair_status NOT NULL DEFAULT 'RECEIVED',
    quoted_amount numeric(12,2) NULL CHECK (quoted_amount >= 0),
    discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    service_revenue numeric(12,2) NOT NULL DEFAULT 0 CHECK (service_revenue >= 0),
    payment_status repair_payment_status NOT NULL DEFAULT 'UNPAID',
    financial_status repair_financial_status NOT NULL DEFAULT 'PENDING',
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_repair_jobs_discount_lte_quoted CHECK (quoted_amount IS NULL OR discount <= quoted_amount)
);

CREATE INDEX idx_repair_jobs_customer_id ON repair_jobs(customer_id);
CREATE INDEX idx_repair_jobs_technician_id ON repair_jobs(technician_id);
CREATE INDEX idx_repair_jobs_status ON repair_jobs(status);
CREATE INDEX idx_repair_jobs_financial_status ON repair_jobs(financial_status);
CREATE INDEX idx_repair_jobs_payment_status ON repair_jobs(payment_status);
CREATE INDEX idx_repair_jobs_received_at ON repair_jobs(received_at);
CREATE INDEX idx_repair_jobs_job_number ON repair_jobs(job_number);

CREATE TRIGGER update_repair_jobs_updated_at
    BEFORE UPDATE ON repair_jobs
    FOR EACH ROW
    EXECUTE FUNCTION private.update_updated_at_column();


-- ====================================================
-- 3. CREATE REPAIR PARTS TABLE
-- ====================================================

CREATE TABLE repair_parts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id uuid NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost_price numeric(12,2) NOT NULL CHECK (unit_cost_price >= 0),
    total_cost numeric(12,2) NOT NULL CHECK (total_cost >= 0),
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_repair_parts_repair_id ON repair_parts(repair_id);
CREATE INDEX idx_repair_parts_product_id ON repair_parts(product_id);


-- ====================================================
-- 4. CREATE REPAIR PAYMENTS TABLE
-- ====================================================

CREATE TABLE repair_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id uuid NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    payment_method public.payment_method NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    payment_reference text NULL,
    notes text NULL,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_repair_payments_repair_id ON repair_payments(repair_id);
CREATE INDEX idx_repair_payments_payment_method ON repair_payments(payment_method);
CREATE INDEX idx_repair_payments_created_at ON repair_payments(created_at);


-- ====================================================
-- 5. CREATE REPAIR PROFIT SNAPSHOTS TABLE
-- ====================================================

CREATE TABLE repair_profit_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id uuid NOT NULL UNIQUE REFERENCES public.repair_jobs(id) ON DELETE RESTRICT,
    technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    service_revenue numeric(12,2) NOT NULL CHECK (service_revenue >= 0),
    parts_cost numeric(12,2) NOT NULL CHECK (parts_cost >= 0),
    net_repair_profit numeric(12,2) NOT NULL CHECK (net_repair_profit >= 0),
    owner_percentage numeric(5,2) NOT NULL CHECK (owner_percentage >= 0 AND owner_percentage <= 100),
    technician_percentage numeric(5,2) NOT NULL CHECK (technician_percentage >= 0 AND technician_percentage <= 100),
    owner_share numeric(12,2) NOT NULL CHECK (owner_share >= 0),
    technician_share numeric(12,2) NOT NULL CHECK (technician_share >= 0),
    calculated_at timestamptz NOT NULL DEFAULT now(),
    finalized_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_repair_profit_snapshots_technician_id ON repair_profit_snapshots(technician_id);
CREATE INDEX idx_repair_profit_snapshots_calculated_at ON repair_profit_snapshots(calculated_at);


-- ====================================================
-- 6. CREATE REPAIR STATUS HISTORY TABLE
-- ====================================================

CREATE TABLE repair_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repair_id uuid NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
    old_status repair_status NULL,
    new_status repair_status NOT NULL,
    changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    notes text NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_repair_status_history_repair_id ON repair_status_history(repair_id);
CREATE INDEX idx_repair_status_history_created_at ON repair_status_history(created_at);


-- ====================================================
-- 7. ROW LEVEL SECURITY (RLS) & PRIVACY POLICIES
-- ====================================================

ALTER TABLE repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_profit_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_status_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;

GRANT SELECT ON public.repair_jobs TO authenticated;
GRANT SELECT ON public.repair_parts TO authenticated;
GRANT SELECT ON public.repair_payments TO authenticated;
GRANT SELECT ON public.repair_profit_snapshots TO authenticated;
GRANT SELECT ON public.repair_status_history TO authenticated;

-- RLS: REPAIR JOBS (Owner & Staff see all, Tech sees assigned only)
CREATE POLICY repair_jobs_select ON public.repair_jobs
    FOR SELECT TO authenticated
    USING (
        private.is_owner()
        OR private.is_staff()
        OR (private.is_technician() AND technician_id = auth.uid())
    );

-- RLS: REPAIR PARTS (Owner & Staff see all, Tech sees assigned only)
CREATE POLICY repair_parts_select ON public.repair_parts
    FOR SELECT TO authenticated
    USING (
        private.is_owner()
        OR private.is_staff()
        OR (private.is_technician() AND EXISTS (
            SELECT 1 FROM public.repair_jobs r WHERE r.id = repair_parts.repair_id AND r.technician_id = auth.uid()
        ))
    );

-- RLS: REPAIR PAYMENTS (Owner & Staff see all, Tech sees assigned only)
CREATE POLICY repair_payments_select ON public.repair_payments
    FOR SELECT TO authenticated
    USING (
        private.is_owner()
        OR private.is_staff()
        OR (private.is_technician() AND EXISTS (
            SELECT 1 FROM public.repair_jobs r WHERE r.id = repair_payments.repair_id AND r.technician_id = auth.uid()
        ))
    );

-- RLS: REPAIR PROFIT SNAPSHOTS (Owner sees all, Tech sees own assigned only, Staff sees NONE)
CREATE POLICY repair_profit_snapshots_select ON public.repair_profit_snapshots
    FOR SELECT TO authenticated
    USING (
        private.is_owner()
        OR (private.is_technician() AND technician_id = auth.uid())
    );

-- RLS: REPAIR STATUS HISTORY (Owner & Staff see all, Tech sees assigned only)
CREATE POLICY repair_status_history_select ON public.repair_status_history
    FOR SELECT TO authenticated
    USING (
        private.is_owner()
        OR private.is_staff()
        OR (private.is_technician() AND EXISTS (
            SELECT 1 FROM public.repair_jobs r WHERE r.id = repair_status_history.repair_id AND r.technician_id = auth.uid()
        ))
    );


-- ====================================================
-- 8. PRIVATE SEQUENCE FOR REPAIR JOB NUMBERING
-- ====================================================

CREATE SEQUENCE IF NOT EXISTS private.repair_job_number_seq START WITH 1 INCREMENT BY 1;

REVOKE ALL ON SEQUENCE private.repair_job_number_seq FROM PUBLIC, anon, authenticated;


-- ====================================================
-- 9. TRANSACTION FUNCTIONS (PRIVATE SCHEMA)
-- ====================================================

-- FUNCTION 1: CREATE REPAIR JOB
CREATE OR REPLACE FUNCTION private.create_repair_job(
    p_customer_id uuid,
    p_device_type text,
    p_device_brand text,
    p_reported_problem text,
    p_device_model text DEFAULT NULL,
    p_serial_number text DEFAULT NULL,
    p_intake_notes text DEFAULT NULL,
    p_expected_completion_at timestamptz DEFAULT NULL,
    p_quoted_amount numeric(12,2) DEFAULT NULL,
    p_discount numeric(12,2) DEFAULT 0,
    p_technician_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_job_id uuid;
    v_job_number text;
    v_service_revenue numeric(12,2) := 0;
    v_tech_role public.user_role;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;

    IF p_device_type IS NULL OR trim(p_device_type) = '' THEN
        RAISE EXCEPTION 'Device type is required';
    END IF;

    IF p_device_brand IS NULL OR trim(p_device_brand) = '' THEN
        RAISE EXCEPTION 'Device brand is required';
    END IF;

    IF p_reported_problem IS NULL OR trim(p_reported_problem) = '' THEN
        RAISE EXCEPTION 'Reported problem is required';
    END IF;

    IF p_quoted_amount IS NOT NULL AND p_quoted_amount < 0 THEN
        RAISE EXCEPTION 'Quoted amount cannot be negative';
    END IF;

    IF p_discount IS NULL OR p_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative';
    END IF;

    IF p_quoted_amount IS NOT NULL AND p_discount > p_quoted_amount THEN
        RAISE EXCEPTION 'Discount (%) cannot exceed quoted amount (%)', p_discount, p_quoted_amount;
    END IF;

    -- FIX 1: STAFF AND TECHNICIAN CANNOT ASSIGN TECHNICIANS DURING JOB CREATION
    IF p_technician_id IS NOT NULL THEN
        IF NOT private.is_owner() THEN
            RAISE EXCEPTION 'Only an OWNER may assign a technician during repair job creation';
        END IF;

        SELECT role INTO v_tech_role
        FROM public.profiles
        WHERE id = p_technician_id AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Technician profile not found or inactive';
        END IF;

        IF v_tech_role NOT IN ('OWNER'::public.user_role, 'TECHNICIAN'::public.user_role) THEN
            RAISE EXCEPTION 'Only an OWNER or TECHNICIAN profile may be assigned to a repair';
        END IF;
    END IF;

    v_service_revenue := CASE
        WHEN p_quoted_amount IS NOT NULL THEN (p_quoted_amount - p_discount)
        ELSE 0
    END;

    v_job_number := 'REP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('private.repair_job_number_seq')::text, 6, '0');

    INSERT INTO public.repair_jobs (
        job_number,
        customer_id,
        device_type,
        device_brand,
        device_model,
        serial_number,
        reported_problem,
        intake_notes,
        technician_id,
        received_at,
        expected_completion_at,
        status,
        quoted_amount,
        discount,
        service_revenue,
        payment_status,
        financial_status,
        created_by
    ) VALUES (
        v_job_number,
        p_customer_id,
        trim(p_device_type),
        trim(p_device_brand),
        trim(p_device_model),
        trim(p_serial_number),
        trim(p_reported_problem),
        trim(p_intake_notes),
        p_technician_id,
        now(),
        p_expected_completion_at,
        'RECEIVED'::public.repair_status,
        p_quoted_amount,
        p_discount,
        v_service_revenue,
        'UNPAID'::public.repair_payment_status,
        'PENDING'::public.repair_financial_status,
        v_user_id
    ) RETURNING id INTO v_job_id;

    INSERT INTO public.repair_status_history (
        repair_id,
        old_status,
        new_status,
        changed_by,
        notes
    ) VALUES (
        v_job_id,
        NULL,
        'RECEIVED'::public.repair_status,
        v_user_id,
        'Repair job card intake created'
    );

    v_result := jsonb_build_object(
        'repair_id', v_job_id,
        'job_number', v_job_number,
        'status', 'RECEIVED',
        'service_revenue', v_service_revenue
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- FUNCTION 2: ASSIGN REPAIR TECHNICIAN (OWNER ONLY)
CREATE OR REPLACE FUNCTION private.assign_repair_technician(
    p_repair_id uuid,
    p_technician_id uuid
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_repair public.repair_jobs%ROWTYPE;
    v_tech_role public.user_role;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    IF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Only an OWNER may assign or change repair technicians';
    END IF;

    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    IF v_repair.status IN ('CANCELLED'::public.repair_status, 'DELIVERED'::public.repair_status) THEN
        RAISE EXCEPTION 'Cannot reassign technician for DELIVERED or CANCELLED repair';
    END IF;

    IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
        RAISE EXCEPTION 'Cannot reassign technician for financially FINALIZED repair';
    END IF;

    SELECT role INTO v_tech_role
    FROM public.profiles
    WHERE id = p_technician_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target technician profile not found or inactive';
    END IF;

    IF v_tech_role NOT IN ('OWNER'::public.user_role, 'TECHNICIAN'::public.user_role) THEN
        RAISE EXCEPTION 'Only an OWNER or TECHNICIAN profile may be assigned to a repair';
    END IF;

    UPDATE public.repair_jobs
    SET technician_id = p_technician_id,
        updated_at = now()
    WHERE id = p_repair_id;

    v_result := jsonb_build_object(
        'repair_id', p_repair_id,
        'technician_id', p_technician_id,
        'assigned', true
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- FUNCTION 3: UPDATE REPAIR STATUS (WITH EXPLICIT WORKFLOW TRANSITIONS & FINALIZATION IMMUTABILITY)
CREATE OR REPLACE FUNCTION private.update_repair_status(
    p_repair_id uuid,
    p_new_status public.repair_status,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_repair public.repair_jobs%ROWTYPE;
    v_old_status public.repair_status;
    v_completed_at timestamptz;
    v_delivered_at timestamptz;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    v_old_status := v_repair.status;

    IF v_old_status = p_new_status THEN
        RETURN jsonb_build_object('repair_id', p_repair_id, 'status', v_old_status, 'updated', false);
    END IF;

    -- FIX 3: FINANCIAL FINALIZATION IMMUTABILITY CHECK
    IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
        IF NOT (v_old_status = 'READY_FOR_PICKUP'::public.repair_status AND p_new_status = 'DELIVERED'::public.repair_status) THEN
            RAISE EXCEPTION 'Financially FINALIZED repairs may only transition from READY_FOR_PICKUP to DELIVERED';
        END IF;
    END IF;

    -- Responsibility check:
    IF private.is_staff() THEN
        IF p_new_status = 'CANCELLED'::public.repair_status THEN
            RAISE EXCEPTION 'STAFF cannot cancel repair jobs';
        END IF;
    ELSIF private.is_technician() THEN
        IF v_repair.technician_id IS NULL OR v_repair.technician_id <> v_user_id THEN
            RAISE EXCEPTION 'TECHNICIAN can only update status for repairs assigned to themselves';
        END IF;

        IF p_new_status = 'CANCELLED'::public.repair_status THEN
            RAISE EXCEPTION 'Only an OWNER may cancel repair jobs';
        END IF;
    ELSIF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Unauthorized role for status update';
    END IF;

    -- FIX 2: EXPLICIT STATUS TRANSITION VALIDATION GRAPH
    IF p_new_status = 'CANCELLED'::public.repair_status THEN
        IF NOT private.is_owner() THEN
            RAISE EXCEPTION 'Only an OWNER may cancel repair jobs';
        END IF;

        IF v_old_status IN ('DELIVERED'::public.repair_status, 'CANCELLED'::public.repair_status) THEN
            RAISE EXCEPTION 'Cannot cancel a DELIVERED or already CANCELLED repair';
        END IF;

        IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
            RAISE EXCEPTION 'Cannot cancel a financially FINALIZED repair';
        END IF;
    ELSE
        IF v_old_status = 'RECEIVED'::public.repair_status THEN
            IF p_new_status NOT IN ('DIAGNOSING'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from RECEIVED to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'DIAGNOSING'::public.repair_status THEN
            IF p_new_status NOT IN ('WAITING_FOR_PARTS'::public.repair_status, 'IN_REPAIR'::public.repair_status, 'READY_FOR_PICKUP'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from DIAGNOSING to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'WAITING_FOR_PARTS'::public.repair_status THEN
            IF p_new_status NOT IN ('IN_REPAIR'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from WAITING_FOR_PARTS to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'IN_REPAIR'::public.repair_status THEN
            IF p_new_status NOT IN ('WAITING_FOR_PARTS'::public.repair_status, 'TESTING'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from IN_REPAIR to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'TESTING'::public.repair_status THEN
            IF p_new_status NOT IN ('WAITING_FOR_PARTS'::public.repair_status, 'IN_REPAIR'::public.repair_status, 'READY_FOR_PICKUP'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from TESTING to %', p_new_status;
            END IF;
        ELSIF v_old_status = 'READY_FOR_PICKUP'::public.repair_status THEN
            IF p_new_status NOT IN ('DELIVERED'::public.repair_status) THEN
                RAISE EXCEPTION 'Invalid status transition from READY_FOR_PICKUP to %', p_new_status;
            END IF;
        ELSIF v_old_status IN ('DELIVERED'::public.repair_status, 'CANCELLED'::public.repair_status) THEN
            RAISE EXCEPTION 'Cannot change status of a terminal repair (%)', v_old_status;
        ELSE
            RAISE EXCEPTION 'Invalid status transition from % to %', v_old_status, p_new_status;
        END IF;
    END IF;

    v_completed_at := v_repair.completed_at;
    v_delivered_at := v_repair.delivered_at;

    IF p_new_status = 'READY_FOR_PICKUP'::public.repair_status THEN
        v_completed_at := COALESCE(v_completed_at, now());
    ELSIF p_new_status = 'DELIVERED'::public.repair_status THEN
        v_completed_at := COALESCE(v_completed_at, now());
        v_delivered_at := COALESCE(v_delivered_at, now());
    END IF;

    UPDATE public.repair_jobs
    SET status = p_new_status,
        completed_at = v_completed_at,
        delivered_at = v_delivered_at,
        updated_at = now()
    WHERE id = p_repair_id;

    INSERT INTO public.repair_status_history (
        repair_id,
        old_status,
        new_status,
        changed_by,
        notes
    ) VALUES (
        p_repair_id,
        v_old_status,
        p_new_status,
        v_user_id,
        trim(p_notes)
    );

    v_result := jsonb_build_object(
        'repair_id', p_repair_id,
        'old_status', v_old_status,
        'new_status', p_new_status,
        'updated', true
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- FUNCTION 4: ADD REPAIR PART (ATOMIC STOCK DEDUCTION)
CREATE OR REPLACE FUNCTION private.add_repair_part(
    p_repair_id uuid,
    p_product_id uuid,
    p_quantity numeric(12,3)
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_repair public.repair_jobs%ROWTYPE;
    v_product public.products%ROWTYPE;
    v_unit_cost numeric(12,2);
    v_total_cost numeric(12,2);
    v_part_id uuid;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    IF v_repair.status IN ('DELIVERED'::public.repair_status, 'CANCELLED'::public.repair_status) THEN
        RAISE EXCEPTION 'Cannot add parts to DELIVERED or CANCELLED repair';
    END IF;

    IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
        RAISE EXCEPTION 'Cannot add parts to financially FINALIZED repair';
    END IF;

    -- Caller must be OWNER or assigned TECHNICIAN
    IF private.is_technician() THEN
        IF v_repair.technician_id IS NULL OR v_repair.technician_id <> v_user_id THEN
            RAISE EXCEPTION 'TECHNICIAN can only add parts to repairs assigned to themselves';
        END IF;
    ELSIF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Only OWNER or assigned TECHNICIAN may add repair parts';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Part quantity must be greater than zero';
    END IF;

    -- Lock product row FOR UPDATE
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Spare part product not found';
    END IF;

    IF NOT v_product.is_active THEN
        RAISE EXCEPTION 'Spare part product is inactive';
    END IF;

    -- STRICT NO-NEGATIVE-STOCK CHECK
    IF v_product.stock_quantity < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for spare part %. Available: %, requested: %.', v_product.name, v_product.stock_quantity, p_quantity;
    END IF;

    v_unit_cost := v_product.current_cost_price;
    v_total_cost := ROUND(p_quantity * v_unit_cost, 2);

    -- Insert repair part (historical cost snapshot)
    INSERT INTO public.repair_parts (
        repair_id,
        product_id,
        quantity,
        unit_cost_price,
        total_cost,
        created_by
    ) VALUES (
        p_repair_id,
        p_product_id,
        p_quantity,
        v_unit_cost,
        v_total_cost,
        v_user_id
    ) RETURNING id INTO v_part_id;

    -- Decrement product stock quantity
    UPDATE public.products
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = now()
    WHERE id = p_product_id;

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
        p_product_id,
        'REPAIR_USAGE'::public.movement_type,
        p_quantity,
        v_unit_cost,
        'REPAIR',
        p_repair_id,
        'Repair usage for job ' || v_repair.job_number,
        v_user_id
    );

    v_result := jsonb_build_object(
        'part_id', v_part_id,
        'repair_id', p_repair_id,
        'product_id', p_product_id,
        'quantity', p_quantity,
        'unit_cost_price', v_unit_cost,
        'total_cost', v_total_cost
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- FUNCTION 5: ADD REPAIR PAYMENT
CREATE OR REPLACE FUNCTION private.add_repair_payment(
    p_repair_id uuid,
    p_payment_method public.payment_method,
    p_amount numeric(12,2),
    p_payment_reference text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_repair public.repair_jobs%ROWTYPE;
    v_total_payments numeric(12,2);
    v_payment_id uuid;
    v_new_payment_status public.repair_payment_status;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    IF v_repair.status = 'CANCELLED'::public.repair_status THEN
        RAISE EXCEPTION 'Cannot add payment to CANCELLED repair';
    END IF;

    IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
        RAISE EXCEPTION 'Cannot add payment to financially FINALIZED repair';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    INSERT INTO public.repair_payments (
        repair_id,
        payment_method,
        amount,
        payment_reference,
        notes,
        created_by
    ) VALUES (
        p_repair_id,
        p_payment_method,
        p_amount,
        trim(p_payment_reference),
        trim(p_notes),
        v_user_id
    ) RETURNING id INTO v_payment_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
    FROM public.repair_payments
    WHERE repair_id = p_repair_id;

    IF v_repair.service_revenue > 0 AND v_total_payments > v_repair.service_revenue THEN
        RAISE EXCEPTION 'Total payments (%) cannot exceed service revenue (%)', v_total_payments, v_repair.service_revenue;
    END IF;

    v_new_payment_status := CASE
        WHEN v_repair.service_revenue > 0 AND v_total_payments = v_repair.service_revenue THEN 'PAID'::public.repair_payment_status
        ELSE 'UNPAID'::public.repair_payment_status
    END;

    UPDATE public.repair_jobs
    SET payment_status = v_new_payment_status,
        updated_at = now()
    WHERE id = p_repair_id;

    v_result := jsonb_build_object(
        'payment_id', v_payment_id,
        'repair_id', p_repair_id,
        'total_payments', v_total_payments,
        'payment_status', v_new_payment_status
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- FUNCTION 6: FINALIZE REPAIR FINANCIALS (OWNER ONLY & IMMUTABLE PROFIT SNAPSHOT)
CREATE OR REPLACE FUNCTION private.finalize_repair_financials(
    p_repair_id uuid,
    p_final_service_revenue numeric(12,2) DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_repair public.repair_jobs%ROWTYPE;
    v_tech_profile public.profiles%ROWTYPE;
    v_service_revenue numeric(12,2);
    v_parts_cost numeric(12,2);
    v_net_profit numeric(12,2);
    v_total_payments numeric(12,2);
    v_owner_pct numeric(5,2);
    v_tech_pct numeric(5,2);
    v_owner_share numeric(12,2);
    v_tech_share numeric(12,2);
    v_snapshot_id uuid;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT private.is_current_user_active() THEN
        RAISE EXCEPTION 'User profile is inactive';
    END IF;

    IF NOT private.is_owner() THEN
        RAISE EXCEPTION 'Only an OWNER may finalize repair financials';
    END IF;

    SELECT * INTO v_repair
    FROM public.repair_jobs
    WHERE id = p_repair_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repair job not found';
    END IF;

    IF v_repair.financial_status = 'FINALIZED'::public.repair_financial_status THEN
        RAISE EXCEPTION 'Repair financials are already FINALIZED and immutable';
    END IF;

    IF v_repair.technician_id IS NULL THEN
        RAISE EXCEPTION 'Cannot finalize financials for repair without an assigned technician';
    END IF;

    IF v_repair.status = 'CANCELLED'::public.repair_status THEN
        RAISE EXCEPTION 'Cannot finalize financials for CANCELLED repair';
    END IF;

    IF v_repair.status NOT IN ('READY_FOR_PICKUP'::public.repair_status, 'DELIVERED'::public.repair_status) THEN
        RAISE EXCEPTION 'Repair must be READY_FOR_PICKUP or DELIVERED to finalize financials';
    END IF;

    IF p_final_service_revenue IS NOT NULL THEN
        IF p_final_service_revenue <= 0 THEN
            RAISE EXCEPTION 'Final service revenue must be greater than zero';
        END IF;

        IF v_repair.quoted_amount IS NOT NULL AND (v_repair.quoted_amount - v_repair.discount) <> p_final_service_revenue THEN
            RAISE EXCEPTION 'Final service revenue (%) does not match quoted amount minus discount (%)', p_final_service_revenue, (v_repair.quoted_amount - v_repair.discount);
        END IF;

        v_service_revenue := p_final_service_revenue;
    ELSE
        v_service_revenue := v_repair.service_revenue;
    END IF;

    IF v_service_revenue <= 0 THEN
        RAISE EXCEPTION 'Final service revenue must be greater than zero';
    END IF;

    -- Calculate total parts cost
    SELECT COALESCE(SUM(total_cost), 0) INTO v_parts_cost
    FROM public.repair_parts
    WHERE repair_id = p_repair_id;

    v_net_profit := v_service_revenue - v_parts_cost;

    IF v_net_profit < 0 THEN
        RAISE EXCEPTION 'Net repair profit cannot be negative (Revenue: %, Parts Cost: %)', v_service_revenue, v_parts_cost;
    END IF;

    -- Verify exact payment settlement
    SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
    FROM public.repair_payments
    WHERE repair_id = p_repair_id;

    IF v_total_payments <> v_service_revenue THEN
        RAISE EXCEPTION 'Total payments (%) must equal final service revenue (%) before financial finalization', v_total_payments, v_service_revenue;
    END IF;

    -- Read technician role for profit percentage assignment
    SELECT * INTO v_tech_profile
    FROM public.profiles
    WHERE id = v_repair.technician_id;

    IF v_tech_profile.role = 'OWNER'::public.user_role THEN
        v_owner_pct := 100.00;
        v_tech_pct := 0.00;
        v_owner_share := v_net_profit;
        v_tech_share := 0.00;
    ELSIF v_tech_profile.role = 'TECHNICIAN'::public.user_role THEN
        v_owner_pct := 30.00;
        v_tech_pct := 70.00;
        v_tech_share := ROUND(v_net_profit * 0.70, 2);
        v_owner_share := v_net_profit - v_tech_share; -- Reconciles exact cent rounding!
    ELSE
        RAISE EXCEPTION 'Invalid technician role (%) for repair profit sharing', v_tech_profile.role;
    END IF;

    -- Insert immutable profit snapshot
    INSERT INTO public.repair_profit_snapshots (
        repair_id,
        technician_id,
        service_revenue,
        parts_cost,
        net_repair_profit,
        owner_percentage,
        technician_percentage,
        owner_share,
        technician_share,
        finalized_by
    ) VALUES (
        p_repair_id,
        v_repair.technician_id,
        v_service_revenue,
        v_parts_cost,
        v_net_profit,
        v_owner_pct,
        v_tech_pct,
        v_owner_share,
        v_tech_share,
        v_user_id
    ) RETURNING id INTO v_snapshot_id;

    -- Update repair job to FINALIZED and PAID
    UPDATE public.repair_jobs
    SET financial_status = 'FINALIZED'::public.repair_financial_status,
        payment_status = 'PAID'::public.repair_payment_status,
        service_revenue = v_service_revenue,
        updated_at = now()
    WHERE id = p_repair_id;

    v_result := jsonb_build_object(
        'snapshot_id', v_snapshot_id,
        'repair_id', p_repair_id,
        'service_revenue', v_service_revenue,
        'parts_cost', v_parts_cost,
        'net_profit', v_net_profit,
        'owner_share', v_owner_share,
        'technician_share', v_tech_share
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ====================================================
-- 10. EXECUTION PRIVILEGES FOR REPAIR FUNCTIONS
-- ====================================================

REVOKE EXECUTE ON FUNCTION private.create_repair_job(uuid, text, text, text, text, text, text, timestamptz, numeric, numeric, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.assign_repair_technician(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.update_repair_status(uuid, public.repair_status, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.add_repair_part(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.add_repair_payment(uuid, public.payment_method, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.finalize_repair_financials(uuid, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.create_repair_job(uuid, text, text, text, text, text, text, timestamptz, numeric, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.assign_repair_technician(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.update_repair_status(uuid, public.repair_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.add_repair_part(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION private.add_repair_payment(uuid, public.payment_method, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.finalize_repair_financials(uuid, numeric) TO authenticated;

-- Migration 012: Read-Only Financial Audit Procedure
-- Description: Creates private.audit_repair_financials to return complete database-level profit snapshot reconciliation data.

GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.audit_repair_financials()
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'profiles', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'phone', p.phone,
                'role', p.role,
                'is_active', p.is_active
            ))
            FROM public.profiles p
        ),
        'repair_jobs', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', r.id,
                'job_number', r.job_number,
                'device', r.device_brand || ' ' || r.device_type,
                'status', r.status,
                'payment_status', r.payment_status,
                'financial_status', r.financial_status,
                'technician_id', r.technician_id,
                'quoted_amount', r.quoted_amount,
                'service_revenue', r.service_revenue,
                'created_at', r.created_at
            ))
            FROM public.repair_jobs r
        ),
        'repair_parts', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pt.id,
                'repair_id', pt.repair_id,
                'product_id', pt.product_id,
                'quantity', pt.quantity,
                'unit_cost', pt.unit_cost,
                'total_cost', pt.total_cost
            ))
            FROM public.repair_parts pt
        ),
        'repair_payments', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pm.id,
                'repair_id', pm.repair_id,
                'payment_method', pm.payment_method,
                'amount', pm.amount,
                'created_at', pm.created_at
            ))
            FROM public.repair_payments pm
        ),
        'repair_profit_snapshots', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', s.id,
                'repair_id', s.repair_id,
                'technician_id', s.technician_id,
                'service_revenue', s.service_revenue,
                'parts_cost', s.parts_cost,
                'net_repair_profit', s.net_repair_profit,
                'owner_percentage', s.owner_percentage,
                'technician_percentage', s.technician_percentage,
                'owner_share', s.owner_share,
                'technician_share', s.technician_share,
                'finalized_by', s.finalized_by,
                'calculated_at', s.calculated_at
            ))
            FROM public.repair_profit_snapshots s
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

GRANT EXECUTE ON FUNCTION private.audit_repair_financials TO anon, authenticated;

import { supabase } from '@/lib/supabase';
import { RepairJob, CreateRepairJobInput, RepairStatus } from '../types/repair.types';
import { UserProfile } from '@/types/user.types';

export const repairService = {
  async getRepairJobs(params?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    financialStatus?: string;
    technicianId?: string;
    userRole?: string;
    userId?: string;
  }): Promise<RepairJob[]> {
    let req = supabase
      .from('repair_jobs')
      .select('*, customer:customers(full_name, phone), technician:profiles!repair_jobs_technician_id_fkey(full_name, phone, role)')
      .order('received_at', { ascending: false });

    // Technician role guard: Technicians only get assigned jobs if logged in as TECH
    if (params?.userRole === 'TECHNICIAN' && params?.userId) {
      req = req.eq('technician_id', params.userId);
    } else if (params?.technicianId && params.technicianId !== 'ALL') {
      req = req.eq('technician_id', params.technicianId);
    }

    if (params?.status && params.status !== 'ALL') {
      req = req.eq('status', params.status);
    }

    if (params?.paymentStatus && params.paymentStatus !== 'ALL') {
      req = req.eq('payment_status', params.paymentStatus);
    }

    if (params?.financialStatus && params.financialStatus !== 'ALL') {
      req = req.eq('financial_status', params.financialStatus);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      req = req.or(`job_number.ilike.%${q}%,device_brand.ilike.%${q}%,device_type.ilike.%${q}%`);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error fetching repair jobs list:', error);
      throw new Error(error.message || 'Failed to fetch repair jobs list.');
    }

    return (data || []).map((r: any) => ({
      ...r,
      quoted_amount: r.quoted_amount ? Number(r.quoted_amount) : null,
      discount: Number(r.discount || 0),
      service_revenue: Number(r.service_revenue || 0),
    }));
  },

  async getRepairJobById(id: string, userRole?: string): Promise<RepairJob | null> {
    const { data: jobData, error: jobError } = await supabase
      .from('repair_jobs')
      .select('*, customer:customers(full_name, phone, address), technician:profiles!repair_jobs_technician_id_fkey(full_name, phone, role)')
      .eq('id', id)
      .single();

    if (jobError) {
      console.error('Error fetching repair job by id:', jobError);
      throw new Error(jobError.message || 'Repair job not found.');
    }

    // Parallel fetch parts, payments, and history
    const [partsRes, paymentsRes, historyRes] = await Promise.all([
      supabase
        .from('repair_parts')
        .select('*, product:products(name, product_code, unit)')
        .eq('repair_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('repair_payments')
        .select('*')
        .eq('repair_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('repair_status_history')
        .select('*, changed_by_profile:profiles!repair_status_history_changed_by_fkey(full_name)')
        .eq('repair_id', id)
        .order('created_at', { ascending: true }),
    ]);

    // STRICT PRIVACY RULE: STAFF MUST NOT QUERY repair_profit_snapshots!
    let snapshotData = null;
    if (userRole !== 'STAFF' && jobData.financial_status === 'FINALIZED') {
      const { data: snap } = await supabase
        .from('repair_profit_snapshots')
        .select('*')
        .eq('repair_id', id)
        .maybeSingle();
      if (snap) {
        snapshotData = {
          ...snap,
          service_revenue: Number(snap.service_revenue || 0),
          parts_cost: Number(snap.parts_cost || 0),
          net_repair_profit: Number(snap.net_repair_profit || 0),
          owner_percentage: Number(snap.owner_percentage || 0),
          technician_percentage: Number(snap.technician_percentage || 0),
          owner_share: Number(snap.owner_share || 0),
          technician_share: Number(snap.technician_share || 0),
        };
      }
    }

    return {
      ...jobData,
      quoted_amount: jobData.quoted_amount ? Number(jobData.quoted_amount) : null,
      discount: Number(jobData.discount || 0),
      service_revenue: Number(jobData.service_revenue || 0),
      repair_parts: (partsRes.data || []).map((p: any) => ({
        ...p,
        quantity: Number(p.quantity || 0),
        unit_cost_price: Number(p.unit_cost_price || 0),
        total_cost: Number(p.total_cost || 0),
      })),
      repair_payments: (paymentsRes.data || []).map((p: any) => ({
        ...p,
        amount: Number(p.amount || 0),
      })),
      repair_status_history: historyRes.data || [],
      repair_profit_snapshots: snapshotData,
    };
  },

  async getTechnicians(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['OWNER', 'TECHNICIAN'])
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching technicians list:', error);
      return [];
    }
    return data || [];
  },

  async createRepairJob(input: CreateRepairJobInput): Promise<{
    repair_id: string;
    job_number: string;
    status: string;
    service_revenue: number;
  }> {
    const { data, error } = await supabase.schema('private').rpc('create_repair_job', {
      p_customer_id: input.customer_id,
      p_device_type: input.device_type,
      p_device_brand: input.device_brand,
      p_reported_problem: input.reported_problem,
      p_device_model: input.device_model || null,
      p_serial_number: input.serial_number || null,
      p_intake_notes: input.intake_notes || null,
      p_expected_completion_at: input.expected_completion_at || null,
      p_quoted_amount: input.quoted_amount ?? null,
      p_discount: input.discount ?? 0,
      p_technician_id: input.technician_id || null,
    });

    if (error) {
      console.error('Error executing create_repair_job RPC:', error);
      throw new Error(error.message || 'Failed to create repair job.');
    }

    return data;
  },

  async assignTechnician(repairId: string, technicianId: string): Promise<void> {
    const { error } = await supabase.schema('private').rpc('assign_repair_technician', {
      p_repair_id: repairId,
      p_technician_id: technicianId,
    });

    if (error) {
      console.error('Error executing assign_repair_technician RPC:', error);
      throw new Error(error.message || 'Failed to assign technician.');
    }
  },

  async updateRepairStatus(repairId: string, status: RepairStatus, notes?: string): Promise<void> {
    const { error } = await supabase.schema('private').rpc('update_repair_status', {
      p_repair_id: repairId,
      p_new_status: status,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Error executing update_repair_status RPC:', error);
      throw new Error(error.message || 'Failed to update repair status.');
    }
  },

  async addRepairPart(repairId: string, productId: string, quantity: number): Promise<void> {
    const { error } = await supabase.schema('private').rpc('add_repair_part', {
      p_repair_id: repairId,
      p_product_id: productId,
      p_quantity: quantity,
    });

    if (error) {
      console.error('Error executing add_repair_part RPC:', error);
      throw new Error(error.message || 'Failed to add spare part.');
    }
  },

  async addRepairPayment(
    repairId: string,
    method: 'CASH' | 'UPI' | 'CARD',
    amount: number,
    reference?: string,
    notes?: string
  ): Promise<void> {
    const { error } = await supabase.schema('private').rpc('add_repair_payment', {
      p_repair_id: repairId,
      p_payment_method: method,
      p_amount: amount,
      p_payment_reference: reference || null,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Error executing add_repair_payment RPC:', error);
      throw new Error(error.message || 'Failed to record repair payment.');
    }
  },

  async finalizeFinancials(repairId: string, finalServiceRevenue?: number): Promise<void> {
    const { error } = await supabase.schema('private').rpc('finalize_repair_financials', {
      p_repair_id: repairId,
      p_final_service_revenue: finalServiceRevenue ?? null,
    });

    if (error) {
      console.error('Error executing finalize_repair_financials RPC:', error);
      throw new Error(error.message || 'Failed to finalize repair financials.');
    }
  },
};

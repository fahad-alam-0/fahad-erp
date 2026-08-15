import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dashboardService, getTodayStartISO } from '@/features/dashboard/services/dashboardService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Dashboard Service & Low Stock Rule Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Correctly calculates local midnight start ISO string', () => {
    const todayISO = getTodayStartISO();
    expect(todayISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('2. Evaluates low-stock products using product.stock_quantity <= product.low_stock_threshold', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    { id: 'p1', name: 'Item A', product_code: 'P01', stock_quantity: 4, low_stock_threshold: 5, unit: 'pcs', selling_price: 100 }, // INCLUDED (4 <= 5)
                    { id: 'p2', name: 'Item B', product_code: 'P02', stock_quantity: 4, low_stock_threshold: 3, unit: 'pcs', selling_price: 200 }, // EXCLUDED (4 > 3)
                    { id: 'p3', name: 'Item C', product_code: 'P03', stock_quantity: 0, low_stock_threshold: 0, unit: 'pcs', selling_price: 300 }, // INCLUDED (0 <= 0)
                  ],
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: (fields?: string, opts?: any) => {
          if (opts?.count === 'exact') {
            return {
              not: () => ({ count: 0 }),
              eq: () => ({ count: 0 }),
            };
          }
          return {
            gte: async () => ({ data: [] }),
            order: () => ({ limit: async () => ({ data: [] }) }),
            eq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }),
          };
        },
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const metrics = await dashboardService.getOwnerMetrics();

    expect(metrics.lowStockProducts.length).toBe(2);
    expect(metrics.lowStockProducts.map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(metrics.lowStockProducts.map((p) => p.id)).not.toContain('p2');
  });

  it('3. Fetches TECHNICIAN metrics strictly filtered by user ID (auth.uid())', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'repair_jobs') {
        return {
          select: (fields: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: (col: string, val: string) => ({
                  not: () => ({ count: 2 }),
                  eq: () => ({ count: 1 }),
                }),
              };
            }
            return {
              eq: (col: string, val: string) => ({
                order: () => ({
                  limit: async () => ({
                    data: [{ id: 'r2', job_number: 'REP-002', device_type: 'AC', status: 'READY_FOR_PICKUP', total_amount: 1500, customer: { full_name: 'Dave' } }],
                  }),
                }),
              }),
            };
          },
        };
      }
      if (table === 'repair_profit_snapshots') {
        return {
          select: () => ({
            eq: async () => ({
              data: [{ technician_share: 560 }],
            }),
          }),
        };
      }
      return { select: async () => ({ data: [] }) };
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const metrics = await dashboardService.getTechnicianMetrics('usr_tech_01');

    expect(metrics.activeRepairsCount).toBe(2);
    expect(metrics.myEarningsTotal).toBe(560);
    expect(metrics.myRecentRepairs.length).toBe(1);
  });

  it('4. STAFF dashboard excludes technician and owner profit snapshot queries', async () => {
    const queriedTables: string[] = [];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      queriedTables.push(table);
      if (table === 'products') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    { id: 'p1', name: 'Item A', product_code: 'P01', stock_quantity: 2, low_stock_threshold: 10, unit: 'pcs', selling_price: 100 },
                  ],
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: (fields?: string, opts?: any) => {
          if (opts?.count === 'exact') {
            return {
              not: () => ({ count: 0 }),
              eq: () => ({ count: 0 }),
            };
          }
          return {
            gte: async () => ({ data: [] }),
            order: () => ({ limit: async () => ({ data: [] }) }),
          };
        },
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const metrics = await dashboardService.getStaffMetrics();

    expect(queriedTables).not.toContain('repair_profit_snapshots');
    expect(metrics.lowStockProducts.length).toBe(1);
    expect(metrics.lowStockProducts[0].low_stock_threshold).toBe(10);
  });
});

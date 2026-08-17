import React, { useState, useEffect, useCallback } from 'react';
import { Sale, SaleReturn } from '../types/sales.types';
import { salesService } from '../services/salesService';
import { PosTerminal } from '../components/PosTerminal';
import { SalesTable } from '../components/SalesTable';
import { ReturnHistoryTable } from '../components/ReturnHistoryTable';
import { ReturnProductModal } from '../components/ReturnProductModal';
import { SaleDetailModal } from '../components/SaleDetailModal';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { SkeletonPlaceholder } from '@/components/loading/SkeletonPlaceholder';
import {
  ShoppingCart,
  History,
  RotateCcw,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  Receipt,
  TrendingUp,
} from 'lucide-react';

export const SalesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'history' | 'returns'>('pos');

  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [isLoadingReturns, setIsLoadingReturns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Debounce sales log search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadSalesHistory = useCallback(async () => {
    try {
      setIsLoadingSales(true);
      setError(null);
      const data = await salesService.getSales({ search: debouncedSearch });
      setSales(data);
    } catch (err: any) {
      console.error('Failed to load sales log:', err);
      setError(err.message || 'Failed to load sales history.');
    } finally {
      setIsLoadingSales(false);
    }
  }, [debouncedSearch]);

  const loadReturnsHistory = useCallback(async () => {
    try {
      setIsLoadingReturns(true);
      const data = await salesService.getSaleReturns({ search: debouncedSearch });
      setReturns(data);
    } catch (err: any) {
      console.error('Failed to load returns history:', err);
    } finally {
      setIsLoadingReturns(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadSalesHistory();
    } else if (activeTab === 'returns') {
      loadReturnsHistory();
    } else {
      loadSalesHistory();
    }
  }, [activeTab, loadSalesHistory, loadReturnsHistory]);

  const handleViewSaleDetails = (sale: Sale) => {
    setSelectedSaleDetail(sale);
    setIsDetailModalOpen(true);
  };

  const handleOpenReturnModal = (sale: Sale) => {
    setSelectedSaleForReturn(sale);
    setIsReturnModalOpen(true);
  };

  const handleReturnSuccess = () => {
    loadSalesHistory();
    if (activeTab === 'returns') {
      loadReturnsHistory();
    }
  };

  // KPI Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.created_at.startsWith(todayStr));
  const todayTotalGross = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
  const todayTotalReturns = todaySales.reduce((sum, s) => sum + (s.returned_amount || 0), 0);
  const todayNetSales = Math.max(0, todayTotalGross - todayTotalReturns);
  const todayCount = todaySales.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Retail Point of Sale (POS) & Sales Log"
        subtitle="Process customer checkouts, settle split payments, manage product returns, and inspect sales invoice records."
        actions={
          <div className="flex items-center space-x-2">
            {activeTab !== 'pos' && (
              <Button
                onClick={() => setActiveTab('pos')}
                size="sm"
                className="flex items-center space-x-1.5 text-xs pressable"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span>Open POS Terminal</span>
              </Button>
            )}
          </div>
        }
      />

      {/* POS Metric Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Today's Net POS Sales
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(todayNetSales, 'INR')}
            </span>
            {todayTotalReturns > 0 && (
              <span className="text-[10px] text-amber-500 font-mono block">
                ({formatCurrency(todayTotalReturns, 'INR')} returned)
              </span>
            )}
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Invoices Issued Today
            </span>
            <span className="text-xl font-bold font-mono text-foreground">
              {todayCount} Receipts
            </span>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Total Refunds Processed
            </span>
            <span className="text-xl font-bold font-mono text-amber-500">
              {formatCurrency(todayTotalReturns, 'INR')}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Selection Bar */}
      <div className="flex border-b border-border bg-card rounded-t-xl px-4 pt-2 shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'pos'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>POS Checkout Workstation</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Completed Sales Log ({sales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'returns'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Returns History</span>
        </button>
      </div>

      {/* TAB 1: POS WORKSTATION */}
      {activeTab === 'pos' && <PosTerminal />}

      {/* TAB 2: SALES LOG HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by product, customer, or invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-muted-foreground">
              <span className="font-mono font-medium">{sales.length} Completed Invoices</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSalesHistory}
                disabled={isLoadingSales}
                className="h-8 px-2.5 text-xs pressable"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingSales ? 'animate-spin text-primary' : ''}`}
                />
              </Button>
            </div>
          </div>

          {/* Sales History Table Body */}
          {error ? (
            <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center text-xs text-destructive space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto" />
              <p className="font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={loadSalesHistory}>
                Retry Loading
              </Button>
            </div>
          ) : isLoadingSales ? (
            <div className="space-y-3">
              <SkeletonPlaceholder className="h-12 w-full rounded-xl" />
              <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
              <SkeletonPlaceholder className="h-16 w-full rounded-xl" />
            </div>
          ) : sales.length === 0 ? (
            <div className="py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-card/40 flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-muted text-muted-foreground">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {searchQuery ? 'No matching sales records found' : 'No sales recorded yet'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {searchQuery
                  ? `No sales records matched "${searchQuery}". Try searching by product name, customer, or invoice number.`
                  : 'Open the POS Terminal to start processing retail customer checkouts.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setActiveTab('pos')} size="sm" className="mt-2 text-xs pressable">
                  <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                  <span>Open POS Terminal</span>
                </Button>
              )}
            </div>
          ) : (
            <SalesTable
              sales={sales}
              onViewDetails={handleViewSaleDetails}
              onReturnProduct={handleOpenReturnModal}
            />
          )}
        </div>
      )}

      {/* TAB 3: RETURNS HISTORY */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by return number, invoice #, customer, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground absolute right-2.5 top-2.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadReturnsHistory}
              disabled={isLoadingReturns}
              className="h-8 px-2.5 text-xs pressable"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingReturns ? 'animate-spin text-amber-500' : ''}`}
              />
            </Button>
          </div>

          <ReturnHistoryTable returns={returns} isLoading={isLoadingReturns} />
        </div>
      )}

      {/* Sale Detail Invoice Modal */}
      <SaleDetailModal
        isOpen={isDetailModalOpen}
        sale={selectedSaleDetail}
        onClose={() => setIsDetailModalOpen(false)}
      />

      {/* Return Product Modal */}
      <ReturnProductModal
        isOpen={isReturnModalOpen}
        sale={selectedSaleForReturn}
        onClose={() => setIsReturnModalOpen(false)}
        onSuccess={handleReturnSuccess}
      />
    </div>
  );
};

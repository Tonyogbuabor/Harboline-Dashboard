import React, { useMemo, useState } from 'react';
import {
  Search,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CleanedOrder } from '../types/dashboard';
import { formatCurrencyExact } from '../utils/yoyUtils';

interface OrderLedgerTableProps {
  orders: CleanedOrder[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickFilterRep: (rep: string) => void;
  onQuickFilterRegion: (region: string) => void;
}

type SortField = 'orderDate' | 'revenue' | 'profit' | 'discountPct' | 'units';
type SortDir = 'asc' | 'desc';

export const OrderLedgerTable: React.FC<OrderLedgerTableProps> = ({
  orders,
  searchQuery,
  onSearchChange,
  onQuickFilterRep,
  onQuickFilterRegion,
}) => {
  const [sortField, setSortField] = useState<SortField>('orderDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const sortedOrders = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'orderDate') {
        cmp = a.orderDate.localeCompare(b.orderDate);
      } else {
        cmp = a[sortField] - b[sortField];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [orders, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleExportCsv = () => {
    const headers = [
      'Order ID',
      'Order Date',
      'Country',
      'Region',
      'State',
      'Product Category',
      'Product',
      'Sales Rep',
      'Customer Segment',
      'Channel',
      'Units',
      'Unit Price (USD)',
      'Discount %',
      'Revenue (USD)',
      'Cost (USD)',
      'Profit (USD)',
    ];
    const escapeCell = (val: string | number) => {
      const s = String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...sortedOrders.map((o) =>
        [
          o.orderId,
          o.orderDate,
          o.country,
          o.region,
          o.state,
          o.productCategory,
          o.product,
          o.salesRep,
          o.customerSegment,
          o.channel,
          o.units,
          o.unitPrice.toFixed(2),
          o.discountPct.toFixed(2),
          o.revenue.toFixed(2),
          o.cost.toFixed(2),
          o.profit.toFixed(2),
        ]
          .map(escapeCell)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harborline-cleaned-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Cleaned Order Ledger
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
            {sortedOrders.length.toLocaleString('en-US')} normalized &amp; deduplicated orders matching current filters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setPage(1);
              }}
              placeholder="Search Order ID, product, rep..."
              aria-label="Search cleaned order ledger"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#DC2626] focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sortedOrders.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold">
              <th className="py-2.5 px-3 whitespace-nowrap">Order ID</th>
              <th className="py-2.5 px-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('orderDate')}
                  className="inline-flex items-center gap-1 hover:text-[#DC2626] cursor-pointer"
                >
                  <span>Order Date</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Region / State</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Category &amp; Product</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Sales Rep</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Channel</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('units')}
                  className="inline-flex items-center justify-end gap-1 hover:text-[#DC2626] cursor-pointer ml-auto"
                >
                  <span>Units</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('discountPct')}
                  className="inline-flex items-center justify-end gap-1 hover:text-[#DC2626] cursor-pointer ml-auto"
                >
                  <span>Disc %</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('revenue')}
                  className="inline-flex items-center justify-end gap-1 hover:text-[#DC2626] cursor-pointer ml-auto"
                >
                  <span>Revenue</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort('profit')}
                  className="inline-flex items-center justify-end gap-1 hover:text-[#DC2626] cursor-pointer ml-auto"
                >
                  <span>Profit</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-sm text-gray-400">
                  No cleaned orders match the active filters.
                </td>
              </tr>
            ) : (
              pageRows.map((o) => {
                const margin = o.revenue > 0 ? (o.profit / o.revenue) * 100 : 0;
                return (
                  <tr key={o.orderId} className="hover:bg-[#FEF2F2]/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono-tabular font-medium text-gray-900 whitespace-nowrap">
                      {o.orderId}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-gray-600 whitespace-nowrap">
                      {o.orderDate}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onQuickFilterRegion(o.region)}
                        className="font-medium text-gray-800 hover:text-[#DC2626] hover:underline cursor-pointer"
                      >
                        {o.region}
                      </button>
                      <span className="text-gray-400"> · {o.state}</span>
                    </td>
                    <td className="py-2.5 px-3 max-w-[240px]">
                      <div className="font-medium text-gray-900 truncate">
                        {o.product}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {o.productCategory}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onQuickFilterRep(o.salesRep)}
                        className="text-gray-700 hover:text-[#DC2626] hover:underline cursor-pointer"
                      >
                        {o.salesRep}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                      {o.channel}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">
                      {o.units}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                        o.discountPct >= 10 ? 'text-[#EF4444]' : 'text-gray-600'
                      }`}
                    >
                      {o.discountPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatCurrencyExact(o.revenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span className="font-semibold text-gray-900">
                        {formatCurrencyExact(o.profit)}
                      </span>
                      <span className="ml-1 text-[10px] text-gray-400">
                        ({margin.toFixed(0)}%)
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {sortedOrders.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-3 tabular-nums">
            <span>
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, sortedOrders.length)} of{' '}
              {sortedOrders.length.toLocaleString('en-US')}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value={12}>12 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 font-medium tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

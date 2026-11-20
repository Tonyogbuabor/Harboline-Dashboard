import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DimensionBreakdown } from '../types/dashboard';
import { formatCurrency } from '../utils/yoyUtils';

const YoYBadge: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) return <span className="text-xs text-gray-400">—</span>;
  const pos = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
        pos ? 'text-[#10B981]' : 'text-[#EF4444]'
      }`}
    >
      {pos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {pos ? '+' : ''}
      {value}%
    </span>
  );
};

interface BreakdownTableProps {
  title: string;
  subtitle: string;
  rows: DimensionBreakdown[];
  activeKey: string;
  onSelect: (name: string) => void;
}

const BreakdownTable: React.FC<BreakdownTableProps> = ({
  title,
  subtitle,
  rows,
  activeKey,
  onSelect,
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
    <div className="flex items-center justify-between gap-2 mb-4">
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {activeKey !== 'All' && (
        <button
          type="button"
          onClick={() => onSelect('All')}
          className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
        >
          Clear Selection
        </button>
      )}
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 font-semibold">
            <th className="py-2.5 pr-3">Name</th>
            <th className="py-2.5 px-3 text-right">Orders</th>
            <th className="py-2.5 px-3 text-right">Units</th>
            <th className="py-2.5 px-3 text-right">Avg Disc %</th>
            <th className="py-2.5 px-3 text-right">Revenue</th>
            <th className="py-2.5 px-3 text-right">Gross Profit</th>
            <th className="py-2.5 px-3 text-right">Margin %</th>
            <th className="py-2.5 pl-3 text-right">YoY Δ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const selected = activeKey === r.name;
            return (
              <tr
                key={r.name}
                onClick={() => onSelect(selected ? 'All' : r.name)}
                className={`cursor-pointer transition-colors ${
                  selected ? 'bg-[#FEF2F2]' : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-2.5 pr-3">
                  <div className={`font-semibold ${selected ? 'text-[#DC2626]' : 'text-gray-900'}`}>
                    {r.name}
                  </div>
                  {r.sublabel && <div className="text-[11px] text-gray-500">{r.sublabel}</div>}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{r.orders}</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">
                  {r.units.toLocaleString('en-US')}
                </td>
                <td
                  className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                    r.avgDiscountPct >= 10 ? 'text-[#EF4444]' : 'text-gray-600'
                  }`}
                >
                  {r.avgDiscountPct}%
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-gray-900">
                  {formatCurrency(r.revenue)}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-800">
                  {formatCurrency(r.profit)}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-medium text-gray-800">
                  {r.marginPct}%
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <YoYBadge value={r.revenueYoY} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export const RegionalSectionView: React.FC<{
  regionBreakdown: DimensionBreakdown[];
  stateBreakdown: DimensionBreakdown[];
  activeRegion: string;
  activeState: string;
  onSelectRegion: (r: string) => void;
  onSelectState: (s: string) => void;
}> = ({
  regionBreakdown,
  stateBreakdown,
  activeRegion,
  activeState,
  onSelectRegion,
  onSelectState,
}) => (
  <div className="space-y-5">
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <h2 className="text-base font-bold text-gray-900">
        Region Revenue vs. Same Period Last Year (SPLY)
      </h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Side-by-side YoY territory comparison
      </p>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={regionBreakdown} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value ?? 0))}
              contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="revenue" name="Current Period" fill="#DC2626" radius={[6, 6, 0, 0]} maxBarSize={32} />
            <Bar dataKey="splyRevenue" name="SPLY Benchmark" fill="#FCA5A5" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <BreakdownTable
      title="Regional Performance Matrix"
      subtitle="Click any region row to cross-filter the dashboard"
      rows={regionBreakdown}
      activeKey={activeRegion}
      onSelect={onSelectRegion}
    />

    <BreakdownTable
      title="State-Level Breakdown"
      subtitle="Click any state row to inspect state-level orders & metrics"
      rows={stateBreakdown}
      activeKey={activeState}
      onSelect={onSelectState}
    />
  </div>
);

export const ProductsChannelsSectionView: React.FC<{
  categoryBreakdown: DimensionBreakdown[];
  productBreakdown: DimensionBreakdown[];
  channelBreakdown: DimensionBreakdown[];
  activeCategory: string;
  activeProduct: string;
  activeChannel: string;
  onSelectCategory: (c: string) => void;
  onSelectProduct: (p: string) => void;
  onSelectChannel: (ch: string) => void;
}> = ({
  categoryBreakdown,
  productBreakdown,
  channelBreakdown,
  activeCategory,
  activeProduct,
  activeChannel,
  onSelectCategory,
  onSelectProduct,
  onSelectChannel,
}) => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <h2 className="text-base font-bold text-gray-900">Channel Revenue vs. Profit</h2>
        <p className="text-xs text-gray-500 mt-0.5 mb-4">
          Distribution channel mix &amp; gross profit contribution
        </p>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={channelBreakdown} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#DC2626" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="profit" name="Gross Profit" fill="#F87171" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <BreakdownTable
        title="Sales Channels"
        subtitle="Click a channel to filter"
        rows={channelBreakdown}
        activeKey={activeChannel}
        onSelect={onSelectChannel}
      />
    </div>

    <BreakdownTable
      title="Product Category Performance"
      subtitle="Click a category to filter"
      rows={categoryBreakdown}
      activeKey={activeCategory}
      onSelect={onSelectCategory}
    />

    <BreakdownTable
      title="SKU & Product Line Matrix"
      subtitle="Click a product to drill down"
      rows={productBreakdown}
      activeKey={activeProduct}
      onSelect={onSelectProduct}
    />
  </div>
);

export const SalesRepsSectionView: React.FC<{
  repBreakdown: DimensionBreakdown[];
  activeRep: string;
  onSelectRep: (rep: string) => void;
}> = ({ repBreakdown, activeRep, onSelectRep }) => (
  <div className="space-y-5">
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <h2 className="text-base font-bold text-gray-900">
        Sales Rep Revenue vs. Gross Profit
      </h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Territory account executive volume and margin efficiency
      </p>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={repBreakdown} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value ?? 0))}
              contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="revenue" name="Revenue" fill="#DC2626" radius={[6, 6, 0, 0]} maxBarSize={32} />
            <Bar dataKey="profit" name="Gross Profit" fill="#FCA5A5" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <BreakdownTable
      title="Sales Rep Margin & Discount Audit"
      subtitle="Click any sales representative to filter orders and anomalies"
      rows={repBreakdown}
      activeKey={activeRep}
      onSelect={onSelectRep}
    />
  </div>
);

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DimensionBreakdown, TimeGranularity } from '../types/dashboard';
import { TimeSeriesPoint, formatCurrency } from '../utils/yoyUtils';

interface PrimaryChartsRowProps {
  timeSeries: TimeSeriesPoint[];
  granularity: TimeGranularity;
  onGranularityChange: (g: TimeGranularity) => void;
  showSplyLine: boolean;
  onToggleSplyLine: () => void;
  categoryBreakdown: DimensionBreakdown[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

const DONUT_COLORS = ['#DC2626', '#F87171', '#FCA5A5', '#E5E7EB', '#9CA3AF'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number;
    payload?: TimeSeriesPoint;
  }>;
  label?: string;
}

const TrendTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl bg-[#B91C1C] px-3.5 py-2.5 text-white shadow-lg border border-red-400/30">
      <div className="text-[11px] font-medium text-red-100">{point.label}</div>
      <div className="mt-0.5 text-base font-bold tabular-nums">
        {formatCurrency(point.revenue)}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-red-100 tabular-nums">
        <span>Profit: {formatCurrency(point.profit)}</span>
        <span aria-hidden="true">·</span>
        <span>{point.orders} orders</span>
      </div>
      {point.splyRevenue !== null && (
        <div className="mt-0.5 text-[11px] text-red-200 tabular-nums">
          SPLY: {formatCurrency(point.splyRevenue)}
        </div>
      )}
    </div>
  );
};

export const PrimaryChartsRow: React.FC<PrimaryChartsRowProps> = ({
  timeSeries,
  granularity,
  onGranularityChange,
  showSplyLine,
  onToggleSplyLine,
  categoryBreakdown,
  activeCategory,
  onSelectCategory,
}) => {
  const [hoveredCatIndex, setHoveredCatIndex] = useState<number | null>(null);

  const topCategories = categoryBreakdown.slice(0, 4);
  const activeSlice =
    hoveredCatIndex !== null && topCategories[hoveredCatIndex]
      ? topCategories[hoveredCatIndex]
      : topCategories[0] ?? null;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Left: Revenue & Profit Trend (8 cols) */}
      <div className="lg:col-span-8 flex flex-col rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Revenue &amp; Profit Trend
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Hover chart to inspect period revenue, gross profit &amp; SPLY benchmark
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleSplyLine}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                showSplyLine
                  ? 'border-red-200 bg-[#FEF2F2] text-[#DC2626]'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span
                className={`inline-block w-3 border-t-2 border-dashed ${
                  showSplyLine ? 'border-[#DC2626]' : 'border-gray-400'
                }`}
              />
              <span>Compare SPLY</span>
            </button>

            <div className="flex items-center rounded-xl bg-gray-100 p-1">
              {(['daily', 'weekly', 'monthly'] as TimeGranularity[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onGranularityChange(g)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                    granularity === g
                      ? 'bg-white text-[#DC2626] shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-[270px] w-full">
          {timeSeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No orders match the active filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={275}>
              <AreaChart
                data={timeSeries}
                margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="harborlineRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  minTickGap={22}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  width={56}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`
                  }
                />
                <Tooltip
                  content={<TrendTooltip />}
                  cursor={{ stroke: '#DC2626', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                {showSplyLine && (
                  <Area
                    type="monotone"
                    dataKey="splyRevenue"
                    stroke="#9CA3AF"
                    strokeWidth={1.75}
                    strokeDasharray="5 5"
                    fill="transparent"
                    connectNulls
                    dot={false}
                    activeDot={{ r: 4, fill: '#9CA3AF', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#DC2626"
                  strokeWidth={2.5}
                  fill="url(#harborlineRevGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#DC2626', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Right: Sales by Product Category Donut (4 cols) */}
      <div className="lg:col-span-4 flex flex-col rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-base font-bold text-gray-900">
            Sales by Product Category
          </h2>
          {activeCategory !== 'All' && (
            <button
              type="button"
              onClick={() => onSelectCategory('All')}
              className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {topCategories.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            No category data available.
          </div>
        ) : (
          <>
            <div className="relative h-[200px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={topCategories}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={2}
                    stroke="none"
                    onMouseEnter={(_, idx) => setHoveredCatIndex(idx)}
                    onMouseLeave={() => setHoveredCatIndex(null)}
                    onClick={(_, idx) => {
                      const entry = topCategories[idx];
                      if (entry) {
                        onSelectCategory(
                          activeCategory === entry.name ? 'All' : entry.name
                        );
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {topCategories.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                        opacity={
                          activeCategory === 'All' || activeCategory === entry.name
                            ? 1
                            : 0.35
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Callout */}
              {activeSlice && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-10">
                  <span className="text-2xl font-bold text-gray-900 tabular-nums">
                    {activeSlice.sharePct}%
                  </span>
                  <span className="text-[11px] font-medium text-gray-500 leading-tight line-clamp-2 max-w-[100px]">
                    {activeSlice.name}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Dot Legend List */}
            <div className="mt-2 space-y-2 pt-2 border-t border-gray-100">
              {topCategories.map((cat, idx) => {
                const isSelected = activeCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() =>
                      onSelectCategory(isSelected ? 'All' : cat.name)
                    }
                    className={`w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#FEF2F2] text-[#DC2626] font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                        }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="text-gray-400">
                        {formatCurrency(cat.revenue, true)}
                      </span>
                      <span className="font-semibold text-gray-900 w-10 text-right">
                        {cat.sharePct}%
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Package,
  Users,
  MapPin,
} from 'lucide-react';
import {
  AnomalyItem,
  DimensionBreakdown,
  KpiSummary,
  PeriodWindow,
} from '../types/dashboard';
import { TimeSeriesPoint, formatCurrency } from '../utils/yoyUtils';

interface SecondaryBreakdownRowProps {
  regionBreakdown: DimensionBreakdown[];
  activeRegion: string;
  onSelectRegion: (region: string) => void;
  productBreakdown: DimensionBreakdown[];
  repBreakdown: DimensionBreakdown[];
  stateBreakdown: DimensionBreakdown[];
  activeProduct: string;
  activeRep: string;
  activeState: string;
  onSelectProduct: (product: string) => void;
  onSelectRep: (rep: string) => void;
  onSelectState: (state: string) => void;
  kpi: KpiSummary;
  window: PeriodWindow;
  timeSeries: TimeSeriesPoint[];
  topAnomalies: AnomalyItem[];
  onViewAllInsights: () => void;
}

type LeaderboardTab = 'products' | 'reps' | 'states';

const RegionTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: DimensionBreakdown }>;
}> = ({ active, payload }) => {
  if (!active || !payload || !payload[0]?.payload) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl bg-[#B91C1C] px-3 py-2 text-white shadow-lg text-xs">
      <div className="font-semibold">{item.name}</div>
      <div className="mt-0.5 text-sm font-bold tabular-nums">
        {formatCurrency(item.revenue)}
      </div>
      <div className="mt-0.5 text-[11px] text-red-100 tabular-nums">
        Margin: {item.marginPct}% ·{' '}
        {item.revenueYoY !== null
          ? `${item.revenueYoY >= 0 ? '+' : ''}${item.revenueYoY}% YoY`
          : 'No SPLY'}
      </div>
    </div>
  );
};

export const SecondaryBreakdownRow: React.FC<SecondaryBreakdownRowProps> = ({
  regionBreakdown,
  activeRegion,
  onSelectRegion,
  productBreakdown,
  repBreakdown,
  stateBreakdown,
  activeProduct,
  activeRep,
  activeState,
  onSelectProduct,
  onSelectRep,
  onSelectState,
  kpi,
  window,
  timeSeries,
  topAnomalies,
  onViewAllInsights,
}) => {
  const [tab, setTab] = useState<LeaderboardTab>('products');

  const maxRegionRev =
    regionBreakdown.length > 0
      ? Math.max(...regionBreakdown.map((r) => r.revenue))
      : 0;

  const listItems =
    tab === 'products'
      ? productBreakdown.slice(0, 5)
      : tab === 'reps'
      ? repBreakdown.slice(0, 5)
      : stateBreakdown.slice(0, 5);

  const handleListClick = (name: string) => {
    if (tab === 'products') {
      onSelectProduct(activeProduct === name ? 'All' : name);
    } else if (tab === 'reps') {
      onSelectRep(activeRep === name ? 'All' : name);
    } else {
      onSelectState(activeState === name ? 'All' : name);
    }
  };

  const isRowSelected = (name: string) => {
    if (tab === 'products') return activeProduct === name;
    if (tab === 'reps') return activeRep === name;
    return activeState === name;
  };

  const primaryAlert = topAnomalies[0] ?? null;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Left (4 cols): Sales Overview by Region */}
      <div className="lg:col-span-4 flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Sales Overview by Region
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click a bar to filter dashboard
            </p>
          </div>
          {activeRegion !== 'All' && (
            <button
              type="button"
              onClick={() => onSelectRegion('All')}
              className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>

        <div className="flex-1 min-h-[225px] w-full">
          {regionBreakdown.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No regional data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={235}>
              <BarChart
                data={regionBreakdown}
                margin={{ top: 12, right: 6, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 10.5 }}
                  interval={0}
                  tickFormatter={(val: string) =>
                    val.length > 9 ? `${val.slice(0, 8)}…` : val
                  }
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`
                  }
                />
                <Tooltip content={<RegionTooltip />} cursor={{ fill: '#FEF2F2' }} />
                <Bar
                  dataKey="revenue"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                  onClick={(_, idx) => {
                    const entry = regionBreakdown[idx];
                    if (entry) {
                      onSelectRegion(activeRegion === entry.name ? 'All' : entry.name);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {regionBreakdown.map((entry) => {
                    const isHighlighted =
                      activeRegion !== 'All'
                        ? activeRegion === entry.name
                        : entry.revenue === maxRegionRev;
                    return (
                      <Cell
                        key={entry.name}
                        fill={isHighlighted ? '#DC2626' : '#FCA5A5'}
                        opacity={
                          activeRegion === 'All' || activeRegion === entry.name
                            ? 1
                            : 0.45
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Middle (4 cols): Top Products & Rep Leaderboard */}
      <div className="lg:col-span-4 flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-bold text-gray-900">Leaderboard</h2>
          <div className="flex items-center rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setTab('products')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'products'
                  ? 'bg-white text-[#DC2626] shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Top Products
            </button>
            <button
              type="button"
              onClick={() => setTab('reps')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'reps'
                  ? 'bg-white text-[#DC2626] shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sales Reps
            </button>
            <button
              type="button"
              onClick={() => setTab('states')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab === 'states'
                  ? 'bg-white text-[#DC2626] shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Top States
            </button>
          </div>
        </div>

        <div className="flex-1 divide-y divide-gray-100">
          {listItems.length === 0 ? (
            <div className="flex h-full items-center justify-center py-10 text-sm text-gray-400">
              No records in range.
            </div>
          ) : (
            listItems.map((item, idx) => {
              const selected = isRowSelected(item.name);
              const IconComp =
                tab === 'products' ? Package : tab === 'reps' ? Users : MapPin;
              const isPos = (item.revenueYoY ?? 0) >= 0;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleListClick(item.name)}
                  className={`w-full flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 rounded-xl text-left transition-colors cursor-pointer ${
                    selected ? 'bg-[#FEF2F2]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        selected
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          selected ? 'text-[#DC2626]' : 'text-gray-900'
                        }`}
                      >
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
                        <IconComp className="h-3 w-3 shrink-0 text-gray-400" />
                        <span className="truncate">
                          {item.sublabel ?? `${item.orders} orders`} · {item.marginPct}% margin
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-gray-900 tabular-nums">
                      {formatCurrency(item.revenue)}
                    </div>
                    {item.revenueYoY !== null ? (
                      <div
                        className={`inline-flex items-center justify-end gap-0.5 text-[11px] font-semibold tabular-nums ${
                          isPos ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        {isPos ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        <span>
                          {isPos ? '+' : ''}
                          {item.revenueYoY}%
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400">New</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right (4 cols): Featured Crimson Summary & YoY Anomaly Card */}
      <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl bg-[#DC2626] p-5 text-white shadow-[0_2px_8px_rgba(220,38,38,0.22)]">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white">Earnings Summary</h2>
            <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white truncate max-w-[140px]">
              {window.comparisonLabel}
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xs text-red-100">Net Gross Profit</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                {formatCurrency(kpi.profit)}
              </span>
              {kpi.profitYoY !== null && (
                <span className="text-xs font-semibold text-red-100 tabular-nums">
                  ({kpi.profitYoY >= 0 ? '+' : ''}
                  {kpi.profitYoY}% YoY)
                </span>
              )}
            </div>
          </div>

          {/* Subtle White Sparkline Wave */}
          <div className="mt-2 h-[72px] w-full">
            {timeSeries.length > 1 ? (
              <ResponsiveContainer width="100%" height={72}>
                <AreaChart
                  data={timeSeries}
                  margin={{ top: 6, right: 2, left: 2, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="crimsonSparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    fill="url(#crimsonSparkGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full border-b border-white/20" />
            )}
          </div>
        </div>

        {/* White Inner Summary Pill */}
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-2 divide-x divide-gray-100 rounded-xl bg-white p-3.5 text-gray-900 shadow-xs">
            <div className="pr-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span>Total Revenue</span>
              </div>
              <div className="mt-1 text-base font-bold tabular-nums text-gray-900">
                {formatCurrency(kpi.revenue)}
              </div>
            </div>
            <div className="pl-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
                <span>Total Cost</span>
              </div>
              <div className="mt-1 text-base font-bold tabular-nums text-gray-900">
                {formatCurrency(kpi.cost)}
              </div>
            </div>
          </div>

          {/* Automated YoY Anomaly Highlight */}
          {primaryAlert && (
            <button
              type="button"
              onClick={onViewAllInsights}
              className="w-full flex items-start justify-between gap-2 rounded-xl bg-black/15 hover:bg-black/25 px-3 py-2.5 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white truncate">
                    {primaryAlert.severity}: {primaryAlert.headline}
                  </div>
                  <div className="text-[11px] text-red-100 truncate">
                    Click to view {topAnomalies.length} deterministic YoY flags
                  </div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-white/80" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

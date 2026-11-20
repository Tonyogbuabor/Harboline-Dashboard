import React from 'react';
import {
  DollarSign,
  ShoppingCart,
  Wallet,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { KpiSummary, PeriodWindow } from '../types/dashboard';
import { formatCurrency } from '../utils/yoyUtils';

interface KpiRowProps {
  kpi: KpiSummary;
  window: PeriodWindow;
}

const DeltaIndicator: React.FC<{ value: number | null; suffix?: string }> = ({
  value,
  suffix = '%',
}) => {
  if (value === null) {
    return <span className="text-xs font-medium text-gray-400">N/A</span>;
  }
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
        isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'
      }`}
    >
      {isPositive ? (
        <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5 stroke-[2.5]" />
      )}
      <span>
        {isPositive ? '+' : ''}
        {value}
        {suffix}
      </span>
    </span>
  );
};

export const KpiRow: React.FC<KpiRowProps> = ({ kpi, window }) => {
  const marginPctPointsDelta =
    kpi.marginBpsDelta !== null ? Number((kpi.marginBpsDelta / 100).toFixed(1)) : null;

  const cards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(kpi.revenue),
      delta: <DeltaIndicator value={kpi.revenueYoY} />,
      subtext: `vs ${window.comparisonLabel}`,
      icon: DollarSign,
    },
    {
      label: 'Total Orders',
      value: kpi.orders.toLocaleString('en-US'),
      delta: <DeltaIndicator value={kpi.ordersYoY} />,
      subtext: `vs ${kpi.splyOrders.toLocaleString('en-US')} SPLY orders`,
      icon: ShoppingCart,
    },
    {
      label: 'Gross Profit',
      value: formatCurrency(kpi.profit),
      delta: <DeltaIndicator value={kpi.profitYoY} />,
      subtext: `vs ${formatCurrency(kpi.splyProfit)} SPLY`,
      icon: Wallet,
    },
    {
      label: 'Profit Margin & Units',
      value: `${kpi.marginPct}%`,
      extraValue: `${kpi.units.toLocaleString('en-US')} units`,
      delta: <DeltaIndicator value={marginPctPointsDelta} suffix=" pts" />,
      subtext: `Units YoY: ${
        kpi.unitsYoY !== null ? `${kpi.unitsYoY >= 0 ? '+' : ''}${kpi.unitsYoY}%` : 'N/A'
      }`,
      icon: Percent,
    },
  ];

  return (
    <section
      aria-label="Key Performance Indicators"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-gray-300"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500 truncate">
                {card.label}
              </div>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold tracking-tight text-gray-900 tabular-nums">
                  {card.value}
                </span>
                {card.delta}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500 truncate tabular-nums">
                {card.extraValue && (
                  <>
                    <span className="font-semibold text-gray-700">{card.extraValue}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="truncate">{card.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

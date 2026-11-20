import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AnomalyDimension,
  AnomalyItem,
  AnomalySeverity,
} from '../types/dashboard';
import { formatCurrency } from '../utils/yoyUtils';

interface InsightsPanelProps {
  anomalies: AnomalyItem[];
  executiveBrief: string;
  compact?: boolean;
  onDrillDownAnomaly: (anomaly: AnomalyItem) => void;
  onViewAllInsights?: () => void;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  anomalies,
  executiveBrief,
  compact = false,
  onDrillDownAnomaly,
  onViewAllInsights,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'All' | AnomalySeverity>('All');
  const [dimensionFilter, setDimensionFilter] = useState<'All' | AnomalyDimension>('All');

  const filtered = useMemo(() => {
    return anomalies.filter((a) => {
      if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
      if (dimensionFilter !== 'All' && a.dimension !== dimensionFilter) return false;
      return true;
    });
  }, [anomalies, severityFilter, dimensionFilter]);

  const displayed = compact ? filtered.slice(0, 4) : filtered;

  const counts = useMemo(() => {
    return {
      all: anomalies.length,
      Spike: anomalies.filter((a) => a.severity === 'Spike').length,
      Drop: anomalies.filter((a) => a.severity === 'Drop').length,
      'Margin Alert': anomalies.filter((a) => a.severity === 'Margin Alert').length,
    };
  }, [anomalies]);

  const getSeverityStyle = (severity: AnomalySeverity) => {
    if (severity === 'Spike') {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: TrendingUp,
      };
    }
    if (severity === 'Drop') {
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: TrendingDown,
      };
    }
    return {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: AlertTriangle,
    };
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">
              YoY Anomalies &amp; Action Plan
            </h2>
            <span className="text-xs font-medium text-gray-500 tabular-nums">
              · {anomalies.length} deterministic flags
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1 max-w-3xl leading-relaxed">
            {executiveBrief}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Tabs */}
          <div className="flex items-center rounded-xl bg-gray-100 p-1">
            {(['All', 'Spike', 'Drop', 'Margin Alert'] as const).map((sev) => {
              const active = severityFilter === sev;
              const count = sev === 'All' ? counts.all : counts[sev];
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#DC2626] shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {sev} ({count})
                </button>
              );
            })}
          </div>

          {/* Dimension Filter */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={dimensionFilter}
              onChange={(e) =>
                setDimensionFilter(e.target.value as 'All' | AnomalyDimension)
              }
              aria-label="Filter anomalies by dimension"
              className="rounded-xl border border-gray-200 bg-gray-50/80 px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-[#DC2626] focus:outline-none cursor-pointer"
            >
              <option value="All">All Dimensions</option>
              <option value="Overall">Overall</option>
              <option value="Region">Region</option>
              <option value="State">State</option>
              <option value="Product Category">Product Category</option>
              <option value="Product">Product</option>
              <option value="Sales Rep">Sales Rep</option>
              <option value="Channel">Channel</option>
            </select>
          </div>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-5 text-sm text-gray-600">
          <CheckCircle2 className="h-5 w-5 text-[#10B981] shrink-0" />
          <span>
            No anomalies match the selected severity and dimension thresholds in this window.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map((item) => {
            const style = getSeverityStyle(item.severity);
            const SevIcon = style.icon;
            const canDrill = item.dimension !== 'Overall';

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-[#FAFAFB] p-4 hover:border-gray-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}
                      >
                        <SevIcon className="h-3 w-3" />
                        <span>{item.severity}</span>
                      </span>
                      <span className="text-[11px] font-medium text-gray-500">
                        {item.dimension}
                      </span>
                      {item.zScore !== null && item.zScore > 1.5 && (
                        <span className="text-[11px] font-mono-tabular text-gray-500">
                          · {item.zScore}σ rolling
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      {item.yoyPct !== null && (
                        <span
                          className={`text-xs font-bold ${
                            item.yoyPct >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          {item.yoyPct >= 0 ? '+' : ''}
                          {item.yoyPct}% YoY
                        </span>
                      )}
                      {item.marginBpsDelta !== null &&
                        Math.abs(item.marginBpsDelta) >= 150 && (
                          <div className="text-[11px] text-gray-500">
                            {item.marginBpsDelta >= 0 ? '+' : ''}
                            {item.marginBpsDelta} bps margin
                          </div>
                        )}
                    </div>
                  </div>

                  <h3 className="mt-2.5 text-sm font-bold text-gray-900">
                    {item.headline}
                  </h3>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    {item.commentary}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200/80 flex flex-col gap-2">
                  <div className="text-xs text-gray-800 leading-relaxed">
                    <span className="font-semibold text-[#DC2626]">Recommended Action: </span>
                    {item.recommendedAction}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 tabular-nums">
                    <span>
                      Current: <strong className="text-gray-800">{formatCurrency(item.metricValue)}</strong>
                      {' · '}
                      SPLY: <strong className="text-gray-800">{formatCurrency(item.splyValue)}</strong>
                    </span>
                    {canDrill && (
                      <button
                        type="button"
                        onClick={() => onDrillDownAnomaly(item)}
                        className="inline-flex items-center gap-1 font-semibold text-[#DC2626] hover:underline whitespace-nowrap cursor-pointer"
                      >
                        <span>Filter {item.entity}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {compact && filtered.length > 4 && onViewAllInsights && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onViewAllInsights}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-[#FEF2F2] px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-100 transition-colors cursor-pointer"
          >
            <span>View all {filtered.length} anomalies &amp; action items</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};

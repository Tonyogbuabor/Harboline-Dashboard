import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Check,
  Printer,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Zap,
  Target,
  UserCheck,
} from 'lucide-react';
import {
  ActionableRecommendation,
  ExecutivePriority,
  ExecutiveSummaryData,
  FilterState,
  KpiSummary,
  PeriodWindow,
} from '../types/dashboard';
import { formatCurrency } from '../utils/yoyUtils';

interface ExecutiveSummaryViewProps {
  summary: ExecutiveSummaryData;
  kpi: KpiSummary;
  window: PeriodWindow;
  onApplyDrillFilter: (
    key: keyof FilterState,
    value: string,
    navigateToOverview?: boolean
  ) => void;
}

const ACTIONED_STORAGE_KEY = 'harborline_actioned_recs';

export const ExecutiveSummaryView: React.FC<ExecutiveSummaryViewProps> = ({
  summary,
  kpi,
  window: periodWindow,
  onApplyDrillFilter,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'All' | ExecutivePriority>('All');
  const [copied, setCopied] = useState(false);
  const [actionedIds, setActionedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ACTIONED_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const toggleActioned = (id: string) => {
    setActionedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem(ACTIONED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const filteredRecommendations = useMemo(() => {
    if (priorityFilter === 'All') return summary.recommendations;
    return summary.recommendations.filter((r) => r.priority === priorityFilter);
  }, [summary.recommendations, priorityFilter]);

  const actionedCount = summary.recommendations.filter((r) =>
    actionedIds.includes(r.id)
  ).length;

  const handleCopyBrief = async () => {
    const lines = [
      'HARBORLINE SUPPLY CO. — EXECUTIVE BRIEFING',
      `Scope: ${periodWindow.label} (${summary.activeFilterContext})`,
      `Revenue: ${formatCurrency(kpi.revenue)} | Gross Profit: ${formatCurrency(kpi.profit)} (${kpi.marginPct}% Margin) | Orders: ${kpi.orders.toLocaleString()}`,
      '',
      `HEADLINE: ${summary.headline}`,
      '',
      summary.openingBrief,
      '',
      summary.profitabilityNarrative,
      '',
      summary.commercialPulseNarrative,
      '',
      'ACTIONABLE RECOMMENDATIONS:',
      ...summary.recommendations.map(
        (rec, idx) =>
          `\n${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n   Owner: ${rec.owner}\n   Context: ${rec.situationSummary}\n   Action: ${rec.actionNarrative}\n   Steps:\n${rec.actionSteps.map((s) => `     - ${s}`).join('\n')}\n   Expected Impact: ${rec.estimatedImpact}`
      ),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      setCopied(false);
    }
  };

  const getPriorityBadge = (priority: ExecutivePriority) => {
    if (priority === 'Immediate') {
      return {
        classes: 'bg-rose-50 text-[#DC2626] border-rose-200',
        icon: Zap,
      };
    }
    if (priority === 'This Week') {
      return {
        classes: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: Clock,
      };
    }
    return {
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Target,
    };
  };

  return (
    <div className="space-y-5">
      {/* Executive Narrative Briefing Card */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-gray-100">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="font-semibold text-[#DC2626]">Executive Briefing</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{periodWindow.label}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{summary.activeFilterContext}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 [text-wrap:balance]">
              {summary.headline}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyBrief}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>Copied Brief</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  <span>Copy Brief</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => globalThis.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC2626] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Brief</span>
            </button>
          </div>
        </div>

        {/* Natural-Language Executive Prose */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">
                Performance Overview
              </h3>
              <p className="text-sm text-gray-800 leading-relaxed">
                {summary.openingBrief}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">
                Margin &amp; Pricing Dynamics
              </h3>
              <p className="text-sm text-gray-800 leading-relaxed">
                {summary.profitabilityNarrative}
              </p>
            </div>
            {summary.commercialPulseNarrative && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-1">
                  Channel &amp; Field Execution
                </h3>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {summary.commercialPulseNarrative}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Momentum vs Watchlist Callouts */}
          <div className="space-y-4 lg:border-l lg:border-gray-100 lg:pl-6">
            {summary.topPerformerCallout && (
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <TrendingUp className="h-4 w-4 text-[#10B981] shrink-0" />
                  <span>Strongest Momentum</span>
                </div>
                <p className="mt-1.5 text-xs text-gray-700 leading-relaxed">
                  {summary.topPerformerCallout.narrative}
                </p>
              </div>
            )}

            {summary.watchListCallout && (
              <div className="rounded-xl bg-[#FEF2F2] border border-red-200/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#DC2626]">
                  <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0" />
                  <span>Requires Attention</span>
                </div>
                <p className="mt-1.5 text-xs text-gray-700 leading-relaxed">
                  {summary.watchListCallout.narrative}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Actionable Stakeholder Recommendations */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Actionable Recommendations for Stakeholders
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
              Dynamically generated from active dashboard filters · {actionedCount} of{' '}
              {summary.recommendations.length} marked actioned
            </p>
          </div>

          <div className="flex items-center rounded-xl bg-gray-100 p-1 self-start sm:self-auto">
            {(['All', 'Immediate', 'This Week', 'Strategic'] as const).map((prio) => {
              const active = priorityFilter === prio;
              return (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setPriorityFilter(prio)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#DC2626] shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {prio}
                </button>
              );
            })}
          </div>
        </div>

        {filteredRecommendations.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-500">
            No recommendations match this priority level for the current data slice.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((rec: ActionableRecommendation, idx: number) => {
              const badge = getPriorityBadge(rec.priority);
              const PrioIcon = badge.icon;
              const isActioned = actionedIds.includes(rec.id);

              return (
                <article
                  key={rec.id}
                  className={`rounded-2xl border p-5 transition-colors ${
                    isActioned
                      ? 'border-emerald-200 bg-emerald-50/25'
                      : 'border-gray-200 bg-[#FAFAFB] hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${badge.classes}`}
                        >
                          <PrioIcon className="h-3 w-3" />
                          <span>{rec.priority}</span>
                        </span>
                        <span className="font-medium text-gray-500">
                          {rec.focusArea}
                        </span>
                        <span className="text-gray-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                          <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                          <span>Owner: {rec.owner}</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900">
                        {idx + 1}. {rec.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleActioned(rec.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 self-start cursor-pointer whitespace-nowrap ${
                        isActioned
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {isActioned ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                          <span>Actioned</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-3.5 w-3.5 text-gray-400" />
                          <span>Mark as Actioned</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 space-y-2.5">
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        <strong className="font-semibold text-gray-800">
                          What the numbers show:{' '}
                        </strong>
                        {rec.situationSummary}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                        <strong className="font-semibold text-[#DC2626]">
                          Recommended action:{' '}
                        </strong>
                        {rec.actionNarrative}
                      </p>
                    </div>

                    <div className="lg:col-span-5 rounded-xl border border-gray-200/80 bg-white p-4 space-y-2.5">
                      <div className="text-xs font-bold text-gray-900">
                        Concrete Execution Steps
                      </div>
                      <ul className="space-y-1.5 text-xs text-gray-700">
                        {rec.actionSteps.map((step, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2 leading-relaxed">
                            <span className="font-mono-tabular font-semibold text-[#DC2626] mt-0.5">
                              {sIdx + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="text-gray-700">
                      <strong className="font-semibold text-gray-900">
                        Expected Impact:{' '}
                      </strong>
                      <span>{rec.estimatedImpact}</span>
                    </div>

                    {rec.drillTarget && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplyDrillFilter(
                            rec.drillTarget!.filterKey,
                            rec.drillTarget!.filterValue,
                            false
                          )
                        }
                        className="inline-flex items-center gap-1 font-semibold text-[#DC2626] hover:underline whitespace-nowrap self-start sm:self-auto cursor-pointer"
                      >
                        <span>{rec.drillTarget.label}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

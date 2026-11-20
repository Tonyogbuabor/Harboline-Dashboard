import {
  AnomalyDimension,
  AnomalyItem,
  CleanedOrder,
  DimensionBreakdown,
} from '../types/dashboard';
import {
  computeDimensionBreakdown,
  computeKpiSummary,
  formatCurrency,
} from './yoyUtils';

function findPrimaryDriver(
  currentOrders: CleanedOrder[],
  splyOrders: CleanedOrder[],
  filterFn: (o: CleanedOrder) => boolean,
  subAccessor: (o: CleanedOrder) => string
): {
  name: string;
  yoyPct: number | null;
  deltaAmount: number;
  curDiscount: number;
  splyDiscount: number;
} | null {
  const curSub = currentOrders.filter(filterFn);
  const prevSub = splyOrders.filter(filterFn);
  const breakdown = computeDimensionBreakdown(curSub, curSub, prevSub, subAccessor);
  if (breakdown.length === 0) return null;

  // Pick largest absolute revenue delta contributor
  const sorted = [...breakdown].sort(
    (a, b) => Math.abs(b.revenue - b.splyRevenue) - Math.abs(a.revenue - a.splyRevenue)
  );
  const top = sorted[0];
  return {
    name: top.name,
    yoyPct: top.revenueYoY,
    deltaAmount: top.revenue - top.splyRevenue,
    curDiscount: top.avgDiscountPct,
    splyDiscount: top.splyAvgDiscountPct,
  };
}

function findBestCounterMeasure(
  currentOrders: CleanedOrder[],
  splyOrders: CleanedOrder[]
): { topGrowingProduct: string; topGrowingPct: number | null; highDiscountRep: string; highDiscountVal: number } {
  const products = computeDimensionBreakdown(currentOrders, currentYoY(currentOrders), splyOrders, (o) => o.product);
  const growing = [...products]
    .filter((p) => p.revenueYoY !== null)
    .sort((a, b) => (b.revenueYoY ?? 0) - (a.revenueYoY ?? 0));

  const reps = computeDimensionBreakdown(currentOrders, currentYoY(currentOrders), splyOrders, (o) => o.salesRep);
  const discountHeavy = [...reps].sort((a, b) => b.avgDiscountPct - a.avgDiscountPct);

  return {
    topGrowingProduct: growing[0]?.name ?? 'Hydraulic Systems',
    topGrowingPct: growing[0]?.revenueYoY ?? null,
    highDiscountRep: discountHeavy[0]?.name ?? 'Sales Team',
    highDiscountVal: discountHeavy[0]?.avgDiscountPct ?? 0,
  };
}

function currentYoY(orders: CleanedOrder[]): CleanedOrder[] {
  return orders;
}

function computeRollingMonthlyZScores(
  orders: CleanedOrder[],
  accessor: (o: CleanedOrder) => string
): Map<string, number> {
  // Group revenue by entity -> YYYY-MM
  const entityMonthMap = new Map<string, Map<string, number>>();
  const allMonths = new Set<string>();

  for (const o of orders) {
    const key = accessor(o);
    const ym = o.orderDate.slice(0, 7);
    allMonths.add(ym);
    let mMap = entityMonthMap.get(key);
    if (!mMap) {
      mMap = new Map<string, number>();
      entityMonthMap.set(key, mMap);
    }
    mMap.set(ym, (mMap.get(ym) ?? 0) + o.revenue);
  }

  const sortedMonths = Array.from(allMonths).sort();
  const zMap = new Map<string, number>();
  if (sortedMonths.length < 3) return zMap;

  const latestMonth = sortedMonths[sortedMonths.length - 1];
  const priorMonths = sortedMonths.slice(0, -1);

  for (const [entity, mMap] of entityMonthMap.entries()) {
    const latestVal = mMap.get(latestMonth) ?? 0;
    const history = priorMonths.map((m) => mMap.get(m) ?? 0);
    const mean = history.reduce((acc, v) => acc + v, 0) / history.length;
    const variance =
      history.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      zMap.set(entity, Number(((latestVal - mean) / stdDev).toFixed(2)));
    }
  }
  return zMap;
}

export function generateDeterministicInsights(
  displayOrders: CleanedOrder[],
  currentYoYOrders: CleanedOrder[],
  splyOrders: CleanedOrder[]
): {
  anomalies: AnomalyItem[];
  executiveBrief: string;
} {
  const anomalies: AnomalyItem[] = [];
  const kpi = computeKpiSummary(displayOrders, currentYoYOrders, splyOrders);
  const counter = findBestCounterMeasure(currentYoYOrders, splyOrders);

  // 1. Overall portfolio anomaly check
  if (kpi.revenueYoY !== null) {
    const delta = kpi.revenue - kpi.splyRevenue;
    if (kpi.revenueYoY >= 15) {
      anomalies.push({
        id: 'overall-spike',
        severity: 'Spike',
        dimension: 'Overall',
        entity: 'Total Portfolio',
        metricValue: kpi.revenue,
        splyValue: kpi.splyRevenue,
        deltaAmount: delta,
        yoyPct: kpi.revenueYoY,
        marginPct: kpi.marginPct,
        splyMarginPct: kpi.splyMarginPct,
        marginBpsDelta: kpi.marginBpsDelta,
        zScore: null,
        headline: `Portfolio revenue accelerated +${kpi.revenueYoY}% YoY`,
        commentary: `Total revenue reached ${formatCurrency(kpi.revenue)} (${formatCurrency(delta)} above SPLY) across ${kpi.orders.toLocaleString()} orders, with gross margin holding at ${kpi.marginPct}%.`,
        recommendedAction: `Lock in supplier capacity for ${counter.topGrowingProduct} and expand safety-stock buffers ahead of next quarter's reorder cycle.`,
        impactScore: Math.abs(delta) * 1.2,
      });
    } else if (kpi.revenueYoY <= -12) {
      anomalies.push({
        id: 'overall-drop',
        severity: 'Drop',
        dimension: 'Overall',
        entity: 'Total Portfolio',
        metricValue: kpi.revenue,
        splyValue: kpi.splyRevenue,
        deltaAmount: delta,
        yoyPct: kpi.revenueYoY,
        marginPct: kpi.marginPct,
        splyMarginPct: kpi.splyMarginPct,
        marginBpsDelta: kpi.marginBpsDelta,
        zScore: null,
        headline: `Portfolio revenue contracted ${kpi.revenueYoY}% YoY`,
        commentary: `Aggregate revenue fell ${formatCurrency(Math.abs(delta))} versus SPLY while average order discount shifted from ${kpi.splyAvgDiscountPct}% to ${kpi.avgDiscountPct}%.`,
        recommendedAction: `Initiate an executive pipeline review with regional leads and pause discretionary promo discounting above 10%.`,
        impactScore: Math.abs(delta) * 1.5,
      });
    }
  }

  if (kpi.marginBpsDelta !== null && kpi.marginBpsDelta < -300) {
    anomalies.push({
      id: 'overall-margin',
      severity: 'Margin Alert',
      dimension: 'Overall',
      entity: 'Portfolio Margin',
      metricValue: kpi.profit,
      splyValue: kpi.splyProfit,
      deltaAmount: kpi.profit - kpi.splyProfit,
      yoyPct: kpi.profitYoY,
      marginPct: kpi.marginPct,
      splyMarginPct: kpi.splyMarginPct,
      marginBpsDelta: kpi.marginBpsDelta,
      zScore: null,
      headline: `Portfolio gross margin compressed ${Math.abs(kpi.marginBpsDelta)} bps YoY`,
      commentary: `Gross margin slipped from ${kpi.splyMarginPct}% to ${kpi.marginPct}% as average discount rates moved from ${kpi.splyAvgDiscountPct}% to ${kpi.avgDiscountPct}%.`,
      recommendedAction: `Require VP sign-off on quotes exceeding 10% discount and renegotiate freight surcharges on lower-margin SKUs.`,
      impactScore: Math.abs(kpi.profit - kpi.splyProfit) + 25000,
    });
  }

  // 2. Scan dimensions systematically
  const dimensions: Array<{
    dim: AnomalyDimension;
    accessor: (o: CleanedOrder) => string;
    subAccessor: (o: CleanedOrder) => string;
  }> = [
    { dim: 'Region', accessor: (o) => o.region, subAccessor: (o) => o.productCategory },
    { dim: 'State', accessor: (o) => o.state, subAccessor: (o) => o.product },
    { dim: 'Product Category', accessor: (o) => o.productCategory, subAccessor: (o) => o.region },
    { dim: 'Product', accessor: (o) => o.product, subAccessor: (o) => o.region },
    { dim: 'Sales Rep', accessor: (o) => o.salesRep, subAccessor: (o) => o.productCategory },
    { dim: 'Channel', accessor: (o) => o.channel, subAccessor: (o) => o.productCategory },
  ];

  for (const { dim, accessor, subAccessor } of dimensions) {
    const breakdown: DimensionBreakdown[] = computeDimensionBreakdown(
      currentYoYOrders,
      currentYoYOrders,
      splyOrders,
      accessor
    );
    const zScores = computeRollingMonthlyZScores(currentYoYOrders, accessor);

    for (const row of breakdown) {
      if (row.name === 'Unspecified') continue;
      // Ignore micro-segments below $2,500 combined volume to keep insights high-signal
      if (row.revenue + row.splyRevenue < 2500) continue;

      const z = zScores.get(row.name) ?? null;
      const isSpike =
        (row.revenueYoY !== null && row.revenueYoY >= 15) || (z !== null && z > 1.5);
      const isDrop = row.revenueYoY !== null && row.revenueYoY <= -12;
      const isMarginCompression =
        row.marginBpsDelta !== null && row.marginBpsDelta < -300;

      if (!isSpike && !isDrop && !isMarginCompression) continue;

      const delta = row.revenue - row.splyRevenue;
      const driver = findPrimaryDriver(
        currentYoYOrders,
        splyOrders,
        (o) => accessor(o) === row.name,
        subAccessor
      );

      // Find top rep / state context for concrete action wording
      const repCtx = findPrimaryDriver(
        currentYoYOrders,
        splyOrders,
        (o) => accessor(o) === row.name,
        (o) => (dim === 'Sales Rep' ? o.state : o.salesRep)
      );

      if (isDrop) {
        const driverText = driver
          ? `driven primarily by a ${driver.yoyPct !== null ? `${Math.abs(driver.yoyPct)}%` : ''} shift in ${driver.name} (${formatCurrency(driver.deltaAmount)})`
          : `with revenue declining ${formatCurrency(Math.abs(delta))} below prior year`;

        const discountShift =
          row.avgDiscountPct > row.splyAvgDiscountPct + 1
            ? ` and average discounts rising from ${row.splyAvgDiscountPct}% to ${row.avgDiscountPct}%`
            : '';

        anomalies.push({
          id: `${dim}-${row.name}-drop`,
          severity: 'Drop',
          dimension: dim,
          entity: row.name,
          metricValue: row.revenue,
          splyValue: row.splyRevenue,
          deltaAmount: delta,
          yoyPct: row.revenueYoY,
          marginPct: row.marginPct,
          splyMarginPct: row.splyMarginPct,
          marginBpsDelta: row.marginBpsDelta,
          zScore: z,
          headline: `${row.name} (${dim}) dropped ${Math.abs(row.revenueYoY ?? 0)}% YoY`,
          commentary: `${row.name} revenue fell ${Math.abs(row.revenueYoY ?? 0)}% YoY (${formatCurrency(delta)}) ${driverText}${discountShift}.`,
          recommendedAction:
            dim === 'Sales Rep'
              ? `Audit discount approvals above 10% for ${row.name} in ${repCtx?.name ?? 'assigned states'} and shift outbound cadence toward ${counter.topGrowingProduct}.`
              : `Audit discount approvals above 10% for ${repCtx?.name ?? counter.highDiscountRep} in ${row.name} and reallocate Q4 inventory toward ${counter.topGrowingProduct}.`,
          impactScore: Math.abs(delta) * 1.35 + (isMarginCompression ? 8000 : 0),
        });
      } else if (isMarginCompression) {
        const bpsDrop = Math.abs(row.marginBpsDelta ?? 0);
        anomalies.push({
          id: `${dim}-${row.name}-margin`,
          severity: 'Margin Alert',
          dimension: dim,
          entity: row.name,
          metricValue: row.revenue,
          splyValue: row.splyRevenue,
          deltaAmount: row.profit - row.splyProfit,
          yoyPct: row.revenueYoY,
          marginPct: row.marginPct,
          splyMarginPct: row.splyMarginPct,
          marginBpsDelta: row.marginBpsDelta,
          zScore: z,
          headline: `${row.name} margin compressed ${bpsDrop} bps YoY`,
          commentary: `${row.name} gross margin declined from ${row.splyMarginPct}% to ${row.marginPct}% (-${bpsDrop} bps) as average discounts moved from ${row.splyAvgDiscountPct}% to ${row.avgDiscountPct}%.`,
          recommendedAction: `Cap promotional discounts on ${row.name} at ${Math.max(5, Math.floor(row.splyAvgDiscountPct))}% and bundle high-margin ${counter.topGrowingProduct} to restore unit economics.`,
          impactScore: Math.abs(row.profit - row.splyProfit) + bpsDrop * 30,
        });
      } else if (isSpike) {
        const yoyStr = row.revenueYoY !== null ? `+${row.revenueYoY}% YoY` : 'above rolling trend';
        const zText = z !== null && z > 1.5 ? ` (${z}σ above rolling monthly mean)` : '';
        const driverText = driver
          ? `led by ${driver.name} (${formatCurrency(driver.deltaAmount)} YoY gain)`
          : `adding ${formatCurrency(delta)} over SPLY`;

        anomalies.push({
          id: `${dim}-${row.name}-spike`,
          severity: 'Spike',
          dimension: dim,
          entity: row.name,
          metricValue: row.revenue,
          splyValue: row.splyRevenue,
          deltaAmount: delta,
          yoyPct: row.revenueYoY,
          marginPct: row.marginPct,
          splyMarginPct: row.splyMarginPct,
          marginBpsDelta: row.marginBpsDelta,
          zScore: z,
          headline: `${row.name} (${dim}) surged ${yoyStr}`,
          commentary: `${row.name} expanded ${yoyStr}${zText} to ${formatCurrency(row.revenue)}, ${driverText} at ${row.marginPct}% gross margin.`,
          recommendedAction: `Increase safety-stock allocation for ${row.name} by 15–20% and replicate ${repCtx?.name ?? 'top rep'}'s pricing playbook across adjacent territories.`,
          impactScore: Math.abs(delta),
        });
      }
    }
  }

  // Sort by materiality / impactScore descending, dedupe near-identical entities if needed
  const sorted = anomalies.sort((a, b) => b.impactScore - a.impactScore);

  const spikeCount = sorted.filter((a) => a.severity === 'Spike').length;
  const dropCount = sorted.filter((a) => a.severity === 'Drop').length;
  const marginCount = sorted.filter((a) => a.severity === 'Margin Alert').length;

  const revDeltaStr =
    kpi.revenueYoY !== null
      ? `${kpi.revenueYoY >= 0 ? '+' : ''}${kpi.revenueYoY}% YoY`
      : 'tracked period';

  const executiveBrief =
    sorted.length > 0
      ? `Portfolio revenue is ${revDeltaStr} at ${formatCurrency(kpi.revenue)} (${kpi.marginPct}% gross margin). Deterministic analysis flagged ${spikeCount} growth spikes, ${dropCount} contraction drops, and ${marginCount} margin alerts requiring review.`
      : `Portfolio revenue stands at ${formatCurrency(kpi.revenue)} with ${kpi.marginPct}% gross margin. All tracked dimensions remain within normal +/-12% YoY variance bands.`;

  return {
    anomalies: sorted,
    executiveBrief,
  };
}

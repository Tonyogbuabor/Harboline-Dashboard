import {
  ActionableRecommendation,
  CleanedOrder,
  DimensionBreakdown,
  ExecutiveSummaryData,
  FilterState,
  KpiSummary,
  PeriodWindow,
} from '../types/dashboard';
import { computeDimensionBreakdown, formatCurrency } from './yoyUtils';

function describeFilterScope(filters: FilterState): string {
  const parts: string[] = [];
  if (filters.region !== 'All') parts.push(`${filters.region} region`);
  if (filters.state !== 'All') parts.push(`${filters.state}`);
  if (filters.category !== 'All') parts.push(`${filters.category}`);
  if (filters.product !== 'All') parts.push(`${filters.product}`);
  if (filters.channel !== 'All') parts.push(`${filters.channel} channel`);
  if (filters.salesRep !== 'All') parts.push(`accounts managed by ${filters.salesRep}`);
  if (filters.searchQuery.trim()) parts.push(`orders matching "${filters.searchQuery.trim()}"`);
  if (parts.length === 0) return 'across all Harborline territories and product lines';
  return `for ${parts.join(' · ')}`;
}

function findTopSubContributor(
  orders: CleanedOrder[],
  filterFn: (o: CleanedOrder) => boolean,
  accessor: (o: CleanedOrder) => string
): { name: string; revenue: number; sharePct: number } | null {
  const subset = orders.filter(filterFn);
  if (subset.length === 0) return null;
  const map = new Map<string, number>();
  let total = 0;
  for (const o of subset) {
    const k = accessor(o);
    map.set(k, (map.get(k) ?? 0) + o.revenue);
    total += o.revenue;
  }
  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  const [name, revenue] = sorted[0];
  return {
    name,
    revenue,
    sharePct: total > 0 ? Math.round((revenue / total) * 100) : 0,
  };
}

export function generateExecutiveSummary(
  filteredOrders: CleanedOrder[],
  currentYoYCohort: CleanedOrder[],
  splyCohort: CleanedOrder[],
  kpi: KpiSummary,
  window: PeriodWindow,
  filters: FilterState
): ExecutiveSummaryData {
  const scopeDesc = describeFilterScope(filters);

  if (filteredOrders.length === 0) {
    return {
      headline: 'No matching orders in the current filter slice',
      openingBrief: `There are currently zero cleaned orders ${scopeDesc} within ${window.label}. Broaden the date preset or clear one of the active dimension filters to generate a live executive briefing.`,
      profitabilityNarrative:
        'Profitability and margin dynamics cannot be evaluated until at least one order matches the active criteria.',
      commercialPulseNarrative:
        'Adjust your region, category, channel, or date selection in the filter bar above to restore executive commentary.',
      topPerformerCallout: null,
      watchListCallout: null,
      recommendations: [],
      activeFilterContext: scopeDesc,
    };
  }

  // Compute breakdowns on active slice
  const regions = computeDimensionBreakdown(
    filteredOrders,
    currentYoYCohort,
    splyCohort,
    (o) => o.region
  ).filter((r) => r.name !== 'Unspecified');

  const states = computeDimensionBreakdown(
    filteredOrders,
    currentYoYCohort,
    splyCohort,
    (o) => o.state,
    (o) => o.region
  ).filter((s) => s.name !== 'Unspecified');

  const categories = computeDimensionBreakdown(
    filteredOrders,
    currentYoYCohort,
    splyCohort,
    (o) => o.productCategory
  ).filter((c) => c.name !== 'Unspecified');

  const products = computeDimensionBreakdown(
    filteredOrders,
    currentYoYCohort,
    splyCohort,
    (o) => o.product,
    (o) => o.productCategory
  ).filter((p) => p.name !== 'Unspecified');

  const reps = computeDimensionBreakdown(
    filteredOrders,
    currentYoYCohort,
    splyCohort,
    (o) => o.salesRep,
    (o) => o.region
  ).filter((r) => r.name !== 'Unspecified');

  const channels = computeDimensionBreakdown(
    filteredOrders,
    currentYoYCohort,
    splyCohort,
    (o) => o.channel
  ).filter((c) => c.name !== 'Unspecified');

  const aov = kpi.orders > 0 ? kpi.revenue / kpi.orders : 0;
  const splyAov = kpi.splyOrders > 0 ? kpi.splyRevenue / kpi.splyOrders : 0;
  const aovDeltaPct =
    splyAov > 0 ? Number((((aov - splyAov) / splyAov) * 100).toFixed(1)) : null;

  // Headline & Opening Brief
  const revTrendPhrase =
    kpi.revenueYoY === null
      ? `generated ${formatCurrency(kpi.revenue)} across ${kpi.orders.toLocaleString()} orders`
      : kpi.revenueYoY >= 10
      ? `grew ${kpi.revenueYoY}% year-over-year to ${formatCurrency(kpi.revenue)}`
      : kpi.revenueYoY >= 0
      ? `held steady at +${kpi.revenueYoY}% year-over-year (${formatCurrency(kpi.revenue)})`
      : `contracted ${Math.abs(kpi.revenueYoY)}% year-over-year to ${formatCurrency(kpi.revenue)}`;

  const headline =
    kpi.revenueYoY !== null && kpi.revenueYoY < 0
      ? `Revenue softened ${Math.abs(kpi.revenueYoY)}% YoY — focus on margin discipline and territory recovery`
      : kpi.marginBpsDelta !== null && kpi.marginBpsDelta < -150
      ? `Top-line demand is healthy, but ${Math.abs(kpi.marginBpsDelta)} bps margin compression requires pricing action`
      : `Commercial momentum is positive at ${formatCurrency(kpi.revenue)} with ${kpi.marginPct}% gross margin`;

  const topCat = categories[0];
  const topRegion = regions[0];

  const openingBrief = [
    `During ${window.label}, Harborline Supply Co. ${revTrendPhrase} ${scopeDesc}, delivering ${formatCurrency(kpi.profit)} in gross profit across ${kpi.units.toLocaleString()} units shipped.`,
    topRegion && regions.length > 1
      ? `${topRegion.name} led regional contribution at ${topRegion.sharePct}% of total revenue (${formatCurrency(topRegion.revenue)}),`
      : '',
    topCat && categories.length > 1
      ? `while ${topCat.name} anchored product demand at ${topCat.sharePct}% share.`
      : '',
    `Average order value sits at ${formatCurrency(aov)}${
      aovDeltaPct !== null
        ? ` (${aovDeltaPct >= 0 ? '+' : ''}${aovDeltaPct}% versus the prior-year window)`
        : ''
    }.`,
  ]
    .filter(Boolean)
    .join(' ');

  // Profitability Narrative
  const marginShiftText =
    kpi.marginBpsDelta === null
      ? `Gross margin currently stands at ${kpi.marginPct}% with an average discount rate of ${kpi.avgDiscountPct}%.`
      : kpi.marginBpsDelta < -100
      ? `Gross margin slipped ${Math.abs(kpi.marginBpsDelta)} basis points from ${kpi.splyMarginPct}% last year to ${kpi.marginPct}% today, coinciding with average order discounts widening from ${kpi.splyAvgDiscountPct}% to ${kpi.avgDiscountPct}%.`
      : kpi.marginBpsDelta > 100
      ? `Gross margin expanded ${kpi.marginBpsDelta} basis points year-over-year to ${kpi.marginPct}%, reflecting stronger pricing discipline (average discount ${kpi.avgDiscountPct}% vs ${kpi.splyAvgDiscountPct}% last year).`
      : `Gross margin remained stable at ${kpi.marginPct}% (${kpi.marginBpsDelta >= 0 ? '+' : ''}${kpi.marginBpsDelta} bps YoY), with average order discounts holding near ${kpi.avgDiscountPct}%.`;

  const highestMarginCat = [...categories].sort((a, b) => b.marginPct - a.marginPct)[0];
  const lowestMarginCat = [...categories].sort((a, b) => a.marginPct - b.marginPct)[0];
  const profitabilityNarrative = [
    marginShiftText,
    highestMarginCat && lowestMarginCat && highestMarginCat.name !== lowestMarginCat.name
      ? `${highestMarginCat.name} is your strongest margin engine at ${highestMarginCat.marginPct}% gross margin, outperforming ${lowestMarginCat.name} (${lowestMarginCat.marginPct}%) by ${(highestMarginCat.marginPct - lowestMarginCat.marginPct).toFixed(1)} percentage points.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Commercial Pulse Narrative
  const topChannel = channels[0];
  const topRep = reps[0];
  const commercialPulseNarrative = [
    topChannel
      ? `${topChannel.name} is currently the primary route to market, carrying ${topChannel.sharePct}% of revenue (${formatCurrency(topChannel.revenue)}) at a ${topChannel.marginPct}% margin.`
      : '',
    topRep && reps.length > 1
      ? `Among account executives, ${topRep.name} leads booked volume with ${formatCurrency(topRep.revenue)} across ${topRep.orders} orders (${topRep.marginPct}% margin).`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Top Performer & Watch List Callouts
  const growingDimensions: Array<{ dim: string; item: DimensionBreakdown }> = [
    ...regions.map((item) => ({ dim: 'Region', item })),
    ...categories.map((item) => ({ dim: 'Product Category', item })),
    ...products.map((item) => ({ dim: 'Product', item })),
    ...reps.map((item) => ({ dim: 'Sales Rep', item })),
  ].filter((x) => x.item.revenueYoY !== null && x.item.revenue >= 3000);

  growingDimensions.sort((a, b) => (b.item.revenueYoY ?? 0) - (a.item.revenueYoY ?? 0));
  const bestMover = growingDimensions[0];

  const topPerformerCallout = bestMover
    ? {
        entity: bestMover.item.name,
        dimension: bestMover.dim,
        narrative: `${bestMover.item.name} (${bestMover.dim}) is your fastest-accelerating segment, up +${bestMover.item.revenueYoY}% YoY to ${formatCurrency(bestMover.item.revenue)} while sustaining a ${bestMover.item.marginPct}% gross margin.`,
      }
    : topCat
    ? {
        entity: topCat.name,
        dimension: 'Product Category',
        narrative: `${topCat.name} leads active portfolio volume at ${formatCurrency(topCat.revenue)} (${topCat.sharePct}% share) with ${topCat.marginPct}% gross margin.`,
      }
    : null;

  const decliningDimensions = [...growingDimensions]
    .filter((x) => (x.item.revenueYoY ?? 0) < 0 || (x.item.marginBpsDelta ?? 0) < -200)
    .sort((a, b) => (a.item.revenueYoY ?? 0) - (b.item.revenueYoY ?? 0));

  const worstMover = decliningDimensions[0];
  const lowestMarginEntity = [...categories, ...channels, ...regions]
    .filter((x) => x.revenue >= 3000)
    .sort((a, b) => a.marginPct - b.marginPct)[0];

  const watchListCallout = worstMover
    ? {
        entity: worstMover.item.name,
        dimension: worstMover.dim,
        narrative: `${worstMover.item.name} (${worstMover.dim}) requires immediate review: revenue is ${worstMover.item.revenueYoY}% YoY (${formatCurrency(worstMover.item.revenue - worstMover.item.splyRevenue)} vs SPLY) with average discounts at ${worstMover.item.avgDiscountPct}%.`,
      }
    : lowestMarginEntity
    ? {
        entity: lowestMarginEntity.name,
        dimension: 'Margin Watch',
        narrative: `${lowestMarginEntity.name} carries the tightest gross margin in this slice at ${lowestMarginEntity.marginPct}% with ${lowestMarginEntity.avgDiscountPct}% average discounting.`,
      }
    : null;

  // Build Concrete, Non-Generic Actionable Recommendations
  const recommendations: ActionableRecommendation[] = [];

  // 1. High-Discount Governance Action (computed directly from order-level discount > 9.5%)
  const highDiscountOrders = filteredOrders.filter((o) => o.discountPct >= 9.5);
  if (highDiscountOrders.length > 0) {
    const highDiscRev = highDiscountOrders.reduce((s, o) => s + o.revenue, 0);
    const avgHighDisc =
      highDiscountOrders.reduce((s, o) => s + o.discountPct, 0) / highDiscountOrders.length;
    // Estimate profit lost compared to a 6.0% target discount baseline
    const baselineDisc = Math.min(6.0, kpi.splyAvgDiscountPct > 0 ? kpi.splyAvgDiscountPct : 6.0);
    const excessDiscPct = Math.max(0, avgHighDisc - baselineDisc);
    const estimatedLeakage = Math.round(
      highDiscountOrders.reduce((s, o) => {
        const gross = o.discountPct < 100 ? o.revenue / (1 - o.discountPct / 100) : o.revenue;
        return s + gross * (excessDiscPct / 100);
      }, 0)
    );

    const topDiscRep = findTopSubContributor(
      highDiscountOrders,
      () => true,
      (o) => o.salesRep
    );
    const topDiscCat = findTopSubContributor(
      highDiscountOrders,
      () => true,
      (o) => o.productCategory
    );
    const topDiscState = findTopSubContributor(
      highDiscountOrders,
      () => true,
      (o) => o.state
    );

    const repName = topDiscRep?.name ?? 'account reps';
    const catName = topDiscCat?.name ?? 'discounted SKUs';
    const stateName = topDiscState?.name ?? 'affected states';

    recommendations.push({
      id: 'rec-discount-governance',
      priority: 'Immediate',
      focusArea: 'Discount Governance',
      owner: `Pricing Committee & Sales Lead (${repName})`,
      title: `Cap discretionary discounts above 9% on ${catName} orders`,
      situationSummary: `${highDiscountOrders.length} orders (${formatCurrency(highDiscRev)} in revenue) carried discounts averaging ${avgHighDisc.toFixed(1)}%, well above the ${baselineDisc.toFixed(1)}% benchmark. ${repName} and ${catName} in ${stateName} accounted for ${topDiscRep?.sharePct ?? 50}% of those heavy-discount deals.`,
      actionNarrative: `Put an automated approval gate on any quote exceeding 9% discount, starting with ${repName}'s pipeline in ${stateName}. Replace flat percentage price cuts on ${catName} with volume-tier rebates only when customers commit to 15+ units per order.`,
      actionSteps: [
        `Require regional manager sign-off before issuing any ${catName} quote above 9% off list price.`,
        `Review ${repName}'s open quotes in ${stateName} this week and reset standard renewal terms toward ${baselineDisc.toFixed(1)}%.`,
        `Offer prepaid freight or bundled spares instead of invoice discounts on orders under 15 units.`,
      ],
      estimatedImpact: `Recovers roughly ${formatCurrency(estimatedLeakage)} in direct gross profit across a comparable order cycle.`,
      drillTarget: topDiscRep
        ? {
            label: `Inspect ${repName}'s orders`,
            filterKey: 'salesRep',
            filterValue: repName,
          }
        : undefined,
    });
  }

  // 2. Territory / Segment Contraction Recovery Action
  const contractingRegion = regions.find(
    (r) => r.revenueYoY !== null && r.revenueYoY <= -8 && r.splyRevenue >= 4000
  );
  const contractingState = states.find(
    (s) => s.revenueYoY !== null && s.revenueYoY <= -10 && s.splyRevenue >= 2500
  );

  if (contractingRegion || contractingState) {
    const target = contractingRegion ?? contractingState!;
    const isReg = Boolean(contractingRegion);
    const gap = Math.abs(target.revenue - target.splyRevenue);
    const driverCat = findTopSubContributor(
      splyCohort,
      (o) => (isReg ? o.region === target.name : o.state === target.name),
      (o) => o.productCategory
    );
    const activeRepInTarget = findTopSubContributor(
      filteredOrders,
      (o) => (isReg ? o.region === target.name : o.state === target.name),
      (o) => o.salesRep
    );
    const fastestProduct = bestMover?.item.name ?? products[0]?.name ?? 'Hydraulic Systems';

    recommendations.push({
      id: `rec-recovery-${target.name}`,
      priority: 'Immediate',
      focusArea: 'Revenue Recovery',
      owner: `${activeRepInTarget?.name ?? 'Regional Lead'} & Commercial Operations`,
      title: `Run a 30-day account win-back sprint in ${target.name}`,
      situationSummary: `${target.name} is down ${Math.abs(target.revenueYoY ?? 0)}% YoY (${formatCurrency(gap)} below SPLY), with ${driverCat?.name ?? 'core industrial lines'} driving the volume shortfall while average discounts crept to ${target.avgDiscountPct}%.`,
      actionNarrative: `Have ${activeRepInTarget?.name ?? 'the territory account executive'} pull a list of last year's ${driverCat?.name ?? 'active'} buyers in ${target.name} who have not reordered in the past 60 days, and schedule joint technical check-ins to pitch ${fastestProduct} as a reliability upgrade.`,
      actionSteps: [
        `Contact lapsed ${target.name} accounts from last year's ${driverCat?.name ?? 'primary'} cohort before month-end.`,
        `Pair ${activeRepInTarget?.name ?? 'territory reps'} with technical sales engineering to convert spot quotes into 6-month blanket POs.`,
        `Cross-sell ${fastestProduct} to existing maintenance buyers to rebuild order frequency without cutting unit price.`,
      ],
      estimatedImpact: `Closing 40% of the ${formatCurrency(gap)} YoY shortfall restores ${formatCurrency(Math.round(gap * 0.4))} in top-line revenue.`,
      drillTarget: {
        label: `Filter to ${target.name}`,
        filterKey: isReg ? 'region' : 'state',
        filterValue: target.name,
      },
    });
  }

  // 3. Margin Compression / Cost & Mix Protection Action
  const compressedCat = categories.find(
    (c) =>
      (c.marginBpsDelta !== null && c.marginBpsDelta <= -200) ||
      (c.marginPct < kpi.marginPct - 2.5 && c.revenue >= 5000)
  );
  const compressedChannel = channels.find(
    (ch) =>
      (ch.marginBpsDelta !== null && ch.marginBpsDelta <= -200) ||
      (ch.marginPct < kpi.marginPct - 2.0 && ch.revenue >= 5000)
  );
  const marginTarget = compressedCat ?? compressedChannel;

  if (marginTarget) {
    const isCat = Boolean(compressedCat);
    const bpsText =
      marginTarget.marginBpsDelta !== null && marginTarget.marginBpsDelta < 0
        ? `compressed ${Math.abs(marginTarget.marginBpsDelta)} bps YoY to ${marginTarget.marginPct}%`
        : `lags the portfolio average at ${marginTarget.marginPct}% gross margin`;
    const uplift250Bps = Math.round(marginTarget.revenue * 0.025);

    recommendations.push({
      id: `rec-margin-${marginTarget.name}`,
      priority: 'This Week',
      focusArea: 'Margin Protection',
      owner: 'Category Management & Procurement',
      title: `Reprice or bundle ${marginTarget.name} to recover 250 bps of gross margin`,
      situationSummary: `${marginTarget.name} (${formatCurrency(marginTarget.revenue)} revenue) ${bpsText}, trailing your ${highestMarginCat?.name ?? 'top-margin'} line (${highestMarginCat?.marginPct ?? kpi.marginPct}%).`,
      actionNarrative: `Audit landed supplier costs and minimum order quantities on ${marginTarget.name}. Adjust list pricing by 2–3% on low-volume orders or bundle accessories so smaller shipments stop absorbing full freight and handling overhead.`,
      actionSteps: [
        `Compare current unit costs against Q1 supplier invoices for top SKUs in ${marginTarget.name}.`,
        `Introduce a minimum order threshold or small-order handling fee on ${marginTarget.name} shipments below $1,500.`,
        `Bundle high-margin consumables or spare parts alongside ${marginTarget.name} quotes to lift blended order margin.`,
      ],
      estimatedImpact: `A 250 bps margin recovery on ${marginTarget.name} adds ${formatCurrency(uplift250Bps)} directly to gross profit.`,
      drillTarget: {
        label: `Inspect ${marginTarget.name}`,
        filterKey: isCat ? 'category' : 'channel',
        filterValue: marginTarget.name,
      },
    });
  }

  // 4. Growth Acceleration & Inventory Capacity Action
  const surgeProduct =
    products.find((p) => (p.revenueYoY ?? 0) >= 15 && p.revenue >= 5000) ?? products[0];
  const surgeRegion =
    regions.find((r) => (r.revenueYoY ?? 0) >= 15 && r.revenue >= 6000) ?? regions[0];

  if (surgeProduct) {
    const primaryRegionForProd = findTopSubContributor(
      filteredOrders,
      (o) => o.product === surgeProduct.name,
      (o) => o.region
    );
    const laggingRegion = regions.find(
      (r) => r.name !== primaryRegionForProd?.name && r.revenue > 0
    );

    recommendations.push({
      id: `rec-inventory-${surgeProduct.name}`,
      priority: 'Strategic',
      focusArea: 'Inventory & Capacity',
      owner: 'Supply Chain Planning & Regional Sales',
      title: `Expand safety stock for ${surgeProduct.name} and replicate demand in ${laggingRegion?.name ?? 'secondary regions'}`,
      situationSummary: `${surgeProduct.name} generated ${formatCurrency(surgeProduct.revenue)} at ${surgeProduct.marginPct}% gross margin${
        surgeProduct.revenueYoY !== null
          ? ` (${surgeProduct.revenueYoY >= 0 ? '+' : ''}${surgeProduct.revenueYoY}% YoY)`
          : ''
      }, with ${primaryRegionForProd?.sharePct ?? 45}% of volume concentrated in ${primaryRegionForProd?.name ?? surgeRegion?.name ?? 'core hubs'}.`,
      actionNarrative: `Increase replenishment safety stock for ${surgeProduct.name} by 15–20% ahead of next month's reorder window to avoid stockouts in ${primaryRegionForProd?.name ?? 'high-velocity hubs'}, while equipping ${laggingRegion?.name ?? 'other regional'} reps with customer case studies to expand attach rates.`,
      actionSteps: [
        `Confirm supplier lead times and raise reorder-point buffers by 15–20% for ${surgeProduct.name}.`,
        `Pre-stage regional warehouse stock closest to ${primaryRegionForProd?.name ?? 'top buyers'} to shorten delivery SLAs.`,
        laggingRegion
          ? `Share ${primaryRegionForProd?.name ?? 'lead territory'} quoting playbooks with ${laggingRegion.name} reps to replicate adoption.`
          : `Identify top 10 repeat buyers of ${surgeProduct.name} for annual volume supply agreements.`,
      ],
      estimatedImpact: `Prevents stockout slippage on a ${formatCurrency(surgeProduct.revenue)} product line while opening ${formatCurrency(Math.round(surgeProduct.revenue * 0.18))} in cross-region upside.`,
      drillTarget: {
        label: `View ${surgeProduct.name}`,
        filterKey: 'product',
        filterValue: surgeProduct.name,
      },
    });
  }

  // 5. Channel Mix & Average Order Value Action
  if (channels.length >= 2) {
    const sortedByMargin = [...channels].sort((a, b) => b.marginPct - a.marginPct);
    const bestChan = sortedByMargin[0];
    const weakestChan = sortedByMargin[sortedByMargin.length - 1];
    if (bestChan && weakestChan && bestChan.name !== weakestChan.name) {
      recommendations.push({
        id: 'rec-channel-mix',
        priority: 'Strategic',
        focusArea: 'Growth Expansion',
        owner: 'Channel Strategy & Digital Commerce',
        title: `Shift repeat reorders toward ${bestChan.name} (${bestChan.marginPct}% margin)`,
        situationSummary: `${bestChan.name} achieves a ${bestChan.marginPct}% gross margin on ${formatCurrency(bestChan.revenue)} in sales, outperforming ${weakestChan.name} (${weakestChan.marginPct}% margin) by ${(bestChan.marginPct - weakestChan.marginPct).toFixed(1)} percentage points.`,
        actionNarrative: `Encourage standard replenishment buyers currently transacting through ${weakestChan.name} to enroll in scheduled ${bestChan.name} fulfillment, and align sales incentives around net gross profit rather than gross bookings alone.`,
        actionSteps: [
          `Audit top 15 repeat customers in ${weakestChan.name} for eligibility in structured ${bestChan.name} agreements.`,
          `Tighten automated promo codes in ${weakestChan.name} so routine reorders hold near ${bestChan.avgDiscountPct}% discount.`,
          `Track net margin per order alongside revenue in weekly commercial standups.`,
        ],
        estimatedImpact: `Shifting 15% of ${weakestChan.name} volume to ${bestChan.name} margin economics yields roughly ${formatCurrency(Math.round(weakestChan.revenue * 0.15 * ((bestChan.marginPct - weakestChan.marginPct) / 100)))} in incremental profit.`,
        drillTarget: {
          label: `Filter ${weakestChan.name}`,
          filterKey: 'channel',
          filterValue: weakestChan.name,
        },
      });
    }
  }

  return {
    headline,
    openingBrief,
    profitabilityNarrative,
    commercialPulseNarrative,
    topPerformerCallout,
    watchListCallout,
    recommendations,
    activeFilterContext: scopeDesc,
  };
}

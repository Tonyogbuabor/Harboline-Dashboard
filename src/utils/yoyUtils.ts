import {
  CleanedOrder,
  DatePreset,
  DimensionBreakdown,
  FilterState,
  KpiSummary,
  PeriodWindow,
  TimeGranularity,
} from '../types/dashboard';

export function shiftIsoDateByYears(isoDate: string, yearDelta: number): string {
  const [yStr, mStr, dStr] = isoDate.split('-');
  const y = Number(yStr) + yearDelta;
  const m = Number(mStr);
  const d = Number(dStr);
  // Handle Feb 29 leap year gracefully
  const maxDayInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const safeDay = Math.min(d, maxDayInMonth);
  return `${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function getDatasetBounds(orders: CleanedOrder[]): { minDate: string; maxDate: string } {
  if (orders.length === 0) {
    return { minDate: '2025-01-01', maxDate: '2026-11-20' };
  }
  let minDate = orders[0].orderDate;
  let maxDate = orders[0].orderDate;
  for (const o of orders) {
    if (o.orderDate < minDate) minDate = o.orderDate;
    if (o.orderDate > maxDate) maxDate = o.orderDate;
  }
  return { minDate, maxDate };
}

export function resolvePeriodWindow(
  orders: CleanedOrder[],
  datePreset: DatePreset,
  customStart: string,
  customEnd: string
): PeriodWindow {
  const { minDate, maxDate } = getDatasetBounds(orders);

  if (datePreset === '30d') {
    const start = addDaysIso(maxDate, -29);
    const splyStart = shiftIsoDateByYears(start, -1);
    const splyEnd = shiftIsoDateByYears(maxDate, -1);
    return {
      currentStart: start,
      currentEnd: maxDate,
      splyStart,
      splyEnd,
      label: `${start} to ${maxDate}`,
      comparisonLabel: `${splyStart} to ${splyEnd}`,
    };
  }

  if (datePreset === '90d') {
    const start = addDaysIso(maxDate, -89);
    const splyStart = shiftIsoDateByYears(start, -1);
    const splyEnd = shiftIsoDateByYears(maxDate, -1);
    return {
      currentStart: start,
      currentEnd: maxDate,
      splyStart,
      splyEnd,
      label: `${start} to ${maxDate}`,
      comparisonLabel: `${splyStart} to ${splyEnd}`,
    };
  }

  if (datePreset === 'ytd') {
    const latestYear = maxDate.slice(0, 4);
    const start = `${latestYear}-01-01`;
    const splyStart = shiftIsoDateByYears(start, -1);
    const splyEnd = shiftIsoDateByYears(maxDate, -1);
    return {
      currentStart: start,
      currentEnd: maxDate,
      splyStart,
      splyEnd,
      label: `YTD ${latestYear} (${start} to ${maxDate})`,
      comparisonLabel: `${splyStart} to ${splyEnd}`,
    };
  }

  if (datePreset === 'custom' && customStart && customEnd) {
    const start = customStart <= customEnd ? customStart : customEnd;
    const end = customStart <= customEnd ? customEnd : customStart;
    return {
      currentStart: start,
      currentEnd: end,
      splyStart: shiftIsoDateByYears(start, -1),
      splyEnd: shiftIsoDateByYears(end, -1),
      label: `${start} to ${end}`,
      comparisonLabel: `${shiftIsoDateByYears(start, -1)} to ${shiftIsoDateByYears(end, -1)}`,
    };
  }

  // 'all': Current totals cover all rows [minDate..maxDate], while YoY delta compares
  // latest calendar year YTD window against exact same calendar window in prior year.
  const latestYear = maxDate.slice(0, 4);
  const ytdStart = `${latestYear}-01-01`;
  return {
    currentStart: minDate,
    currentEnd: maxDate,
    splyStart: shiftIsoDateByYears(ytdStart, -1),
    splyEnd: shiftIsoDateByYears(maxDate, -1),
    label: `All Time (${minDate} to ${maxDate})`,
    comparisonLabel: `${latestYear} YTD vs ${Number(latestYear) - 1} SPLY`,
  };
}

export function applyDimensionFilters(
  orders: CleanedOrder[],
  filters: FilterState
): CleanedOrder[] {
  const q = filters.searchQuery.trim().toLowerCase();
  return orders.filter((o) => {
    if (filters.region !== 'All' && o.region !== filters.region) return false;
    if (filters.category !== 'All' && o.productCategory !== filters.category) return false;
    if (filters.channel !== 'All' && o.channel !== filters.channel) return false;
    if (filters.state !== 'All' && o.state !== filters.state) return false;
    if (filters.salesRep !== 'All' && o.salesRep !== filters.salesRep) return false;
    if (filters.product !== 'All' && o.product !== filters.product) return false;
    if (q) {
      const hay =
        `${o.orderId} ${o.region} ${o.state} ${o.productCategory} ${o.product} ${o.salesRep} ${o.channel} ${o.customerSegment}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function filterByDateRange(
  orders: CleanedOrder[],
  startIso: string,
  endIso: string
): CleanedOrder[] {
  return orders.filter((o) => o.orderDate >= startIso && o.orderDate <= endIso);
}

export function getComparisonCohorts(
  allOrders: CleanedOrder[],
  filters: FilterState
): {
  window: PeriodWindow;
  filteredOrders: CleanedOrder[];
  currentYoYCohort: CleanedOrder[];
  splyCohort: CleanedOrder[];
} {
  const dimFiltered = applyDimensionFilters(allOrders, filters);
  const window = resolvePeriodWindow(
    allOrders,
    filters.datePreset,
    filters.customStart,
    filters.customEnd
  );

  const filteredOrders =
    filters.datePreset === 'all'
      ? dimFiltered
      : filterByDateRange(dimFiltered, window.currentStart, window.currentEnd);

  // For YoY delta math when 'all' is selected, compare latest year YTD vs prior year same window
  // so we never compare 23 months against 12 months.
  const latestYear = window.currentEnd.slice(0, 4);
  const currentYoYCohort =
    filters.datePreset === 'all'
      ? filterByDateRange(dimFiltered, `${latestYear}-01-01`, window.currentEnd)
      : filteredOrders;

  const splyCohort = filterByDateRange(dimFiltered, window.splyStart, window.splyEnd);

  return {
    window,
    filteredOrders,
    currentYoYCohort,
    splyCohort,
  };
}

export function calcPctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

export function computeKpiSummary(
  displayOrders: CleanedOrder[],
  currentYoYOrders: CleanedOrder[],
  splyOrders: CleanedOrder[]
): KpiSummary {
  const sum = (arr: CleanedOrder[]) => {
    let revenue = 0;
    let cost = 0;
    let profit = 0;
    let units = 0;
    let discountSum = 0;
    const orderIds = new Set<string>();
    for (const o of arr) {
      revenue += o.revenue;
      cost += o.cost;
      profit += o.profit;
      units += o.units;
      discountSum += o.discountPct;
      orderIds.add(o.orderId);
    }
    const orders = orderIds.size;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    const avgDiscountPct = arr.length > 0 ? discountSum / arr.length : 0;
    return { revenue, cost, profit, units, orders, marginPct, avgDiscountPct };
  };

  const disp = sum(displayOrders);
  const cur = sum(currentYoYOrders);
  const prev = sum(splyOrders);

  const marginBpsDelta =
    prev.revenue > 0 && cur.revenue > 0
      ? Math.round((cur.marginPct - prev.marginPct) * 100)
      : null;

  return {
    revenue: disp.revenue,
    splyRevenue: prev.revenue,
    revenueYoY: calcPctChange(cur.revenue, prev.revenue),
    orders: disp.orders,
    splyOrders: prev.orders,
    ordersYoY: calcPctChange(cur.orders, prev.orders),
    profit: disp.profit,
    splyProfit: prev.profit,
    profitYoY: calcPctChange(cur.profit, prev.profit),
    marginPct: Number(disp.marginPct.toFixed(1)),
    splyMarginPct: Number(prev.marginPct.toFixed(1)),
    marginBpsDelta,
    units: disp.units,
    splyUnits: prev.units,
    unitsYoY: calcPctChange(cur.units, prev.units),
    cost: disp.cost,
    splyCost: prev.cost,
    avgDiscountPct: Number(disp.avgDiscountPct.toFixed(1)),
    splyAvgDiscountPct: Number(prev.avgDiscountPct.toFixed(1)),
  };
}

export function computeDimensionBreakdown(
  displayOrders: CleanedOrder[],
  currentYoYOrders: CleanedOrder[],
  splyOrders: CleanedOrder[],
  accessor: (o: CleanedOrder) => string,
  sublabelAccessor?: (o: CleanedOrder) => string
): DimensionBreakdown[] {
  const dispMap = new Map<
    string,
    { revenue: number; profit: number; cost: number; units: number; discountSum: number; count: number; orderIds: Set<string>; sublabel?: string }
  >();
  const curMap = new Map<string, { revenue: number; profit: number }>();
  const splyMap = new Map<string, { revenue: number; profit: number; discountSum: number; count: number }>();

  let totalRevenue = 0;

  for (const o of displayOrders) {
    const key = accessor(o);
    totalRevenue += o.revenue;
    let entry = dispMap.get(key);
    if (!entry) {
      entry = {
        revenue: 0,
        profit: 0,
        cost: 0,
        units: 0,
        discountSum: 0,
        count: 0,
        orderIds: new Set<string>(),
        sublabel: sublabelAccessor ? sublabelAccessor(o) : undefined,
      };
      dispMap.set(key, entry);
    }
    entry.revenue += o.revenue;
    entry.profit += o.profit;
    entry.cost += o.cost;
    entry.units += o.units;
    entry.discountSum += o.discountPct;
    entry.count++;
    entry.orderIds.add(o.orderId);
  }

  for (const o of currentYoYOrders) {
    const key = accessor(o);
    const entry = curMap.get(key) ?? { revenue: 0, profit: 0 };
    entry.revenue += o.revenue;
    entry.profit += o.profit;
    curMap.set(key, entry);
  }

  for (const o of splyOrders) {
    const key = accessor(o);
    const entry = splyMap.get(key) ?? { revenue: 0, profit: 0, discountSum: 0, count: 0 };
    entry.revenue += o.revenue;
    entry.profit += o.profit;
    entry.discountSum += o.discountPct;
    entry.count++;
    splyMap.set(key, entry);
  }

  const results: DimensionBreakdown[] = [];
  for (const [name, disp] of dispMap.entries()) {
    const cur = curMap.get(name) ?? { revenue: 0, profit: 0 };
    const prev = splyMap.get(name) ?? { revenue: 0, profit: 0, discountSum: 0, count: 0 };

    const marginPct = disp.revenue > 0 ? (disp.profit / disp.revenue) * 100 : 0;
    const curMarginPct = cur.revenue > 0 ? (cur.profit / cur.revenue) * 100 : 0;
    const splyMarginPct = prev.revenue > 0 ? (prev.profit / prev.revenue) * 100 : 0;
    const marginBpsDelta =
      prev.revenue > 0 && cur.revenue > 0
        ? Math.round((curMarginPct - splyMarginPct) * 100)
        : null;

    results.push({
      name,
      sublabel: disp.sublabel,
      revenue: Number(disp.revenue.toFixed(2)),
      splyRevenue: Number(prev.revenue.toFixed(2)),
      revenueYoY: calcPctChange(cur.revenue, prev.revenue),
      profit: Number(disp.profit.toFixed(2)),
      splyProfit: Number(prev.profit.toFixed(2)),
      cost: Number(disp.cost.toFixed(2)),
      orders: disp.orderIds.size,
      units: disp.units,
      marginPct: Number(marginPct.toFixed(1)),
      splyMarginPct: Number(splyMarginPct.toFixed(1)),
      marginBpsDelta,
      avgDiscountPct: disp.count > 0 ? Number((disp.discountSum / disp.count).toFixed(1)) : 0,
      splyAvgDiscountPct: prev.count > 0 ? Number((prev.discountSum / prev.count).toFixed(1)) : 0,
      sharePct: totalRevenue > 0 ? Number(((disp.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    });
  }

  return results.sort((a, b) => b.revenue - a.revenue);
}

export interface TimeSeriesPoint {
  bucketKey: string;
  label: string;
  revenue: number;
  profit: number;
  splyRevenue: number | null;
  orders: number;
}

function getBucketKey(isoDate: string, granularity: TimeGranularity): { key: string; label: string } {
  if (granularity === 'daily') {
    const dt = new Date(`${isoDate}T00:00:00Z`);
    const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return { key: isoDate, label };
  }
  if (granularity === 'weekly') {
    const dt = new Date(`${isoDate}T00:00:00Z`);
    const day = dt.getUTCDay();
    const diff = dt.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), diff));
    const key = monday.toISOString().slice(0, 10);
    const label = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return { key, label: `Wk ${label}` };
  }
  // monthly
  const key = isoDate.slice(0, 7);
  const dt = new Date(`${key}-01T00:00:00Z`);
  const label = dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return { key, label };
}

export function buildTimeSeries(
  displayOrders: CleanedOrder[],
  splyOrders: CleanedOrder[],
  granularity: TimeGranularity
): TimeSeriesPoint[] {
  const map = new Map<string, { label: string; revenue: number; profit: number; orderIds: Set<string> }>();
  const splyMap = new Map<string, number>();

  for (const o of displayOrders) {
    const { key, label } = getBucketKey(o.orderDate, granularity);
    let entry = map.get(key);
    if (!entry) {
      entry = { label, revenue: 0, profit: 0, orderIds: new Set<string>() };
      map.set(key, entry);
    }
    entry.revenue += o.revenue;
    entry.profit += o.profit;
    entry.orderIds.add(o.orderId);
  }

  // Shift SPLY dates forward +1 year so they align onto the exact current period buckets
  for (const o of splyOrders) {
    const shiftedDate = shiftIsoDateByYears(o.orderDate, 1);
    const { key } = getBucketKey(shiftedDate, granularity);
    splyMap.set(key, (splyMap.get(key) ?? 0) + o.revenue);
  }

  const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  return keys.map((key) => {
    const entry = map.get(key)!;
    const splyVal = splyMap.get(key);
    return {
      bucketKey: key,
      label: entry.label,
      revenue: Math.round(entry.revenue),
      profit: Math.round(entry.profit),
      splyRevenue: splyVal !== undefined ? Math.round(splyVal) : null,
      orders: entry.orderIds.size,
    };
  });
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyExact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

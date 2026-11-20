export interface RawOrderRow {
  'Order ID'?: unknown;
  'Order Date'?: unknown;
  Country?: unknown;
  Region?: unknown;
  State?: unknown;
  'Product Category'?: unknown;
  Product?: unknown;
  'Sales Rep'?: unknown;
  'Customer Segment'?: unknown;
  Channel?: unknown;
  Units?: unknown;
  'Unit Price (USD)'?: unknown;
  'Discount %'?: unknown;
  'Revenue (USD)'?: unknown;
  'Cost (USD)'?: unknown;
  'Profit (USD)'?: unknown;
  [key: string]: unknown;
}

export interface CleanedOrder {
  orderId: string;
  orderDate: string; // strict YYYY-MM-DD
  dateObj: Date;
  country: string;
  region: string;
  state: string;
  productCategory: string;
  product: string;
  salesRep: string;
  customerSegment: string;
  channel: string;
  units: number;
  unitPrice: number;
  discountPct: number; // stored as 0 - 100 percentage points, e.g., 8.5 for 8.5%
  revenue: number;
  cost: number;
  profit: number;
}

export interface CleaningStats {
  totalRawRows: number;
  validRows: number;
  duplicatesRemoved: number;
  blanksDiscarded: number;
  invalidDatesRemoved: number;
  normalizedFields: number;
}

export type DatePreset = 'all' | '30d' | '90d' | 'ytd' | 'custom';

export type NavSection =
  | 'overview'
  | 'executive'
  | 'regional'
  | 'products'
  | 'reps'
  | 'insights'
  | 'ledger';

export type TimeGranularity = 'daily' | 'weekly' | 'monthly';

export interface FilterState {
  datePreset: DatePreset;
  customStart: string;
  customEnd: string;
  region: string;
  category: string;
  channel: string;
  state: string;
  salesRep: string;
  product: string;
  searchQuery: string;
}

export interface PeriodWindow {
  currentStart: string;
  currentEnd: string;
  splyStart: string;
  splyEnd: string;
  label: string;
  comparisonLabel: string;
}

export interface KpiSummary {
  revenue: number;
  splyRevenue: number;
  revenueYoY: number | null;
  orders: number;
  splyOrders: number;
  ordersYoY: number | null;
  profit: number;
  splyProfit: number;
  profitYoY: number | null;
  marginPct: number;
  splyMarginPct: number;
  marginBpsDelta: number | null;
  units: number;
  splyUnits: number;
  unitsYoY: number | null;
  cost: number;
  splyCost: number;
  avgDiscountPct: number;
  splyAvgDiscountPct: number;
}

export type AnomalySeverity = 'Spike' | 'Drop' | 'Margin Alert';

export type AnomalyDimension =
  | 'Overall'
  | 'Region'
  | 'State'
  | 'Product Category'
  | 'Product'
  | 'Sales Rep'
  | 'Channel';

export interface AnomalyItem {
  id: string;
  severity: AnomalySeverity;
  dimension: AnomalyDimension;
  entity: string;
  metricValue: number;
  splyValue: number;
  deltaAmount: number;
  yoyPct: number | null;
  marginPct: number;
  splyMarginPct: number;
  marginBpsDelta: number | null;
  zScore: number | null;
  headline: string;
  commentary: string;
  recommendedAction: string;
  impactScore: number;
}

export interface DimensionBreakdown {
  name: string;
  sublabel?: string;
  revenue: number;
  splyRevenue: number;
  revenueYoY: number | null;
  profit: number;
  splyProfit: number;
  cost: number;
  orders: number;
  units: number;
  marginPct: number;
  splyMarginPct: number;
  marginBpsDelta: number | null;
  avgDiscountPct: number;
  splyAvgDiscountPct: number;
  sharePct: number;
}

export type ExecutivePriority = 'Immediate' | 'This Week' | 'Strategic';

export type ExecutiveFocusArea =
  | 'Margin Protection'
  | 'Revenue Recovery'
  | 'Discount Governance'
  | 'Inventory & Capacity'
  | 'Growth Expansion';

export interface ActionableRecommendation {
  id: string;
  priority: ExecutivePriority;
  focusArea: ExecutiveFocusArea;
  owner: string;
  title: string;
  situationSummary: string;
  actionNarrative: string;
  actionSteps: string[];
  estimatedImpact: string;
  drillTarget?: {
    label: string;
    filterKey: 'region' | 'category' | 'channel' | 'state' | 'salesRep' | 'product';
    filterValue: string;
  };
}

export interface ExecutiveSummaryData {
  headline: string;
  openingBrief: string;
  profitabilityNarrative: string;
  commercialPulseNarrative: string;
  topPerformerCallout: {
    entity: string;
    dimension: string;
    narrative: string;
  } | null;
  watchListCallout: {
    entity: string;
    dimension: string;
    narrative: string;
  } | null;
  recommendations: ActionableRecommendation[];
  activeFilterContext: string;
}


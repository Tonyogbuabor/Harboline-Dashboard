import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnomalyItem,
  CleanedOrder,
  CleaningStats,
  FilterState,
  NavSection,
  TimeGranularity,
} from './types/dashboard';
import {
  DEFAULT_EXEC_URL,
  STORAGE_EXEC_URL_KEY,
  cleanOrderRows,
  extractPayloadRows,
} from './utils/dataCleaner';
import { generateSampleRawRows } from './data/sampleData';
import {
  buildTimeSeries,
  computeDimensionBreakdown,
  computeKpiSummary,
  getComparisonCohorts,
  getDatasetBounds,
} from './utils/yoyUtils';
import { generateDeterministicInsights } from './utils/insightsEngine';
import { Sidebar } from './components/Sidebar';
import { HeaderControls } from './components/HeaderControls';
import { KpiRow } from './components/KpiRow';
import { PrimaryChartsRow } from './components/PrimaryChartsRow';
import { SecondaryBreakdownRow } from './components/SecondaryBreakdownRow';
import { InsightsPanel } from './components/InsightsPanel';
import { OrderLedgerTable } from './components/OrderLedgerTable';
import { HygieneModal } from './components/HygieneModal';
import {
  ProductsChannelsSectionView,
  RegionalSectionView,
  SalesRepsSectionView,
} from './components/SectionViews';

const INITIAL_FILTERS: FilterState = {
  datePreset: 'all',
  customStart: '',
  customEnd: '',
  region: 'All',
  category: 'All',
  channel: 'All',
  state: 'All',
  salesRep: 'All',
  product: 'All',
  searchQuery: '',
};

function formatDisplayTimestamp(raw?: string): string {
  if (raw) {
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return raw;
  }
  return new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  // Initialize sample data immediately so the dashboard is never blank
  const initialSample = useMemo(() => {
    const raw = generateSampleRawRows();
    return cleanOrderRows(raw);
  }, []);

  const [orders, setOrders] = useState<CleanedOrder[]>(initialSample.orders);
  const [cleaningStats, setCleaningStats] = useState<CleaningStats>(
    initialSample.stats
  );
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(() =>
    formatDisplayTimestamp()
  );
  const [showSampleBanner, setShowSampleBanner] = useState<boolean>(true);

  const [urlInput, setUrlInput] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_EXEC_URL_KEY) || DEFAULT_EXEC_URL;
    } catch {
      return DEFAULT_EXEC_URL;
    }
  });

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [filters, setFilters] = useState<FilterState>(() => {
    const bounds = getDatasetBounds(initialSample.orders);
    return {
      ...INITIAL_FILTERS,
      customStart: bounds.minDate,
      customEnd: bounds.maxDate,
    };
  });
  const [granularity, setGranularity] = useState<TimeGranularity>('monthly');
  const [showSplyLine, setShowSplyLine] = useState<boolean>(true);
  const [hygieneOpen, setHygieneOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const fetchLiveSheet = useCallback(
    async (targetUrl: string, persistUrl: boolean) => {
      const trimmed = targetUrl.trim();
      if (!trimmed) return;

      setIsLoading(true);
      setConnectionError(null);

      try {
        // Plain GET with NO custom headers and NO Content-Type header to avoid CORS preflight
        const response = await fetch(trimmed);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} while fetching sheet feed`);
        }

        const payload: unknown = await response.json();
        const { rawRows, updatedAt: payloadUpdatedAt } =
          extractPayloadRows(payload);

        if (rawRows.length === 0) {
          throw new Error(
            'Connected endpoint returned 0 rows. Verify the Apps Script JSON array format.'
          );
        }

        const cleaned = cleanOrderRows(rawRows);
        if (cleaned.orders.length === 0) {
          throw new Error(
            'All rows were discarded during validation (check Order ID, Order Date, and Revenue headers).'
          );
        }

        if (persistUrl) {
          try {
            localStorage.setItem(STORAGE_EXEC_URL_KEY, trimmed);
          } catch {
            // Ignore storage quota errors
          }
        }

        const bounds = getDatasetBounds(cleaned.orders);
        setOrders(cleaned.orders);
        setCleaningStats(cleaned.stats);
        setIsLiveMode(true);
        setUpdatedAt(formatDisplayTimestamp(payloadUpdatedAt));
        setFilters((prev) => ({
          ...prev,
          customStart: prev.customStart || bounds.minDate,
          customEnd: prev.customEnd || bounds.maxDate,
        }));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to fetch data from Google Apps Script URL.';
        setConnectionError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-load saved URL on subsequent visits
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EXEC_URL_KEY);
      if (saved && saved.trim()) {
        setUrlInput(saved);
        void fetchLiveSheet(saved, false);
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, [fetchLiveSheet]);

  const handleConnectSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    void fetchLiveSheet(urlInput, true);
  };

  const handleRefresh = () => {
    if (isLiveMode) {
      let target = urlInput;
      try {
        target = localStorage.getItem(STORAGE_EXEC_URL_KEY) || urlInput;
      } catch {
        // fallback to urlInput
      }
      void fetchLiveSheet(target, false);
    } else {
      const raw = generateSampleRawRows();
      const cleaned = cleanOrderRows(raw);
      setOrders(cleaned.orders);
      setCleaningStats(cleaned.stats);
      setUpdatedAt(formatDisplayTimestamp());
    }
  };

  const handleDisconnectToSample = () => {
    try {
      localStorage.removeItem(STORAGE_EXEC_URL_KEY);
    } catch {
      // ignore
    }
    const raw = generateSampleRawRows();
    const cleaned = cleanOrderRows(raw);
    const bounds = getDatasetBounds(cleaned.orders);
    setOrders(cleaned.orders);
    setCleaningStats(cleaned.stats);
    setIsLiveMode(false);
    setConnectionError(null);
    setShowSampleBanner(true);
    setUpdatedAt(formatDisplayTimestamp());
    setFilters({
      ...INITIAL_FILTERS,
      customStart: bounds.minDate,
      customEnd: bounds.maxDate,
    });
  };

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    const bounds = getDatasetBounds(orders);
    setFilters({
      ...INITIAL_FILTERS,
      customStart: bounds.minDate,
      customEnd: bounds.maxDate,
    });
  }, [orders]);

  // Extract unique filter dropdown options from cleaned dataset
  const filterOptions = useMemo(() => {
    const regionSet = new Set<string>();
    const categorySet = new Set<string>();
    const channelSet = new Set<string>();
    for (const o of orders) {
      if (o.region) regionSet.add(o.region);
      if (o.productCategory) categorySet.add(o.productCategory);
      if (o.channel) channelSet.add(o.channel);
    }
    return {
      regions: Array.from(regionSet).sort(),
      categories: Array.from(categorySet).sort(),
      channels: Array.from(channelSet).sort(),
    };
  }, [orders]);

  // Compute current & SPLY cohorts + dynamic metrics
  const analytics = useMemo(() => {
    const { window, filteredOrders, currentYoYCohort, splyCohort } =
      getComparisonCohorts(orders, filters);

    const kpi = computeKpiSummary(filteredOrders, currentYoYCohort, splyCohort);
    const timeSeries = buildTimeSeries(filteredOrders, splyCohort, granularity);

    const regionBreakdown = computeDimensionBreakdown(
      filteredOrders,
      currentYoYCohort,
      splyCohort,
      (o) => o.region
    );
    const stateBreakdown = computeDimensionBreakdown(
      filteredOrders,
      currentYoYCohort,
      splyCohort,
      (o) => o.state,
      (o) => o.region
    );
    const categoryBreakdown = computeDimensionBreakdown(
      filteredOrders,
      currentYoYCohort,
      splyCohort,
      (o) => o.productCategory
    );
    const productBreakdown = computeDimensionBreakdown(
      filteredOrders,
      currentYoYCohort,
      splyCohort,
      (o) => o.product,
      (o) => o.productCategory
    );
    const repBreakdown = computeDimensionBreakdown(
      filteredOrders,
      currentYoYCohort,
      splyCohort,
      (o) => o.salesRep,
      (o) => o.region
    );
    const channelBreakdown = computeDimensionBreakdown(
      filteredOrders,
      currentYoYCohort,
      splyCohort,
      (o) => o.channel
    );

    const insights = generateDeterministicInsights(
      filteredOrders,
      currentYoYCohort,
      splyCohort
    );

    return {
      window,
      filteredOrders,
      kpi,
      timeSeries,
      regionBreakdown,
      stateBreakdown,
      categoryBreakdown,
      productBreakdown,
      repBreakdown,
      channelBreakdown,
      insights,
    };
  }, [orders, filters, granularity]);

  const handleDrillDownAnomaly = (anomaly: AnomalyItem) => {
    if (anomaly.dimension === 'Region') {
      updateFilter('region', anomaly.entity);
    } else if (anomaly.dimension === 'State') {
      updateFilter('state', anomaly.entity);
    } else if (anomaly.dimension === 'Product Category') {
      updateFilter('category', anomaly.entity);
    } else if (anomaly.dimension === 'Product') {
      updateFilter('product', anomaly.entity);
    } else if (anomaly.dimension === 'Sales Rep') {
      updateFilter('salesRep', anomaly.entity);
    } else if (anomaly.dimension === 'Channel') {
      updateFilter('channel', anomaly.entity);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] text-gray-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        isLiveMode={isLiveMode}
        rowCount={orders.length}
        anomalyCount={analytics.insights.anomalies.length}
        cleaningStats={cleaningStats}
        onOpenHygieneModal={() => setHygieneOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 max-w-[1600px] mx-auto space-y-5">
        <HeaderControls
          urlInput={urlInput}
          onUrlInputChange={setUrlInput}
          onConnect={handleConnectSubmit}
          onRefresh={handleRefresh}
          onDisconnectToSample={handleDisconnectToSample}
          isLiveMode={isLiveMode}
          isLoading={isLoading}
          connectionError={connectionError}
          updatedAt={updatedAt}
          filters={filters}
          onUpdateFilter={updateFilter}
          onResetFilters={resetFilters}
          regions={filterOptions.regions}
          categories={filterOptions.categories}
          channels={filterOptions.channels}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          showSampleBanner={showSampleBanner}
          onDismissSampleBanner={() => setShowSampleBanner(false)}
          onConnectDefaultSheet={() => {
            setUrlInput(DEFAULT_EXEC_URL);
            void fetchLiveSheet(DEFAULT_EXEC_URL, true);
          }}
        />

        {/* Top KPI Row stays visible across Overview & Analytical sections */}
        {activeSection !== 'ledger' && (
          <KpiRow kpi={analytics.kpi} window={analytics.window} />
        )}

        {activeSection === 'overview' && (
          <>
            <PrimaryChartsRow
              timeSeries={analytics.timeSeries}
              granularity={granularity}
              onGranularityChange={setGranularity}
              showSplyLine={showSplyLine}
              onToggleSplyLine={() => setShowSplyLine((v) => !v)}
              categoryBreakdown={analytics.categoryBreakdown}
              activeCategory={filters.category}
              onSelectCategory={(cat) => updateFilter('category', cat)}
            />

            <SecondaryBreakdownRow
              regionBreakdown={analytics.regionBreakdown}
              activeRegion={filters.region}
              onSelectRegion={(reg) => updateFilter('region', reg)}
              productBreakdown={analytics.productBreakdown}
              repBreakdown={analytics.repBreakdown}
              stateBreakdown={analytics.stateBreakdown}
              activeProduct={filters.product}
              activeRep={filters.salesRep}
              activeState={filters.state}
              onSelectProduct={(prod) => updateFilter('product', prod)}
              onSelectRep={(rep) => updateFilter('salesRep', rep)}
              onSelectState={(st) => updateFilter('state', st)}
              kpi={analytics.kpi}
              window={analytics.window}
              timeSeries={analytics.timeSeries}
              topAnomalies={analytics.insights.anomalies}
              onViewAllInsights={() => setActiveSection('insights')}
            />

            <InsightsPanel
              anomalies={analytics.insights.anomalies}
              executiveBrief={analytics.insights.executiveBrief}
              compact
              onDrillDownAnomaly={handleDrillDownAnomaly}
              onViewAllInsights={() => setActiveSection('insights')}
            />

            <OrderLedgerTable
              orders={analytics.filteredOrders}
              searchQuery={filters.searchQuery}
              onSearchChange={(q) => updateFilter('searchQuery', q)}
              onQuickFilterRep={(rep) =>
                updateFilter('salesRep', filters.salesRep === rep ? 'All' : rep)
              }
              onQuickFilterRegion={(reg) =>
                updateFilter('region', filters.region === reg ? 'All' : reg)
              }
            />
          </>
        )}

        {activeSection === 'regional' && (
          <RegionalSectionView
            regionBreakdown={analytics.regionBreakdown}
            stateBreakdown={analytics.stateBreakdown}
            activeRegion={filters.region}
            activeState={filters.state}
            onSelectRegion={(r) => updateFilter('region', r)}
            onSelectState={(s) => updateFilter('state', s)}
          />
        )}

        {activeSection === 'products' && (
          <ProductsChannelsSectionView
            categoryBreakdown={analytics.categoryBreakdown}
            productBreakdown={analytics.productBreakdown}
            channelBreakdown={analytics.channelBreakdown}
            activeCategory={filters.category}
            activeProduct={filters.product}
            activeChannel={filters.channel}
            onSelectCategory={(c) => updateFilter('category', c)}
            onSelectProduct={(p) => updateFilter('product', p)}
            onSelectChannel={(ch) => updateFilter('channel', ch)}
          />
        )}

        {activeSection === 'reps' && (
          <SalesRepsSectionView
            repBreakdown={analytics.repBreakdown}
            activeRep={filters.salesRep}
            onSelectRep={(rep) => updateFilter('salesRep', rep)}
          />
        )}

        {activeSection === 'insights' && (
          <InsightsPanel
            anomalies={analytics.insights.anomalies}
            executiveBrief={analytics.insights.executiveBrief}
            onDrillDownAnomaly={handleDrillDownAnomaly}
          />
        )}

        {activeSection === 'ledger' && (
          <OrderLedgerTable
            orders={analytics.filteredOrders}
            searchQuery={filters.searchQuery}
            onSearchChange={(q) => updateFilter('searchQuery', q)}
            onQuickFilterRep={(rep) =>
              updateFilter('salesRep', filters.salesRep === rep ? 'All' : rep)
            }
            onQuickFilterRegion={(reg) =>
              updateFilter('region', filters.region === reg ? 'All' : reg)
            }
          />
        )}
      </main>

      <HygieneModal
        open={hygieneOpen}
        onClose={() => setHygieneOpen(false)}
        stats={cleaningStats}
        isLiveMode={isLiveMode}
      />
    </div>
  );
}

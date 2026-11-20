import React from 'react';
import {
  Menu,
  RefreshCw,
  Link2,
  Calendar,
  Filter,
  RotateCcw,
  Clock,
  X,
} from 'lucide-react';
import { DatePreset, FilterState } from '../types/dashboard';

interface HeaderControlsProps {
  urlInput: string;
  onUrlInputChange: (val: string) => void;
  onConnect: (e?: React.FormEvent) => void;
  onRefresh: () => void;
  onDisconnectToSample: () => void;
  isLiveMode: boolean;
  isLoading: boolean;
  connectionError: string | null;
  updatedAt: string | null;
  filters: FilterState;
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  regions: string[];
  categories: string[];
  channels: string[];
  onOpenMobileMenu: () => void;
  showSampleBanner: boolean;
  onDismissSampleBanner: () => void;
  onConnectDefaultSheet: () => void;
}

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  urlInput,
  onUrlInputChange,
  onConnect,
  onRefresh,
  onDisconnectToSample,
  isLiveMode,
  isLoading,
  connectionError,
  updatedAt,
  filters,
  onUpdateFilter,
  onResetFilters,
  regions,
  categories,
  channels,
  onOpenMobileMenu,
  showSampleBanner,
  onDismissSampleBanner,
  onConnectDefaultSheet,
}) => {
  const hasActiveFilters =
    filters.datePreset !== 'all' ||
    filters.region !== 'All' ||
    filters.category !== 'All' ||
    filters.channel !== 'All' ||
    filters.state !== 'All' ||
    filters.salesRep !== 'All' ||
    filters.product !== 'All' ||
    filters.searchQuery.trim() !== '';

  const drillDownChips: Array<{ label: string; onClear: () => void }> = [];
  if (filters.state !== 'All') {
    drillDownChips.push({
      label: `State: ${filters.state}`,
      onClear: () => onUpdateFilter('state', 'All'),
    });
  }
  if (filters.salesRep !== 'All') {
    drillDownChips.push({
      label: `Rep: ${filters.salesRep}`,
      onClear: () => onUpdateFilter('salesRep', 'All'),
    });
  }
  if (filters.product !== 'All') {
    drillDownChips.push({
      label: `Product: ${filters.product}`,
      onClear: () => onUpdateFilter('product', 'All'),
    });
  }

  return (
    <header className="space-y-3">
      {/* Main Top Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 truncate">
              Harborline Supply Co. Executive Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              Real-time supply chain, revenue &amp; margin intelligence
            </p>
          </div>
        </div>

        {/* Connection Control Bar */}
        <form
          onSubmit={onConnect}
          className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0"
        >
          <div className="relative flex-1 sm:w-64 md:w-72 min-w-[200px]">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => onUrlInputChange(e.target.value)}
              placeholder="Paste Google Apps Script /exec URL"
              aria-label="Google Apps Script Web App URL"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-8 pr-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#DC2626] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !urlInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{isLiveMode ? 'Reconnect' : 'Connect'}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh active dataset"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#DC2626]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {updatedAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pl-1 whitespace-nowrap shrink-0 tabular-nums">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span>Updated {updatedAt}</span>
            </div>
          )}
        </form>
      </div>

      {/* Dismissible Sample Mode Notice */}
      {!isLiveMode && showSampleBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-[#FEF2F2] px-4 py-3 text-xs text-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-[#DC2626]">Sample Mode Active</span>
            <span className="text-gray-400" aria-hidden="true">·</span>
            <span>
              Viewing built-in 2025–2026 supply chain dataset. Connect your Google Sheet URL above or load the Harborline live feed.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onConnectDefaultSheet}
              disabled={isLoading}
              className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B91C1C] transition-colors whitespace-nowrap cursor-pointer"
            >
              Load Live Sheet
            </button>
            <button
              type="button"
              onClick={onDismissSampleBanner}
              aria-label="Dismiss sample data banner"
              className="rounded-lg p-1 text-gray-500 hover:bg-red-100 hover:text-gray-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Connection Error Alert */}
      {connectionError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <span>
            <strong className="font-semibold">Sheet Connection Notice:</strong> {connectionError}
          </span>
          {isLiveMode && (
            <button
              type="button"
              onClick={onDisconnectToSample}
              className="text-xs font-semibold text-rose-700 underline hover:text-rose-900 whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              Switch to Sample Data
            </button>
          )}
        </div>
      )}

      {/* Global Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Preset Segmented Control / Select */}
          <div className="flex items-center gap-1.5 rounded-xl bg-gray-100/90 p-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400 ml-2 mr-0.5 hidden sm:block" />
            {DATE_PRESETS.map((preset) => {
              const active = filters.datePreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onUpdateFilter('datePreset', preset.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-[#DC2626] shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs */}
          {filters.datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={filters.customStart}
                onChange={(e) => onUpdateFilter('customStart', e.target.value)}
                aria-label="Custom start date"
                className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 focus:border-[#DC2626] focus:outline-none tabular-nums"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={filters.customEnd}
                onChange={(e) => onUpdateFilter('customEnd', e.target.value)}
                aria-label="Custom end date"
                className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 focus:border-[#DC2626] focus:outline-none tabular-nums"
              />
            </div>
          )}
        </div>

        {/* Dimension Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />

          <select
            value={filters.region}
            onChange={(e) => onUpdateFilter('region', e.target.value)}
            aria-label="Filter by Region"
            className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-[#DC2626] focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="All">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(e) => onUpdateFilter('category', e.target.value)}
            aria-label="Filter by Product Category"
            className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-[#DC2626] focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.channel}
            onChange={(e) => onUpdateFilter('channel', e.target.value)}
            aria-label="Filter by Channel"
            className="rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-[#DC2626] focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="All">All Channels</option>
            {channels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          {drillDownChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClear}
              className="inline-flex items-center gap-1 rounded-xl bg-[#FEF2F2] border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-red-100 transition-colors cursor-pointer"
            >
              <span>{chip.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

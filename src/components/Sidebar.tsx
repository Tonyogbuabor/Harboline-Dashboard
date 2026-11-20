import React, { useState } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Package,
  Users,
  TrendingUp,
  Table2,
  Database,
  ShieldCheck,
  X,
} from 'lucide-react';
import { CleaningStats, NavSection } from '../types/dashboard';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isLiveMode: boolean;
  rowCount: number;
  anomalyCount: number;
  cleaningStats: CleaningStats;
  onOpenHygieneModal: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'regional', label: 'Regional & State', icon: MapPin },
  { id: 'products', label: 'Products & Channels', icon: Package },
  { id: 'reps', label: 'Sales Reps', icon: Users },
  { id: 'insights', label: 'Insights & Anomalies', icon: TrendingUp },
  { id: 'ledger', label: 'Data Table', icon: Table2 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isLiveMode,
  rowCount,
  anomalyCount,
  cleaningStats,
  onOpenHygieneModal,
  mobileOpen,
  onCloseMobile,
}) => {
  const [logoError, setLogoError] = useState(false);

  const cleanedTotal =
    cleaningStats.duplicatesRemoved +
    cleaningStats.blanksDiscarded +
    cleaningStats.invalidDatesRemoved;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-gray-200 select-none">
      {/* Solid Crimson Top Brand Header */}
      <div className="flex items-center justify-between bg-[#DC2626] px-5 py-4">
        <a
          href="https://ibb.co/C3xKX8m1"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 min-w-0 focus:outline-none"
        >
          {!logoError ? (
            <img
              src="https://i.ibb.co/XrmxdLj2/Red-Cargo-Wave-H-Logo.png"
              alt="Red-Cargo-Wave-H-Logo"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="h-8 w-8 rounded object-contain bg-white p-0.5 shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white text-[#DC2626] font-extrabold text-base">
              H
            </div>
          )}
          <div className="min-w-0">
            <span className="block text-lg font-bold tracking-tight text-white truncate">
              Harborline
            </span>
          </div>
        </a>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden rounded-lg p-1.5 text-white/90 hover:bg-white/15 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1" aria-label="Dashboard sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#FEF2F2] text-[#DC2626] font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-[#DC2626]' : 'text-gray-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'insights' && anomalyCount > 0 && (
                <span
                  className={`text-xs tabular-nums font-semibold ${
                    isActive ? 'text-[#DC2626]' : 'text-gray-500'
                  }`}
                >
                  {anomalyCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Data Connection & Hygiene Status Card */}
      <div className="p-3.5 border-t border-gray-100">
        <div className="rounded-2xl bg-[#FEF2F2]/70 border border-red-100 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-red-100 text-[#DC2626]">
              <Database className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">
                {isLiveMode ? 'Live Google Sheet' : 'Sample Mode'}
              </div>
              <div className="text-[11px] text-gray-600 tabular-nums">
                {rowCount.toLocaleString()} cleaned orders
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenHygieneModal}
            className="w-full flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-700 border border-red-100 hover:border-red-200 hover:text-[#DC2626] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#DC2626]" />
              <span>Data Hygiene</span>
            </span>
            <span className="tabular-nums font-semibold text-gray-900">
              {cleanedTotal} fixed
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[240px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[260px] max-w-[80vw] h-full z-10 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

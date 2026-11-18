import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Building2,
  ClipboardList,
  FileQuestion,
  FileSpreadsheet,
  FileCheck2,
  Truck,
  CreditCard,
  Wrench,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ModuleId } from '../../types/procurement';
import { useAuth } from '../../context/AuthContext';

export interface ModuleCounts {
  items?: number;
  vendors?: number;
  requisitions?: number;
  rfqs?: number;
  quotations?: number;
  purchaseOrders?: number;
  deliveries?: number;
  payments?: number;
  assets?: number;
}

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (module: ModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  counts?: ModuleCounts;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  counts,
}) => {
  const { activeRole, currentUser, canAccessModule, isSimulatingRole, resetSimulatedRole } = useAuth();

  const isAdmin =
    activeRole === 'Super Admin' ||
    activeRole === 'Managing Director / CEO' ||
    activeRole === 'General Manager (GM)' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Managing Director / CEO' ||
    currentUser?.role === 'General Manager (GM)' ||
    currentUser?.email === 'admin@procureos.com' ||
    currentUser?.email === 'muhammed.azhar@arabitra.com';

  const navigationItems: {
    id: ModuleId;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    badgeVariant?: 'cyan' | 'amber' | 'emerald' | 'rose';
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'items',
      label: 'Items & Catalog',
      icon: <Boxes className="w-5 h-5" />,
      badge: counts?.items !== undefined ? `${counts.items}` : undefined,
    },
    {
      id: 'vendors',
      label: 'Vendors & Suppliers',
      icon: <Building2 className="w-5 h-5" />,
      badge: counts?.vendors !== undefined ? `${counts.vendors}` : undefined,
    },
    {
      id: 'requisitions',
      label: 'Purchase Requisitions',
      icon: <ClipboardList className="w-5 h-5" />,
      badge: counts?.requisitions && counts.requisitions > 0 ? `${counts.requisitions}` : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'rfqs',
      label: 'RFQs & Tenders',
      icon: <FileQuestion className="w-5 h-5" />,
      badge: counts?.rfqs !== undefined && counts.rfqs > 0 ? `${counts.rfqs}` : undefined,
      badgeVariant: 'cyan',
    },
    {
      id: 'quotations',
      label: 'Quotations & Bids',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      badge: counts?.quotations !== undefined && counts.quotations > 0 ? `${counts.quotations}` : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'purchaseOrders',
      label: 'Purchase Orders',
      icon: <FileCheck2 className="w-5 h-5" />,
      badge: counts?.purchaseOrders !== undefined && counts.purchaseOrders > 0 ? `${counts.purchaseOrders}` : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'deliveries',
      label: 'Deliveries & Logistics',
      icon: <Truck className="w-5 h-5" />,
      badge: counts?.deliveries !== undefined && counts.deliveries > 0 ? `${counts.deliveries}` : undefined,
      badgeVariant: 'rose',
    },
    {
      id: 'payments',
      label: 'Payments & Milestones',
      icon: <CreditCard className="w-5 h-5" />,
      badge: counts?.payments !== undefined && counts.payments > 0 ? `${counts.payments}` : undefined,
    },
    {
      id: 'assets',
      label: 'Assets & Equipment',
      icon: <Wrench className="w-5 h-5" />,
      badge: counts?.assets !== undefined ? `${counts.assets}` : undefined,
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as ModuleId,
            label: 'Admin Command Center',
            icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
            badge: 'Admin',
            badgeVariant: 'amber' as const,
          },
        ]
      : []),
  ];

  // Enforce role-based module visibility: only modules permitted for the active role are rendered
  const visibleNavigationItems = navigationItems.filter((item) => canAccessModule(item.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-sidebar border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-800/90 bg-topbar">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-11 h-11 rounded-xl bg-slate-900/90 border border-amber-500/30 p-1.5 flex items-center justify-center shadow-lg shadow-amber-950/40 shrink-0">
              <img
                src="/arabitra-icon.png"
                alt="Arabitra Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-amber-200">
                    Arabitra
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    ProcureOS
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-emerald-400/90 truncate tracking-wide">
                  Powered by Fitco
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Modules (Filtered strictly by Active Role) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {visibleNavigationItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectModule(item.id);
                  onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div
                  className={`transition-colors shrink-0 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                </div>

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border shrink-0 ${
                      item.badgeVariant === 'rose'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                        : item.badgeVariant === 'amber'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        : item.badgeVariant === 'cyan'
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                        : item.badgeVariant === 'emerald'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Role Indicator & Simulation Status */}
        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]">
          {!isCollapsed ? (
            <div className="space-y-2">
              {isSimulatingRole && (
                <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-500/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">
                      Role Preview Mode
                    </span>
                    <button
                      type="button"
                      onClick={resetSimulatedRole}
                      className="text-[10px] text-amber-300 hover:text-white underline font-semibold cursor-pointer"
                      title="Reset to Super Admin view"
                    >
                      Reset View
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-200/90 mt-0.5">
                    Showing {visibleNavigationItems.length} authorized modules
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isSimulatingRole
                      ? 'bg-amber-950 border-amber-500/50 text-amber-400'
                      : 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Role</p>
                  <p className="text-xs font-semibold text-slate-200 truncate">{activeRole}</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center p-1"
              title={`Active Role: ${activeRole} (${visibleNavigationItems.length} modules visible)`}
            >
              <ShieldCheck
                className={`w-5 h-5 ${isSimulatingRole ? 'text-amber-400' : 'text-emerald-400'}`}
              />
              {isSimulatingRole && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 animate-pulse" />
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

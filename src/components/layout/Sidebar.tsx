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
  Building,
} from 'lucide-react';
import { ModuleId } from '../../types/procurement';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (module: ModuleId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { activeCompany } = useCompany();
  const { activeRole } = useAuth();

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
      badge: '7 SKUs',
    },
    {
      id: 'vendors',
      label: 'Vendors & Suppliers',
      icon: <Building2 className="w-5 h-5" />,
      badge: '7 Total',
    },
    {
      id: 'requisitions',
      label: 'Purchase Requisitions',
      icon: <ClipboardList className="w-5 h-5" />,
      badge: 'PR',
      badgeVariant: 'amber',
    },
    {
      id: 'rfqs',
      label: 'RFQs & Tenders',
      icon: <FileQuestion className="w-5 h-5" />,
      badge: '2 Open',
      badgeVariant: 'cyan',
    },
    {
      id: 'quotations',
      label: 'Quotations & Bids',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      badge: 'Eval',
      badgeVariant: 'amber',
    },
    {
      id: 'purchaseOrders',
      label: 'Purchase Orders',
      icon: <FileCheck2 className="w-5 h-5" />,
      badge: '2 Pending',
      badgeVariant: 'amber',
    },
    {
      id: 'deliveries',
      label: 'Deliveries & Logistics',
      icon: <Truck className="w-5 h-5" />,
      badge: '1 Overdue',
      badgeVariant: 'rose',
    },
    {
      id: 'payments',
      label: 'Payments & Milestones',
      icon: <CreditCard className="w-5 h-5" />,
      badge: '4 Records',
    },
    {
      id: 'assets',
      label: 'Assets & Equipment',
      icon: <Wrench className="w-5 h-5" />,
      badge: '4 Units',
    },
    {
      id: 'team',
      label: 'Team & Governance',
      icon: <Users className="w-5 h-5" />,
      badge: 'RBAC',
      badgeVariant: 'emerald',
    },
  ];

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
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-[#0b1120] border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-800/90 bg-[#090d16]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-11 h-11 rounded-xl bg-slate-900/90 border border-emerald-500/30 p-1.5 flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
              <img
                src="/fitco-logo.png"
                alt="Fitco Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    Procure<span className="text-emerald-400">OS</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    v2.6
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-emerald-400/90 truncate tracking-wide">
                  by Fitco
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

        {/* Company Context Chip */}
        {!isCollapsed && (
          <div className="px-4 py-3 bg-slate-950/50 border-b border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Building className="w-3 h-3 text-cyan-400" />
                Active Scope
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activeCompany === 'FITCO'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                    : activeCompany === 'ARABITRA'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-600'
                }`}
              >
                {activeCompany === 'ALL' ? 'Group Consolidated' : activeCompany}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Modules */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navigationItems.map((item) => {
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

        {/* Footer Role Indicator */}
        <div className="p-3 border-t border-slate-800/90 bg-[#090d16]">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Role</p>
                <p className="text-xs font-semibold text-slate-200 truncate">{activeRole}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-1" title={`Role: ${activeRole}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

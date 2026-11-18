import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Plus,
  UserCheck,
  ChevronDown,
  FileQuestion,
  FileCheck2,
  FileSpreadsheet,
  Boxes,
  Truck,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Settings,
  Database,
  Users,
  Zap,
} from 'lucide-react';
import { CompanySwitcher } from './CompanySwitcher';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AdminControlPanelModal } from '../admin/AdminControlPanelModal';
import { ModuleId } from '../../types/procurement';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onQuickAction: (actionType: 'rfq' | 'po' | 'item' | 'delivery' | 'quote') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateModule?: (module: ModuleId) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileMenu,
  onQuickAction,
  onNavigateModule,
}) => {
  const { currentUser, activeRole, logout, elevateToSuperAdmin } = useAuth();
  const { info } = useToast();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showAdminControlPanel, setShowAdminControlPanel] = useState(false);

  const isAdmin =
    activeRole === 'Super Admin' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.email === 'admin@procureos.com' ||
    currentUser?.email === 'muhammed.azhar@arabitra.com';

  const notifications: any[] = [];

  return (
    <header className="h-16 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/90 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Mobile hamburger & Company selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Company Switcher Tabs */}
        <CompanySwitcher />
      </div>

      {/* Right controls: Quick Create, Notifications, Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Super Admin Status Badge / Control Panel Trigger */}
        {isAdmin && (
          <button
            onClick={() => {
              if (onNavigateModule) {
                onNavigateModule('admin');
              } else {
                setShowAdminControlPanel(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-500 hover:to-amber-600 border border-amber-400/60 text-white text-xs font-bold shadow-md shadow-amber-950/50 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-95"
            title="Open Super Admin Command Center"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Admin Command Center</span>
          </button>
        )}

        {/* Quick Action Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNewMenu(!showNewMenu);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500 shadow-sm shadow-cyan-900/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Transaction</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showNewMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                Initiate Procurement
              </div>
              <button
                onClick={() => {
                  onQuickAction('rfq');
                  setShowNewMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <FileQuestion className="w-4 h-4 text-cyan-400" />
                <span>Create New RFQ / Tender</span>
              </button>
              <button
                onClick={() => {
                  onQuickAction('po');
                  setShowNewMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Issue Purchase Order (PO)</span>
              </button>
              <button
                onClick={() => {
                  onQuickAction('item');
                  setShowNewMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <Boxes className="w-4 h-4 text-blue-400" />
                <span>Catalog New Item / SKU</span>
              </button>
              <button
                onClick={() => {
                  onQuickAction('quote');
                  setShowNewMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-rose-400" />
                <span>Upload Supplier Quote (PDF)</span>
              </button>
              <button
                onClick={() => {
                  onQuickAction('delivery');
                  setShowNewMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <Truck className="w-4 h-4 text-amber-400" />
                <span>Log Goods Receipt (GRN)</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
              setShowNewMenu(false);
            }}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">System Notifications</span>
                <span className="text-[10px] text-cyan-400 font-medium">
                  {notifications.length > 0 ? `${notifications.length} unread` : '0 unread'}
                </span>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-800/40 transition-colors cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        {n.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.description}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Simulated Role & User Selector */}
        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowNewMenu(false);
            }}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">
              {currentUser?.name?.charAt(0) ?? '?'}
            </div>
            <div className="hidden md:block min-w-0 pr-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentUser?.name}</p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-cyan-400 font-medium truncate">{activeRole}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2 z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-base shrink-0">
                    {currentUser?.name?.charAt(0) ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-100 truncate">{currentUser?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                      <span>{activeRole} · {currentUser?.entity}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session info */}
              <div className="px-4 py-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                  Session active · Expires in 8h · Auto-logout after 30 min idle
                </div>
              </div>

              {/* Super Admin Control Panel Link */}
              {activeRole === 'Super Admin' ? (
                <div className="px-2 py-1.5 border-b border-slate-800">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowAdminControlPanel(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 font-bold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>Admin Control Panel</span>
                  </button>
                </div>
              ) : (
                <div className="px-2 py-1.5 border-b border-slate-800">
                  <button
                    onClick={async () => {
                      setShowProfileMenu(false);
                      await elevateToSuperAdmin();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 font-bold transition-colors cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>⚡ Elevate to Super Admin</span>
                  </button>
                </div>
              )}

              {/* Logout */}
              <div className="px-2 pt-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Super Admin Control Panel Modal */}
      {showAdminControlPanel && (
        <AdminControlPanelModal
          isOpen={showAdminControlPanel}
          onClose={() => setShowAdminControlPanel(false)}
        />
      )}
    </header>
  );
};

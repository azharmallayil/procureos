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
  User,
  Eye,
  Sliders,
  Sun,
  Moon,
  Palette,
  Sparkles,
  Check,
} from 'lucide-react';
import { CompanySwitcher } from './CompanySwitcher';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { AdminControlPanelModal } from '../admin/AdminControlPanelModal';
import { ModuleId, UserRole, ALL_USER_ROLES, ThemeStyle, ThemeMode } from '../../types/procurement';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

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
  const {
    currentUser,
    activeRole,
    permissions,
    canAccessModule,
    isSimulatingRole,
    resetSimulatedRole,
    setActiveRole,
    logout,
    updateUser,
  } = useAuth();
  const { info, success, error: toastError } = useToast();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showAdminControlPanel, setShowAdminControlPanel] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const {
    themeStyle,
    themeMode,
    setThemeStyle,
    setThemeMode,
    toggleThemeMode,
  } = useTheme();

  const isSuperAdmin =
    currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Managing Director / CEO' ||
    currentUser?.email === 'admin@procureos.com' ||
    activeRole === 'Super Admin';

  const isAdmin =
    activeRole === 'Super Admin' ||
    activeRole === 'Managing Director / CEO' ||
    activeRole === 'General Manager (GM)' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Managing Director / CEO' ||
    currentUser?.role === 'General Manager (GM)' ||
    currentUser?.email === 'admin@procureos.com';

  // Edit Profile Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profileDept, setProfileDept] = useState(currentUser?.department || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  React.useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
      setProfileDept(currentUser.department || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileError('');
    setIsSavingProfile(true);
    const res = await updateUser(
      currentUser.id,
      {
        name: profileName.trim(),
        email: profileEmail.trim().toLowerCase(),
        department: profileDept.trim(),
      },
      profilePassword.trim() ? profilePassword.trim() : undefined
    );
    setIsSavingProfile(false);
    if (res.ok) {
      success('Profile Updated', 'Your profile details have been successfully saved.');
      setShowEditProfileModal(false);
      setProfilePassword('');
    } else {
      setProfileError(res.error || 'Failed to update profile.');
      toastError('Update Failed', res.error || 'Failed to modify profile.');
    }
  };

  const notifications: any[] = [];

  return (
    <header className="h-16 bg-topbar backdrop-blur-md border-b border-slate-800/90 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
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
        {/* Active Role Simulation Indicator (When Super Admin tests a role perspective) */}
        {isSimulatingRole && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-semibold shadow-sm">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Previewing: <strong>{activeRole}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                resetSimulatedRole();
                success('Reset to Super Admin', 'Full administrative authority restored.');
              }}
              className="ml-1 text-[11px] text-amber-300 hover:text-white underline font-bold cursor-pointer"
              title="Return to Super Admin perspective"
            >
              ✕ Exit
            </button>
          </div>
        )}

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

        {/* Quick Action Dropdown (Filtered by Role Permissions & Module Clearance) */}
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
              {canAccessModule('rfqs') && permissions?.canCreateRFQ && (
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
              )}
              {canAccessModule('purchaseOrders') && (
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
              )}
              {canAccessModule('items') && (
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
              )}
              {canAccessModule('quotations') && (
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
              )}
              {canAccessModule('deliveries') && permissions?.canReceiveShipment && (
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
              )}
            </div>
          )}
        </div>

        {/* ── Theme Selector & Atmosphere Menu ── */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowThemeMenu(!showThemeMenu);
              setShowProfileMenu(false);
              setShowNotifications(false);
              setShowNewMenu(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700/80 hover:border-slate-600 bg-slate-900/80 text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
            title="Change Theme & Workspace Style"
          >
            <Palette className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline font-medium capitalize">
              {themeStyle === 'glass' ? 'Glass' : themeStyle === 'clean' ? 'Clean' : 'Default'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" />
                    Workspace Theme
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Saved to {currentUser?.name?.split(' ')[0] || 'your'} profile
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  {themeMode === 'dark' ? 'Dark' : 'White'}
                </span>
              </div>

              {/* Mode Toggle Switch (White / Dark button) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  White / Dark Appearance
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('dark');
                      success('Dark Mode Active', 'Contrast set to dark mode.');
                    }}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dark Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode('light');
                      success('White Mode Active', 'Switched to clean white light mode.');
                    }}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>White Mode</span>
                  </button>
                </div>
              </div>

              {/* Theme Selection Cards */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Visual Atmosphere
                </label>
                <div className="space-y-1.5">
                  {/* Default Theme */}
                  <button
                    type="button"
                    onClick={() => {
                      setThemeStyle('default');
                      success('Default Theme Applied', 'Industrial high-contrast interface restored.');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      themeStyle === 'default'
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">Default Theme</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          Standard
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Current signature high-contrast industrial enterprise palette.
                      </p>
                    </div>
                    {themeStyle === 'default' && (
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                  </button>

                  {/* Glassmorphism Theme */}
                  <button
                    type="button"
                    onClick={() => {
                      setThemeStyle('glass');
                      success('Glassmorphism Applied', 'Industrial frosted glass with low eye effort active.');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      themeStyle === 'glass'
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          Glassmorphism
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
                          Low Eye Effort
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Frosted glass panels, floating translucent depth, less eye effort.
                      </p>
                    </div>
                    {themeStyle === 'glass' && (
                      <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    )}
                  </button>

                  {/* Clean Theme */}
                  <button
                    type="button"
                    onClick={() => {
                      setThemeStyle('clean');
                      success('Clean Theme Applied', 'Most clean and eye-efficient theme active.');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      themeStyle === 'clean'
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">Clean Theme</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                          Most Eye Efficient
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Zero glare, ergonomic distraction-free surfaces for dense data tables.
                      </p>
                    </div>
                    {themeStyle === 'clean' && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Quick White / Dark Button (Direct 1-Click Toggle) ── */}
        <button
          type="button"
          onClick={() => {
            toggleThemeMode();
            const nextMode = themeMode === 'dark' ? 'White' : 'Dark';
            success(`Switched to ${nextMode} Mode`, `Theme appearance updated for ${currentUser?.name || 'user'}.`);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 ${
            themeMode === 'light'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:border-amber-400'
              : 'bg-slate-900/80 text-slate-200 border-slate-700/80 hover:border-slate-600'
          }`}
          title={`Switch to ${themeMode === 'dark' ? 'White (Light)' : 'Dark'} Mode`}
          aria-label={`Switch to ${themeMode === 'dark' ? 'White (Light)' : 'Dark'} Mode`}
        >
          {themeMode === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">White Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
              setShowNewMenu(false);
              setShowThemeMenu(false);
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
              setShowThemeMenu(false);
            }}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">
              {currentUser?.name?.charAt(0) ?? '?'}
            </div>
            <div className="hidden md:block min-w-0 pr-1">
              <p className="text-xs font-semibold text-slate-200 truncate" title={currentUser?.name}>{currentUser?.name}</p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-cyan-400 font-medium truncate" title={activeRole || undefined}>{activeRole}</span>
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

              {/* Edit My Profile Button */}
              <div className="px-2 py-1.5 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setProfileError('');
                    setProfilePassword('');
                    setShowEditProfileModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-200 hover:text-cyan-300 hover:bg-slate-800/60 font-semibold transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>Edit My Profile</span>
                </button>
              </div>

              {/* Super Admin Command Center Link */}
              {isAdmin && (
                <div className="px-2 py-1.5 border-b border-slate-800">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onNavigateModule) {
                        onNavigateModule('admin');
                      } else {
                        setShowAdminControlPanel(true);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 font-bold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>Admin Command Center</span>
                  </button>
                </div>
              )}

              {/* Role Perspective Switcher (Exclusive to Super Admin) */}
              {isSuperAdmin && (
                <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-950/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-amber-400" />
                      Role Perspective
                    </span>
                    {isSimulatingRole && (
                      <button
                        type="button"
                        onClick={() => {
                          resetSimulatedRole();
                          success('Reset to Super Admin', 'Full administrative control restored.');
                        }}
                        className="text-[10px] text-amber-300 hover:text-white underline font-semibold cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <select
                    value={activeRole || 'Super Admin'}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setActiveRole(newRole);
                      success('Perspective Updated', `Now viewing platform as ${newRole}.`);
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {ALL_USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Filter sidebar & modules to experience role clearances
                  </p>
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

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <Modal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          title="Edit My Profile"
          maxWidth="md"
        >
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{profileError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Corporate Email</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={profileDept}
                onChange={(e) => setProfileDept(e.target.value)}
                placeholder="e.g. Executive Administration"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Change Password (leave empty to keep current)</label>
              <input
                type="password"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Workspace Theme Preference */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Theme & Visual Atmosphere
                </label>
                <button
                  type="button"
                  onClick={toggleThemeMode}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  {themeMode === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{themeMode === 'dark' ? 'Switch to White Mode' : 'Switch to Dark Mode'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setThemeStyle('default')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium cursor-pointer transition-all ${
                    themeStyle === 'default'
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-100 flex items-center gap-1">
                    <span>Default</span>
                    {themeStyle === 'default' && <Check className="w-3 h-3 text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Industrial</div>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeStyle('glass')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium cursor-pointer transition-all ${
                    themeStyle === 'glass'
                      ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-100 flex items-center gap-1">
                    <span>Glass</span>
                    {themeStyle === 'glass' && <Check className="w-3 h-3 text-purple-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Low Eye Effort</div>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeStyle('clean')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium cursor-pointer transition-all ${
                    themeStyle === 'clean'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-slate-100 flex items-center gap-1">
                    <span>Clean</span>
                    {themeStyle === 'clean' && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Eye Efficient</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowEditProfileModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

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

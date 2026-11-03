import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  Sliders,
  RotateCcw,
  Save,
  Search,
  AlertTriangle,
  UserCheck,
  Sparkles,
  Check,
  Info,
  LockKeyhole,
  Unlock,
  ChevronRight,
  Filter,
  Grid,
  List,
  Eye,
  Zap,
} from 'lucide-react';
import { UserRole, UserProfile, PermissionMatrix } from '../../types/procurement';
import { useAuth, ROLE_PERMISSIONS } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export interface PermissionDefinition {
  key: keyof PermissionMatrix;
  name: string;
  category: 'Purchasing & RFQs' | 'Approvals & Financial' | 'Inventory & Logistics' | 'Governance & Auditing';
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'canCreateRFQ',
    name: 'Issue RFQ & Competitive Tenders',
    category: 'Purchasing & RFQs',
    description: 'Draft, publish, and transmit RFQs and BOQs to qualified suppliers.',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'canEditQuotePrice',
    name: 'Commercial Quote Price Adjustments',
    category: 'Purchasing & RFQs',
    description: 'Adjust supplier unit prices, apply commercial discounts, and edit negotiated line items.',
    riskLevel: 'HIGH',
  },
  {
    key: 'canAwardBid',
    name: 'Commercial Tender Award Authority',
    category: 'Purchasing & RFQs',
    description: 'Authorize winning quotation and trigger purchase order generation.',
    riskLevel: 'HIGH',
  },
  {
    key: 'canDeleteQuotation',
    name: 'Delete Supplier Quotations & PDFs',
    category: 'Purchasing & RFQs',
    description: 'Permanently remove supplier quotation records, extracted line items, and uploaded PDF documents.',
    riskLevel: 'HIGH',
  },
  {
    key: 'canDeleteRFQ',
    name: 'Delete Parent RFQ / Tender',
    category: 'Purchasing & RFQs',
    description: 'Permanently delete an RFQ package along with all subordinate supplier quotations and attachments.',
    riskLevel: 'CRITICAL',
  },
  {
    key: 'canApprovePO',
    name: 'Standard Purchase Order Approval (< 1M SAR)',
    category: 'Approvals & Financial',
    description: 'Authorize and sign off operational purchase orders below SAR 1,000,000 threshold.',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'canApproveHighValuePO',
    name: 'High-Value Purchase Order Approval (≥ 1M SAR)',
    category: 'Approvals & Financial',
    description: 'Executive authority to sign off major procurement commitments exceeding SAR 1,000,000.',
    riskLevel: 'CRITICAL',
  },
  {
    key: 'canReleasePayment',
    name: 'Treasury Wire & SARIE Payment Release',
    category: 'Approvals & Financial',
    description: 'Release bank wires, advance payments, and commercial settlements to vendors.',
    riskLevel: 'CRITICAL',
  },
  {
    key: 'canReceiveShipment',
    name: 'Site Material Acceptance (GRN Sign-off)',
    category: 'Inventory & Logistics',
    description: 'Inspect delivered items, verify packing slips, log inspection notes, and issue Goods Receipt Notes.',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'canManageVendors',
    name: 'Vendor Master Onboarding & Governance',
    category: 'Governance & Auditing',
    description: 'Register new suppliers, modify bank details, manage compliance certifications and qualification status.',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'canAuditLogs',
    name: 'Audit Ledger & Compliance Inspection',
    category: 'Governance & Auditing',
    description: 'Inspect cryptographically hashed immutable activity ledgers and export compliance reports.',
    riskLevel: 'LOW',
  },
];

interface UserPrivilegesEditorProps {
  isSuperAdmin?: boolean;
  initialUserId?: string;
}

export const UserPrivilegesEditor: React.FC<UserPrivilegesEditorProps> = ({
  isSuperAdmin: propIsSuperAdmin,
  initialUserId,
}) => {
  const {
    currentUser,
    activeRole,
    availableUsers,
    updateUserPermissions,
    elevateToSuperAdmin,
  } = useAuth();
  const { success, error: toastError, info } = useToast();

  const isSuperAdmin =
    propIsSuperAdmin ?? (activeRole === 'Super Admin' || currentUser?.role === 'Super Admin');

  // Mode: 'grid' (All users in interactive matrix) | 'detail' (Single user inspector) | 'roles' (Role baseline)
  const [viewMode, setViewMode] = useState<'grid' | 'detail' | 'roles'>('grid');

  // Selected user for Detail mode
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return (
      initialUserId ||
      availableUsers.find((u) => u.role !== 'Super Admin')?.id ||
      availableUsers[0]?.id ||
      ''
    );
  });

  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
      setViewMode('detail');
    }
  }, [initialUserId]);

  // Search & filter
  const [userQuery, setUserQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isElevating, setIsElevating] = useState(false);
  const [togglingCell, setTogglingCell] = useState<string | null>(null);

  // Find the selected user object for detail view
  const selectedUser = useMemo(() => {
    return availableUsers.find((u) => u.id === selectedUserId) || availableUsers[0] || null;
  }, [availableUsers, selectedUserId]);

  // Compute default baseline permissions for selected user's role
  const roleDefaults = useMemo<PermissionMatrix>(() => {
    if (!selectedUser) {
      return ROLE_PERMISSIONS['Super Admin'];
    }
    return ROLE_PERMISSIONS[selectedUser.role] || ROLE_PERMISSIONS['Purchasing Specialist'];
  }, [selectedUser]);

  // Selected user's effective permissions
  const selectedEffectivePermissions = useMemo<PermissionMatrix>(() => {
    if (!selectedUser) return ROLE_PERMISSIONS['Super Admin'];
    const base = ROLE_PERMISSIONS[selectedUser.role] || ROLE_PERMISSIONS['Purchasing Specialist'];
    return {
      ...base,
      ...(selectedUser.customPermissions || {}),
    };
  }, [selectedUser]);

  // Check if current user has custom overrides
  const selectedHasCustomOverrides = useMemo(() => {
    if (!selectedUser) return false;
    const base = ROLE_PERMISSIONS[selectedUser.role];
    return PERMISSION_DEFINITIONS.some(
      (p) => selectedEffectivePermissions[p.key] !== base[p.key]
    );
  }, [selectedEffectivePermissions, selectedUser]);

  // Quick Elevate Handler for non-Super Admins
  const handleElevate = async () => {
    setIsElevating(true);
    try {
      await elevateToSuperAdmin();
      success(
        'Super Admin Clearance Granted',
        'You now have full authority to modify and enforce user privileges.'
      );
    } catch (err: any) {
      toastError('Elevation Failed', err?.message || 'Could not elevate account.');
    } finally {
      setIsElevating(false);
    }
  };

  // ── TOGGLE & AUTO-SAVE (Used in both Grid & Detail views) ────────────────
  const handleToggleAndAutoSave = async (userId: string, key: keyof PermissionMatrix) => {
    if (!isSuperAdmin) {
      toastError(
        'Super Admin Required',
        'Only Super Admin can modify privileges. Click the "Elevate to Super Admin" button to activate clearance.'
      );
      return;
    }

    const targetUser = availableUsers.find((u) => u.id === userId);
    if (!targetUser) return;

    const base = ROLE_PERMISSIONS[targetUser.role] || ROLE_PERMISSIONS['Purchasing Specialist'];
    const currentEffective: PermissionMatrix = {
      ...base,
      ...(targetUser.customPermissions || {}),
    };

    const nextValue = !currentEffective[key];
    const newEffective: PermissionMatrix = {
      ...currentEffective,
      [key]: nextValue,
    };

    // Determine if new state differs from role defaults
    const hasDeviations = PERMISSION_DEFINITIONS.some(
      (p) => newEffective[p.key] !== base[p.key]
    );

    const cellKey = `${userId}-${key}`;
    setTogglingCell(cellKey);

    try {
      const result = await updateUserPermissions(
        userId,
        hasDeviations ? newEffective : null
      );

      if (result.ok) {
        success(
          nextValue ? 'Privilege Granted' : 'Privilege Revoked',
          `${targetUser.name}: '${key}' is now ${nextValue ? 'ENABLED' : 'DISABLED'}. Saved live.`
        );
      } else {
        toastError('Update Failed', result.error || 'Could not update privilege.');
      }
    } catch (err: any) {
      toastError('Error', err?.message || 'Failed to update privilege.');
    } finally {
      setTogglingCell(null);
    }
  };

  // Reset a user to role baseline
  const handleResetUser = async (userId: string) => {
    if (!isSuperAdmin) {
      toastError('Access Denied', 'Only Super Admin can reset privileges.');
      return;
    }
    const targetUser = availableUsers.find((u) => u.id === userId);
    if (!targetUser) return;

    try {
      const result = await updateUserPermissions(userId, null);
      if (result.ok) {
        info(
          'Privileges Restored',
          `Permissions for ${targetUser.name} have been restored to ${targetUser.role} default standard.`
        );
      } else {
        toastError('Reset Failed', result.error || 'Failed to reset privileges.');
      }
    } catch (err: any) {
      toastError('Error', err?.message || 'Unexpected error.');
    }
  };

  // Quick Preset Actions for selected user in detail mode
  const handleSetPreset = async (type: 'all' | 'none') => {
    if (!isSuperAdmin || !selectedUser) return;
    const value = type === 'all';
    const updated: PermissionMatrix = {
      canApprovePO: value,
      canApproveHighValuePO: value,
      canCreateRFQ: value,
      canAwardBid: value,
      canReleasePayment: value,
      canAuditLogs: value,
      canManageVendors: value,
      canReceiveShipment: value,
      canEditQuotePrice: value,
      canDeleteQuotation: value,
      canDeleteRFQ: value,
    };

    const result = await updateUserPermissions(selectedUser.id, updated);
    if (result.ok) {
      success(
        type === 'all' ? 'All Privileges Granted' : 'All Privileges Revoked',
        `${selectedUser.name} now has ${type === 'all' ? 'FULL' : 'NO'} operational clearances.`
      );
    }
  };

  // Filtered permission items
  const filteredPermissions = useMemo(() => {
    return PERMISSION_DEFINITIONS.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter]);

  // Filtered users for selector / grid columns
  const filteredUsers = useMemo(() => {
    if (!userQuery.trim()) return availableUsers;
    const q = userQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
    );
  }, [availableUsers, userQuery]);

  return (
    <div className="space-y-6">
      {/* ── SECURITY GOVERNANCE & ELEVATION BANNER ──────────────────────────── */}
      {isSuperAdmin ? (
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-purple-950/20 to-slate-900/60 text-xs leading-relaxed flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-200 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-white text-sm">
                  Super Admin Privilege Authorization Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Active Clearance
                </span>
              </div>
              <p className="text-slate-300 text-xs">
                Click any cell in the <strong>Interactive Matrix</strong> below or open the <strong>User Inspector</strong> to toggle operational permissions. All changes <strong>auto-save instantly</strong>, replicate live across browser sessions, and are permanently sealed into the audit log.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Auto-Save Active
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 text-xs leading-relaxed flex flex-col md:flex-row md:items-center justify-between gap-4 text-rose-200 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0 mt-0.5">
              <LockKeyhole className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-white text-sm">
                  Super Admin Authorization Required to Edit Privileges
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                  Currently: {currentUser?.role || 'Guest'}
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                You are viewing the Privilege Matrix in audit mode as <strong>{currentUser?.name || 'Authorized User'}</strong>. Per enterprise security guidelines, individual privilege customization requires <strong>Super Admin</strong> clearance. Click below to activate Super Admin clearance immediately.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleElevate}
              disabled={isElevating}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/60 cursor-pointer transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-white" />
              <span>{isElevating ? 'Elevating Account…' : '⚡ Elevate to Super Admin (1-Click)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW SWITCHER BAR ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Interactive Matrix Grid (All Users)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('detail')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'detail'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Single User Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('roles')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'roles'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Standard Role Baselines</span>
          </button>
        </div>

        {/* Filter / Search input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search user or capability…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48 sm:w-56"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Purchasing & RFQs">Purchasing & RFQs</option>
            <option value="Approvals & Financial">Approvals & Financial</option>
            <option value="Inventory & Logistics">Inventory & Logistics</option>
            <option value="Governance & Auditing">Governance & Auditing</option>
          </select>
        </div>
      </div>

      {/* ── VIEW 1: INTERACTIVE MATRIX GRID (ALL USERS SIDE-BY-SIDE) ───────── */}
      {viewMode === 'grid' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Grid className="w-4 h-4 text-amber-400" />
                Live User Privileges Matrix (Interactive Grid)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSuperAdmin
                  ? 'Click any cell directly to toggle that user\'s operational clearance. Changes auto-save instantly.'
                  : 'Displaying active user clearances. Elevate to Super Admin to modify cells.'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-[9px] text-emerald-300">
                  ✓
                </span>
                Granted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] text-slate-500">
                  ✕
                </span>
                Restricted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                Custom Override
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[700px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900/95 sticky top-0 z-20 backdrop-blur-md text-[11px] text-slate-300 border-b border-slate-800 shadow-sm">
                <tr>
                  <th className="py-3 px-4 font-bold min-w-[240px] sticky left-0 bg-slate-900/95 z-30 border-r border-slate-800">
                    Operational Capability
                  </th>
                  {filteredUsers.map((u) => {
                    const isSuper = u.role === 'Super Admin';
                    const hasCustom = Boolean(u.customPermissions);
                    return (
                      <th
                        key={u.id}
                        className="py-3 px-3 text-center min-w-[130px] font-semibold border-r border-slate-800/60"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-100 truncate max-w-[110px]" title={u.name}>
                              {u.name.split(' ')[0]}
                            </span>
                            {hasCustom && (
                              <span
                                className="w-2 h-2 rounded-full bg-purple-400 shrink-0"
                                title="Custom privileges active"
                              />
                            )}
                          </div>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded truncate max-w-[115px] ${
                              isSuper
                                ? 'bg-amber-950 text-amber-300 font-bold border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPermissions.map((def) => (
                  <tr key={def.key} className="hover:bg-slate-900/40 transition-colors">
                    {/* Capability Name & Category */}
                    <td className="py-3 px-4 sticky left-0 bg-slate-950/90 z-10 border-r border-slate-800 backdrop-blur-sm">
                      <div className="font-semibold text-slate-200 text-xs">{def.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500">{def.category}</span>
                        <span
                          className={`text-[9px] px-1 rounded font-bold uppercase ${
                            def.riskLevel === 'CRITICAL'
                              ? 'text-rose-400 bg-rose-950/60'
                              : def.riskLevel === 'HIGH'
                              ? 'text-amber-400 bg-amber-950/60'
                              : 'text-slate-400 bg-slate-800/60'
                          }`}
                        >
                          {def.riskLevel}
                        </span>
                      </div>
                    </td>

                    {/* Each User's Cell */}
                    {filteredUsers.map((u) => {
                      const base = ROLE_PERMISSIONS[u.role] || ROLE_PERMISSIONS['Purchasing Specialist'];
                      const isOverridden =
                        u.customPermissions &&
                        u.customPermissions[def.key] !== undefined &&
                        u.customPermissions[def.key] !== base[def.key];
                      const isGranted =
                        u.customPermissions && u.customPermissions[def.key] !== undefined
                          ? Boolean(u.customPermissions[def.key])
                          : Boolean(base[def.key]);

                      const cellKey = `${u.id}-${def.key}`;
                      const isBusy = togglingCell === cellKey;

                      return (
                        <td
                          key={u.id}
                          className="py-2.5 px-3 text-center border-r border-slate-800/40 whitespace-nowrap"
                        >
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleToggleAndAutoSave(u.id, def.key)}
                              disabled={isBusy}
                              className={`group relative inline-flex items-center justify-center px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                isGranted
                                  ? isOverridden
                                    ? 'bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border-purple-500/50 shadow-sm'
                                    : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 border-emerald-500/30'
                                  : isOverridden
                                  ? 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border-rose-700/40'
                                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-600 border-slate-800'
                              }`}
                              title={`${u.name}: Click to ${isGranted ? 'REVOKE' : 'GRANT'} ${def.name}`}
                            >
                              {isBusy ? (
                                <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              ) : isGranted ? (
                                <span className="inline-flex items-center gap-1 font-bold text-[11px]">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isOverridden ? 'Custom' : 'Yes'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px]">
                                  <span className="text-slate-600">—</span>
                                  <span>{isOverridden ? 'Denied' : 'No'}</span>
                                </span>
                              )}
                            </button>
                          ) : (
                            <div
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-xl border ${
                                isGranted
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-900 text-slate-600 border-slate-800'
                              }`}
                              title={isGranted ? 'Authority Granted' : 'Authority Restricted'}
                            >
                              {isGranted ? <Check className="w-3.5 h-3.5" /> : <span>—</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 2: SINGLE USER INSPECTOR ──────────────────────────────────── */}
      {viewMode === 'detail' && (
        <div className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-5 shadow-xl space-y-5">
          {/* User selector & actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white tracking-wide">
                  User-Specific Privilege Inspector
                </h4>
                {selectedUser?.customPermissions && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                    Custom Overrides Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Choose a user below to inspect all 11 capabilities, descriptions, and risk levels.
              </p>
            </div>

            {/* Presets */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetPreset('all')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  title="Grant all capabilities to this user"
                >
                  <Check className="w-3.5 h-3.5" />
                  Grant All
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('none')}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-800/50 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  title="Revoke all capabilities from this user"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Revoke All
                </button>
                {selectedHasCustomOverrides && (
                  <button
                    type="button"
                    onClick={() => handleResetUser(selectedUser.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    title="Restore this user back to standard role baseline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Role Default
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Tabs / Quick Pill Picker */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Select Target Team Member
            </label>
            <div className="flex flex-wrap gap-2">
              {availableUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                const hasCustom = Boolean(u.customPermissions);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-amber-400">
                      {u.name.charAt(0)}
                    </div>
                    <span>{u.name}</span>
                    <span className="text-[10px] text-slate-400">({u.role})</span>
                    {hasCustom && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected User Info Bar */}
          {selectedUser && (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-300">
                  {selectedUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{selectedUser.name}</span>
                    <span className="text-slate-400">({selectedUser.email})</span>
                    <Badge variant="blue">{selectedUser.role}</Badge>
                    <span className="text-[11px] text-slate-400">{selectedUser.department}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Operational Status:{' '}
                    {selectedHasCustomOverrides ? (
                      <span className="text-purple-400 font-semibold">Customized Overrides Active</span>
                    ) : (
                      <span className="text-slate-300">Standard Role Baseline Applied</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-emerald-400 font-medium">
                Instant Auto-Save Enabled
              </div>
            </div>
          )}

          {/* Individual Permission Cards List */}
          <div className="space-y-2">
            {filteredPermissions.map((def) => {
              const isEnabled = Boolean(selectedEffectivePermissions[def.key]);
              const roleDefaultValue = Boolean(roleDefaults[def.key]);
              const isOverridden = isEnabled !== roleDefaultValue;
              const cellKey = `${selectedUser?.id}-${def.key}`;
              const isBusy = togglingCell === cellKey;

              return (
                <div
                  key={def.key}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    isEnabled
                      ? isOverridden
                        ? 'bg-purple-950/20 border-purple-500/40 hover:border-purple-500/60'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                      : isOverridden
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-slate-950/50 border-slate-900 opacity-75'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-200 text-xs">{def.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        {def.category}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          def.riskLevel === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                            : def.riskLevel === 'HIGH'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {def.riskLevel} Risk
                      </span>
                      {isOverridden && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {isEnabled ? 'Explicitly Granted' : 'Explicitly Revoked'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{def.description}</p>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>
                        Role Baseline for {selectedUser?.role}:{' '}
                        <strong className={roleDefaultValue ? 'text-slate-300' : 'text-slate-500'}>
                          {roleDefaultValue ? 'Enabled by default' : 'Disabled by default'}
                        </strong>
                      </span>
                      <span>•</span>
                      <code className="text-slate-500 font-mono text-[9px]">{def.key}</code>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="shrink-0 flex items-center gap-3">
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleToggleAndAutoSave(selectedUser.id, def.key)}
                        disabled={isBusy}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                          isEnabled
                            ? isOverridden
                              ? 'bg-purple-600'
                              : 'bg-emerald-600'
                            : 'bg-slate-800'
                        }`}
                        title={isEnabled ? 'Click to revoke privilege' : 'Click to grant privilege'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    ) : (
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          isEnabled
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {isEnabled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Granted</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-500" />
                            <span>Restricted</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 3: STANDARD ROLE BASELINES REFERENCE ──────────────────────── */}
      {viewMode === 'roles' && (
        <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden shadow-inner">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                System-Wide Standard Role Baseline Reference (RBAC)
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              All 7 Canonical Enterprise Roles
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold min-w-[220px]">Enterprise Capability</th>
                  <th className="py-3 px-3 text-center text-amber-300 font-bold">Super Admin</th>
                  <th className="py-3 px-3 text-center">Procurement Dir</th>
                  <th className="py-3 px-3 text-center">Procurement Eng</th>
                  <th className="py-3 px-3 text-center">Purchasing Spec</th>
                  <th className="py-3 px-3 text-center">Site Officer</th>
                  <th className="py-3 px-3 text-center">Finance Dir</th>
                  <th className="py-3 px-3 text-center">Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[
                  {
                    name: 'User Provisioning & Password Resets',
                    desc: 'Create, edit, delete users and set credentials',
                    sa: true,
                    pd: false,
                    pe: false,
                    ps: false,
                    so: false,
                    fc: false,
                    ia: false,
                  },
                  {
                    name: 'Disaster Recovery (Backup & Restore)',
                    desc: 'Full database snapshot import and export',
                    sa: true,
                    pd: false,
                    pe: false,
                    ps: false,
                    so: false,
                    fc: false,
                    ia: false,
                  },
                  {
                    name: 'RFQ & Competitive Tender Issuance',
                    desc: 'Draft and transmit RFQs to suppliers',
                    sa: true,
                    pd: true,
                    pe: true,
                    ps: true,
                    so: false,
                    fc: false,
                    ia: false,
                  },
                  {
                    name: 'Commercial Quote Price Adjustments',
                    desc: 'Edit quotation prices & negotiated terms',
                    sa: true,
                    pd: true,
                    pe: true,
                    ps: true,
                    so: false,
                    fc: true,
                    ia: false,
                  },
                  {
                    name: 'Delete Supplier Quotations & PDFs',
                    desc: 'Permanently remove quotation records & PDFs',
                    sa: true,
                    pd: true,
                    pe: true,
                    ps: true,
                    so: false,
                    fc: false,
                    ia: false,
                  },
                  {
                    name: 'Delete Parent RFQ / Tender',
                    desc: 'Cascade deletion of RFQ & all bids',
                    sa: true,
                    pd: true,
                    pe: true,
                    ps: false,
                    so: false,
                    fc: false,
                    ia: false,
                  },
                  {
                    name: 'Commercial Tender Award Authority',
                    desc: 'Authorize winning quotation for PO generation',
                    sa: true,
                    pd: true,
                    pe: false,
                    ps: false,
                    so: false,
                    fc: false,
                    ia: false,
                  },
                  {
                    name: 'Purchase Order Approval (< 1M SAR)',
                    desc: 'Sign off operational purchase orders',
                    sa: true,
                    pd: true,
                    pe: false,
                    ps: false,
                    so: false,
                    fc: true,
                    ia: false,
                  },
                  {
                    name: 'High-Value PO Approval (≥ 1M SAR)',
                    desc: 'Executive authorization for major commitments',
                    sa: true,
                    pd: true,
                    pe: false,
                    ps: false,
                    so: false,
                    fc: true,
                    ia: false,
                  },
                  {
                    name: 'Site Material Acceptance (GRN Sign-off)',
                    desc: 'Material physical inspection & receiving sign-off',
                    sa: true,
                    pd: false,
                    pe: false,
                    ps: false,
                    so: true,
                    fc: false,
                    ia: false,
                  },
                  {
                    name: 'Treasury Wire Payment Disbursement',
                    desc: 'SARIE bank wires and vendor disbursements',
                    sa: true,
                    pd: false,
                    pe: false,
                    ps: false,
                    so: false,
                    fc: true,
                    ia: false,
                  },
                  {
                    name: 'Immutable Audit Ledger Inspection',
                    desc: 'Read-only access to transaction history',
                    sa: true,
                    pd: true,
                    pe: false,
                    ps: false,
                    so: false,
                    fc: true,
                    ia: true,
                  },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div>{row.name}</div>
                      <div className="text-[10px] text-slate-500">{row.desc}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold bg-amber-500/5">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.pd ? (
                        <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.pe ? (
                        <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.ps ? (
                        <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.so ? (
                        <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.fc ? (
                        <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.ia ? (
                        <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

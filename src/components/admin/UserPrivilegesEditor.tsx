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
  const { currentUser, activeRole, availableUsers, updateUserPermissions } = useAuth();
  const { success, error: toastError, info } = useToast();

  const isSuperAdmin = propIsSuperAdmin ?? (activeRole === 'Super Admin' || currentUser?.role === 'Super Admin');

  // Selected user
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return initialUserId || currentUser?.id || availableUsers[0]?.id || '';
  });

  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
    }
  }, [initialUserId]);

  // Search filter for user dropdown / list
  const [userQuery, setUserQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Working permissions state for the currently selected user
  const [workingPermissions, setWorkingPermissions] = useState<PermissionMatrix | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Find the selected user object
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

  // Initialize working permissions whenever selected user changes
  useEffect(() => {
    if (selectedUser) {
      const base = ROLE_PERMISSIONS[selectedUser.role] || ROLE_PERMISSIONS['Purchasing Specialist'];
      if (selectedUser.customPermissions) {
        setWorkingPermissions({
          ...base,
          ...selectedUser.customPermissions,
        });
      } else {
        setWorkingPermissions({ ...base });
      }
    }
  }, [selectedUser]);

  // Check if current user has custom overrides active in working state
  const hasCustomOverrides = useMemo(() => {
    if (!workingPermissions || !selectedUser) return false;
    const base = ROLE_PERMISSIONS[selectedUser.role];
    return PERMISSION_DEFINITIONS.some((p) => workingPermissions[p.key] !== base[p.key]);
  }, [workingPermissions, selectedUser]);

  // Check if there are unsaved changes compared to selected user's stored state
  const hasUnsavedChanges = useMemo(() => {
    if (!workingPermissions || !selectedUser) return false;
    const currentActive: PermissionMatrix = {
      ...ROLE_PERMISSIONS[selectedUser.role],
      ...(selectedUser.customPermissions || {}),
    };
    return PERMISSION_DEFINITIONS.some((p) => workingPermissions[p.key] !== currentActive[p.key]);
  }, [workingPermissions, selectedUser]);

  // Count active permissions
  const activeCount = useMemo(() => {
    if (!workingPermissions) return 0;
    return Object.values(workingPermissions).filter(Boolean).length;
  }, [workingPermissions]);

  // Toggle individual permission
  const handleToggle = (key: keyof PermissionMatrix) => {
    if (!isSuperAdmin) {
      toastError(
        'Access Denied',
        'Only Super Admin is authorized to edit individual user privileges.'
      );
      return;
    }
    if (!workingPermissions) return;

    setWorkingPermissions((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: !prev[key],
      };
    });
  };

  // Save changes
  const handleSave = async () => {
    if (!isSuperAdmin) {
      toastError('Access Denied', 'Only Super Admin can modify privileges.');
      return;
    }
    if (!selectedUser || !workingPermissions) return;

    setIsSaving(true);
    try {
      // Calculate what has actually deviated from role defaults
      const base = ROLE_PERMISSIONS[selectedUser.role];
      const hasDeviations = PERMISSION_DEFINITIONS.some(
        (p) => workingPermissions[p.key] !== base[p.key]
      );

      const result = await updateUserPermissions(
        selectedUser.id,
        hasDeviations ? workingPermissions : null
      );

      if (result.ok) {
        success(
          'Privileges Updated',
          `Granular permissions for ${selectedUser.name} (${selectedUser.role}) have been successfully saved and synchronized.`
        );
      } else {
        toastError('Update Failed', result.error || 'Failed to update privileges.');
      }
    } catch (err: any) {
      toastError('Error', err?.message || 'Unexpected error updating permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Role Defaults
  const handleResetToDefaults = async () => {
    if (!isSuperAdmin) {
      toastError('Access Denied', 'Only Super Admin can reset privileges.');
      return;
    }
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      const result = await updateUserPermissions(selectedUser.id, null);
      if (result.ok) {
        setWorkingPermissions({ ...roleDefaults });
        info(
          'Reset Complete',
          `Permissions for ${selectedUser.name} have been restored to default standard for role: ${selectedUser.role}.`
        );
      } else {
        toastError('Reset Failed', result.error || 'Failed to reset privileges.');
      }
    } catch (err: any) {
      toastError('Error', err?.message || 'Unexpected error.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Preset Actions
  const handleGrantAll = () => {
    if (!isSuperAdmin) return;
    const allTrue: PermissionMatrix = {
      canApprovePO: true,
      canApproveHighValuePO: true,
      canCreateRFQ: true,
      canAwardBid: true,
      canReleasePayment: true,
      canAuditLogs: true,
      canManageVendors: true,
      canReceiveShipment: true,
      canEditQuotePrice: true,
      canDeleteQuotation: true,
      canDeleteRFQ: true,
    };
    setWorkingPermissions(allTrue);
  };

  const handleRevokeAll = () => {
    if (!isSuperAdmin) return;
    const allFalse: PermissionMatrix = {
      canApprovePO: false,
      canApproveHighValuePO: false,
      canCreateRFQ: false,
      canAwardBid: false,
      canReleasePayment: false,
      canAuditLogs: false,
      canManageVendors: false,
      canReceiveShipment: false,
      canEditQuotePrice: false,
      canDeleteQuotation: false,
      canDeleteRFQ: false,
    };
    setWorkingPermissions(allFalse);
  };

  // Filtered permission items
  const filteredPermissions = useMemo(() => {
    return PERMISSION_DEFINITIONS.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter]);

  // Filtered users for selector
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
      {/* ── SECURITY GOVERNANCE BANNER ────────────────────────────────────────── */}
      <div
        className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3.5 transition-all ${
          isSuperAdmin
            ? 'bg-gradient-to-r from-amber-950/40 via-purple-950/20 to-slate-900/60 border-amber-500/40 text-amber-200'
            : 'bg-slate-900/70 border-slate-800 text-slate-300'
        }`}
      >
        <div
          className={`p-2 rounded-xl shrink-0 mt-0.5 ${
            isSuperAdmin
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isSuperAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-sm">
              {isSuperAdmin
                ? 'Super Admin Privilege Authorization Engine'
                : 'Role-Based Access Control (RBAC) Governance'}
            </h3>
            {isSuperAdmin ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Super Admin Authorized
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                <LockKeyhole className="w-3 h-3" />
                Read-Only Inspection Mode
              </span>
            )}
          </div>
          <p className="text-slate-300 text-xs">
            {isSuperAdmin
              ? 'As Super Admin, you can selectively customize and grant or revoke individual operational authorities for any team member, regardless of their role. All changes take immediate effect, persist permanently in the database, and are sealed into the cryptographic audit trail.'
              : 'You are viewing the enterprise privilege matrix in audit mode. Only the Super Admin possesses clearance to customize granular user privileges or override standard role policies.'}
          </p>
        </div>
      </div>

      {/* ── USER SELECTION & PRIVILEGE CUSTOMIZER CARD ───────────────────────── */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-5 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white tracking-wide">
                User-Specific Privilege Customization
              </h4>
              {selectedUser?.customPermissions && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                  Customized Privileges Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Select a team member to inspect their effective authorities and adjust operational clearances.
            </p>
          </div>

          {/* Quick Preset Actions for Super Admin */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGrantAll}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="Grant all 11 capabilities to this user"
              >
                <Check className="w-3.5 h-3.5" />
                Grant All
              </button>
              <button
                type="button"
                onClick={handleRevokeAll}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-800/50 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="Revoke all capabilities from this user"
              >
                <XCircle className="w-3.5 h-3.5" />
                Revoke All
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                disabled={isSaving || !hasCustomOverrides}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Restore this user back to standard role baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Role Default
              </button>
            </div>
          )}
        </div>

        {/* User Picker Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Target User Account
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {availableUsers.map((u) => {
                  const hasCustom = Boolean(u.customPermissions);
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role} ({u.department || u.entity}) {hasCustom ? '★ [Customized]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Category Filter
            </label>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Categories ({PERMISSION_DEFINITIONS.length})</option>
                <option value="Purchasing & RFQs">Purchasing & RFQs</option>
                <option value="Approvals & Financial">Approvals & Financial</option>
                <option value="Inventory & Logistics">Inventory & Logistics</option>
                <option value="Governance & Auditing">Governance & Auditing</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected User Quick Summary Pill Card */}
        {selectedUser && (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-300">
                {selectedUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{selectedUser.name}</span>
                  <span className="text-slate-400 text-[11px]">({selectedUser.email})</span>
                  <Badge variant="blue">{selectedUser.role}</Badge>
                  <span className="text-[10px] text-slate-400">{selectedUser.department}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-400">
                    Active Authorities:{' '}
                    <strong className="text-emerald-400">
                      {activeCount} / {PERMISSION_DEFINITIONS.length}
                    </strong>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[11px] text-slate-400">
                    Configuration:{' '}
                    {hasCustomOverrides ? (
                      <span className="text-purple-400 font-semibold">Customized Overrides</span>
                    ) : (
                      <span className="text-slate-300">Standard Role Baseline</span>
                    )}
                  </span>
                  {hasUnsavedChanges && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        Unsaved Modifications
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button for Super Admin */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="px-4 py-2 text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save User Privileges
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── PERMISSIONS TOGGLES LIST ────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-2">
            <span>Operational Capability & Technical Scope</span>
            <span>Authorization Status</span>
          </div>

          <div className="space-y-2">
            {filteredPermissions.map((def) => {
              const isEnabled = workingPermissions ? Boolean(workingPermissions[def.key]) : false;
              const roleDefaultValue = Boolean(roleDefaults[def.key]);
              const isOverridden = workingPermissions ? workingPermissions[def.key] !== roleDefaultValue : false;

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
                  {/* Left: Capability Info */}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-200 text-xs">{def.name}</span>

                      {/* Category Badge */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        {def.category}
                      </span>

                      {/* Risk Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          def.riskLevel === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                            : def.riskLevel === 'HIGH'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                            : def.riskLevel === 'MEDIUM'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {def.riskLevel} Risk
                      </span>

                      {/* Overridden Pill */}
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

                  {/* Right: Toggle Switch or Status */}
                  <div className="shrink-0 flex items-center gap-3">
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleToggle(def.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                          isEnabled
                            ? isOverridden
                              ? 'bg-purple-600'
                              : 'bg-emerald-600'
                            : 'bg-slate-800'
                        }`}
                        title={
                          isEnabled
                            ? 'Click to revoke this privilege'
                            : 'Click to grant this privilege'
                        }
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

        {/* Bottom Save Reminder */}
        {isSuperAdmin && hasUnsavedChanges && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                You have unsaved privilege modifications for <strong>{selectedUser?.name}</strong>. Remember to click <strong>Save User Privileges</strong> to enforce changes.
              </span>
            </div>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              className="px-4 py-1.5 text-xs whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* ── SYSTEM-WIDE RBAC MATRIX REFERENCE TABLE ───────────────────────── */}
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
    </div>
  );
};

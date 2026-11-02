import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  Database,
  UserPlus,
  Pencil,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  KeyRound,
  FileCheck2,
  History,
  Sparkles,
} from 'lucide-react';
import { UserRole, UserProfile, EntityId } from '../../../types/procurement';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import {
  downloadBackupFile,
  restoreFullBackup,
  getAuditLogs,
  AuditLogEntry,
  EnterpriseBackupPayload,
} from '../../../lib/liveSync';
import { MOCK_ITEMS, MOCK_VENDORS, MOCK_RFQS, MOCK_QUOTATIONS, MOCK_PURCHASE_ORDERS, MOCK_DELIVERIES, MOCK_PAYMENTS, MOCK_ASSETS, MOCK_USERS } from '../../../data/mockData';
import { INITIAL_CREDENTIAL_STORE } from '../../../lib/credentialStore';

export const TeamModule: React.FC = () => {
  const {
    availableUsers,
    currentUser,
    activeRole,
    addUser,
    updateUser,
    deleteUser,
  } = useAuth();
  const { success, error: toastError, info } = useToast();

  const isSuperAdmin = activeRole === 'Super Admin';

  // Sub-navigation tabs
  const [activeTab, setActiveTab] = useState<'users' | 'backup' | 'audit' | 'matrix'>('users');

  // Search & filter for users
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals for User Management
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  // Add User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Procurement Engineer');
  const [newEntity, setNewEntity] = useState<EntityId | 'GROUP'>('FITCO');
  const [newDept, setNewDept] = useState('');
  const [newPassword, setNewPassword] = useState('Fitco@2026!Secure');
  const [newStatus, setNewStatus] = useState<'Active' | 'Suspended' | 'Pending Verification'>('Active');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Procurement Engineer');
  const [editEntity, setEditEntity] = useState<EntityId | 'GROUP'>('FITCO');
  const [editDept, setEditDept] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Suspended' | 'Pending Verification'>('Active');
  const [editPassword, setEditPassword] = useState('');

  // Backup & Restore State
  const [restoreFile, setRestoreFile] = useState<EnterpriseBackupPayload | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audit Logs State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(getAuditLogs);

  const refreshAuditLogs = () => {
    setAuditLogs(getAuditLogs());
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return availableUsers.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.department.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [availableUsers, userSearch, roleFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = auditSearch.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditSearch]);

  // Handle Add User Submit
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmittingUser(true);

    const result = await addUser(
      {
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        entity: newEntity,
        department: newDept.trim() || 'Procurement Operations',
        status: newStatus,
        twoFactorEnabled: true,
      },
      newPassword
    );

    setIsSubmittingUser(false);

    if (result.ok && result.user) {
      success('User Account Provisioned', `${result.user.name} was successfully created with role ${result.user.role}.`);
      setShowAddModal(false);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewDept('');
      setNewPassword('Fitco@2026!Secure');
    } else {
      setFormError(result.error || 'Failed to create user account.');
      toastError('User Creation Failed', result.error || 'Unknown error');
    }
  };

  // Open Edit User Modal
  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditEntity(user.entity);
    setEditDept(user.department);
    setEditStatus(user.status);
    setEditPassword('');
    setFormError('');
  };

  // Handle Edit User Submit
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError('');
    setIsSubmittingUser(true);

    const updates: Partial<UserProfile> = {
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
      entity: editEntity,
      department: editDept.trim(),
      status: editStatus,
    };

    const result = await updateUser(
      editingUser.id,
      updates,
      editPassword.trim() ? editPassword.trim() : undefined
    );

    setIsSubmittingUser(false);

    if (result.ok) {
      success('User Updated', `Profile for ${editName} was successfully modified.`);
      setEditingUser(null);
    } else {
      setFormError(result.error || 'Failed to update user.');
      toastError('Update Failed', result.error || 'Unknown error');
    }
  };

  // Handle Delete User Submit
  const handleDeleteUserConfirm = async () => {
    if (!deletingUser) return;
    setIsSubmittingUser(true);

    const result = await deleteUser(deletingUser.id);
    setIsSubmittingUser(false);

    if (result.ok) {
      success('User Deleted', `Account for ${deletingUser.name} was permanently removed.`);
      setDeletingUser(null);
    } else {
      toastError('Delete Failed', result.error || 'Unknown error');
    }
  };

  // Handle Export Backup
  const handleExportBackup = () => {
    downloadBackupFile(currentUser?.name || 'Super Admin');
    success('System Backup Created', 'Enterprise JSON snapshot downloaded to your local device.');
  };

  // Handle File Selected for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.data && typeof parsed.data === 'object') {
          setRestoreFile(parsed);
          setShowRestoreModal(true);
        } else {
          toastError('Invalid Backup File', 'The selected file is not a valid ProcureOS enterprise backup.');
        }
      } catch (err) {
        toastError('Parse Error', 'Could not read JSON file. Ensure the file is uncorrupted.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm Restore
  const handleConfirmRestore = () => {
    if (!restoreFile) return;
    const result = restoreFullBackup(restoreFile, currentUser?.name || 'Super Admin');
    setShowRestoreModal(false);
    setRestoreFile(null);

    if (result.ok) {
      success('Database Restored', result.message);
      info('Re-syncing State', 'ProcureOS has reloaded the latest snapshot across all modules.');
      refreshAuditLogs();
    } else {
      toastError('Restore Failed', result.message);
    }
  };

  // Reset to Factory Demo Data
  const handleResetToFactory = () => {
    try {
      localStorage.setItem('procureos_items', JSON.stringify(MOCK_ITEMS));
      localStorage.setItem('procureos_vendors', JSON.stringify(MOCK_VENDORS));
      localStorage.setItem('procureos_rfqs', JSON.stringify(MOCK_RFQS));
      localStorage.setItem('procureos_quotations', JSON.stringify(MOCK_QUOTATIONS));
      localStorage.setItem('procureos_purchase_orders', JSON.stringify(MOCK_PURCHASE_ORDERS));
      localStorage.setItem('procureos_deliveries', JSON.stringify(MOCK_DELIVERIES));
      localStorage.setItem('procureos_payments', JSON.stringify(MOCK_PAYMENTS));
      localStorage.setItem('procureos_assets', JSON.stringify(MOCK_ASSETS));
      localStorage.setItem('procureos_users', JSON.stringify(MOCK_USERS));
      localStorage.setItem('procureos_credentials', JSON.stringify(INITIAL_CREDENTIAL_STORE));

      setShowResetConfirmModal(false);
      success('Factory Reset Complete', 'All enterprise tables reset to baseline demonstration dataset.');
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) {
      toastError('Reset Failed', err?.message || 'Error writing to storage.');
    }
  };

  const permissionMatrix: {
    permission: string;
    description: string;
    roles: Record<UserRole, boolean>;
  }[] = [
    {
      permission: 'Full User & Security Provisioning',
      description: 'Create, modify, and delete user profiles and reset credentials',
      roles: {
        'Super Admin': true,
        'Procurement Director': false,
        'Procurement Engineer': false,
        'Purchasing Specialist': false,
        'Site Receiving Officer': false,
        'Financial Controller': false,
        'Internal Auditor': false,
      },
    },
    {
      permission: 'Disaster Recovery (Backup & Restore)',
      description: 'Export and restore immutable enterprise JSON database snapshots',
      roles: {
        'Super Admin': true,
        'Procurement Director': false,
        'Procurement Engineer': false,
        'Purchasing Specialist': false,
        'Site Receiving Officer': false,
        'Financial Controller': false,
        'Internal Auditor': false,
      },
    },
    {
      permission: 'Create RFQ / Tender',
      description: 'Draft and publish competitive tender packages to suppliers',
      roles: {
        'Super Admin': true,
        'Procurement Director': true,
        'Procurement Engineer': true,
        'Purchasing Specialist': true,
        'Site Receiving Officer': false,
        'Financial Controller': false,
        'Internal Auditor': false,
      },
    },
    {
      permission: 'Award Tender Bid',
      description: 'Authorize commercial selection and generate draft PO',
      roles: {
        'Super Admin': true,
        'Procurement Director': true,
        'Procurement Engineer': false,
        'Purchasing Specialist': false,
        'Site Receiving Officer': false,
        'Financial Controller': false,
        'Internal Auditor': false,
      },
    },
    {
      permission: 'Approve PO (< 1M SAR)',
      description: 'Sign off operational purchase orders up to SAR 1,000,000',
      roles: {
        'Super Admin': true,
        'Procurement Director': true,
        'Procurement Engineer': false,
        'Purchasing Specialist': false,
        'Site Receiving Officer': false,
        'Financial Controller': true,
        'Internal Auditor': false,
      },
    },
    {
      permission: 'Approve PO (> 1M SAR)',
      description: 'Executive authorization threshold for high-value contracts',
      roles: {
        'Super Admin': true,
        'Procurement Director': true,
        'Procurement Engineer': false,
        'Purchasing Specialist': false,
        'Site Receiving Officer': false,
        'Financial Controller': true,
        'Internal Auditor': false,
      },
    },
    {
      permission: 'Site Goods Receipt & QC',
      description: 'Perform material acceptance and file official GRN report',
      roles: {
        'Super Admin': true,
        'Procurement Director': false,
        'Procurement Engineer': false,
        'Purchasing Specialist': false,
        'Site Receiving Officer': true,
        'Financial Controller': false,
        'Internal Auditor': false,
      },
    },
    {
      permission: 'Release Payment (Treasury)',
      description: 'Authorize SARIE bank wire transfers & letters of credit',
      roles: {
        'Super Admin': true,
        'Procurement Director': false,
        'Procurement Engineer': false,
        'Purchasing Specialist': false,
        'Site Receiving Officer': false,
        'Financial Controller': true,
        'Internal Auditor': false,
      },
    },
    {
      permission: 'Audit Ledger & Export Logs',
      description: 'Read-only immutable access to enterprise transaction trails',
      roles: {
        'Super Admin': true,
        'Procurement Director': true,
        'Procurement Engineer': false,
        'Purchasing Specialist': false,
        'Site Receiving Officer': false,
        'Financial Controller': true,
        'Internal Auditor': true,
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Enterprise Governance, User Management & System Control
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Role-Based Access Control (RBAC), multi-entity user provisioning, and full system disaster recovery
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Super Admin Clearance Active</span>
            </span>
          )}
          <Badge variant="emerald" dot className="text-xs py-1">
            Live Replicated & 2FA Enforced
          </Badge>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management ({availableUsers.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('backup');
          }}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'backup'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backup & Disaster Recovery</span>
          {isSuperAdmin && (
            <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 text-[9px] rounded font-bold border border-amber-500/40">
              Super Admin
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            refreshAuditLogs();
          }}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Permissions Matrix</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Super Admin Notice or Guard */}
          {isSuperAdmin ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200">Super Admin User Provisioning Authority</h3>
                  <p className="text-xs text-slate-400">
                    You have full permission to add new enterprise users, edit roles, reset passwords, or delete inactive accounts.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setFormError('');
                  setShowAddModal(true);
                }}
                className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shrink-0"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Add New User
              </Button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                Viewing directory as <strong>{activeRole}</strong>. User creation, editing, and deletion are strictly restricted to <strong>Super Admin</strong>.
              </span>
            </div>
          )}

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, or department..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="ALL">All Roles ({availableUsers.length})</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Procurement Director">Procurement Director</option>
                <option value="Procurement Engineer">Procurement Engineer</option>
                <option value="Purchasing Specialist">Purchasing Specialist</option>
                <option value="Site Receiving Officer">Site Receiving Officer</option>
                <option value="Financial Controller">Financial Controller</option>
                <option value="Internal Auditor">Internal Auditor</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User / Profile</th>
                    <th className="py-3 px-4 font-semibold">Role & Permissions</th>
                    <th className="py-3 px-4 font-semibold">Entity</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold">2FA Security</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredUsers.map((user) => {
                    const isActivePersona = currentUser?.id === user.id;
                    const isSuper = user.role === 'Super Admin';

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isActivePersona ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        {/* Profile */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSuper
                                ? 'bg-amber-950 border border-amber-500/50 text-amber-300'
                                : 'bg-cyan-950 border border-cyan-500/40 text-cyan-400'
                            }`}>
                              {isSuper ? <ShieldCheck className="w-4 h-4 text-amber-300" /> : user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isActivePersona && (
                                  <span className="px-1.5 py-0.2 bg-cyan-900/80 text-cyan-300 text-[9px] rounded font-bold border border-cyan-500/40">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 font-medium ${
                            isSuper ? 'text-amber-300 font-bold' : 'text-slate-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-cyan-400 font-mono text-[11px]">
                            {user.entity}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                          {user.department}
                        </td>

                        {/* 2FA */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" /> Enforced
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            variant={
                              user.status === 'Active'
                                ? 'emerald'
                                : user.status === 'Suspended'
                                ? 'rose'
                                : 'amber'
                            }
                            dot
                          >
                            {user.status}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Super Admin Edit Button */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => openEditModal(user)}
                                title="Edit user profile and credentials"
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Super Admin Delete Button */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => setDeletingUser(user)}
                                disabled={currentUser?.id === user.id}
                                title={
                                  currentUser?.id === user.id
                                    ? 'Cannot delete your active account'
                                    : 'Delete user account'
                                }
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  currentUser?.id === user.id
                                    ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                                    : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 border border-rose-800/40'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BACKUP & DISASTER RECOVERY */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {!isSuperAdmin ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-rose-900/40 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Super Admin Access Required</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Disaster recovery snapshots contain full enterprise datasets, cryptographic keys, and sensitive financial records. Only users with the <strong>Super Admin</strong> role are authorized to export or restore system data.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Architecture Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/40">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Enterprise Snapshot & Disaster Recovery Engine
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      ProcureOS maintains a high-availability persistent storage engine across all tabs and users.
                      As Super Admin, you can export complete, versioned point-in-time JSON snapshots or restore them at any moment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Export Card */}
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Download className="w-5 h-5" />
                      <span>Export Full Enterprise Backup</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Packages items, vendors, RFQs, bids, purchase orders, shipments, payments, users, and audit logs into an encrypted, standalone JSON payload.
                    </p>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Tables:</span>
                        <span className="font-mono text-cyan-300">11 Collections</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Format:</span>
                        <span className="font-mono text-emerald-400">JSON v2.4.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Integrity Checksum:</span>
                        <span className="font-mono text-slate-400">SHA256 verified</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleExportBackup}
                    className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON Backup
                  </Button>
                </div>

                {/* Restore Card */}
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Upload className="w-5 h-5" />
                      <span>Restore from JSON Backup</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Upload an existing snapshot file to overwrite or restore all tables. Once applied, all open browser tabs and users immediately update live.
                    </p>
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300/90 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <span>Restoring overwrites current tables with the uploaded snapshot data.</span>
                    </div>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                      id="restore-upload-input"
                    />
                    <label
                      htmlFor="restore-upload-input"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white font-semibold text-xs border border-emerald-500/30 cursor-pointer transition-all shadow-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Select Backup File (.json)
                    </label>
                  </div>
                </div>
              </div>

              {/* Factory Reset Section */}
              <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-rose-400" />
                    Reset to Factory Baseline Data
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Resets the entire procurement database and user store back to the clean demonstration state.
                  </p>
                </div>
                <button
                  onClick={() => setShowResetConfirmModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                >
                  Factory Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAuditLogs}
                className="text-xs text-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Actor / Role</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Entity</th>
                    <th className="py-3 px-4 font-semibold">Transaction Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No audit log entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-200 font-sans">{log.actorName}</span>
                          <span className="text-[10px] text-cyan-400 block font-sans">{log.actorRole}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-emerald-400 font-sans">{log.action}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {log.entityType} ({log.entityId})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans text-xs">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Enterprise Permissions & Separation of Duties Matrix
            </h3>
            <span className="text-xs text-slate-400">
              Role-Based Authorization Policies
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold min-w-[220px]">Operation / Authority</th>
                  <th className="py-3 px-3 text-center">Super Admin</th>
                  <th className="py-3 px-3 text-center">Procurement Director</th>
                  <th className="py-3 px-3 text-center">Procurement Engineer</th>
                  <th className="py-3 px-3 text-center">Purchasing Specialist</th>
                  <th className="py-3 px-3 text-center">Site Receiving Officer</th>
                  <th className="py-3 px-3 text-center">Financial Controller</th>
                  <th className="py-3 px-3 text-center">Internal Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {permissionMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{item.permission}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                    </td>
                    {(
                      [
                        'Super Admin',
                        'Procurement Director',
                        'Procurement Engineer',
                        'Purchasing Specialist',
                        'Site Receiving Officer',
                        'Financial Controller',
                        'Internal Auditor',
                      ] as UserRole[]
                    ).map((role) => {
                      const hasPerm = item.roles[role];
                      return (
                        <td key={role} className="py-3 px-3 text-center whitespace-nowrap">
                          {hasPerm ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-slate-600">
                              <XCircle className="w-3.5 h-3.5" />
                            </span>
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

      {/* MODAL: ADD USER (Super Admin Only) */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Provision New Enterprise User"
        >
          <form onSubmit={handleAddUserSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-700/50 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Tariq Al-Ghamdi"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Corporate Email Address *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="tariq.ghamdi@fitco-group.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Procurement Director">Procurement Director</option>
                  <option value="Procurement Engineer">Procurement Engineer</option>
                  <option value="Purchasing Specialist">Purchasing Specialist</option>
                  <option value="Site Receiving Officer">Site Receiving Officer</option>
                  <option value="Financial Controller">Financial Controller</option>
                  <option value="Internal Auditor">Internal Auditor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tenant Entity *
                </label>
                <select
                  value={newEntity}
                  onChange={(e) => setNewEntity(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="FITCO">FITCO (Industrial Supply)</option>
                  <option value="ARABITRA">ARABITRA (Trading & Logistics)</option>
                  <option value="GROUP">GROUP (Parent Holding)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="e.g. Mechanical & Piping"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Active">Active</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Temporary Password *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Must contain at least 10 chars, uppercase, lowercase, digit, and symbol.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmittingUser}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {isSubmittingUser ? 'Hashing & Creating...' : 'Provision User'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: EDIT USER (Super Admin Only) */}
      {editingUser && (
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={`Edit User: ${editingUser.name}`}
        >
          <form onSubmit={handleEditUserSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-700/50 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Corporate Email
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Procurement Director">Procurement Director</option>
                  <option value="Procurement Engineer">Procurement Engineer</option>
                  <option value="Purchasing Specialist">Purchasing Specialist</option>
                  <option value="Site Receiving Officer">Site Receiving Officer</option>
                  <option value="Financial Controller">Financial Controller</option>
                  <option value="Internal Auditor">Internal Auditor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tenant Entity
                </label>
                <select
                  value={editEntity}
                  onChange={(e) => setEditEntity(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="FITCO">FITCO</option>
                  <option value="ARABITRA">ARABITRA</option>
                  <option value="GROUP">GROUP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reset Password (Optional)
              </label>
              <input
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave blank to preserve current password"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmittingUser}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {isSubmittingUser ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: DELETE USER CONFIRMATION */}
      {deletingUser && (
        <Modal
          isOpen={Boolean(deletingUser)}
          onClose={() => setDeletingUser(null)}
          title="Confirm User Account Deprovisioning"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 leading-relaxed">
                You are about to permanently delete the account for <strong>{deletingUser.name}</strong> ({deletingUser.email}).
                All active session tokens and login credentials will be revoked immediately.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUserConfirm}
                disabled={isSubmittingUser}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                {isSubmittingUser ? 'Deleting...' : 'Permanently Delete User'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: CONFIRM RESTORE BACKUP */}
      {showRestoreModal && restoreFile && (
        <Modal
          isOpen={showRestoreModal}
          onClose={() => setShowRestoreModal(false)}
          title="Restore Enterprise Database"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              ProcureOS has verified the backup file:
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Snapshot Version:</span>
                <span className="text-emerald-400">{restoreFile.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exported At:</span>
                <span className="text-slate-200">{new Date(restoreFile.exportedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exported By:</span>
                <span className="text-slate-200">{restoreFile.exportedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Checksum:</span>
                <span className="text-cyan-400 truncate max-w-[200px]">{restoreFile.checksum}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Proceeding will overwrite all existing live records with the snapshot data across all active sessions.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRestoreModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRestore}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Execute Full Restore
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: FACTORY RESET CONFIRMATION */}
      {showResetConfirmModal && (
        <Modal
          isOpen={showResetConfirmModal}
          onClose={() => setShowResetConfirmModal(false)}
          title="Reset to Baseline Enterprise Data"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-700/60 text-xs text-rose-200 leading-relaxed">
              <strong>Warning:</strong> This operation clears all custom-created items, vendors, purchase orders, shipments, and restored tables, reloading the initial baseline records.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleResetToFactory}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                Confirm Factory Reset
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

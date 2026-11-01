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
  AlertTriangle,
  History,
  Sparkles,
  X,
  KeyRound,
  Sliders,
} from 'lucide-react';
import { UserRole, UserProfile, EntityId } from '../../types/procurement';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  downloadBackupFile,
  restoreFullBackup,
  getAuditLogs,
  AuditLogEntry,
  EnterpriseBackupPayload,
} from '../../lib/liveSync';
import {
  MOCK_ITEMS,
  MOCK_VENDORS,
  MOCK_RFQS,
  MOCK_QUOTATIONS,
  MOCK_PURCHASE_ORDERS,
  MOCK_DELIVERIES,
  MOCK_PAYMENTS,
  MOCK_ASSETS,
  MOCK_USERS,
} from '../../data/mockData';
import { INITIAL_CREDENTIAL_STORE } from '../../lib/credentialStore';

interface AdminControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminControlPanelModal: React.FC<AdminControlPanelModalProps> = ({
  isOpen,
  onClose,
}) => {
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

  const [activeTab, setActiveTab] = useState<'users' | 'backup' | 'audit' | 'privileges'>('users');

  // Search & Filter
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
      setNewName('');
      setNewEmail('');
      setNewDept('');
      setNewPassword('Fitco@2026!Secure');
    } else {
      setFormError(result.error || 'Failed to create user account.');
      toastError('User Creation Failed', result.error || 'Unknown error');
    }
  };

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
      success('User Updated', `Profile & privileges for ${editName} were updated.`);
      setEditingUser(null);
    } else {
      setFormError(result.error || 'Failed to update user.');
      toastError('Update Failed', result.error || 'Unknown error');
    }
  };

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

  const handleExportBackup = () => {
    downloadBackupFile(currentUser?.name || 'Super Admin');
    success('System Backup Created', 'Enterprise JSON snapshot downloaded to your device.');
  };

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#090d16] border border-amber-500/40 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-[#090d16] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-300 text-lg shadow-inner">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Admin Control Panel
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Super Admin Exclusive
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized user provisioning, role & credential governance, and global disaster recovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              aria-label="Close Admin Control Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-4 sm:px-6 bg-slate-950/50 shrink-0 space-x-2 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management & Credentials ({availableUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Backup & Restore Data</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('audit');
              refreshAuditLogs();
            }}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Enterprise Audit Trail</span>
          </button>

          <button
            onClick={() => setActiveTab('privileges')}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'privileges'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Role Privilege Matrix</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {!isSuperAdmin ? (
            <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Super Admin Authority Required</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Only users authenticated with the <strong>Super Admin</strong> role can execute user modifications, credential resets, and database restorations.
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: USERS */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search users by name, email, department..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="ALL">All Roles</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Procurement Director">Procurement Director</option>
                        <option value="Procurement Engineer">Procurement Engineer</option>
                        <option value="Purchasing Specialist">Purchasing Specialist</option>
                        <option value="Site Receiving Officer">Site Receiving Officer</option>
                        <option value="Financial Controller">Financial Controller</option>
                        <option value="Internal Auditor">Internal Auditor</option>
                      </select>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => {
                        setFormError('');
                        setShowAddModal(true);
                      }}
                      className="bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-semibold text-xs py-2 shrink-0 shadow-md shadow-amber-950/40"
                    >
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      Add New User
                    </Button>
                  </div>

                  {/* Users Table */}
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4 font-semibold">User Details</th>
                            <th className="py-3 px-4 font-semibold">Role</th>
                            <th className="py-3 px-4 font-semibold">Entity</th>
                            <th className="py-3 px-4 font-semibold">Department</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 font-semibold text-right">Admin Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {filteredUsers.map((user) => {
                            const isSelf = currentUser?.id === user.id;
                            const isSuper = user.role === 'Super Admin';

                            return (
                              <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                        isSuper
                                          ? 'bg-amber-950 border border-amber-500/50 text-amber-300'
                                          : 'bg-slate-800 border border-slate-700 text-cyan-400'
                                      }`}
                                    >
                                      {isSuper ? '👑' : user.name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                        <span>{user.name}</span>
                                        {isSelf && (
                                          <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 text-[9px] rounded font-bold border border-amber-500/40">
                                            YOU
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className={isSuper ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                                    {user.role}
                                  </span>
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-cyan-400">
                                  {user.entity}
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                                  {user.department}
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
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

                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => openEditModal(user)}
                                      title="Edit user profile, role, and reset password"
                                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => setDeletingUser(user)}
                                      disabled={isSelf}
                                      title={isSelf ? 'Cannot delete your active account' : 'Delete user account'}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isSelf
                                          ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                                          : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 border border-rose-800/40'
                                      }`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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

              {/* TAB 2: BACKUP & RESTORE */}
              {activeTab === 'backup' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Backup */}
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                          <Download className="w-4 h-4" />
                          <span>Export Full Enterprise Database</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Generates a standalone point-in-time JSON archive encompassing all procurement tables (Items, Vendors, RFQs, Quotes, Purchase Orders, Deliveries, Payments, Assets, Users, and Audit Logs).
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleExportBackup}
                        className="w-full bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-semibold text-xs"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON Snapshot
                      </Button>
                    </div>

                    {/* Restore */}
                    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                          <Upload className="w-4 h-4" />
                          <span>Restore Database from Snapshot</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Upload a verified ProcureOS `.json` backup file. Once confirmed, all records are restored and immediately broadcasted to all connected devices in real time.
                        </p>
                      </div>

                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".json,application/json"
                          onChange={handleFileChange}
                          className="hidden"
                          id="admin-restore-upload-input"
                        />
                        <label
                          htmlFor="admin-restore-upload-input"
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white font-semibold text-xs border border-emerald-500/30 cursor-pointer transition-all shadow-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Select Backup File (.json)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Reset Demo */}
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                        Factory Baseline Reset
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Overwrites current records and reloads the default clean simulation dataset.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowResetConfirmModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 text-xs font-semibold cursor-pointer transition-colors shrink-0"
                    >
                      Factory Reset
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search logs by action or actor..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshAuditLogs}
                      className="text-xs text-slate-300"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Refresh Logs
                    </Button>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/50">
                    <div className="overflow-x-auto max-h-[380px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                            <th className="py-2.5 px-4 font-semibold">Actor / Role</th>
                            <th className="py-2.5 px-4 font-semibold">Action</th>
                            <th className="py-2.5 px-4 font-semibold">Entity</th>
                            <th className="py-2.5 px-4 font-semibold">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
                          {filteredAuditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-2.5 px-4 whitespace-nowrap text-slate-400">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap font-sans">
                                <span className="font-semibold text-slate-200">{log.actorName}</span>
                                <span className="text-[10px] text-cyan-400 block">{log.actorRole}</span>
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap font-sans font-semibold text-emerald-400">
                                {log.action}
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                  {log.entityType} ({log.entityId})
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-300 font-sans text-xs">
                                {log.details}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PRIVILEGES MATRIX */}
              {activeTab === 'privileges' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <p>
                      <strong>Super Admin Privilege Matrix:</strong> The table below outlines operational authorities across system roles. Super Admin has unrestricted authority across all governance, transaction approval, and system recovery routines.
                    </p>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Capability</th>
                          <th className="py-2.5 px-3 text-center text-amber-300 font-bold">Super Admin</th>
                          <th className="py-2.5 px-3 text-center">Procurement Dir</th>
                          <th className="py-2.5 px-3 text-center">Purchasing</th>
                          <th className="py-2.5 px-3 text-center">Finance Dir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {[
                          { name: 'User Account Provisioning & Password Resets', sa: true, pd: false, ps: false, fc: false },
                          { name: 'Disaster Recovery (Backup & Restore)', sa: true, pd: false, ps: false, fc: false },
                          { name: 'High-Value PO Approval (> 1M SAR)', sa: true, pd: true, ps: false, fc: true },
                          { name: 'Treasury Wire Payment Disbursement', sa: true, pd: false, ps: false, fc: true },
                          { name: 'Audit Log Ledger Inspection', sa: true, pd: true, ps: false, fc: true },
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-4 font-medium text-slate-200">{row.name}</td>
                            <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓ Full</td>
                            <td className="py-2.5 px-3 text-center">{row.pd ? '✓' : '—'}</td>
                            <td className="py-2.5 px-3 text-center">{row.ps ? '✓' : '—'}</td>
                            <td className="py-2.5 px-3 text-center">{row.fc ? '✓' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL: ADD USER */}
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  placeholder="e.g. Mechanical Operations"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Must contain at least 10 chars, uppercase, lowercase, digit, and symbol.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmittingUser}
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                {isSubmittingUser ? 'Hashing & Creating...' : 'Provision User'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: EDIT USER */}
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="outline" type="button" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmittingUser}
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                {isSubmittingUser ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
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
              <Button variant="outline" onClick={() => setDeletingUser(null)}>
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

      {/* MODAL: CONFIRM RESTORE */}
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
              <Button variant="outline" onClick={() => setShowRestoreModal(false)}>
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
          title="Reset to Factory Simulation Data"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-700/60 text-xs text-rose-200 leading-relaxed">
              <strong>Warning:</strong> This operation clears all custom-created items, vendors, purchase orders, shipments, and restored tables, reloading the factory simulation data.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowResetConfirmModal(false)}>
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

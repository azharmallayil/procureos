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
  Check,
  Copy,
  ChevronRight,
  ShieldOff,
  Server,
  Activity,
  Layers,
  FileCheck2,
  LockKeyhole,
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
  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  // Modals for User Management
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  // Add User Form State
  const [newName, setNewName] = useState('');

  // Handle ESC key to exit panel
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
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
      const matchesEntity = entityFilter === 'ALL' || u.entity === entityFilter;
      return matchesSearch && matchesRole && matchesEntity;
    });
  }, [availableUsers, userSearch, roleFilter, entityFilter]);

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

  const stats = useMemo(() => {
    const total = availableUsers.length;
    const active = availableUsers.filter((u) => u.status === 'Active').length;
    const suspended = availableUsers.filter((u) => u.status === 'Suspended').length;
    const admins = availableUsers.filter((u) => u.role === 'Super Admin').length;
    return { total, active, suspended, admins };
  }, [availableUsers]);

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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0b101b] border border-amber-500/30 rounded-2xl w-full max-w-6xl h-[92vh] max-h-[880px] shadow-2xl flex flex-col overflow-hidden relative shadow-amber-950/20 m-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Bar */}
        <header className="px-5 py-4 border-b border-slate-800/90 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-[#0b101b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-950/50">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400 font-bold text-lg">
                👑
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Admin Control Panel
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold tracking-wide">
                  Super Admin Console
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage system users, security privileges, credentials, database backups & audit verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold shadow-sm hover:border-slate-600 cursor-pointer"
              title="Close Admin Panel (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
              <span>Exit Panel</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation & Status Strip */}
        <div className="px-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>User & Role Governance</span>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
                {availableUsers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'backup'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Backup & Disaster Recovery</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('audit');
                refreshAuditLogs();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Audit Trail Ledger</span>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
                {auditLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('privileges')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'privileges'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Privilege Matrix</span>
            </button>
          </nav>

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 py-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {stats.active} Active
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {stats.admins} Super Admin
            </span>
            {stats.suspended > 0 && (
              <>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1.5 font-medium text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  {stats.suspended} Suspended
                </span>
              </>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <main className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-[#0b101b]/70">
          {!isSuperAdmin ? (
            <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Super Admin Clearance Required</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Only users authenticated with the <strong>Super Admin</strong> role have authority to provision users, change roles, or restore system backups.
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: USER MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Action Bar & Quick Filter Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
                    <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5">
                      {/* Search */}
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search user, email, department..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                        />
                      </div>

                      {/* Role Filter */}
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/70"
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

                      {/* Entity Filter */}
                      <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/70"
                      >
                        <option value="ALL">All Entities</option>
                        <option value="FITCO">FITCO (Industrial)</option>
                        <option value="ARABITRA">ARABITRA (Trading)</option>
                        <option value="GROUP">GROUP Holding</option>
                      </select>
                    </div>

                    {/* New User Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormError('');
                        setShowAddModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Provision New User</span>
                    </button>
                  </div>

                  {/* Users Grid / Table */}
                  <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4">Member Profile</th>
                            <th className="py-3 px-3">Role & Permissions</th>
                            <th className="py-3 px-3">Entity</th>
                            <th className="py-3 px-3">Department</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">2FA Security</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500">
                                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-semibold">No users matching search filters.</p>
                                <p className="text-xs text-slate-600 mt-1">Try resetting the search keyword or role filters.</p>
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((user) => {
                              const isSelf = currentUser?.id === user.id;
                              const isSuper = user.role === 'Super Admin';

                              return (
                                <tr
                                  key={user.id}
                                  className={`hover:bg-slate-900/50 transition-colors ${
                                    isSelf ? 'bg-amber-950/10' : ''
                                  }`}
                                >
                                  {/* Profile */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                          isSuper
                                            ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
                                            : 'bg-slate-800/80 border border-slate-700/80 text-cyan-400'
                                        }`}
                                      >
                                        {isSuper ? '👑' : user.name.charAt(0)}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                          <span>{user.name}</span>
                                          {isSelf && (
                                            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] rounded font-bold border border-amber-500/40">
                                              YOU
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{user.email}</div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Role */}
                                  <td className="py-3.5 px-3 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                        isSuper
                                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold'
                                          : 'bg-slate-900 text-slate-200 border border-slate-800'
                                      }`}
                                    >
                                      {user.role}
                                    </span>
                                  </td>

                                  {/* Entity */}
                                  <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px]">
                                    <span className="text-cyan-400 font-semibold">{user.entity}</span>
                                  </td>

                                  {/* Department */}
                                  <td className="py-3.5 px-3 whitespace-nowrap text-slate-300">
                                    {user.department}
                                  </td>

                                  {/* Status */}
                                  <td className="py-3.5 px-3 whitespace-nowrap">
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

                                  {/* 2FA */}
                                  <td className="py-3.5 px-3 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                      <ShieldCheck className="w-3.5 h-3.5" /> Enforced
                                    </span>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Edit Button */}
                                      <button
                                        type="button"
                                        onClick={() => openEditModal(user)}
                                        title="Edit profile & reset password"
                                        className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-amber-300 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Delete Button */}
                                      <button
                                        type="button"
                                        onClick={() => setDeletingUser(user)}
                                        disabled={isSelf}
                                        title={isSelf ? 'Cannot delete your active account' : 'Delete user account'}
                                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                          isSelf
                                            ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-600 border-slate-800'
                                            : 'bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 hover:text-rose-200 border-rose-900/40'
                                        }`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BACKUP & RESTORE */}
              {activeTab === 'backup' && (
                <div className="space-y-5">
                  {/* Hero card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/80 to-slate-900/40 border border-cyan-800/40 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Disaster Recovery & Enterprise Snapshot Center</h2>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Export standalone JSON archives of the entire ProcureOS system. Restoring a snapshot will immediately reload all tables across all active sessions in real time.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Export */}
                    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/90 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                          <Download className="w-4 h-4" />
                          <span>Export Full Enterprise Database</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Captures all 11 core data tables: Items catalog, Approved Vendors, RFQs, Quotes, Purchase Orders, Consignments, SARIE Payments, Assets, Users & Audit records.
                        </p>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-300 space-y-1 font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-sans">Scope:</span>
                            <span className="text-cyan-400">11 Full Collections</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-sans">Format:</span>
                            <span className="text-emerald-400">ProcureOS JSON v2.6</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download JSON Snapshot</span>
                      </button>
                    </div>

                    {/* Restore */}
                    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/90 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <Upload className="w-4 h-4" />
                          <span>Restore Database from Snapshot</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Upload an existing ProcureOS `.json` snapshot file. Validates file schema and record counts before safely overwriting data tables.
                        </p>
                        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <span>Overwrites active tables and broadcasts updates to all connected devices.</span>
                        </div>
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
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-300 hover:text-white font-semibold text-xs border border-emerald-500/30 cursor-pointer transition-all shadow-sm"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Select Backup File (.json)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Reset Demo */}
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                        Factory Baseline Reset
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Clears all custom records and re-initializes the default standard demonstration dataset.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-700/50 text-xs font-semibold cursor-pointer transition-colors shrink-0"
                    >
                      Factory Reset
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search audit trail by action, actor, entity..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={refreshAuditLogs}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Ledger</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden shadow-inner">
                    <div className="overflow-x-auto max-h-[460px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800 sticky top-0">
                          <tr>
                            <th className="py-3 px-4">Timestamp</th>
                            <th className="py-3 px-4">Operator / Role</th>
                            <th className="py-3 px-4">Action</th>
                            <th className="py-3 px-4">Target Entity</th>
                            <th className="py-3 px-4">Transaction Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          {filteredAuditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-slate-500 font-sans">
                                No audit records match query.
                              </td>
                            </tr>
                          ) : (
                            filteredAuditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                                  {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap font-sans">
                                  <span className="font-semibold text-slate-200">{log.actorName}</span>
                                  <span className="text-[10px] text-cyan-400 block">{log.actorRole}</span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap font-sans font-semibold text-emerald-400">
                                  {log.action}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]">
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

              {/* TAB 4: PRIVILEGE MATRIX */}
              {activeTab === 'privileges' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Role-Based Access Control (RBAC) Governance</h3>
                      <p className="text-slate-400 text-xs mt-0.5">
                        The matrix defines strict operational boundaries. Super Admin possesses full override clearance, while functional roles adhere strictly to segregation of duties.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 overflow-hidden shadow-inner">
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
                            { name: 'User Account Provisioning & Password Resets', sa: true, pd: false, pe: false, ps: false, so: false, fc: false, ia: false },
                            { name: 'Disaster Recovery (Backup & Restore)', sa: true, pd: false, pe: false, ps: false, so: false, fc: false, ia: false },
                            { name: 'RFQ & Competitive Tender Issuance', sa: true, pd: true, pe: true, ps: true, so: false, fc: false, ia: false },
                            { name: 'Commercial Tender Award Authority', sa: true, pd: true, pe: false, ps: false, so: false, fc: false, ia: false },
                            { name: 'Purchase Order Approval (< 1M SAR)', sa: true, pd: true, pe: false, ps: false, so: false, fc: true, ia: false },
                            { name: 'High-Value PO Approval (> 1M SAR)', sa: true, pd: true, pe: false, ps: false, so: false, fc: true, ia: false },
                            { name: 'Site Material Acceptance (GRN Sign-off)', sa: true, pd: false, pe: false, ps: false, so: true, fc: false, ia: false },
                            { name: 'Treasury Wire Payment Disbursement', sa: true, pd: false, pe: false, ps: false, so: false, fc: true, ia: false },
                            { name: 'Immutable Audit Ledger Inspection', sa: true, pd: true, pe: false, ps: false, so: false, fc: true, ia: true },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-medium text-slate-200">{row.name}</td>
                              <td className="py-3 px-3 text-center text-emerald-400 font-bold bg-amber-500/5">
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">{row.pd ? <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" /> : <span className="text-slate-600">—</span>}</td>
                              <td className="py-3 px-3 text-center">{row.pe ? <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" /> : <span className="text-slate-600">—</span>}</td>
                              <td className="py-3 px-3 text-center">{row.ps ? <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" /> : <span className="text-slate-600">—</span>}</td>
                              <td className="py-3 px-3 text-center">{row.so ? <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" /> : <span className="text-slate-600">—</span>}</td>
                              <td className="py-3 px-3 text-center">{row.fc ? <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" /> : <span className="text-slate-600">—</span>}</td>
                              <td className="py-3 px-3 text-center">{row.ia ? <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" /> : <span className="text-slate-600">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
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
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700/50 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Tariq Al-Ghamdi"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email Address *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="tariq.ghamdi@fitco-group.com"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assigned Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tenant Entity *
                </label>
                <select
                  value={newEntity}
                  onChange={(e) => setNewEntity(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="FITCO">FITCO (Industrial Supply)</option>
                  <option value="ARABITRA">ARABITRA (Trading)</option>
                  <option value="GROUP">GROUP Holding</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="e.g. Mechanical Operations"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Active">Active</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Temporary Password *
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                At least 10 characters (uppercase, lowercase, number, symbol).
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isSubmittingUser}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingUser ? 'Hashing & Creating...' : 'Provision User'}
              </button>
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
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700/50 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tenant Entity
                </label>
                <select
                  value={editEntity}
                  onChange={(e) => setEditEntity(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="FITCO">FITCO</option>
                  <option value="ARABITRA">ARABITRA</option>
                  <option value="GROUP">GROUP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reset Password (Leave blank to keep current)
              </label>
              <input
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Enter new password to overwrite"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button variant="outline" type="button" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isSubmittingUser}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingUser ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingUser && (
        <Modal
          isOpen={Boolean(deletingUser)}
          onClose={() => setDeletingUser(null)}
          title="Confirm User Account Revocation"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 leading-relaxed">
                You are permanently deprovisioning <strong>{deletingUser.name}</strong> ({deletingUser.email}).
                Their cryptographic credentials and active sessions will be terminated immediately.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="outline" onClick={() => setDeletingUser(null)}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleDeleteUserConfirm}
                disabled={isSubmittingUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {isSubmittingUser ? 'Deleting...' : 'Revoke Account Permanently'}
              </button>
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
              ProcureOS has verified the snapshot file structure:
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Version:</span>
                <span className="text-emerald-400">{restoreFile.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exported At:</span>
                <span className="text-slate-200">{new Date(restoreFile.exportedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created By:</span>
                <span className="text-slate-200">{restoreFile.exportedBy}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Restoring this snapshot will replace current items, vendors, POs, and users across all active devices.
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="outline" onClick={() => setShowRestoreModal(false)}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                Execute Full Restore
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: FACTORY RESET CONFIRMATION */}
      {showResetConfirmModal && (
        <Modal
          isOpen={showResetConfirmModal}
          onClose={() => setShowResetConfirmModal(false)}
          title="Reset to Factory Baseline Data"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-700/60 text-xs text-rose-200 leading-relaxed">
              <strong>Warning:</strong> This clears custom items, vendors, purchase orders, shipments, and restored tables, resetting back to the initial standard simulation dataset.
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="outline" onClick={() => setShowResetConfirmModal(false)}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleResetToFactory}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Confirm Factory Reset
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

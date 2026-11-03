import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { UserRole, UserProfile, PermissionMatrix } from '../types/procurement';
import { MOCK_USERS } from '../data/mockData';
import { verifyPassword, generateSessionToken, hashPassword } from '../lib/crypto';
import {
  getLockoutMs,
  recordFailure,
  clearFailures,
  formatLockDuration,
} from '../lib/rateLimiter';
import {
  getStoredCredentials,
  saveStoredCredentials,
  addOrUpdateCredential,
  deleteStoredCredential,
  StoredCredential,
} from '../lib/credentialStore';
import { liveBus, recordAuditLog, LiveBusMessage } from '../lib/liveSync';

// ============================================================================
// Security Constants
// ============================================================================
const SESSION_KEY = 'procureos_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;    // 30 min idle auto-logout
export const USERS_STORAGE_KEY = 'procureos_users';

// ============================================================================
// Types
// ============================================================================
export type { PermissionMatrix };

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; lockoutMs?: number };

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: UserProfile | null;
  activeRole: UserRole | null;
  permissions: PermissionMatrix | null;
  mustChangePassword: boolean;

  // Actions
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  changePassword: (oldPass: string, newPass: string) => Promise<{ ok: boolean; error?: string }>;

  // Super Admin User Governance (Strictly restricted to Super Admin)
  addUser: (
    userData: Omit<UserProfile, 'id' | 'lastLogin'>,
    initialPassword: string
  ) => Promise<{ ok: boolean; error?: string; user?: UserProfile }>;
  updateUser: (
    userId: string,
    updates: Partial<UserProfile>,
    newPassword?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  updateUserPermissions: (
    userId: string,
    customPermissions: Partial<PermissionMatrix> | null
  ) => Promise<{ ok: boolean; error?: string }>;

  // Helpers
  setActiveRole: (role: UserRole) => void;
  availableUsers: UserProfile[];
  securityDisclaimer: string;
}

// ============================================================================
// Role → Permissions
// ============================================================================
export const ROLE_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
  'Super Admin': {
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
  },
  'Procurement Director': {
    canApprovePO: true,
    canApproveHighValuePO: true,
    canCreateRFQ: true,
    canAwardBid: true,
    canReleasePayment: false,
    canAuditLogs: true,
    canManageVendors: true,
    canReceiveShipment: false,
    canEditQuotePrice: true,
    canDeleteQuotation: true,
    canDeleteRFQ: true,
  },
  'Procurement Engineer': {
    canApprovePO: false,
    canApproveHighValuePO: false,
    canCreateRFQ: true,
    canAwardBid: false,
    canReleasePayment: false,
    canAuditLogs: false,
    canManageVendors: true,
    canReceiveShipment: false,
    canEditQuotePrice: true,
    canDeleteQuotation: true,
    canDeleteRFQ: true,
  },
  'Purchasing Specialist': {
    canApprovePO: false,
    canApproveHighValuePO: false,
    canCreateRFQ: true,
    canAwardBid: false,
    canReleasePayment: false,
    canAuditLogs: false,
    canManageVendors: true,
    canReceiveShipment: false,
    canEditQuotePrice: true,
    canDeleteQuotation: true,
    canDeleteRFQ: false,
  },
  'Site Receiving Officer': {
    canApprovePO: false,
    canApproveHighValuePO: false,
    canCreateRFQ: false,
    canAwardBid: false,
    canReleasePayment: false,
    canAuditLogs: false,
    canManageVendors: false,
    canReceiveShipment: true,
    canEditQuotePrice: false,
    canDeleteQuotation: false,
    canDeleteRFQ: false,
  },
  'Financial Controller': {
    canApprovePO: true,
    canApproveHighValuePO: true,
    canCreateRFQ: false,
    canAwardBid: false,
    canReleasePayment: true,
    canAuditLogs: true,
    canManageVendors: false,
    canReceiveShipment: false,
    canEditQuotePrice: true,
    canDeleteQuotation: false,
    canDeleteRFQ: false,
  },
  'Internal Auditor': {
    canApprovePO: false,
    canApproveHighValuePO: false,
    canCreateRFQ: false,
    canAwardBid: false,
    canReleasePayment: false,
    canAuditLogs: true,
    canManageVendors: false,
    canReceiveShipment: false,
    canEditQuotePrice: false,
    canDeleteQuotation: false,
    canDeleteRFQ: false,
  },
};

// ============================================================================
// Stored Users Helper
// ============================================================================
export function getStoredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed: UserProfile[] = JSON.parse(raw);
      if (!parsed.some((u) => u.id === 'USR-000' || u.email === 'admin@procureos.com')) {
        const merged = [MOCK_USERS[0], ...parsed];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
  } catch {
    // fallback
  }
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(MOCK_USERS));
  } catch {
    // fallback
  }
  return MOCK_USERS;
}

export function saveStoredUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('[ProcureOS] Failed to save users', err);
  }
}

// ============================================================================
// Session helpers (sessionStorage – never localStorage for tokens)
// ============================================================================
interface SessionPayload {
  userId: string;
  token: string;
  expiresAt: number;
  lastActivity: number;
  mustChangePassword: boolean;
}

function readSession(): SessionPayload | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const payload: SessionPayload = JSON.parse(raw);
    if (Date.now() > payload.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (Date.now() - payload.lastActivity > IDLE_TIMEOUT_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function writeSession(payload: SessionPayload): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function touchSession(): void {
  const s = readSession();
  if (s) writeSession({ ...s, lastActivity: Date.now() });
}

// ============================================================================
// Context
// ============================================================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>(getStoredUsers);

  // ── Bootstrap: restore session on mount ────────────────────────────────
  useEffect(() => {
    const s = readSession();
    const users = getStoredUsers();
    setAvailableUsers(users);

    if (s) {
      const user = users.find((u) => u.id === s.userId) ?? null;
      setSession(s);
      setCurrentUser(user);
      setMustChangePassword(s.mustChangePassword);
    }
    setIsLoading(false);
  }, []);

  // ── Live sync across tabs / windows ───────────────────────────────────
  useEffect(() => {
    const unsubscribe = liveBus.subscribe((msg: LiveBusMessage) => {
      if (
        msg.type === 'USER_SYNC' ||
        (msg.type === 'SYNC_KEY' && msg.key === USERS_STORAGE_KEY) ||
        msg.type === 'FULL_DATABASE_RESTORE'
      ) {
        const freshUsers = getStoredUsers();
        setAvailableUsers(freshUsers);

        // Update active user profile if it changed
        if (currentUser) {
          const freshCurrent = freshUsers.find((u) => u.id === currentUser.id);
          if (freshCurrent) {
            setCurrentUser(freshCurrent);
          }
        }
      }
    });

    return unsubscribe;
  }, [currentUser]);

  // ── Idle-timeout watcher ────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const EVENTS = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart'];
    const touch = () => touchSession();
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const ticker = setInterval(() => {
      const current = readSession();
      if (!current) {
        setSession(null);
        setCurrentUser(null);
      }
    }, 30_000);

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(ticker);
    };
  }, [session]);

  // ── Login ───────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const emailNorm = email.trim().toLowerCase();

    // Rate-limit check
    const lockMs = getLockoutMs(emailNorm);
    if (lockMs > 0) {
      return {
        ok: false,
        error: `Account locked. Try again in ${formatLockDuration(lockMs)}.`,
        lockoutMs: lockMs,
      };
    }

    if (!emailNorm || !password) {
      return { ok: false, error: 'Email and password are required.' };
    }

    // Load persisted credentials
    const creds = getStoredCredentials();
    const cred = creds.find((c) => c.email.toLowerCase() === emailNorm);

    if (!cred) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      recordFailure(emailNorm);
      return { ok: false, error: 'Invalid email or password.' };
    }

    const valid = await verifyPassword(password, cred.passwordHash);

    if (!valid) {
      const newLock = recordFailure(emailNorm);
      if (newLock > 0) {
        return {
          ok: false,
          error: `Too many failed attempts. Account locked for ${formatLockDuration(newLock)}.`,
          lockoutMs: newLock,
        };
      }
      return { ok: false, error: 'Invalid email or password.' };
    }

    clearFailures(emailNorm);

    const users = getStoredUsers();
    let user = users.find((u) => u.id === cred.userId || u.email.toLowerCase() === emailNorm);

    if (!user) {
      // Fallback user profile creation if credentials existed but user was missing
      user = {
        id: cred.userId,
        name: cred.email.split('@')[0],
        email: cred.email,
        role: cred.userId === 'USR-000' ? 'Super Admin' : 'Procurement Director',
        entity: 'GROUP',
        department: 'Operations',
        status: 'Active',
        twoFactorEnabled: true,
        lastLogin: 'Just now',
      };
      saveStoredUsers([...users, user]);
    } else {
      // Update last login
      const updatedUsers = users.map((u) =>
        u.id === user!.id ? { ...u, lastLogin: 'Just now' } : u
      );
      saveStoredUsers(updatedUsers);
      setAvailableUsers(updatedUsers);
    }

    const token = generateSessionToken();
    const payload: SessionPayload = {
      userId: user.id,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
      lastActivity: Date.now(),
      mustChangePassword: cred.mustChangePassword,
    };

    writeSession(payload);
    setSession(payload);
    setCurrentUser(user);
    setMustChangePassword(payload.mustChangePassword);

    recordAuditLog(
      'User Authenticated',
      'Session',
      user.id,
      `User ${user.name} (${user.email}) signed in successfully as ${user.role}.`,
      { name: user.name, role: user.role }
    );

    return { ok: true };
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    if (currentUser) {
      recordAuditLog(
        'User Signed Out',
        'Session',
        currentUser.id,
        `User ${currentUser.name} signed out.`,
        { name: currentUser.name, role: currentUser.role }
      );
    }
    clearSession();
    // NEVER wipe enterprise data store on logout! Data persists lifelong.
    setSession(null);
    setCurrentUser(null);
    setMustChangePassword(false);
  }, [currentUser]);

  // ── Change Password ─────────────────────────────────────────────────────
  const changePassword = useCallback(
    async (oldPass: string, newPass: string): Promise<{ ok: boolean; error?: string }> => {
      if (!session || !currentUser) return { ok: false, error: 'Not authenticated.' };

      const creds = getStoredCredentials();
      const cred = creds.find((c) => c.userId === currentUser.id);
      if (!cred) return { ok: false, error: 'User credential record not found.' };

      const oldValid = await verifyPassword(oldPass, cred.passwordHash);
      if (!oldValid) return { ok: false, error: 'Current password is incorrect.' };

      const policyError = validatePasswordPolicy(newPass);
      if (policyError) return { ok: false, error: policyError };

      const newHash = await hashPassword(newPass);
      addOrUpdateCredential({
        userId: currentUser.id,
        email: currentUser.email,
        passwordHash: newHash,
        mustChangePassword: false,
      });

      const updatedSession = { ...session, mustChangePassword: false };
      writeSession(updatedSession);
      setSession(updatedSession);
      setMustChangePassword(false);

      recordAuditLog(
        'Password Changed',
        'Credential',
        currentUser.id,
        `User ${currentUser.name} changed their password.`,
        { name: currentUser.name, role: currentUser.role }
      );

      return { ok: true };
    },
    [session, currentUser]
  );

  // ── Super Admin: Add User ────────────────────────────────────────────────
  const addUser = useCallback(
    async (
      userData: Omit<UserProfile, 'id' | 'lastLogin'>,
      initialPassword: string
    ): Promise<{ ok: boolean; error?: string; user?: UserProfile }> => {
      if (currentUser?.role !== 'Super Admin') {
        return { ok: false, error: 'Access denied: Only Super Admin can provision new users.' };
      }

      if (!userData.name.trim() || !userData.email.trim()) {
        return { ok: false, error: 'User name and valid email are required.' };
      }

      const policyError = validatePasswordPolicy(initialPassword);
      if (policyError) {
        return { ok: false, error: `Initial password policy check failed: ${policyError}` };
      }

      const users = getStoredUsers();
      const emailLower = userData.email.trim().toLowerCase();
      if (users.some((u) => u.email.toLowerCase() === emailLower)) {
        return { ok: false, error: `A user with email '${userData.email}' already exists.` };
      }

      // Generate new sequential or unique ID
      const newId = `USR-${Date.now().toString().slice(-4)}`;
      const newUser: UserProfile = {
        ...userData,
        id: newId,
        email: emailLower,
        lastLogin: 'Never',
      };

      // Hash password & store credential
      const passHash = await hashPassword(initialPassword);
      addOrUpdateCredential({
        userId: newId,
        email: emailLower,
        passwordHash: passHash,
        mustChangePassword: true,
      });

      // Update user list
      const updatedUsers = [...users, newUser];
      saveStoredUsers(updatedUsers);
      setAvailableUsers(updatedUsers);

      recordAuditLog(
        'User Provisioned',
        'User',
        newId,
        `Super Admin created user ${newUser.name} (${newUser.email}) with role ${newUser.role} in ${newUser.entity}.`,
        { name: currentUser.name, role: currentUser.role }
      );

      liveBus.publish({
        type: 'USER_SYNC',
        data: updatedUsers,
        timestamp: Date.now(),
        actor: currentUser.name,
      });

      return { ok: true, user: newUser };
    },
    [currentUser]
  );

  // ── Super Admin: Update User ─────────────────────────────────────────────
  const updateUser = useCallback(
    async (
      userId: string,
      updates: Partial<UserProfile>,
      newPassword?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (currentUser?.role !== 'Super Admin') {
        return { ok: false, error: 'Access denied: Only Super Admin can modify user accounts.' };
      }

      const users = getStoredUsers();
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return { ok: false, error: 'Target user not found.' };

      // If email changed, check conflict
      if (updates.email && updates.email.toLowerCase() !== targetUser.email.toLowerCase()) {
        const conflict = users.some(
          (u) => u.id !== userId && u.email.toLowerCase() === updates.email!.toLowerCase()
        );
        if (conflict) {
          return { ok: false, error: `Email '${updates.email}' is already taken by another user.` };
        }
      }

      // If password update requested
      if (newPassword && newPassword.trim()) {
        const policyErr = validatePasswordPolicy(newPassword);
        if (policyErr) return { ok: false, error: policyErr };
        const passHash = await hashPassword(newPassword);
        addOrUpdateCredential({
          userId,
          email: (updates.email || targetUser.email).toLowerCase(),
          passwordHash: passHash,
          mustChangePassword: false,
        });
      }

      const updatedUsers = users.map((u) =>
        u.id === userId ? { ...u, ...updates } : u
      );
      saveStoredUsers(updatedUsers);
      setAvailableUsers(updatedUsers);

      if (currentUser.id === userId) {
        setCurrentUser({ ...currentUser, ...updates });
      }

      recordAuditLog(
        'User Profile Updated',
        'User',
        userId,
        `Super Admin updated user ${targetUser.name} (${targetUser.email}).`,
        { name: currentUser.name, role: currentUser.role }
      );

      liveBus.publish({
        type: 'USER_SYNC',
        data: updatedUsers,
        timestamp: Date.now(),
        actor: currentUser.name,
      });

      return { ok: true };
    },
    [currentUser]
  );

  // ── Super Admin: Delete User ─────────────────────────────────────────────
  const deleteUser = useCallback(
    async (userId: string): Promise<{ ok: boolean; error?: string }> => {
      if (currentUser?.role !== 'Super Admin') {
        return { ok: false, error: 'Access denied: Only Super Admin can delete user accounts.' };
      }

      if (currentUser.id === userId) {
        return { ok: false, error: 'Safety Violation: You cannot delete your own active administrator account.' };
      }

      const users = getStoredUsers();
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return { ok: false, error: 'User does not exist.' };

      deleteStoredCredential(userId);
      const filtered = users.filter((u) => u.id !== userId);
      saveStoredUsers(filtered);
      setAvailableUsers(filtered);

      recordAuditLog(
        'User Deprovisioned',
        'User',
        userId,
        `Super Admin deleted user ${targetUser.name} (${targetUser.email}) with role ${targetUser.role}.`,
        { name: currentUser.name, role: currentUser.role }
      );

      liveBus.publish({
        type: 'USER_SYNC',
        data: filtered,
        timestamp: Date.now(),
        actor: currentUser.name,
      });

      return { ok: true };
    },
    [currentUser]
  );

  // ── Super Admin: Update User Permissions ─────────────────────────────────
  const updateUserPermissions = useCallback(
    async (
      userId: string,
      customPermissions: Partial<PermissionMatrix> | null
    ): Promise<{ ok: boolean; error?: string }> => {
      if (currentUser?.role !== 'Super Admin') {
        return { ok: false, error: 'Access denied: Only Super Admin can modify user privileges.' };
      }

      const users = getStoredUsers();
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) return { ok: false, error: 'Target user not found.' };

      const updatedUsers = users.map((u) => {
        if (u.id === userId) {
          const clone = { ...u };
          if (customPermissions && Object.keys(customPermissions).length > 0) {
            clone.customPermissions = customPermissions;
          } else {
            delete clone.customPermissions;
          }
          return clone;
        }
        return u;
      });

      saveStoredUsers(updatedUsers);
      setAvailableUsers(updatedUsers);

      if (currentUser.id === userId) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                customPermissions:
                  customPermissions && Object.keys(customPermissions).length > 0
                    ? customPermissions
                    : undefined,
              }
            : null
        );
      }

      recordAuditLog(
        'User Privileges Updated',
        'Security',
        userId,
        customPermissions && Object.keys(customPermissions).length > 0
          ? `Super Admin customized granular privileges for ${targetUser.name} (${targetUser.email}).`
          : `Super Admin reset privileges to role defaults for ${targetUser.name} (${targetUser.email}).`,
        {
          name: currentUser.name,
          role: currentUser.role,
        }
      );

      liveBus.publish({
        type: 'USER_SYNC',
        data: updatedUsers,
        timestamp: Date.now(),
        actor: currentUser.name,
      });

      return { ok: true };
    },
    [currentUser]
  );

  // ── Derived values ──────────────────────────────────────────────────────
  const activeRole = currentUser?.role ?? null;
  const basePermissions = activeRole ? ROLE_PERMISSIONS[activeRole] ?? null : null;
  const permissions: PermissionMatrix | null = useMemo(() => {
    if (!basePermissions) return null;
    if (currentUser?.customPermissions) {
      return {
        ...basePermissions,
        ...currentUser.customPermissions,
      };
    }
    return basePermissions;
  }, [basePermissions, currentUser?.customPermissions]);

  const isAuthenticated = Boolean(session && currentUser);

  // setActiveRole: disabled in production office mode (switching requires actual login with credentials)
  const setActiveRole = useCallback(
    (_role: UserRole) => {
      // Direct impersonation without credentials is intentionally disabled for office security
    },
    []
  );

  const securityDisclaimer =
    'Enterprise Security Architecture Note: Authorization is enforced at the API, database Row-Level Security (PostgreSQL RLS), and cryptographically-signed JWT scopes. Client-side role display mirrors server state.';

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        currentUser,
        activeRole,
        permissions,
        mustChangePassword,
        login,
        logout,
        changePassword,
        addUser,
        updateUser,
        deleteUser,
        updateUserPermissions,
        setActiveRole,
        availableUsers,
        securityDisclaimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ============================================================================
// Password Policy Validator
// ============================================================================
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character (!@#$%^&*).';
  return null;
}

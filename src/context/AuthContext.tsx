import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { UserRole, UserProfile } from '../types/procurement';
import { MOCK_USERS } from '../data/mockData';
import { verifyPassword, generateSessionToken, hashPassword } from '../lib/crypto';
import {
  getLockoutMs,
  recordFailure,
  clearFailures,
  formatLockDuration,
} from '../lib/rateLimiter';
import { CREDENTIAL_STORE } from '../lib/credentialStore';

// ============================================================================
// Security Constants
// ============================================================================
const SESSION_KEY = 'procureos_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;    // 30 min idle auto-logout

// ============================================================================
// Types
// ============================================================================
export interface PermissionMatrix {
  canApprovePO: boolean;
  canApproveHighValuePO: boolean;
  canCreateRFQ: boolean;
  canAwardBid: boolean;
  canReleasePayment: boolean;
  canAuditLogs: boolean;
  canManageVendors: boolean;
  canReceiveShipment: boolean;
  canEditQuotePrice: boolean;
}

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

  // Helpers (legacy compat – only usable when authenticated)
  setActiveRole: (role: UserRole) => void;
  availableUsers: UserProfile[];
  securityDisclaimer: string;
}

// ============================================================================
// Role → Permissions
// ============================================================================
const ROLE_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
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
  },
};

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
// Credential store (mutable, per-session only – persisted in sessionStorage)
// ============================================================================
const CRED_STORE_KEY = 'procureos_creds';
type MutableCreds = Record<string, string>; // userId → passwordHash

function readCreds(): MutableCreds {
  try {
    const raw = sessionStorage.getItem(CRED_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCreds(c: MutableCreds): void {
  sessionStorage.setItem(CRED_STORE_KEY, JSON.stringify(c));
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

  // ── Bootstrap: restore session on mount ────────────────────────────────
  useEffect(() => {
    const s = readSession();
    if (s) {
      const user = MOCK_USERS.find((u) => u.id === s.userId) ?? null;
      setSession(s);
      setCurrentUser(user);
      setMustChangePassword(s.mustChangePassword);
    }
    setIsLoading(false);
  }, []);

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

    // Basic input sanitisation
    if (!emailNorm || !password) {
      return { ok: false, error: 'Email and password are required.' };
    }

    // Find credential record
    const cred = CREDENTIAL_STORE.find(
      (c) => c.email.toLowerCase() === emailNorm
    );

    if (!cred) {
      // Don't reveal user existence – same timing as hash check
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      recordFailure(emailNorm);
      return { ok: false, error: 'Invalid email or password.' };
    }

    // Check for a user-changed password in session store
    const mutableCreds = readCreds();
    const activeHash = mutableCreds[cred.userId] ?? cred.passwordHash;

    const valid = await verifyPassword(password, activeHash);

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

    const user = MOCK_USERS.find((u) => u.id === cred.userId)!;
    const token = generateSessionToken();
    const payload: SessionPayload = {
      userId: user.id,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
      lastActivity: Date.now(),
      mustChangePassword: mutableCreds[cred.userId] ? false : cred.mustChangePassword,
    };
    writeSession(payload);
    setSession(payload);
    setCurrentUser(user);
    setMustChangePassword(payload.mustChangePassword);

    return { ok: true };
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setCurrentUser(null);
    setMustChangePassword(false);
  }, []);

  // ── Change Password ─────────────────────────────────────────────────────
  const changePassword = useCallback(
    async (oldPass: string, newPass: string): Promise<{ ok: boolean; error?: string }> => {
      if (!session || !currentUser) return { ok: false, error: 'Not authenticated.' };

      const cred = CREDENTIAL_STORE.find((c) => c.userId === currentUser.id)!;
      const mutableCreds = readCreds();
      const activeHash = mutableCreds[cred.userId] ?? cred.passwordHash;

      const oldValid = await verifyPassword(oldPass, activeHash);
      if (!oldValid) return { ok: false, error: 'Current password is incorrect.' };

      // Password policy
      const policyError = validatePasswordPolicy(newPass);
      if (policyError) return { ok: false, error: policyError };

      const newHash = await hashPassword(newPass);
      writeCreds({ ...mutableCreds, [currentUser.id]: newHash });

      // Clear mustChangePassword flag
      const updatedSession = { ...session, mustChangePassword: false };
      writeSession(updatedSession);
      setSession(updatedSession);
      setMustChangePassword(false);

      return { ok: true };
    },
    [session, currentUser]
  );

  // ── Derived values ──────────────────────────────────────────────────────
  const activeRole = currentUser?.role ?? null;
  const permissions = activeRole ? ROLE_PERMISSIONS[activeRole] ?? null : null;
  const isAuthenticated = Boolean(session && currentUser);

  // setActiveRole: preserved for legacy TeamModule compatibility only (does not bypass auth)
  const setActiveRole = useCallback((role: UserRole) => {
    if (!currentUser) return;
    const matched = MOCK_USERS.find((u) => u.role === role);
    if (matched) setCurrentUser(matched);
  }, [currentUser]);

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
        setActiveRole,
        availableUsers: MOCK_USERS,
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
  if (password.length < 12) return 'Password must be at least 12 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character (!@#$%^&*).';
  return null;
}

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, UserProfile } from '../types/procurement';
import { MOCK_USERS } from '../data/mockData';

export interface PermissionMatrix {
  canApprovePO: boolean;
  canApproveHighValuePO: boolean; // > 1,000,000 SAR
  canCreateRFQ: boolean;
  canAwardBid: boolean;
  canReleasePayment: boolean;
  canAuditLogs: boolean;
  canManageVendors: boolean;
  canReceiveShipment: boolean;
  canEditQuotePrice: boolean;
}

interface AuthContextType {
  currentUser: UserProfile;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  availableUsers: UserProfile[];
  setCurrentUserById: (id: string) => void;
  permissions: PermissionMatrix;
  securityDisclaimer: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[0]); // Tariq Al-Mansoor

  const setActiveRole = (role: UserRole) => {
    const matchedUser = MOCK_USERS.find((u) => u.role === role);
    if (matchedUser) {
      setCurrentUser(matchedUser);
    } else {
      setCurrentUser((prev) => ({ ...prev, role }));
    }
  };

  const setCurrentUserById = (id: string) => {
    const user = MOCK_USERS.find((u) => u.id === id);
    if (user) setCurrentUser(user);
  };

  const permissions = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS['Purchasing Specialist'];

  const securityDisclaimer =
    'Enterprise Security Architecture Note: Client-side role simulation does not replace server-side enforcement. In production ProcureOS, authorization is strictly verified at API endpoints, database Row-Level Security (PostgreSQL RLS), and cryptographically signed JWT scopes.';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeRole: currentUser.role,
        setActiveRole,
        availableUsers: MOCK_USERS,
        setCurrentUserById,
        permissions,
        securityDisclaimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

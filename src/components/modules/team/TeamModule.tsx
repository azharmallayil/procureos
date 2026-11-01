import React from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  CheckCircle2,
  XCircle,
  Server,
  Database,
  FileCode2,
} from 'lucide-react';
import { UserRole, UserProfile } from '../../../types/procurement';
import { useAuth } from '../../../context/AuthContext';
import { Badge } from '../../common/Badge';

export const TeamModule: React.FC = () => {
  const { availableUsers, activeRole, setActiveRole } = useAuth();

  const permissionMatrix: {
    permission: string;
    description: string;
    roles: Record<UserRole, boolean>;
  }[] = [
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
            Enterprise Team & Role-Based Access Governance (RBAC)
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Cryptographic identity verification, multi-entity segregation of duties, and zero-trust audit policies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" dot className="text-xs py-1">
            2FA Enforced Enterprise-Wide
          </Badge>
        </div>
      </div>

      {/* Critical Architecture Security Notice */}
      <div className="p-5 rounded-xl bg-slate-900 border border-cyan-800/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-2 flex-1 text-xs">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Production Security Architectural Standard
            </h3>
            <p className="text-slate-300 leading-relaxed">
              <strong>Mandatory Compliance:</strong> In production ProcureOS, authorization is strictly implemented using 
              <strong> server-side cryptographic policies</strong>, rather than client-side UI filters alone. Even if a client modifies UI state, all transactional mutations are evaluated against database Row-Level Security (PostgreSQL RLS) and cryptographically verified JWT claims.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                  <Database className="w-4 h-4" />
                  <span>Row-Level Security (RLS)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  PostgreSQL multi-tenant policies partition FITCO and Arabitra ledgers at the kernel query level.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                  <KeyRound className="w-4 h-4" />
                  <span>Signed JWT Claim Scopes</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Every API mutation requires signed scopes and spending authority tokens authenticated via corporate SSO.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                  <Server className="w-4 h-4" />
                  <span>Segregation of Duties (SoD)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  The user who raises an RFQ cannot approve its corresponding PO or release the final bank disbursement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Accounts Directory */}
      <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Active Team Directory & Entity Assignment
          </h3>
          <span className="text-xs text-slate-400">
            {availableUsers.length} Corporate Accounts Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">User Profile</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold">Department & Entity Scope</th>
                <th className="py-3 px-4 font-semibold">2FA Security</th>
                <th className="py-3 px-4 font-semibold">Last Active</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Switch Perspective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {availableUsers.map((user) => {
                const isActivePersona = activeRole === user.role;
                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isActivePersona ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="font-semibold text-slate-100">{user.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-cyan-300">{user.role}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-200">{user.department}</div>
                      <Badge
                        variant={
                          user.entity === 'FITCO'
                            ? 'cyan'
                            : user.entity === 'ARABITRA'
                            ? 'emerald'
                            : 'purple'
                        }
                        className="text-[10px] mt-0.5"
                      >
                        {user.entity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" /> Enforced
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {user.lastLogin}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant="emerald" dot>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveRole(user.role)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          isActivePersona
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {isActivePersona ? 'Active Persona' : 'Simulate Role'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
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
                <th className="py-3 px-4 font-semibold min-w-[200px]">Operation / Action</th>
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
    </div>
  );
};

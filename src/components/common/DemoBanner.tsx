import React, { useState } from 'react';
import { ShieldCheck, Info, X, ShieldAlert } from 'lucide-react';
import { DEMO_DATA_DISCLAIMER } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

export const DemoBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const { securityDisclaimer } = useAuth();

  if (isDismissed) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-b border-cyan-800/30 px-4 py-2 text-xs flex items-center justify-between gap-4 text-slate-300">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-semibold tracking-wider text-[10px] shrink-0 uppercase">
            Simulation Environment
          </span>
          <p className="truncate text-slate-300 text-xs">
            {DEMO_DATA_DISCLAIMER}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowSecurityModal(true)}
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enterprise Security Model</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-slate-200 p-0.5"
            aria-label="Dismiss disclaimer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showSecurityModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 shadow-2xl relative">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-100">
                  ProcureOS Enterprise Security & Authorization Architecture
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {securityDisclaimer}
                </p>

                <div className="mt-4 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Server-Side Controls in Production:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li>Database Row-Level Security (PostgreSQL RLS) scoped to tenant IDs (FITCO vs Arabitra).</li>
                    <li>Cryptographically signed JWT claims enforcing exact user approvals and spending limits.</li>
                    <li>Immutable audit logs for all PO approvals, budget overrides, and vendor tenders.</li>
                    <li>Multi-Factor Authentication (2FA) required for PO releases above SAR 500,000.</li>
                  </ul>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowSecurityModal(false)}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
                  >
                    I Understand
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

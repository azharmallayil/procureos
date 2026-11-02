import React from 'react';
import { Building2, Layers } from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { Company } from '../../types/procurement';

export const CompanySwitcher: React.FC = () => {
  const { activeCompany, setActiveCompany } = useCompany();

  const options: { id: Company; label: string; badge: string; color: string }[] = [
    {
      id: 'ALL',
      label: 'All Companies',
      badge: 'Consolidated',
      color: 'from-slate-700 to-slate-800 text-slate-200 border-slate-600',
    },
    {
      id: 'FITCO',
      label: 'FITCO',
      badge: 'AI Worker Safety & Telematics',
      color: 'from-cyan-900/80 to-blue-900/80 text-cyan-200 border-cyan-500/50',
    },
    {
      id: 'ARABITRA',
      label: 'ARABITRA',
      badge: 'Fleet Tracking & LMI Solutions',
      color: 'from-emerald-900/80 to-teal-900/80 text-emerald-200 border-emerald-500/50',
    },
  ];

  return (
    <div className="flex items-center p-1 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-inner">
      {options.map((opt) => {
        const isActive = activeCompany === opt.id;
        return (
          <button
            key={opt.id}
            id={`btn-company-${opt.id.toLowerCase()}`}
            type="button"
            onClick={() => setActiveCompany(opt.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isActive
                ? `bg-gradient-to-r ${opt.color} shadow-md border text-white`
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            {opt.id === 'FITCO' ? (
              <img
                src="/fitco-logo.png"
                alt="FITCO"
                className="h-3.5 w-auto max-w-[26px] object-contain shrink-0"
              />
            ) : opt.id === 'ALL' ? (
              <Layers className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Building2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{opt.label}</span>
            {isActive && (
              <span className="hidden sm:inline-block text-[10px] font-normal px-1.5 py-0.2 rounded bg-black/30 border border-white/10 uppercase tracking-wider">
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

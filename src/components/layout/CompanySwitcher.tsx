import React from 'react';

export const CompanySwitcher: React.FC = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900/90 border border-amber-500/30 rounded-xl shadow-inner backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <img
          src="/arabitra-icon.png"
          alt="Arabitra"
          className="h-5 w-5 object-contain shrink-0"
        />
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-wider text-amber-200">ARABITRA</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Enterprise
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">
            Powered by Fitco
          </span>
        </div>
      </div>
    </div>
  );
};

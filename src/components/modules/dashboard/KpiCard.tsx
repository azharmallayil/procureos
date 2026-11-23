import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'blue';
  alert?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  subtitle,
  icon,
  accentColor = 'cyan',
  alert = false,
}) => {
  const accentStyles = {
    cyan: {
      border: 'hover:border-cyan-500/40',
      iconBg: 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.15)]',
    },
    emerald: {
      border: 'hover:border-emerald-500/40',
      iconBg: 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)]',
    },
    amber: {
      border: 'hover:border-amber-500/40',
      iconBg: 'bg-amber-950/60 border-amber-500/30 text-amber-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)]',
    },
    rose: {
      border: 'hover:border-rose-500/40',
      iconBg: 'bg-rose-950/60 border-rose-500/30 text-rose-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(244,63,94,0.15)]',
    },
    blue: {
      border: 'hover:border-blue-500/40',
      iconBg: 'bg-blue-950/60 border-blue-500/30 text-blue-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.15)]',
    },
  }[accentColor];

  return (
    <div
      className={`glass-panel p-5 rounded-xl border border-slate-800 transition-all duration-200 group ${
        accentStyles.border
      } ${accentStyles.glow} ${alert ? 'border-rose-500/50 bg-rose-950/10' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-400 tracking-wide leading-snug break-words whitespace-normal" title={title}>{title}</p>
          <h4 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-white mt-1.5 tracking-tight font-sans break-words leading-tight">
            {value}
          </h4>
        </div>
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${accentStyles.iconBg}`}
        >
          {icon}
        </div>
      </div>

      {(change || subtitle) && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5 text-xs">
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold text-[11px] shrink-0 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-400 text-[11px] leading-tight break-words" title={subtitle}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

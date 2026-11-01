import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  icon,
  headerAction,
  footer,
  interactive = false,
}) => {
  return (
    <div
      className={`glass-panel rounded-xl overflow-hidden transition-all duration-200 ${
        interactive ? 'glass-panel-hover cursor-pointer' : ''
      } ${className}`}
    >
      {(title || headerAction || icon) && (
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-cyan-400">{icon}</div>}
            <div className="min-w-0">
              {title && <h3 className="font-semibold text-slate-100 text-sm md:text-base truncate">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/40 text-xs text-slate-400">{footer}</div>}
    </div>
  );
};

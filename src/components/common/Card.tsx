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
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="p-2 rounded-lg bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] text-cyan-400">{icon}</div>}
            <div className="min-w-0">
              {title && <h3 className="font-semibold text-[var(--text-main)] text-sm md:text-base truncate">{title}</h3>}
              {subtitle && <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-card-subtle)] text-xs text-[var(--text-muted)]">{footer}</div>}
    </div>
  );
};

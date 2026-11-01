import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading procurement data...',
  rows = 4,
}) => {
  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-center gap-3 py-6 text-slate-400">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-slate-800/40 border border-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
};

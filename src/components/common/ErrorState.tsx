import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load records',
  message = 'An unexpected error occurred while querying the multi-entity ledger. Please try again.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border border-rose-900/50 rounded-2xl bg-rose-950/20 my-4">
      <div className="w-12 h-12 rounded-xl bg-rose-900/40 border border-rose-600/40 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-rose-200">{title}</h4>
      <p className="text-xs text-rose-300/80 max-w-sm mt-1 mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          className="border-rose-700/60 text-rose-200 hover:bg-rose-900/40"
        >
          Retry Request
        </Button>
      )}
    </div>
  );
};

import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export type ConfirmationIntent = 'primary' | 'danger' | 'warning' | 'success';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  intent?: ConfirmationIntent;
  details?: { label: string; value: string | React.ReactNode }[];
  isProcessing?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  intent = 'primary',
  details,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (intent) {
      case 'danger':
        return <XCircle className="w-6 h-6 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
      case 'primary':
      default:
        return <ShieldAlert className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getHeaderBg = () => {
    switch (intent) {
      case 'danger':
        return 'bg-rose-950/40 border-rose-800/40';
      case 'warning':
        return 'bg-amber-950/40 border-amber-800/40';
      case 'success':
        return 'bg-emerald-950/40 border-emerald-800/40';
      case 'primary':
      default:
        return 'bg-cyan-950/40 border-cyan-800/40';
    }
  };

  const getConfirmButtonVariant = () => {
    switch (intent) {
      case 'danger':
        return 'danger';
      case 'success':
        return 'primary';
      case 'warning':
        return 'outline';
      case 'primary':
      default:
        return 'primary';
    }
  };

  const getConfirmButtonCustomClass = () => {
    switch (intent) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 text-white border-none';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white';
      case 'primary':
      default:
        return 'bg-cyan-600 hover:bg-cyan-500 text-white';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-xs">
        {/* Banner with icon and description */}
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${getHeaderBg()}`}>
          <div className="shrink-0 mt-0.5">{getIcon()}</div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-100 text-sm">{title}</h4>
            <p className="text-slate-300 leading-relaxed text-xs">{description}</p>
          </div>
        </div>

        {/* Optional Structured Details Box */}
        {details && details.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 font-mono text-[11px]">
            {details.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-400 font-sans text-xs">{item.label}:</span>
                <span className="text-slate-200 font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
          <span>This action will update the central database and notify all connected stakeholders.</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
          <Button variant="outline" type="button" onClick={onClose} disabled={isProcessing}>
            {cancelText}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonCustomClass()}`}
          >
            {isProcessing ? 'Processing…' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

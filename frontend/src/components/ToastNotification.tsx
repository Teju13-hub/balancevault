import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-app-success" />,
    error: <AlertCircle className="w-5 h-5 text-app-error" />,
    warning: <AlertCircle className="w-5 h-5 text-app-warning" />,
    info: <Info className="w-5 h-5 text-app-info" />,
  };

  const bgMap = {
    success: 'bg-white border-soft-sage',
    error: 'bg-white border-red-200',
    warning: 'bg-white border-amber-200',
    info: 'bg-white border-blue-200',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-4 rounded-2xl border shadow-modal flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-bottom-5 ${bgMap[toast.type]}`}
        >
          <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-primary-text">{toast.title}</h5>
            {toast.message && <p className="text-[11px] text-secondary-text mt-0.5 leading-snug">{toast.message}</p>}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg text-secondary-text hover:text-primary-text hover:bg-light-bg"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};


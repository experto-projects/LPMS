import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationToastProps {
  message: string | null;
  type: NotificationType;
  onClear: () => void;
  autoCloseMs?: number;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  type,
  onClear,
  autoCloseMs = 6000,
}) => {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClear();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [message, autoCloseMs, onClear]);

  if (!message) return null;

  const styles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
    },
    info: {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      icon: <Info className="h-5 w-5 text-indigo-500 shrink-0" />,
    },
  };

  const currentStyle = styles[type];

  return (
    <div
      className={`rounded-xl border p-4 flex items-start justify-between gap-3 shadow-sm ${currentStyle.bg} transition-all duration-150`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {currentStyle.icon}
        <div className="text-sm font-medium leading-relaxed">{message}</div>
      </div>
      <button
        onClick={onClear}
        className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0 text-current opacity-60 hover:opacity-100"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

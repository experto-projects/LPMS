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
      bg: 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300',
      icon: <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-950/20 border-rose-900/40 text-rose-300',
      icon: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
    },
    info: {
      bg: 'bg-zinc-900 border-zinc-800 text-zinc-300',
      icon: <Info className="h-5 w-5 text-zinc-400 shrink-0" />,
    },
  };

  const currentStyle = styles[type];

  return (
    <div
      className={`rounded-xl border p-4 flex items-start justify-between gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${currentStyle.bg} transition-all duration-150 font-sans`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {currentStyle.icon}
        <div className="text-sm font-medium leading-relaxed">{message}</div>
      </div>
      <button
        onClick={onClear}
        className="p-1 rounded-lg hover:bg-zinc-800/80 transition-colors shrink-0 text-current opacity-60 hover:opacity-100"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

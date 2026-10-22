import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

const toastStyles = {
  success: {
    icon: FiCheckCircle,
    accent: 'text-success-600',
    ring: 'border-success-100',
  },
  error: {
    icon: FiAlertCircle,
    accent: 'text-danger-600',
    ring: 'border-danger-100',
  },
  info: {
    icon: FiInfo,
    accent: 'text-brand-600',
    ring: 'border-brand-100',
  },
};

export default function ToastViewport({ toasts = [], onDismiss }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-end gap-2 px-4 pt-4 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
    >
      {toasts.map((toast) => {
        const style = toastStyles[toast.variant] || toastStyles.info;
        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-white p-4 shadow-lift animate-slide-up ${style.ring}`}
          >
            <Icon
              className={`mt-0.5 h-5 w-5 shrink-0 ${style.accent}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{toast.description}</p>
              ) : null}
            </div>
            {onDismiss ? (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="-mr-1 -mt-1 rounded-md p-1 text-ink-subtle transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                aria-label="Dismiss notification"
              >
                <FiX className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

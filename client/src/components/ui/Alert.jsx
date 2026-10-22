import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';

const variantStyles = {
  error: {
    wrapper: 'border-danger-100 bg-danger-50 text-danger-700',
    icon: FiAlertCircle,
  },
  success: {
    wrapper: 'border-success-100 bg-success-50 text-success-700',
    icon: FiCheckCircle,
  },
  warning: {
    wrapper: 'border-amber-200 bg-warning-50 text-warning-700',
    icon: FiAlertTriangle,
  },
  info: {
    wrapper: 'border-brand-100 bg-brand-50 text-brand-800',
    icon: FiInfo,
  },
};

export default function Alert({ variant = 'info', title, children, className = '' }) {
  const style = variantStyles[variant] || variantStyles.info;
  const Icon = style.icon;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${style.wrapper} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className={`${title ? 'mt-0.5' : ''} leading-relaxed`}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}

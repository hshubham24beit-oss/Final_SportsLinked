import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';

const variantStyles = {
  error: {
    wrapper: 'border-danger-600/20 bg-danger-50 text-danger-700',
    icon: FiAlertCircle,
  },
  success: {
    wrapper: 'border-verified/20 bg-verified-soft text-verified',
    icon: FiCheckCircle,
  },
  warning: {
    wrapper: 'border-pending/20 bg-pending-soft text-pending',
    icon: FiAlertTriangle,
  },
  info: {
    wrapper: 'border-track/20 bg-track/10 text-track',
    icon: FiInfo,
  },
};

export default function Alert({ variant = 'info', title, children, className = '' }) {
  const style = variantStyles[variant] || variantStyles.info;
  const Icon = style.icon;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-tile border px-3.5 py-3 text-sm ${style.wrapper} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-extrabold">{title}</p> : null}
        {children ? (
          <div className={`${title ? 'mt-0.5' : ''} leading-relaxed`}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}

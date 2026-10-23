const variantStyles = {
  neutral: 'border-line-strong bg-unverified-soft text-unverified',
  brand: 'border-track/20 bg-track/10 text-track',
  success: 'border-verified/20 bg-verified-soft text-verified',
  warning: 'border-pending/20 bg-pending-soft text-pending',
  danger: 'border-danger-600/20 bg-danger-50 text-danger-700',
  info: 'border-navy/15 bg-navy/5 text-navy',
};

const sizeStyles = {
  sm: 'px-2.5 py-1 text-[10px]',
  md: 'px-3 py-1 text-[11px]',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-extrabold uppercase tracking-[0.08em]',
        variantStyles[variant] || variantStyles.neutral,
        sizeStyles[size] || sizeStyles.md,
        className,
      ].join(' ')}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

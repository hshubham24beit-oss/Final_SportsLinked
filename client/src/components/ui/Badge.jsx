const variantStyles = {
  neutral: 'border-line-strong bg-slate-50 text-ink-muted',
  brand: 'border-brand-200 bg-brand-50 text-brand-700',
  success: 'border-emerald-200 bg-success-50 text-success-700',
  warning: 'border-amber-200 bg-warning-50 text-warning-700',
  danger: 'border-red-200 bg-danger-50 text-danger-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
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
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
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

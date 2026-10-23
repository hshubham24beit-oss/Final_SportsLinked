import { forwardRef } from 'react';
import Spinner from './Spinner';

const baseStyles =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-extrabold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track focus-visible:ring-offset-2 focus-visible:ring-offset-ivory disabled:cursor-not-allowed disabled:opacity-55';

const variantStyles = {
  primary: 'bg-track text-white shadow-sm hover:bg-track/90 active:translate-y-px',
  dark: 'bg-navy text-ivory hover:bg-navy/90 active:translate-y-px',
  secondary: 'border border-line-strong bg-white text-navy hover:border-track/40 hover:bg-sand',
  ghost: 'text-body hover:bg-sand hover:text-navy',
  gold: 'bg-gold text-navy hover:bg-gold/90 active:translate-y-px',
  onDark: 'border border-ivory/30 bg-transparent text-ivory hover:bg-ivory/10',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
  link: 'min-h-0 px-0 text-track underline-offset-4 hover:underline',
};

const sizeStyles = {
  sm: 'min-h-11 px-4 text-sm',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
} = {}) {
  return [
    baseStyles,
    variantStyles[variant] || variantStyles.primary,
    sizeStyles[size] || sizeStyles.md,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    isLoading = false,
    leftIcon = null,
    rightIcon = null,
    className = '',
    disabled = false,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <Spinner size={size === 'lg' ? 'md' : 'sm'} /> : leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
      {isLoading ? <span className="sr-only">Working, please wait</span> : null}
    </button>
  );
});

export default Button;

const sizeStyles = {
  sm: {
    mark: 'h-8 w-8',
    word: 'text-lg',
  },
  md: {
    mark: 'h-10 w-10',
    word: 'text-xl',
  },
  lg: {
    mark: 'h-14 w-14',
    word: 'text-3xl',
  },
};

export function LogoMark({ className = '', variant = 'default' }) {
  const square = variant === 'onDark' ? 'fill-ivory' : 'fill-navy';
  const stroke = variant === 'onDark' ? 'stroke-navy' : 'stroke-ivory';
  const linked = variant === 'onDark' ? 'fill-gold' : 'fill-track';

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="SportLinked"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="16" className={square} />
      <path
        d="M44 18C38 14 30 14 26 19C22 24 25 29 32 32C39 35 42 40 37 45C33 49 26 48 20 46"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className={stroke}
      />
      <circle cx="46" cy="17" r="6" className="fill-gold" />
      <circle cx="18" cy="47" r="6" className={linked} />
    </svg>
  );
}

export default function Logo({
  size = 'md',
  showWordmark = true,
  variant = 'default',
  className = '',
}) {
  const style = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="SportLinked"
    >
      <LogoMark className={`shrink-0 ${style.mark}`} variant={variant} />
      {showWordmark ? (
        <span
          className={`font-display font-semibold tracking-[-0.02em] ${style.word} ${
            variant === 'onDark' ? 'text-ivory' : 'text-navy'
          }`}
        >
          Sport
          <span className={variant === 'onDark' ? 'text-gold' : 'text-track'}>
            Linked
          </span>
        </span>
      ) : null}
    </span>
  );
}

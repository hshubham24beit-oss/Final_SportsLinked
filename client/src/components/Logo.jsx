const sizeStyles = {
  sm: {
    mark: 'h-8 w-8 rounded-lg text-[13px]',
    word: 'text-base',
  },
  md: {
    mark: 'h-9 w-9 rounded-lg text-sm',
    word: 'text-lg',
  },
  lg: {
    mark: 'h-11 w-11 rounded-xl text-base',
    word: 'text-xl',
  },
};

export default function Logo({ size = 'md', showWordmark = true, className = '' }) {
  const style = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="SportLinked"
    >
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center bg-ink font-bold tracking-tight text-white ${style.mark}`}
      >
        <span>S</span>
        <span className="text-brand-300">L</span>
      </span>
      {showWordmark ? (
        <span className={`font-semibold tracking-tight text-ink ${style.word}`}>
          Sport<span className="text-brand-700">Linked</span>
        </span>
      ) : null}
    </span>
  );
}

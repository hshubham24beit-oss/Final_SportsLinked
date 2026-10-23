import { FiX } from 'react-icons/fi';

export default function Chip({
  children,
  active = false,
  count = null,
  onClick,
  onRemove,
  className = '',
  ...rest
}) {
  const classes = [
    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-extrabold transition-colors',
    active
      ? 'border-navy bg-navy text-ivory'
      : 'border-line-strong bg-white text-body hover:border-track/40 hover:bg-sand hover:text-navy',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span>{children}</span>
      {count !== null && count !== undefined ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
            active ? 'bg-white/15 text-ivory' : 'bg-sand-deep text-slate'
          }`}
        >
          {count}
        </span>
      ) : null}
    </>
  );

  if (onClick && !onRemove) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={classes} {...rest}>
        {content}
      </button>
    );
  }

  return (
    <span className={classes} {...rest}>
      {onClick ? (
        <button type="button" onClick={onClick} aria-pressed={active} className="contents">
          {content}
        </button>
      ) : (
        content
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${typeof children === 'string' ? children : 'item'}`}
          className="-mr-1 rounded-full p-0.5 transition-colors hover:bg-track/10 hover:text-track focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
        >
          <FiX className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

import { FiInbox } from 'react-icons/fi';

export default function EmptyState({
  icon,
  title,
  description,
  action = null,
  className = '',
}) {
  const IconComponent = icon || FiInbox;

  return (
    <div
      className={`rounded-xl border border-dashed border-line-strong bg-slate-50/60 px-6 py-10 text-center ${className}`}
    >
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-brand-100 bg-brand-50 text-brand-700">
        <IconComponent className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

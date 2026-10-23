import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ icon, title, description, action = null, className = '' }) {
  const IconComponent = icon || FiInbox;

  return (
    <div
      className={`rounded-card border border-dashed border-line-strong bg-sand/60 px-6 py-10 text-center ${className}`}
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-track/15 bg-track/10 text-track">
        <IconComponent className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold text-navy">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

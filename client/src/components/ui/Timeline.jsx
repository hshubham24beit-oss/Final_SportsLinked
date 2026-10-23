export default function Timeline({ items = [], className = '' }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ol className={`relative space-y-5 border-l-2 border-gold/50 pl-6 ${className}`}>
      {items.map((item, index) => (
        <li key={item.id || `${item.title}-${index}`} className="relative">
          <span
            className={`absolute -left-[1.95rem] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-ivory ${
              item.current ? 'bg-track' : 'bg-gold'
            }`}
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-display text-base font-semibold text-navy">{item.title}</h3>
            {item.meta ? (
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate">
                {item.meta}
              </span>
            ) : null}
          </div>
          {item.subtitle ? <p className="mt-0.5 text-sm font-bold text-track">{item.subtitle}</p> : null}
          {item.description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-slate">{item.description}</p>
          ) : null}
          {item.children}
        </li>
      ))}
    </ol>
  );
}

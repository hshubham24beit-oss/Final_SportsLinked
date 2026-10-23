export default function StatCard({
  label,
  value,
  detail = null,
  icon = null,
  tone = 'track',
  className = '',
}) {
  const toneStyles = {
    track: 'bg-track/10 text-track',
    navy: 'bg-navy/5 text-navy',
    verified: 'bg-verified-soft text-verified',
    gold: 'bg-gold/15 text-navy',
  };

  return (
    <div className={`surface-card p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate">
            {label}
          </p>
          <p className="stat-number mt-2">{value}</p>
        </div>
        {icon ? (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              toneStyles[tone] || toneStyles.track
            }`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-sm leading-relaxed text-slate">{detail}</p> : null}
    </div>
  );
}

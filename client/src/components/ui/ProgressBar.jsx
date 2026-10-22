export default function ProgressBar({
  value = 0,
  label,
  showValue = true,
  className = '',
  tone = 'brand',
}) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0));
  const toneClass = tone === 'success' ? 'bg-success-600' : 'bg-brand-600';

  return (
    <div className={className}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label ? <span className="text-xs font-medium text-ink-muted">{label}</span> : <span />}
          {showValue ? <span className="text-xs font-semibold text-ink">{percent}%</span> : null}
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label || 'Profile completion'}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${toneClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

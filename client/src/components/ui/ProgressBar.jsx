export default function ProgressBar({
  value = 0,
  label,
  showValue = true,
  className = '',
  tone = 'brand',
}) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0));
  const toneClass = tone === 'success' ? 'bg-verified' : 'bg-track';

  return (
    <div className={className}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label ? <span className="text-xs font-bold text-slate">{label}</span> : <span />}
          {showValue ? <span className="text-xs font-extrabold text-navy">{percent}%</span> : null}
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-sand-deep"
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

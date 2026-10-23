export default function ProgressRing({
  value = 0,
  size = 120,
  strokeWidth = 8,
  label = 'Profile completion',
  className = '',
  showLabel = true,
}) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-sand-deep"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-track transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {showLabel ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold text-navy">{percent}%</span>
          <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate">
            Complete
          </span>
        </span>
      ) : null}
    </div>
  );
}

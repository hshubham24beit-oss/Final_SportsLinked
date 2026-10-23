import { useId } from 'react';

export default function Checkbox({
  label,
  description = null,
  checked = false,
  onChange,
  name,
  disabled = false,
  className = '',
  ...rest
}) {
  const generatedId = useId();
  const id = rest.id || generatedId;

  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-white px-3.5 py-3 transition-colors hover:bg-sand ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      } ${className}`}
    >
      <input
        {...rest}
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-track accent-track focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track focus-visible:ring-offset-2"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-navy">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-slate">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

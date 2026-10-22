import { forwardRef, useId } from 'react';

const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    id,
    options = [],
    placeholder = null,
    className = '',
    containerClassName = '',
    required = false,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      {label ? (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger-600" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={[
          'w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-ink shadow-sm transition focus:outline-none focus:ring-2 sm:text-sm',
          error
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-line-strong focus:border-brand-500 focus:ring-brand-600/20',
          className,
        ].join(' ')}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-ink-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default Select;

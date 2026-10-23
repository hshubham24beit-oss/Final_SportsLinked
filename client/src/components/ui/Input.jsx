import { forwardRef, useId } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    id,
    className = '',
    containerClassName = '',
    startIcon = null,
    endAdornment = null,
    required = false,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      {label ? (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger-600" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div className="relative">
        {startIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate">
            {startIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={[
            'min-h-11 w-full rounded-tile border bg-white py-2.5 text-base text-navy shadow-sm transition placeholder:text-slate/70 focus:outline-none focus:ring-2 sm:text-sm',
            error
              ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
              : 'border-line-strong focus:border-track focus:ring-track/15',
            startIcon ? 'pl-10' : 'pl-3.5',
            endAdornment ? 'pr-12' : 'pr-3.5',
            className,
          ].join(' ')}
          {...rest}
        />
        {endAdornment ? (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{endAdornment}</span>
        ) : null}
      </div>

      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-slate">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-semibold text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default Input;

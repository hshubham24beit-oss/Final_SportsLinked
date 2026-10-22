import { forwardRef, useId } from 'react';

const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    hint,
    id,
    rows = 4,
    className = '',
    containerClassName = '',
    required = false,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      {label ? (
        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger-600" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={[
          'w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-base text-ink shadow-sm transition placeholder:text-ink-subtle focus:outline-none focus:ring-2 sm:text-sm',
          error
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-line-strong focus:border-brand-500 focus:ring-brand-600/20',
          className,
        ].join(' ')}
        {...rest}
      />

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

export default Textarea;

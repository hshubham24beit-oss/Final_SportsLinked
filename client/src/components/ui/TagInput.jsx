import { useId, useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';

export default function TagInput({
  label,
  value = [],
  onChange,
  placeholder = 'Type and press Enter',
  hint,
  error,
  max = 12,
  maxLength = 80,
  required = false,
}) {
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const addDraft = () => {
    const candidate = draft.trim();
    if (!candidate) {
      return;
    }
    const exists = value.some((item) => item.toLowerCase() === candidate.toLowerCase());
    if (!exists && value.length < max) {
      onChange([...value, candidate]);
    }
    setDraft('');
  };

  const removeAt = (index) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div>
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

      <div
        className={`rounded-tile border bg-white px-3 py-2 shadow-sm transition focus-within:ring-2 ${
          error
            ? 'border-danger-500 focus-within:border-danger-500 focus-within:ring-danger-500/20'
            : 'border-line-strong focus-within:border-track focus-within:ring-track/15'
        }`}
      >
        {value.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {value.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-track/20 bg-track/10 px-2.5 py-1 text-xs font-bold text-track"
              >
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="rounded-full p-0.5 text-track transition-colors hover:bg-track/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                  aria-label={`Remove ${item}`}
                >
                  <FiX className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            id={inputId}
            type="text"
            value={draft}
            maxLength={maxLength}
            disabled={value.length >= max}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addDraft();
              }
              if (event.key === 'Backspace' && !draft && value.length > 0) {
                removeAt(value.length - 1);
              }
            }}
            onBlur={addDraft}
            placeholder={value.length >= max ? `Limit of ${max} reached` : placeholder}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? 'true' : undefined}
            className="min-w-0 flex-1 border-0 bg-transparent px-0.5 py-1 text-base text-navy placeholder:text-slate/70 focus:outline-none focus:ring-0 sm:text-sm"
          />
          <button
            type="button"
            onClick={addDraft}
            onMouseDown={(event) => event.preventDefault()}
            disabled={!draft.trim() || value.length >= max}
            className="rounded-full p-1.5 text-track transition-colors hover:bg-track/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
            aria-label="Add item"
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
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
}

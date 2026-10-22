import { useRef } from 'react';
import { FiCamera, FiImage, FiTrash2 } from 'react-icons/fi';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';

export default function ImageUploader({
  name,
  label,
  description,
  imageUrl,
  onFile,
  onClear,
  isUploading = false,
  isClearing = false,
  variant = 'avatar',
}) {
  const inputRef = useRef(null);

  const handleChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      onFile(file);
    }
    event.target.value = '';
  };

  const isCover = variant === 'cover';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current && inputRef.current.click()}
          disabled={isUploading || isClearing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          {isUploading ? <Spinner size="sm" /> : <FiCamera className="h-3.5 w-3.5" aria-hidden="true" />}
          {imageUrl ? 'Change' : 'Upload'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current && inputRef.current.click()}
        disabled={isUploading || isClearing}
        className={`group relative flex w-full items-center justify-center overflow-hidden border border-line bg-slate-50 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed ${
          isCover ? 'h-36 rounded-xl sm:h-44' : 'h-24 w-24 rounded-full'
        }`}
        aria-label={`${label}: ${imageUrl ? 'change image' : 'upload image'}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : isCover ? (
          <span className="flex flex-col items-center gap-1.5 text-ink-subtle">
            <FiImage className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-medium">Add a cover image</span>
          </span>
        ) : (
          <Avatar name={name} size="xl" />
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-ink/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="rounded-full bg-white/95 p-2 text-ink shadow-sm">
            {isUploading ? <Spinner size="sm" /> : <FiCamera className="h-4 w-4" aria-hidden="true" />}
          </span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
        tabIndex={-1}
      />
      {imageUrl && onClear ? (
        <button
          type="button"
          onClick={onClear}
          disabled={isUploading || isClearing}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-danger-600 transition-colors hover:text-danger-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600"
        >
          <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {isCover ? 'Remove cover' : 'Remove photo'}
        </button>
      ) : null}
      <p className="mt-1.5 text-[11px] text-ink-subtle">JPEG, PNG or WebP · max 5 MB</p>
    </div>
  );
}

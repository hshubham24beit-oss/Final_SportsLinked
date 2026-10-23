import { useEffect, useState } from 'react';
import { getInitials } from '../../utils/format';

const sizeStyles = {
  xs: 'h-8 w-8 text-[11px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
  '2xl': 'h-[120px] w-[120px] text-3xl',
};

export default function Avatar({ name = '', src = null, size = 'md', className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const dimensions = sizeStyles[size] || sizeStyles.md;

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s avatar` : 'User avatar'}
        onError={() => setImageFailed(true)}
        className={`${dimensions} shrink-0 rounded-full border-[3px] border-white object-cover shadow-sm ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-sand-deep font-display font-semibold uppercase tracking-wide text-navy ${className}`}
    >
      {getInitials(name)}
    </span>
  );
}

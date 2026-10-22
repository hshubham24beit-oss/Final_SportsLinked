export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'SL';
  }
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function getFirstName(name = '') {
  return String(name).trim().split(/\s+/)[0] || '';
}

export function formatDate(value, options = {}) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatRelativeTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(seconds) < 60) {
    return 'Just now';
  }
  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute');
  }
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }
  if (Math.abs(days) < 7) {
    return formatter.format(days, 'day');
  }
  if (Math.abs(weeks) < 5) {
    return formatter.format(weeks, 'week');
  }
  return formatDate(value);
}

export function formatDateTime(value) {
  return formatDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

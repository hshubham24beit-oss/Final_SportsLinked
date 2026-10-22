export const EVENT_TYPE_OPTIONS = [
  { value: 'competition', label: 'Competition' },
  { value: 'trial', label: 'Trial' },
  { value: 'training', label: 'Training session' },
  { value: 'camp', label: 'Camp' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'community', label: 'Community event' },
  { value: 'other', label: 'Other' },
];

export const EVENT_TYPE_LABELS = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export const EVENT_STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const EVENT_REGISTRATION_STATUS_LABELS = {
  registered: 'Registered',
  waitlisted: 'Waitlisted',
  interested: 'Interested',
  cancelled: 'Cancelled',
};

export const EVENT_SORT_OPTIONS = [
  { value: 'date', label: 'Soonest first' },
  { value: 'recent', label: 'Recently published' },
  { value: 'title', label: 'Title A-Z' },
];

const STATUS_VARIANTS = {
  draft: 'neutral',
  published: 'success',
  cancelled: 'danger',
  completed: 'info',
};

const REGISTRATION_VARIANTS = {
  registered: 'success',
  waitlisted: 'warning',
  interested: 'info',
  cancelled: 'neutral',
};

export function eventStatusVariant(status) {
  return STATUS_VARIANTS[status] || 'neutral';
}

export function registrationStatusVariant(status) {
  return REGISTRATION_VARIANTS[status] || 'neutral';
}

export function eventTypeLabel(type) {
  return EVENT_TYPE_LABELS[type] || 'Event';
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function toDateTimeInput(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function emptyEventForm() {
  return {
    title: '',
    description: '',
    sport: '',
    type: 'community',
    startAt: '',
    endAt: '',
    registrationDeadline: '',
    capacity: '24',
    allowWaitlist: true,
    venueName: '',
    address: '',
    city: '',
    region: '',
    country: '',
  };
}

export function eventToForm(event) {
  return {
    title: event.title || '',
    description: event.description || '',
    sport: event.sport || '',
    type: event.type || 'community',
    startAt: toDateTimeInput(event.startAt),
    endAt: toDateTimeInput(event.endAt),
    registrationDeadline: toDateTimeInput(event.registrationDeadline),
    capacity: String(event.capacity || 1),
    allowWaitlist: event.allowWaitlist !== false,
    venueName: event.venue?.name || '',
    address: event.venue?.address || '',
    city: event.venue?.location?.city || '',
    region: event.venue?.location?.region || '',
    country: event.venue?.location?.country || '',
  };
}

export function eventPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    sport: form.sport.trim(),
    type: form.type,
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    registrationDeadline: new Date(form.registrationDeadline).toISOString(),
    capacity: Number(form.capacity),
    allowWaitlist: Boolean(form.allowWaitlist),
    venue: {
      name: form.venueName.trim(),
      address: form.address.trim(),
      location: {
        city: form.city.trim(),
        region: form.region.trim(),
        country: form.country.trim(),
      },
    },
  };
}

export function eventLocation(event) {
  return [
    event.venue?.location?.city,
    event.venue?.location?.region,
    event.venue?.location?.country,
  ]
    .filter(Boolean)
    .join(', ');
}

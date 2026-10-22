import { Link } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiUsers } from 'react-icons/fi';
import Badge from '../ui/Badge';
import { formatDateTime } from '../../utils/format';
import {
  eventStatusVariant,
  eventTypeLabel,
  eventLocation,
  EVENT_STATUS_LABELS,
} from '../../utils/events';

export default function EventCard({ event, showStatus = false }) {
  const location = eventLocation(event);

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex h-full flex-col rounded-xl border border-line bg-white p-5 shadow-card transition hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant="brand" size="sm">
          {eventTypeLabel(event.type)}
        </Badge>
        {showStatus ? (
          <Badge variant={eventStatusVariant(event.status)} size="sm">
            {EVENT_STATUS_LABELS[event.status] || event.status}
          </Badge>
        ) : event.registered ? (
          <Badge variant="success" size="sm">
            Registered
          </Badge>
        ) : event.waitlisted ? (
          <Badge variant="warning" size="sm">
            Waitlisted
          </Badge>
        ) : event.interested ? (
          <Badge variant="info" size="sm">
            Interested
          </Badge>
        ) : null}
      </div>

      <h2 className="mt-3 text-base font-semibold leading-snug text-ink group-hover:text-brand-800">
        {event.title}
      </h2>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
        {event.description}
      </p>

      <div className="mt-4 space-y-2 text-xs text-ink-subtle">
        <p className="flex items-center gap-2">
          <FiCalendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {formatDateTime(event.startAt)}
        </p>
        <p className="flex items-center gap-2">
          <FiMapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {event.venue?.name || location || 'Location to be confirmed'}
        </p>
        <p className="flex items-center gap-2">
          <FiUsers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {event.registrationCount || 0} of {event.capacity} places filled
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-xs">
        <span className="truncate text-ink-subtle">By {event.organizerName}</span>
        <span className="font-semibold text-brand-700">
          {event.spotsRemaining > 0 ? `${event.spotsRemaining} spots left` : 'Waitlist'}
        </span>
      </div>
    </Link>
  );
}

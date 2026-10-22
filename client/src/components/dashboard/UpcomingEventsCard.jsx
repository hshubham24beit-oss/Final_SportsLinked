import { Link } from 'react-router-dom';
import { FiCalendar } from 'react-icons/fi';
import Badge from '../ui/Badge';
import { buttonClasses } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { formatDateTime } from '../../utils/format';
import {
  eventStatusVariant,
  EVENT_STATUS_LABELS,
  registrationStatusVariant,
  EVENT_REGISTRATION_STATUS_LABELS,
} from '../../utils/events';

export default function UpcomingEventsCard({ events = [] }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Upcoming events</CardTitle>
            <CardDescription>
              Events you registered for, expressed interest in, or organize.
            </CardDescription>
          </div>
          <Link
            to="/events"
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            Browse events
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {events.length ? (
          <div className="space-y-2.5">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{event.title}</p>
                  <p className="truncate text-xs text-ink-subtle">
                    {formatDateTime(event.startAt)}
                    {event.city ? ` - ${event.city}` : ''} - by {event.organizerName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {event.organized ? (
                    <Badge size="sm" variant="brand">
                      Organizer
                    </Badge>
                  ) : null}
                  {event.registrationStatus ? (
                    <Badge
                      size="sm"
                      variant={registrationStatusVariant(event.registrationStatus)}
                    >
                      {EVENT_REGISTRATION_STATUS_LABELS[event.registrationStatus] ||
                        event.registrationStatus}
                    </Badge>
                  ) : (
                    <Badge size="sm" variant={eventStatusVariant(event.status)}>
                      {EVENT_STATUS_LABELS[event.status] || event.status}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line-strong bg-slate-50/60 px-5 py-8 text-center">
            <FiCalendar className="mx-auto h-5 w-5 text-brand-700" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-ink">No upcoming events</p>
            <p className="mt-1 text-sm text-ink-muted">
              Register for an event or create your own to see it here.
            </p>
            <Link to="/events" className={`${buttonClasses({ size: 'sm' })} mt-4`}>
              Explore events
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

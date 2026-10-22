import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import PageLoader from '../components/PageLoader';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { eventsApi } from '../api/events.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime } from '../utils/format';
import { getErrorMessage } from '../utils/apiError';
import {
  registrationStatusVariant,
  EVENT_REGISTRATION_STATUS_LABELS,
} from '../utils/events';

const PAGE_SIZE = 24;

export default function EventRegistrants() {
  const { id } = useParams();
  useDocumentTitle('Event registrants');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [registrants, setRegistrants] = useState([]);
  const [event, setEvent] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await eventsApi.registrants(id, {
        status,
        page,
        limit: PAGE_SIZE,
      });
      setRegistrants(response.data.data.registrants || []);
      setEvent(response.data.data.event);
      setStatusCounts(response.data.data.statusCounts || {});
      setMeta(response.data.meta || { page, total: 0, totalPages: 0 });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setRegistrants([]);
    } finally {
      setIsLoading(false);
    }
  }, [id, page, status]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading && !event) return <PageLoader message="Loading registrants..." />;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to={`/events/${id}`}
        className="text-sm font-medium text-ink-muted hover:text-ink"
      >
        Back to event
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Registrants
      </h1>
      {event ? (
        <p className="mt-1.5 text-sm text-ink-muted">
          {event.title} - {event.capacity} places
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {['registered', 'waitlisted', 'interested', 'cancelled'].map((key) => (
          <div key={key} className="rounded-xl border border-line bg-white p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
              {EVENT_REGISTRATION_STATUS_LABELS[key]}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink">{statusCounts[key] || 0}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 max-w-xs">
        <Select
          label="Filter by status"
          placeholder="All statuses"
          value={status}
          onChange={(event_) => {
            setStatus(event_.target.value);
            setPage(1);
          }}
          options={Object.entries(EVENT_REGISTRATION_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      {error ? (
        <Alert variant="error" title="Registrants could not be loaded" className="mt-5">
          {error}
        </Alert>
      ) : null}

      {!isLoading && !error && registrants.length === 0 ? (
        <EmptyState
          className="mt-5"
          title="No registrants match this filter"
          description="Registrations will appear here as members register or express interest."
        />
      ) : null}

      {registrants.length > 0 ? (
        <>
          <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white shadow-card">
            <ul className="divide-y divide-line">
              {registrants.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {entry.user?.name || 'Deleted member'}
                    </p>
                    <p className="truncate text-xs text-ink-subtle">
                      {entry.user?.email || 'Unavailable'} - joined{' '}
                      {formatDateTime(entry.registeredAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.user?.role ? (
                      <Badge size="sm" variant="neutral">
                        {entry.user.role}
                      </Badge>
                    ) : null}
                    <Badge size="sm" variant={registrationStatusVariant(entry.status)}>
                      {EVENT_REGISTRATION_STATUS_LABELS[entry.status] || entry.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

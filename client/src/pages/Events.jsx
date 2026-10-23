import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiPlus, FiSearch } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import { buttonClasses } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { SkeletonCard } from '../components/ui/Skeleton';
import EventCard from '../components/events/EventCard';
import { eventsApi } from '../api/events.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../utils/apiError';
import { EVENT_SORT_OPTIONS, EVENT_TYPE_OPTIONS } from '../utils/events';

const PAGE_SIZE = 12;

export default function Events({ mineOnly = false }) {
  useDocumentTitle(mineOnly ? 'My events' : 'Events');
  const { user } = useAuth();
  const canOrganize = ['athlete', 'coach', 'recruiter'].includes(user.role);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [type, setType] = useState('');
  const [sport, setSport] = useState('');
  const [sort, setSort] = useState('date');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = mineOnly
          ? await eventsApi.mine({ status, page, limit: PAGE_SIZE })
          : await eventsApi.list({
              q: debouncedKeyword,
              type,
              sport,
              sort,
              page,
              limit: PAGE_SIZE,
            });
        if (!cancelled) {
          setEvents(response.data.data.events || []);
          setMeta(
            response.data.meta || { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setEvents([]);
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword, mineOnly, page, sort, sport, status, type]);

  const updateFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Events calendar</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            {mineOnly ? 'My ' : 'Discover '}
            <span className="display-emphasis">events.</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-body">
            {mineOnly
              ? 'Drafts, published events, and registration activity for events you organize.'
              : 'Competitions, trials, camps, training sessions, and local sport events.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canOrganize ? (
            <Link
              to={mineOnly ? '/events' : '/events/mine'}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              {mineOnly ? 'Browse events' : 'My events'}
            </Link>
          ) : null}
          {canOrganize ? (
            <Link to="/events/new" className={buttonClasses({ size: 'sm' })}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Create event
            </Link>
          ) : null}
        </div>
      </div>

      {!mineOnly ? (
        <div className="mt-6 grid gap-3 rounded-card border border-line bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            placeholder="Title, sport, venue, or organizer"
            startIcon={<FiSearch className="h-4 w-4" aria-hidden="true" />}
          />
          <Select
            label="Type"
            placeholder="All types"
            value={type}
            onChange={(event) => updateFilter(setType, event.target.value)}
            options={EVENT_TYPE_OPTIONS}
          />
          <Input
            label="Sport"
            value={sport}
            onChange={(event) => updateFilter(setSport, event.target.value)}
            placeholder="Any sport"
          />
          <Select
            label="Sort"
            value={sort}
            onChange={(event) => updateFilter(setSort, event.target.value)}
            options={EVENT_SORT_OPTIONS}
          />
        </div>
      ) : (
        <div className="mt-6 max-w-xs rounded-card border border-line bg-white p-4 shadow-card">
          <Select
            label="Status"
            placeholder="All statuses"
            value={status}
            onChange={(event) => updateFilter(setStatus, event.target.value)}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
        </div>
      )}

      {error ? (
        <Alert variant="error" title="Events could not be loaded" className="mt-6">
          {error}
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </div>
      ) : null}

      {!isLoading && !error && events.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={FiCalendar}
          title={mineOnly ? 'No events organized yet' : 'No events found'}
          description={
            mineOnly
              ? 'Create a draft event, add the schedule and venue, then publish it when ready.'
              : 'Try another search or filter. New published events will appear here.'
          }
          action={
            mineOnly && canOrganize ? (
              <Link to="/events/new" className={buttonClasses({ size: 'sm' })}>
                Create your first event
              </Link>
            ) : null
          }
        />
      ) : null}

      {!isLoading && events.length > 0 ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} showStatus={mineOnly} />
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

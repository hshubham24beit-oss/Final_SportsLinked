import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiEdit3, FiPlus, FiUsers } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { buttonClasses } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { SkeletonCard } from '../components/ui/Skeleton';
import { opportunitiesApi } from '../api/opportunities.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../utils/apiError';
import {
  formatDeadline,
  OPPORTUNITY_STATUS_OPTIONS,
  opportunityStatusLabel,
  opportunityStatusVariant,
  opportunityTypeLabel,
} from '../utils/opportunities';

const PAGE_SIZE = 12;

export default function MyOpportunities() {
  useDocumentTitle('My opportunities');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [opportunities, setOpportunities] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await opportunitiesApi.mine({ status, page, limit: PAGE_SIZE });
        if (!cancelled) {
          setOpportunities(response.data.data.opportunities || []);
          setMeta(
            response.data.meta || { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
          );
        }
      } catch (requestError) {
        if (!cancelled) setError(getErrorMessage(requestError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            My opportunities
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Draft, publish, and manage the opportunities you created.
          </p>
        </div>
        <Link to="/opportunities/new" className={buttonClasses({ size: 'sm' })}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create opportunity
        </Link>
      </div>

      <div className="mt-6 max-w-xs">
        <Select
          label="Filter by status"
          placeholder="All statuses"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={OPPORTUNITY_STATUS_OPTIONS}
        />
      </div>

      {error ? (
        <Alert variant="error" title="Could not load your opportunities" className="mt-5">
          {error}
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </div>
      ) : null}

      {!isLoading && !error && opportunities.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={FiBriefcase}
          title="No opportunities yet"
          description="Create a draft, add clear eligibility requirements, and publish it when it is ready."
          action={
            <Link to="/opportunities/new" className={buttonClasses({ size: 'sm' })}>
              Create your first opportunity
            </Link>
          }
        />
      ) : null}

      {!isLoading && opportunities.length > 0 ? (
        <>
          <div className="mt-5 space-y-3">
            {opportunities.map((opportunity) => (
              <article
                key={opportunity.id}
                className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {opportunityTypeLabel(opportunity.type)}
                    </Badge>
                    <Badge
                      variant={opportunityStatusVariant(opportunity.status)}
                      size="sm"
                    >
                      {opportunityStatusLabel(opportunity.status)}
                    </Badge>
                  </div>
                  <h2 className="mt-2 truncate text-base font-semibold text-ink">
                    {opportunity.title}
                  </h2>
                  <p className="mt-1 text-xs text-ink-muted">
                    {opportunity.sport} - apply by {formatDeadline(opportunity.deadline)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/opportunities/${opportunity.id}/applicants`}
                    className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                  >
                    <FiUsers className="h-4 w-4" aria-hidden="true" />
                    Applicants
                  </Link>
                  {['draft', 'published'].includes(opportunity.status) ? (
                    <Link
                      to={`/opportunities/${opportunity.id}/edit`}
                      className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                    >
                      <FiEdit3 className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Link>
                  ) : null}
                  <Link
                    to={`/opportunities/${opportunity.id}`}
                    className={buttonClasses({ size: 'sm' })}
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

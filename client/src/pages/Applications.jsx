import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { buttonClasses } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { SkeletonCard } from '../components/ui/Skeleton';
import { applicationsApi } from '../api/applications.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../utils/apiError';
import { formatDate } from '../utils/format';
import {
  APPLICATION_STATUS_OPTIONS,
  applicationStatusLabel,
  applicationStatusVariant,
  formatDeadline,
  opportunityTypeLabel,
} from '../utils/opportunities';

const PAGE_SIZE = 12;

export default function Applications() {
  useDocumentTitle('My applications');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [applications, setApplications] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await applicationsApi.mine({ status, page, limit: PAGE_SIZE });
        if (!cancelled) {
          setApplications(response.data.data.applications || []);
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
          <p className="eyebrow">Application tracker</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            My <span className="display-emphasis">applications.</span>
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-body">
            Track submitted applications, reviewer updates, and decisions.
          </p>
        </div>
        <Link to="/opportunities" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
          Browse opportunities
        </Link>
      </div>

      <div className="mt-6 max-w-xs">
        <Select
          label="Filter by status"
          placeholder="All applications"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={APPLICATION_STATUS_OPTIONS}
        />
      </div>

      {error ? (
        <Alert variant="error" title="Applications could not be loaded" className="mt-5">
          {error}
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[1, 2, 3].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </div>
      ) : null}

      {!isLoading && !error && applications.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={FiFileText}
          title="No applications yet"
          description="When you apply to an opportunity it will appear here with its current status."
          action={
            <Link to="/opportunities" className={buttonClasses({ size: 'sm' })}>
              Find opportunities
            </Link>
          }
        />
      ) : null}

      {!isLoading && applications.length > 0 ? (
        <>
          <div className="mt-5 space-y-3">
            {applications.map((application) => (
              <article
                key={application.id}
                className="flex flex-col gap-4 rounded-card border border-line bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {opportunityTypeLabel(application.opportunity?.type)}
                    </Badge>
                    <Badge variant={applicationStatusVariant(application.status)} size="sm">
                      {applicationStatusLabel(application.status)}
                    </Badge>
                  </div>
                  <h2 className="mt-2 truncate font-display text-xl">
                    {application.opportunity?.title || 'Opportunity unavailable'}
                  </h2>
                  <p className="mt-1 text-xs text-body">
                    {application.opportunity?.publisherName} - applied{' '}
                    {formatDate(application.createdAt)}
                    {application.opportunity?.deadline
                      ? ` - deadline ${formatDeadline(application.opportunity.deadline)}`
                      : ''}
                  </p>
                </div>
                <Link
                  to={`/applications/${application.id}`}
                  className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                >
                  View application
                </Link>
              </article>
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiExternalLink,
  FiFileText,
  FiMessageCircle,
  FiUser,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { buttonClasses } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PageLoader from '../components/PageLoader';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { applicationsApi } from '../api/applications.api';
import { opportunitiesApi } from '../api/opportunities.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate } from '../utils/format';
import {
  APPLICATION_STATUS_OPTIONS,
  applicationStatusLabel,
  applicationStatusVariant,
  opportunityStatusLabel,
  opportunityTypeLabel,
} from '../utils/opportunities';

const PAGE_SIZE = 12;

const NEXT_ACTIONS = {
  submitted: ['under_review', 'shortlisted', 'rejected'],
  under_review: ['shortlisted', 'accepted', 'rejected'],
  shortlisted: ['accepted', 'rejected'],
};

export default function Applicants() {
  useDocumentTitle('Applicants');
  const { id } = useParams();
  const toast = useToast();
  const [opportunity, setOpportunity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [opportunityResponse, applicantsResponse] = await Promise.all([
        opportunitiesApi.get(id),
        opportunitiesApi.applicants(id, { status, page, limit: PAGE_SIZE }),
      ]);
      setOpportunity(opportunityResponse.data.data.opportunity);
      setApplications(applicantsResponse.data.data.applications || []);
      setStatusCounts(applicantsResponse.data.data.statusCounts || {});
      setMeta(
        applicantsResponse.data.meta || {
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [id, page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (applicationId, nextStatus) => {
    setUpdatingId(applicationId);
    try {
      const response = await applicationsApi.updateStatus(applicationId, {
        status: nextStatus,
      });
      const updated = response.data.data.application;
      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId ? { ...application, ...updated } : application,
        ),
      );
      toast.success('Application updated', `Now ${applicationStatusLabel(nextStatus)}.`);
      load();
    } catch (requestError) {
      toast.error('Could not update application', getErrorMessage(requestError));
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading && !opportunity) return <PageLoader message="Loading applicants..." />;

  if (error && !opportunity) {
    return (
      <div>
        <Alert variant="error" title="Applicants could not be loaded">
          {error}
        </Alert>
        <Link
          to="/opportunities/mine"
          className={`${buttonClasses({ variant: 'secondary' })} mt-4`}
        >
          Back to my opportunities
        </Link>
      </div>
    );
  }

  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div>
      <Link
        to="/opportunities/mine"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy"
      >
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        My opportunities
      </Link>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" size="sm">
              {opportunityTypeLabel(opportunity.type)}
            </Badge>
            <Badge variant={opportunity.status === 'published' ? 'success' : 'neutral'} size="sm">
              {opportunityStatusLabel(opportunity.status)}
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            Applicants for {opportunity.title}
          </h1>
          <p className="mt-1.5 text-sm text-body">
            {total} application{total === 1 ? '' : 's'} received.
          </p>
        </div>
        <div className="w-full max-w-xs">
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
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {APPLICATION_STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setStatus(option.value);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              status === option.value
                ? 'border-line-strong bg-sand text-track'
                : 'border-line-strong bg-white text-body hover:bg-sand/60'
            }`}
          >
            {option.label} ({statusCounts[option.value] || 0})
          </button>
        ))}
      </div>

      {error ? (
        <Alert variant="error" className="mt-5">
          {error}
        </Alert>
      ) : null}

      {!isLoading && applications.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={FiUser}
          title="No applications here"
          description="Applications from athletes will appear here with their submitted profile snapshot."
        />
      ) : null}

      <div className="mt-5 space-y-3">
        {applications.map((application) => {
          const snapshot = application.submittedSnapshot || {};
          const actionOptions = (NEXT_ACTIONS[application.status] || []).map((value) => ({
            value,
            label: applicationStatusLabel(value),
          }));

          return (
            <article
              key={application.id}
              className="rounded-card border border-line bg-white p-5 shadow-card"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl">
                      {application.athlete?.name || snapshot.name || 'Athlete'}
                    </h2>
                    <Badge variant={applicationStatusVariant(application.status)} size="sm">
                      {applicationStatusLabel(application.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-body">
                    {snapshot.headline || 'No headline provided'}
                  </p>
                  <p className="mt-1 text-xs text-slate">
                    Applied {formatDate(application.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {actionOptions.length > 0 ? (
                    <Select
                      aria-label={`Update status for ${application.athlete?.name || 'athlete'}`}
                      placeholder="Update status"
                      value=""
                      disabled={updatingId === application.id}
                      options={actionOptions}
                      onChange={(event) => {
                        if (event.target.value) {
                          updateStatus(application.id, event.target.value);
                        }
                      }}
                      containerClassName="w-44"
                    />
                  ) : null}
                  {application.athlete?.id ? (
                    <Link
                      to={`/messages?user=${encodeURIComponent(application.athlete.id)}`}
                      className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                    >
                      Message
                      <FiMessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : null}
                  <Link
                    to={`/applications/${application.id}`}
                    className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                  >
                    View
                    <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-xs text-body sm:grid-cols-3">
                <div>
                  <dt className="font-medium text-slate">Sports</dt>
                  <dd className="mt-0.5">{(snapshot.sports || []).join(', ') || '-'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate">Level</dt>
                  <dd className="mt-0.5">
                    {(snapshot.level || '-').replace(/_/g, ' ')} /{' '}
                    {(snapshot.experienceYears ?? '-')} years
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate">Verified achievements</dt>
                  <dd className="mt-0.5">{snapshot.verifiedAchievementCount || 0}</dd>
                </div>
              </dl>

              {application.coverNote ? (
                <p className="mt-3 rounded-tile bg-sand/60 p-3 text-sm leading-relaxed text-body">
                  {application.coverNote}
                </p>
              ) : null}

              {application.documents?.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {application.documents.map((document) => (
                    <a
                      key={document._id || document.url}
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-2.5 py-1 text-xs font-medium text-body hover:text-navy"
                    >
                      <FiFileText className="h-3 w-3" aria-hidden="true" />
                      {document.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
    </div>
  );
}

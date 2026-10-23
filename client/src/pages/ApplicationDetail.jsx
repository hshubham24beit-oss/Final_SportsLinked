import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMapPin,
  FiMessageCircle,
  FiXCircle,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button, { buttonClasses } from '../components/ui/Button';
import PageLoader from '../components/PageLoader';
import Select from '../components/ui/Select';
import { applicationsApi } from '../api/applications.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate } from '../utils/format';
import {
  applicationStatusLabel,
  applicationStatusVariant,
  opportunityTypeLabel,
} from '../utils/opportunities';

const NEXT_ACTIONS = {
  submitted: ['under_review', 'shortlisted', 'rejected'],
  under_review: ['shortlisted', 'accepted', 'rejected'],
  shortlisted: ['accepted', 'rejected'],
};

export default function ApplicationDetail() {
  useDocumentTitle('Application');
  const { id } = useParams();
  const toast = useToast();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await applicationsApi.get(id);
      setApplication(response.data.data.application);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async () => {
    setIsUpdating(true);
    try {
      const response = await applicationsApi.withdraw(id);
      setApplication(response.data.data.application);
      toast.success('Application withdrawn', 'The publisher has been notified.');
    } catch (requestError) {
      toast.error('Could not withdraw application', getErrorMessage(requestError));
    } finally {
      setIsUpdating(false);
    }
  };

  const updateStatus = async (status) => {
    if (!status) return;
    setIsUpdating(true);
    try {
      const response = await applicationsApi.updateStatus(id, { status });
      setApplication(response.data.data.application);
      toast.success('Application updated', `Now ${applicationStatusLabel(status)}.`);
    } catch (requestError) {
      toast.error('Could not update application', getErrorMessage(requestError));
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <PageLoader message="Loading application..." />;

  if (error || !application) {
    return (
      <div>
        <Alert variant="error" title="Application could not be loaded">
          {error || 'You may not have access to this application.'}
        </Alert>
        <Link to="/applications" className={`${buttonClasses({ variant: 'secondary' })} mt-4`}>
          Back to applications
        </Link>
      </div>
    );
  }

  const snapshot = application.submittedSnapshot || {};
  const isPublisher = application.viewer === 'publisher';
  const actions = isPublisher
    ? (NEXT_ACTIONS[application.status] || []).map((value) => ({
        value,
        label: applicationStatusLabel(value),
      }))
    : [];
  const location = [snapshot.location?.city, snapshot.location?.country].filter(Boolean).join(', ');

  return (
    <div>
      <Link
        to={isPublisher ? `/opportunities/${application.opportunity?.id}/applicants` : '/applications'}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy"
      >
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isPublisher ? 'Applicants' : 'My applications'}
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" size="sm">
              {opportunityTypeLabel(application.opportunity?.type)}
            </Badge>
            <Badge variant={applicationStatusVariant(application.status)} size="sm">
              {applicationStatusLabel(application.status)}
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            {application.opportunity?.title || 'Application'}
          </h1>
          <p className="mt-1.5 text-sm text-body">
            Applied {formatDate(application.createdAt)} to {application.opportunity?.publisherName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPublisher && actions.length > 0 ? (
            <Select
              aria-label="Update application status"
              placeholder="Update status"
              value=""
              disabled={isUpdating}
              options={actions}
              onChange={(event) => updateStatus(event.target.value)}
              containerClassName="w-44"
            />
          ) : null}
          {isPublisher && application.athlete?.id ? (
            <Link
              to={`/messages?user=${encodeURIComponent(application.athlete.id)}`}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <FiMessageCircle className="h-4 w-4" aria-hidden="true" />
              Message applicant
            </Link>
          ) : null}
          {application.canWithdraw ? (
            <Button
              variant="danger"
              size="sm"
              isLoading={isUpdating}
              onClick={withdraw}
              leftIcon={<FiXCircle className="h-4 w-4" aria-hidden="true" />}
            >
              Withdraw
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="font-display text-xl">
              {isPublisher ? 'Applicant snapshot' : 'Submitted profile snapshot'}
            </h2>
            <p className="mt-1 text-xs text-slate">
              Captured {formatDate(snapshot.capturedAt)} and does not change with later profile edits.
            </p>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-navy">{snapshot.name}</h3>
              <p className="mt-0.5 text-sm text-body">{snapshot.headline || 'No headline'}</p>
              {location ? (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate">
                  <FiMapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {location}
                </p>
              ) : null}
            </div>

            <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate">
                  Sports
                </dt>
                <dd className="mt-0.5 text-navy">{(snapshot.sports || []).join(', ') || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate">
                  Positions
                </dt>
                <dd className="mt-0.5 text-navy">{(snapshot.positions || []).join(', ') || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate">
                  Level
                </dt>
                <dd className="mt-0.5 text-navy">
                  {(snapshot.level || '-').replace(/_/g, ' ')} /{' '}
                  {(snapshot.experienceYears ?? '-')} years
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate">
                  Verified achievements
                </dt>
                <dd className="mt-0.5 text-navy">{snapshot.verifiedAchievementCount || 0}</dd>
              </div>
            </dl>
          </section>

          {application.coverNote ? (
            <section className="rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-xl">Cover note</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">
                {application.coverNote}
              </p>
            </section>
          ) : null}

          {snapshot.verifiedAchievements?.length > 0 ? (
            <section className="rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-xl">Verified achievements</h2>
              <ul className="mt-3 space-y-3">
                {snapshot.verifiedAchievements.map((achievement, index) => (
                  <li key={`${achievement.title}-${index}`} className="flex items-start gap-2.5">
                    <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-navy">{achievement.title}</p>
                      <p className="text-xs text-body">
                        {[achievement.competition, achievement.result].filter(Boolean).join(' - ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {application.documents?.length > 0 ? (
            <section className="rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-xl">Documents</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {application.documents.map((document) => (
                  <a
                    key={document._id || document.url}
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1.5 text-xs font-medium text-body hover:text-navy"
                  >
                    <FiFileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {document.label}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="font-display text-xl">Status history</h2>
            <ol className="mt-4 space-y-4">
              {(application.statusHistory || []).map((entry, index) => (
                <li key={`${entry.status}-${index}`} className="flex gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sand text-track">
                    <FiClock className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {applicationStatusLabel(entry.status)}
                    </p>
                    <p className="text-xs text-slate">{formatDate(entry.changedAt)}</p>
                    {entry.note ? (
                      <p className="mt-1 text-xs leading-relaxed text-body">{entry.note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

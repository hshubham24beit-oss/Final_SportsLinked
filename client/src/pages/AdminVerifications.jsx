import { useCallback, useEffect, useState } from 'react';
import { FiCheck, FiClock, FiExternalLink, FiInbox, FiX } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import PageLoader from '../components/PageLoader';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { verificationApi } from '../api/verification.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate, formatDateTime } from '../utils/format';
import {
  VERIFICATION_TYPE_OPTIONS,
  verificationStatusLabel,
  verificationStatusVariant,
  verificationTypeLabel,
} from '../utils/verification';

const STATUS_OPTIONS = [
  { value: 'requested', label: 'Requested' },
  { value: 'under_review', label: 'Under review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

function RequestSummary({ request }) {
  const target =
    request.achievement?.title ||
    request.qualification?.name ||
    (request.type === 'identity' ? 'Account identity' : '');
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-semibold text-navy">
          {request.user?.name || 'Unknown user'}
        </p>
        <Badge variant={verificationStatusVariant(request.status)} size="sm">
          {verificationStatusLabel(request.status)}
        </Badge>
      </div>
      <p className="mt-0.5 truncate text-xs text-body">
        {verificationTypeLabel(request.type)}
        {target ? ` - ${target}` : ''}
      </p>
      <p className="mt-0.5 text-xs text-slate">
        {request.user?.email || ''} - submitted {formatDate(request.submittedAt)}
      </p>
    </div>
  );
}

function DecisionForm({ request, onDecided }) {
  const toast = useToast();
  const [decision, setDecision] = useState('approved');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (reason.trim().length < 3) {
      setError('Add a short review note before recording the decision.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { decision, reason: reason.trim() };
      if (decision === 'approved' && expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString();
      }
      const response = await verificationApi.adminDecide(request.id, payload);
      toast.success(
        decision === 'approved' ? 'Verification approved' : 'Verification rejected',
        'The applicant has been notified and the audit trail was updated.',
      );
      onDecided(response.data.data.request);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!['requested', 'under_review'].includes(request.status)) {
    return null;
  }

  return (
    <form onSubmit={submit} className="rounded-card border border-line bg-sand/60 p-4">
      <h3 className="text-sm font-semibold text-navy">Approve or reject this request</h3>
      <p className="mt-1 text-xs leading-relaxed text-body">
        Approving marks the user or achievement as verified and sends a notification.
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Select
          label="Decision"
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          options={[
            { value: 'approved', label: 'Approve' },
            { value: 'rejected', label: 'Reject' },
          ]}
        />
        {decision === 'approved' ? (
          <Input
            label="Expiry date"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            hint="Optional. Type defaults apply when left blank."
          />
        ) : null}
      </div>
      <Textarea
        containerClassName="mt-4"
        label="Review note"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        required
        maxLength={2000}
        placeholder="Explain what was checked and why this decision was reached."
      />
      {error ? (
        <p className="mt-2 text-sm text-danger-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          leftIcon={
            decision === 'approved' ? (
              <FiCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <FiX className="h-4 w-4" aria-hidden="true" />
            )
          }
        >
          {decision === 'approved' ? 'Approve verification' : 'Reject request'}
        </Button>
      </div>
    </form>
  );
}

export default function AdminVerifications() {
  useDocumentTitle('Verification queue');
  const toast = useToast();
  const [filters, setFilters] = useState({ status: 'requested', type: '', q: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await verificationApi.adminList({
        ...appliedFilters,
        status: appliedFilters.status || undefined,
        type: appliedFilters.type || undefined,
        q: appliedFilters.q || undefined,
        page,
        limit: 12,
      });
      setData(response.data.data);
      setMeta(response.data.meta);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (requestId) => {
    setOpeningId(requestId);
    try {
      const response = await verificationApi.adminGet(requestId);
      setDetail(response.data.data.request);
    } catch (requestError) {
      toast.error('Could not load request', getErrorMessage(requestError));
    } finally {
      setOpeningId(null);
    }
  };

  const claim = async () => {
    try {
      const response = await verificationApi.adminClaim(detail.id);
      setDetail(response.data.data.request);
      toast.success('Request claimed', 'It is now assigned to you for review.');
      load();
    } catch (requestError) {
      toast.error('Could not claim request', getErrorMessage(requestError));
    }
  };

  const openEvidence = async (evidence) => {
    const tab = window.open('', '_blank');
    if (tab) {
      tab.opener = null;
    }
    try {
      const response = await verificationApi.adminEvidenceUrl(detail.id, evidence.id);
      if (tab) {
        tab.location.href = response.data.data.evidence.url;
      } else {
        toast.error('Pop-up blocked', 'Allow pop-ups to open private evidence.');
      }
    } catch (requestError) {
      if (tab) {
        tab.close();
      }
      toast.error('Could not open evidence', getErrorMessage(requestError));
    }
  };

  const handleFilter = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  return (
    <div>
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
          Verification <span className="display-emphasis">queue.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
          Review identity, qualification, and achievement evidence. Every access and decision is
          recorded in the audit trail.
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <form onSubmit={handleFilter} className="grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]">
            <Input
              label="Search"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Applicant name or email"
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
              options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
            />
            <Select
              label="Type"
              value={filters.type}
              onChange={(event) =>
                setFilters((current) => ({ ...current, type: event.target.value }))
              }
              options={[{ value: '', label: 'All types' }, ...VERIFICATION_TYPE_OPTIONS]}
            />
            <div className="flex items-end">
              <Button type="submit" fullWidth>
                Apply filters
              </Button>
            </div>
          </form>
          {data?.statusCounts ? (
            <p className="mt-3 text-xs text-slate">
              {STATUS_OPTIONS.map(
                (option) => `${option.label}: ${data.statusCounts[option.value] || 0}`,
              ).join('  |  ')}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="error" title="Queue could not be loaded" className="mt-6">
          {error}
        </Alert>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pending and historical requests</CardTitle>
          <CardDescription>{meta.total || 0} requests match the current filters.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoader message="Loading queue..." />
          ) : data?.requests?.length ? (
            <div className="space-y-2.5">
              {data.requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-tile border border-line p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <RequestSummary request={request} />
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {request.reviewer?.name ? (
                      <Badge variant="neutral" size="sm">
                        {request.reviewer.name}
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        <FiClock className="h-3 w-3" aria-hidden="true" />
                        Unclaimed
                      </Badge>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={openingId === request.id}
                      disabled={Boolean(openingId) && openingId !== request.id}
                      onClick={() => openDetail(request.id)}
                    >
                      {['requested', 'under_review'].includes(request.status)
                        ? 'Review & decide'
                        : 'View details'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiInbox}
              title="No requests found"
              description="Try a different status or clear the search filters."
            />
          )}
        </CardContent>
        <Pagination
          page={meta.page || page}
          totalPages={meta.totalPages || 0}
          onChange={setPage}
        />
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Verification request"
        description={detail ? `${verificationTypeLabel(detail.type)} - ${detail.user?.name}` : ''}
        size="lg"
      >
        {detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={verificationStatusVariant(detail.status)}>
                {verificationStatusLabel(detail.status)}
              </Badge>
              <Badge variant="brand">{detail.user?.role}</Badge>
              <Badge variant="neutral">{detail.user?.email}</Badge>
            </div>

            <DecisionForm
              request={detail}
              onDecided={(updated) => {
                setDetail(updated);
                load();
              }}
            />

            {detail.achievement ? (
              <div className="rounded-tile border border-line p-3">
                <p className="text-xs uppercase tracking-wide text-slate">Achievement</p>
                <p className="mt-1 text-sm font-semibold text-navy">{detail.achievement.title}</p>
                <p className="text-xs text-body">
                  {[detail.achievement.sport, detail.achievement.competition, detail.achievement.result]
                    .filter(Boolean)
                    .join(' - ')}
                </p>
              </div>
            ) : null}

            {detail.qualification?.name ? (
              <div className="rounded-tile border border-line p-3">
                <p className="text-xs uppercase tracking-wide text-slate">Qualification</p>
                <p className="mt-1 text-sm font-semibold text-navy">
                  {detail.qualification.name}
                </p>
                <p className="text-xs text-body">
                  {[detail.qualification.issuer, detail.qualification.year]
                    .filter(Boolean)
                    .join(' - ')}
                </p>
              </div>
            ) : null}

            {detail.statement ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                  Applicant statement
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-body">
                  {detail.statement}
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                Private evidence
              </p>
              {detail.evidence.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.evidence.map((evidence) => (
                    <button
                      key={evidence.id}
                      type="button"
                      onClick={() => openEvidence(evidence)}
                      className="inline-flex items-center gap-1.5 rounded-tile border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-body hover:bg-sand/60"
                    >
                      <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      {evidence.originalName}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate">No uploaded evidence.</p>
              )}
              {detail.officialLinks?.length ? (
                <div className="mt-2 space-y-1">
                  {detail.officialLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs font-medium text-track hover:underline"
                    >
                      {link.label || 'Official verification link'}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            {detail.reviewer ? (
              <p className="text-xs text-slate">
                Reviewer: {detail.reviewer.name} - claimed{' '}
                {detail.claimedAt ? formatDateTime(detail.claimedAt) : 'not recorded'}
              </p>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={claim}
                leftIcon={<FiClock className="h-4 w-4" aria-hidden="true" />}
              >
                Claim for review
              </Button>
            )}

            {detail.audit?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                  Audit trail
                </p>
                <ol className="mt-2 space-y-2 border-l border-line pl-3">
                  {detail.audit.map((entry) => (
                    <li key={entry.id} className="text-xs text-body">
                      <span className="font-medium text-navy">{entry.action.replace('_', ' ')}</span>
                      {entry.actor?.name ? ` by ${entry.actor.name}` : ''}
                      <span className="text-slate"> - {formatDateTime(entry.createdAt)}</span>
                      {entry.reason ? <p className="mt-0.5">{entry.reason}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

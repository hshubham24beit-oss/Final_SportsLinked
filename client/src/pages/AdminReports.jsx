import { useCallback, useEffect, useState } from 'react';
import { FiInbox } from 'react-icons/fi';
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
import { reportsApi } from '../api/reports.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDateTime } from '../utils/format';
import {
  REPORT_REASON_OPTIONS,
  REPORT_STATUS_OPTIONS,
  reportReasonLabel,
  reportStatusLabel,
  reportStatusVariant,
} from '../utils/verification';

const TARGET_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'post', label: 'Post' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'message', label: 'Message' },
];

function ReportModal({ report, onClose, onUpdated }) {
  const toast = useToast();
  const [status, setStatus] = useState(
    report.status === 'open' ? 'under_review' : report.status,
  );
  const [resolution, setResolution] = useState(report.resolution || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (['resolved', 'dismissed'].includes(status) && resolution.trim().length < 3) {
      setError('Add a resolution note before closing this report.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await reportsApi.adminUpdate(report.id, {
        status,
        resolution: resolution.trim(),
      });
      toast.success('Report updated', `Status changed to ${reportStatusLabel(status)}.`);
      onUpdated(response.data.data.report);
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Review report"
      description={`${reportReasonLabel(report.reason)} - ${report.targetType}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="report-review-form" isLoading={isSubmitting}>
            Update report
          </Button>
        </>
      }
    >
      <form id="report-review-form" onSubmit={submit} className="space-y-4">
        {error ? (
          <Alert variant="error" title="Report could not be updated">
            {error}
          </Alert>
        ) : null}

        <div className="rounded-lg border border-line bg-slate-50 p-3 text-sm">
          <p className="font-medium text-ink">{reportReasonLabel(report.reason)}</p>
          <p className="mt-1 text-xs text-ink-subtle">
            Reported by {report.reporter?.name || 'Unknown user'}
            {report.reporter?.email ? ` (${report.reporter.email})` : ''} on{' '}
            {formatDateTime(report.createdAt)}
          </p>
          {report.targetUser ? (
            <p className="mt-1 text-xs text-ink-subtle">
              Target account: {report.targetUser.name} ({report.targetUser.email})
            </p>
          ) : (
            <p className="mt-1 break-all text-xs text-ink-subtle">
              Target ID: {report.targetId}
            </p>
          )}
        </div>

        {report.details ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Reporter details
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
              {report.details}
            </p>
          </div>
        ) : null}

        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={REPORT_STATUS_OPTIONS}
        />
        <Textarea
          label="Resolution note"
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
          rows={3}
          maxLength={2000}
          hint="Required when resolving or dismissing a report."
        />
      </form>
    </Modal>
  );
}

export default function AdminReports() {
  useDocumentTitle('Reports');
  const [filters, setFilters] = useState({ status: 'open', targetType: '', reason: '', q: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await reportsApi.adminList({
        status: appliedFilters.status || undefined,
        targetType: appliedFilters.targetType || undefined,
        reason: appliedFilters.reason || undefined,
        q: appliedFilters.q || undefined,
        page,
        limit: 15,
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

  const handleFilter = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Reports</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Triage user reports, review the details, and record a moderation outcome.
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <form
            onSubmit={handleFilter}
            className="grid gap-3 sm:grid-cols-[1fr_150px_150px_170px_auto]"
          >
            <Input
              label="Search"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Reporter, target, or details"
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
              options={[{ value: '', label: 'All statuses' }, ...REPORT_STATUS_OPTIONS]}
            />
            <Select
              label="Target"
              value={filters.targetType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, targetType: event.target.value }))
              }
              options={[{ value: '', label: 'All targets' }, ...TARGET_OPTIONS]}
            />
            <Select
              label="Reason"
              value={filters.reason}
              onChange={(event) =>
                setFilters((current) => ({ ...current, reason: event.target.value }))
              }
              options={[{ value: '', label: 'All reasons' }, ...REPORT_REASON_OPTIONS]}
            />
            <div className="flex items-end">
              <Button type="submit" fullWidth>
                Apply
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="error" title="Reports could not be loaded" className="mt-6">
          {error}
        </Alert>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Report queue</CardTitle>
          <CardDescription>{meta.total || 0} reports match the current filters.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoader message="Loading reports..." />
          ) : data?.reports?.length ? (
            <div className="space-y-2.5">
              {data.reports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col gap-3 rounded-lg border border-line p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {reportReasonLabel(report.reason)}
                      </p>
                      <Badge variant={reportStatusVariant(report.status)} size="sm">
                        {reportStatusLabel(report.status)}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {report.targetType}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      By {report.reporter?.name || 'Unknown user'}
                      {report.targetUser ? ` - target: ${report.targetUser.name}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {formatDateTime(report.createdAt)}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setSelected(report)}>
                    Review
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiInbox}
              title="No reports found"
              description="The queue is clear for the selected filters."
            />
          )}
        </CardContent>
        <Pagination
          page={meta.page || page}
          totalPages={meta.totalPages || 0}
          onChange={setPage}
        />
      </Card>

      {selected ? (
        <ReportModal
          report={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      ) : null}
    </div>
  );
}

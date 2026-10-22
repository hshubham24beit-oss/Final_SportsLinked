import { useCallback, useEffect, useState } from 'react';
import { FiFlag, FiSlash } from 'react-icons/fi';
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
import PageLoader from '../components/PageLoader';
import { blocksApi } from '../api/blocks.api';
import { reportsApi } from '../api/reports.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate, formatDateTime } from '../utils/format';
import { getRoleLabel } from '../utils/roles';
import {
  reportReasonLabel,
  reportStatusLabel,
  reportStatusVariant,
} from '../utils/verification';

export default function Safety() {
  useDocumentTitle('Blocked accounts and reports');
  const toast = useToast();
  const [blocked, setBlocked] = useState([]);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unblockingId, setUnblockingId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [blockedResponse, reportsResponse] = await Promise.all([
        blocksApi.list(),
        reportsApi.listMine(),
      ]);
      setBlocked(blockedResponse.data.data.blocked);
      setReports(reportsResponse.data.data.reports);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unblock = async (entry) => {
    setUnblockingId(entry.id);
    try {
      await blocksApi.unblock(entry.user.id);
      toast.success('Account unblocked', `${entry.user.name} can appear in your results again.`);
      await load();
    } catch (requestError) {
      toast.error('Could not unblock account', getErrorMessage(requestError));
    } finally {
      setUnblockingId(null);
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading safety settings..." />;
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Safety</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Manage accounts you have blocked and follow the reports you have submitted.
        </p>
      </div>

      {error ? (
        <Alert variant="error" title="Safety settings could not be loaded" className="mt-6">
          {error}
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Blocked accounts</CardTitle>
            <CardDescription>
              Blocked accounts and their listings are hidden from each other.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blocked.length === 0 ? (
              <EmptyState
                icon={FiSlash}
                title="No blocked accounts"
                description="You can block an account from its public profile."
              />
            ) : (
              <div className="space-y-2.5">
                {blocked.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{entry.user.name}</p>
                      <p className="text-xs text-ink-subtle">
                        {getRoleLabel(entry.user.role)} - blocked {formatDate(entry.createdAt)}
                      </p>
                      {entry.reason ? (
                        <p className="mt-1 text-xs text-ink-muted">{entry.reason}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={unblockingId === entry.id}
                      onClick={() => unblock(entry)}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your reports</CardTitle>
            <CardDescription>Updates on reports you have submitted to moderators.</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <EmptyState
                icon={FiFlag}
                title="No reports submitted"
                description="Use the report option on a profile or listing when needed."
              />
            ) : (
              <div className="space-y-2.5">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-lg border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">
                        {reportReasonLabel(report.reason)}
                      </p>
                      <Badge variant={reportStatusVariant(report.status)} size="sm">
                        {reportStatusLabel(report.status)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {report.targetType} - submitted {formatDateTime(report.createdAt)}
                    </p>
                    {report.resolution ? (
                      <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-ink-muted">
                        Moderator note: {report.resolution}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

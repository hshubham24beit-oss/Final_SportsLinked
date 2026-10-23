import { useCallback, useEffect, useState } from 'react';
import { FiInbox, FiShield, FiSlash, FiUserCheck } from 'react-icons/fi';
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
import { adminApi } from '../api/admin.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate, formatDateTime } from '../utils/format';
import { getRoleLabel } from '../utils/roles';
import { ACCOUNT_STATUS_OPTIONS, accountStatusVariant } from '../utils/verification';

const ROLE_OPTIONS = [
  { value: 'athlete', label: 'Athlete' },
  { value: 'coach', label: 'Coach' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'admin', label: 'Administrator' },
];

const USER_STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deactivated', label: 'Deactivated' },
];

function ModerationModal({ user, onClose, onUpdated }) {
  const toast = useToast();
  const [status, setStatus] = useState(
    ACCOUNT_STATUS_OPTIONS.some((option) => option.value === user.status)
      ? user.status
      : 'active',
  );
  const [reason, setReason] = useState(user.moderationReason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (reason.trim().length < 3) {
      setError('Add a moderation reason. It is kept in the account record.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminApi.updateUserStatus(user.id, {
        status,
        reason: reason.trim(),
      });
      toast.success('Account updated', `Status changed to ${status}.`);
      onUpdated(response.data.data.user);
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
      title={`Moderate ${user.name}`}
      description="Restricted accounts can sign in but cannot post, apply, or submit content."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="moderation-form" isLoading={isSubmitting}>
            Save account status
          </Button>
        </>
      }
    >
      <form id="moderation-form" onSubmit={submit} className="space-y-4">
        {error ? (
          <Alert variant="error" title="Account could not be updated">
            {error}
          </Alert>
        ) : null}
        <div className="rounded-tile border border-line bg-sand/60 p-3 text-sm">
          <p className="font-medium text-navy">{user.email}</p>
          <p className="mt-0.5 text-xs text-slate">
            {getRoleLabel(user.role)} - joined {formatDate(user.createdAt)}
          </p>
        </div>
        <Select
          label="Account status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={ACCOUNT_STATUS_OPTIONS}
        />
        <Textarea
          label="Moderation reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          required
          maxLength={2000}
          placeholder="Describe the policy issue or the reason for reinstating this account."
        />
      </form>
    </Modal>
  );
}

export default function AdminUsers() {
  useDocumentTitle('User management');
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
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
      const response = await adminApi.listUsers({
        q: appliedFilters.q || undefined,
        role: appliedFilters.role || undefined,
        status: appliedFilters.status || undefined,
        page,
        limit: 20,
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
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
          User <span className="display-emphasis">management.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
          Search accounts, inspect moderation history, and restrict or reinstate access.
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <form onSubmit={handleFilter} className="grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]">
            <Input
              label="Search"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Name or email"
            />
            <Select
              label="Role"
              value={filters.role}
              onChange={(event) =>
                setFilters((current) => ({ ...current, role: event.target.value }))
              }
              options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
              options={[{ value: '', label: 'All statuses' }, ...USER_STATUS_FILTERS]}
            />
            <div className="flex items-end">
              <Button type="submit" fullWidth>
                Apply filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="error" title="Users could not be loaded" className="mt-6">
          {error}
        </Alert>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>{meta.total || 0} accounts match the current filters.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoader message="Loading users..." />
          ) : data?.users?.length ? (
            <div className="space-y-2.5">
              {data.users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 rounded-tile border border-line p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-navy">{user.name}</p>
                      <Badge variant="brand" size="sm">
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Badge variant={accountStatusVariant(user.status)} size="sm">
                        {user.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-body">{user.email}</p>
                    <p className="mt-0.5 text-xs text-slate">
                      Joined {formatDate(user.createdAt)}
                      {user.lastLoginAt
                        ? ` - last active ${formatDateTime(user.lastLoginAt)}`
                        : ''}
                    </p>
                    {user.moderationReason ? (
                      <p className="mt-1 text-xs text-body">
                        Moderation note: {user.moderationReason}
                      </p>
                    ) : null}
                  </div>
                  {user.role === 'admin' ? (
                    <Badge variant="neutral" size="sm">
                      <FiShield className="h-3 w-3" aria-hidden="true" />
                      Protected
                    </Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelected(user)}
                      leftIcon={
                        user.status === 'active' ? (
                          <FiSlash className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <FiUserCheck className="h-4 w-4" aria-hidden="true" />
                        )
                      }
                    >
                      Moderate
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiInbox}
              title="No accounts found"
              description="Try a different search term or clear the filters."
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
        <ModerationModal
          user={selected}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      ) : null}
    </div>
  );
}

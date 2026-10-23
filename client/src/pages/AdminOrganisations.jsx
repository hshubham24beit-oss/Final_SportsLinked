import { useCallback, useEffect, useState } from 'react';
import { FiBriefcase, FiExternalLink, FiInbox, FiMapPin } from 'react-icons/fi';
import { Link } from 'react-router-dom';
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
import { adminApi } from '../api/admin.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate, formatDateTime } from '../utils/format';
import { ORGANIZATION_TYPE_OPTIONS } from '../utils/profile';
import { accountStatusVariant } from '../utils/verification';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deactivated', label: 'Deactivated' },
];

const ACCOUNT_STATUS_LABELS = {
  active: 'Active',
  restricted: 'Restricted',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
};

const OPPORTUNITY_STATUS_ORDER = ['published', 'draft', 'closed', 'expired'];
const APPLICATION_STATUS_ORDER = [
  'submitted',
  'under_review',
  'shortlisted',
  'accepted',
  'rejected',
  'withdrawn',
];
const EVENT_STATUS_ORDER = ['published', 'draft', 'completed', 'cancelled'];

function organizationTypeLabel(value) {
  return (
    ORGANIZATION_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    value ||
    'Organisation'
  );
}

function accountStatusLabel(value) {
  return ACCOUNT_STATUS_LABELS[value] || value || 'Unknown';
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function locationLabel(location) {
  return [location?.city, location?.region, location?.country].filter(Boolean).join(', ');
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-tile border border-line bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none text-navy">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-slate">{hint}</p> : null}
    </div>
  );
}

function StatusBreakdown({ title, counts, order }) {
  const total = Object.values(counts || {}).reduce((sum, value) => sum + value, 0);
  if (!total) {
    return null;
  }
  return (
    <div className="rounded-tile border border-line p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {order.map((status) =>
          counts?.[status] ? (
            <Badge key={status} variant="neutral" size="sm">
              {status.replace('_', ' ')}: {counts[status]}
            </Badge>
          ) : null,
        )}
      </div>
    </div>
  );
}

function OrganizationRow({ organization, onOpen }) {
  const owner = organization.owner;
  const location = locationLabel(organization.location);
  const counts = organization.counts;

  return (
    <article className="flex flex-col gap-3 rounded-tile border border-line p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-tile bg-sand text-slate">
          {organization.avatarUrl ? (
            <img
              src={organization.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FiBriefcase className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(organization.id)}
              className="truncate text-left text-sm font-semibold text-navy hover:text-track hover:underline"
            >
              {organization.name}
            </button>
            <Badge variant="brand" size="sm">
              {organizationTypeLabel(organization.organizationType)}
            </Badge>
            {owner ? (
              <Badge variant={accountStatusVariant(owner.status)} size="sm">
                {accountStatusLabel(owner.status)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-body">
            {organization.headline || 'No headline added'}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate">
            {owner?.name || 'Unknown owner'}
            {owner?.email ? ` - ${owner.email}` : ''}
            {location ? ` - ${location}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-slate">
            {counts.opportunities.total}{' '}
            {pluralize(counts.opportunities.total, 'opportunity', 'opportunities')} -{' '}
            {counts.applications.total}{' '}
            {pluralize(counts.applications.total, 'application')} - {counts.teams.total}{' '}
            {pluralize(counts.teams.total, 'team')} - {counts.events.total}{' '}
            {pluralize(counts.events.total, 'event')}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:pl-3">
        <Button variant="secondary" size="sm" onClick={() => onOpen(organization.id)}>
          View organisation
        </Button>
        <Link
          to={`/p/${organization.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-pill border border-line text-body hover:bg-sand/60"
          aria-label={`Open public profile for ${organization.name}`}
        >
          <FiExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function OrganizationDetail({ detail }) {
  const organization = detail.organization;
  const owner = organization.owner;
  const counts = organization.counts;
  const location = locationLabel(organization.location);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">{organizationTypeLabel(organization.organizationType)}</Badge>
        {owner ? (
          <Badge variant={accountStatusVariant(owner.status)}>
            {accountStatusLabel(owner.status)}
          </Badge>
        ) : null}
        {owner?.emailVerified ? <Badge variant="success">Email verified</Badge> : null}
        <Badge variant="neutral">{organization.profileCompletion}% complete</Badge>
        <Link
          to={`/p/${organization.slug}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-track hover:underline"
        >
          Public profile
          <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div>
          <h3 className="font-display text-2xl text-navy">{organization.name}</h3>
          <p className="mt-1 text-sm font-medium text-body">
            {organization.headline || 'No headline added'}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">
            {organization.bio || 'This organisation has not added a description.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
            {location ? (
              <span className="inline-flex items-center gap-1">
                <FiMapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {location}
              </span>
            ) : null}
            {organization.foundedYear ? <span>Founded {organization.foundedYear}</span> : null}
            <span>Joined {formatDate(organization.createdAt)}</span>
            {organization.galleryCount ? <span>{organization.galleryCount} gallery images</span> : null}
          </div>
        </div>

        <div className="rounded-tile border border-line bg-sand/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Owner account</p>
          {owner ? (
            <div className="mt-2 space-y-1 text-sm">
              <p className="font-semibold text-navy">{owner.name}</p>
              <p className="break-all text-xs text-body">{owner.email}</p>
              <p className="text-xs text-slate">
                {accountStatusLabel(owner.status)} - joined {formatDate(owner.createdAt)}
              </p>
              <p className="text-xs text-slate">
                {owner.lastLoginAt
                  ? `Last active ${formatDateTime(owner.lastLoginAt)}`
                  : 'No sign-in recorded'}
              </p>
              {owner.moderationReason ? (
                <p className="pt-1 text-xs text-body">Moderation: {owner.moderationReason}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate">Owner account not available.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Opportunities" value={counts.opportunities.total} />
        <Stat label="Applications" value={counts.applications.total} />
        <Stat label="Teams" value={counts.teams.total} />
        <Stat label="Events" value={counts.events.total} />
      </div>

      {organization.sports.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Sports</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {organization.sports.map((sport) => (
              <Badge key={sport} variant="neutral" size="sm">
                {sport}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {organization.activities.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">
            Activities and programmes
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {organization.activities.map((activity) => (
              <Badge key={activity} variant="brand" size="sm">
                {activity}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <StatusBreakdown
          title="Opportunities by status"
          counts={counts.opportunities.byStatus}
          order={OPPORTUNITY_STATUS_ORDER}
        />
        <StatusBreakdown
          title="Applications by status"
          counts={counts.applications.byStatus}
          order={APPLICATION_STATUS_ORDER}
        />
        <StatusBreakdown
          title="Events by status"
          counts={counts.events.byStatus}
          order={EVENT_STATUS_ORDER}
        />
        <div className="rounded-tile border border-line p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Contact</p>
          <div className="mt-2 space-y-1 text-xs text-body">
            <p className="break-all">{organization.contact.email || 'No contact email'}</p>
            {organization.contact.phone ? <p>{organization.contact.phone}</p> : null}
            {organization.contact.website ? (
              <a
                href={organization.contact.website}
                target="_blank"
                rel="noreferrer"
                className="block break-all font-medium text-track hover:underline"
              >
                {organization.contact.website}
              </a>
            ) : null}
            <p className="text-slate">
              Email {organization.contact.showEmail ? 'shown' : 'hidden'} on profile - messages{' '}
              {organization.contact.allowMessages ? 'enabled' : 'disabled'}
            </p>
          </div>
        </div>
      </div>

      {organization.careerHistory.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">
            Organisation history
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-body">
            {organization.careerHistory.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">
            Recent opportunities
          </p>
          <p className="text-xs text-slate">{counts.opportunities.total} total</p>
        </div>
        {detail.recentOpportunities.length ? (
          <div className="mt-2 divide-y divide-line rounded-tile border border-line">
            {detail.recentOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    to={`/opportunities/${opportunity.id}`}
                    className="truncate text-sm font-medium text-navy hover:text-track hover:underline"
                  >
                    {opportunity.title}
                  </Link>
                  <p className="text-xs text-slate">
                    {opportunity.type} - updated {formatDate(opportunity.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" size="sm">
                    {opportunity.status}
                  </Badge>
                  <span className="text-xs text-slate">
                    {opportunity.deadline ? `Closes ${formatDate(opportunity.deadline)}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-tile border border-dashed border-line px-3 py-4 text-sm text-slate">
            No opportunities have been created by this organisation.
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminOrganisations() {
  useDocumentTitle('Organisations');
  const toast = useToast();
  const [filters, setFilters] = useState({ q: '', organizationType: '', status: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await adminApi.listOrganizations({
        q: appliedFilters.q || undefined,
        organizationType: appliedFilters.organizationType || undefined,
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

  const openDetail = async (organizationId) => {
    setDetailId(organizationId);
    setDetail(null);
    setDetailError('');
    setIsDetailLoading(true);
    try {
      const response = await adminApi.getOrganization(organizationId);
      setDetail(response.data.data);
    } catch (requestError) {
      setDetailError(getErrorMessage(requestError));
      toast.error('Could not load organisation', getErrorMessage(requestError));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailError('');
  };

  return (
    <div>
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
          Organisation <span className="display-emphasis">directory.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
          Inspect recruiter organisations, activity, ownership, and account status across the
          platform.
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <form onSubmit={handleFilter} className="grid gap-3 sm:grid-cols-[1fr_180px_160px_auto]">
            <Input
              label="Search"
              value={filters.q}
              onChange={(event) =>
                setFilters((current) => ({ ...current, q: event.target.value }))
              }
              placeholder="Name, owner, city, or slug"
            />
            <Select
              label="Type"
              value={filters.organizationType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  organizationType: event.target.value,
                }))
              }
              options={[{ value: '', label: 'All types' }, ...ORGANIZATION_TYPE_OPTIONS]}
            />
            <Select
              label="Owner status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
              options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
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
        <Alert variant="error" title="Organisations could not be loaded" className="mt-6">
          {error}
        </Alert>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recruiter organisations</CardTitle>
          <CardDescription>
            {meta.total || 0} {pluralize(meta.total || 0, 'organisation')}{' '}
            {meta.total === 1 ? 'matches' : 'match'} the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PageLoader message="Loading organisations..." />
          ) : data?.organizations?.length ? (
            <div className="space-y-2.5">
              {data.organizations.map((organization) => (
                <OrganizationRow
                  key={organization.id}
                  organization={organization}
                  onOpen={openDetail}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiInbox}
              title="No organisations found"
              description="Try a different search, organisation type, or owner status."
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
        open={Boolean(detailId)}
        onClose={closeDetail}
        title={detail?.organization?.name || 'Organisation'}
        description={
          detail
            ? `${organizationTypeLabel(detail.organization.organizationType)} - ${
                detail.organization.owner?.name || 'Unknown owner'
              }`
            : 'Loading organisation details'
        }
        size="lg"
      >
        {isDetailLoading ? (
          <PageLoader message="Loading organisation..." />
        ) : detailError ? (
          <Alert variant="error" title="Organisation could not be loaded">
            {detailError}
          </Alert>
        ) : detail ? (
          <OrganizationDetail detail={detail} />
        ) : null}
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiFlag,
  FiInbox,
  FiPlus,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import { buttonClasses } from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import PageLoader from '../components/PageLoader';
import ProgressBar from '../components/ui/ProgressBar';
import UpcomingEventsCard from '../components/dashboard/UpcomingEventsCard';
import { dashboardApi } from '../api/dashboard.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../utils/apiError';
import { formatDate, getFirstName } from '../utils/format';
import { getRoleLabel } from '../utils/roles';
import {
  applicationStatusLabel,
  applicationStatusVariant,
  formatDeadline,
  opportunityStatusLabel,
  opportunityTypeLabel,
} from '../utils/opportunities';

function StatCard({ label, value, icon: Icon, hint }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

function DashboardHeader({ user, dashboard }) {
  const displayName = dashboard.profile?.name || user.name;
  const canPublish = ['coach', 'recruiter'].includes(user.role);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{getRoleLabel(user.role)}</Badge>
          <Badge variant={user.isEmailVerified ? 'success' : 'warning'} dot>
            {user.isEmailVerified ? 'Email verified' : 'Email unverified'}
          </Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Welcome back, {getFirstName(displayName)}.
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {user.role === 'athlete'
            ? 'Applications, saved opportunities, and recommended listings at a glance.'
            : user.role === 'admin'
              ? 'Platform activity from real accounts and published opportunities.'
              : 'Your published opportunities and incoming applications at a glance.'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {canPublish ? (
          <Link
            to="/opportunities/new"
            className={buttonClasses({ size: 'sm' })}
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            New opportunity
          </Link>
        ) : null}
        {user.role === 'athlete' ? (
          <Link
            to="/opportunities"
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            Browse opportunities
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function AthleteDashboard({ dashboard }) {
  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Active applications"
          value={dashboard.stats.activeApplications || 0}
          icon={FiClock}
          hint="Submitted, in review, or shortlisted"
        />
        <StatCard
          label="Saved opportunities"
          value={dashboard.stats.savedOpportunities || 0}
          icon={FiBriefcase}
        />
        <StatCard
          label="Total applications"
          value={dashboard.stats.applications || 0}
          icon={FiFileText}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Recent applications</CardTitle>
                <CardDescription>Your latest submissions and decisions.</CardDescription>
              </div>
              <Link to="/applications" className="text-xs font-semibold text-brand-700 hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboard.recentApplications?.length ? (
              <div className="space-y-2.5">
                {dashboard.recentApplications.map((application) => (
                  <Link
                    key={application.id}
                    to={`/applications/${application.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {application.opportunity.title}
                      </p>
                      <p className="truncate text-xs text-ink-subtle">
                        {application.opportunity.publisherName} - applied{' '}
                        {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <Badge variant={applicationStatusVariant(application.status)} size="sm">
                      {applicationStatusLabel(application.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FiInbox}
                title="No applications yet"
                description="Browse opportunities and submit your first application."
                action={
                  <Link to="/opportunities" className={buttonClasses({ size: 'sm' })}>
                    Find opportunities
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile readiness</CardTitle>
              <CardDescription>Keep your profile accurate and current.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">Profile completion</span>
                <span className="font-semibold text-brand-700">
                  {dashboard.profile?.completion || 0}%
                </span>
              </div>
              <ProgressBar value={dashboard.profile?.completion || 0} className="mt-2" />
              <Link
                to="/profile/edit"
                className={`${buttonClasses({ variant: 'secondary', size: 'sm', fullWidth: true })} mt-4`}
              >
                Improve your profile
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Recommended</CardTitle>
                <Link to="/opportunities" className="text-xs font-semibold text-brand-700 hover:underline">
                  Browse all
                </Link>
              </div>
              <CardDescription>Active listings matching your sports.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.recommendedOpportunities?.length ? (
                <div className="space-y-2.5">
                  {dashboard.recommendedOpportunities.map((opportunity) => (
                    <Link
                      key={opportunity.id}
                      to={`/opportunities/${opportunity.id}`}
                      className="block rounded-lg border border-line p-3 hover:bg-slate-50"
                    >
                      <p className="truncate text-sm font-medium text-ink">{opportunity.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-subtle">
                        {opportunityTypeLabel(opportunity.type)} - closes{' '}
                        {formatDeadline(opportunity.deadline)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">No matching active opportunities right now.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function PublisherDashboard({ dashboard }) {
  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active opportunities"
          value={dashboard.stats.activeOpportunities || 0}
          icon={FiBriefcase}
        />
        <StatCard label="Drafts" value={dashboard.stats.drafts || 0} icon={FiFileText} />
        <StatCard
          label="Total applications"
          value={dashboard.stats.totalApplications || 0}
          icon={FiUsers}
        />
        <StatCard
          label="Pending review"
          value={dashboard.stats.pendingReview || 0}
          icon={FiClock}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Recent applications</CardTitle>
                <CardDescription>Latest candidates across your opportunities.</CardDescription>
              </div>
              <Link
                to="/opportunities/mine"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Manage listings
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboard.recentApplications?.length ? (
              <div className="space-y-2.5">
                {dashboard.recentApplications.map((application) => (
                  <Link
                    key={application.id}
                    to={`/applications/${application.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {application.athlete?.name || 'Athlete'}
                      </p>
                      <p className="truncate text-xs text-ink-subtle">
                        {application.opportunity.title} - applied{' '}
                        {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <Badge variant={applicationStatusVariant(application.status)} size="sm">
                      {applicationStatusLabel(application.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FiInbox}
                title="No applications yet"
                description="Once your opportunity is published, athlete applications will appear here."
                action={
                  <Link to="/opportunities/mine" className={buttonClasses({ size: 'sm' })}>
                    Review your listings
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opportunity pipeline</CardTitle>
            <CardDescription>Status of everything you created.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {['published', 'draft', 'closed', 'expired'].map((status) => (
              <div
                key={status}
                className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                  <span className="text-sm text-ink">{opportunityStatusLabel(status)}</span>
                </div>
                <Badge size="sm" variant="neutral">
                  {dashboard.opportunityCounts?.[status] || 0}
                </Badge>
              </div>
            ))}
            <Link
              to="/opportunities/mine"
              className={`${buttonClasses({ variant: 'secondary', size: 'sm', fullWidth: true })} mt-2`}
            >
              Open pipeline
              <FiArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AdminDashboard({ dashboard }) {
  const shortcuts = [
    {
      to: '/admin/verifications',
      label: 'Verification queue',
      description: `${dashboard.stats.pendingVerifications || 0} pending, ${
        dashboard.stats.overdueVerifications || 0
      } older than 72 hours.`,
      icon: FiShield,
    },
    {
      to: '/admin/reports',
      label: 'Reports',
      description: `${dashboard.stats.openReports || 0} open or under review.`,
      icon: FiFlag,
    },
    {
      to: '/admin/users',
      label: 'User management',
      description: `${dashboard.stats.restrictedUsers || 0} restricted accounts.`,
      icon: FiUsers,
    },
  ];

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Users" value={dashboard.stats.users || 0} icon={FiUsers} />
        <StatCard label="Active users" value={dashboard.stats.activeUsers || 0} icon={FiCheckCircle} />
        <StatCard
          label="Active opportunities"
          value={dashboard.stats.publishedOpportunities || 0}
          icon={FiBriefcase}
        />
        <StatCard label="Applications" value={dashboard.stats.applications || 0} icon={FiBarChart2} />
        <StatCard
          label="Pending verifications"
          value={dashboard.stats.pendingVerifications || 0}
          icon={FiShield}
          hint={`${dashboard.stats.overdueVerifications || 0} overdue`}
        />
        <StatCard
          label="Open reports"
          value={dashboard.stats.openReports || 0}
          icon={FiFlag}
          hint={`${dashboard.stats.restrictedUsers || 0} restricted accounts`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Moderation shortcuts</CardTitle>
            <CardDescription>Jump into the queues that need attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <Link
                  key={shortcut.to}
                  to={shortcut.to}
                  className="flex items-center gap-3 rounded-lg border border-line p-3 hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{shortcut.label}</span>
                    <span className="block text-xs text-ink-subtle">{shortcut.description}</span>
                  </span>
                  <FiArrowRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent accounts</CardTitle>
            <CardDescription>Newest registered users on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {dashboard.recentUsers?.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{entry.name}</p>
                    <p className="truncate text-xs text-ink-subtle">{entry.email}</p>
                  </div>
                  <Badge size="sm" variant="brand">
                    {entry.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await dashboardApi.get();
        if (!cancelled) setDashboard(response.data.data.dashboard);
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
  }, []);

  if (isLoading) return <PageLoader message="Loading your dashboard..." />;

  if (error || !dashboard) {
    return (
      <Alert variant="error" title="Dashboard could not be loaded">
        {error}
      </Alert>
    );
  }

  return (
    <div>
      <DashboardHeader user={user} dashboard={dashboard} />
      {user.role === 'athlete' ? <AthleteDashboard dashboard={dashboard} /> : null}
      {user.role === 'admin' ? <AdminDashboard dashboard={dashboard} /> : null}
      {['coach', 'recruiter'].includes(user.role) ? (
        <PublisherDashboard dashboard={dashboard} />
      ) : null}
      <UpcomingEventsCard events={dashboard.upcomingEvents || []} />
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCheck,
  FiInbox,
  FiRefreshCw,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { connectionsApi } from '../api/connections.api';
import { followsApi } from '../api/follows.api';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatRelativeTime } from '../utils/format';
import { getRoleLabel } from '../utils/roles';

const TABS = [
  { id: 'connections', label: 'Connections', icon: FiUserCheck },
  { id: 'requests', label: 'Requests', icon: FiInbox },
  { id: 'suggestions', label: 'Suggestions', icon: FiUserPlus },
  { id: 'followers', label: 'Followers', icon: FiUsers },
  { id: 'following', label: 'Following', icon: FiUsers },
];

function PersonRow({ person, children, note = null, reasons = [] }) {
  if (!person) {
    return null;
  }

  const location = [person.location?.city, person.location?.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Link
          to={person.slug ? `/p/${person.slug}` : '/network'}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          aria-label={`View ${person.name} profile`}
        >
          <Avatar name={person.name} src={person.avatarUrl} size="md" />
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={person.slug ? `/p/${person.slug}` : '/network'}
              className="truncate text-sm font-semibold text-ink hover:text-brand-800"
            >
              {person.name}
            </Link>
            <span className="text-[11px] font-medium text-ink-subtle">
              {getRoleLabel(person.role)}
            </span>
          </div>
          {person.headline ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
              {person.headline}
            </p>
          ) : null}
          {!person.headline && location ? (
            <p className="mt-0.5 text-xs text-ink-muted">{location}</p>
          ) : null}
          {person.sports?.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {person.sports.slice(0, 3).map((sport) => (
                <Badge key={sport} variant="brand" size="sm">
                  {sport}
                </Badge>
              ))}
            </div>
          ) : null}
          {reasons.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <Badge key={reason} variant="neutral" size="sm">
                  {reason}
                </Badge>
              ))}
            </div>
          ) : null}
          {note ? (
            <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs italic text-ink-muted">
              “{note}”
            </p>
          ) : null}
          {person.followedAt ? (
            <p className="mt-1.5 text-[11px] text-ink-subtle">
              Followed {formatRelativeTime(person.followedAt)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {children}
        {person.slug ? (
          <Link
            to={`/p/${person.slug}`}
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
          >
            View profile
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function MyNetwork() {
  useDocumentTitle('My network');
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('connections');
  const [cache, setCache] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [followedIds, setFollowedIds] = useState(new Set());

  const loadTab = useCallback(
    async (tab, force = false) => {
      if (!user?.id) {
        return;
      }
      if (!force && cache[tab]) {
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        let result;
        if (tab === 'connections') {
          const response = await connectionsApi.list({ limit: 100 });
          result = {
            connections: response.data.data.connections || [],
            total: response.data.meta?.total || 0,
          };
        } else if (tab === 'requests') {
          const [incomingResponse, outgoingResponse] = await Promise.all([
            connectionsApi.requests('incoming'),
            connectionsApi.requests('outgoing'),
          ]);
          result = {
            incoming: incomingResponse.data.data.requests || [],
            outgoing: outgoingResponse.data.data.requests || [],
          };
        } else if (tab === 'suggestions') {
          const response = await connectionsApi.suggestions(20);
          result = {
            suggestions: response.data.data.suggestions || [],
            criteria: response.data.data.criteria || [],
          };
        } else if (tab === 'followers') {
          const response = await followsApi.followers(user.id, { limit: 100 });
          result = {
            users: response.data.data.users || [],
            total: response.data.data.total || 0,
          };
        } else {
          const response = await followsApi.following(user.id, { limit: 100 });
          result = {
            users: response.data.data.users || [],
            total: response.data.data.total || 0,
          };
        }

        setCache((current) => ({ ...current, [tab]: result }));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setIsLoading(false);
      }
    },
    [cache, user?.id],
  );

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  const runAction = async (key, task, successMessage) => {
    setBusyKey(key);
    try {
      await task();
      toast.success(successMessage);
      await loadTab(activeTab, true);
    } catch (requestError) {
      toast.error('Could not update your network', getErrorMessage(requestError));
    } finally {
      setBusyKey('');
    }
  };

  const acceptRequest = (request) =>
    runAction(
      `accept-${request.id}`,
      () => connectionsApi.accept(request.id),
      `You are now connected with ${request.user?.name || 'this member'}.`,
    );

  const rejectRequest = (request) =>
    runAction(
      `reject-${request.id}`,
      () => connectionsApi.reject(request.id),
      'Connection request declined.',
    );

  const cancelRequest = (request) =>
    runAction(
      `cancel-${request.id}`,
      () => connectionsApi.cancel(request.id),
      'Connection request cancelled.',
    );

  const removeConnection = (connection) =>
    runAction(
      `remove-${connection.id}`,
      () => connectionsApi.remove(connection.id),
      'Connection removed.',
    );

  const sendSuggestionRequest = async (suggestion) => {
    const key = `connect-${suggestion.user.id}`;
    setBusyKey(key);
    try {
      await connectionsApi.send(suggestion.user.id);
      toast.success(
        'Request sent',
        `${suggestion.user.name} will see your connection request.`,
      );
      setCache((current) => ({
        ...current,
        suggestions: {
          ...current.suggestions,
          suggestions: (current.suggestions?.suggestions || []).filter(
            (entry) => entry.user.id !== suggestion.user.id,
          ),
        },
      }));
    } catch (requestError) {
      toast.error('Could not send request', getErrorMessage(requestError));
    } finally {
      setBusyKey('');
    }
  };

  const followSuggestion = async (suggestion) => {
    const key = `follow-${suggestion.user.id}`;
    setBusyKey(key);
    try {
      await followsApi.follow(suggestion.user.id);
      setFollowedIds((current) => new Set(current).add(suggestion.user.id));
      toast.success('Following', `You will see more from ${suggestion.user.name}.`);
    } catch (requestError) {
      toast.error('Could not follow member', getErrorMessage(requestError));
    } finally {
      setBusyKey('');
    }
  };

  const data = cache[activeTab];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            My network
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Build connections for private updates, and follow people whose public posts interest you.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadTab(activeTab, true)}
          isLoading={isLoading}
          leftIcon={<FiRefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          Refresh
        </Button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-white p-1.5 shadow-card">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Network sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`network-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                  isActive
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-ink-muted hover:bg-slate-50 hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <Alert variant="error" title="Network could not be loaded" className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadTab(activeTab, true)}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : null}

      <section
        id={`network-panel-${activeTab}`}
        role="tabpanel"
        className="mt-5"
        aria-busy={isLoading}
      >
        {isLoading && !data ? (
          <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-ink-muted shadow-card">
            Loading {activeTab}...
          </p>
        ) : null}

        {!isLoading && !error ? (
          <>
            {activeTab === 'connections' ? (
              data?.connections?.length ? (
                <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-card">
                  <div className="flex items-center justify-between border-b border-line bg-slate-50/60 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                      Mutual connections
                    </p>
                    <span className="text-xs text-ink-subtle">{data.total}</span>
                  </div>
                  {data.connections.map((connection) => (
                    <PersonRow key={connection.id} person={connection.user}>
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={busyKey === `remove-${connection.id}`}
                        onClick={() => removeConnection(connection)}
                      >
                        Remove
                      </Button>
                    </PersonRow>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FiUserCheck}
                  title="No connections yet"
                  description="Accept requests or reach out to people in the sporting community."
                />
              )
            ) : null}

            {activeTab === 'requests' ? (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
                  <div className="flex items-center justify-between border-b border-line bg-slate-50/60 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                      Incoming requests
                    </p>
                    <span className="text-xs text-ink-subtle">
                      {data?.incoming?.length || 0}
                    </span>
                  </div>
                  {data?.incoming?.length ? (
                    <div className="divide-y divide-line">
                      {data.incoming.map((request) => (
                        <PersonRow
                          key={request.id}
                          person={request.user}
                          note={request.message}
                        >
                          <Button
                            size="sm"
                            isLoading={busyKey === `accept-${request.id}`}
                            onClick={() => acceptRequest(request)}
                            leftIcon={<FiCheck className="h-4 w-4" aria-hidden="true" />}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={busyKey === `reject-${request.id}`}
                            onClick={() => rejectRequest(request)}
                            leftIcon={<FiX className="h-4 w-4" aria-hidden="true" />}
                          >
                            Decline
                          </Button>
                        </PersonRow>
                      ))}
                    </div>
                  ) : (
                    <p className="p-5 text-center text-sm text-ink-muted">
                      No incoming requests.
                    </p>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
                  <div className="flex items-center justify-between border-b border-line bg-slate-50/60 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                      Sent requests
                    </p>
                    <span className="text-xs text-ink-subtle">
                      {data?.outgoing?.length || 0}
                    </span>
                  </div>
                  {data?.outgoing?.length ? (
                    <div className="divide-y divide-line">
                      {data.outgoing.map((request) => (
                        <PersonRow
                          key={request.id}
                          person={request.user}
                          note={request.message}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            isLoading={busyKey === `cancel-${request.id}`}
                            onClick={() => cancelRequest(request)}
                          >
                            Cancel request
                          </Button>
                        </PersonRow>
                      ))}
                    </div>
                  ) : (
                    <p className="p-5 text-center text-sm text-ink-muted">
                      You have no pending sent requests.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === 'suggestions' ? (
              data?.suggestions?.length ? (
                <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50/60 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                      People you may know
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(data.criteria || []).map((criterion) => (
                        <Badge key={criterion} variant="neutral" size="sm">
                          {criterion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-line">
                    {data.suggestions.map((suggestion) => (
                      <PersonRow
                        key={suggestion.user.id}
                        person={suggestion.user}
                        reasons={suggestion.reasons}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={
                            busyKey === `connect-${suggestion.user.id}`
                          }
                          onClick={() => sendSuggestionRequest(suggestion)}
                          leftIcon={<FiUserPlus className="h-4 w-4" aria-hidden="true" />}
                        >
                          Connect
                        </Button>
                        <Button
                          variant={
                            followedIds.has(suggestion.user.id)
                              ? 'ghost'
                              : 'secondary'
                          }
                          size="sm"
                          disabled={followedIds.has(suggestion.user.id)}
                          isLoading={busyKey === `follow-${suggestion.user.id}`}
                          onClick={() => followSuggestion(suggestion)}
                        >
                          {followedIds.has(suggestion.user.id) ? 'Following' : 'Follow'}
                        </Button>
                      </PersonRow>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={FiUserPlus}
                  title="No suggestions right now"
                  description="Suggestions appear when you share a sport, city, country, or role with other members."
                />
              )
            ) : null}

            {(activeTab === 'followers' || activeTab === 'following') ? (
              data?.users?.length ? (
                <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-card">
                  <div className="flex items-center justify-between border-b border-line bg-slate-50/60 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                      {activeTab === 'followers' ? 'People following you' : 'People you follow'}
                    </p>
                    <span className="text-xs text-ink-subtle">{data.total}</span>
                  </div>
                  {data.users.map((person) => (
                    <PersonRow key={person.id} person={person} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FiUsers}
                  title={
                    activeTab === 'followers'
                      ? 'No followers yet'
                      : 'You are not following anyone'
                  }
                  description={
                    activeTab === 'followers'
                      ? 'Public posts you share will help people discover your profile.'
                      : 'Follow people from their profile or the suggestions tab.'
                  }
                />
              )
            ) : null}
          </>
        ) : null}

      </section>
    </div>
  );
}

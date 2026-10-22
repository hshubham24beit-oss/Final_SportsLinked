import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiEdit3,
  FiLock,
  FiLogOut,
  FiSend,
  FiTrash2,
  FiUserPlus,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button, { buttonClasses } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import PageLoader from '../components/PageLoader';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { teamsApi } from '../api/teams.api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatRelativeTime } from '../utils/format';
import { getErrorMessage } from '../utils/apiError';
import {
  teamLocation,
  teamRoleLabel,
  TEAM_MEMBER_ROLE_OPTIONS,
  TEAM_TYPE_LABELS,
} from '../utils/teams';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteError, setInviteError] = useState('');
  const [updateText, setUpdateText] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const teamResponse = await teamsApi.get(id);
      const loadedTeam = teamResponse.data.data.team;
      setTeam(loadedTeam);

      const memberPromise = teamsApi.members(id).catch(() => null);
      const updatePromise =
        loadedTeam.isOwner || loadedTeam.membershipStatus === 'active'
          ? teamsApi.updates(id).catch(() => null)
          : Promise.resolve(null);

      const [memberResponse, updateResponse] = await Promise.all([
        memberPromise,
        updatePromise,
      ]);
      setMembers(memberResponse?.data?.data?.members || []);
      setUpdates(updateResponse?.data?.data?.updates || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setTeam(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (name, request, message) => {
    setAction(name);
    try {
      await request();
      await load();
      if (message) {
        toast.success(message.title, message.description);
      }
    } catch (requestError) {
      toast.error('Action could not be completed', getErrorMessage(requestError));
    } finally {
      setAction('');
    }
  };

  const handleRespond = async (accept) => {
    setAction(accept ? 'accept' : 'decline');
    try {
      await teamsApi.respond(id, accept);
      if (accept) {
        await load();
        toast.success('Invitation accepted', 'You joined the team.');
      } else {
        toast.success('Invitation declined', 'The team has been notified.');
        navigate('/teams');
      }
    } catch (requestError) {
      toast.error('Action could not be completed', getErrorMessage(requestError));
    } finally {
      setAction('');
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    setInviteError('');
    const value = inviteEmail.trim();
    if (!value) {
      setInviteError('Enter an email or member ID.');
      return;
    }
    const payload = value.includes('@')
      ? { email: value, role: inviteRole }
      : { userId: value, role: inviteRole };

    setAction('invite');
    try {
      await teamsApi.invite(id, payload);
      setInviteEmail('');
      await load();
      toast.success('Invitation sent', 'They will see it in their notifications.');
    } catch (requestError) {
      setInviteError(getErrorMessage(requestError));
    } finally {
      setAction('');
    }
  };

  const handleRemoveMember = async (entry) => {
    if (!window.confirm(`Remove ${entry.user.name} from this team?`)) {
      return;
    }
    await run('remove-member', () => teamsApi.removeMember(id, entry.user.id), {
      title: 'Member removed',
      description: `${entry.user.name} is no longer on the team.`,
    });
  };

  const handleRoleChange = (entry, role) =>
    run('role', () => teamsApi.updateMemberRole(id, entry.user.id, role), {
      title: 'Role updated',
      description: `${entry.user.name} is now a ${teamRoleLabel(role).toLowerCase()}.`,
    });

  const handlePostUpdate = async (event) => {
    event.preventDefault();
    if (!updateText.trim()) return;
    setAction('update');
    try {
      await teamsApi.postUpdate(id, updateText.trim());
      setUpdateText('');
      await load();
      toast.success('Update posted', 'Active members have been notified.');
    } catch (requestError) {
      toast.error('Update could not be posted', getErrorMessage(requestError));
    } finally {
      setAction('');
    }
  };

  const handleLeave = async () => {
    setLeaveOpen(false);
    setAction('leave');
    try {
      await teamsApi.leave(id);
      toast.success('You left the team', 'You can rejoin if you are invited again.');
      navigate('/teams/mine');
    } catch (requestError) {
      toast.error('Could not leave team', getErrorMessage(requestError));
    } finally {
      setAction('');
    }
  };

  const handleDelete = async () => {
    setDeleteOpen(false);
    setAction('delete');
    try {
      await teamsApi.remove(id);
      toast.success('Team deleted', 'The team and its memberships were removed.');
      navigate('/teams/mine');
    } catch (requestError) {
      toast.error('Could not delete team', getErrorMessage(requestError));
    } finally {
      setAction('');
    }
  };

  if (isLoading && !team) return <PageLoader message="Loading team..." />;

  if (error || !team) {
    return (
      <div>
        <Link to="/teams" className="text-sm font-medium text-ink-muted hover:text-ink">
          Back to teams
        </Link>
        <Alert variant="error" title="Team could not be loaded" className="mt-4">
          {error || 'This team is unavailable or private.'}
        </Alert>
      </div>
    );
  }

  const location = teamLocation(team);
  const isInvited = team.membershipStatus === 'invited';
  const canViewUpdates = team.isOwner || team.membershipStatus === 'active';

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to={team.isOwner || team.membership ? '/teams/mine' : '/teams'}
        className="text-sm font-medium text-ink-muted hover:text-ink"
      >
        Back
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{TEAM_TYPE_LABELS[team.type] || 'Team'}</Badge>
            <Badge variant={team.privacy === 'private' ? 'neutral' : 'success'}>
              {team.privacy === 'private' ? (
                <>
                  <FiLock className="h-3 w-3" aria-hidden="true" />
                  Private
                </>
              ) : (
                'Public'
              )}
            </Badge>
            {team.memberRole ? (
              <Badge variant="info">{teamRoleLabel(team.memberRole)}</Badge>
            ) : null}
            {isInvited ? <Badge variant="warning">Invitation pending</Badge> : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {team.name}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Led by {team.ownerName} - {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
            {location ? ` - ${location}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {team.canEdit ? (
            <Link
              to={`/teams/${team.id}/edit`}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <FiEdit3 className="h-4 w-4" aria-hidden="true" />
              Edit team
            </Link>
          ) : null}
          {team.isOwner ? (
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {isInvited ? (
        <Card className="mt-6 border-warning-200 bg-warning-50/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">You have been invited to join</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {team.ownerName} invited you as a {teamRoleLabel(team.membership?.role)}.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                isLoading={action === 'accept'}
                onClick={() => handleRespond(true)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="secondary"
                isLoading={action === 'decline'}
                onClick={() => handleRespond(false)}
              >
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                {team.description}
              </p>
              <p className="mt-4 text-sm text-ink-subtle">Sport: {team.sport}</p>
            </CardContent>
          </Card>

          {canViewUpdates ? (
            <Card>
              <CardHeader>
                <CardTitle>Team updates</CardTitle>
              </CardHeader>
              <CardContent>
                {team.canPostUpdate ? (
                  <form onSubmit={handlePostUpdate} className="mb-5">
                    <Textarea
                      label="Post an update"
                      rows={3}
                      value={updateText}
                      onChange={(event) => setUpdateText(event.target.value)}
                      placeholder="Share schedule changes, results, or notes with the team."
                      hint="Owners, managers, and coaches can post updates."
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        isLoading={action === 'update'}
                        leftIcon={<FiSend className="h-4 w-4" aria-hidden="true" />}
                      >
                        Post update
                      </Button>
                    </div>
                  </form>
                ) : null}

                {updates.length ? (
                  <ul className="space-y-3">
                    {updates.map((update) => (
                      <li key={update.id} className="rounded-lg border border-line p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink">{update.authorName}</p>
                          <Badge size="sm" variant="neutral">
                            {teamRoleLabel(update.authorRole)}
                          </Badge>
                        </div>
                        <p className="mt-1.5 whitespace-pre-line text-sm text-ink-muted">
                          {update.text}
                        </p>
                        <p className="mt-2 text-xs text-ink-subtle">
                          {formatRelativeTime(update.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-muted">No updates have been posted yet.</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {team.canInvite && !isInvited ? (
            <Card>
              <CardHeader>
                <CardTitle>Invite a member</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="space-y-3">
                  <Input
                    label="Email or member ID"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    error={inviteError}
                    placeholder="name@example.com"
                    startIcon={<FiUserPlus className="h-4 w-4" aria-hidden="true" />}
                  />
                  <Select
                    label="Role"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                    options={TEAM_MEMBER_ROLE_OPTIONS}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    size="sm"
                    isLoading={action === 'invite'}
                  >
                    Send invitation
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length ? (
                <ul className="space-y-2.5">
                  {members.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {entry.user.name}
                        </p>
                        <p className="truncate text-xs text-ink-subtle">
                          {teamRoleLabel(entry.role)}
                          {entry.status === 'invited' ? ' - invited' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {team.isOwner && entry.role !== 'owner' && entry.status === 'active' ? (
                          <select
                            value={entry.role}
                            onChange={(event) => handleRoleChange(entry, event.target.value)}
                            className="h-9 rounded-lg border border-line-strong bg-white px-2 text-xs text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                            aria-label={`Role for ${entry.user.name}`}
                          >
                            {TEAM_MEMBER_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge size="sm" variant="neutral">
                            {teamRoleLabel(entry.role)}
                          </Badge>
                        )}
                        {team.canManage &&
                        entry.role !== 'owner' &&
                        entry.user.id !== user.id ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(entry)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">
                  Member details are not available to you.
                </p>
              )}
            </CardContent>
          </Card>

          {team.canLeave ? (
            <Button
              fullWidth
              variant="secondary"
              onClick={() => setLeaveOpen(true)}
            >
              <FiLogOut className="h-4 w-4" aria-hidden="true" />
              Leave team
            </Button>
          ) : null}
        </div>
      </div>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Leave this team?"
        description="You will need a new invitation from the owner or a manager to rejoin."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              Stay
            </Button>
            <Button variant="danger" isLoading={action === 'leave'} onClick={handleLeave}>
              Leave team
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-muted">
          You are about to leave {team.name}.
        </p>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this team?"
        description="This permanently removes the team, its memberships, and its updates."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Keep team
            </Button>
            <Button variant="danger" isLoading={action === 'delete'} onClick={handleDelete}>
              Delete team
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-muted">
          Are you sure you want to delete {team.name}?
        </p>
      </Modal>
    </div>
  );
}

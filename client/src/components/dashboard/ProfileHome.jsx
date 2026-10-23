import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiAward,
  FiCheck,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
  FiSettings,
  FiShare2,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import Alert from '../ui/Alert';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { buttonClasses } from '../ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/Card';
import PageLoader from '../PageLoader';
import ProgressBar from '../ui/ProgressBar';
import ProgressRing from '../ui/ProgressRing';
import { profileApi } from '../../api/profile.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/apiError';
import { getStatusMeta } from '../../utils/account';
import { formatDate, getFirstName } from '../../utils/format';
import { getCompletionLabel } from '../../utils/profile';
import { getRoleLabel, getRoleMeta } from '../../utils/roles';

function ChecklistItem({ done, title, description, action = null }) {
  return (
    <div className="flex items-start gap-3 rounded-tile border border-line px-3.5 py-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          done
            ? 'border-verified/20 bg-verified-soft text-verified'
            : 'border-pending/25 bg-pending-soft text-pending'
        }`}
      >
        {done ? (
          <FiCheck className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <FiClock className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-body">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default function ProfileHome() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const meta = getRoleMeta(user.role);
  const status = getStatusMeta(user.status);
  const RoleIcon = meta.icon;

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await profileApi.getMyProfile();
      const nextProfile = response.data.data.profile;
      setProfile(nextProfile);
      if (nextProfile) {
        const userUpdates = { avatarUrl: nextProfile.avatar?.url || null };
        if (nextProfile.role === 'recruiter' && nextProfile.name) {
          userUpdates.name = nextProfile.name;
        }
        updateUser(userUpdates);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const shareProfile = async () => {
    if (!profile?.slug) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${profile.slug}`);
      toast.success('Profile link copied', 'You can share it with coaches, teams, or organisations.');
    } catch {
      toast.error('Could not copy the link', 'Open your public profile and copy the address instead.');
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading your profile…" />;
  }

  if (error) {
    return (
      <div>
        <Alert variant="error" title="We could not load your profile">
          {error}
        </Alert>
        <button
          type="button"
          onClick={loadProfile}
          className={`${buttonClasses({ variant: 'secondary', size: 'md' })} mt-4`}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <Alert variant="warning" title="Your profile is not set up yet">
        Finish profile setup to see your dashboard.
        <div className="mt-3">
          <Link to="/onboarding" className={buttonClasses({ size: 'sm' })}>
            Continue setup
          </Link>
        </div>
      </Alert>
    );
  }

  const displayName = profile.role === 'recruiter' ? profile.name || user.name : user.name;
  const completion = profile.completion || { score: 0, missing: [] };
  const missing = completion.missing || [];
  const location = [profile.location?.city, profile.location?.region, profile.location?.country]
    .filter(Boolean)
    .join(', ');
  const avatarUrl = profile.avatar?.url || user.avatarUrl;
  const publicPath = profile.slug ? `/p/${profile.slug}` : null;
  const sports = profile.sports || [];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{today}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="brand">{getRoleLabel(user.role)}</Badge>
            <Badge variant={user.isEmailVerified ? 'success' : 'warning'} dot>
              {user.isEmailVerified ? 'Email verified' : 'Email unverified'}
            </Badge>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">
            Welcome back, <span className="display-emphasis">{getFirstName(displayName)}.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
            Keep your profile current so the right people can find and understand your work.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to="/profile/edit"
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            <FiEdit3 className="h-4 w-4" aria-hidden="true" />
            Edit profile
          </Link>
          {publicPath ? (
            <Link to={publicPath} className={buttonClasses({ size: 'sm' })}>
              View public profile
              <FiExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar name={displayName} src={avatarUrl} size="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-xl">{displayName}</h2>
                    <Badge size="sm" variant="neutral">
                      {profile.role === 'recruiter'
                        ? 'Organisation'
                        : getRoleLabel(profile.role)}
                    </Badge>
                  </div>
                  {profile.headline ? (
                    <p className="mt-1 text-sm font-medium text-body">{profile.headline}</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate">Add a headline to introduce yourself.</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate">
                    {location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <FiMapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {location}
                      </span>
                    ) : null}
                    {profile.slug ? (
                      <span className="inline-flex items-center gap-1.5">
                        <FiGlobe className="h-3.5 w-3.5" aria-hidden="true" />
                        /p/{profile.slug}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {sports.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
                  {sports.map((sport) => (
                    <Badge key={sport} size="sm" variant="brand">
                      {sport}
                    </Badge>
                  ))}
                  {profile.level ? (
                    <Badge size="sm" variant="neutral">
                      {profile.level.replaceAll('_', ' ')}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5">
                <ProgressBar
                  value={completion.score}
                  label="Profile completion"
                  tone={completion.score >= 100 ? 'success' : 'brand'}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next steps</CardTitle>
              <CardDescription>
                Finish the details that make your profile more useful to viewers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <ChecklistItem
                done
                title="Account created"
                description="Your SportLinked account is active."
              />
              <ChecklistItem
                done={user.isEmailVerified}
                title="Email verified"
                description={
                  user.isEmailVerified
                    ? 'You have confirmed ownership of your email address.'
                    : 'Confirm your email to unlock trusted account actions.'
                }
                action={
                  !user.isEmailVerified ? (
                    <Link
                      to="/verify-email"
                      className="shrink-0 text-xs font-semibold text-track underline-offset-4 hover:underline"
                    >
                      Verify
                    </Link>
                  ) : null
                }
              />
              <ChecklistItem
                done
                title="Public profile live"
                description={
                  publicPath
                    ? 'Your public profile is available through its share link.'
                    : 'Your public profile will be available after setup.'
                }
                action={
                  publicPath ? (
                    <Link
                      to={publicPath}
                      className="shrink-0 text-xs font-semibold text-track underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
                  ) : null
                }
              />
              <ChecklistItem
                done={completion.score >= 100}
                title="Profile completed"
                description={
                  completion.score >= 100
                    ? 'All recommended profile details have been added.'
                    : `${missing.length} recommended ${missing.length === 1 ? 'detail is' : 'details are'} still missing.`
                }
                action={
                  <Link
                    to="/profile/edit"
                    className="shrink-0 text-xs font-semibold text-track underline-offset-4 hover:underline"
                  >
                    {completion.score >= 100 ? 'Review' : 'Complete'}
                  </Link>
                }
              />
            </CardContent>
          </Card>

          {missing.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Finish your profile</CardTitle>
                <CardDescription>Add these details from the profile editor.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {missing.map((key) => (
                    <li
                      key={key}
                      className="flex items-center gap-2 rounded-tile bg-sand/60 px-3 py-2 text-xs text-body"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pending-soft0" />
                      {getCompletionLabel(key)}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/profile/edit"
                  className={`${buttonClasses({ variant: 'secondary', size: 'sm' })} mt-4`}
                >
                  Open profile editor
                  <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>What is next for {getRoleLabel(user.role).toLowerCase()}s</CardTitle>
              <CardDescription>Capabilities planned after profile setup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {meta.nextUp.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-3 rounded-tile border border-line px-3.5 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sand0" aria-hidden="true" />
                    <p className="text-sm text-navy">{item}</p>
                  </div>
                  <Badge size="sm" variant="neutral">
                    Planned
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Completion</CardTitle>
                <Badge size="sm" variant={completion.score >= 100 ? 'success' : 'brand'}>
                  {completion.score}%
                </Badge>
              </div>
              <CardDescription>
                {completion.score >= 100
                  ? 'Your profile has all recommended details.'
                  : 'A complete profile helps viewers understand you faster.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ProgressRing value={completion.score} size={84} strokeWidth={7} showLabel={false} />
                <div className="min-w-0">
                  <p className="font-display text-lg">{getRoleLabel(user.role)} profile</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate">
                    {profile.visibility?.contact === 'public'
                      ? 'Contact details are public'
                      : 'Some sections are restricted'}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-track">
                    <RoleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {completion.score}% complete
                  </p>
                </div>
              </div>
              <Link
                to="/profile/edit"
                className={`${buttonClasses({ variant: 'secondary', size: 'sm', fullWidth: true })} mt-4`}
              >
                <FiUser className="h-4 w-4" aria-hidden="true" />
                Manage profile
              </Link>
            </CardContent>
          </Card>

          {publicPath ? (
            <Card>
              <CardHeader>
                <CardTitle>Public profile link</CardTitle>
                <CardDescription>Share your profile with the sporting community.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="truncate rounded-tile border border-line bg-sand/60 px-3 py-2 text-xs text-body">
                  /p/{profile.slug}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={shareProfile}
                    className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                  >
                    <FiShare2 className="h-4 w-4" aria-hidden="true" />
                    Copy link
                  </button>
                  <Link to={publicPath} className={buttonClasses({ size: 'sm' })}>
                    View
                    <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar name={displayName} src={avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{displayName}</p>
                  <p className="truncate text-sm text-body">{user.email}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-body">Member since</dt>
                  <dd className="font-medium text-navy">{formatDate(user.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-body">Last sign-in</dt>
                  <dd className="font-medium text-navy">{formatDate(user.lastLoginAt)}</dd>
                </div>
              </dl>

              <Link
                to="/settings"
                className={`${buttonClasses({ variant: 'ghost', size: 'sm', fullWidth: true })} mt-4`}
              >
                <FiSettings className="h-4 w-4" aria-hidden="true" />
                Account settings
              </Link>
            </CardContent>
          </Card>

          <div className="rounded-card border border-line bg-sand/70 p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-tile bg-white text-track">
                <FiShield className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-navy">Verification is specific</p>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-track">
              Email verification is separate from identity, qualification, or achievement
              verification. Only badges explicitly marked verified should be treated as reviewed.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-track">
              <FiAward className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Manage achievements from your profile editor.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiEdit3,
  FiKey,
  FiLogOut,
  FiMail,
  FiShield,
  FiTrash2,
} from 'react-icons/fi';
import Avatar from '../components/ui/Avatar';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button, { buttonClasses } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Checkbox from '../components/ui/Checkbox';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import PasswordInput from '../components/PasswordInput';
import { authApi } from '../api/auth.api';
import { notificationsApi } from '../api/notifications.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getStatusMeta } from '../utils/account';
import { formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/apiError';
import { getRoleLabel } from '../utils/roles';

const EMAIL_PREFERENCE_OPTIONS = [
  {
    key: 'messages',
    label: 'Direct messages',
    description: 'Email me when another member sends a new direct message.',
  },
  {
    key: 'connections',
    label: 'Connections',
    description: 'Connection requests, acceptances, and declines.',
  },
  {
    key: 'applications',
    label: 'Applications',
    description: 'New applicants and status changes on your applications.',
  },
  {
    key: 'verifications',
    label: 'Verification decisions',
    description: 'Updates when verification requests are approved or expire.',
  },
  {
    key: 'social',
    label: 'Social activity',
    description: 'Likes, comments, and shares on your posts.',
  },
  {
    key: 'events',
    label: 'Events',
    description: 'Registration updates, waitlist promotions, and event cancellations.',
  },
  {
    key: 'teams',
    label: 'Teams and groups',
    description: 'Team invitations, new members, and team updates.',
  },
  {
    key: 'opportunityDeadlines',
    label: 'Saved opportunity reminders',
    description: 'A reminder when a saved opportunity is closing soon.',
  },
];

export default function Settings() {
  useDocumentTitle('Account settings');
  const { user, logout, clearSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isResending, setIsResending] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [savingPreference, setSavingPreference] = useState('');
  const [preferencesError, setPreferencesError] = useState('');

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateError, setDeactivateError] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const status = getStatusMeta(user.status);

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      setIsLoadingPreferences(true);
      setPreferencesError('');
      try {
        const response = await notificationsApi.preferences();
        if (!cancelled) {
          setEmailPreferences(response.data.data.preferences);
        }
      } catch (error) {
        if (!cancelled) {
          setPreferencesError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPreferences(false);
        }
      }
    };

    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePreferenceChange = async (key, checked) => {
    const previous = emailPreferences;
    setEmailPreferences((current) => ({ ...current, [key]: checked }));
    setSavingPreference(key);
    setPreferencesError('');
    try {
      const response = await notificationsApi.updatePreferences({ [key]: checked });
      setEmailPreferences(response.data.data.preferences);
    } catch (error) {
      setEmailPreferences(previous);
      setPreferencesError(getErrorMessage(error));
      toast.error('Could not update email preferences', getErrorMessage(error));
    } finally {
      setSavingPreference('');
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await authApi.resendVerification();
      toast.success(
        'Verification email sent',
        `Open the newest link sent to ${user.email}.`,
      );
    } catch (error) {
      toast.error('Could not resend the email', getErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setIsSendingReset(true);
    try {
      await authApi.forgotPassword(user.email);
      toast.success(
        'Password reset email sent',
        `If your account is active, a reset link is on its way to ${user.email}.`,
      );
    } catch (error) {
      toast.error('Could not send the reset email', getErrorMessage(error));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Signed out', 'Your session on this device has ended.');
    } catch {
      toast.info('Signed out', 'Your local session was cleared.');
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  const openDeactivate = () => {
    setDeactivatePassword('');
    setDeactivateError('');
    setDeactivateOpen(true);
  };

  const closeDeactivate = () => {
    if (isDeactivating) return;
    setDeactivateOpen(false);
    setDeactivatePassword('');
    setDeactivateError('');
  };

  const handleDeactivate = async (event) => {
    event.preventDefault();
    setDeactivateError('');
    setIsDeactivating(true);

    try {
      await authApi.deactivate(deactivatePassword);
      setDeactivateOpen(false);
      clearSession();
      toast.success(
        'Account deactivated',
        'You have been signed out. Contact support if you need help with your account.',
      );
      navigate('/login', { replace: true });
    } catch (error) {
      setDeactivateError(getErrorMessage(error));
    } finally {
      setIsDeactivating(false);
    }
  };

  const openDelete = () => {
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteError('');
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteError('');
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE exactly to confirm.');
      return;
    }

    setDeleteError('');
    setIsDeleting(true);

    try {
      await authApi.deleteAccount(deletePassword);
      setDeleteOpen(false);
      clearSession();
      toast.success('Account deleted', 'Your account and personal data have been removed.');
      navigate('/login', { replace: true });
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
          Account <span className="display-emphasis">settings.</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-body">
          Manage your account details, email verification, security, and session.
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account details</CardTitle>
              <CardDescription>
                The information tied to your SportLinked account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar name={user.name} src={user.avatarUrl} size="xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl">{user.name}</p>
                  <p className="truncate text-sm text-body">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="brand">{getRoleLabel(user.role)}</Badge>
                    <Badge variant={status.variant} dot>
                      {status.label}
                    </Badge>
                    <Badge
                      variant={user.isEmailVerified ? 'success' : 'warning'}
                      dot
                    >
                      {user.isEmailVerified ? 'Email verified' : 'Email unverified'}
                    </Badge>
                  </div>
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-body">Member since</dt>
                  <dd className="font-medium text-navy">{formatDate(user.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-body">Last sign-in</dt>
                  <dd className="font-medium text-navy">{formatDate(user.lastLoginAt)}</dd>
                </div>
              </dl>

              {user.role === 'admin' ? (
                <p className="mt-4 rounded-tile bg-sand/60 px-3.5 py-3 text-xs leading-relaxed text-body">
                  Administrator accounts do not have a public SportLinked profile. Account
                  verification and security settings remain available here.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-3 rounded-tile bg-sand/60 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-body">
                    Profile details, photos, achievements, and visibility are managed separately
                    from your account settings.
                  </p>
                  <Link
                    to="/profile/edit"
                    className={`${buttonClasses({ variant: 'secondary', size: 'sm' })} shrink-0`}
                  >
                    <FiEdit3 className="h-4 w-4" aria-hidden="true" />
                    Edit profile
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Email verification</CardTitle>
                  <CardDescription>
                    Confirm that you own the email address on your account.
                  </CardDescription>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile bg-sand text-track">
                  <FiMail className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {user.isEmailVerified ? (
                <div className="flex items-start gap-3 rounded-tile border border-verified/20 bg-verified-soft px-3.5 py-3">
                  <FiCheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-verified"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-verified">Your email is verified</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-verified">
                      {user.email} has confirmed email status. This does not verify identity,
                      qualifications, or achievements.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Alert variant="warning" title="Your email is not verified">
                    Some trusted actions may be limited until you confirm your email address.
                  </Alert>
                  <Button
                    variant="secondary"
                    size="md"
                    className="mt-4"
                    onClick={handleResendVerification}
                    isLoading={isResending}
                  >
                    Resend verification email
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Email notifications</CardTitle>
                  <CardDescription>
                    Choose which activity should also send an email. In-app notifications
                    are always available.
                  </CardDescription>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile bg-sand text-track">
                  <FiBell className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {preferencesError ? (
                <Alert variant="error" className="mb-3">
                  {preferencesError}
                </Alert>
              ) : null}

              {isLoadingPreferences ? (
                <p className="text-sm text-body">Loading preferences...</p>
              ) : (
                <div className="space-y-2.5">
                  {EMAIL_PREFERENCE_OPTIONS.map((option) => (
                    <Checkbox
                      key={option.key}
                      label={option.label}
                      description={option.description}
                      checked={Boolean(emailPreferences?.[option.key])}
                      disabled={savingPreference === option.key}
                      onChange={(event) =>
                        handlePreferenceChange(option.key, event.target.checked)
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password and security</CardTitle>
              <CardDescription>
                Passwords are stored as bcrypt hashes and never kept in plain text.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 rounded-tile border border-line px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <FiKey className="mt-0.5 h-4 w-4 shrink-0 text-slate" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-navy">Password</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-body">
                      Send a single-use reset link to your email. Resetting signs out other
                      sessions.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={handleSendPasswordReset}
                  isLoading={isSendingReset}
                >
                  Send reset link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Current session</CardTitle>
                  <CardDescription>You are signed in on this device.</CardDescription>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile bg-sand text-body">
                  <FiShield className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-body">Account</dt>
                  <dd className="max-w-[60%] truncate font-medium text-navy">{user.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-body">Last sign-in</dt>
                  <dd className="font-medium text-navy">{formatDate(user.lastLoginAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-body">Refresh session</dt>
                  <dd>
                    <Badge size="sm" variant="success" dot>
                      Active
                    </Badge>
                  </dd>
                </div>
              </dl>

              <Button
                variant="secondary"
                size="md"
                fullWidth
                className="mt-5"
                onClick={handleLogout}
                isLoading={isLoggingOut}
                leftIcon={<FiLogOut className="h-4 w-4" aria-hidden="true" />}
              >
                Sign out of this device
              </Button>
            </CardContent>
          </Card>

          <Card className="border-danger-100">
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>These actions affect access to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-navy">Deactivate account</p>
                <p className="mt-1 text-xs leading-relaxed text-body">
                  Your account can no longer be used to sign in. Reactivation is not available in
                  this release.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 border-pending/25 text-pending hover:bg-pending-soft"
                  onClick={openDeactivate}
                >
                  Deactivate account
                </Button>
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-sm font-semibold text-navy">Delete account</p>
                <p className="mt-1 text-xs leading-relaxed text-body">
                  Permanently removes your account and associated data. This cannot be undone.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-3"
                  onClick={openDelete}
                  leftIcon={<FiTrash2 className="h-4 w-4" aria-hidden="true" />}
                >
                  Delete account
                </Button>
              </div>

              <div className="flex items-start gap-2 rounded-tile bg-danger-50 px-3 py-2.5 text-xs leading-relaxed text-danger-700">
                <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Both actions require your current password. Deactivated accounts cannot sign in.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        open={deactivateOpen}
        onClose={closeDeactivate}
        title="Deactivate your account?"
        description="You will be signed out and blocked from signing in. Reactivation is not available in this release."
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={closeDeactivate}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              type="submit"
              form="deactivate-form"
              isLoading={isDeactivating}
              disabled={!deactivatePassword}
            >
              Deactivate account
            </Button>
          </>
        }
      >
        <form id="deactivate-form" onSubmit={handleDeactivate} className="space-y-4">
          {deactivateError ? <Alert variant="error">{deactivateError}</Alert> : null}
          <PasswordInput
            label="Current password"
            name="deactivate-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={deactivatePassword}
            onChange={(event) => {
              setDeactivatePassword(event.target.value);
              setDeactivateError('');
            }}
            required
            autoFocus
          />
          <p className="text-xs leading-relaxed text-body">
            Your refresh session will be revoked immediately. Any short-lived access token expires
            shortly after.
          </p>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={closeDelete}
        title="Delete your account permanently?"
        description="This removes your account and associated personal data. It cannot be undone."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              type="submit"
              form="delete-form"
              isLoading={isDeleting}
              disabled={!deletePassword || deleteConfirmation !== 'DELETE'}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <form id="delete-form" onSubmit={handleDelete} className="space-y-4">
          {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}
          <Alert variant="warning" title="This cannot be undone">
            Your profile, achievements, statistics, uploaded images, and account data will be
            permanently removed.
          </Alert>
          <PasswordInput
            label="Current password"
            name="delete-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={deletePassword}
            onChange={(event) => {
              setDeletePassword(event.target.value);
              setDeleteError('');
            }}
            required
            autoFocus
          />
          <Input
            label="Type DELETE to confirm"
            name="delete-confirmation"
            type="text"
            autoComplete="off"
            placeholder="DELETE"
            value={deleteConfirmation}
            onChange={(event) => {
              setDeleteConfirmation(event.target.value);
              setDeleteError('');
            }}
            required
          />
        </form>
      </Modal>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiMail } from 'react-icons/fi';
import Logo from '../components/Logo';
import Alert from '../components/ui/Alert';
import Button, { buttonClasses } from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { authApi } from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorCode, getErrorMessage } from '../utils/apiError';

export default function VerifyEmail() {
  useDocumentTitle('Verify email');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [isResending, setIsResending] = useState(false);
  const submittedToken = useRef(null);

  useEffect(() => {
    if (!token || submittedToken.current === token) {
      return;
    }

    submittedToken.current = token;
    setStatus('verifying');

    authApi
      .verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.data.message);
        refreshUser().catch(() => {});
      })
      .catch((error) => {
        setStatus('error');
        setMessage(getErrorMessage(error));
        setErrorCode(getErrorCode(error));
      });
  }, [token, refreshUser]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.resendVerification();
      toast.success(
        'Verification email sent',
        'Open the newest link in your inbox. Older links may stop working.',
      );
      if (status === 'error') {
        setStatus('idle');
        setMessage('');
        setErrorCode('');
      }
    } catch (error) {
      toast.error('Could not resend the email', getErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  const renderResendButton = (label = 'Resend verification email') => (
    <Button
      variant="secondary"
      size="lg"
      fullWidth
      isLoading={isResending}
      onClick={handleResend}
      className="mt-3"
    >
      {label}
    </Button>
  );

  const renderStatus = () => {
    if (status === 'verifying') {
      return (
        <div className="text-center" role="status" aria-live="polite">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-brand-700">
            <Spinner size="lg" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
            Verifying your email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Please wait while we confirm your verification link.
          </p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div aria-live="polite">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-success-100 bg-success-50 text-success-600">
            <FiCheckCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
            Email verified
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {message || 'Your email address has been verified.'}
          </p>

          <Alert variant="info" className="mt-5">
            This verifies ownership of your email address only. Identity, qualifications, and
            achievements each require their own review.
          </Alert>

          <Link
            to={user ? '/dashboard' : '/login'}
            className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-6' })}
          >
            {user ? 'Go to your workspace' : 'Sign in to continue'}
          </Link>
        </div>
      );
    }

    if (status === 'error') {
      const alreadyVerified = errorCode === 'EMAIL_ALREADY_VERIFIED';

      return (
        <div aria-live="polite">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-danger-100 bg-danger-50 text-danger-600">
            <FiAlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
            {alreadyVerified ? 'Already verified' : 'This link could not be used'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {message || 'The verification link is invalid or has expired.'}
          </p>

          {user && !user.isEmailVerified ? renderResendButton() : null}

          <Link
            to={user ? '/dashboard' : '/login'}
            className={buttonClasses({
              variant: 'secondary',
              size: 'lg',
              fullWidth: true,
              className: 'mt-3',
            })}
          >
            {user ? 'Back to your workspace' : 'Sign in'}
          </Link>

          {!user ? (
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-subtle">
              Sign in to request a new verification link from your account settings.
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700">
          <FiMail className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          {user && user.isEmailVerified ? 'Your email is verified' : 'Verify your email address'}
        </h1>

        {user ? (
          user.isEmailVerified ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {user.email} already has verified email status. No further action is needed.
              </p>
              <Link
                to="/dashboard"
                className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-6' })}
              >
                Go to your workspace
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                We can send a fresh verification link to{' '}
                <span className="font-medium text-ink">{user.email}</span>. The newest link replaces
                any earlier one.
              </p>
              {renderResendButton()}
              <Link
                to="/dashboard"
                className={buttonClasses({
                  variant: 'ghost',
                  size: 'md',
                  fullWidth: true,
                  className: 'mt-2',
                })}
              >
                Back to dashboard
              </Link>
            </>
          )
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Open the verification link we sent to your email. If you are already signed in, you
              can request a fresh link from this page.
            </p>
            <Link
              to="/login"
              className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-6' })}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={buttonClasses({
                variant: 'ghost',
                size: 'md',
                fullWidth: true,
                className: 'mt-2',
              })}
            >
              Create a new account
            </Link>
          </>
        )}

        <div className="mt-7 rounded-lg border border-line bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo size="sm" showWordmark={false} />
            <p className="text-xs font-semibold text-ink">About email verification</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            Verification links expire after 24 hours. Uploading a document never verifies an
            account automatically.
          </p>
        </div>
      </div>
    );
  };

  return <div>{renderStatus()}</div>;
}

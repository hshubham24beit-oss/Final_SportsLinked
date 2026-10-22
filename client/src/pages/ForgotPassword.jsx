import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail } from 'react-icons/fi';
import AuthHeader from '../components/AuthHeader';
import Alert from '../components/ui/Alert';
import Button, { buttonClasses } from '../components/ui/Button';
import Input from '../components/ui/Input';
import { authApi } from '../api/auth.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';
import { validateEmail } from '../utils/validation';

export default function ForgotPassword() {
  useDocumentTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setError('');

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (requestError) {
      setServerError(getErrorMessage(requestError));
      const fieldErrors = getFieldErrors(requestError);
      if (fieldErrors.email) {
        setError(fieldErrors.email);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700">
          <FiMail className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          Check your email
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          If an account exists for{' '}
          <span className="font-medium text-ink">{email.trim()}</span>, we sent a password reset
          link. It expires after one hour and can be used once.
        </p>

        <Alert variant="info" className="mt-5" title="No email yet?">
          Check your spam folder and make sure the address is correct. For security, we do not
          confirm whether an email is registered.
        </Alert>

        <Link
          to="/login"
          className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-6' })}
        >
          Back to sign in
        </Link>

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail('');
          }}
          className="mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <AuthHeader
        eyebrow="Account recovery"
        title="Forgot your password?"
        description="Enter the email address on your account and we will send a secure reset link."
      />

      {serverError ? (
        <Alert variant="error" className="mb-5">
          {serverError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
            setServerError('');
          }}
          error={error}
          required
          autoFocus
        />

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Remembered your password?{' '}
        <Link
          to="/login"
          className="font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

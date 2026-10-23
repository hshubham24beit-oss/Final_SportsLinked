import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiKey } from 'react-icons/fi';
import AuthHeader from '../components/AuthHeader';
import PasswordInput from '../components/PasswordInput';
import Alert from '../components/ui/Alert';
import Button, { buttonClasses } from '../components/ui/Button';
import { authApi } from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';
import { validateConfirmation, validatePassword } from '../utils/validation';

export default function ResetPassword() {
  useDocumentTitle('Reset password');
  const [searchParams] = useSearchParams();
  const { clearSession } = useAuth();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setServerError('');
  };

  const validateForm = () => {
    const nextErrors = {};
    const passwordError = validatePassword(form.password);
    const confirmationError = validateConfirmation(form.password, form.confirmPassword);

    if (passwordError) nextErrors.password = passwordError;
    if (confirmationError) nextErrors.confirmPassword = confirmationError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, password: form.password });
      clearSession();
      setResetComplete(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((current) => ({ ...current, ...fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-card border border-danger-100 bg-danger-50 text-danger-600">
          <FiKey className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-navy sm:text-[2rem]">
          This reset link is incomplete
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-body">
          Open the full link from your password reset email, or request a new one.
        </p>
        <Link
          to="/forgot-password"
          className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-6' })}
        >
          Request a new link
        </Link>
        <Link
          to="/login"
          className={buttonClasses({
            variant: 'ghost',
            size: 'md',
            fullWidth: true,
            className: 'mt-2',
          })}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-card border border-verified/20 bg-verified-soft text-verified">
          <FiCheckCircle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-navy sm:text-[2rem]">
          Password updated
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-body">
          Your password has been changed and other sessions have been invalidated. Sign in with
          your new password.
        </p>
        <Link
          to="/login"
          className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-6' })}
        >
          Sign in
        </Link>
        <div className="mt-6 flex items-start gap-2 rounded-tile bg-sand/60 px-3.5 py-3 text-xs leading-relaxed text-body">
          <FiKey className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
          For security, all refresh sessions were revoked. Any existing access token expires within
          minutes.
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeader
        eyebrow="Choose a new password"
        title="Reset your password"
        description="Use a strong password you have not used elsewhere. Resetting will sign out other sessions."
      />

      {serverError ? (
        <Alert variant="error" className="mb-5">
          {serverError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <PasswordInput
          label="New password"
          name="password"
          autoComplete="new-password"
          placeholder="Enter a new password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters, including a letter and a number."
          required
          autoFocus
        />

        <PasswordInput
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter the new password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          required
        />

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Reset password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-body">
        <Link
          to="/login"
          className="font-semibold text-track underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

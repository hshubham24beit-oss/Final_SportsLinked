import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import PasswordInput from '../components/PasswordInput';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';
import { safeRedirect } from '../utils/redirect';
import { validateEmail } from '../utils/validation';

export default function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setServerError('');
  };

  const validateForm = () => {
    const nextErrors = {};
    const emailError = validateEmail(form.email);

    if (emailError) nextErrors.email = emailError;
    if (!form.password) nextErrors.password = 'Password is required.';

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
      await login({ email: form.email.trim(), password: form.password });
      navigate(safeRedirect(searchParams.get('redirect'), '/dashboard'), { replace: true });
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

  return (
    <div>
      <AuthHeader
        eyebrow="Welcome back"
        title="Sign in to SportLinked"
        description="Continue to your role-based workspace, profile, and opportunities."
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
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          required
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-medium text-navy">
              Password<span className="ml-0.5 text-danger-600" aria-hidden="true">*</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-track underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
        </div>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-body">
        New to SportLinked?{' '}
        <Link
          to="/register"
          className="font-semibold text-track underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
        >
          Create an account
        </Link>
      </p>

      <div className="mt-7 rounded-tile border border-line bg-sand/60 px-4 py-3 text-xs leading-relaxed text-body">
        Your sign-in session uses a short-lived access token and a secure, httpOnly refresh cookie.
        Signing out ends the session on this device.
      </div>
    </div>
  );
}

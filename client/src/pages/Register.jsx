import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiMail } from 'react-icons/fi';
import AuthHeader from '../components/AuthHeader';
import PasswordInput from '../components/PasswordInput';
import Alert from '../components/ui/Alert';
import Button, { buttonClasses } from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ROLE_OPTIONS } from '../utils/roles';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';
import {
  validateConfirmation,
  validateEmail,
  validateName,
  validatePassword,
} from '../utils/validation';

const validRoleValues = ROLE_OPTIONS.map((role) => role.value);

export default function Register() {
  useDocumentTitle('Create your account');
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const requestedRole = searchParams.get('role');
  const initialRole = validRoleValues.includes(requestedRole) ? requestedRole : 'athlete';

  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const selectedRole = ROLE_OPTIONS.find((option) => option.value === role) || ROLE_OPTIONS[0];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setServerError('');
  };

  const handleRoleChange = (value) => {
    setRole(value);
    setErrors((current) => ({ ...current, role: undefined }));
    setServerError('');
  };

  const validateForm = () => {
    const nextErrors = {};
    const nameError = validateName(form.name);
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const confirmationError = validateConfirmation(form.password, form.confirmPassword);

    if (nameError) nextErrors.name = nameError;
    if (emailError) nextErrors.email = emailError;
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
      const data = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
      });
      setResult({ email: form.email.trim(), emailSent: data.emailSent });
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

  if (result) {
    return (
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-card border border-line bg-sand text-track">
          <FiMail className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-navy sm:text-[2rem]">
          Check your inbox
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-body">
          Your {selectedRole.label.toLowerCase()} account has been created. We sent a verification
          link to <span className="font-medium text-navy">{result.email}</span>.
        </p>

        {result.emailSent ? (
          <div className="mt-5">
            <Alert variant="info" title="What happens next">
              Open the link in your email to verify your address, then sign in. Verification links
              expire after 24 hours.
            </Alert>
          </div>
        ) : (
          <div className="mt-5">
            <Alert variant="warning" title="Verification email not sent">
              Your account was created, but we could not send the email. Sign in and request a new
              verification link from your workspace.
            </Alert>
          </div>
        )}

        <Link
          to="/login"
          className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mt-6' })}
        >
          Go to sign in
        </Link>

        <p className="mt-5 text-center text-sm text-body">
          Need help with verification?{' '}
          <Link
            to="/verify-email"
            className="font-semibold text-track underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
          >
            View verification steps
          </Link>
        </p>

        <div className="mt-6 flex items-start gap-2 rounded-tile bg-sand/60 px-3.5 py-3 text-xs leading-relaxed text-body">
          <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
          Email verification confirms ownership of your email address. It does not verify your
          identity, qualifications, or achievements.
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeader
        eyebrow="Join SportLinked"
        title="Create your account"
        description="Choose your role and set up a professional account built for sport."
      />

      {serverError ? (
        <Alert variant="error" className="mb-5">
          {serverError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-navy">I am joining as</legend>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = role === option.value;

              return (
                <label
                  key={option.value}
                  className={`relative flex cursor-pointer flex-col gap-2 rounded-tile border p-3 transition-colors focus-within:ring-2 focus-within:ring-track focus-within:ring-offset-2 ${
                    isSelected
                      ? 'border-track bg-track/10'
                      : 'border-line-strong bg-white hover:border-track/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handleRoleChange(option.value)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between">
                    <Icon
                      className={`h-5 w-5 ${isSelected ? 'text-track' : 'text-slate'}`}
                      aria-hidden="true"
                    />
                    {isSelected ? (
                      <FiCheckCircle className="h-4 w-4 text-track" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="text-sm font-semibold text-navy">{option.label}</span>
                  <span className="text-[11px] leading-snug text-body">{option.tagline}</span>
                </label>
              );
            })}
          </div>
          {errors.role ? <p className="mt-1.5 text-sm text-danger-600">{errors.role}</p> : null}
          <p className="mt-2 text-xs leading-relaxed text-slate">{selectedRole.description}</p>
        </fieldset>

        <Input
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="e.g. Alex Morgan"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

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

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters, including a letter and a number."
          required
        />

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          required
        />

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-3 text-center text-xs leading-relaxed text-slate">
        By creating an account you agree to keep your profile information accurate and to use
        SportLinked responsibly.
      </p>

      <p className="mt-6 text-center text-sm text-body">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-track underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

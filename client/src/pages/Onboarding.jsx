import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiLogOut,
  FiMapPin,
  FiShield,
} from 'react-icons/fi';
import Logo from '../components/Logo';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import {
  BasicsFields,
  ContactFields,
  ExperienceFields,
  RoleFields,
  VisibilityFields,
} from '../components/profile/ProfileFields';
import { profileApi } from '../api/profile.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';
import { getRoleLabel } from '../utils/roles';
import {
  buildProfilePayload,
  createEmptyProfile,
  getOnboardingSteps,
  stepIndexForField,
  validateProfileStep,
} from '../utils/profile';

function setByPath(object, path, value) {
  const parts = path.split('.');
  const key = parts[0];

  if (parts.length === 1) {
    return { ...object, [key]: value };
  }

  return {
    ...object,
    [key]: setByPath(object[key] || {}, parts.slice(1).join('.'), value),
  };
}

function ReviewSection({ title, children }) {
  return (
    <div className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-ink">{children}</div>
    </div>
  );
}

function VisibilityLabel({ value }) {
  if (value === 'public') return 'Public';
  if (value === 'connections') return 'Signed-in members';
  return 'Only me';
}

export default function Onboarding() {
  useDocumentTitle('Set up your profile');
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const steps = useMemo(() => getOnboardingSteps(user.role), [user.role]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => createEmptyProfile(user.role));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (user.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (user.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentStep = steps[step];

  const handleChange = (path, value) => {
    setForm((current) => setByPath(current, path, value));
    setErrors((current) => {
      if (!current[path] && !current[path.split('.')[0]]) {
        return current;
      }
      const next = { ...current };
      delete next[path];
      delete next[path.split('.')[0]];
      return next;
    });
    setServerError('');
  };

  const handleToggleArray = (field, value) => {
    const current = form[field] || [];
    handleChange(
      field,
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleAddArray = (field, entry) => {
    handleChange(field, [...(form[field] || []), entry]);
  };

  const handleUpdateArray = (field, index, key, value) => {
    handleChange(
      field,
      (form[field] || []).map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry,
      ),
    );
  };

  const handleRemoveArray = (field, index) => {
    handleChange(
      field,
      (form[field] || []).filter((_, entryIndex) => entryIndex !== index),
    );
  };

  const goToStep = (nextStep) => {
    setStep(nextStep);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const handleContinue = () => {
    const stepErrors = validateProfileStep(form, user.role, currentStep.key);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      return;
    }
    goToStep(Math.min(steps.length - 1, step + 1));
  };

  const handleBack = () => {
    if (step > 0) {
      goToStep(step - 1);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (currentStep.key !== 'review') {
      handleContinue();
      return;
    }

    setServerError('');

    const allErrors = ['basics', 'role', 'experience', 'contact'].reduce(
      (accumulator, stepKey) => ({
        ...accumulator,
        ...validateProfileStep(form, user.role, stepKey),
      }),
      {},
    );

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstField = Object.keys(allErrors)[0];
      goToStep(stepIndexForField(firstField));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await profileApi.completeOnboarding(
        buildProfilePayload(form, user.role),
      );
      updateUser(response.data.data.user);
      toast.success('Your profile is live', 'You can now add photos and achievements.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setServerError(getErrorMessage(error));
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        goToStep(stepIndexForField(Object.keys(fieldErrors)[0]));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  const displayName = user.role === 'recruiter' && form.name ? form.name : user.name;
  const location = [form.location.city, form.location.region, form.location.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <Badge variant="brand" size="sm" className="hidden sm:inline-flex">
              Profile setup
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            leftIcon={<FiLogOut className="h-4 w-4" aria-hidden="true" />}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
                Step {step + 1} of {steps.length}
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {currentStep.title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
                {currentStep.description}
              </p>
            </div>
            <Badge variant="brand" className="hidden shrink-0 sm:inline-flex">
              {getRoleLabel(user.role)}
            </Badge>
          </div>
          <ProgressBar
            value={((step + 1) / steps.length) * 100}
            label="Setup progress"
            className="mt-5"
          />
        </div>

        <ol className="mb-5 flex flex-wrap gap-2" aria-label="Setup steps">
          {steps.map((item, index) => {
            const complete = index < step;
            const active = index === step;
            return (
              <li key={item.key} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    active
                      ? 'border-brand-200 bg-brand-50 text-brand-800'
                      : complete
                        ? 'border-success-100 bg-success-50 text-success-700'
                        : 'border-line bg-white text-ink-subtle'
                  }`}
                >
                  {complete ? <FiCheck className="h-3 w-3" aria-hidden="true" /> : null}
                  {item.label}
                </span>
              </li>
            );
          })}
        </ol>

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {serverError ? (
                <Alert variant="error" className="mb-5" title="We could not save your profile">
                  {serverError}
                </Alert>
              ) : null}

              {currentStep.key === 'basics' ? (
                <BasicsFields form={form} onChange={handleChange} errors={errors} />
              ) : null}

              {currentStep.key === 'role' ? (
                <RoleFields
                  role={user.role}
                  form={form}
                  onChange={handleChange}
                  onToggleArray={handleToggleArray}
                  errors={errors}
                />
              ) : null}

              {currentStep.key === 'experience' ? (
                <ExperienceFields
                  role={user.role}
                  form={form}
                  onChange={handleChange}
                  onAddArray={handleAddArray}
                  onUpdateArray={handleUpdateArray}
                  onRemoveArray={handleRemoveArray}
                  errors={errors}
                />
              ) : null}

              {currentStep.key === 'contact' ? (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-2 border-b border-line pb-4">
                      <FiMapPin className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-ink">Contact details</h3>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          These are optional, but they help the right people reach you.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ContactFields form={form} onChange={handleChange} errors={errors} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 border-b border-line pb-4">
                      <FiShield className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-ink">
                          Section visibility
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          You can change every section later from your profile editor.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <VisibilityFields form={form} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              ) : null}

              {currentStep.key === 'review' ? (
                <div>
                  <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5">
                    <Badge variant="brand">{getRoleLabel(user.role)} profile</Badge>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
                      {displayName}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-brand-800">{form.headline}</p>
                    {location ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-800">
                        <FiMapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {location}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <ReviewSection title="Bio">{form.bio}</ReviewSection>
                    <ReviewSection title="Sports">
                      {form.sports.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {form.sports.map((sport) => (
                            <Badge key={sport} variant="neutral" size="sm">
                              {sport}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        'No sports added.'
                      )}
                    </ReviewSection>
                    <ReviewSection title="Public contact visibility">
                      {VisibilityLabel(form.visibility.contact)} ·{' '}
                      {form.contact.email
                        ? form.contact.preferences.showEmail
                          ? `Email shown: ${form.contact.email}`
                          : 'Email hidden by preference'
                        : 'No contact email added'}
                    </ReviewSection>
                    <ReviewSection title="Profile completion">
                      A completion score is calculated from your profile details after setup.
                      Photos and achievements can be added in the profile editor.
                    </ReviewSection>
                  </div>

                  <Alert variant="info" className="mt-4" title="What happens next">
                    Your public profile will be available immediately. You can add profile and
                    cover photos, gallery images, statistics, and achievements from your profile
                    editor.
                  </Alert>
                </div>
              ) : null}

              <div className="mt-7 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleBack}
                  disabled={step === 0 || isSubmitting}
                  leftIcon={<FiArrowLeft className="h-4 w-4" aria-hidden="true" />}
                  className={step === 0 ? 'invisible' : ''}
                >
                  Back
                </Button>

                {currentStep.key === 'review' ? (
                  <Button
                    type="submit"
                    size="md"
                    isLoading={isSubmitting}
                    rightIcon={<FiCheck className="h-4 w-4" aria-hidden="true" />}
                  >
                    Publish my profile
                  </Button>
                ) : (
                  <Button
                    size="md"
                    onClick={handleContinue}
                    rightIcon={<FiArrowRight className="h-4 w-4" aria-hidden="true" />}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

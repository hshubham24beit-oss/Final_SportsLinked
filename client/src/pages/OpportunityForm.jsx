import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiSend } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Button, { buttonClasses } from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import Input from '../components/ui/Input';
import PageLoader from '../components/PageLoader';
import Select from '../components/ui/Select';
import TagInput from '../components/ui/TagInput';
import Textarea from '../components/ui/Textarea';
import { opportunitiesApi } from '../api/opportunities.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import {
  ATHLETE_AGE_CATEGORY_OPTIONS,
  ATHLETE_COMPETITION_LEVEL_OPTIONS,
  ATHLETE_LEVEL_OPTIONS,
} from '../utils/profile';
import {
  emptyOpportunityForm,
  opportunityPayload,
  opportunityToForm,
  OPPORTUNITY_TYPE_OPTIONS,
} from '../utils/opportunities';

function setNested(form, section, key, value) {
  return {
    ...form,
    [section]: {
      ...form[section],
      [key]: value,
    },
  };
}

function MultiSelect({ label, value, options, onChange, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy">{label}</label>
      <select
        multiple
        value={value}
        onChange={(event) =>
          onChange(Array.from(event.target.selectedOptions, (option) => option.value))
        }
        className="h-32 w-full rounded-tile border border-line-strong bg-white px-3 py-2 text-sm text-navy shadow-sm focus:border-track focus:outline-none focus:ring-2 focus:ring-track/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-slate">{hint}</p>
    </div>
  );
}

export default function OpportunityForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? 'Edit opportunity' : 'Create opportunity');
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(emptyOpportunityForm);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [submitMode, setSubmitMode] = useState(null);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const isSaving = submitMode === 'save';
  const isPublishing = submitMode === 'publish';

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await opportunitiesApi.get(id);
        if (!cancelled) {
          const opportunity = response.data.data.opportunity;
          if (!opportunity.canEdit) {
            setError('Only draft or published opportunities can be edited.');
          }
          setForm(opportunityToForm(opportunity));
        }
      } catch (requestError) {
        if (!cancelled) setError(getErrorMessage(requestError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (publish = false) => {
    setError('');
    setFieldError('');
    if (!form.deadline) {
      setFieldError('Choose an application deadline.');
      return;
    }
    if (new Date(`${form.deadline}T23:59:59`) <= new Date()) {
      setFieldError('The deadline must be in the future.');
      return;
    }

    setSubmitMode(publish ? 'publish' : 'save');
    try {
      const payload = opportunityPayload(form);
      if (isEdit) {
        await opportunitiesApi.update(id, payload);
        toast.success('Opportunity updated', 'Your changes are saved.');
        navigate(`/opportunities/${id}`);
        return;
      }

      const created = await opportunitiesApi.create(payload);
      const opportunityId = created.data.data.opportunity.id;
      if (publish) {
        await opportunitiesApi.publish(opportunityId);
        toast.success('Opportunity published', 'Athletes can now find and apply to it.');
      } else {
        toast.success('Draft saved', 'Publish it when you are ready for applications.');
      }
      navigate(`/opportunities/${opportunityId}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitMode(null);
    }
  };

  if (isLoading) return <PageLoader message="Loading opportunity..." />;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={isEdit ? `/opportunities/${id}` : '/opportunities/mine'}
        className="text-sm font-medium text-body hover:text-navy"
      >
        Back
      </Link>
      <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">
        {isEdit ? 'Edit opportunity' : 'Create an opportunity'}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-body">
        Publish clear, accurate requirements. Athletes see the deadline, eligibility, and required
        documents before applying.
      </p>

      {error ? (
        <Alert variant="error" title="Could not save opportunity" className="mt-5">
          {error}
        </Alert>
      ) : null}
      {fieldError ? (
        <Alert variant="warning" title="Check the deadline" className="mt-5">
          {fieldError}
        </Alert>
      ) : null}

      <form
        className="mt-6 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
      >
        <section className="rounded-card border border-line bg-white p-5 shadow-card">
          <h2 className="font-display text-xl">Opportunity details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              required
              value={form.type}
              onChange={(event) => update('type', event.target.value)}
              options={OPPORTUNITY_TYPE_OPTIONS}
            />
            <Input
              label="Sport"
              required
              value={form.sport}
              onChange={(event) => update('sport', event.target.value)}
              placeholder="e.g. Athletics"
            />
            <Input
              label="Title"
              required
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="e.g. National sprint trials"
              containerClassName="sm:col-span-2"
            />
            <Textarea
              label="Description"
              required
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              rows={6}
              hint="Describe the opportunity, venue, schedule, and what applicants can expect."
              containerClassName="sm:col-span-2"
            />
            <TagInput
              label="Positions or disciplines"
              value={form.positions}
              onChange={(value) => update('positions', value)}
              placeholder="Add a position"
              max={20}
              hint="Optional. Press Enter after each position."
            />
            <Input
              label="Places available"
              type="number"
              min="1"
              max="10000"
              value={form.positionsAvailable}
              onChange={(event) => update('positionsAvailable', event.target.value)}
            />
          </div>
        </section>

        <section className="rounded-card border border-line bg-white p-5 shadow-card">
          <h2 className="font-display text-xl">Dates and location</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Application deadline"
              type="date"
              required
              value={form.deadline}
              onChange={(event) => update('deadline', event.target.value)}
            />
            <Input
              label="Event start date"
              type="date"
              value={form.eventStartDate}
              onChange={(event) => update('eventStartDate', event.target.value)}
            />
            <Input
              label="Event end date"
              type="date"
              value={form.eventEndDate}
              onChange={(event) => update('eventEndDate', event.target.value)}
            />
            <Input
              label="City"
              value={form.location.city}
              onChange={(event) =>
                setForm((current) => setNested(current, 'location', 'city', event.target.value))
              }
            />
            <Input
              label="Region or state"
              value={form.location.region}
              onChange={(event) =>
                setForm((current) => setNested(current, 'location', 'region', event.target.value))
              }
            />
            <Input
              label="Country"
              value={form.location.country}
              onChange={(event) =>
                setForm((current) => setNested(current, 'location', 'country', event.target.value))
              }
            />
          </div>
        </section>

        <section className="rounded-card border border-line bg-white p-5 shadow-card">
          <h2 className="font-display text-xl">Eligibility and documents</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MultiSelect
              label="Athlete levels"
              value={form.eligibility.levels}
              options={ATHLETE_LEVEL_OPTIONS}
              onChange={(value) =>
                setForm((current) => setNested(current, 'eligibility', 'levels', value))
              }
              hint="Leave empty for any level."
            />
            <MultiSelect
              label="Age categories"
              value={form.eligibility.ageCategories}
              options={ATHLETE_AGE_CATEGORY_OPTIONS}
              onChange={(value) =>
                setForm((current) => setNested(current, 'eligibility', 'ageCategories', value))
              }
              hint="Leave empty for any category."
            />
            <MultiSelect
              label="Competition levels"
              value={form.eligibility.competitionLevels}
              options={ATHLETE_COMPETITION_LEVEL_OPTIONS}
              onChange={(value) =>
                setForm((current) =>
                  setNested(current, 'eligibility', 'competitionLevels', value),
                )
              }
              hint="Leave empty for any level."
            />
            <Input
              label="Minimum experience (years)"
              type="number"
              min="0"
              max="80"
              value={form.eligibility.minExperienceYears}
              onChange={(event) =>
                setForm((current) =>
                  setNested(current, 'eligibility', 'minExperienceYears', event.target.value),
                )
              }
            />
            <Input
              label="Maximum experience (years)"
              type="number"
              min="0"
              max="80"
              value={form.eligibility.maxExperienceYears}
              onChange={(event) =>
                setForm((current) =>
                  setNested(current, 'eligibility', 'maxExperienceYears', event.target.value),
                )
              }
            />
            <div className="flex items-end">
              <Checkbox
                label="Require verified achievement"
                checked={form.eligibility.requiresVerifiedAchievement}
                onChange={(event) =>
                  setForm((current) =>
                    setNested(
                      current,
                      'eligibility',
                      'requiresVerifiedAchievement',
                      event.target.checked,
                    ),
                  )
                }
                className="w-full"
              />
            </div>
            <Textarea
              label="Eligibility notes"
              value={form.eligibility.notes}
              onChange={(event) =>
                setForm((current) => setNested(current, 'eligibility', 'notes', event.target.value))
              }
              rows={3}
              containerClassName="sm:col-span-3"
            />
            <TagInput
              label="Required documents"
              value={form.requiredDocuments}
              onChange={(value) => update('requiredDocuments', value)}
              placeholder="e.g. Medical certificate"
              max={10}
              hint="Athletes must upload a document with a matching label."
            />
            <Textarea
              label="Contact instructions"
              value={form.contactInstructions}
              onChange={(event) => update('contactInstructions', event.target.value)}
              rows={3}
              hint="Optional instructions shown on the opportunity page."
              containerClassName="sm:col-span-2"
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            to={isEdit ? `/opportunities/${id}` : '/opportunities/mine'}
            className={buttonClasses({ variant: 'secondary' })}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            disabled={isPublishing}
            leftIcon={<FiSave className="h-4 w-4" aria-hidden="true" />}
          >
            {isEdit ? 'Save changes' : 'Save draft'}
          </Button>
          {!isEdit ? (
            <Button
              type="button"
              isLoading={isPublishing}
              disabled={isSaving}
              onClick={() => submit(true)}
              leftIcon={<FiSend className="h-4 w-4" aria-hidden="true" />}
            >
              Create and publish
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

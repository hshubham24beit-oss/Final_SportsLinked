import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiSend } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Button, { buttonClasses } from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import Input from '../components/ui/Input';
import PageLoader from '../components/PageLoader';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { eventsApi } from '../api/events.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import {
  emptyEventForm,
  eventPayload,
  eventToForm,
  EVENT_TYPE_OPTIONS,
} from '../utils/events';

export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? 'Edit event' : 'Create event');
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(emptyEventForm);
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
        const response = await eventsApi.get(id);
        if (!cancelled) {
          const event = response.data.data.event;
          if (!event.canEdit) {
            setError('Only draft or published events can be edited.');
          }
          if (!event.isOwner) {
            setError('Only the organizer can edit this event.');
          }
          setForm(eventToForm(event));
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

  const validate = () => {
    setFieldError('');
    if (!form.startAt || !form.endAt || !form.registrationDeadline) {
      setFieldError('Choose the event start, end, and registration deadline.');
      return false;
    }
    const start = new Date(form.startAt);
    const end = new Date(form.endAt);
    const deadline = new Date(form.registrationDeadline);
    if (!(start < end)) {
      setFieldError('The event end must be on or after its start.');
      return false;
    }
    if (deadline > start) {
      setFieldError('Registration must close no later than the event start.');
      return false;
    }
    if (!isEdit && deadline <= new Date()) {
      setFieldError('Registration must close in the future.');
      return false;
    }
    if (!form.capacity || Number(form.capacity) < 1) {
      setFieldError('Enter how many participants the event can hold.');
      return false;
    }
    return true;
  };

  const submit = async (publish = false) => {
    setError('');
    if (!validate()) return;

    setSubmitMode(publish ? 'publish' : 'save');
    try {
      const payload = eventPayload(form);
      if (isEdit) {
        await eventsApi.update(id, payload);
        toast.success('Event updated', 'Your changes are saved.');
        navigate(`/events/${id}`);
        return;
      }

      const created = await eventsApi.create(payload);
      const eventId = created.data.data.event.id;
      if (publish) {
        await eventsApi.publish(eventId);
        toast.success('Event published', 'Members can now find and register for it.');
      } else {
        toast.success('Draft saved', 'Publish it when the details are final.');
      }
      navigate(`/events/${eventId}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitMode(null);
    }
  };

  if (isLoading) return <PageLoader message="Loading event..." />;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={isEdit ? `/events/${id}` : '/events/mine'}
        className="text-sm font-medium text-body hover:text-navy"
      >
        Back
      </Link>
      <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">
        {isEdit ? 'Edit event' : 'Create an event'}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-body">
        Share accurate schedule, venue, capacity, and registration details so attendees know exactly
        what to expect.
      </p>

      {error ? (
        <Alert variant="error" title="Could not save event" className="mt-5">
          {error}
        </Alert>
      ) : null}
      {fieldError ? (
        <Alert variant="warning" title="Check the event details" className="mt-5">
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
          <h2 className="font-display text-xl">Event details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              required
              value={form.type}
              onChange={(event) => update('type', event.target.value)}
              options={EVENT_TYPE_OPTIONS}
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
              placeholder="e.g. Open sprint trials"
              containerClassName="sm:col-span-2"
            />
            <Textarea
              label="Description"
              required
              rows={6}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              hint="Describe the format, schedule, eligibility, and what attendees should bring."
              containerClassName="sm:col-span-2"
            />
          </div>
        </section>

        <section className="rounded-card border border-line bg-white p-5 shadow-card">
          <h2 className="font-display text-xl">Schedule and registration</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts at"
              type="datetime-local"
              required
              value={form.startAt}
              onChange={(event) => update('startAt', event.target.value)}
            />
            <Input
              label="Ends at"
              type="datetime-local"
              required
              value={form.endAt}
              onChange={(event) => update('endAt', event.target.value)}
            />
            <Input
              label="Registration deadline"
              type="datetime-local"
              required
              value={form.registrationDeadline}
              onChange={(event) => update('registrationDeadline', event.target.value)}
              hint="Must be no later than the event start."
            />
            <Input
              label="Capacity"
              type="number"
              min="1"
              max="10000"
              required
              value={form.capacity}
              onChange={(event) => update('capacity', event.target.value)}
            />
            <div className="sm:col-span-2">
              <Checkbox
                label="Enable a waitlist when the event is full"
                description="Waitlisted members are promoted automatically when a place opens up."
                checked={form.allowWaitlist}
                onChange={(event) => update('allowWaitlist', event.target.checked)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line bg-white p-5 shadow-card">
          <h2 className="font-display text-xl">Venue</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Venue name"
              value={form.venueName}
              onChange={(event) => update('venueName', event.target.value)}
              placeholder="e.g. City track"
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(event) => update('address', event.target.value)}
              placeholder="Street and number"
            />
            <Input
              label="City"
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
            />
            <Input
              label="Region or state"
              value={form.region}
              onChange={(event) => update('region', event.target.value)}
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(event) => update('country', event.target.value)}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            to={isEdit ? `/events/${id}` : '/events/mine'}
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
              leftIcon={<FiSend className="h-4 w-4" aria-hidden="true" />}
              onClick={() => submit(true)}
            >
              Publish event
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

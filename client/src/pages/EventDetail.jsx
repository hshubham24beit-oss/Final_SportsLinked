import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiMapPin,
  FiTrash2,
  FiUser,
  FiUsers,
  FiXCircle,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button, { buttonClasses } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import PageLoader from '../components/PageLoader';
import ProgressBar from '../components/ui/ProgressBar';
import Textarea from '../components/ui/Textarea';
import { eventsApi } from '../api/events.api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatDateTime } from '../utils/format';
import { getErrorMessage } from '../utils/apiError';
import {
  eventLocation,
  eventStatusVariant,
  eventTypeLabel,
  EVENT_STATUS_LABELS,
  registrationStatusVariant,
  EVENT_REGISTRATION_STATUS_LABELS,
} from '../utils/events';

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
        <p className="mt-0.5 text-sm text-ink">{value}</p>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canParticipate = ['athlete', 'coach', 'recruiter'].includes(user.role);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await eventsApi.get(id);
      setEvent(response.data.data.event);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setEvent(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (name, request, successMessage) => {
    setAction(name);
    try {
      const response = await request();
      if (response?.data?.data?.event) {
        setEvent(response.data.data.event);
      } else {
        await load();
      }
      if (successMessage) {
        toast.success(successMessage.title, successMessage.description);
      }
    } catch (requestError) {
      toast.error('Action could not be completed', getErrorMessage(requestError));
    } finally {
      setAction('');
    }
  };

  const handleRegister = () =>
    runAction(
      'register',
      () => eventsApi.register(id),
      event?.canRegister || event?.waitlistOpen
        ? { title: 'Registration saved', description: 'Your place is confirmed or waitlisted.' }
        : null,
    );

  const handleInterest = () =>
    runAction(
      'interest',
      () => eventsApi.expressInterest(id),
      { title: 'Interest recorded', description: 'The organizer can see your interest.' },
    );

  const handleCancelRegistration = () =>
    runAction(
      'cancel-registration',
      () => eventsApi.cancelRegistration(id),
      { title: 'Registration cancelled', description: 'Your place has been released.' },
    );

  const handlePublish = () =>
    runAction(
      'publish',
      () => eventsApi.publish(id),
      { title: 'Event published', description: 'Members can now register.' },
    );

  const handleCancelEvent = async () => {
    setCancelOpen(false);
    await runAction(
      'cancel-event',
      () => eventsApi.cancel(id, cancelReason.trim()),
      { title: 'Event cancelled', description: 'Attendees have been notified.' },
    );
    setCancelReason('');
  };

  const handleDelete = async () => {
    setAction('delete');
    try {
      await eventsApi.remove(id);
      toast.success('Event deleted', 'The draft or cancelled event has been removed.');
      navigate('/events/mine');
    } catch (requestError) {
      toast.error('Event could not be deleted', getErrorMessage(requestError));
    } finally {
      setAction('');
      setDeleteOpen(false);
    }
  };

  if (isLoading) return <PageLoader message="Loading event..." />;

  if (error || !event) {
    return (
      <div>
        <Link to="/events" className="text-sm font-medium text-ink-muted hover:text-ink">
          Back to events
        </Link>
        <Alert variant="error" title="Event could not be loaded" className="mt-4">
          {error || 'This event is unavailable.'}
        </Alert>
      </div>
    );
  }

  const full = Number(event.registrationCount || 0) >= Number(event.capacity || 0);
  const capacityPercent = event.capacity
    ? Math.min(100, Math.round((Number(event.registrationCount || 0) / Number(event.capacity)) * 100))
    : 0;
  const location = eventLocation(event);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to={event.isOwner ? '/events/mine' : '/events'}
        className="text-sm font-medium text-ink-muted hover:text-ink"
      >
        Back
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{eventTypeLabel(event.type)}</Badge>
            <Badge variant={eventStatusVariant(event.status)} dot>
              {EVENT_STATUS_LABELS[event.status] || event.status}
            </Badge>
            {event.registrationStatus ? (
              <Badge variant={registrationStatusVariant(event.registrationStatus)}>
                {EVENT_REGISTRATION_STATUS_LABELS[event.registrationStatus] ||
                  event.registrationStatus}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {event.title}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Organized by {event.organizerName}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {event.isOwner && event.canEdit ? (
            <Link
              to={`/events/${event.id}/edit`}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <FiEdit3 className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
          ) : null}
          {event.isOwner ? (
            <Link
              to={`/events/${event.id}/registrants`}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <FiUsers className="h-4 w-4" aria-hidden="true" />
              Registrants
            </Link>
          ) : null}
          {event.isOwner && event.status === 'draft' ? (
            <Button
              size="sm"
              isLoading={action === 'publish'}
              onClick={handlePublish}
            >
              Publish
            </Button>
          ) : null}
          {event.isOwner && ['draft', 'published'].includes(event.status) ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCancelOpen(true)}
            >
              <FiXCircle className="h-4 w-4" aria-hidden="true" />
              Cancel event
            </Button>
          ) : null}
          {event.isOwner && event.canDelete ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => setDeleteOpen(true)}
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {event.status === 'cancelled' ? (
        <Alert variant="warning" title="This event was cancelled" className="mt-5">
          {event.cancellationReason
            ? `Organizer note: ${event.cancellationReason}`
            : 'The organizer has cancelled this event.'}
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About this event</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                {event.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule and venue</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailRow
                icon={FiCalendar}
                label="Starts"
                value={formatDateTime(event.startAt)}
              />
              <DetailRow
                icon={FiClock}
                label="Ends"
                value={formatDateTime(event.endAt)}
              />
              <DetailRow
                icon={FiClock}
                label="Registration closes"
                value={formatDateTime(event.registrationDeadline)}
              />
              <DetailRow
                icon={FiMapPin}
                label="Venue"
                value={
                  [event.venue?.name, event.venue?.address, location]
                    .filter(Boolean)
                    .join(' - ') || 'To be confirmed'
                }
              />
              <DetailRow icon={FiUser} label="Sport" value={event.sport} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">
                  {event.registrationCount} of {event.capacity} confirmed
                </span>
                <span className="text-ink-subtle">{capacityPercent}%</span>
              </div>
              <ProgressBar value={capacityPercent} className="mt-2" />
              {event.waitlistCount > 0 ? (
                <p className="mt-2 text-xs text-ink-subtle">
                  {event.waitlistCount} on the waitlist
                </p>
              ) : null}

              <div className="mt-4 space-y-2">
                {event.canRegister || event.waitlistOpen ? (
                  <Button
                    fullWidth
                    isLoading={action === 'register'}
                    onClick={handleRegister}
                    leftIcon={<FiCheckCircle className="h-4 w-4" aria-hidden="true" />}
                  >
                    {full ? 'Join waitlist' : 'Register for this event'}
                  </Button>
                ) : null}
                {event.canExpressInterest ? (
                  <Button
                    fullWidth
                    variant="secondary"
                    isLoading={action === 'interest'}
                    onClick={handleInterest}
                  >
                    Express interest
                  </Button>
                ) : null}
                {event.canCancelRegistration ? (
                  <Button
                    fullWidth
                    variant="secondary"
                    isLoading={action === 'cancel-registration'}
                    onClick={handleCancelRegistration}
                  >
                    Cancel my registration
                  </Button>
                ) : null}
                {!event.canRegister &&
                !event.waitlistOpen &&
                !event.canExpressInterest &&
                !event.canCancelRegistration &&
                !event.isOwner ? (
                  <p className="text-sm text-ink-muted">
                    Registration is not open for this event.
                  </p>
                ) : null}
                {event.isOwner ? (
                  <p className="text-sm text-ink-muted">
                    You are the organizer of this event.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {canParticipate && event.allowWaitlist && event.status === 'published' ? (
            <Card>
              <CardHeader>
                <CardTitle>Good to know</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-ink-muted">
                <p>If the event is full you can join the waitlist.</p>
                <p>
                  You will be notified if a place opens up and your registration is confirmed.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this event?"
        description="Registered and waitlisted attendees will be notified with your reason."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep event
            </Button>
            <Button
              variant="danger"
              isLoading={action === 'cancel-event'}
              onClick={handleCancelEvent}
            >
              Cancel event
            </Button>
          </div>
        }
      >
        <Textarea
          label="Reason (optional)"
          rows={3}
          value={cancelReason}
          onChange={(event_) => setCancelReason(event_.target.value)}
          hint="Shared with attendees in their notification and email."
        />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this event?"
        description="This permanently removes the event. You can only delete events without active registrations."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Keep event
            </Button>
            <Button variant="danger" isLoading={action === 'delete'} onClick={handleDelete}>
              Delete event
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-muted">
          {event.title} will be removed for everyone.
        </p>
      </Modal>
    </div>
  );
}

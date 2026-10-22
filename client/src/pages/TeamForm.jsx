import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiSave } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Button, { buttonClasses } from '../components/ui/Button';
import Input from '../components/ui/Input';
import PageLoader from '../components/PageLoader';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { teamsApi } from '../api/teams.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import {
  emptyTeamForm,
  teamPayload,
  teamToForm,
  TEAM_PRIVACY_OPTIONS,
  TEAM_TYPE_OPTIONS,
} from '../utils/teams';

export default function TeamForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? 'Edit team' : 'Create team');
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(emptyTeamForm);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await teamsApi.get(id);
        if (!cancelled) {
          const team = response.data.data.team;
          if (!team.canEdit) {
            setError('Only the team owner can edit this team.');
          }
          setForm(teamToForm(team));
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

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const payload = teamPayload(form);
      if (isEdit) {
        await teamsApi.update(id, payload);
        toast.success('Team updated', 'Your changes are saved.');
        navigate(`/teams/${id}`);
      } else {
        const response = await teamsApi.create(payload);
        toast.success('Team created', 'Invite members to get started.');
        navigate(`/teams/${response.data.data.team.id}`);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader message="Loading team..." />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={isEdit ? `/teams/${id}` : '/teams/mine'}
        className="text-sm font-medium text-ink-muted hover:text-ink"
      >
        Back
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {isEdit ? 'Edit team' : 'Create a team or group'}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        Public teams appear in local discovery. Private teams are invite-only and hidden from
        discovery.
      </p>

      {error ? (
        <Alert variant="error" title="Could not save team" className="mt-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <h2 className="text-base font-semibold text-ink">Team details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="e.g. Northside Track Club"
              containerClassName="sm:col-span-2"
            />
            <Textarea
              label="Description"
              required
              rows={5}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              hint="Describe the team, training approach, and who should join."
              containerClassName="sm:col-span-2"
            />
            <Input
              label="Sport"
              required
              value={form.sport}
              onChange={(event) => update('sport', event.target.value)}
              placeholder="e.g. Athletics"
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => update('type', event.target.value)}
              options={TEAM_TYPE_OPTIONS}
            />
            <Select
              label="Privacy"
              value={form.privacy}
              onChange={(event) => update('privacy', event.target.value)}
              options={TEAM_PRIVACY_OPTIONS}
              hint="Public teams are discoverable by sport and location."
            />
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <h2 className="text-base font-semibold text-ink">Location</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
            to={isEdit ? `/teams/${id}` : '/teams/mine'}
            className={buttonClasses({ variant: 'secondary' })}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            isLoading={isSaving}
            leftIcon={<FiSave className="h-4 w-4" aria-hidden="true" />}
          >
            {isEdit ? 'Save changes' : 'Create team'}
          </Button>
        </div>
      </form>
    </div>
  );
}

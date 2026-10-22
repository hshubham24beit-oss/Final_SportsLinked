import { FiCrosshair, FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useState } from 'react';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TagInput from '../ui/TagInput';
import Textarea from '../ui/Textarea';
import {
  ATHLETE_AGE_CATEGORY_OPTIONS,
  ATHLETE_COMPETITION_LEVEL_OPTIONS,
  ATHLETE_LEVEL_OPTIONS,
  COACH_AVAILABILITY_OPTIONS,
  OPPORTUNITY_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  PROFILE_SECTIONS,
  SECTION_LABELS,
  VISIBILITY_OPTIONS,
  emptyCareerEntry,
  emptyCertification,
  emptyPersonalBest,
} from '../../utils/profile';

function SectionHeading({ title, description, action = null }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function EmptyEntries({ children }) {
  return (
    <p className="rounded-lg border border-dashed border-line-strong bg-slate-50/60 px-3.5 py-4 text-center text-xs text-ink-muted">
      {children}
    </p>
  );
}

function RepeatCard({ title, onRemove, children }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">{title}</p>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-white hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          aria-label="Remove entry"
        >
          <FiTrash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function AddEntryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-white px-3 py-2.5 text-xs font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <FiPlus className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function CoordinatesFields({ form, onChange, errors }) {
  const [locationMessage, setLocationMessage] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const useCurrentLocation = () => {
    setLocationMessage('');
    if (!navigator.geolocation) {
      setLocationMessage('Location access is not available in this browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange('location.latitude', position.coords.latitude.toFixed(5));
        onChange('location.longitude', position.coords.longitude.toFixed(5));
        setLocationMessage('Coordinates added from your browser. You can adjust them manually.');
        setIsLocating(false);
      },
      () => {
        setLocationMessage('We could not access your location. Enter coordinates manually instead.');
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <div className="rounded-lg border border-line bg-slate-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-ink">Map coordinates</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              Optional. Coordinates help with location-based discovery later; your city remains
              visible according to your privacy settings.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={useCurrentLocation}
          isLoading={isLocating}
          leftIcon={<FiCrosshair className="h-4 w-4" aria-hidden="true" />}
        >
          Use current location
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          label="Latitude"
          name="latitude"
          type="number"
          inputMode="decimal"
          step="any"
          min="-90"
          max="90"
          placeholder="e.g. 19.076"
          value={form.location.latitude}
          onChange={(event) => onChange('location.latitude', event.target.value)}
          error={errors['location.latitude']}
        />
        <Input
          label="Longitude"
          name="longitude"
          type="number"
          inputMode="decimal"
          step="any"
          min="-180"
          max="180"
          placeholder="e.g. 72.8777"
          value={form.location.longitude}
          onChange={(event) => onChange('location.longitude', event.target.value)}
          error={errors['location.longitude']}
        />
      </div>

      {locationMessage ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-muted" role="status">
          {locationMessage}
        </p>
      ) : null}
    </div>
  );
}

export function BasicsFields({ form, onChange, errors }) {
  return (
    <div className="space-y-5">
      <Input
        label="Headline"
        name="headline"
        placeholder="e.g. Sprint athlete focused on national competition"
        value={form.headline}
        onChange={(event) => onChange('headline', event.target.value)}
        error={errors.headline}
        maxLength={160}
        required
        hint={`${form.headline.length}/160 characters`}
      />

      <Textarea
        label="Bio"
        name="bio"
        rows={5}
        placeholder="Describe your sporting background, goals, and what makes you a strong connection."
        value={form.bio}
        onChange={(event) => onChange('bio', event.target.value)}
        error={errors.bio}
        maxLength={2000}
        required
        hint={`${form.bio.length}/2000 characters`}
      />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <FiMapPin className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">Location</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="City"
            name="city"
            placeholder="Mumbai"
            value={form.location.city}
            onChange={(event) => onChange('location.city', event.target.value)}
            error={errors['location.city']}
            required
          />
          <Input
            label="Region or state"
            name="region"
            placeholder="Maharashtra"
            value={form.location.region}
            onChange={(event) => onChange('location.region', event.target.value)}
            error={errors['location.region']}
          />
          <Input
            label="Country"
            name="country"
            placeholder="India"
            value={form.location.country}
            onChange={(event) => onChange('location.country', event.target.value)}
            error={errors['location.country']}
            containerClassName="sm:col-span-2"
          />
        </div>
      </div>

      <CoordinatesFields form={form} onChange={onChange} errors={errors} />
    </div>
  );
}

function OpportunityCheckboxes({ value, onToggle }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-ink">
        Preferred opportunities
      </legend>
      <p className="mb-3 text-xs leading-relaxed text-ink-muted">
        Select the kinds of opportunities you want to be considered for. This does not create or
        guarantee any opportunity.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPPORTUNITY_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            onChange={() => onToggle(option.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function RoleFields({ role, form, onChange, onToggleArray, errors }) {
  return (
    <div className="space-y-5">
      {role === 'recruiter' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Organisation name"
            name="name"
            placeholder="e.g. Pune Athletics Academy"
            value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
            error={errors.name}
            maxLength={160}
            required
            containerClassName="sm:col-span-2"
          />
          <Select
            label="Organisation type"
            name="organizationType"
            value={form.organizationType}
            onChange={(event) => onChange('organizationType', event.target.value)}
            options={ORGANIZATION_TYPE_OPTIONS}
            error={errors.organizationType}
            required
          />
        </div>
      ) : null}

      <TagInput
        label="Sports"
        value={form.sports}
        onChange={(next) => onChange('sports', next)}
        placeholder={role === 'recruiter' ? 'e.g. Athletics' : 'e.g. Athletics, Football'}
        hint="Press Enter or comma to add a sport."
        error={errors.sports}
        required
        max={12}
      />

      {role === 'athlete' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Experience level"
              name="level"
              value={form.level}
              onChange={(event) => onChange('level', event.target.value)}
              options={ATHLETE_LEVEL_OPTIONS}
              error={errors.level}
              required
            />
            <Select
              label="Age group"
              name="ageCategory"
              value={form.ageCategory}
              onChange={(event) => onChange('ageCategory', event.target.value)}
              options={ATHLETE_AGE_CATEGORY_OPTIONS}
              placeholder="Select an age group"
              error={errors.ageCategory}
            />
            <Select
              label="Competition level"
              name="competitionLevel"
              value={form.competitionLevel}
              onChange={(event) => onChange('competitionLevel', event.target.value)}
              options={ATHLETE_COMPETITION_LEVEL_OPTIONS}
              placeholder="Select a competition level"
              error={errors.competitionLevel}
            />
            <Input
              label="Years of experience"
              name="experienceYears"
              type="number"
              min="0"
              max="80"
              step="1"
              placeholder="e.g. 6"
              value={form.experienceYears}
              onChange={(event) => onChange('experienceYears', event.target.value)}
              error={errors.experienceYears}
              required
            />
            <Input
              label="Current team or club"
              name="currentTeam"
              placeholder="e.g. Mumbai Striders"
              value={form.currentTeam}
              onChange={(event) => onChange('currentTeam', event.target.value)}
              error={errors.currentTeam}
              containerClassName="sm:col-span-2"
            />
          </div>

          <TagInput
            label="Positions or events"
            value={form.positions}
            onChange={(next) => onChange('positions', next)}
            placeholder="e.g. 100m, 200m, Long jump"
            hint="Add positions or events relevant to your sports."
            error={errors.positions}
            max={12}
          />

          <TagInput
            label="Skills and qualifications"
            value={form.skills}
            onChange={(next) => onChange('skills', next)}
            placeholder="e.g. Sprint technique, Team leadership"
            hint="Add strengths, certifications, or other qualifications recruiters should know about."
            error={errors.skills}
            max={20}
          />

          <OpportunityCheckboxes
            value={form.preferredOpportunities}
            onToggle={(value) => onToggleArray('preferredOpportunities', value)}
          />

          <Checkbox
            label="Available for trials"
            description="Let recruiters know you are open to trial opportunities. This is a preference, not a commitment."
            checked={form.availableForTrials}
            onChange={(event) => onChange('availableForTrials', event.target.checked)}
          />
        </>
      ) : null}

      {role === 'coach' ? (
        <>
          <TagInput
            label="Specialisations"
            value={form.specializations}
            onChange={(next) => onChange('specializations', next)}
            placeholder="e.g. Sprint training, Strength and conditioning"
            hint="Add the areas you coach. Press Enter or comma to add each one."
            error={errors.specializations}
            required
            max={12}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Years of coaching experience"
              name="experienceYears"
              type="number"
              min="0"
              max="80"
              step="1"
              placeholder="e.g. 9"
              value={form.experienceYears}
              onChange={(event) => onChange('experienceYears', event.target.value)}
              error={errors.experienceYears}
              required
            />
            <Input
              label="Current organisation"
              name="currentOrganization"
              placeholder="e.g. Pune Athletics Academy"
              value={form.currentOrganization}
              onChange={(event) => onChange('currentOrganization', event.target.value)}
              error={errors.currentOrganization}
            />
            <Select
              label="Coaching availability"
              name="availability"
              value={form.availability}
              onChange={(event) => onChange('availability', event.target.value)}
              options={COACH_AVAILABILITY_OPTIONS}
              error={errors.availability}
              containerClassName="sm:col-span-2"
            />
          </div>

          <OpportunityCheckboxes
            value={form.preferredOpportunities}
            onToggle={(value) => onToggleArray('preferredOpportunities', value)}
          />
        </>
      ) : null}

      {role === 'recruiter' ? (
        <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3">
          <p className="text-xs leading-relaxed text-brand-800">
            Your organisation name is public. You can add programmes, activities, contact details,
            and photos in the next steps.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CareerHistoryEditor({ entries, onChange, onAdd, onRemove }) {
  return (
    <div>
      <SectionHeading
        title="Career history"
        description="Add teams, clubs, or organisations you have worked or competed with."
      />
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <EmptyEntries>No career entries added yet.</EmptyEntries>
        ) : null}
        {entries.map((entry, index) => (
          <RepeatCard
            key={entry.id || `career-${index}`}
            title={`Entry ${index + 1}`}
            onRemove={() => onRemove(index)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Organisation"
                value={entry.organization}
                onChange={(event) => onChange(index, 'organization', event.target.value)}
                placeholder="Club, team, or organisation"
              />
              <Input
                label="Role"
                value={entry.role}
                onChange={(event) => onChange(index, 'role', event.target.value)}
                placeholder="e.g. Sprint athlete"
              />
              <Input
                label="Start date"
                type="date"
                value={entry.startDate}
                onChange={(event) => onChange(index, 'startDate', event.target.value)}
              />
              <Input
                label="End date"
                type="date"
                value={entry.endDate}
                disabled={entry.current}
                onChange={(event) => onChange(index, 'endDate', event.target.value)}
              />
            </div>
            <Checkbox
              label="I am currently here"
              checked={entry.current}
              onChange={(event) => onChange(index, 'current', event.target.checked)}
            />
            <Textarea
              label="Description"
              rows={3}
              value={entry.description}
              onChange={(event) => onChange(index, 'description', event.target.value)}
              placeholder="Briefly describe your responsibilities or achievements."
              maxLength={1000}
            />
          </RepeatCard>
        ))}
        <AddEntryButton onClick={() => onAdd(emptyCareerEntry())}>
          Add career entry
        </AddEntryButton>
      </div>
    </div>
  );
}

export function PersonalBestsEditor({ entries, onChange, onAdd, onRemove }) {
  return (
    <div>
      <SectionHeading
        title="Personal bests"
        description="Add performance markers with the event, result, and context."
      />
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <EmptyEntries>No personal bests added yet.</EmptyEntries>
        ) : null}
        {entries.map((entry, index) => (
          <RepeatCard
            key={entry.id || `best-${index}`}
            title={`Personal best ${index + 1}`}
            onRemove={() => onRemove(index)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Event"
                value={entry.event}
                onChange={(event) => onChange(index, 'event', event.target.value)}
                placeholder="e.g. 100m"
              />
              <div className="grid grid-cols-[1fr_100px] gap-2">
                <Input
                  label="Result"
                  value={entry.result}
                  onChange={(event) => onChange(index, 'result', event.target.value)}
                  placeholder="e.g. 10.81"
                />
                <Input
                  label="Unit"
                  value={entry.unit}
                  onChange={(event) => onChange(index, 'unit', event.target.value)}
                  placeholder="s"
                />
              </div>
              <Input
                label="Date"
                type="date"
                value={entry.date}
                onChange={(event) => onChange(index, 'date', event.target.value)}
              />
              <Input
                label="Competition"
                value={entry.competition}
                onChange={(event) => onChange(index, 'competition', event.target.value)}
                placeholder="e.g. State Championships"
              />
            </div>
          </RepeatCard>
        ))}
        <AddEntryButton onClick={() => onAdd(emptyPersonalBest())}>
          Add personal best
        </AddEntryButton>
      </div>
    </div>
  );
}

export function CertificationsEditor({ entries, onChange, onAdd, onRemove }) {
  return (
    <div>
      <SectionHeading
        title="Certifications"
        description="List coaching qualifications and certifications. They are self-reported unless separately verified."
      />
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <EmptyEntries>No certifications added yet.</EmptyEntries>
        ) : null}
        {entries.map((entry, index) => (
          <RepeatCard
            key={entry.id || `certification-${index}`}
            title={`Certification ${index + 1}`}
            onRemove={() => onRemove(index)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Certification"
                value={entry.name}
                onChange={(event) => onChange(index, 'name', event.target.value)}
                placeholder="e.g. Level 2 Athletics Coach"
              />
              <Input
                label="Issuer"
                value={entry.issuer}
                onChange={(event) => onChange(index, 'issuer', event.target.value)}
                placeholder="e.g. National Federation"
              />
              <Input
                label="Year"
                type="number"
                min="1900"
                max="2100"
                value={entry.year}
                onChange={(event) => onChange(index, 'year', event.target.value)}
                placeholder="e.g. 2020"
              />
            </div>
          </RepeatCard>
        ))}
        <AddEntryButton onClick={() => onAdd(emptyCertification())}>
          Add certification
        </AddEntryButton>
      </div>
    </div>
  );
}

export function OrganizationProgramsFields({ form, onChange, errors }) {
  return (
    <div className="space-y-5">
      <SectionHeading
        title="Programmes and activities"
        description="Describe the programmes, teams, or services your organisation provides."
      />
      <Input
        label="Founded year"
        name="foundedYear"
        type="number"
        min="1800"
        max="2100"
        placeholder="e.g. 2012"
        value={form.foundedYear}
        onChange={(event) => onChange('foundedYear', event.target.value)}
        error={errors.foundedYear}
      />
      <TagInput
        label="Programmes and activities"
        value={form.activities}
        onChange={(next) => onChange('activities', next)}
        placeholder="e.g. Youth sprint programme, Athlete scholarships"
        hint="Add each programme or activity separately."
        error={errors.activities}
        max={12}
      />
    </div>
  );
}

export function ExperienceFields({
  role,
  form,
  onChange,
  onAddArray,
  onUpdateArray,
  onRemoveArray,
  errors,
}) {
  if (role === 'recruiter') {
    return (
      <OrganizationProgramsFields
        form={form}
        onChange={onChange}
        errors={errors}
      />
    );
  }

  return (
    <div className="space-y-8">
      <CareerHistoryEditor
        entries={form.careerHistory}
        onChange={(index, field, value) =>
          onUpdateArray('careerHistory', index, field, value)
        }
        onAdd={(entry) => onAddArray('careerHistory', entry)}
        onRemove={(index) => onRemoveArray('careerHistory', index)}
      />

      {role === 'athlete' ? (
        <PersonalBestsEditor
          entries={form.personalBests}
          onChange={(index, field, value) =>
            onUpdateArray('personalBests', index, field, value)
          }
          onAdd={(entry) => onAddArray('personalBests', entry)}
          onRemove={(index) => onRemoveArray('personalBests', index)}
        />
      ) : null}

      {role === 'coach' ? (
        <CertificationsEditor
          entries={form.certifications}
          onChange={(index, field, value) =>
            onUpdateArray('certifications', index, field, value)
          }
          onAdd={(entry) => onAddArray('certifications', entry)}
          onRemove={(index) => onRemoveArray('certifications', index)}
        />
      ) : null}
    </div>
  );
}

export function ContactFields({ form, onChange, errors }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Contact email"
          name="contactEmail"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={form.contact.email}
          onChange={(event) => onChange('contact.email', event.target.value)}
          error={errors['contact.email']}
          hint="You choose separately whether this email is shown on your profile."
        />
        <Input
          label="Phone"
          name="contactPhone"
          type="tel"
          placeholder="+1 555 000 0000"
          value={form.contact.phone}
          onChange={(event) => onChange('contact.phone', event.target.value)}
          error={errors['contact.phone']}
        />
        <Input
          label="Website"
          name="contactWebsite"
          type="url"
          placeholder="https://example.com"
          value={form.contact.website}
          onChange={(event) => onChange('contact.website', event.target.value)}
          error={errors['contact.website']}
          containerClassName="sm:col-span-2"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Checkbox
          label="Show email publicly"
          description="Only applies when contact details are visible to the viewer."
          checked={form.contact.preferences.showEmail}
          onChange={(event) =>
            onChange('contact.preferences.showEmail', event.target.checked)
          }
        />
        <Checkbox
          label="Allow member messages"
          description="Indicates that members may contact you through SportLinked."
          checked={form.contact.preferences.allowMessages}
          onChange={(event) =>
            onChange('contact.preferences.allowMessages', event.target.checked)
          }
        />
      </div>
    </div>
  );
}

export function VisibilityFields({ form, onChange }) {
  return (
    <div>
      <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3">
        <p className="text-xs leading-relaxed text-brand-800">
          Public sections can be viewed by anyone with your profile link. Signed-in members are
          authenticated SportLinked users. Only me keeps a section visible to you alone.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PROFILE_SECTIONS.map((section) => (
          <Select
            key={section}
            label={SECTION_LABELS[section]}
            value={form.visibility[section]}
            onChange={(event) => onChange(`visibility.${section}`, event.target.value)}
            options={VISIBILITY_OPTIONS}
          />
        ))}
      </div>
    </div>
  );
}

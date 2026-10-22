import { FiFilter, FiMapPin, FiRotateCcw } from 'react-icons/fi';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  ATHLETE_AGE_CATEGORY_OPTIONS,
  ATHLETE_COMPETITION_LEVEL_OPTIONS,
  ATHLETE_LEVEL_OPTIONS,
} from '../../utils/profile';

export const INITIAL_DISCOVERY_FILTERS = {
  sport: '',
  position: '',
  skill: '',
  team: '',
  location: '',
  ageCategory: '',
  level: '',
  competitionLevel: '',
  achievementFilter: '',
  verification: '',
  statMetric: '',
  statMin: '',
  statMax: '',
  availableForTrials: false,
  nearMe: false,
  radiusKm: '50',
};

function FilterSection({ title, children }) {
  return (
    <section className="space-y-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function DiscoveryFilters({
  filters,
  onChange,
  onReset,
  showNearMe = true,
  activeCount = 0,
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <FiFilter className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Filters</p>
            <p className="text-[11px] text-ink-subtle">
              {activeCount > 0 ? `${activeCount} active` : 'Refine the athlete pool'}
            </p>
          </div>
        </div>
        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<FiRotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Reset
          </Button>
        ) : null}
      </div>

      <FilterSection title="Sport and role">
        <Input
          label="Sport"
          name="sport"
          placeholder="e.g. Athletics"
          value={filters.sport}
          onChange={(event) => onChange('sport', event.target.value)}
        />
        <Input
          label="Position or event"
          name="position"
          placeholder="e.g. Midfielder"
          value={filters.position}
          onChange={(event) => onChange('position', event.target.value)}
        />
        <Input
          label="Skill or qualification"
          name="skill"
          placeholder="e.g. Sprint technique"
          value={filters.skill}
          onChange={(event) => onChange('skill', event.target.value)}
        />
        <Input
          label="Current team or club"
          name="team"
          placeholder="e.g. Mumbai Striders"
          value={filters.team}
          onChange={(event) => onChange('team', event.target.value)}
        />
      </FilterSection>

      <FilterSection title="Athlete profile">
        <div className="grid gap-3">
          <Select
            label="Age group"
            name="ageCategory"
            value={filters.ageCategory}
            onChange={(event) => onChange('ageCategory', event.target.value)}
            options={ATHLETE_AGE_CATEGORY_OPTIONS}
            placeholder="Any age group"
          />
          <Select
            label="Experience level"
            name="level"
            value={filters.level}
            onChange={(event) => onChange('level', event.target.value)}
            options={ATHLETE_LEVEL_OPTIONS}
            placeholder="Any experience level"
          />
          <Select
            label="Competition level"
            name="competitionLevel"
            value={filters.competitionLevel}
            onChange={(event) => onChange('competitionLevel', event.target.value)}
            options={ATHLETE_COMPETITION_LEVEL_OPTIONS}
            placeholder="Any competition level"
          />
        </div>
        <Checkbox
          label="Available for trials"
          description="Only athletes who have chosen to be open to trials."
          checked={filters.availableForTrials}
          onChange={(event) => onChange('availableForTrials', event.target.checked)}
        />
      </FilterSection>

      <FilterSection title="Location">
        <Input
          label="City, region, or country"
          name="location"
          placeholder="e.g. Mumbai"
          value={filters.location}
          onChange={(event) => onChange('location', event.target.value)}
          startIcon={<FiMapPin className="h-4 w-4" aria-hidden="true" />}
        />
        {showNearMe ? (
          <>
            <Checkbox
              label="Near my profile location"
              description="Uses the map coordinates saved on your coach or organisation profile."
              checked={filters.nearMe}
              onChange={(event) => onChange('nearMe', event.target.checked)}
            />
            {filters.nearMe ? (
              <Input
                label="Radius (km)"
                name="radiusKm"
                type="number"
                min="1"
                max="500"
                step="1"
                value={filters.radiusKm}
                onChange={(event) => onChange('radiusKm', event.target.value)}
                hint="Between 1 and 500 km."
              />
            ) : null}
          </>
        ) : null}
      </FilterSection>

      <FilterSection title="Evidence and performance">
        <Select
          label="Achievements"
          name="achievementFilter"
          value={filters.achievementFilter}
          onChange={(event) => onChange('achievementFilter', event.target.value)}
          options={[{ value: 'any', label: 'Has any achievement' }]}
          placeholder="Any achievement status"
        />
        <Select
          label="Verification"
          name="verification"
          value={filters.verification}
          onChange={(event) => onChange('verification', event.target.value)}
          options={[{ value: 'verified', label: 'Has a verified achievement' }]}
          placeholder="Any verification status"
        />
        <Input
          label="Statistic"
          name="statMetric"
          placeholder="e.g. Season wins"
          value={filters.statMetric}
          onChange={(event) => onChange('statMetric', event.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Minimum"
            name="statMin"
            type="number"
            step="any"
            value={filters.statMin}
            onChange={(event) => onChange('statMin', event.target.value)}
          />
          <Input
            label="Maximum"
            name="statMax"
            type="number"
            step="any"
            value={filters.statMax}
            onChange={(event) => onChange('statMax', event.target.value)}
          />
        </div>
        <p className="text-[11px] leading-relaxed text-ink-subtle">
          Statistic filters only match statistics the athlete has made visible.
        </p>
      </FilterSection>
    </div>
  );
}

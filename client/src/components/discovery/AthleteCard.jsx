import { Link } from 'react-router-dom';
import {
  FiAward,
  FiBookmark,
  FiBriefcase,
  FiExternalLink,
  FiMapPin,
  FiShield,
  FiTarget,
} from 'react-icons/fi';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import {
  ATHLETE_AGE_CATEGORY_OPTIONS,
  ATHLETE_COMPETITION_LEVEL_OPTIONS,
  ATHLETE_LEVEL_OPTIONS,
} from '../../utils/profile';

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

function locationLabel(location) {
  if (!location) {
    return '';
  }
  return [location.city, location.region, location.country].filter(Boolean).join(', ');
}

export default function AthleteCard({
  athlete,
  onPreview,
  onToggleSaved,
  isSaving = false,
  canSave = true,
}) {
  const location = locationLabel(athlete.location);
  const sports = athlete.sports || [];

  return (
    <article className="group flex h-full flex-col rounded-card border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-track/25 hover:shadow-lift">
      <div className="flex items-start gap-3">
        <Avatar name={athlete.name} src={athlete.avatarUrl} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/p/${athlete.slug}`}
                className="block truncate font-display text-lg font-semibold text-navy underline-offset-4 hover:text-track hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
              >
                {athlete.name}
              </Link>
              <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-slate">
                {athlete.headline || 'Athlete profile'}
              </p>
            </div>

            {canSave ? (
              <button
                type="button"
                onClick={() => onToggleSaved(athlete)}
                disabled={isSaving}
                aria-pressed={athlete.saved}
                aria-label={
                  athlete.saved ? `Remove ${athlete.name} from saved` : `Save ${athlete.name}`
                }
                className={`shrink-0 rounded-full border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track disabled:cursor-wait disabled:opacity-60 ${
                  athlete.saved
                    ? 'border-track/20 bg-track/10 text-track'
                    : 'border-line-strong bg-white text-slate hover:border-track/30 hover:bg-sand hover:text-track'
                }`}
              >
                <FiBookmark
                  className="h-4 w-4"
                  fill={athlete.saved ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {athlete.level ? (
              <Badge size="sm" variant="brand">
                {optionLabel(ATHLETE_LEVEL_OPTIONS, athlete.level)}
              </Badge>
            ) : null}
            {athlete.competitionLevel ? (
              <Badge size="sm" variant="neutral">
                {optionLabel(ATHLETE_COMPETITION_LEVEL_OPTIONS, athlete.competitionLevel)}
              </Badge>
            ) : null}
            {athlete.ageCategory ? (
              <Badge size="sm" variant="neutral">
                {optionLabel(ATHLETE_AGE_CATEGORY_OPTIONS, athlete.ageCategory)}
              </Badge>
            ) : null}
            {athlete.availableForTrials ? (
              <Badge size="sm" variant="success" dot>
                Open to trials
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate">
        {sports.length > 0 ? (
          <p className="flex items-start gap-2">
            <FiTarget className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <span className="min-w-0">
              <span className="font-bold text-navy">{sports.slice(0, 3).join(' · ')}</span>
              {athlete.positions?.length ? (
                <span className="text-slate"> — {athlete.positions.slice(0, 3).join(', ')}</span>
              ) : null}
            </span>
          </p>
        ) : null}

        {athlete.currentTeam ? (
          <p className="flex items-center gap-2">
            <FiBriefcase className="h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <span className="truncate">{athlete.currentTeam}</span>
          </p>
        ) : null}

        {location ? (
          <p className="flex items-center gap-2">
            <FiMapPin className="h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>
        ) : null}

        {athlete.experienceYears !== null ? (
          <p className="flex items-center gap-2">
            <FiAward className="h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <span>
              {athlete.experienceYears === 0
                ? 'Early career'
                : `${athlete.experienceYears} year${athlete.experienceYears === 1 ? '' : 's'} experience`}
            </span>
          </p>
        ) : null}
      </div>

      {athlete.skills?.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {athlete.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} size="sm" variant="neutral">
              {skill}
            </Badge>
          ))}
          {athlete.skills.length > 3 ? (
            <span className="self-center text-[11px] font-semibold text-slate">
              +{athlete.skills.length - 3} more
            </span>
          ) : null}
        </div>
      ) : null}

      {athlete.verifiedAchievements > 0 ? (
        <p className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-verified-soft px-2.5 py-1 text-[11px] font-extrabold text-verified">
          <FiShield className="h-3.5 w-3.5" aria-hidden="true" />
          {athlete.verifiedAchievements} verified achievement
          {athlete.verifiedAchievements === 1 ? '' : 's'}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => onPreview(athlete)}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-line-strong bg-white px-3 text-sm font-bold text-navy transition-colors hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
        >
          Quick view
        </button>
        <Link
          to={`/p/${athlete.slug}`}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-track px-4 text-sm font-extrabold text-white transition-colors hover:bg-track/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track focus-visible:ring-offset-2"
        >
          Profile
          <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

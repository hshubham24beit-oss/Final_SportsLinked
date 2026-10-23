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
import Button, { buttonClasses } from '../ui/Button';
import Modal from '../ui/Modal';
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

export default function AthletePreview({
  athlete,
  onClose,
  onToggleSaved,
  isSaving = false,
  canSave = true,
}) {
  if (!athlete) {
    return null;
  }

  const location = locationLabel(athlete.location);

  return (
    <Modal
      open={Boolean(athlete)}
      onClose={onClose}
      title={athlete.name}
      description={athlete.headline || 'Athlete profile'}
      size="lg"
      footer={
        <>
          {canSave ? (
            <Button
              variant="secondary"
              onClick={() => onToggleSaved(athlete)}
              isLoading={isSaving}
              leftIcon={<FiBookmark className="h-4 w-4" aria-hidden="true" />}
            >
              {athlete.saved ? 'Remove from saved' : 'Save candidate'}
            </Button>
          ) : null}
          <Link
            to={`/p/${athlete.slug}`}
            className={buttonClasses({ size: 'md', className: 'justify-center' })}
          >
            View full profile
            <FiExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar name={athlete.name} src={athlete.avatarUrl} size="lg" />
        <div className="flex flex-wrap gap-1.5">
          {athlete.level ? (
            <Badge variant="brand">{optionLabel(ATHLETE_LEVEL_OPTIONS, athlete.level)}</Badge>
          ) : null}
          {athlete.competitionLevel ? (
            <Badge variant="neutral">
              {optionLabel(ATHLETE_COMPETITION_LEVEL_OPTIONS, athlete.competitionLevel)}
            </Badge>
          ) : null}
          {athlete.ageCategory ? (
            <Badge variant="neutral">
              {optionLabel(ATHLETE_AGE_CATEGORY_OPTIONS, athlete.ageCategory)}
            </Badge>
          ) : null}
          {athlete.availableForTrials ? (
            <Badge variant="success" dot>
              Open to trials
            </Badge>
          ) : null}
        </div>
      </div>

      {athlete.bio ? (
        <p className="mt-5 whitespace-pre-line text-sm leading-7 text-body">{athlete.bio}</p>
      ) : null}

      <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
        {athlete.sports?.length > 0 ? (
          <div className="flex items-start gap-2.5">
            <FiTarget className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <div>
              <dt className="text-xs font-bold text-slate">Sport</dt>
              <dd className="font-bold text-navy">{athlete.sports.join(', ')}</dd>
            </div>
          </div>
        ) : null}
        {athlete.positions?.length > 0 ? (
          <div className="flex items-start gap-2.5">
            <FiAward className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <div>
              <dt className="text-xs font-bold text-slate">Positions and events</dt>
              <dd className="font-bold text-navy">{athlete.positions.join(', ')}</dd>
            </div>
          </div>
        ) : null}
        {athlete.currentTeam ? (
          <div className="flex items-start gap-2.5">
            <FiBriefcase className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <div>
              <dt className="text-xs font-bold text-slate">Current team</dt>
              <dd className="font-bold text-navy">{athlete.currentTeam}</dd>
            </div>
          </div>
        ) : null}
        {location ? (
          <div className="flex items-start gap-2.5">
            <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <div>
              <dt className="text-xs font-bold text-slate">Location</dt>
              <dd className="font-bold text-navy">{location}</dd>
            </div>
          </div>
        ) : null}
        {typeof athlete.experienceYears === 'number' ? (
          <div className="flex items-start gap-2.5">
            <FiAward className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
            <div>
              <dt className="text-xs font-bold text-slate">Experience</dt>
              <dd className="font-bold text-navy">{athlete.experienceYears} years</dd>
            </div>
          </div>
        ) : null}
        {athlete.verifiedAchievements > 0 ? (
          <div className="flex items-start gap-2.5">
            <FiShield className="mt-0.5 h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
            <div>
              <dt className="text-xs font-bold text-slate">Verified achievements</dt>
              <dd className="font-bold text-verified">{athlete.verifiedAchievements}</dd>
            </div>
          </div>
        ) : null}
      </dl>

      {athlete.skills?.length > 0 ? (
        <div className="mt-5 border-t border-line pt-5">
          <p className="eyebrow">Skills and qualifications</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {athlete.skills.map((skill) => (
              <Badge key={skill} variant="neutral" size="sm">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

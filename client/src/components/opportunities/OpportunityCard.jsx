import { Link } from 'react-router-dom';
import { FiBookmark, FiCalendar, FiMapPin, FiUsers } from 'react-icons/fi';
import Badge from '../ui/Badge';
import { buttonClasses } from '../ui/Button';
import { applicationStatusLabel, formatDeadline, opportunityStatusLabel, opportunityStatusVariant, opportunityTypeLabel } from '../../utils/opportunities';

export default function OpportunityCard({
  opportunity,
  onSaveToggle = null,
  isSaving = false,
  showStatus = false,
}) {
  const location = [opportunity.location?.city, opportunity.location?.country]
    .filter(Boolean)
    .join(', ');

  return (
    <article className="flex h-full flex-col rounded-card border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-track/25 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge size="sm" variant="brand">
            {opportunityTypeLabel(opportunity.type)}
          </Badge>
          {showStatus ? (
            <Badge size="sm" variant={opportunityStatusVariant(opportunity.status)}>
              {opportunityStatusLabel(opportunity.status)}
            </Badge>
          ) : null}
          {opportunity.myApplicationStatus ? (
            <Badge size="sm" variant="info">
              {applicationStatusLabel(opportunity.myApplicationStatus)}
            </Badge>
          ) : null}
        </div>

        {onSaveToggle && !opportunity.isOwner ? (
          <button
            type="button"
            onClick={() => onSaveToggle(opportunity)}
            disabled={isSaving}
            aria-label={opportunity.saved ? 'Remove from saved opportunities' : 'Save opportunity'}
            aria-pressed={Boolean(opportunity.saved)}
            className={`rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track disabled:opacity-50 ${
              opportunity.saved
                ? 'bg-track/10 text-track'
                : 'text-slate hover:bg-sand hover:text-track'
            }`}
          >
            <FiBookmark
              className="h-4 w-4"
              fill={opportunity.saved ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>

      <h2 className="mt-4 font-display text-xl leading-snug">
        <Link
          to={`/opportunities/${opportunity.id}`}
          className="underline-offset-4 transition-colors hover:text-track hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
        >
          {opportunity.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm font-semibold text-slate">{opportunity.publisherName}</p>

      <dl className="mt-4 space-y-2 text-xs text-slate">
        <div className="flex items-center gap-2">
          <FiCalendar className="h-3.5 w-3.5 text-track" aria-hidden="true" />
          <dt className="sr-only">Deadline</dt>
          <dd>Apply by {formatDeadline(opportunity.deadline)}</dd>
        </div>
        {location ? (
          <div className="flex items-center gap-2">
            <FiMapPin className="h-3.5 w-3.5 text-track" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd>{location}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <FiUsers className="h-3.5 w-3.5 text-track" aria-hidden="true" />
          <dt className="sr-only">Sport</dt>
          <dd>
            {opportunity.sport}
            {opportunity.positions?.length
              ? ` - ${opportunity.positions.slice(0, 3).join(', ')}`
              : ''}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs font-semibold text-slate">
          {opportunity.positionsAvailable || 1} place
          {(opportunity.positionsAvailable || 1) === 1 ? '' : 's'}
        </span>
        <Link
          to={`/opportunities/${opportunity.id}`}
          className={buttonClasses({ variant: 'secondary', size: 'sm' })}
        >
          View details
        </Link>
      </div>
    </article>
  );
}

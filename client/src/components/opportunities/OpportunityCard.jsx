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
    <article className="flex h-full flex-col rounded-xl border border-line bg-white p-5 shadow-card transition hover:border-brand-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge size="sm" variant="brand">
            {opportunityTypeLabel(opportunity.type)}
          </Badge>
          {showStatus ? (
            <Badge
              size="sm"
              variant={opportunityStatusVariant(opportunity.status)}
            >
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
            className={`rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50 ${
              opportunity.saved
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-subtle hover:bg-slate-100 hover:text-ink'
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

      <h2 className="mt-3 text-base font-semibold text-ink">
        <Link
          to={`/opportunities/${opportunity.id}`}
          className="underline-offset-4 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          {opportunity.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{opportunity.publisherName}</p>

      <dl className="mt-4 space-y-2 text-xs text-ink-muted">
        <div className="flex items-center gap-2">
          <FiCalendar className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
          <dt className="sr-only">Deadline</dt>
          <dd>Apply by {formatDeadline(opportunity.deadline)}</dd>
        </div>
        {location ? (
          <div className="flex items-center gap-2">
            <FiMapPin className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd>{location}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <FiUsers className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
          <dt className="sr-only">Sport</dt>
          <dd>
            {opportunity.sport}
            {opportunity.positions?.length
              ? ` - ${opportunity.positions.slice(0, 3).join(', ')}`
              : ''}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-ink-subtle">
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

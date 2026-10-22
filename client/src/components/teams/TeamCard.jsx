import { Link } from 'react-router-dom';
import { FiLock, FiMapPin, FiUsers } from 'react-icons/fi';
import Badge from '../ui/Badge';
import {
  TEAM_TYPE_LABELS,
  teamLocation,
  teamRoleLabel,
} from '../../utils/teams';

export default function TeamCard({ team }) {
  const location = teamLocation(team);

  return (
    <Link
      to={`/teams/${team.id}`}
      className="group flex h-full flex-col rounded-xl border border-line bg-white p-5 shadow-card transition hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant="brand" size="sm">
          {TEAM_TYPE_LABELS[team.type] || 'Team'}
        </Badge>
        <div className="flex items-center gap-2">
          {team.membershipStatus === 'invited' ? (
            <Badge variant="warning" size="sm">
              Invited
            </Badge>
          ) : team.memberRole ? (
            <Badge variant="info" size="sm">
              {teamRoleLabel(team.memberRole)}
            </Badge>
          ) : null}
          <Badge variant={team.privacy === 'private' ? 'neutral' : 'success'} size="sm">
            {team.privacy === 'private' ? (
              <>
                <FiLock className="h-3 w-3" aria-hidden="true" />
                Private
              </>
            ) : (
              'Public'
            )}
          </Badge>
        </div>
      </div>

      <h2 className="mt-3 text-base font-semibold leading-snug text-ink group-hover:text-brand-800">
        {team.name}
      </h2>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-muted">
        {team.description}
      </p>

      <div className="mt-4 space-y-2 text-xs text-ink-subtle">
        <p className="flex items-center gap-2">
          <FiUsers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {team.memberCount || 1} {team.memberCount === 1 ? 'member' : 'members'} - {team.sport}
        </p>
        {location ? (
          <p className="flex items-center gap-2">
            <FiMapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {location}
          </p>
        ) : null}
      </div>

      <div className="mt-auto border-t border-line pt-3 text-xs text-ink-subtle">
        Led by {team.ownerName}
      </div>
    </Link>
  );
}

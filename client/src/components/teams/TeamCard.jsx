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
      className="group flex h-full flex-col rounded-card border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-track/25 hover:shadow-lift"
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

      <h2 className="mt-4 font-display text-xl leading-snug transition-colors group-hover:text-track">
        {team.name}
      </h2>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate">
        {team.description}
      </p>

      <div className="mt-4 space-y-2 text-xs font-semibold text-slate">
        <p className="flex items-center gap-2">
          <FiUsers className="h-3.5 w-3.5 shrink-0 text-track" aria-hidden="true" />
          {team.memberCount || 1} {team.memberCount === 1 ? 'member' : 'members'} - {team.sport}
        </p>
        {location ? (
          <p className="flex items-center gap-2">
            <FiMapPin className="h-3.5 w-3.5 shrink-0 text-track" aria-hidden="true" />
            {location}
          </p>
        ) : null}
      </div>

      <div className="mt-auto border-t border-line pt-3 text-xs text-slate">
        Led by {team.ownerName}
      </div>
    </Link>
  );
}

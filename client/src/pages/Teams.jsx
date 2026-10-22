import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiUsers } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import { buttonClasses } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { SkeletonCard } from '../components/ui/Skeleton';
import TeamCard from '../components/teams/TeamCard';
import { teamsApi } from '../api/teams.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../utils/apiError';
import { TEAM_TYPE_OPTIONS } from '../utils/teams';

const PAGE_SIZE = 12;

export default function Teams({ mineOnly = false }) {
  useDocumentTitle(mineOnly ? 'My teams' : 'Teams');
  const { user } = useAuth();
  const canCreate = ['athlete', 'coach', 'recruiter'].includes(user.role);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [type, setType] = useState('');
  const [sport, setSport] = useState('');
  const [page, setPage] = useState(1);
  const [teams, setTeams] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (mineOnly) {
          const response = await teamsApi.mine();
          if (!cancelled) {
            setTeams(response.data.data.teams || []);
            setMeta({ page: 1, total: response.data.data.teams?.length || 0, totalPages: 0 });
          }
        } else {
          const response = await teamsApi.discover({
            q: debouncedKeyword,
            type,
            sport,
            page,
            limit: PAGE_SIZE,
          });
          if (!cancelled) {
            setTeams(response.data.data.teams || []);
            setMeta(
              response.data.meta || { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
            );
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setTeams([]);
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword, mineOnly, page, sport, type]);

  const updateFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {mineOnly ? 'My teams' : 'Teams and groups'}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {mineOnly
              ? 'Teams and groups you own, manage, coach, or belong to.'
              : 'Find public local teams and training groups, and manage your own.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={mineOnly ? '/teams' : '/teams/mine'}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            {mineOnly ? 'Discover teams' : 'My teams'}
          </Link>
          {canCreate ? (
            <Link to="/teams/new" className={buttonClasses({ size: 'sm' })}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Create team
            </Link>
          ) : null}
        </div>
      </div>

      {!mineOnly ? (
        <div className="mt-6 grid gap-3 rounded-xl border border-line bg-white p-4 shadow-card sm:grid-cols-3">
          <Input
            label="Search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            placeholder="Name, sport, or location"
            startIcon={<FiSearch className="h-4 w-4" aria-hidden="true" />}
          />
          <Select
            label="Type"
            placeholder="All types"
            value={type}
            onChange={(event) => updateFilter(setType, event.target.value)}
            options={TEAM_TYPE_OPTIONS}
          />
          <Input
            label="Sport"
            value={sport}
            onChange={(event) => updateFilter(setSport, event.target.value)}
            placeholder="Any sport"
          />
        </div>
      ) : null}

      {error ? (
        <Alert variant="error" title="Teams could not be loaded" className="mt-6">
          {error}
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </div>
      ) : null}

      {!isLoading && !error && teams.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={FiUsers}
          title={mineOnly ? 'No teams yet' : 'No public teams found'}
          description={
            mineOnly
              ? 'Create a team or accept an invitation to see it here.'
              : 'Try another search or filter. Public teams and groups will appear here.'
          }
          action={
            mineOnly && canCreate ? (
              <Link to="/teams/new" className={buttonClasses({ size: 'sm' })}>
                Create a team
              </Link>
            ) : null
          }
        />
      ) : null}

      {!isLoading && teams.length > 0 ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

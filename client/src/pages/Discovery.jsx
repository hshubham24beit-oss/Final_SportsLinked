import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBookmark,
  FiFilter,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { SkeletonCard } from '../components/ui/Skeleton';
import AthleteCard from '../components/discovery/AthleteCard';
import AthletePreview from '../components/discovery/AthletePreview';
import DiscoveryFilters, {
  INITIAL_DISCOVERY_FILTERS,
} from '../components/discovery/DiscoveryFilters';
import { discoveryApi } from '../api/discovery.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import {
  ATHLETE_AGE_CATEGORY_OPTIONS,
  ATHLETE_COMPETITION_LEVEL_OPTIONS,
  ATHLETE_LEVEL_OPTIONS,
} from '../utils/profile';

const PAGE_SIZE = 12;
const FILTER_KEYS = [
  'sport',
  'position',
  'skill',
  'team',
  'location',
  'ageCategory',
  'level',
  'competitionLevel',
  'achievementFilter',
  'verification',
  'statMetric',
  'statMin',
  'statMax',
  'availableForTrials',
  'nearMe',
];

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

function ActiveFilters({ filters, onClear, onClearAll }) {
  const chips = [];

  if (filters.sport) chips.push({ key: 'sport', label: `Sport: ${filters.sport}` });
  if (filters.position) {
    chips.push({ key: 'position', label: `Position: ${filters.position}` });
  }
  if (filters.skill) chips.push({ key: 'skill', label: `Skill: ${filters.skill}` });
  if (filters.team) chips.push({ key: 'team', label: `Team: ${filters.team}` });
  if (filters.location) {
    chips.push({ key: 'location', label: `Location: ${filters.location}` });
  }
  if (filters.ageCategory) {
    chips.push({
      key: 'ageCategory',
      label: optionLabel(ATHLETE_AGE_CATEGORY_OPTIONS, filters.ageCategory),
    });
  }
  if (filters.level) {
    chips.push({ key: 'level', label: optionLabel(ATHLETE_LEVEL_OPTIONS, filters.level) });
  }
  if (filters.competitionLevel) {
    chips.push({
      key: 'competitionLevel',
      label: optionLabel(ATHLETE_COMPETITION_LEVEL_OPTIONS, filters.competitionLevel),
    });
  }
  if (filters.achievementFilter) {
    chips.push({ key: 'achievementFilter', label: 'Has achievements' });
  }
  if (filters.verification) {
    chips.push({ key: 'verification', label: 'Verified achievement' });
  }
  if (filters.statMetric) {
    const range =
      filters.statMin || filters.statMax
        ? ` (${filters.statMin || 'any'}–${filters.statMax || 'any'})`
        : '';
    chips.push({
      key: 'statMetric',
      label: `Stat: ${filters.statMetric}${range}`,
    });
  }
  if (filters.availableForTrials) {
    chips.push({ key: 'availableForTrials', label: 'Open to trials' });
  }
  if (filters.nearMe) {
    chips.push({
      key: 'nearMe',
      label: `Within ${filters.radiusKm || 50} km of my profile`,
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onClear(chip.key)}
          className="inline-flex items-center gap-1.5 rounded-full border border-track/20 bg-track/10 px-3 py-1.5 text-xs font-extrabold text-track transition-colors hover:border-track/35 hover:bg-track/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
        >
          {chip.label}
          <FiX className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">Clear filter</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-extrabold text-slate underline-offset-4 hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
      >
        Clear all
      </button>
    </div>
  );
}

export default function Discovery({ savedOnly = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const canSave = ['coach', 'recruiter'].includes(user.role);
  const canSeeSaved = canSave;
  const [mode, setMode] = useState(savedOnly ? 'saved' : 'discover');
  useDocumentTitle(mode === 'saved' ? 'Saved candidates' : 'Discover athletes');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [filters, setFilters] = useState(INITIAL_DISCOVERY_FILTERS);
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [athletes, setAthletes] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setMode(savedOnly ? 'saved' : 'discover');
    setPage(1);
    setPreview(null);
  }, [savedOnly]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response =
          mode === 'saved'
            ? await discoveryApi.listSaved({ page, limit: PAGE_SIZE })
            : await discoveryApi.searchAthletes({
                q: debouncedKeyword,
                sport: filters.sport,
                position: filters.position,
                skill: filters.skill,
                team: filters.team,
                location: filters.location,
                ageCategory: filters.ageCategory,
                level: filters.level,
                competitionLevel: filters.competitionLevel,
                achievements: filters.achievementFilter,
                verification: filters.verification,
                statMetric: filters.statMetric,
                statMin: filters.statMin,
                statMax: filters.statMax,
                availableForTrials: filters.availableForTrials,
                nearMe: filters.nearMe,
                radiusKm: filters.nearMe ? filters.radiusKm : '',
                sort,
                page,
                limit: PAGE_SIZE,
              });

        if (!cancelled) {
          setAthletes(response.data.data.athletes || []);
          setMeta(
            response.data.meta || {
              page,
              limit: PAGE_SIZE,
              total: 0,
              totalPages: 0,
            },
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setAthletes([]);
          setMeta({ page, limit: PAGE_SIZE, total: 0, totalPages: 0 });
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword, filters, mode, page, reloadToken, sort]);

  const activeFilterCount = useMemo(
    () => FILTER_KEYS.filter((key) => Boolean(filters[key])).length,
    [filters],
  );

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilter = (key) => {
    const defaultValue =
      key === 'availableForTrials' || key === 'nearMe'
        ? false
        : INITIAL_DISCOVERY_FILTERS[key];
    updateFilter(key, defaultValue);
  };

  const resetFilters = () => {
    setFilters(INITIAL_DISCOVERY_FILTERS);
    setPage(1);
  };

  const resetSearch = () => {
    setKeyword('');
    setDebouncedKeyword('');
    setFilters(INITIAL_DISCOVERY_FILTERS);
    setPage(1);
  };

  const toggleSaved = useCallback(
    async (athlete) => {
      if (!canSave || savingId) {
        return;
      }

      setSavingId(athlete.userId);
      try {
        if (athlete.saved) {
          await discoveryApi.removeSavedCandidate(athlete.userId);
        } else {
          await discoveryApi.saveCandidate(athlete.userId);
        }

        const nextSaved = !athlete.saved;
        setAthletes((current) => {
          if (mode === 'saved' && !nextSaved) {
            return current.filter((item) => item.userId !== athlete.userId);
          }
          return current.map((item) =>
            item.userId === athlete.userId ? { ...item, saved: nextSaved } : item,
          );
        });
        setPreview((current) =>
          current && current.userId === athlete.userId
            ? { ...current, saved: nextSaved }
            : current,
        );
        if (mode === 'saved') {
          setMeta((current) => ({
            ...current,
            total: Math.max(0, current.total + (nextSaved ? 1 : -1)),
          }));
          setReloadToken((token) => token + 1);
        }
        toast.success(
          nextSaved ? 'Candidate saved' : 'Candidate removed',
          nextSaved
            ? `${athlete.name} is now in your saved list.`
            : `${athlete.name} was removed from your saved list.`,
        );
      } catch (requestError) {
        toast.error('Could not update saved candidates', getErrorMessage(requestError));
      } finally {
        setSavingId(null);
      }
    },
    [canSave, mode, savingId, toast],
  );

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setPage(1);
    setPreview(null);
    navigate(nextMode === 'saved' ? '/discovery/saved' : '/discovery');
  };

  const filterPanel = (
    <DiscoveryFilters
      filters={filters}
      onChange={updateFilter}
      onReset={resetFilters}
      showNearMe={user.role !== 'admin'}
      activeCount={activeFilterCount}
    />
  );

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Talent discovery</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            {mode === 'saved' ? (
              <>
                Saved <span className="display-emphasis">candidates.</span>
              </>
            ) : (
              <>
                Discover <span className="display-emphasis">athletes.</span>
              </>
            )}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
            {mode === 'saved'
              ? 'Your bookmarked athletes, kept together so you can revisit potential recruits and programme targets.'
              : 'Search real athlete profiles by sport, location, experience, performance, and verified achievements. Only details an athlete has made visible are shown.'}
          </p>
        </div>

        {canSeeSaved ? (
          <div className="inline-flex self-start rounded-full border border-line bg-white p-1 shadow-card">
            <button
              type="button"
              onClick={() => changeMode('discover')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track ${
                mode === 'discover'
                  ? 'bg-navy text-ivory'
                  : 'text-body hover:bg-sand hover:text-navy'
              }`}
            >
              <FiSearch className="h-4 w-4" aria-hidden="true" />
              Discover
            </button>
            <button
              type="button"
              onClick={() => changeMode('saved')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track ${
                mode === 'saved'
                  ? 'bg-navy text-ivory'
                  : 'text-body hover:bg-sand hover:text-navy'
              }`}
            >
              <FiBookmark className="h-4 w-4" aria-hidden="true" />
              Saved
            </button>
          </div>
        ) : null}
      </div>

      {mode === 'discover' ? (
        <div className="mt-6 rounded-card border border-line bg-white p-3 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="athlete-search"
              containerClassName="flex-1"
              placeholder="Search by name, sport, position, team, or skill"
              aria-label="Search athletes"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              startIcon={<FiSearch className="h-4 w-4" aria-hidden="true" />}
              endAdornment={
                keyword ? (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword('');
                      setPage(1);
                    }}
                    className="rounded-full p-1.5 text-slate transition-colors hover:bg-sand hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                    aria-label="Clear search"
                  >
                    <FiX className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null
              }
            />
            <div className="flex gap-2">
              <Select
                aria-label="Sort athletes"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'relevance', label: 'Best match' },
                  { value: 'completion', label: 'Most complete profile' },
                  { value: 'experience', label: 'Most experience' },
                  { value: 'recent', label: 'Recently updated' },
                ]}
                containerClassName="min-w-[180px]"
              />
              <Button
                variant="secondary"
                className="lg:hidden"
                onClick={() => setIsFiltersOpen(true)}
                leftIcon={<FiFilter className="h-4 w-4" aria-hidden="true" />}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        {mode === 'discover' ? (
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-card border border-line bg-white p-5 shadow-card">
              {filterPanel}
            </div>
          </aside>
        ) : null}

        <div className={mode === 'saved' ? 'lg:col-span-2' : ''}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-navy">
                {isLoading
                  ? 'Loading athletes…'
                  : mode === 'saved'
                    ? `${meta.total} saved candidate${meta.total === 1 ? '' : 's'}`
                    : `${meta.total} athlete${meta.total === 1 ? '' : 's'} found`}
              </p>
              {mode === 'discover' && (debouncedKeyword || activeFilterCount > 0) ? (
                <p className="mt-0.5 text-xs text-slate">
                  Results reflect visible profile details and your current filters.
                </p>
              ) : null}
            </div>
            {mode === 'saved' && !isLoading ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => changeMode('discover')}
                leftIcon={<FiSearch className="h-4 w-4" aria-hidden="true" />}
              >
                Find more athletes
              </Button>
            ) : null}
          </div>

          {mode === 'discover' ? (
            <ActiveFilters
              filters={filters}
              onClear={clearFilter}
              onClearAll={resetSearch}
            />
          ) : null}

          {error ? (
            <Alert variant="error" className="mt-4" title="Athletes could not be loaded">
              {error}
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setReloadToken((token) => token + 1)}
                >
                  Try again
                </Button>
              </div>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : null}

          {!isLoading && !error && athletes.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {athletes.map((athlete) => (
                <AthleteCard
                  key={athlete.userId}
                  athlete={athlete}
                  onPreview={setPreview}
                  onToggleSaved={toggleSaved}
                  isSaving={savingId === athlete.userId}
                  canSave={canSave}
                />
              ))}
            </div>
          ) : null}

          {!isLoading && !error && athletes.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={mode === 'saved' ? FiBookmark : FiUsers}
                title={
                  mode === 'saved'
                    ? 'No saved candidates yet'
                    : 'No athletes match these filters'
                }
                description={
                  mode === 'saved'
                    ? 'Save athletes from discovery to keep a shortlist for your programme or organisation.'
                    : 'Try removing a filter, widening your location radius, or searching with a different sport or name.'
                }
                action={
                  mode === 'saved' ? (
                    <Button
                      onClick={() => changeMode('discover')}
                      leftIcon={<FiSearch className="h-4 w-4" aria-hidden="true" />}
                    >
                      Discover athletes
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={resetSearch}>
                      Clear filters
                    </Button>
                  )
                }
              />
            </div>
          ) : null}

          {!isLoading && meta.totalPages > 1 ? (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onChange={setPage}
              className="mt-6"
            />
          ) : null}
        </div>
      </div>

      <Modal
        open={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        title="Filter athletes"
        description="Narrow the pool using the details athletes have chosen to share."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={resetFilters}>
              Clear filters
            </Button>
            <Button onClick={() => setIsFiltersOpen(false)}>Show results</Button>
          </>
        }
      >
        {filterPanel}
      </Modal>

      <AthletePreview
        athlete={preview}
        onClose={() => setPreview(null)}
        onToggleSaved={toggleSaved}
        isSaving={savingId === preview?.userId}
        canSave={canSave}
      />
    </div>
  );
}

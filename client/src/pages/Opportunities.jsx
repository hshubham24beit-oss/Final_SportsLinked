import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiSearch } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import { buttonClasses } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import { SkeletonCard } from '../components/ui/Skeleton';
import OpportunityCard from '../components/opportunities/OpportunityCard';
import { opportunitiesApi } from '../api/opportunities.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import {
  OPPORTUNITY_SORT_OPTIONS,
  OPPORTUNITY_TYPE_OPTIONS,
} from '../utils/opportunities';

const PAGE_SIZE = 12;

export default function Opportunities({ savedOnly = false }) {
  useDocumentTitle(savedOnly ? 'Saved opportunities' : 'Opportunities');
  const { user } = useAuth();
  const toast = useToast();
  const canPublish = ['coach', 'recruiter'].includes(user.role);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [type, setType] = useState('');
  const [sport, setSport] = useState('');
  const [sort, setSort] = useState('deadline');
  const [page, setPage] = useState(1);
  const [opportunities, setOpportunities] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

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
        const response = savedOnly
          ? await opportunitiesApi.saved({ page, limit: PAGE_SIZE })
          : await opportunitiesApi.list({
              q: debouncedKeyword,
              type,
              sport,
              sort,
              page,
              limit: PAGE_SIZE,
            });

        if (!cancelled) {
          setOpportunities(response.data.data.opportunities || []);
          setMeta(
            response.data.meta || { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setOpportunities([]);
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
  }, [debouncedKeyword, page, reloadToken, savedOnly, sort, sport, type]);

  const updateFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const toggleSave = useCallback(
    async (opportunity) => {
      setSavingId(opportunity.id);
      try {
        if (opportunity.saved) {
          await opportunitiesApi.unsave(opportunity.id);
          setOpportunities((current) =>
            savedOnly
              ? current.filter((item) => item.id !== opportunity.id)
              : current.map((item) =>
                  item.id === opportunity.id ? { ...item, saved: false } : item,
                ),
          );
          if (savedOnly) {
            setMeta((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
          }
          toast.success('Removed from saved', opportunity.title);
        } else {
          await opportunitiesApi.save(opportunity.id);
          setOpportunities((current) =>
            current.map((item) =>
              item.id === opportunity.id ? { ...item, saved: true } : item,
            ),
          );
          toast.success('Opportunity saved', 'Find it later under Saved opportunities.');
        }
        if (!savedOnly) setReloadToken((token) => token + 1);
      } catch (requestError) {
        toast.error('Could not update saved opportunity', getErrorMessage(requestError));
      } finally {
        setSavingId(null);
      }
    },
    [savedOnly, toast],
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {savedOnly ? 'Saved opportunities' : 'Opportunities'}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {savedOnly
              ? 'Opportunities you bookmarked. Closed or expired listings are removed automatically.'
              : 'Trials, teams, scholarships, camps, and roles published by coaches and organisations.'}
          </p>
        </div>

        {canPublish && !savedOnly ? (
          <Link to="/opportunities/new" className={buttonClasses({ size: 'sm' })}>
            Create opportunity
          </Link>
        ) : null}
      </div>

      {!savedOnly ? (
        <div className="mt-6 grid gap-3 rounded-xl border border-line bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            placeholder="Title, sport, or publisher"
            startIcon={<FiSearch className="h-4 w-4" aria-hidden="true" />}
          />
          <Select
            label="Type"
            placeholder="All types"
            value={type}
            onChange={(event) => updateFilter(setType, event.target.value)}
            options={OPPORTUNITY_TYPE_OPTIONS}
          />
          <Input
            label="Sport"
            value={sport}
            onChange={(event) => updateFilter(setSport, event.target.value)}
            placeholder="Any sport"
          />
          <Select
            label="Sort"
            value={sort}
            onChange={(event) => updateFilter(setSort, event.target.value)}
            options={OPPORTUNITY_SORT_OPTIONS}
          />
        </div>
      ) : null}

      {error ? (
        <Alert variant="error" title="Opportunities could not be loaded" className="mt-6">
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

      {!isLoading && !error && opportunities.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={savedOnly ? FiBriefcase : FiSearch}
          title={savedOnly ? 'No saved opportunities' : 'No opportunities found'}
          description={
            savedOnly
              ? 'Save opportunities from the listings page to keep track of them here.'
              : 'Try a different search or filter. New opportunities will appear here when published.'
          }
          action={
            savedOnly ? (
              <Link to="/opportunities" className={buttonClasses({ size: 'sm' })}>
                Browse opportunities
              </Link>
            ) : null
          }
        />
      ) : null}

      {!isLoading && opportunities.length > 0 ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onSaveToggle={toggleSave}
                isSaving={savingId === opportunity.id}
                showStatus={savedOnly && canPublish}
              />
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

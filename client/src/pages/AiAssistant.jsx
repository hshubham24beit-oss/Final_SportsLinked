import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiActivity,
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiBriefcase,
  FiCheck,
  FiCopy,
  FiCpu,
  FiEdit3,
  FiFileText,
  FiSend,
  FiTarget,
  FiUsers,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { achievementApi } from '../api/achievement.api';
import { aiApi } from '../api/ai.api';
import { postsApi } from '../api/posts.api';
import { profileApi } from '../api/profile.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import {
  AI_TONE_OPTIONS,
  generatedByLabel,
  splitList,
  suggestionVariant,
} from '../utils/ai';
import { formatDate } from '../utils/format';
import { OPPORTUNITY_TYPE_OPTIONS } from '../utils/opportunities';
import {
  ATHLETE_AGE_CATEGORY_OPTIONS,
  ATHLETE_COMPETITION_LEVEL_OPTIONS,
  ATHLETE_LEVEL_OPTIONS,
} from '../utils/profile';

function SuggestionNotice({ suggestion }) {
  if (!suggestion) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2.5">
      <Badge size="sm" variant={suggestionVariant(suggestion)}>
        {suggestion.label || 'Suggestion'}
      </Badge>
      <Badge size="sm" variant="neutral">
        Not verified
      </Badge>
      <span className="text-xs text-ink-muted">{generatedByLabel(suggestion.generatedBy)}</span>
    </div>
  );
}

function CriteriaList({ criteria = [] }) {
  if (criteria.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {criteria.map((item) => (
        <div key={item.key} className="rounded-lg border border-line bg-white px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
            {item.label}
          </p>
          <p className="mt-1 text-sm text-ink">{item.value}</p>
          {item.source ? <p className="mt-0.5 text-[11px] text-ink-subtle">{item.source}</p> : null}
        </div>
      ))}
    </div>
  );
}

function RecommendationCard({ item, groupKey }) {
  const href = groupKey === 'teams' ? `/teams/${item.id}` : item.slug ? `/p/${item.slug}` : null;
  const subtitle =
    groupKey === 'teams'
      ? [item.sport, item.location?.city].filter(Boolean).join(' - ')
      : [item.headline, item.organizationTypeLabel, item.location?.city]
          .filter(Boolean)
          .join(' - ');

  const body = (
    <>
      <div className="flex items-start gap-3">
        <Avatar name={item.name} src={item.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
            <Badge size="sm" variant="brand">
              {item.matchScore}% match
            </Badge>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.reasons?.slice(0, 3).map((reason) => (
          <span
            key={reason}
            className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800"
          >
            {reason}
          </span>
        ))}
      </div>
      {item.connectionStatus ? (
        <p className="mt-2 text-[11px] text-ink-subtle">
          Connection: {item.connectionStatus.replaceAll('_', ' ')}
        </p>
      ) : null}
    </>
  );

  if (!href) {
    return <div className="rounded-xl border border-line bg-white p-4">{body}</div>;
  }

  return (
    <Link
      to={href}
      className="block rounded-xl border border-line bg-white p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
    >
      {body}
    </Link>
  );
}

export default function AiAssistant() {
  useDocumentTitle('AI assistant');
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const requestedKind = searchParams.get('kind');

  const tabs = useMemo(
    () => [
      { key: 'profile', label: 'Profile', icon: FiEdit3 },
      { key: 'content', label: 'Posts and achievements', icon: FiFileText },
      { key: 'matches', label: 'Opportunity matches', icon: FiTarget },
      { key: 'recommendations', label: 'People and teams', icon: FiUsers },
      ...(user.role === 'athlete'
        ? [{ key: 'insights', label: 'Performance insights', icon: FiBarChart2 }]
        : []),
    ],
    [user.role],
  );
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab : 'profile';

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileInput, setProfileInput] = useState({
    headline: '',
    bio: '',
    sports: '',
    positions: '',
    experienceYears: '',
    currentTeam: '',
    city: '',
    country: '',
  });
  const [profileTone, setProfileTone] = useState('professional');
  const [profileSuggestion, setProfileSuggestion] = useState(null);
  const [profileDraft, setProfileDraft] = useState({ headline: '', bio: '' });
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [contentKind, setContentKind] = useState(
    requestedKind === 'achievement' ? 'achievement' : 'post',
  );
  const [contentForm, setContentForm] = useState({
    topic: '',
    details: '',
    sport: '',
    tone: 'professional',
    title: '',
    competition: '',
    result: '',
    date: '',
  });
  const [contentDraft, setContentDraft] = useState(null);
  const [contentText, setContentText] = useState('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);

  const [matchForm, setMatchForm] = useState({
    sport: '',
    positions: '',
    location: '',
    experienceYears: '',
    level: '',
    competitionLevel: '',
    ageCategory: '',
    preferredType: '',
  });
  const [matchResult, setMatchResult] = useState(null);
  const [isMatching, setIsMatching] = useState(false);

  const [recommendations, setRecommendations] = useState(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const [insights, setInsights] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await profileApi.getMyProfile();
        if (cancelled) return;
        const profile = response.data.data.profile;
        setProfileLoaded(true);
        if (!profile) return;

        const location = [profile.location?.city, profile.location?.region, profile.location?.country]
          .filter(Boolean)
          .join(', ');
        setProfileInput({
          headline: profile.headline || '',
          bio: profile.bio || '',
          sports: (profile.sports || []).join(', '),
          positions: (profile.positions || []).join(', '),
          experienceYears: profile.experienceYears ?? '',
          currentTeam: profile.currentTeam || profile.currentOrganization || '',
          city: profile.location?.city || '',
          country: profile.location?.country || '',
        });
        setMatchForm({
          sport: profile.sports?.[0] || '',
          positions: (profile.positions || []).join(', '),
          location,
          experienceYears: profile.experienceYears ?? '',
          level: profile.level || '',
          competitionLevel: profile.competitionLevel || '',
          ageCategory: profile.ageCategory || '',
          preferredType: '',
        });
        setContentForm((current) => ({
          ...current,
          sport: current.sport || profile.sports?.[0] || '',
        }));
      } catch (error) {
        if (!cancelled) {
          setProfileError(getErrorMessage(error));
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectTab = (key) => {
    setSearchParams({ tab: key });
  };

  const generateProfile = async (event) => {
    event.preventDefault();
    setIsGeneratingProfile(true);
    setProfileError('');
    try {
      const payload = {
        headline: profileInput.headline.trim(),
        bio: profileInput.bio.trim(),
        sports: splitList(profileInput.sports),
        positions: splitList(profileInput.positions),
        experienceYears:
          profileInput.experienceYears === ''
            ? undefined
            : Number(profileInput.experienceYears),
        currentTeam: profileInput.currentTeam.trim(),
        location: {
          city: profileInput.city.trim(),
          country: profileInput.country.trim(),
        },
        tone: profileTone,
      };
      const response = await aiApi.profileSuggestion(payload);
      const suggestion = response.data.data.suggestion;
      setProfileSuggestion(suggestion);
      setProfileDraft({
        headline: suggestion.headline || '',
        bio: suggestion.bio || '',
      });
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const saveProfileSuggestion = async () => {
    if (!profileDraft.headline.trim() && !profileDraft.bio.trim()) {
      setProfileError('Edit or keep at least one suggested field before saving.');
      return;
    }
    if (
      !window.confirm(
        'Save this reviewed headline and bio to your profile? Nothing is saved automatically.',
      )
    ) {
      return;
    }

    setIsSavingProfile(true);
    setProfileError('');
    try {
      await profileApi.updateProfile({
        headline: profileDraft.headline.trim(),
        bio: profileDraft.bio.trim(),
      });
      setProfileInput((current) => ({
        ...current,
        headline: profileDraft.headline.trim(),
        bio: profileDraft.bio.trim(),
      }));
      toast.success('Profile updated', 'Your reviewed suggestion is now saved.');
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied', 'The suggestion is on your clipboard.');
    } catch {
      toast.error('Could not copy', 'Select the text and copy it manually.');
    }
  };

  const generateContent = async (event) => {
    event.preventDefault();
    setIsGeneratingContent(true);
    setProfileError('');
    try {
      const payload = {
        kind: contentKind,
        topic: contentForm.topic.trim(),
        details: contentForm.details.trim(),
        sport: contentForm.sport.trim(),
        tone: contentForm.tone,
        ...(contentKind === 'achievement'
          ? {
              achievement: {
                title: contentForm.title.trim(),
                competition: contentForm.competition.trim(),
                result: contentForm.result.trim(),
                ...(contentForm.date ? { date: contentForm.date } : {}),
              },
            }
          : {}),
      };
      const response = await aiApi.contentDraft(payload);
      const draft = response.data.data.draft;
      setContentDraft(draft);
      setContentText(draft.text || '');
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const acceptContent = async () => {
    if (!contentText.trim()) {
      setProfileError('Add some text before publishing or saving.');
      return;
    }

    if (contentKind === 'post') {
      if (!window.confirm('Publish this reviewed text as a post? Nothing is published automatically.')) {
        return;
      }
      setIsSavingContent(true);
      setProfileError('');
      try {
        await postsApi.create({
          text: contentText.trim(),
          type: 'text',
          visibility: 'public',
          sport: contentForm.sport.trim(),
        });
        toast.success('Post published', 'Your reviewed draft is now in the feed.');
      } catch (error) {
        setProfileError(getErrorMessage(error));
      } finally {
        setIsSavingContent(false);
      }
      return;
    }

    if (!contentForm.title.trim() || !contentForm.sport.trim()) {
      setProfileError('Add an achievement title and sport before saving.');
      return;
    }
    if (!window.confirm('Save this reviewed description as an achievement?')) {
      return;
    }

    setIsSavingContent(true);
    setProfileError('');
    try {
      await achievementApi.create({
        title: contentForm.title.trim(),
        sport: contentForm.sport.trim(),
        competition: contentForm.competition.trim(),
        result: contentForm.result.trim(),
        ...(contentForm.date ? { date: contentForm.date } : {}),
        description: contentText.trim(),
      });
      toast.success('Achievement added', 'Your reviewed description is now saved.');
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsSavingContent(false);
    }
  };

  const findMatches = async (event) => {
    event.preventDefault();
    setIsMatching(true);
    setProfileError('');
    try {
      const response = await aiApi.opportunityMatches({
        sport: matchForm.sport.trim(),
        positions: splitList(matchForm.positions),
        location: matchForm.location.trim(),
        experienceYears:
          matchForm.experienceYears === ''
            ? undefined
            : Number(matchForm.experienceYears),
        level: matchForm.level || undefined,
        competitionLevel: matchForm.competitionLevel || undefined,
        ageCategory: matchForm.ageCategory || undefined,
        preferredTypes: matchForm.preferredType ? [matchForm.preferredType] : [],
      });
      setMatchResult(response.data.data);
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsMatching(false);
    }
  };

  const loadRecommendations = async () => {
    setIsLoadingRecommendations(true);
    setProfileError('');
    try {
      const response = await aiApi.profileRecommendations();
      setRecommendations(response.data.data);
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const loadInsights = async () => {
    setIsLoadingInsights(true);
    setProfileError('');
    try {
      const response = await aiApi.performanceInsights();
      setInsights(response.data.data.insights);
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setIsLoadingInsights(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <FiCpu className="h-5 w-5" aria-hidden="true" />
            </span>
            <Badge variant="brand">AI assistance</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            AI assistant
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-muted">
            Generate suggestions for your profile, posts, achievements, opportunities, and
            performance records. Every result is editable and nothing is saved or published
            without your action.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        AI output is a suggestion, not a verification. Private evidence and document links are
        never sent to an external provider, and rule-based matching uses only the criteria shown.
      </div>

      <div className="mt-5 flex gap-1.5 overflow-x-auto border-b border-line pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={[
                'inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                activeTab === tab.key
                  ? 'border-b-2 border-brand-600 text-brand-800'
                  : 'text-ink-muted hover:bg-slate-50 hover:text-ink',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {profileError ? (
        <Alert variant="error" className="mt-5" title="That request could not be completed">
          {profileError}
        </Alert>
      ) : null}

      {activeTab === 'profile' ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile details</CardTitle>
              <CardDescription>
                Only the fields you provide are used. Evidence links are not part of this request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={generateProfile}>
                <Input
                  label="Headline"
                  value={profileInput.headline}
                  maxLength={160}
                  onChange={(event) =>
                    setProfileInput((current) => ({ ...current, headline: event.target.value }))
                  }
                />
                <Textarea
                  label="Bio"
                  rows={4}
                  value={profileInput.bio}
                  maxLength={2000}
                  onChange={(event) =>
                    setProfileInput((current) => ({ ...current, bio: event.target.value }))
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Sports"
                    hint="Comma separated"
                    value={profileInput.sports}
                    onChange={(event) =>
                      setProfileInput((current) => ({ ...current, sports: event.target.value }))
                    }
                  />
                  <Input
                    label="Positions"
                    hint="Comma separated"
                    value={profileInput.positions}
                    onChange={(event) =>
                      setProfileInput((current) => ({
                        ...current,
                        positions: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Experience years"
                    type="number"
                    min="0"
                    max="80"
                    value={profileInput.experienceYears}
                    onChange={(event) =>
                      setProfileInput((current) => ({
                        ...current,
                        experienceYears: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Current team or organisation"
                    value={profileInput.currentTeam}
                    onChange={(event) =>
                      setProfileInput((current) => ({
                        ...current,
                        currentTeam: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="City"
                    value={profileInput.city}
                    onChange={(event) =>
                      setProfileInput((current) => ({ ...current, city: event.target.value }))
                    }
                  />
                  <Input
                    label="Country"
                    value={profileInput.country}
                    onChange={(event) =>
                      setProfileInput((current) => ({ ...current, country: event.target.value }))
                    }
                  />
                </div>
                <Select
                  label="Tone"
                  options={AI_TONE_OPTIONS}
                  value={profileTone}
                  onChange={(event) => setProfileTone(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    isLoading={isGeneratingProfile}
                    leftIcon={<FiCpu className="h-4 w-4" aria-hidden="true" />}
                  >
                    Generate suggestion
                  </Button>
                  {!profileLoaded ? (
                    <span className="self-center text-xs text-ink-subtle">Loading profile details...</span>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review before saving</CardTitle>
              <CardDescription>
                Edit the suggested text. Saving only updates your headline and bio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!profileSuggestion ? (
                <EmptyState
                  icon={FiEdit3}
                  title="No profile suggestion yet"
                  description="Add or review your details, then generate a suggestion."
                />
              ) : (
                <div>
                  <SuggestionNotice suggestion={profileSuggestion} />
                  {profileSuggestion.notice ? (
                    <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                      {profileSuggestion.notice}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-4">
                    <Input
                      label="Suggested headline"
                      value={profileDraft.headline}
                      maxLength={160}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          headline: event.target.value,
                        }))
                      }
                    />
                    <Textarea
                      label="Suggested bio"
                      rows={8}
                      maxLength={2000}
                      value={profileDraft.bio}
                      onChange={(event) =>
                        setProfileDraft((current) => ({ ...current, bio: event.target.value }))
                      }
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      isLoading={isSavingProfile}
                      onClick={saveProfileSuggestion}
                      leftIcon={<FiCheck className="h-4 w-4" aria-hidden="true" />}
                    >
                      Accept and save to profile
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        copyText(
                          [profileDraft.headline, profileDraft.bio].filter(Boolean).join('\n\n'),
                        )
                      }
                      leftIcon={<FiCopy className="h-4 w-4" aria-hidden="true" />}
                    >
                      Copy
                    </Button>
                  </div>
                  <Link
                    to="/profile/edit"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Open the full profile editor
                    <FiArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'content' ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Post or achievement draft</CardTitle>
              <CardDescription>
                Draft text from the facts you supply, then review it before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={generateContent}>
                <Select
                  label="Draft type"
                  options={[
                    { value: 'post', label: 'Social post' },
                    { value: 'achievement', label: 'Achievement description' },
                  ]}
                  value={contentKind}
                  onChange={(event) => setContentKind(event.target.value)}
                />
                {contentKind === 'achievement' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Achievement title"
                      required
                      value={contentForm.title}
                      onChange={(event) =>
                        setContentForm((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                    <Input
                      label="Sport"
                      required
                      value={contentForm.sport}
                      onChange={(event) =>
                        setContentForm((current) => ({ ...current, sport: event.target.value }))
                      }
                    />
                    <Input
                      label="Competition"
                      value={contentForm.competition}
                      onChange={(event) =>
                        setContentForm((current) => ({
                          ...current,
                          competition: event.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Result"
                      value={contentForm.result}
                      onChange={(event) =>
                        setContentForm((current) => ({ ...current, result: event.target.value }))
                      }
                    />
                    <Input
                      label="Date"
                      type="date"
                      value={contentForm.date}
                      onChange={(event) =>
                        setContentForm((current) => ({ ...current, date: event.target.value }))
                      }
                    />
                    <Input
                      label="Topic or context"
                      value={contentForm.topic}
                      onChange={(event) =>
                        setContentForm((current) => ({ ...current, topic: event.target.value }))
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      label="Topic"
                      required
                      value={contentForm.topic}
                      onChange={(event) =>
                        setContentForm((current) => ({ ...current, topic: event.target.value }))
                      }
                    />
                    <Input
                      label="Sport"
                      value={contentForm.sport}
                      onChange={(event) =>
                        setContentForm((current) => ({ ...current, sport: event.target.value }))
                      }
                    />
                  </div>
                )}
                <Textarea
                  label="Details"
                  rows={5}
                  value={contentForm.details}
                  onChange={(event) =>
                    setContentForm((current) => ({ ...current, details: event.target.value }))
                  }
                />
                <Select
                  label="Tone"
                  options={AI_TONE_OPTIONS}
                  value={contentForm.tone}
                  onChange={(event) =>
                    setContentForm((current) => ({ ...current, tone: event.target.value }))
                  }
                />
                <Button
                  type="submit"
                  isLoading={isGeneratingContent}
                  leftIcon={<FiCpu className="h-4 w-4" aria-hidden="true" />}
                >
                  Generate draft
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review draft</CardTitle>
              <CardDescription>
                Nothing is published until you confirm the reviewed text.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!contentDraft ? (
                <EmptyState
                  icon={FiFileText}
                  title="No content draft yet"
                  description="Choose a post or achievement and generate a draft."
                />
              ) : (
                <div>
                  <SuggestionNotice suggestion={contentDraft} />
                  {contentDraft.notice ? (
                    <p className="mt-3 text-xs leading-relaxed text-ink-muted">{contentDraft.notice}</p>
                  ) : null}
                  <Textarea
                    label="Editable preview"
                    rows={10}
                    className="mt-4"
                    maxLength={contentKind === 'post' ? 3000 : 2000}
                    value={contentText}
                    onChange={(event) => setContentText(event.target.value)}
                  />
                  <p className="mt-1 text-right text-[11px] text-ink-subtle">
                    {contentText.length}/{contentKind === 'post' ? 3000 : 2000}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      isLoading={isSavingContent}
                      onClick={acceptContent}
                      leftIcon={
                        contentKind === 'post' ? (
                          <FiSend className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <FiAward className="h-4 w-4" aria-hidden="true" />
                        )
                      }
                    >
                      {contentKind === 'post' ? 'Accept and publish post' : 'Accept and save achievement'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => copyText(contentText)}
                      leftIcon={<FiCopy className="h-4 w-4" aria-hidden="true" />}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'matches' ? (
        <div className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Matching criteria</CardTitle>
              <CardDescription>
                Matches are ranked only against published opportunities and the criteria below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={findMatches}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Sport"
                    value={matchForm.sport}
                    onChange={(event) =>
                      setMatchForm((current) => ({ ...current, sport: event.target.value }))
                    }
                  />
                  <Input
                    label="Positions"
                    hint="Comma separated"
                    value={matchForm.positions}
                    onChange={(event) =>
                      setMatchForm((current) => ({ ...current, positions: event.target.value }))
                    }
                  />
                  <Input
                    label="Location"
                    placeholder="City, region, country"
                    value={matchForm.location}
                    onChange={(event) =>
                      setMatchForm((current) => ({ ...current, location: event.target.value }))
                    }
                  />
                  <Input
                    label="Experience years"
                    type="number"
                    min="0"
                    max="80"
                    value={matchForm.experienceYears}
                    onChange={(event) =>
                      setMatchForm((current) => ({
                        ...current,
                        experienceYears: event.target.value,
                      }))
                    }
                  />
                  <Select
                    label="Level"
                    placeholder="Use profile level"
                    options={ATHLETE_LEVEL_OPTIONS}
                    value={matchForm.level}
                    onChange={(event) =>
                      setMatchForm((current) => ({ ...current, level: event.target.value }))
                    }
                  />
                  <Select
                    label="Competition level"
                    placeholder="Use profile level"
                    options={ATHLETE_COMPETITION_LEVEL_OPTIONS}
                    value={matchForm.competitionLevel}
                    onChange={(event) =>
                      setMatchForm((current) => ({
                        ...current,
                        competitionLevel: event.target.value,
                      }))
                    }
                  />
                  <Select
                    label="Age category"
                    placeholder="Use profile category"
                    options={ATHLETE_AGE_CATEGORY_OPTIONS}
                    value={matchForm.ageCategory}
                    onChange={(event) =>
                      setMatchForm((current) => ({ ...current, ageCategory: event.target.value }))
                    }
                  />
                  <Select
                    label="Preferred opportunity type"
                    placeholder="Any type"
                    options={OPPORTUNITY_TYPE_OPTIONS}
                    value={matchForm.preferredType}
                    onChange={(event) =>
                      setMatchForm((current) => ({ ...current, preferredType: event.target.value }))
                    }
                  />
                </div>
                <Button
                  type="submit"
                  isLoading={isMatching}
                  leftIcon={<FiTarget className="h-4 w-4" aria-hidden="true" />}
                >
                  Find matches
                </Button>
              </form>
            </CardContent>
          </Card>

          {matchResult ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Criteria used</h2>
                <p className="mt-1 text-xs text-ink-muted">{matchResult.notice}</p>
                <div className="mt-3">
                  <CriteriaList criteria={matchResult.criteria} />
                </div>
              </div>
              {matchResult.matches.length === 0 ? (
                <EmptyState
                  icon={FiBriefcase}
                  title="No published opportunities matched"
                  description="Try widening the sport, location, or eligibility criteria."
                  action={
                    <Link to="/opportunities" className="text-sm font-semibold text-brand-700 hover:underline">
                      Browse all opportunities
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {matchResult.matches.map((match) => (
                    <Link
                      key={match.id}
                      to={`/opportunities/${match.id}`}
                      className="rounded-xl border border-line bg-white p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{match.title}</p>
                          <p className="mt-0.5 text-xs text-ink-subtle">
                            {match.publisherName} - closes {formatDate(match.deadline)}
                          </p>
                        </div>
                        <Badge variant="brand" size="sm">
                          {match.matchScore}% match
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-1">
                        {match.reasons.map((reason) => (
                          <p key={reason} className="flex items-start gap-1.5 text-xs text-ink-muted">
                            <FiCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                            {reason}
                          </p>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'recommendations' ? (
        <div className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Network recommendations</CardTitle>
              <CardDescription>
                Suggestions use only visible profile details, public teams, and your existing
                connections. Blocked accounts are excluded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                isLoading={isLoadingRecommendations}
                onClick={loadRecommendations}
                leftIcon={<FiUsers className="h-4 w-4" aria-hidden="true" />}
              >
                {recommendations ? 'Refresh recommendations' : 'Load recommendations'}
              </Button>
              {recommendations ? (
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  {recommendations.notice}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {recommendations ? (
            <>
              <div>
                <h2 className="text-base font-semibold text-ink">Criteria used</h2>
                <div className="mt-3">
                  <CriteriaList criteria={recommendations.criteria} />
                </div>
              </div>
              {recommendations.groups.length === 0 ? (
                <EmptyState
                  icon={FiUsers}
                  title="No recommendations yet"
                  description="Add sports and a location to your profile to improve suggestions."
                  action={
                    <Link to="/profile/edit" className="text-sm font-semibold text-brand-700 hover:underline">
                      Update your profile
                    </Link>
                  }
                />
              ) : (
                recommendations.groups.map((group) => (
                  <section key={group.key}>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-ink">{group.title}</h2>
                        <p className="mt-0.5 text-xs text-ink-muted">{group.description}</p>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {group.recommendations.length}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {group.recommendations.map((item) => (
                        <RecommendationCard key={item.id} item={item} groupKey={group.key} />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'insights' && user.role === 'athlete' ? (
        <div className="mt-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Athlete performance records</CardTitle>
              <CardDescription>
                This summarises only the statistics and personal bests already stored in your
                profile. It does not assess ability or predict performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                isLoading={isLoadingInsights}
                onClick={loadInsights}
                leftIcon={<FiBarChart2 className="h-4 w-4" aria-hidden="true" />}
              >
                {insights ? 'Refresh insights' : 'Load my insights'}
              </Button>
            </CardContent>
          </Card>

          {insights ? (
            <>
              <Alert variant="info" title="Descriptive only">
                {insights.disclaimer}
              </Alert>
              {insights.metricGroups.length === 0 && insights.personalBests.length === 0 ? (
                <EmptyState
                  icon={FiActivity}
                  title="No performance records yet"
                  description="Add statistics or personal bests to your profile to see descriptive trends."
                  action={
                    <Link to="/profile/edit" className="text-sm font-semibold text-brand-700 hover:underline">
                      Add performance records
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {insights.metricGroups.map((group) => (
                    <Card key={`${group.metric}-${group.unit}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle>{group.metric}</CardTitle>
                            <CardDescription>{group.summary}</CardDescription>
                          </div>
                          <Badge size="sm" variant="neutral">
                            {group.direction}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1.5">
                          {group.records.map((record) => (
                            <div
                              key={`${record.date}-${record.value}`}
                              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm"
                            >
                              <span className="text-ink-muted">{formatDate(record.date)}</span>
                              <span className="font-semibold text-ink">
                                {record.value} {record.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {insights.personalBests.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Personal bests</CardTitle>
                        <CardDescription>
                          Existing profile entries, shown without AI interpretation.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1.5">
                          {insights.personalBests.map((entry) => (
                            <div
                              key={`${entry.event}-${entry.result}-${entry.date}`}
                              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink">{entry.event}</p>
                                <p className="truncate text-xs text-ink-subtle">
                                  {[entry.competition, formatDate(entry.date)]
                                    .filter((value) => value && value !== '--')
                                    .join(' - ')}
                                </p>
                              </div>
                              <span className="shrink-0 font-semibold text-ink">
                                {entry.result} {entry.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              )}
              <p className="text-xs leading-relaxed text-ink-muted">{insights.notice}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

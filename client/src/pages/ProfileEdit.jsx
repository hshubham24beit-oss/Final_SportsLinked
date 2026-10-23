import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiCheckCircle,
  FiCpu,
  FiExternalLink,
  FiImage,
  FiLock,
  FiSave,
  FiSettings,
  FiTarget,
  FiUser,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button, { buttonClasses } from '../components/ui/Button';
import PageLoader from '../components/PageLoader';
import ProgressBar from '../components/ui/ProgressBar';
import AchievementsManager from '../components/profile/AchievementsManager';
import GalleryManager from '../components/profile/GalleryManager';
import StatisticsManager from '../components/profile/StatisticsManager';
import {
  BasicsFields,
  ContactFields,
  ExperienceFields,
  RoleFields,
  VisibilityFields,
} from '../components/profile/ProfileFields';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { achievementApi } from '../api/achievement.api';
import { profileApi } from '../api/profile.api';
import { statisticsApi } from '../api/statistics.api';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';
import { getRoleLabel } from '../utils/roles';
import {
  buildProfilePayload,
  getCompletionLabel,
  profileToForm,
} from '../utils/profile';

function setByPath(object, path, value) {
  const parts = path.split('.');
  const key = parts[0];

  if (parts.length === 1) {
    return { ...object, [key]: value };
  }

  return {
    ...object,
    [key]: setByPath(object[key] || {}, parts.slice(1).join('.'), value),
  };
}

const ROLE_TAB_ICON = {
  athlete: FiActivity,
  coach: FiTarget,
  recruiter: FiUser,
};

const COMPLETION_TAB = {
  name: 'role',
  avatar: 'media',
  cover: 'media',
  media: 'media',
  sports: 'role',
  level: 'role',
  positions: 'role',
  experience: 'role',
  experienceYears: 'role',
  specializations: 'role',
  certifications: 'role',
  organizationType: 'role',
  activities: 'role',
  foundedYear: 'role',
  career: 'role',
  careerHistory: 'role',
  personalBests: 'role',
  opportunities: 'role',
  trials: 'role',
  availability: 'role',
  currentTeam: 'role',
  currentOrganization: 'role',
  headline: 'profile',
  bio: 'profile',
  location: 'profile',
  coordinates: 'profile',
  contactEmail: 'profile',
  website: 'profile',
  contact: 'profile',
};

function tabForField(field) {
  if (!field) return 'profile';
  if (field.startsWith('contact') || field === 'email') return 'profile';
  if (field.startsWith('visibility') || field === 'visibility') return 'privacy';
  const root = field.split('.')[0];
  return COMPLETION_TAB[root] || 'role';
}

export default function ProfileEdit() {
  useDocumentTitle('Edit profile');
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const role = user.role;

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const profileResponse = await profileApi.getMyProfile();
      const loadedProfile = profileResponse.data.data.profile;

      if (!loadedProfile) {
        navigate('/onboarding', { replace: true });
        return;
      }

      const [achievementResponse, statisticResponse] = await Promise.all([
        achievementApi.list(),
        role === 'athlete' ? statisticsApi.list() : Promise.resolve(null),
      ]);

      setProfile(loadedProfile);
      setForm(profileToForm(loadedProfile, role));
      setAchievements(achievementResponse.data.data.achievements || []);
      setStatistics(
        statisticResponse ? statisticResponse.data.data.statistics || [] : [],
      );
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [navigate, role]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const tabs = useMemo(() => {
    const roleIcon = ROLE_TAB_ICON[role] || FiUser;
    return [
      { key: 'profile', label: 'Basic profile', icon: FiUser },
      { key: 'role', label: getRoleLabel(role), icon: roleIcon },
      { key: 'achievements', label: 'Achievements', icon: FiAward, count: achievements.length },
      ...(role === 'athlete'
        ? [
            {
              key: 'statistics',
              label: 'Statistics',
              icon: FiBarChart2,
              count: statistics.length,
            },
          ]
        : []),
      { key: 'media', label: 'Photos', icon: FiImage },
      { key: 'privacy', label: 'Visibility', icon: FiLock },
    ];
  }, [achievements.length, role, statistics.length]);

  if (role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return <PageLoader message="Loading your profile…" />;
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert variant="error" title="Profile could not be loaded">
          {loadError}
        </Alert>
        <Button className="mt-4" variant="secondary" onClick={loadProfile}>
          Try again
        </Button>
      </div>
    );
  }

  if (!profile || !form) {
    return null;
  }

  const completion = profile.completion || { score: 0, missing: [] };
  const missing = completion.missing || [];
  const isEditableTab = ['profile', 'role', 'privacy'].includes(activeTab);

  const handleChange = (path, value) => {
    setForm((current) => setByPath(current, path, value));
    setErrors((current) => {
      if (!current[path] && !current[path.split('.')[0]]) {
        return current;
      }
      const next = { ...current };
      delete next[path];
      delete next[path.split('.')[0]];
      return next;
    });
    setServerError('');
  };

  const handleToggleArray = (field, value) => {
    setForm((current) => {
      const list = current[field] || [];
      return {
        ...current,
        [field]: list.includes(value)
          ? list.filter((item) => item !== value)
          : [...list, value],
      };
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  };

  const handleAddArray = (field, entry) => {
    setForm((current) => ({ ...current, [field]: [...(current[field] || []), entry] }));
    setServerError('');
  };

  const handleUpdateArray = (field, index, key, value) => {
    setForm((current) => ({
      ...current,
      [field]: (current[field] || []).map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry,
      ),
    }));
    setServerError('');
  };

  const handleRemoveArray = (field, index) => {
    setForm((current) => ({
      ...current,
      [field]: (current[field] || []).filter((_, entryIndex) => entryIndex !== index),
    }));
    setServerError('');
  };

  const saveProfile = async (event) => {
    if (event) event.preventDefault();
    setIsSaving(true);
    setServerError('');
    setErrors({});

    try {
      const response = await profileApi.updateProfile(buildProfilePayload(form, role));
      const updated = response.data.data.profile;

      setProfile(updated);
      setForm(profileToForm(updated, role));
      updateUser({
        name: role === 'recruiter' ? updated.name || user.name : user.name,
        avatarUrl: updated.avatar?.url || user.avatarUrl,
      });
      toast.success('Profile saved', 'Your changes are now live.');
    } catch (error) {
      setServerError(getErrorMessage(error));
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        const firstTab = tabForField(Object.keys(fieldErrors)[0]);
        if (firstTab !== activeTab) setActiveTab(firstTab);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const goToCompletionItem = (key) => {
    setActiveTab(COMPLETION_TAB[key] || 'role');
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-track">
            Profile
          </p>
          <h1 className="mt-1 text-3xl leading-tight sm:text-4xl">
            Edit your profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
            Keep your details current. Only the sections you mark visible are shared on your public
            profile.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {profile.slug ? (
            <Link
              to={`/p/${profile.slug}`}
              className="inline-flex h-10 items-center gap-2 rounded-tile border border-line-strong bg-white px-3.5 text-sm font-semibold text-navy shadow-sm transition-colors hover:bg-sand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track focus-visible:ring-offset-2"
            >
              View public profile
              <FiExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
          <Link
            to="/settings"
            className={buttonClasses({ variant: 'ghost', size: 'md' })}
          >
            <FiSettings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="overflow-x-auto rounded-card border border-line bg-white p-1.5 shadow-card">
            <div className="flex min-w-max gap-1" role="tablist" aria-label="Profile editor sections">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-tile px-3 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-sand text-track'
                        : 'text-body hover:bg-sand/60 hover:text-navy'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                    {tab.count !== undefined ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          selected ? 'bg-sand-deep text-track' : 'bg-sand text-body'
                        }`}
                      >
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
            {serverError ? (
              <Alert variant="error" className="mb-5" title="Profile not saved">
                {serverError}
              </Alert>
            ) : null}

            {activeTab === 'achievements' ? (
              <AchievementsManager
                achievements={achievements}
                setAchievements={setAchievements}
              />
            ) : null}

            {activeTab === 'statistics' && role === 'athlete' ? (
              <StatisticsManager
                statistics={statistics}
                setStatistics={setStatistics}
                visibility={profile.visibility?.statistics}
              />
            ) : null}

            {activeTab === 'media' ? (
              <GalleryManager profile={profile} setProfile={setProfile} user={user} />
            ) : null}

            {isEditableTab ? (
              <form onSubmit={saveProfile}>
                {activeTab === 'profile' ? (
                  <div className="space-y-7">
                    <div className="flex flex-col gap-3 rounded-tile border border-line bg-sand p-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2.5">
                        <FiCpu className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-navy">Need a clearer profile?</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-track">
                            Generate an editable headline and bio, then review it before saving.
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/ai?tab=profile"
                        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                      >
                        Open AI assistant
                      </Link>
                    </div>
                    <BasicsFields
                      role={role}
                      form={form}
                      onChange={handleChange}
                      errors={errors}
                    />
                    <div className="border-t border-line pt-6">
                      <ContactFields form={form} onChange={handleChange} errors={errors} />
                    </div>
                  </div>
                ) : null}

                {activeTab === 'role' ? (
                  <div className="space-y-7">
                    <RoleFields
                      role={role}
                      form={form}
                      onChange={handleChange}
                      onToggleArray={handleToggleArray}
                      errors={errors}
                    />
                    <div className="border-t border-line pt-6">
                      <ExperienceFields
                        role={role}
                        form={form}
                        onChange={handleChange}
                        onAddArray={handleAddArray}
                        onUpdateArray={handleUpdateArray}
                        onRemoveArray={handleRemoveArray}
                        errors={errors}
                      />
                    </div>
                  </div>
                ) : null}

                {activeTab === 'privacy' ? (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-xl">Profile visibility</h2>
                      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-body">
                        Choose who can see each section. Private sections are visible only to you,
                        and restricted sections require a signed-in account.
                      </p>
                    </div>
                    <VisibilityFields
                      form={form}
                      onChange={handleChange}
                      errors={errors}
                    />
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate">
                    {activeTab === 'privacy'
                      ? 'Visibility changes apply as soon as you save.'
                      : 'Changes are applied to your public profile after saving.'}
                  </p>
                  <Button
                    type="submit"
                    size="md"
                    isLoading={isSaving}
                    leftIcon={<FiSave className="h-4 w-4" aria-hidden="true" />}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-navy">Profile completion</h2>
              <Badge
                size="sm"
                variant={completion.score >= 100 ? 'success' : 'brand'}
              >
                {completion.score >= 100 ? 'Complete' : 'In progress'}
              </Badge>
            </div>
            <ProgressBar
              value={completion.score}
              className="mt-4"
              label="Overall"
              tone={completion.score >= 100 ? 'success' : 'brand'}
            />
            {missing.length === 0 ? (
              <div className="mt-4 flex items-start gap-2 rounded-tile bg-verified-soft p-3 text-xs leading-relaxed text-verified">
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>Your profile has all the recommended details.</p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-xs font-medium text-body">Still missing</p>
                <ul className="mt-2 space-y-1.5">
                  {missing.slice(0, 6).map((key) => (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => goToCompletionItem(key)}
                        className="group flex w-full items-center justify-between gap-2 rounded-tile px-1 py-1 text-left text-xs text-body transition-colors hover:text-track focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                      >
                        <span className="inline-flex items-center gap-2">
                          <FiAlertTriangle
                            className="h-3.5 w-3.5 shrink-0 text-pending"
                            aria-hidden="true"
                          />
                          {getCompletionLabel(key)}
                        </span>
                        <FiArrowRight
                          className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
                {missing.length > 6 ? (
                  <p className="mt-2 px-1 text-[11px] text-slate">
                    +{missing.length - 6} more
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-card border border-line bg-sand/60 p-4">
            <p className="text-xs font-semibold text-navy">Your public link</p>
            {profile.slug ? (
              <Link
                to={`/p/${profile.slug}`}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-track underline-offset-4 hover:underline"
              >
                /p/{profile.slug}
                <FiExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
            ) : (
              <p className="mt-1.5 text-xs text-body">Available after onboarding.</p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-slate">
              Share this link with coaches, teams, or organizations. Private sections stay hidden
              from visitors.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

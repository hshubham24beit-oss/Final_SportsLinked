import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiExternalLink,
  FiFlag,
  FiGlobe,
  FiHeart,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiShare2,
  FiTarget,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button, { buttonClasses } from '../components/ui/Button';
import PageLoader from '../components/PageLoader';
import ProfileNetworkActions from '../components/profile/ProfileNetworkActions';
import ProfileSafetyActions from '../components/profile/ProfileSafetyActions';
import { profileApi } from '../api/profile.api';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate, formatRelativeTime } from '../utils/format';
import {
  ATHLETE_AGE_CATEGORY_OPTIONS,
  ATHLETE_COMPETITION_LEVEL_OPTIONS,
  ATHLETE_LEVEL_OPTIONS,
  COACH_AVAILABILITY_OPTIONS,
  OPPORTUNITY_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
} from '../utils/profile';
import { getRoleLabel } from '../utils/roles';

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

function formatMonthYear(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date);
}

function Section({ title, count, children, className = '' }) {
  return (
    <section className={`rounded-card border border-line bg-white p-5 shadow-card sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">{title}</h2>
        {count !== undefined ? (
          <span className="rounded-full bg-sand px-2.5 py-1 text-[11px] font-extrabold text-slate">{count}</span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ActivityItem({ post }) {
  const preview = post.media?.[0];
  const label =
    post.type === 'share'
      ? 'Shared a post'
      : post.type === 'achievement'
        ? 'Shared an achievement'
        : post.type === 'opportunity'
          ? 'Shared an opportunity'
          : 'Posted an update';

  return (
    <article className="rounded-tile border border-line p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-navy">{label}</p>
        <span className="shrink-0 text-[11px] text-slate">
          {formatRelativeTime(post.createdAt)}
        </span>
      </div>
      {post.text ? (
        <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-body">
          {post.text}
        </p>
      ) : null}
      {post.type === 'share' && post.sharedPost?.text ? (
        <p className="mt-1.5 line-clamp-2 rounded-tile bg-sand/60 p-2.5 text-xs leading-relaxed text-body">
          {post.sharedPost.text}
        </p>
      ) : null}
      {preview ? (
        <a
          href={preview.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block aspect-video max-w-xs overflow-hidden rounded-tile border border-line bg-sand"
        >
          <img
            src={preview.url}
            alt={`Post image by ${post.author?.name || 'member'}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </a>
      ) : null}
      <div className="mt-2 flex items-center gap-4 text-[11px] font-medium text-slate">
        <span className="inline-flex items-center gap-1">
          <FiHeart className="h-3.5 w-3.5" aria-hidden="true" />
          {post.likeCount || 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <FiMessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {post.commentCount || 0}
        </span>
        <span className="capitalize">{post.visibility === 'public' ? 'Public' : 'Connections'}</span>
      </div>
    </article>
  );
}

function NotFound() {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-track/10 text-track">
        <FiAlertCircle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-3xl">Profile not found</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-body">
        This profile may have been removed, or the link may be incorrect.
      </p>
      <Link to="/" className={`${buttonClasses({ size: 'md' })} mt-6`}>
        Back to SportLinked
      </Link>
    </div>
  );
}

export default function PublicProfile() {
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const displayName = profile
    ? profile.role === 'recruiter'
      ? profile.name || profile.owner.name
      : profile.owner.name
    : 'Profile';
  useDocumentTitle(displayName);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    setNotFound(false);
    setImageFailed(false);

    profileApi
      .getPublicProfile(slug)
      .then((response) => {
        if (!cancelled) {
          setProfile(response.data.data.profile);
        }
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (requestError.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (isLoading) {
    return <PageLoader message="Loading profile…" />;
  }

  if (notFound) {
    return <NotFound />;
  }

  if (error) {
    return (
      <div className="page-shell max-w-xl py-20">
        <Alert variant="error" title="Profile could not be loaded">
          {error}
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const isOwner = profile.viewer?.isOwner;
  const isRecruiter = profile.role === 'recruiter';
  const coverUrl = profile.cover?.url;
  const avatarUrl = profile.avatar?.url;
  const location = [profile.location?.city, profile.location?.region, profile.location?.country]
    .filter(Boolean)
    .join(', ');
  const contact = profile.contact;
  const hasContact = Boolean(contact?.email || contact?.phone || contact?.website);
  const achievements = profile.achievements || [];
  const activity = profile.activity || [];
  const network = profile.network || {};
  const verifications = profile.verifications || { identity: null, qualifications: [] };
  const approvedQualifications = verifications.qualifications || [];
  const hasVerifications = Boolean(verifications.identity) || approvedQualifications.length > 0;
  const gallery = profile.mediaGallery || [];
  const statistics = profile.statistics || [];
  const personalBests = profile.personalBests || [];
  const careerHistory = profile.careerHistory || [];
  const certifications = profile.certifications || [];
  const opportunities = profile.preferredOpportunities || [];

  const shareProfile = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied', 'You can share it with anyone.');
    } catch {
      toast.error('Could not copy the link', 'Copy the address from your browser instead.');
    }
  };

  return (
    <div className="pb-16">
      <div className="relative h-52 overflow-hidden bg-navy sm:h-72">
        <div className="lane-circles-gold absolute -right-32 -top-40 h-[560px] w-[560px] rounded-full opacity-80" />
        {coverUrl && !imageFailed ? (
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
      </div>

      <main className="page-shell">
        <section className="relative -mt-14 rounded-card border border-line bg-white p-5 pt-20 shadow-card sm:p-6 sm:pt-6">
          <Avatar
            name={displayName}
            src={avatarUrl}
            size="2xl"
            className="absolute left-5 top-0 -translate-y-1/2 !border-[5px] bg-white shadow-lg sm:left-6"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 sm:pl-36">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand" size="sm">
                  {isRecruiter ? 'Organisation' : getRoleLabel(profile.role)}
                </Badge>
                {profile.level ? (
                  <Badge variant="neutral" size="sm">
                    {optionLabel(ATHLETE_LEVEL_OPTIONS, profile.level)}
                  </Badge>
                ) : null}
                {profile.competitionLevel ? (
                  <Badge variant="neutral" size="sm">
                    {optionLabel(ATHLETE_COMPETITION_LEVEL_OPTIONS, profile.competitionLevel)}
                  </Badge>
                ) : null}
                {profile.ageCategory ? (
                  <Badge variant="neutral" size="sm">
                    {optionLabel(ATHLETE_AGE_CATEGORY_OPTIONS, profile.ageCategory)}
                  </Badge>
                ) : null}
                {profile.organizationType ? (
                  <Badge variant="neutral" size="sm">
                    {optionLabel(ORGANIZATION_TYPE_OPTIONS, profile.organizationType)}
                  </Badge>
                ) : null}
                {verifications.identity ? (
                  <Badge variant="success" size="sm">
                    <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
                    Identity verified
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-2 break-words text-3xl sm:text-4xl">
                {displayName}
              </h1>
              {profile.headline ? (
                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-body">
                  {profile.headline}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <ProfileNetworkActions
                ownerId={profile.owner.id}
                ownerName={displayName}
                network={profile.network}
                onChange={(network) =>
                  setProfile((current) => ({ ...current, network }))
                }
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={shareProfile}
                leftIcon={<FiShare2 className="h-4 w-4" aria-hidden="true" />}
              >
                Share
              </Button>
              {!isOwner ? (
                <ProfileSafetyActions
                  ownerId={profile.owner.id}
                  ownerName={displayName}
                  isOwner={isOwner}
                />
              ) : null}
              {isOwner && !isRecruiter ? (
                <Link to="/profile/edit" className={buttonClasses({ size: 'sm' })}>
                  Edit profile
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
            {location ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-body">
                <FiMapPin className="h-4 w-4" aria-hidden="true" />
                {location}
              </span>
            ) : null}
            {profile.experienceYears !== null && profile.experienceYears !== undefined ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-body">
                <FiBriefcase className="h-4 w-4" aria-hidden="true" />
                {profile.experienceYears} years experience
              </span>
            ) : null}
            {profile.availableForTrials ? (
              <Badge variant="success" size="sm">
                Available for trials
              </Badge>
            ) : null}
            {profile.availability ? (
              <Badge variant="info" size="sm">
                {optionLabel(COACH_AVAILABILITY_OPTIONS, profile.availability)}
              </Badge>
            ) : null}
            {profile.foundedYear ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-body">
                <FiCalendar className="h-4 w-4" aria-hidden="true" />
                Founded {profile.foundedYear}
              </span>
            ) : null}
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            {profile.bio ? (
              <Section title="About">
                <p className="whitespace-pre-line text-sm leading-7 text-body">{profile.bio}</p>
              </Section>
            ) : null}

            {profile.sports && profile.sports.length > 0 ? (
              <Section title={isRecruiter ? 'Sports and focus' : 'Sport details'}>
                <div className="flex flex-wrap gap-2">
                  {profile.sports.map((sport) => (
                    <Badge key={sport} variant="brand">
                      {sport}
                    </Badge>
                  ))}
                </div>
                {profile.positions && profile.positions.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">
                      Positions and events
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.positions.map((position) => (
                        <Badge key={position} variant="neutral" size="sm">
                          {position}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {profile.skills && profile.skills.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">
                      Skills and qualifications
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <Badge key={skill} variant="neutral" size="sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {profile.specializations && profile.specializations.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">
                      Specialisations
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.specializations.map((specialization) => (
                        <Badge key={specialization} variant="neutral" size="sm">
                          {specialization}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {profile.activities && profile.activities.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">
                      Programmes and activities
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.activities.map((activity) => (
                        <Badge key={activity} variant="neutral" size="sm">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Section>
            ) : null}

            {activity.length > 0 ? (
              <Section title="Recent activity" count={`${activity.length}`}>
                <div className="space-y-3">
                  {activity.map((post) => (
                    <ActivityItem key={post.id} post={post} />
                  ))}
                </div>
              </Section>
            ) : null}

            {statistics.length > 0 ? (
              <Section title="Statistics" count={`${statistics.length}`}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {statistics.map((statistic) => (
                    <div key={statistic.id} className="rounded-tile border border-line bg-sand/70 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">
                        {statistic.metric}
                      </p>
                      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-navy">
                        {statistic.value}
                        {statistic.unit ? (
                          <span className="ml-1 text-sm font-medium text-body">
                            {statistic.unit}
                          </span>
                        ) : null}
                      </p>
                      {statistic.date ? (
                        <p className="mt-1 text-xs text-slate">{formatDate(statistic.date)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {hasVerifications ? (
              <Section title="Verifications">
                <div className="space-y-2.5">
                  {verifications.identity ? (
                    <div className="flex items-center justify-between gap-3 rounded-tile border border-line p-3">
                      <div>
                        <p className="text-sm font-semibold text-navy">Identity</p>
                        <p className="text-xs text-slate">
                          Verified {formatDate(verifications.identity.verifiedAt)}
                        </p>
                      </div>
                      <Badge variant="success" size="sm">
                        <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
                        Verified
                      </Badge>
                    </div>
                  ) : null}
                  {approvedQualifications.map((qualification) => (
                    <div
                      key={qualification.requestId}
                      className="flex items-center justify-between gap-3 rounded-tile border border-line p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy">
                          {qualification.name}
                        </p>
                        <p className="text-xs text-slate">
                          {[qualification.issuer, qualification.year].filter(Boolean).join(' - ')}
                        </p>
                      </div>
                      <Badge variant="success" size="sm">
                        <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
                        Verified
                      </Badge>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {achievements.length > 0 ? (
              <Section title="Achievements" count={`${achievements.length}`}>
                <div className="space-y-3">
                  {achievements.map((achievement) => (
                    <article key={achievement.id} className="rounded-tile border border-line p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-navy">{achievement.title}</h3>
                        {achievement.verified ? (
                          <Badge variant="success" size="sm">
                            <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
                            Verified
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-body">
                        {[achievement.sport, achievement.competition, achievement.result]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {achievement.date ? (
                        <p className="mt-1 text-xs text-slate">{formatDate(achievement.date)}</p>
                      ) : null}
                      {achievement.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-body">
                          {achievement.description}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </Section>
            ) : null}

            {personalBests.length > 0 ? (
              <Section title="Personal bests" count={`${personalBests.length}`}>
                <div className="divide-y divide-line">
                  {personalBests.map((entry) => (
                    <div key={entry.id} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-navy">{entry.event || 'Event'}</p>
                        <p className="text-xs text-slate">
                          {[entry.competition, entry.date ? formatDate(entry.date) : '']
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-track">
                        {entry.result}
                        {entry.unit ? ` ${entry.unit}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {careerHistory.length > 0 ? (
              <Section title="Career history">
                <ol className="relative space-y-4 border-l-2 border-gold/50 pl-5">
                  {careerHistory.map((entry) => {
                    const start = formatMonthYear(entry.startDate);
                    const end = entry.current ? 'Present' : formatMonthYear(entry.endDate);
                    return (
                      <li key={entry.id} className="relative">
                        <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-track ring-1 ring-gold/50" />
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="text-sm font-semibold text-navy">
                            {entry.role || 'Role'}
                            {entry.organization ? (
                              <span className="font-normal text-body"> · {entry.organization}</span>
                            ) : null}
                          </p>
                          {start || end ? (
                            <p className="text-xs text-slate">
                              {[start, end].filter(Boolean).join(' – ')}
                            </p>
                          ) : null}
                        </div>
                        {entry.description ? (
                          <p className="mt-1 text-sm leading-relaxed text-body">
                            {entry.description}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </Section>
            ) : null}

            {certifications.length > 0 ? (
              <Section title="Certifications" count={`${certifications.length}`}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {certifications.map((certification) => (
                    <div key={certification.id} className="rounded-tile border border-line p-3.5">
                      <p className="text-sm font-medium text-navy">{certification.name || 'Certification'}</p>
                      <p className="mt-0.5 text-xs text-body">
                        {[certification.issuer, certification.year].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {gallery.length > 0 ? (
              <Section title="Gallery" count={`${gallery.length}`}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gallery.map((image) => (
                    <a
                      key={image.id}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-tile border border-line bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                    >
                      <img
                        src={image.url}
                        alt={image.caption || 'Profile gallery image'}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      {image.caption ? (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-navy/60 px-2.5 py-1.5 text-[11px] text-white">
                          {image.caption}
                        </span>
                      ) : null}
                    </a>
                  ))}
                </div>
              </Section>
            ) : null}

            {!profile.bio &&
            !statistics.length &&
            !achievements.length &&
            !personalBests.length &&
            !careerHistory.length &&
            !certifications.length &&
            !gallery.length ? (
              <Section title="About">
                <p className="text-sm leading-relaxed text-body">
                  This profile is still being built. Check back for more details.
                </p>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-lg">At a glance</h2>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-tile border border-line bg-sand/70 p-2.5 text-center">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-navy">
                    {network.connectionCount || 0}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate">
                    Connections
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-navy">
                    {network.followerCount || 0}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate">
                    Followers
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-navy">
                    {network.followingCount || 0}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate">
                    Following
                  </p>
                </div>
              </div>
              {network.mutualConnectionsCount > 0 ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-body">
                  <FiUserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {network.mutualConnectionsCount} mutual connection
                  {network.mutualConnectionsCount === 1 ? '' : 's'}
                </p>
              ) : null}
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <FiUsers className="mt-0.5 h-4 w-4 shrink-0 text-slate" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-slate">Profile type</dt>
                    <dd className="font-medium text-navy">
                      {isRecruiter ? 'Organisation' : getRoleLabel(profile.role)}
                    </dd>
                  </div>
                </div>
                {profile.level ? (
                  <div className="flex items-start gap-2.5">
                    <FiAward className="mt-0.5 h-4 w-4 shrink-0 text-slate" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-slate">Level</dt>
                      <dd className="font-medium text-navy">
                        {optionLabel(ATHLETE_LEVEL_OPTIONS, profile.level)}
                      </dd>
                    </div>
                  </div>
                ) : null}
                {profile.competitionLevel ? (
                  <div className="flex items-start gap-2.5">
                    <FiAward className="mt-0.5 h-4 w-4 shrink-0 text-slate" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-slate">Competition level</dt>
                      <dd className="font-medium text-navy">
                        {optionLabel(
                          ATHLETE_COMPETITION_LEVEL_OPTIONS,
                          profile.competitionLevel,
                        )}
                      </dd>
                    </div>
                  </div>
                ) : null}
                {profile.ageCategory ? (
                  <div className="flex items-start gap-2.5">
                    <FiUsers className="mt-0.5 h-4 w-4 shrink-0 text-slate" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-slate">Age group</dt>
                      <dd className="font-medium text-navy">
                        {optionLabel(ATHLETE_AGE_CATEGORY_OPTIONS, profile.ageCategory)}
                      </dd>
                    </div>
                  </div>
                ) : null}
                {profile.currentTeam ? (
                  <div className="flex items-start gap-2.5">
                    <FiFlag className="mt-0.5 h-4 w-4 shrink-0 text-slate" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-slate">Current team</dt>
                      <dd className="font-medium text-navy">{profile.currentTeam}</dd>
                    </div>
                  </div>
                ) : null}
                {profile.currentOrganization ? (
                  <div className="flex items-start gap-2.5">
                    <FiBriefcase
                      className="mt-0.5 h-4 w-4 shrink-0 text-slate"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs text-slate">Current organisation</dt>
                      <dd className="font-medium text-navy">{profile.currentOrganization}</dd>
                    </div>
                  </div>
                ) : null}
                {location ? (
                  <div className="flex items-start gap-2.5">
                    <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-slate">Location</dt>
                      <dd className="font-medium text-navy">{location}</dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            </div>

            {opportunities.length > 0 ? (
              <div className="rounded-card border border-line bg-white p-5 shadow-card">
                <h2 className="font-display text-lg">Open to</h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {opportunities.map((opportunity) => (
                    <Badge key={opportunity} variant="neutral" size="sm">
                      {optionLabel(OPPORTUNITY_OPTIONS, opportunity)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {hasContact ? (
              <div className="rounded-card border border-line bg-white p-5 shadow-card">
                <h2 className="font-display text-lg">Contact</h2>
                <div className="mt-3 space-y-2.5 text-sm">
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-2 text-body transition-colors hover:text-track"
                    >
                      <FiMail className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  ) : null}
                  {contact.phone ? (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-2 text-body transition-colors hover:text-track"
                    >
                      <FiPhone className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{contact.phone}</span>
                    </a>
                  ) : null}
                  {contact.website ? (
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-body transition-colors hover:text-track"
                    >
                      <FiGlobe className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">Website</span>
                      <FiExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : null}
                  {contact.allowMessages ? (
                    <p className="flex items-center gap-2 text-xs text-slate">
                      <FiMessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Open to member messages
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="rounded-card border border-line bg-track/10 p-5">
              <FiTarget className="h-5 w-5 text-track" aria-hidden="true" />
              <h2 className="mt-2 font-display text-lg">
                {isOwner
                  ? 'This is your public profile'
                  : user
                    ? 'Continue your SportLinked workspace'
                    : isRecruiter
                      ? 'Looking for athletes or coaches?'
                      : 'Build your own profile'}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-track">
                {isOwner
                  ? 'You are viewing the profile visitors see. Private sections remain hidden.'
                  : user
                    ? 'Head back to your dashboard to keep up with your network, messages, and opportunities.'
                    : isRecruiter
                      ? 'Create an organisation profile to share programmes and opportunities.'
                      : 'Join SportLinked to create a profile, showcase achievements, and connect with the sporting community.'}
              </p>
              {isOwner ? (
                <Link to="/profile/edit" className={`${buttonClasses({ size: 'sm' })} mt-3`}>
                  Edit profile
                </Link>
              ) : !user ? (
                <Link to="/register" className={`${buttonClasses({ size: 'sm' })} mt-3`}>
                  Create an account
                </Link>
              ) : (
                <Link to="/dashboard" className={`${buttonClasses({ size: 'sm' })} mt-3`}>
                  Go to dashboard
                </Link>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

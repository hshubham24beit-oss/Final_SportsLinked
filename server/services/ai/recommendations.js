const AthleteProfile = require('../../models/AthleteProfile');
const CoachProfile = require('../../models/CoachProfile');
const Organization = require('../../models/Organization');
const Team = require('../../models/Team');
const TeamMembership = require('../../models/TeamMembership');
const Connection = require('../../models/Connection');
const BlockedUser = require('../../models/BlockedUser');
const profileService = require('../profile.service');
const {
  COACH_AVAILABILITY_LABELS,
  ORGANIZATION_TYPE_LABELS,
  USER_STATUS,
} = require('../../config/constants');

function list(values = []) {
  return values.map((value) => String(value || '').trim()).filter(Boolean);
}

function unique(values = []) {
  const seen = new Set();
  return list(values).filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

function hasText(value, expected) {
  const left = lower(value);
  const right = lower(expected);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function locationObject(location = {}) {
  return {
    city: location.city || '',
    region: location.region || '',
    country: location.country || '',
  };
}

function locationReasons(criteriaLocation, targetLocation = {}) {
  const reasons = [];
  let score = 0;
  if (criteriaLocation.city && hasText(criteriaLocation.city, targetLocation.city)) {
    score += 15;
    reasons.push(`Located in ${targetLocation.city}`);
  } else if (
    criteriaLocation.region &&
    hasText(criteriaLocation.region, targetLocation.region)
  ) {
    score += 8;
    reasons.push(`Located in ${targetLocation.region}`);
  } else if (
    criteriaLocation.country &&
    hasText(criteriaLocation.country, targetLocation.country)
  ) {
    score += 4;
    reasons.push(`Located in ${targetLocation.country}`);
  }
  return { score, reasons };
}

function sportReasons(criteriaSports, targetSports = [], weight = 35) {
  const matches = unique(criteriaSports).filter((sport) =>
    targetSports.some((target) => hasText(sport, target)),
  );
  if (matches.length === 0) {
    return { score: 0, reasons: [] };
  }
  return {
    score: weight,
    reasons: [`Shares ${matches.join(', ')}`],
  };
}

async function getBlockedIds(userId) {
  const records = await BlockedUser.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  })
    .select('blocker blocked')
    .lean();
  return records.map((record) =>
    String(record.blocker) === String(userId) ? record.blocked : record.blocker,
  );
}

async function connectionStatusMap(viewerId, targetIds) {
  if (targetIds.length === 0) {
    return new Map();
  }
  const records = await Connection.find({
    $or: [
      { requester: viewerId, recipient: { $in: targetIds } },
      { recipient: viewerId, requester: { $in: targetIds } },
    ],
  })
    .select('requester recipient status')
    .lean();

  return new Map(
    records.map((record) => {
      const otherId =
        String(record.requester) === String(viewerId)
          ? String(record.recipient)
          : String(record.requester);
      return [otherId, record];
    }),
  );
}

function connectionStatus(record, viewerId) {
  if (!record) {
    return 'not_connected';
  }
  if (record.status === 'accepted') {
    return 'connected';
  }
  if (record.status === 'pending') {
    return String(record.requester) === String(viewerId) ? 'pending' : 'incoming';
  }
  return 'not_connected';
}

function sportFilter(sports) {
  const first = sports[0];
  if (!first) {
    return {};
  }
  return { sports: new RegExp(first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
}

function teamSportFilter(sports) {
  const first = sports[0];
  if (!first) {
    return {};
  }
  return { sport: new RegExp(first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
}

function coachRecommendation(profile, viewer, criteria, blockedIds, statuses) {
  const target = profile.user;
  if (
    !target ||
    String(target._id) === String(viewer._id) ||
    blockedIds.has(String(target._id)) ||
    target.role !== 'coach' ||
    !target.onboardingCompleted ||
    ![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(target.status)
  ) {
    return null;
  }

  const sports = list(profile.sports);
  const sport = sportReasons(list(criteria.sports), sports, 35);
  const location = locationReasons(criteria.location, profile.location);
  const availability =
    profile.availability === 'open_to_roles' || profile.availability === 'open_to_consulting';
  const score = sport.score + location.score + (availability ? 10 : 0);
  const reasons = [...sport.reasons, ...location.reasons];
  if (availability) {
    reasons.push(COACH_AVAILABILITY_LABELS[profile.availability]);
  }
  if (reasons.length === 0) {
    reasons.push('Active coach in the SportLinked network');
  }

  return {
    id: String(target._id),
    role: 'coach',
    name: target.name,
    slug: profile.slug,
    headline: profile.headline || '',
    sports,
    location: locationObject(profile.location),
    avatarUrl: profile.avatar?.url || null,
    matchScore: Math.min(100, score),
    reasons,
    connectionStatus: connectionStatus(statuses.get(String(target._id)), viewer._id),
  };
}

function academyRecommendation(profile, viewer, criteria, blockedIds, statuses) {
  const target = profile.user;
  if (
    !target ||
    String(target._id) === String(viewer._id) ||
    blockedIds.has(String(target._id)) ||
    target.role !== 'recruiter' ||
    !target.onboardingCompleted ||
    ![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(target.status)
  ) {
    return null;
  }

  const sports = list(profile.sports);
  const sport = sportReasons(list(criteria.sports), sports, 35);
  const location = locationReasons(criteria.location, profile.location);
  const typeLabel = ORGANIZATION_TYPE_LABELS[profile.organizationType] || 'Organisation';
  const score = sport.score + location.score + 5;
  const reasons = [...sport.reasons, ...location.reasons, `${typeLabel} profile`];

  return {
    id: String(target._id),
    role: 'recruiter',
    name: profile.name || target.name,
    slug: profile.slug,
    organizationType: profile.organizationType,
    organizationTypeLabel: typeLabel,
    sports,
    location: locationObject(profile.location),
    avatarUrl: profile.avatar?.url || null,
    matchScore: Math.min(100, score),
    reasons,
    connectionStatus: connectionStatus(statuses.get(String(target._id)), viewer._id),
  };
}

function athleteRecommendation(profile, viewer, criteria, blockedIds, statuses) {
  const target = profile.user;
  if (
    !target ||
    String(target._id) === String(viewer._id) ||
    blockedIds.has(String(target._id)) ||
    target.role !== 'athlete' ||
    !target.onboardingCompleted ||
    ![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(target.status)
  ) {
    return null;
  }

  const sport = sportReasons(list(criteria.sports), list(profile.sports), 35);
  const positionMatches = unique(criteria.positions).filter((position) =>
    list(profile.positions).some((targetPosition) => hasText(position, targetPosition)),
  );
  const location = locationReasons(criteria.location, profile.location);
  let score = sport.score + location.score + (positionMatches.length > 0 ? 15 : 0);
  const reasons = [...sport.reasons, ...location.reasons];
  if (positionMatches.length > 0) {
    reasons.push(`Shares position ${positionMatches.join(', ')}`);
  }
  if (reasons.length === 0) {
    reasons.push('Active athlete in the SportLinked network');
  }
  if (profile.availableForTrials) {
    score += 5;
    reasons.push('Available for trials');
  }

  return {
    id: String(target._id),
    role: 'athlete',
    name: target.name,
    slug: profile.slug,
    headline: profile.headline || '',
    sports: list(profile.sports),
    positions: list(profile.positions),
    location: locationObject(profile.location),
    avatarUrl: profile.avatar?.url || null,
    matchScore: Math.min(100, score),
    reasons,
    connectionStatus: connectionStatus(statuses.get(String(target._id)), viewer._id),
  };
}

async function teamRecommendations(viewer, criteria, blockedIds) {
  const teams = await Team.find({
    privacy: 'public',
    owner: { $ne: viewer._id, ...(blockedIds.size ? { $nin: [...blockedIds] } : {}) },
    ...teamSportFilter(criteria.sports),
  })
    .sort({ memberCount: -1, updatedAt: -1, _id: -1 })
    .limit(16)
    .lean();

  if (teams.length === 0) {
    return [];
  }

  const memberships = await TeamMembership.find({
    user: viewer._id,
    team: { $in: teams.map((team) => team._id) },
    status: { $in: ['active', 'invited'] },
  })
    .select('team status role')
    .lean();
  const membershipByTeam = new Map(
    memberships.map((membership) => [String(membership.team), membership]),
  );

  return teams
    .map((team) => {
      const membership = membershipByTeam.get(String(team._id));
      if (membership?.status === 'active') {
        return null;
      }

      const sport = sportReasons(list(criteria.sports), [team.sport], 40);
      const location = locationReasons(criteria.location, team.location);
      const reasons = [...sport.reasons, ...location.reasons];
      if (membership?.status === 'invited') {
        reasons.push('You have a pending invitation');
      }
      if (reasons.length === 0) {
        reasons.push('Public team in the SportLinked network');
      }

      return {
        id: String(team._id),
        name: team.name,
        sport: team.sport,
        type: team.type,
        privacy: team.privacy,
        location: locationObject(team.location),
        ownerName: team.ownerName,
        memberCount: team.memberCount,
        matchScore: Math.min(100, sport.score + location.score + 5),
        reasons,
        membershipStatus: membership?.status || null,
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

async function recommendProfiles(user) {
  const profile = (await profileService.getOwnProfile(user)) || {};
  const criteriaSports = unique(profile.sports);
  const criteriaPositions = unique(profile.positions);
  const criteriaLocation = locationObject(profile.location);
  const context = {
    sports: criteriaSports,
    positions: criteriaPositions,
    location: criteriaLocation,
  };

  const blockedIds = new Set((await getBlockedIds(user._id)).map(String));
  const [coachProfiles, academyProfiles, athleteProfiles, teams] = await Promise.all([
    CoachProfile.find({
      ...sportFilter(criteriaSports),
      'visibility.sports': { $ne: 'private' },
    })
      .populate({ path: 'user', select: 'name role status onboardingCompleted' })
      .limit(20)
      .lean(),
    Organization.find({
      ...sportFilter(criteriaSports),
      'visibility.sports': { $ne: 'private' },
    })
      .populate({ path: 'user', select: 'name role status onboardingCompleted' })
      .limit(20)
      .lean(),
    AthleteProfile.find({
      ...sportFilter(criteriaSports),
      'visibility.sports': { $ne: 'private' },
    })
      .populate({ path: 'user', select: 'name role status onboardingCompleted' })
      .limit(24)
      .lean(),
    teamRecommendations(user, context, blockedIds),
  ]);

  const targetIds = unique([
    ...coachProfiles.map((entry) => entry.user?._id),
    ...academyProfiles.map((entry) => entry.user?._id),
    ...athleteProfiles.map((entry) => entry.user?._id),
  ]).filter((id) => id && String(id) !== String(user._id));
  const statuses = await connectionStatusMap(user._id, targetIds);

  const coaches = coachProfiles
    .map((entry) => coachRecommendation(entry, user, context, blockedIds, statuses))
    .filter(Boolean)
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, 4);
  const academies = academyProfiles
    .map((entry) => academyRecommendation(entry, user, context, blockedIds, statuses))
    .filter(Boolean)
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, 4);
  const athletes = athleteProfiles
    .map((entry) => athleteRecommendation(entry, user, context, blockedIds, statuses))
    .filter(Boolean)
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, 5);

  const displayedCriteria = [
    {
      key: 'sports',
      label: 'Sports',
      value: criteriaSports.join(', ') || 'Not specified',
      source: criteriaSports.length ? 'Your profile' : 'Not set',
    },
    {
      key: 'positions',
      label: 'Positions',
      value: criteriaPositions.join(', ') || 'Not specified',
      source: criteriaPositions.length ? 'Your profile' : 'Not set',
    },
    {
      key: 'location',
      label: 'Location',
      value: [criteriaLocation.city, criteriaLocation.country].filter(Boolean).join(', ') || 'Not specified',
      source: criteriaLocation.city || criteriaLocation.country ? 'Your profile' : 'Not set',
    },
  ];

  return {
    criteria: displayedCriteria,
    groups: [
      {
        key: 'coaches',
        title: 'Coaches',
        description: 'Coaches whose sport or location aligns with your profile.',
        recommendations: coaches,
      },
      {
        key: 'teams',
        title: 'Teams',
        description: 'Public teams related to your sport or location.',
        recommendations: teams,
      },
      {
        key: 'academies',
        title: 'Academies and organisations',
        description: 'Recruiter profiles for clubs, academies, schools, and similar organisations.',
        recommendations: academies,
      },
      {
        key: 'athletes',
        title: 'Athletes to connect with',
        description: 'Athletes with overlapping sport, position, or location details.',
        recommendations: athletes,
      },
    ].filter((group) => group.recommendations.length > 0),
    generatedBy: 'rule-based',
    notice:
      'Recommendations are suggestions based only on the criteria shown. They are not endorsements, rankings, or verification.',
  };
}

module.exports = {
  recommendProfiles,
};

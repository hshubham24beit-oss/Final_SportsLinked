const Opportunity = require('../../models/Opportunity');
const Achievement = require('../../models/Achievement');
const BlockedUser = require('../../models/BlockedUser');
const profileService = require('../profile.service');
const { activeFilter, serializeOpportunity } = require('../opportunity.service');
const {
  OPPORTUNITY_CATEGORY_LABELS,
} = require('../../config/constants');

const PREFERENCE_CATEGORY = {
  trials: ['trials'],
  scholarships: ['scholarships'],
  contracts: ['team_recruitment'],
  part_time: ['coaching_positions', 'internships'],
  full_time: ['coaching_positions'],
  representation: ['team_recruitment'],
  other: [],
};

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

function pick(input, profile, key, label, formatter = (value) => value) {
  const supplied = input[key];
  const hasInput =
    supplied !== undefined &&
    supplied !== null &&
    supplyHasValue(supplied);
  const value = hasInput ? supplied : profile[key];

  return {
    key,
    label,
    value: formatter(value),
    source: hasInput ? 'Your criteria' : 'Your profile',
    raw: value,
  };
}

function supplyHasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return String(value || '').trim() !== '';
}

function locationValue(location = {}) {
  return [location.city, location.region, location.country].filter(Boolean).join(', ');
}

function splitLocation(value) {
  const parts = String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    city: parts[0] || '',
    region: parts[1] || '',
    country: parts[2] || '',
  };
}

function preferenceLabels(values = []) {
  return unique(values)
    .map((value) => OPPORTUNITY_CATEGORY_LABELS[value] || value)
    .join(', ');
}

async function blockedUserIds(userId) {
  const records = await BlockedUser.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  })
    .select('blocker blocked')
    .lean();

  return records.map((record) =>
    String(record.blocker) === String(userId) ? record.blocked : record.blocker,
  );
}

async function defaultCriteria(user, input) {
  const profileDoc = await profileService.getOwnProfile(user);
  const profile = profileDoc || {};
  const preferredCategories = unique(
    (profile.preferredOpportunities || []).flatMap(
      (value) => PREFERENCE_CATEGORY[value] || [],
    ),
  );
  const criteria = [];
  const values = {};

  const definitions = [
    pick(input, { sport: list(profile.sports)[0] || '' }, 'sport', 'Sport'),
    pick(
      input,
      { positions: list(profile.positions) },
      'positions',
      'Positions',
      (value) => list(value).join(', '),
    ),
    pick(
      input,
      {
        location: locationValue(profile.location),
      },
      'location',
      'Location',
    ),
    pick(
      input,
      { experienceYears: profile.experienceYears },
      'experienceYears',
      'Experience',
      (value) => (value === undefined || value === null ? '' : `${value} years`),
    ),
    pick(input, { level: profile.level }, 'level', 'Level'),
    pick(input, { competitionLevel: profile.competitionLevel }, 'competitionLevel', 'Competition level'),
    pick(input, { ageCategory: profile.ageCategory }, 'ageCategory', 'Age category'),
    pick(
      input,
      { preferredTypes: preferredCategories },
      'preferredTypes',
      'Preferred opportunity types',
      preferenceLabels,
    ),
  ];

  for (const entry of definitions) {
    values[entry.key] = entry.raw;
    criteria.push({
      key: entry.key,
      label: entry.label,
      value:
        entry.value === undefined || entry.value === null || entry.value === ''
          ? 'Not specified'
          : entry.value,
      source: entry.value === 'Not specified' ? 'Not set' : entry.source,
    });
  }

  return {
    criteria,
    values: {
      sport: String(values.sport || '').trim(),
      positions: list(values.positions),
      location: splitLocation(values.location),
      experienceYears:
        values.experienceYears === undefined || values.experienceYears === null
          ? null
          : Number(values.experienceYears),
      level: values.level || '',
      competitionLevel: values.competitionLevel || '',
      ageCategory: values.ageCategory || '',
      preferredTypes: list(values.preferredTypes),
    },
    profile,
  };
}

function overlaps(left = [], right = []) {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => rightSet.has(String(value).toLowerCase()));
}

function sameText(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

function locationScore(criteriaLocation, opportunityLocation = {}) {
  let score = 0;
  const reasons = [];
  if (criteriaLocation.city && sameText(criteriaLocation.city, opportunityLocation.city)) {
    score += 15;
    reasons.push(`Located in ${opportunityLocation.city}`);
  } else if (
    criteriaLocation.region &&
    sameText(criteriaLocation.region, opportunityLocation.region)
  ) {
    score += 9;
    reasons.push(`Located in ${opportunityLocation.region}`);
  } else if (
    criteriaLocation.country &&
    sameText(criteriaLocation.country, opportunityLocation.country)
  ) {
    score += 5;
    reasons.push(`Located in ${opportunityLocation.country}`);
  }
  return { score, reasons };
}

function eligibilityResult(criteria, opportunity, hasVerifiedAchievement) {
  const eligibility = opportunity.eligibility || {};

  if (
    criteria.experienceYears !== null &&
    eligibility.minExperienceYears !== undefined &&
    criteria.experienceYears < eligibility.minExperienceYears
  ) {
    return 'Minimum experience requirement is not met.';
  }
  if (
    criteria.experienceYears !== null &&
    eligibility.maxExperienceYears !== undefined &&
    criteria.experienceYears > eligibility.maxExperienceYears
  ) {
    return 'Maximum experience requirement is exceeded.';
  }
  if (
    criteria.level &&
    eligibility.levels?.length > 0 &&
    !eligibility.levels.includes(criteria.level)
  ) {
    return 'Level is outside the listed eligibility.';
  }
  if (
    criteria.competitionLevel &&
    eligibility.competitionLevels?.length > 0 &&
    !eligibility.competitionLevels.includes(criteria.competitionLevel)
  ) {
    return 'Competition level is outside the listed eligibility.';
  }
  if (
    criteria.ageCategory &&
    eligibility.ageCategories?.length > 0 &&
    !eligibility.ageCategories.includes(criteria.ageCategory)
  ) {
    return 'Age category is outside the listed eligibility.';
  }
  if (eligibility.requiresVerifiedAchievement && !hasVerifiedAchievement) {
    return 'This opportunity requires a verified achievement.';
  }
  return null;
}

function scoreOpportunity(criteria, opportunity, hasVerifiedAchievement) {
  const reasons = [];
  let score = 0;

  if (criteria.sport) {
    if (sameText(criteria.sport, opportunity.sport)) {
      score += 40;
      reasons.push(`Sport matches ${opportunity.sport}`);
    } else if (
      String(opportunity.sport || '').toLowerCase().includes(criteria.sport.toLowerCase()) ||
      criteria.sport.toLowerCase().includes(String(opportunity.sport || '').toLowerCase())
    ) {
      score += 22;
      reasons.push(`Sport is related to ${criteria.sport}`);
    } else {
      return null;
    }
  }

  if (criteria.positions.length > 0) {
    const matchedPositions = overlaps(criteria.positions, opportunity.positions || []);
    if (matchedPositions.length > 0) {
      score += 20;
      reasons.push(`Position matches ${matchedPositions.join(', ')}`);
    }
  }

  const location = locationScore(criteria.location, opportunity.location);
  score += location.score;
  reasons.push(...location.reasons);

  if (criteria.preferredTypes.length > 0 && criteria.preferredTypes.includes(opportunity.type)) {
    score += 10;
    reasons.push(`Matches your preferred type: ${OPPORTUNITY_CATEGORY_LABELS[opportunity.type] || opportunity.type}`);
  }

  const eligibilityIssue = eligibilityResult(criteria, opportunity, hasVerifiedAchievement);
  if (eligibilityIssue) {
    return null;
  }
  if (
    criteria.experienceYears !== null &&
    (opportunity.eligibility?.minExperienceYears !== undefined ||
      opportunity.eligibility?.maxExperienceYears !== undefined)
  ) {
    score += 10;
    reasons.push('Experience is within the listed eligibility range');
  }

  const daysLeft = Math.ceil(
    (new Date(opportunity.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
  if (daysLeft <= 14) {
    score += 5;
    reasons.push('Deadline is within the next two weeks');
  }

  if (reasons.length === 0) {
    reasons.push('Published opportunity available to your account');
  }

  return {
    score: Math.min(100, score),
    reasons: [...new Set(reasons)],
  };
}

async function recommendOpportunities(user, input = {}) {
  const { criteria, values, profile } = await defaultCriteria(user, input);
  const [blockedIds, hasVerifiedAchievement] = await Promise.all([
    blockedUserIds(user._id),
    Achievement.exists({ user: user._id, verificationStatus: 'verified' }),
  ]);

  const filter = {
    ...activeFilter(),
    publisher: { $ne: user._id },
    ...(blockedIds.length > 0 ? { publisher: { $ne: user._id, $nin: blockedIds } } : {}),
  };

  if (values.sport) {
    const escaped = values.sport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.sport = new RegExp(escaped, 'i');
  }

  const candidates = await Opportunity.find(filter)
    .sort({ deadline: 1, publishedAt: -1, _id: -1 })
    .limit(100)
    .lean();

  const matches = candidates
    .map((opportunity) => {
      const scoring = scoreOpportunity(values, opportunity, Boolean(hasVerifiedAchievement));
      if (!scoring) {
        return null;
      }
      return {
        ...serializeOpportunity(opportunity),
        matchScore: Math.round(scoring.score),
        reasons: scoring.reasons,
        isOwner: false,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }
      return new Date(left.deadline) - new Date(right.deadline);
    })
    .slice(0, 8);

  return {
    criteria,
    matches,
    profileUsed: {
      sports: list(profile.sports),
      hasVerifiedAchievement: Boolean(hasVerifiedAchievement),
    },
    generatedBy: 'rule-based',
    notice:
      'Matches are ranked from published opportunities using the criteria shown above. This is a suggestion, not an eligibility decision or verification.',
  };
}

module.exports = {
  recommendOpportunities,
  defaultCriteria,
  scoreOpportunity,
};

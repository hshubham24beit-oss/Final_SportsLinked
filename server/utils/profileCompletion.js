const { ROLES } = require('../config/constants');

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasArray = (value) => Array.isArray(value) && value.length > 0;
const hasNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isBoolean = (value) => typeof value === 'boolean';
const hasCoordinates = (location) => {
  const coordinates = location?.coordinates?.coordinates;
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1])
  );
};

const checksByRole = {
  [ROLES.ATHLETE]: [
    ['bio', 12, (profile) => hasText(profile.bio)],
    ['avatar', 8, (profile) => Boolean(profile.avatar?.url)],
    ['headline', 8, (profile) => hasText(profile.headline)],
    ['location', 8, (profile) => hasText(profile.location?.city)],
    ['coordinates', 6, (profile) => hasCoordinates(profile.location)],
    ['sports', 12, (profile) => hasArray(profile.sports)],
    ['level', 6, (profile) => hasText(profile.level)],
    ['experience', 6, (profile) => hasNumber(profile.experienceYears)],
    ['currentTeam', 6, (profile) => hasText(profile.currentTeam)],
    ['career', 10, (profile) => hasArray(profile.careerHistory)],
    ['personalBests', 8, (profile) => hasArray(profile.personalBests)],
    ['opportunities', 5, (profile) => hasArray(profile.preferredOpportunities)],
    ['trials', 5, (profile) => isBoolean(profile.availableForTrials)],
  ],
  [ROLES.COACH]: [
    ['bio', 12, (profile) => hasText(profile.bio)],
    ['avatar', 8, (profile) => Boolean(profile.avatar?.url)],
    ['headline', 8, (profile) => hasText(profile.headline)],
    ['location', 8, (profile) => hasText(profile.location?.city)],
    ['coordinates', 6, (profile) => hasCoordinates(profile.location)],
    ['sports', 12, (profile) => hasArray(profile.sports)],
    ['specializations', 12, (profile) => hasArray(profile.specializations)],
    ['experience', 6, (profile) => hasNumber(profile.experienceYears)],
    ['currentOrganization', 6, (profile) => hasText(profile.currentOrganization)],
    ['certifications', 8, (profile) => hasArray(profile.certifications)],
    ['career', 8, (profile) => hasArray(profile.careerHistory)],
    ['availability', 6, (profile) => hasText(profile.availability)],
  ],
  [ROLES.RECRUITER]: [
    ['bio', 12, (profile) => hasText(profile.bio)],
    ['avatar', 8, (profile) => Boolean(profile.avatar?.url)],
    ['cover', 8, (profile) => Boolean(profile.cover?.url)],
    ['location', 8, (profile) => hasText(profile.location?.city)],
    ['coordinates', 6, (profile) => hasCoordinates(profile.location)],
    ['organizationType', 10, (profile) => hasText(profile.organizationType)],
    ['sports', 12, (profile) => hasArray(profile.sports)],
    ['activities', 8, (profile) => hasArray(profile.activities)],
    ['foundedYear', 6, (profile) => hasNumber(profile.foundedYear)],
    ['contactEmail', 8, (profile) => hasText(profile.contact?.email)],
    ['website', 6, (profile) => hasText(profile.contact?.website)],
    ['media', 8, (profile) => hasArray(profile.mediaGallery)],
  ],
};

function getCompletionBreakdown(role, profile) {
  const checks = checksByRole[role];
  if (!checks || !profile) {
    return { score: 0, completed: 0, total: 0, missing: [] };
  }

  let completed = 0;
  let total = 0;
  const missing = [];

  for (const [key, weight, check] of checks) {
    total += weight;
    if (check(profile)) {
      completed += weight;
    } else {
      missing.push(key);
    }
  }

  return {
    score: total > 0 ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
    missing,
  };
}

function calculateProfileCompletion(role, profile) {
  return getCompletionBreakdown(role, profile).score;
}

module.exports = {
  calculateProfileCompletion,
  getCompletionBreakdown,
};

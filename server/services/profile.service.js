const AthleteProfile = require('../models/AthleteProfile');
const CoachProfile = require('../models/CoachProfile');
const Organization = require('../models/Organization');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { slugify, slugWithSuffix } = require('../utils/slug');
const { calculateProfileCompletion, getCompletionBreakdown } = require('../utils/profileCompletion');
const { uploadImage, safeDeleteImage } = require('./media.service');
const verificationService = require('./verification.service');
const blockService = require('./block.service');
const connectionService = require('./connection.service');
const followService = require('./follow.service');
const postService = require('./post.service');
const {
  ROLES,
  USER_STATUS,
  VISIBILITY_DEFAULTS,
  PROFILE_SECTIONS,
  GALLERY_MAX,
} = require('../config/constants');

const PROFILE_MODEL_BY_ROLE = {
  [ROLES.ATHLETE]: AthleteProfile,
  [ROLES.COACH]: CoachProfile,
  [ROLES.RECRUITER]: Organization,
};

const PUBLIC_ROLE_VALUES = Object.keys(PROFILE_MODEL_BY_ROLE);

function getProfileModel(role) {
  const model = PROFILE_MODEL_BY_ROLE[role];
  if (!model) {
    throw ApiError.forbidden(
      'Only athlete, coach, and organization accounts can manage a public profile.',
      'PROFILE_ROLE_FORBIDDEN',
    );
  }
  return model;
}

function toPlain(document) {
  if (!document) {
    return {};
  }
  return document.toObject ? document.toObject() : { ...document };
}

function serializeLocation(location) {
  if (!location) {
    return {
      city: '',
      region: '',
      country: '',
      latitude: null,
      longitude: null,
    };
  }

  const raw = toPlain(location);
  const coordinates = raw.coordinates?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1]);

  return {
    city: raw.city || '',
    region: raw.region || '',
    country: raw.country || '',
    latitude: hasCoordinates ? coordinates[1] : null,
    longitude: hasCoordinates ? coordinates[0] : null,
  };
}

function normalizeLocation(input, existing) {
  const current = toPlain(existing);
  const currentCoordinates = current.coordinates?.coordinates;
  const hasCurrentCoordinates =
    Array.isArray(currentCoordinates) &&
    currentCoordinates.length === 2 &&
    Number.isFinite(currentCoordinates[0]) &&
    Number.isFinite(currentCoordinates[1]);

  const location = {
    city: input.city !== undefined ? input.city : current.city || '',
    region: input.region !== undefined ? input.region : current.region || '',
    country: input.country !== undefined ? input.country : current.country || '',
  };

  if (input.latitude !== undefined && input.longitude !== undefined) {
    location.coordinates = {
      type: 'Point',
      coordinates: [input.longitude, input.latitude],
    };
  } else if (hasCurrentCoordinates) {
    location.coordinates = {
      type: 'Point',
      coordinates: [currentCoordinates[0], currentCoordinates[1]],
    };
  }

  return location;
}

function normalizeContact(input, existing) {
  const current = toPlain(existing);
  const currentPreferences = toPlain(current.preferences);
  const preferencesInput = input.preferences || {};

  return {
    email: input.email !== undefined ? input.email : current.email || '',
    phone: input.phone !== undefined ? input.phone : current.phone || '',
    website: input.website !== undefined ? input.website : current.website || '',
    preferences: {
      showEmail:
        preferencesInput.showEmail !== undefined
          ? preferencesInput.showEmail
          : currentPreferences.showEmail ?? false,
      allowMessages:
        preferencesInput.allowMessages !== undefined
          ? preferencesInput.allowMessages
          : currentPreferences.allowMessages ?? true,
    },
  };
}

function normalizeVisibility(input, existing) {
  const current = toPlain(existing);
  const visibility = {};
  for (const section of PROFILE_SECTIONS) {
    visibility[section] = input[section] || current[section] || VISIBILITY_DEFAULTS[section];
  }
  return visibility;
}

function applyProfileInput(profile, data) {
  const { location, contact, visibility, ...fields } = data;

  for (const [key, value] of Object.entries(fields)) {
    profile.set(key, value);
  }

  if (location !== undefined) {
    profile.set('location', normalizeLocation(location, profile.location));
  }
  if (contact !== undefined) {
    profile.set('contact', normalizeContact(contact, profile.contact));
  }
  if (visibility !== undefined) {
    profile.set('visibility', normalizeVisibility(visibility, profile.visibility));
  }
}

async function isSlugTaken(slug, excludeId) {
  const query = { slug };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  for (const Model of Object.values(PROFILE_MODEL_BY_ROLE)) {
    const exists = await Model.exists(query);
    if (exists) {
      return true;
    }
  }
  return false;
}

async function buildUniqueSlug(base, excludeId) {
  const root = slugify(base);
  for (let index = 1; index <= 50; index += 1) {
    const candidate = index === 1 ? root : slugWithSuffix(root, index);
    if (!(await isSlugTaken(candidate, excludeId))) {
      return candidate;
    }
  }

  return slugWithSuffix(root, Date.now().toString(36));
}

function serializeOwnProfile(user, profile) {
  const raw = profile.toJSON();
  for (const key of [
    'careerHistory',
    'personalBests',
    'statistics',
    'certifications',
    'mediaGallery',
  ]) {
    raw[key] = serializeSubdocuments(raw[key]);
  }
  return {
    ...raw,
    role: user.role,
    location: serializeLocation(raw.location),
    completion: getCompletionBreakdown(user.role, profile),
  };
}

function serializeSubdocument(item) {
  if (!item) {
    return item;
  }
  const raw = item.toJSON ? item.toJSON() : { ...item };
  if (raw._id) {
    raw.id = raw._id.toString();
    delete raw._id;
  }
  delete raw.__v;
  return raw;
}

function serializeSubdocuments(items) {
  return Array.isArray(items) ? items.map(serializeSubdocument) : [];
}

function requiredOnboardingFields(role, profile) {
  const missing = [];
  const requireField = (field, message, condition) => {
    if (!condition) {
      missing.push({ field, message });
    }
  };

  requireField('headline', 'Add a headline.', typeof profile.headline === 'string' && profile.headline.trim());
  requireField('bio', 'Add a short bio.', typeof profile.bio === 'string' && profile.bio.trim());
  requireField('location.city', 'Add your city.', Boolean(profile.location?.city?.trim()));
  requireField('sports', 'Add at least one sport.', Array.isArray(profile.sports) && profile.sports.length > 0);

  if (role === ROLES.ATHLETE) {
    requireField(
      'experienceYears',
      'Add your years of experience.',
      typeof profile.experienceYears === 'number' && Number.isFinite(profile.experienceYears),
    );
    requireField('level', 'Choose your competition level.', Boolean(profile.level));
  }

  if (role === ROLES.COACH) {
    requireField(
      'specializations',
      'Add at least one coaching specialization.',
      Array.isArray(profile.specializations) && profile.specializations.length > 0,
    );
    requireField(
      'experienceYears',
      'Add your years of coaching experience.',
      typeof profile.experienceYears === 'number' && Number.isFinite(profile.experienceYears),
    );
  }

  if (role === ROLES.RECRUITER) {
    requireField('name', 'Add the organization name.', Boolean(profile.name?.trim()));
    requireField('organizationType', 'Choose an organization type.', Boolean(profile.organizationType));
  }

  return missing;
}

async function getOwnProfile(user) {
  const Model = getProfileModel(user.role);
  return Model.findOne({ user: user._id });
}

async function createProfile(user, data) {
  const Model = getProfileModel(user.role);
  const existing = await Model.exists({ user: user._id });
  if (existing) {
    throw ApiError.conflict(
      'A profile already exists for this account. Use the update endpoint instead.',
      'PROFILE_ALREADY_EXISTS',
    );
  }

  const slug = await buildUniqueSlug(data.name || user.name);
  const profile = new Model({
    user: user._id,
    slug,
    ...(user.role === ROLES.RECRUITER && !data.name ? { name: user.name } : {}),
  });

  applyProfileInput(profile, data);
  profile.profileCompletion = calculateProfileCompletion(user.role, profile);
  await profile.save();

  return serializeOwnProfile(user, profile);
}

async function updateProfile(user, data) {
  const Model = getProfileModel(user.role);
  const profile = await Model.findOne({ user: user._id });
  if (!profile) {
    throw ApiError.notFound(
      'Complete onboarding before editing your profile.',
      'PROFILE_NOT_FOUND',
    );
  }

  applyProfileInput(profile, data);
  profile.profileCompletion = calculateProfileCompletion(user.role, profile);
  await profile.save();

  return serializeOwnProfile(user, profile);
}

async function completeOnboarding(user, data) {
  const Model = getProfileModel(user.role);
  let profile = await Model.findOne({ user: user._id });

  if (!profile) {
    const slug = await buildUniqueSlug(data.name || user.name);
    profile = new Model({
      user: user._id,
      slug,
      ...(user.role === ROLES.RECRUITER && !data.name ? { name: user.name } : {}),
    });
  }

  applyProfileInput(profile, data);

  const missing = requiredOnboardingFields(user.role, profile);
  if (missing.length > 0) {
    throw ApiError.badRequest(
      'A few required profile details are still missing.',
      'ONBOARDING_INCOMPLETE',
      missing,
    );
  }

  profile.profileCompletion = calculateProfileCompletion(user.role, profile);
  await profile.save();

  await User.updateOne(
    { _id: user._id },
    { $set: { onboardingCompleted: true } },
  );
  user.onboardingCompleted = true;

  return serializeOwnProfile(user, profile);
}

function canViewSection(visibility, section, viewer) {
  if (viewer?.isOwner) {
    return true;
  }

  const value = visibility?.[section] || VISIBILITY_DEFAULTS[section] || 'public';
  if (value === 'public') {
    return true;
  }
  if (value === 'connections') {
    return viewer?.isAuthenticated === true;
  }
  return false;
}

function serializeAchievementForViewer(achievement, { includeEvidence = false } = {}) {
  const raw = achievement.toJSON();
  const serialized = {
    id: raw.id,
    title: raw.title,
    sport: raw.sport,
    competition: raw.competition,
    result: raw.result,
    date: raw.date,
    description: raw.description,
    verified: raw.verificationStatus === 'verified',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };

  if (includeEvidence) {
    serialized.evidenceRefs = raw.evidenceRefs;
    serialized.verificationStatus = raw.verificationStatus;
    serialized.verifiedAt = raw.verifiedAt;
  }

  return serialized;
}

function serializePublicProfile({
  profile,
  role,
  user,
  viewer,
  achievements,
  verifications = { identity: null, qualifications: [] },
  network = null,
  activity = [],
}) {
  const isOwner = Boolean(viewer && String(viewer._id) === String(profile.user));
  const access = {
    isOwner,
    isAuthenticated: Boolean(viewer),
  };

  const raw = profile.toJSON();
  const visibility = raw.visibility || {};
  const careerHistory = serializeSubdocuments(raw.careerHistory);
  const personalBests = serializeSubdocuments(raw.personalBests);
  const statistics = serializeSubdocuments(raw.statistics);
  const certifications = serializeSubdocuments(raw.certifications);
  const mediaGallery = serializeSubdocuments(raw.mediaGallery);
  const canBio = canViewSection(visibility, 'bio', access);
  const canLocation = canViewSection(visibility, 'location', access);
  const canSports = canViewSection(visibility, 'sports', access);
  const canCareer = canViewSection(visibility, 'career', access);
  const canPersonalBests = canViewSection(visibility, 'personalBests', access);
  const canStatistics = canViewSection(visibility, 'statistics', access);
  const canAchievements = canViewSection(visibility, 'achievements', access);
  const canMedia = canViewSection(visibility, 'media', access);
  const canContact = canViewSection(visibility, 'contact', access);

  const contact = raw.contact || {};
  const publicContact = canContact
    ? {
        email: isOwner || contact.preferences?.showEmail ? contact.email || null : null,
        phone: contact.phone || null,
        website: contact.website || null,
        allowMessages: contact.preferences?.allowMessages !== false,
      }
    : null;

  const result = {
    slug: raw.slug,
    role,
    owner: {
      id: user._id.toString(),
      name: user.name,
      joinedAt: user.createdAt,
    },
    headline: canBio ? raw.headline || '' : '',
    bio: canBio ? raw.bio || '' : '',
    avatar: raw.avatar || null,
    cover: raw.cover || null,
    location: canLocation ? serializeLocation(raw.location) : null,
    contact: publicContact,
    achievements: canAchievements
      ? achievements.map((achievement) => serializeAchievementForViewer(achievement))
      : [],
    verifications,
    network,
    activity,
    mediaGallery: canMedia ? mediaGallery : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    viewer: { isOwner },
  };

  if (role === ROLES.ATHLETE) {
    result.level = canSports ? raw.level : null;
    result.ageCategory = canSports ? raw.ageCategory || null : null;
    result.competitionLevel = canSports ? raw.competitionLevel || null : null;
    result.sports = canSports ? raw.sports : [];
    result.positions = canSports ? raw.positions : [];
    result.skills = canSports ? raw.skills : [];
    result.experienceYears = canCareer ? raw.experienceYears ?? null : null;
    result.currentTeam = canCareer ? raw.currentTeam || '' : '';
    result.careerHistory = canCareer ? careerHistory : [];
    result.personalBests = canPersonalBests ? personalBests : [];
    result.statistics = canStatistics ? statistics : [];
    result.preferredOpportunities = canContact ? raw.preferredOpportunities : [];
    result.availableForTrials = canContact ? raw.availableForTrials : false;
  }

  if (role === ROLES.COACH) {
    result.sports = canSports ? raw.sports : [];
    result.specializations = canSports ? raw.specializations : [];
    result.certifications = canSports ? certifications : [];
    result.experienceYears = canCareer ? raw.experienceYears ?? null : null;
    result.currentOrganization = canCareer ? raw.currentOrganization || '' : '';
    result.careerHistory = canCareer ? careerHistory : [];
    result.preferredOpportunities = canContact ? raw.preferredOpportunities : [];
    result.availability = canContact ? raw.availability : null;
  }

  if (role === ROLES.RECRUITER) {
    result.name = raw.name;
    result.organizationType = canSports ? raw.organizationType : null;
    result.sports = canSports ? raw.sports : [];
    result.foundedYear = canSports ? raw.foundedYear ?? null : null;
    result.activities = canSports ? raw.activities : [];
  }

  return result;
}

async function getPublicProfile(slug, viewer) {
  const cleanSlug = String(slug || '').trim().toLowerCase();
  let profile = null;
  let role = null;

  for (const [candidateRole, Model] of Object.entries(PROFILE_MODEL_BY_ROLE)) {
    const found = await Model.findOne({ slug: cleanSlug });
    if (found) {
      profile = found;
      role = candidateRole;
      break;
    }
  }

  if (!profile) {
    throw ApiError.notFound('That profile could not be found.', 'PROFILE_NOT_FOUND');
  }

  const user = await User.findById(profile.user).select('name status createdAt');
  if (!user || ![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(user.status)) {
    throw ApiError.notFound('That profile could not be found.', 'PROFILE_NOT_FOUND');
  }

  const isOwner = Boolean(viewer && String(viewer._id) === String(user._id));
  if (!isOwner && viewer) {
    await blockService.assertNotBlocked(viewer._id, user._id);
  }

  const [achievements, verifications, connectionNetwork, followNetwork, activity] =
    await Promise.all([
      Achievement.find({ user: user._id }).sort({ date: -1, createdAt: -1 }).limit(100),
      verificationService.getVerificationSummary(user._id),
      connectionService.getRelationship(viewer, user._id),
      followService.getRelationship(viewer, user._id),
      postService.listUserPosts(user._id, viewer, { limit: 5 }),
    ]);

  return serializePublicProfile({
    profile,
    role,
    user,
    viewer,
    achievements,
    verifications,
    network: {
      ...connectionNetwork,
      ...followNetwork,
    },
    activity,
  });
}

async function setProfileImage(user, kind, file) {
  if (!['avatar', 'cover'].includes(kind)) {
    throw ApiError.badRequest('Unsupported profile image type.', 'INVALID_IMAGE_KIND');
  }

  const Model = getProfileModel(user.role);
  const profile = await Model.findOne({ user: user._id });
  if (!profile) {
    throw ApiError.notFound(
      'Complete onboarding before adding profile images.',
      'PROFILE_NOT_FOUND',
    );
  }

  const media = await uploadImage(file, { folder: `${user.role}/${kind}` });
  const previous = profile[kind];

  try {
    profile[kind] = media;
    profile.profileCompletion = calculateProfileCompletion(user.role, profile);
    await profile.save();
  } catch (error) {
    await safeDeleteImage(media);
    throw error;
  }

  await safeDeleteImage(previous);
  return serializeOwnProfile(user, profile);
}

async function clearProfileImage(user, kind) {
  if (!['avatar', 'cover'].includes(kind)) {
    throw ApiError.badRequest('Unsupported profile image type.', 'INVALID_IMAGE_KIND');
  }

  const Model = getProfileModel(user.role);
  const profile = await Model.findOne({ user: user._id });
  if (!profile) {
    throw ApiError.notFound(
      'Complete onboarding before removing profile images.',
      'PROFILE_NOT_FOUND',
    );
  }

  const previous = profile[kind]
    ? profile[kind].toObject
      ? profile[kind].toObject()
      : profile[kind]
    : null;

  profile.set(kind, undefined);
  profile.markModified(kind);
  profile.profileCompletion = calculateProfileCompletion(user.role, profile);
  await profile.save();
  await safeDeleteImage(previous);

  return serializeOwnProfile(user, profile);
}

async function addGalleryImage(user, file, caption = '') {
  const Model = getProfileModel(user.role);
  const profile = await Model.findOne({ user: user._id });
  if (!profile) {
    throw ApiError.notFound(
      'Complete onboarding before adding gallery images.',
      'PROFILE_NOT_FOUND',
    );
  }
  if (profile.mediaGallery.length >= GALLERY_MAX) {
    throw ApiError.badRequest(
      `You can add up to ${GALLERY_MAX} gallery images.`,
      'GALLERY_LIMIT_REACHED',
    );
  }

  const media = await uploadImage(file, { folder: `${user.role}/gallery` });

  try {
    profile.mediaGallery.push({ ...media, caption });
    profile.profileCompletion = calculateProfileCompletion(user.role, profile);
    await profile.save();
  } catch (error) {
    await safeDeleteImage(media);
    throw error;
  }

  return serializeOwnProfile(user, profile);
}

async function removeGalleryImage(user, itemId) {
  const Model = getProfileModel(user.role);
  const profile = await Model.findOne({ user: user._id });
  if (!profile) {
    throw ApiError.notFound('Profile not found.', 'PROFILE_NOT_FOUND');
  }

  const item = profile.mediaGallery.id(itemId);
  if (!item) {
    throw ApiError.notFound('That gallery image could not be found.', 'GALLERY_ITEM_NOT_FOUND');
  }

  const media = item.toObject();
  item.deleteOne();
  profile.profileCompletion = calculateProfileCompletion(user.role, profile);
  await profile.save();
  await safeDeleteImage(media);

  return serializeOwnProfile(user, profile);
}

module.exports = {
  PROFILE_MODEL_BY_ROLE,
  PUBLIC_ROLE_VALUES,
  getProfileModel,
  getOwnProfile,
  createProfile,
  updateProfile,
  completeOnboarding,
  getPublicProfile,
  setProfileImage,
  clearProfileImage,
  addGalleryImage,
  removeGalleryImage,
  serializeOwnProfile,
  serializeAchievementForViewer,
  serializeLocation,
};

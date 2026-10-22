const mongoose = require('mongoose');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const AthleteProfile = require('../models/AthleteProfile');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const blockService = require('./block.service');
const ApiError = require('../utils/ApiError');
const { createNotification } = require('./notification.service');
const {
  ROLES,
  APPLICATION_STATUS_TRANSITIONS,
  APPLICATION_STATUS_LABELS,
} = require('../config/constants');

function serializeLocation(location) {
  if (!location) {
    return { city: '', region: '', country: '', latitude: null, longitude: null };
  }
  const coordinates = location.coordinates?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1]);

  return {
    city: location.city || '',
    region: location.region || '',
    country: location.country || '',
    latitude: hasCoordinates ? coordinates[1] : null,
    longitude: hasCoordinates ? coordinates[0] : null,
  };
}

function includesCaseInsensitive(values = [], target) {
  const needle = String(target || '').trim().toLowerCase();
  return values.some((value) => String(value).trim().toLowerCase() === needle);
}

async function buildSnapshot(user, profile) {
  const verifiedAchievements = await Achievement.find({
    user: user._id,
    verificationStatus: 'verified',
  })
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .select('title sport competition result date')
    .lean();

  return {
    capturedAt: new Date(),
    name: user.name,
    email: user.email,
    headline: profile.headline || '',
    bio: profile.bio || '',
    sports: profile.sports || [],
    positions: profile.positions || [],
    level: profile.level,
    ageCategory: profile.ageCategory || null,
    competitionLevel: profile.competitionLevel || null,
    experienceYears: profile.experienceYears ?? null,
    currentTeam: profile.currentTeam || '',
    location: serializeLocation(profile.location),
    verifiedAchievementCount: verifiedAchievements.length,
    verifiedAchievements: verifiedAchievements.map((achievement) => ({
      title: achievement.title,
      sport: achievement.sport,
      competition: achievement.competition,
      result: achievement.result,
      date: achievement.date,
    })),
  };
}

function eligibilityFailures(opportunity, profile, verifiedCount, documents) {
  const failures = [];
  const eligibility = opportunity.eligibility || {};

  if (!includesCaseInsensitive(profile.sports, opportunity.sport)) {
    failures.push(`Your profile does not list ${opportunity.sport} as a sport.`);
  }
  if (
    eligibility.ageCategories?.length > 0 &&
    !includesCaseInsensitive(eligibility.ageCategories, profile.ageCategory)
  ) {
    failures.push('Your age category does not match this opportunity.');
  }
  if (
    eligibility.competitionLevels?.length > 0 &&
    !includesCaseInsensitive(eligibility.competitionLevels, profile.competitionLevel)
  ) {
    failures.push('Your competition level does not match this opportunity.');
  }
  if (
    eligibility.levels?.length > 0 &&
    !includesCaseInsensitive(eligibility.levels, profile.level)
  ) {
    failures.push('Your athlete level does not match this opportunity.');
  }

  const experience = profile.experienceYears || 0;
  if (
    eligibility.minExperienceYears !== undefined &&
    experience < eligibility.minExperienceYears
  ) {
    failures.push(
      `This opportunity requires at least ${eligibility.minExperienceYears} years of experience.`,
    );
  }
  if (
    eligibility.maxExperienceYears !== undefined &&
    experience > eligibility.maxExperienceYears
  ) {
    failures.push(
      `This opportunity is limited to ${eligibility.maxExperienceYears} years of experience or less.`,
    );
  }
  if (eligibility.requiresVerifiedAchievement && verifiedCount === 0) {
    failures.push('This opportunity requires at least one verified achievement.');
  }

  const providedLabels = new Set(
    documents.map((document) => document.label.trim().toLowerCase()),
  );
  const missingDocuments = (opportunity.requiredDocuments || []).filter(
    (label) => !providedLabels.has(label.trim().toLowerCase()),
  );
  if (missingDocuments.length > 0) {
    failures.push(`Missing required documents: ${missingDocuments.join(', ')}.`);
  }

  return failures;
}

function serializeApplication(application, opportunity, athlete) {
  const raw = application.toObject ? application.toObject() : { ...application };
  raw.id = raw._id.toString();
  delete raw._id;
  delete raw.__v;

  return {
    ...raw,
    opportunity: opportunity
      ? {
          id: opportunity._id.toString(),
          title: opportunity.title,
          type: opportunity.type,
          sport: opportunity.sport,
          status: opportunity.status,
          deadline: opportunity.deadline,
          publisherName: opportunity.publisherName,
          location: opportunity.location,
        }
      : null,
    athlete: athlete
      ? {
          id: athlete._id.toString(),
          name: athlete.name,
          email: athlete.email,
        }
      : undefined,
  };
}

async function notifyPublisher(opportunity, type, title, message) {
  await createNotification({
    userId: opportunity.publisher,
    type,
    title,
    message,
    link: `/opportunities/${opportunity._id.toString()}/applicants`,
    metadata: { opportunityId: opportunity._id.toString() },
  });
}

async function applyToOpportunity(user, opportunityId, input) {
  if (user.role !== ROLES.ATHLETE) {
    throw ApiError.forbidden(
      'Only athlete accounts can apply to opportunities.',
      'APPLICATION_ROLE_FORBIDDEN',
    );
  }
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }

  const [opportunity, profile] = await Promise.all([
    Opportunity.findById(opportunityId),
    AthleteProfile.findOne({ user: user._id }),
  ]);

  if (!opportunity) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }
  if (!profile) {
    throw ApiError.badRequest(
      'Create your athlete profile before applying.',
      'PROFILE_REQUIRED',
    );
  }
  await blockService.assertNotBlocked(user._id, opportunity.publisher);
  if (opportunity.status !== 'published' || opportunity.deadline <= new Date()) {
    throw ApiError.conflict(
      'This opportunity is no longer accepting applications.',
      'OPPORTUNITY_NOT_ACCEPTING',
    );
  }

  const existing = await Application.exists({
    opportunity: opportunity._id,
    athlete: user._id,
  });
  if (existing) {
    throw ApiError.conflict(
      'You have already applied to this opportunity.',
      'APPLICATION_DUPLICATE',
    );
  }

  const verifiedCount = await Achievement.countDocuments({
    user: user._id,
    verificationStatus: 'verified',
  });
  const failures = eligibilityFailures(
    opportunity,
    profile,
    verifiedCount,
    input.documents || [],
  );
  if (failures.length > 0) {
    throw new ApiError(409, failures.join(' '), 'APPLICATION_NOT_ELIGIBLE', failures);
  }

  const snapshot = await buildSnapshot(user, profile);

  let application;
  try {
    application = await Application.create({
      opportunity: opportunity._id,
      athlete: user._id,
      coverNote: input.coverNote || '',
      documents: input.documents || [],
      submittedSnapshot: snapshot,
      status: 'submitted',
      statusHistory: [
        {
          status: 'submitted',
          changedBy: user._id,
          changedAt: new Date(),
          note: '',
        },
      ],
    });
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict(
        'You have already applied to this opportunity.',
        'APPLICATION_DUPLICATE',
      );
    }
    throw error;
  }

  await notifyPublisher(
    opportunity,
    'application_received',
    'New application received',
    `${user.name} applied for ${opportunity.title}.`,
  );

  return getApplication(user, application.id);
}

async function getApplication(user, applicationId) {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw ApiError.notFound('Application not found.', 'APPLICATION_NOT_FOUND');
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    throw ApiError.notFound('Application not found.', 'APPLICATION_NOT_FOUND');
  }

  const opportunity = await Opportunity.findById(application.opportunity);
  if (!opportunity) {
    throw ApiError.notFound('Application not found.', 'APPLICATION_NOT_FOUND');
  }

  const isApplicant = String(application.athlete) === String(user._id);
  const isPublisher = String(opportunity.publisher) === String(user._id);
  if (!isApplicant && !isPublisher && user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden('You cannot view this application.', 'APPLICATION_FORBIDDEN');
  }

  const athlete = isPublisher || user.role === ROLES.ADMIN
    ? await User.findById(application.athlete).select('name email').lean()
    : null;

  return {
    ...serializeApplication(application, opportunity, athlete),
    viewer: isApplicant ? 'applicant' : 'publisher',
    canWithdraw:
      isApplicant && !['rejected', 'accepted', 'withdrawn'].includes(application.status),
    canReview: isPublisher,
  };
}

async function listMyApplications(user, query) {
  if (user.role !== ROLES.ATHLETE) {
    throw ApiError.forbidden(
      'Only athlete accounts have an application tracker.',
      'APPLICATION_ROLE_FORBIDDEN',
    );
  }

  const page = query.page || 1;
  const limit = query.limit || 12;
  const filter = { athlete: user._id };
  if (query.status) {
    filter.status = query.status;
  }

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('opportunity'),
    Application.countDocuments(filter),
  ]);

  return {
    applications: applications
      .filter((application) => application.opportunity)
      .map((application) =>
        serializeApplication(application, application.opportunity, null),
      ),
    meta: { page, limit, total },
  };
}

async function loadOwnedOpportunity(user, opportunityId) {
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }

  const opportunity = await Opportunity.findById(opportunityId);
  if (!opportunity) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }
  if (String(opportunity.publisher) !== String(user._id)) {
    throw ApiError.forbidden(
      'You can only manage applicants for your own opportunities.',
      'OPPORTUNITY_FORBIDDEN',
    );
  }
  return opportunity;
}

async function listApplicants(user, opportunityId, query) {
  const opportunity = await loadOwnedOpportunity(user, opportunityId);
  const page = query.page || 1;
  const limit = query.limit || 12;
  const filter = { opportunity: opportunity._id };
  if (query.status) {
    filter.status = query.status;
  }

  const [applications, total, statusCounts] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('athlete', 'name email'),
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: { opportunity: opportunity._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    applications: applications.map((application) =>
      serializeApplication(application, opportunity, application.athlete),
    ),
    statusCounts: Object.fromEntries(
      statusCounts.map((entry) => [entry._id, entry.count]),
    ),
    meta: { page, limit, total },
  };
}

async function withdrawApplication(user, applicationId) {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw ApiError.notFound('Application not found.', 'APPLICATION_NOT_FOUND');
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    throw ApiError.notFound('Application not found.', 'APPLICATION_NOT_FOUND');
  }
  if (String(application.athlete) !== String(user._id)) {
    throw ApiError.forbidden('You cannot withdraw this application.', 'APPLICATION_FORBIDDEN');
  }
  if (['rejected', 'accepted', 'withdrawn'].includes(application.status)) {
    throw ApiError.conflict(
      'This application can no longer be withdrawn.',
      'APPLICATION_NOT_WITHDRAWABLE',
    );
  }

  application.status = 'withdrawn';
  application.statusHistory.push({
    status: 'withdrawn',
    changedBy: user._id,
    changedAt: new Date(),
  });
  await application.save();

  const opportunity = await Opportunity.findById(application.opportunity);
  if (opportunity) {
    await notifyPublisher(
      opportunity,
      'application_withdrawn',
      'Application withdrawn',
      `${user.name} withdrew their application for ${opportunity.title}.`,
    );
  }

  return getApplication(user, application.id);
}

async function updateApplicationStatus(user, applicationId, input) {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw ApiError.notFound('Application not found.', 'APPLICATION_NOT_FOUND');
  }

  const application = await Application.findById(applicationId);
  if (!application) {
    throw ApiError.notFound('Application not found.', 'APPLICATION_NOT_FOUND');
  }

  const opportunity = await Opportunity.findById(application.opportunity);
  if (!opportunity || String(opportunity.publisher) !== String(user._id)) {
    throw ApiError.forbidden(
      'You can only review applications for your own opportunities.',
      'APPLICATION_FORBIDDEN',
    );
  }

  const allowed = APPLICATION_STATUS_TRANSITIONS[application.status] || [];
  if (!allowed.includes(input.status)) {
    throw ApiError.conflict(
      `An application marked "${APPLICATION_STATUS_LABELS[application.status]}" cannot move to "${APPLICATION_STATUS_LABELS[input.status]}".`,
      'APPLICATION_STATUS_INVALID',
    );
  }

  application.status = input.status;
  application.reviewedAt = new Date();
  if (['accepted', 'rejected'].includes(input.status)) {
    application.decidedAt = new Date();
  }
  application.statusHistory.push({
    status: input.status,
    changedBy: user._id,
    changedAt: new Date(),
    note: input.note || '',
  });
  await application.save();

  await createNotification({
    userId: application.athlete,
    type: 'application_status_changed',
    title: 'Application status updated',
    message: `Your application for ${opportunity.title} is now ${APPLICATION_STATUS_LABELS[input.status]}.`,
    link: `/applications/${application.id}`,
    metadata: {
      applicationId: application.id,
      opportunityId: opportunity.id,
      status: input.status,
    },
  });

  return getApplication(user, application.id);
}

async function shortlistApplication(user, applicationId, input = {}) {
  return updateApplicationStatus(user, applicationId, {
    status: 'shortlisted',
    note: input.note || '',
  });
}

module.exports = {
  applyToOpportunity,
  getApplication,
  listMyApplications,
  listApplicants,
  withdrawApplication,
  updateApplicationStatus,
  shortlistApplication,
};

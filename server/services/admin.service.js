const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const Event = require('../models/Event');
const Team = require('../models/Team');
const VerificationRequest = require('../models/VerificationRequest');
const VerificationAuditLog = require('../models/VerificationAuditLog');
const Report = require('../models/Report');
const Block = require('../models/Block');
const ApiError = require('../utils/ApiError');
const {
  APPLICATION_STATUSES,
  EVENT_STATUSES,
  OPPORTUNITY_STATUSES,
  ROLES,
  USER_STATUS,
} = require('../config/constants');

const MODERATABLE_STATUSES = [
  USER_STATUS.ACTIVE,
  USER_STATUS.RESTRICTED,
  USER_STATUS.SUSPENDED,
];

function serializeAdminUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    onboardingCompleted: user.onboardingCompleted,
    emailVerified: Boolean(user.isEmailVerified),
    moderationReason: user.moderationReason || '',
    moderatedAt: user.moderatedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

async function adminListUsers(query) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const filter = {};
  if (query.role) {
    filter.role = query.role;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.q) {
    const matcher = new RegExp(
      String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );
    filter.$or = [{ name: matcher }, { email: matcher }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(serializeAdminUser),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function adminGetUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
  }

  const [verificationCounts, reportCounts, blockCount] = await Promise.all([
    VerificationRequest.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Report.aggregate([
      { $match: { targetUser: user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Block.countDocuments({ $or: [{ blocker: user._id }, { blocked: user._id }] }),
  ]);

  return {
    user: serializeAdminUser(user),
    verificationCounts: Object.fromEntries(
      verificationCounts.map((entry) => [entry._id, entry.count]),
    ),
    reportCounts: Object.fromEntries(
      reportCounts.map((entry) => [entry._id, entry.count]),
    ),
    blockCount,
  };
}

async function adminUpdateUserStatus(admin, userId, input) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
  }
  if (!MODERATABLE_STATUSES.includes(input.status)) {
    throw ApiError.badRequest('Choose a valid account status.', 'USER_STATUS_INVALID');
  }
  if (String(admin._id) === String(userId)) {
    throw ApiError.badRequest(
      'You cannot change your own moderation status.',
      'SELF_MODERATION_FORBIDDEN',
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found.', 'USER_NOT_FOUND');
  }
  if (user.role === ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Administrator accounts cannot be moderated here.',
      'MODERATE_ADMIN_FORBIDDEN',
    );
  }

  user.status = input.status;
  user.moderationReason = input.reason || '';
  user.moderatedAt = new Date();
  user.moderatedBy = admin._id;
  await user.save();

  return serializeAdminUser(user);
}

function emptyStatusCounts(statuses) {
  return Object.fromEntries(statuses.map((status) => [status, 0]));
}

function emptyOrganizationCounts() {
  return {
    opportunities: {
      total: 0,
      byStatus: emptyStatusCounts(OPPORTUNITY_STATUSES),
    },
    applications: {
      total: 0,
      byStatus: emptyStatusCounts(APPLICATION_STATUSES),
    },
    teams: { total: 0 },
    events: {
      total: 0,
      byStatus: emptyStatusCounts(EVENT_STATUSES),
    },
  };
}

function serializeAdminOrganization(profile, counts = emptyOrganizationCounts()) {
  return {
    id: profile._id.toString(),
    name: profile.name,
    slug: profile.slug,
    headline: profile.headline || '',
    bio: profile.bio || '',
    organizationType: profile.organizationType,
    sports: profile.sports || [],
    activities: profile.activities || [],
    careerHistory: profile.careerHistory || [],
    foundedYear: profile.foundedYear ?? null,
    location: {
      city: profile.location?.city || '',
      region: profile.location?.region || '',
      country: profile.location?.country || '',
    },
    contact: {
      email: profile.contact?.email || '',
      phone: profile.contact?.phone || '',
      website: profile.contact?.website || '',
      showEmail: Boolean(profile.contact?.preferences?.showEmail),
      allowMessages: profile.contact?.preferences?.allowMessages !== false,
    },
    visibility: profile.visibility || {},
    profileCompletion: profile.profileCompletion || 0,
    avatarUrl: profile.avatar?.url || null,
    coverUrl: profile.cover?.url || null,
    galleryCount: Array.isArray(profile.mediaGallery) ? profile.mediaGallery.length : 0,
    owner: profile.user ? serializeAdminUser(profile.user) : null,
    counts,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

async function loadOrganizationCounts(ownerIds) {
  const countsByOwner = new Map();
  ownerIds.forEach((ownerId) => {
    countsByOwner.set(String(ownerId), emptyOrganizationCounts());
  });

  if (ownerIds.length === 0) {
    return countsByOwner;
  }

  const [opportunityRows, applicationRows, teamRows, eventRows] = await Promise.all([
    Opportunity.aggregate([
      { $match: { publisher: { $in: ownerIds } } },
      {
        $group: {
          _id: { owner: '$publisher', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]),
    Application.aggregate([
      {
        $lookup: {
          from: 'opportunities',
          localField: 'opportunity',
          foreignField: '_id',
          as: 'opportunityDoc',
        },
      },
      { $unwind: '$opportunityDoc' },
      { $match: { 'opportunityDoc.publisher': { $in: ownerIds } } },
      {
        $group: {
          _id: { owner: '$opportunityDoc.publisher', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]),
    Team.aggregate([
      { $match: { owner: { $in: ownerIds } } },
      { $group: { _id: '$owner', count: { $sum: 1 } } },
    ]),
    Event.aggregate([
      { $match: { organizer: { $in: ownerIds } } },
      {
        $group: {
          _id: { owner: '$organizer', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  for (const row of opportunityRows) {
    const counts = countsByOwner.get(String(row._id.owner));
    if (!counts) continue;
    counts.opportunities.total += row.count;
    if (counts.opportunities.byStatus[row._id.status] !== undefined) {
      counts.opportunities.byStatus[row._id.status] += row.count;
    }
  }

  for (const row of applicationRows) {
    const counts = countsByOwner.get(String(row._id.owner));
    if (!counts) continue;
    counts.applications.total += row.count;
    if (counts.applications.byStatus[row._id.status] !== undefined) {
      counts.applications.byStatus[row._id.status] += row.count;
    }
  }

  for (const row of teamRows) {
    const counts = countsByOwner.get(String(row._id));
    if (counts) {
      counts.teams.total = row.count;
    }
  }

  for (const row of eventRows) {
    const counts = countsByOwner.get(String(row._id.owner));
    if (!counts) continue;
    counts.events.total += row.count;
    if (counts.events.byStatus[row._id.status] !== undefined) {
      counts.events.byStatus[row._id.status] += row.count;
    }
  }

  return countsByOwner;
}

async function adminListOrganizations(query) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const filter = {};
  const conditions = [];

  if (query.organizationType) {
    filter.organizationType = query.organizationType;
  }

  if (query.status) {
    const ownerIds = await User.find({
      role: ROLES.RECRUITER,
      status: query.status,
    }).distinct('_id');
    filter.user = { $in: ownerIds };
  }

  if (query.q) {
    const matcher = new RegExp(
      String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );
    const matchingOwnerIds = await User.find({
      role: ROLES.RECRUITER,
      $or: [{ name: matcher }, { email: matcher }],
    }).distinct('_id');
    const search = [
      { name: matcher },
      { slug: matcher },
      { headline: matcher },
      { 'location.city': matcher },
    ];
    if (matchingOwnerIds.length > 0) {
      search.push({ user: { $in: matchingOwnerIds } });
    }
    conditions.push({ $or: search });
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const [profiles, total] = await Promise.all([
    Organization.find(filter)
      .populate({
        path: 'user',
        select:
          'name email role status isEmailVerified onboardingCompleted lastLoginAt createdAt moderationReason moderatedAt',
      })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Organization.countDocuments(filter),
  ]);

  const ownerIds = profiles
    .map((profile) => profile.user?._id)
    .filter(Boolean);
  const countsByOwner = await loadOrganizationCounts(ownerIds);

  return {
    organizations: profiles.map((profile) =>
      serializeAdminOrganization(
        profile,
        profile.user
          ? countsByOwner.get(String(profile.user._id))
          : emptyOrganizationCounts(),
      ),
    ),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function adminGetOrganization(organizationId) {
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    throw ApiError.notFound('Organisation not found.', 'ORGANIZATION_NOT_FOUND');
  }

  const profile = await Organization.findById(organizationId)
    .populate({
      path: 'user',
      select:
        'name email role status isEmailVerified onboardingCompleted lastLoginAt createdAt moderationReason moderatedAt',
    })
    .lean();

  if (!profile) {
    throw ApiError.notFound('Organisation not found.', 'ORGANIZATION_NOT_FOUND');
  }

  const ownerId = profile.user?._id;

  if (!ownerId) {
    return {
      organization: serializeAdminOrganization(profile),
      recentOpportunities: [],
    };
  }

  const [countsByOwner, recentOpportunities] = await Promise.all([
    loadOrganizationCounts([ownerId]),
    Opportunity.find({ publisher: ownerId })
      .select('title type status deadline updatedAt createdAt')
      .sort({ updatedAt: -1, _id: -1 })
      .limit(6)
      .lean(),
  ]);

  return {
    organization: serializeAdminOrganization(
      profile,
      countsByOwner.get(String(ownerId)) || emptyOrganizationCounts(),
    ),
    recentOpportunities: recentOpportunities.map((opportunity) => ({
      id: opportunity._id.toString(),
      title: opportunity.title,
      type: opportunity.type,
      status: opportunity.status,
      deadline: opportunity.deadline,
      updatedAt: opportunity.updatedAt,
      createdAt: opportunity.createdAt,
    })),
  };
}

async function adminOverview() {
  const now = new Date();
  const [
    totalUsers,
    usersByRole,
    usersByStatus,
    opportunitiesByStatus,
    applicationsByStatus,
    verificationsByStatus,
    openReports,
    overdueVerifications,
    blocks,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments({ status: { $ne: USER_STATUS.DEACTIVATED } }),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Opportunity.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    VerificationRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Report.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    VerificationRequest.countDocuments({
      status: { $in: ['requested', 'under_review'] },
      submittedAt: { $lte: new Date(now.getTime() - 72 * 60 * 60 * 1000) },
    }),
    Block.countDocuments(),
    VerificationAuditLog.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(8)
      .populate('actor', 'name role')
      .populate({
        path: 'request',
        select: 'user type status',
        populate: { path: 'user', select: 'name' },
      })
      .lean(),
  ]);

  return {
    users: {
      total: totalUsers,
      byRole: Object.fromEntries(usersByRole.map((entry) => [entry._id, entry.count])),
      byStatus: Object.fromEntries(usersByStatus.map((entry) => [entry._id, entry.count])),
    },
    opportunities: {
      byStatus: Object.fromEntries(
        opportunitiesByStatus.map((entry) => [entry._id, entry.count]),
      ),
    },
    applications: {
      byStatus: Object.fromEntries(
        applicationsByStatus.map((entry) => [entry._id, entry.count]),
      ),
    },
    verifications: {
      pending: (verificationsByStatus.find((entry) => entry._id === 'requested')?.count || 0) +
        (verificationsByStatus.find((entry) => entry._id === 'under_review')?.count || 0),
      overdue: overdueVerifications,
      byStatus: Object.fromEntries(
        verificationsByStatus.map((entry) => [entry._id, entry.count]),
      ),
    },
    reports: { open: openReports },
    blocks: { total: blocks },
    recentActivity: recentActivity.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      reason: log.reason,
      actor: log.actor
        ? { id: log.actor._id.toString(), name: log.actor.name, role: log.actor.role }
        : null,
      request: log.request
        ? {
            id: log.request._id.toString(),
            type: log.request.type,
            status: log.request.status,
            userName: log.request.user?.name || '',
          }
        : null,
      createdAt: log.createdAt,
    })),
  };
}

async function adminActivity(query) {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const logs = await VerificationAuditLog.find()
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('actor', 'name role')
    .populate({
      path: 'request',
      select: 'user type status',
      populate: { path: 'user', select: 'name' },
    })
    .lean();
  const total = await VerificationAuditLog.countDocuments();

  return {
    activity: logs.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      reason: log.reason,
      actor: log.actor
        ? { id: log.actor._id.toString(), name: log.actor.name, role: log.actor.role }
        : null,
      request: log.request
        ? {
            id: log.request._id.toString(),
            type: log.request.type,
            status: log.request.status,
            userName: log.request.user?.name || '',
          }
        : null,
      createdAt: log.createdAt,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = {
  adminListUsers,
  adminGetUser,
  adminUpdateUserStatus,
  adminListOrganizations,
  adminGetOrganization,
  adminOverview,
  adminActivity,
};

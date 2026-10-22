const mongoose = require('mongoose');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const VerificationRequest = require('../models/VerificationRequest');
const VerificationAuditLog = require('../models/VerificationAuditLog');
const Report = require('../models/Report');
const Block = require('../models/Block');
const ApiError = require('../utils/ApiError');
const { ROLES, USER_STATUS } = require('../config/constants');

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
    emailVerified: Boolean(user.emailVerifiedAt),
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
  adminOverview,
  adminActivity,
};

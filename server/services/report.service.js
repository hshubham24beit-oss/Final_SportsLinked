const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const { REPORT_STATUSES, ROLES } = require('../config/constants');

function serializeReport(report, { includeReporter = false } = {}) {
  const raw = report.toObject ? report.toObject() : { ...report };
  const result = {
    id: String(raw._id || raw.id),
    targetType: raw.targetType,
    targetId: raw.targetId,
    reason: raw.reason,
    details: raw.details || '',
    status: raw.status,
    resolution: raw.resolution || '',
    reviewedAt: raw.reviewedAt,
    resolvedAt: raw.resolvedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };

  if (raw.reporter) {
    const reporter = raw.reporter;
    if (typeof reporter === 'object' && reporter._id) {
      result.reporter = {
        id: reporter._id.toString(),
        name: reporter.name || '',
        role: reporter.role || '',
      };
    } else {
      result.reporterId = String(reporter);
    }
  }
  if (includeReporter && raw.reporter && typeof raw.reporter === 'object' && raw.reporter._id) {
    result.reporter = {
      id: raw.reporter._id.toString(),
      name: raw.reporter.name || '',
      email: raw.reporter.email || '',
      role: raw.reporter.role || '',
    };
  }
  if (raw.targetUser && typeof raw.targetUser === 'object' && raw.targetUser._id) {
    result.targetUser = {
      id: raw.targetUser._id.toString(),
      name: raw.targetUser.name || '',
      email: raw.targetUser.email || '',
      role: raw.targetUser.role || '',
      status: raw.targetUser.status || '',
    };
  } else if (raw.targetUser) {
    result.targetUserId = String(raw.targetUser);
  }
  if (raw.reviewedBy) {
    result.reviewedBy = {
      id: String(raw.reviewedBy._id || raw.reviewedBy),
      name: raw.reviewedBy.name || '',
    };
  }

  return result;
}

async function resolveTarget(reporter, input) {
  if (input.targetType === 'user') {
    if (!mongoose.Types.ObjectId.isValid(input.targetId)) {
      throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
    }
    const targetUser = await User.findById(input.targetId).select('name role status');
    if (!targetUser) {
      throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
    }
    if (String(targetUser._id) === String(reporter._id)) {
      throw ApiError.badRequest('You cannot report your own account.', 'REPORT_SELF');
    }
    if (targetUser.role === ROLES.ADMIN) {
      throw ApiError.forbidden('Administrator accounts cannot be reported.', 'REPORT_ADMIN');
    }
    return { targetUser: targetUser._id };
  }

  if (input.targetType === 'opportunity') {
    if (!mongoose.Types.ObjectId.isValid(input.targetId)) {
      throw ApiError.notFound('That opportunity could not be found.', 'OPPORTUNITY_NOT_FOUND');
    }
    const opportunity = await Opportunity.findById(input.targetId).select('publisher');
    if (!opportunity) {
      throw ApiError.notFound('That opportunity could not be found.', 'OPPORTUNITY_NOT_FOUND');
    }
    return { targetUser: opportunity.publisher };
  }

  if (input.targetType === 'post') {
    if (!mongoose.Types.ObjectId.isValid(input.targetId)) {
      throw ApiError.notFound('That post could not be found.', 'POST_NOT_FOUND');
    }
    const post = await Post.findById(input.targetId).select('author');
    if (!post) {
      throw ApiError.notFound('That post could not be found.', 'POST_NOT_FOUND');
    }
    if (String(post.author) === String(reporter._id)) {
      throw ApiError.badRequest('You cannot report your own post.', 'REPORT_SELF');
    }
    return { targetUser: post.author };
  }

  if (input.targetType === 'message') {
    if (!input.targetId || String(input.targetId).length > 128) {
      throw ApiError.badRequest('Choose content to report.', 'REPORT_TARGET_REQUIRED');
    }
    return {};
  }

  throw ApiError.badRequest('Unsupported report target.', 'REPORT_TARGET_UNSUPPORTED');
}

async function createReport(reporter, input) {
  if (reporter.role === ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Administrators review reports and cannot create them.',
      'REPORT_ADMIN_FORBIDDEN',
    );
  }

  const target = await resolveTarget(reporter, input);
  const duplicate = await Report.exists({
    reporter: reporter._id,
    targetType: input.targetType,
    targetId: String(input.targetId),
    status: { $in: ['open', 'under_review'] },
  });
  if (duplicate) {
    throw ApiError.conflict(
      'You have already reported this. Our team is reviewing it.',
      'REPORT_ALREADY_OPEN',
    );
  }

  const report = await Report.create({
    reporter: reporter._id,
    targetType: input.targetType,
    targetId: String(input.targetId),
    targetUser: target.targetUser || null,
    reason: input.reason,
    details: input.details || '',
  });

  return serializeReport(report);
}

async function listOwnReports(user) {
  const reports = await Report.find({ reporter: user._id })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  return { reports: reports.map((report) => serializeReport(report)) };
}

async function adminListReports(query) {
  const page = query.page || 1;
  const limit = query.limit || 15;
  const baseFilter = {};
  if (query.targetType) {
    baseFilter.targetType = query.targetType;
  }
  if (query.reason) {
    baseFilter.reason = query.reason;
  }
  if (query.q) {
    const matcher = new RegExp(
      String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );
    const userIds = await User.find({
      $or: [{ name: matcher }, { email: matcher }],
    }).distinct('_id');
    baseFilter.$or = [
      { reporter: { $in: userIds } },
      { targetUser: { $in: userIds } },
      { details: matcher },
    ];
  }
  const filter = { ...baseFilter };
  if (query.status) {
    filter.status = query.status;
  }

  const [reports, total, statusCounts] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reporter', 'name email role')
      .populate('targetUser', 'name email role status')
      .populate('reviewedBy', 'name'),
    Report.countDocuments(filter),
    Report.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    reports: reports.map((report) => serializeReport(report, { includeReporter: true })),
    statusCounts: Object.fromEntries(
      statusCounts.map((entry) => [entry._id, entry.count]),
    ),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function adminUpdateReport(admin, reportId, input) {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw ApiError.notFound('Report not found.', 'REPORT_NOT_FOUND');
  }
  if (!REPORT_STATUSES.includes(input.status)) {
    throw ApiError.badRequest('Choose a valid report status.', 'REPORT_STATUS_INVALID');
  }
  const report = await Report.findById(reportId);
  if (!report) {
    throw ApiError.notFound('Report not found.', 'REPORT_NOT_FOUND');
  }

  const now = new Date();
  report.status = input.status;
  report.reviewedBy = admin._id;
  report.reviewedAt = report.reviewedAt || now;
  if (input.resolution !== undefined) {
    report.resolution = input.resolution;
  }
  report.resolvedAt =
    input.status === 'resolved' || input.status === 'dismissed' ? now : null;
  await report.save();

  const populated = await Report.findById(report._id)
    .populate('reporter', 'name email role')
    .populate('targetUser', 'name email role status')
    .populate('reviewedBy', 'name');
  return serializeReport(populated, { includeReporter: true });
}

async function deleteReportsForUser(userId) {
  await Report.deleteMany({
    $or: [{ reporter: userId }, { targetUser: userId }],
  });
}

module.exports = {
  createReport,
  listOwnReports,
  adminListReports,
  adminUpdateReport,
  deleteReportsForUser,
  serializeReport,
};

const mongoose = require('mongoose');
const VerificationRequest = require('../models/VerificationRequest');
const VerificationEvidence = require('../models/VerificationEvidence');
const VerificationAuditLog = require('../models/VerificationAuditLog');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { createNotification } = require('./notification.service');
const {
  uploadEvidence,
  createSignedEvidenceUrl,
  deleteEvidenceAsset,
} = require('./evidence.service');
const {
  ROLES,
  VERIFICATION_DEFAULT_EXPIRY_DAYS,
  VERIFICATION_EVIDENCE_MAX,
  VERIFICATION_SIGNED_URL_TTL_SECONDS,
} = require('../config/constants');

function assertVerificationRole(user) {
  if (![ROLES.ATHLETE, ROLES.COACH, ROLES.RECRUITER].includes(user.role)) {
    throw ApiError.forbidden(
      'Only athlete, coach, and organization accounts can request verification.',
      'VERIFICATION_ROLE_FORBIDDEN',
    );
  }
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function serializeEvidence(evidence) {
  const raw = evidence.toObject ? evidence.toObject() : { ...evidence };
  return {
    id: String(raw._id || raw.id),
    label: raw.label || '',
    originalName: raw.originalName || '',
    mimeType: raw.mimeType,
    size: raw.size,
    createdAt: raw.createdAt,
  };
}

function serializeRequest(request, { includeAudit = false, audit = [] } = {}) {
  const raw = request.toObject ? request.toObject() : { ...request };
  const result = {
    id: String(raw._id || raw.id),
    type: raw.type,
    status: raw.status,
    achievement: raw.achievement
      ? {
          id: String(raw.achievement._id || raw.achievement),
          title: raw.achievement.title || '',
          sport: raw.achievement.sport || '',
        }
      : null,
    qualification: raw.qualification || {},
    statement: raw.statement || '',
    evidence: (raw.evidence || []).map(serializeEvidence),
    officialLinks: raw.officialLinks || [],
    reviewer: raw.reviewer
      ? {
          id: String(raw.reviewer._id || raw.reviewer),
          name: raw.reviewer.name || '',
        }
      : null,
    decision: raw.decision || null,
    reason: raw.reason || '',
    submittedAt: raw.submittedAt,
    claimedAt: raw.claimedAt,
    reviewedAt: raw.reviewedAt,
    verifiedAt: raw.verifiedAt,
    rejectedAt: raw.rejectedAt,
    expiresAt: raw.expiresAt,
    expiredAt: raw.expiredAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };

  if (raw.user) {
    result.user = {
      id: String(raw.user._id || raw.user),
      name: raw.user.name || '',
      email: raw.user.email || '',
      role: raw.user.role || '',
      status: raw.user.status || '',
    };
  }

  if (includeAudit) {
    result.audit = audit;
  }

  return result;
}

async function recordAudit({
  requestId,
  actor = null,
  action,
  fromStatus = '',
  toStatus = '',
  reason = '',
  metadata = {},
}) {
  await VerificationAuditLog.create({
    request: requestId,
    actor,
    action,
    fromStatus,
    toStatus,
    reason,
    metadata,
  });
}

async function listAudit(requestId) {
  const logs = await VerificationAuditLog.find({ request: requestId })
    .sort({ createdAt: 1, _id: 1 })
    .populate('actor', 'name role')
    .lean();

  return logs.map((log) => ({
    id: log._id.toString(),
    action: log.action,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    reason: log.reason,
    actor: log.actor
      ? { id: log.actor._id.toString(), name: log.actor.name, role: log.actor.role }
      : null,
    metadata: log.metadata,
    createdAt: log.createdAt,
  }));
}

async function uploadVerificationEvidence(user, file, label = '') {
  assertVerificationRole(user);
  const uploaded = await uploadEvidence(file, {
    folder: `verification-evidence/${user._id}`,
  });
  const evidence = await VerificationEvidence.create({
    owner: user._id,
    label: label.trim(),
    ...uploaded,
  });
  return serializeEvidence(evidence);
}

async function resolveEvidenceIds(user, evidenceIds = []) {
  if (evidenceIds.length === 0) {
    return [];
  }
  if (evidenceIds.length > VERIFICATION_EVIDENCE_MAX) {
    throw ApiError.badRequest(
      `Attach at most ${VERIFICATION_EVIDENCE_MAX} evidence files.`,
      'EVIDENCE_LIMIT_REACHED',
    );
  }

  const uniqueIds = [...new Set(evidenceIds.map(String))];
  const invalid = uniqueIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (invalid.length > 0) {
    throw ApiError.badRequest('One or more evidence files are invalid.', 'EVIDENCE_INVALID');
  }

  const records = await VerificationEvidence.find({
    _id: { $in: uniqueIds },
    owner: user._id,
    request: null,
  });
  if (records.length !== uniqueIds.length) {
    throw ApiError.forbidden(
      'One or more evidence files are unavailable or belong to another account.',
      'EVIDENCE_FORBIDDEN',
    );
  }
  return records;
}

async function attachEvidence(request, evidenceRecords) {
  if (evidenceRecords.length === 0) {
    return;
  }
  const ids = evidenceRecords.map((record) => record._id);
  await VerificationEvidence.updateMany(
    { _id: { $in: ids }, request: null },
    { $set: { request: request._id } },
  );
  request.evidence.push(...ids);
  await request.save();
}

async function validateTarget(user, input) {
  if (input.type === 'achievement') {
    if (!input.achievementId || !mongoose.Types.ObjectId.isValid(input.achievementId)) {
      throw ApiError.badRequest('Choose an achievement to verify.', 'ACHIEVEMENT_REQUIRED');
    }
    const achievement = await Achievement.findOne({
      _id: input.achievementId,
      user: user._id,
    });
    if (!achievement) {
      throw ApiError.notFound('That achievement could not be found.', 'ACHIEVEMENT_NOT_FOUND');
    }
    return { achievement };
  }

  if (input.type === 'qualification') {
    const qualification = input.qualification || {};
    if (!qualification.name || !qualification.issuer) {
      throw ApiError.badRequest(
        'Add the qualification name and issuing organization.',
        'QUALIFICATION_DETAILS_REQUIRED',
      );
    }
  }

  return {};
}

async function findActiveDuplicate(user, input, achievement) {
  const filter = {
    user: user._id,
    type: input.type,
    $or: [
      { status: { $in: ['requested', 'under_review'] } },
      { status: 'verified', expiresAt: { $gt: new Date() } },
      { status: 'verified', expiresAt: null },
    ],
  };

  if (input.type === 'achievement') {
    filter.achievement = achievement._id;
  }

  const candidates = await VerificationRequest.find(filter).select(
    'type status qualification achievement',
  );
  if (input.type === 'qualification') {
    const key = `${normalizeKey(input.qualification.name)}|${normalizeKey(
      input.qualification.issuer,
    )}`;
    return candidates.find(
      (candidate) =>
        `${normalizeKey(candidate.qualification?.name)}|${normalizeKey(
          candidate.qualification?.issuer,
        )}` === key,
    );
  }
  return candidates[0];
}

async function submitVerificationRequest(user, input) {
  assertVerificationRole(user);
  const target = await validateTarget(user, input);
  const duplicate = await findActiveDuplicate(user, input, target.achievement);
  if (duplicate) {
    throw ApiError.conflict(
      'A verification request for this item is already active.',
      'VERIFICATION_ALREADY_ACTIVE',
    );
  }

  const evidenceRecords = await resolveEvidenceIds(user, input.evidenceIds || []);
  const hasEvidence = evidenceRecords.length > 0 || (input.officialLinks || []).length > 0;
  if (!hasEvidence) {
    throw ApiError.badRequest(
      'Attach private evidence or add an official verification link.',
      'EVIDENCE_REQUIRED',
    );
  }

  const request = await VerificationRequest.create({
    user: user._id,
    type: input.type,
    status: 'requested',
    achievement: target.achievement?._id || null,
    qualification:
      input.type === 'qualification'
        ? {
            name: input.qualification.name,
            issuer: input.qualification.issuer,
            year: input.qualification.year,
            officialUrl: input.qualification.officialUrl || '',
          }
        : {},
    statement: input.statement || '',
    officialLinks: input.officialLinks || [],
    submittedAt: new Date(),
  });

  await attachEvidence(request, evidenceRecords);
  if (target.achievement) {
    target.achievement.verificationStatus = 'pending';
    target.achievement.verifiedAt = null;
    target.achievement.verifiedBy = null;
    await target.achievement.save();
  }

  await recordAudit({
    requestId: request._id,
    actor: user._id,
    action: 'submitted',
    fromStatus: 'unverified',
    toStatus: 'requested',
    metadata: { type: request.type },
  });

  return getOwnVerificationRequest(user, request._id);
}

async function resubmitVerificationRequest(user, requestId, input) {
  assertVerificationRole(user);
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }

  const request = await VerificationRequest.findOne({
    _id: requestId,
    user: user._id,
  });
  if (!request) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }
  if (!['rejected', 'expired'].includes(request.status)) {
    throw ApiError.conflict(
      'Only rejected or expired requests can be resubmitted.',
      'VERIFICATION_NOT_RESUBMITTABLE',
    );
  }

  const evidenceRecords = await resolveEvidenceIds(user, input.evidenceIds || []);
  const hasExistingEvidence = request.evidence.length > 0;
  const hasLinks =
    (input.officialLinks !== undefined ? input.officialLinks : request.officialLinks).length > 0;
  if (!hasExistingEvidence && evidenceRecords.length === 0 && !hasLinks) {
    throw ApiError.badRequest(
      'Attach private evidence or add an official verification link.',
      'EVIDENCE_REQUIRED',
    );
  }

  const previousStatus = request.status;
  request.status = 'requested';
  request.reviewer = null;
  request.decision = null;
  request.reason = '';
  request.claimedAt = null;
  request.reviewedAt = null;
  request.verifiedAt = null;
  request.rejectedAt = null;
  request.expiresAt = null;
  request.expiredAt = null;
  request.submittedAt = new Date();
  if (input.statement !== undefined) {
    request.statement = input.statement;
  }
  if (input.officialLinks !== undefined) {
    request.officialLinks = input.officialLinks;
  }
  await request.save();
  await attachEvidence(request, evidenceRecords);

  if (request.achievement) {
    await Achievement.updateOne(
      { _id: request.achievement, user: user._id },
      { $set: { verificationStatus: 'pending', verifiedAt: null, verifiedBy: null } },
    );
  }

  await recordAudit({
    requestId: request._id,
    actor: user._id,
    action: 'resubmitted',
    fromStatus: previousStatus,
    toStatus: 'requested',
  });

  return getOwnVerificationRequest(user, request._id);
}

async function getOwnVerificationRequest(user, requestId) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }
  const request = await VerificationRequest.findOne({
    _id: requestId,
    user: user._id,
  })
    .populate('achievement', 'title sport verificationStatus')
    .populate('reviewer', 'name role')
    .populate('evidence');

  if (!request) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }

  return serializeRequest(request);
}

async function listOwnVerificationRequests(user) {
  assertVerificationRole(user);
  const [requests, achievements] = await Promise.all([
    VerificationRequest.find({ user: user._id })
      .sort({ createdAt: -1, _id: -1 })
      .populate('achievement', 'title sport verificationStatus')
      .populate('reviewer', 'name role')
      .populate('evidence'),
    Achievement.find({ user: user._id })
      .sort({ date: -1, createdAt: -1 })
      .select('title sport date verificationStatus verifiedAt'),
  ]);

  const latestByAchievement = new Map();
  for (const request of requests) {
    if (request.achievement) {
      const key = String(request.achievement._id || request.achievement);
      if (!latestByAchievement.has(key)) {
        latestByAchievement.set(key, request.status);
      }
    }
  }

  const summary = await getVerificationSummary(user._id);
  return {
    requests: requests.map((request) => serializeRequest(request)),
    summary,
    achievements: achievements.map((achievement) => ({
      id: achievement._id.toString(),
      title: achievement.title,
      sport: achievement.sport,
      date: achievement.date,
      verificationStatus: achievement.verificationStatus,
      verifiedAt: achievement.verifiedAt,
      requestStatus: latestByAchievement.get(achievement._id.toString()) || null,
    })),
  };
}

async function getVerificationSummary(userId) {
  const now = new Date();
  const verified = await VerificationRequest.find({
    user: userId,
    status: 'verified',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .sort({ verifiedAt: -1, createdAt: -1 })
    .lean();

  const identity = verified.find((request) => request.type === 'identity');
  return {
    identity: identity
      ? {
          requestId: identity._id.toString(),
          verifiedAt: identity.verifiedAt,
          expiresAt: identity.expiresAt,
        }
      : null,
    qualifications: verified
      .filter((request) => request.type === 'qualification')
      .map((request) => ({
        requestId: request._id.toString(),
        name: request.qualification?.name || '',
        issuer: request.qualification?.issuer || '',
        year: request.qualification?.year || null,
        verifiedAt: request.verifiedAt,
        expiresAt: request.expiresAt,
      })),
  };
}

async function getEvidenceSignedUrl(user, requestId, evidenceId) {
  if (
    !mongoose.Types.ObjectId.isValid(requestId) ||
    !mongoose.Types.ObjectId.isValid(evidenceId)
  ) {
    throw ApiError.notFound('Evidence not found.', 'EVIDENCE_NOT_FOUND');
  }

  const request = await VerificationRequest.findById(requestId).select('user');
  if (!request) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }
  const isOwner = String(request.user) === String(user._id);
  if (!isOwner && user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden(
      'You do not have permission to access this evidence.',
      'EVIDENCE_FORBIDDEN',
    );
  }

  const evidence = await VerificationEvidence.findOne({
    _id: evidenceId,
    request: request._id,
  });
  if (!evidence) {
    throw ApiError.notFound('Evidence not found.', 'EVIDENCE_NOT_FOUND');
  }

  if (!isOwner) {
    await recordAudit({
      requestId: request._id,
      actor: user._id,
      action: 'evidence_accessed',
      metadata: { evidenceId },
    });
  }

  return {
    ...createSignedEvidenceUrl(evidence),
    ttlSeconds: VERIFICATION_SIGNED_URL_TTL_SECONDS,
    originalName: evidence.originalName,
    mimeType: evidence.mimeType,
  };
}

async function findEvidenceBySignedToken(token) {
  const VerificationEvidenceModel = VerificationEvidence;
  const evidenceId = require('./evidence.service').resolveLocalToken(token);
  const evidence = await VerificationEvidenceModel.findById(evidenceId);
  if (!evidence || evidence.storage.provider !== 'local') {
    throw ApiError.notFound('Evidence not found.', 'EVIDENCE_NOT_FOUND');
  }
  return evidence;
}

async function adminListVerificationRequests(query) {
  const page = query.page || 1;
  const limit = query.limit || 12;
  const baseFilter = {};
  if (query.type) {
    baseFilter.type = query.type;
  }
  if (query.reviewer === 'me') {
    baseFilter.reviewer = query.adminId;
  }
  if (query.q) {
    const matcher = new RegExp(
      String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );
    const userIds = await User.find({
      $or: [{ name: matcher }, { email: matcher }],
    }).distinct('_id');
    baseFilter.user = { $in: userIds };
  }
  const filter = { ...baseFilter };
  if (query.status) {
    filter.status = query.status;
  }

  const [requests, total, statusCounts] = await Promise.all([
    VerificationRequest.find(filter)
      .sort({ submittedAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email role status')
      .populate('achievement', 'title sport')
      .populate('reviewer', 'name role')
      .populate('evidence'),
    VerificationRequest.countDocuments(filter),
    VerificationRequest.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    requests: requests.map((request) => serializeRequest(request)),
    statusCounts: Object.fromEntries(
      statusCounts.map((entry) => [entry._id, entry.count]),
    ),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function adminGetVerificationRequest(requestId) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }
  const request = await VerificationRequest.findById(requestId)
    .populate('user', 'name email role status createdAt')
    .populate('achievement', 'title sport competition result date verificationStatus')
    .populate('reviewer', 'name role')
    .populate('evidence');
  if (!request) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }

  return serializeRequest(request, {
    includeAudit: true,
    audit: await listAudit(request._id),
  });
}

async function claimVerificationRequest(admin, requestId) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }
  const request = await VerificationRequest.findById(requestId);
  if (!request) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }
  if (!['requested', 'under_review'].includes(request.status)) {
    throw ApiError.conflict(
      'Only pending requests can be claimed.',
      'VERIFICATION_NOT_CLAIMABLE',
    );
  }
  if (request.reviewer && String(request.reviewer) !== String(admin._id)) {
    throw ApiError.conflict(
      'Another administrator has already claimed this request.',
      'VERIFICATION_ALREADY_CLAIMED',
    );
  }

  const fromStatus = request.status;
  request.reviewer = admin._id;
  request.status = 'under_review';
  request.claimedAt = request.claimedAt || new Date();
  await request.save();

  await recordAudit({
    requestId: request._id,
    actor: admin._id,
    action: 'claimed',
    fromStatus,
    toStatus: 'under_review',
  });

  return adminGetVerificationRequest(request._id);
}

function defaultExpiryFor(type) {
  const days = VERIFICATION_DEFAULT_EXPIRY_DAYS[type] || 0;
  if (!days) {
    return null;
  }
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function decideVerificationRequest(admin, requestId, input) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }
  const request = await VerificationRequest.findById(requestId);
  if (!request) {
    throw ApiError.notFound('Verification request not found.', 'VERIFICATION_NOT_FOUND');
  }
  if (!['requested', 'under_review'].includes(request.status)) {
    throw ApiError.conflict(
      'This request has already been decided or has expired.',
      'VERIFICATION_NOT_DECIDABLE',
    );
  }
  if (request.reviewer && String(request.reviewer) !== String(admin._id)) {
    throw ApiError.conflict(
      'This request is assigned to another administrator.',
      'VERIFICATION_ASSIGNED_TO_OTHER',
    );
  }

  const fromStatus = request.status;
  const now = new Date();
  request.reviewer = admin._id;
  request.claimedAt = request.claimedAt || now;
  request.reviewedAt = now;
  request.decision = input.decision;
  request.reason = input.reason || '';

  if (input.decision === 'approved') {
    request.status = 'verified';
    request.verifiedAt = now;
    request.rejectedAt = null;
    request.expiredAt = null;
    request.expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : defaultExpiryFor(request.type);

    if (request.achievement) {
      await Achievement.updateOne(
        { _id: request.achievement },
        {
          $set: {
            verificationStatus: 'verified',
            verifiedAt: now,
            verifiedBy: admin._id,
          },
        },
      );
    }
  } else {
    request.status = 'rejected';
    request.rejectedAt = now;
    request.verifiedAt = null;
    request.expiresAt = null;
    request.expiredAt = null;
    if (request.achievement) {
      await Achievement.updateOne(
        { _id: request.achievement },
        { $set: { verificationStatus: 'rejected', verifiedAt: null, verifiedBy: null } },
      );
    }
  }
  await request.save();

  await recordAudit({
    requestId: request._id,
    actor: admin._id,
    action: input.decision === 'approved' ? 'approved' : 'rejected',
    fromStatus,
    toStatus: request.status,
    reason: request.reason,
    metadata: { expiresAt: request.expiresAt },
  });

  await createNotification({
    userId: request.user,
    type: 'verification_decision',
    title:
      input.decision === 'approved'
        ? 'Verification approved'
        : 'Verification request rejected',
    message:
      input.decision === 'approved'
        ? `Your ${request.type} verification was approved.`
        : `Your ${request.type} verification was rejected: ${request.reason}`,
    link: '/verification',
    metadata: { requestId: request.id, decision: input.decision },
  });

  return adminGetVerificationRequest(request._id);
}

async function expireVerificationRequests(now = new Date()) {
  const due = await VerificationRequest.find({
    status: 'verified',
    expiresAt: { $ne: null, $lte: now },
  });

  let expired = 0;
  for (const request of due) {
    const result = await VerificationRequest.updateOne(
      { _id: request._id, status: 'verified' },
      {
        $set: {
          status: 'expired',
          expiredAt: now,
          expiresAt: request.expiresAt,
        },
      },
    );
    if (result.modifiedCount === 0) {
      continue;
    }
    expired += 1;

    if (request.achievement) {
      const otherVerified = await VerificationRequest.exists({
        _id: { $ne: request._id },
        achievement: request.achievement,
        status: 'verified',
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      });
      if (!otherVerified) {
        await Achievement.updateOne(
          { _id: request.achievement },
          {
            $set: {
              verificationStatus: 'expired',
              verifiedAt: null,
              verifiedBy: null,
            },
          },
        );
      }
    }

    await recordAudit({
      requestId: request._id,
      action: 'expired',
      fromStatus: 'verified',
      toStatus: 'expired',
      metadata: { expiresAt: request.expiresAt },
    });

    await createNotification({
      userId: request.user,
      type: 'verification_expired',
      title: 'Verification expired',
      message: `Your ${request.type} verification has expired. Submit updated evidence to renew it.`,
      link: '/verification',
      metadata: { requestId: request._id.toString() },
    });
  }

  return { expired };
}

async function deleteEvidenceRecords(records) {
  for (const item of records) {
    await deleteEvidenceAsset(item).catch(() => {});
  }
}

async function deleteVerificationDataForUser(userId) {
  const requests = await VerificationRequest.find({ user: userId }).select('_id');
  const requestIds = requests.map((request) => request._id);
  const evidence = await VerificationEvidence.find({
    $or: [{ owner: userId }, { request: { $in: requestIds } }],
  });
  await deleteEvidenceRecords(evidence);
  await VerificationEvidence.deleteMany({
    $or: [{ owner: userId }, { request: { $in: requestIds } }],
  });
  await VerificationAuditLog.deleteMany({ request: { $in: requestIds } });
  await VerificationRequest.deleteMany({ _id: { $in: requestIds } });
}

async function deleteVerificationDataForAchievement(achievementId) {
  const requests = await VerificationRequest.find({ achievement: achievementId }).select('_id');
  const requestIds = requests.map((request) => request._id);
  if (requestIds.length === 0) {
    return;
  }
  const evidence = await VerificationEvidence.find({ request: { $in: requestIds } });
  await deleteEvidenceRecords(evidence);
  await VerificationEvidence.deleteMany({ request: { $in: requestIds } });
  await VerificationAuditLog.deleteMany({ request: { $in: requestIds } });
  await VerificationRequest.deleteMany({ _id: { $in: requestIds } });
}

module.exports = {
  uploadVerificationEvidence,
  submitVerificationRequest,
  resubmitVerificationRequest,
  listOwnVerificationRequests,
  getOwnVerificationRequest,
  getVerificationSummary,
  getEvidenceSignedUrl,
  findEvidenceBySignedToken,
  adminListVerificationRequests,
  adminGetVerificationRequest,
  claimVerificationRequest,
  decideVerificationRequest,
  expireVerificationRequests,
  deleteVerificationDataForUser,
  deleteVerificationDataForAchievement,
  serializeRequest,
};

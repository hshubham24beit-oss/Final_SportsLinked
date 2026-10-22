const Connection = require('../models/Connection');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const blockService = require('./block.service');
const notificationService = require('./notification.service');
const {
  getUserSummaryMap,
  getTargetUser,
  getUserProfile,
  lower,
} = require('./social.service');
const { ROLES } = require('../config/constants');

const ROLE_LABELS = {
  [ROLES.ATHLETE]: 'Athlete',
  [ROLES.COACH]: 'Coach',
  [ROLES.RECRUITER]: 'Recruiter',
};

function clampLimit(value, fallback = 10, max = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

function counterpartId(record, viewerId) {
  return String(record.requester) === String(viewerId)
    ? String(record.recipient)
    : String(record.requester);
}

function serializeConnection(record, summary, viewerId) {
  return {
    id: String(record._id || record.id),
    status: record.status,
    message: record.message || '',
    direction:
      String(record.requester) === String(viewerId) ? 'outgoing' : 'incoming',
    user: summary || null,
    createdAt: record.createdAt,
    respondedAt: record.respondedAt || null,
  };
}

async function serializeWithUsers(records, viewerId) {
  const summaries = await getUserSummaryMap(
    records.map((record) => counterpartId(record, viewerId)),
  );
  return records.map((record) =>
    serializeConnection(
      record,
      summaries.get(counterpartId(record, viewerId)),
      viewerId,
    ),
  );
}

async function sendConnectionRequest(user, targetUserId, message = '') {
  if (user.role === ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Administrator accounts cannot create connections.',
      'CONNECTION_ADMIN_FORBIDDEN',
    );
  }
  if (String(user._id) === String(targetUserId)) {
    throw ApiError.badRequest(
      'You cannot send a connection request to yourself.',
      'CONNECTION_SELF',
    );
  }

  const target = await getTargetUser(targetUserId);
  await blockService.assertNotBlocked(user._id, target._id);

  const pairKey = Connection.pairKey(user._id, target._id);
  let connection = await Connection.findOne({ pairKey });

  if (connection) {
    if (connection.status === 'accepted') {
      throw ApiError.conflict(
        'You are already connected with this person.',
        'CONNECTION_ALREADY_ACCEPTED',
      );
    }
    if (connection.status === 'pending') {
      throw ApiError.conflict(
        String(connection.requester) === String(user._id)
          ? 'You have already sent this person a connection request.'
          : 'This person has already sent you a connection request.',
        'CONNECTION_DUPLICATE',
      );
    }

    connection.requester = user._id;
    connection.recipient = target._id;
    connection.status = 'pending';
    connection.message = String(message || '').trim();
    connection.respondedAt = null;
  } else {
    connection = new Connection({
      requester: user._id,
      recipient: target._id,
      message,
      status: 'pending',
    });
  }

  try {
    await connection.save();
  } catch (error) {
    if (error && error.code === 11000) {
      throw ApiError.conflict(
        'A connection request already exists for this person.',
        'CONNECTION_DUPLICATE',
      );
    }
    throw error;
  }

  await notificationService.createNotification({
    userId: target._id,
    type: 'connection_request',
    title: 'New connection request',
    message: `${user.name} would like to connect with you.`,
    link: '/network',
    metadata: { connectionId: String(connection._id), userId: String(user._id) },
  });

  const summaries = await getUserSummaryMap([target._id]);
  return serializeConnection(connection, summaries.get(String(target._id)), user._id);
}

async function respondToConnection(user, connectionId, status) {
  if (!['accepted', 'rejected'].includes(status)) {
    throw ApiError.badRequest('Choose a valid connection response.', 'CONNECTION_RESPONSE_INVALID');
  }

  const connection = await Connection.findById(connectionId);
  if (!connection) {
    throw ApiError.notFound('Connection request not found.', 'CONNECTION_NOT_FOUND');
  }
  if (String(connection.recipient) !== String(user._id)) {
    throw ApiError.forbidden(
      'Only the recipient can respond to this request.',
      'CONNECTION_RECIPIENT_ONLY',
    );
  }
  if (connection.status !== 'pending') {
    throw ApiError.conflict(
      'This connection request has already been handled.',
      'CONNECTION_NOT_PENDING',
    );
  }

  connection.status = status;
  connection.respondedAt = new Date();
  await connection.save();

  await notificationService.createNotification({
    userId: connection.requester,
    type: status === 'accepted' ? 'connection_accepted' : 'connection_rejected',
    title: status === 'accepted' ? 'Connection accepted' : 'Connection declined',
    message:
      status === 'accepted'
        ? `${user.name} accepted your connection request.`
        : `${user.name} declined your connection request.`,
    link: '/network',
    metadata: { connectionId: String(connection._id), userId: String(user._id) },
  });

  const summaries = await getUserSummaryMap([connection.requester]);
  return serializeConnection(
    connection,
    summaries.get(String(connection.requester)),
    user._id,
  );
}

async function cancelConnectionRequest(user, connectionId) {
  const connection = await Connection.findById(connectionId);
  if (!connection) {
    throw ApiError.notFound('Connection request not found.', 'CONNECTION_NOT_FOUND');
  }
  if (String(connection.requester) !== String(user._id)) {
    throw ApiError.forbidden(
      'Only the sender can cancel this request.',
      'CONNECTION_REQUESTER_ONLY',
    );
  }
  if (connection.status !== 'pending') {
    throw ApiError.conflict(
      'Only pending requests can be cancelled.',
      'CONNECTION_NOT_PENDING',
    );
  }

  connection.status = 'cancelled';
  connection.respondedAt = new Date();
  await connection.save();

  const summaries = await getUserSummaryMap([connection.recipient]);
  return serializeConnection(
    connection,
    summaries.get(String(connection.recipient)),
    user._id,
  );
}

async function removeConnection(user, connectionId) {
  const connection = await Connection.findById(connectionId);
  if (!connection) {
    throw ApiError.notFound('Connection not found.', 'CONNECTION_NOT_FOUND');
  }
  if (
    String(connection.requester) !== String(user._id) &&
    String(connection.recipient) !== String(user._id)
  ) {
    throw ApiError.forbidden(
      'You are not part of this connection.',
      'CONNECTION_FORBIDDEN',
    );
  }

  await Connection.deleteOne({ _id: connection._id });
  return { removed: true };
}

async function listConnections(user, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = clampLimit(query.limit, 50, 100);
  const filter = {
    status: 'accepted',
    $or: [{ requester: user._id }, { recipient: user._id }],
  };

  const [records, total] = await Promise.all([
    Connection.find(filter)
      .sort({ respondedAt: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Connection.countDocuments(filter),
  ]);

  return {
    connections: await serializeWithUsers(records, user._id),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function listRequests(user, query = {}) {
  const direction = query.direction === 'outgoing' ? 'outgoing' : 'incoming';
  const status = ['pending', 'accepted', 'rejected', 'cancelled'].includes(query.status)
    ? query.status
    : 'pending';
  const filter =
    direction === 'incoming'
      ? { recipient: user._id, status }
      : { requester: user._id, status };

  const records = await Connection.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(clampLimit(query.limit, 50, 100))
    .lean();

  return { requests: await serializeWithUsers(records, user._id), direction, status };
}

async function acceptedPartnerIds(userId) {
  const records = await Connection.find({
    status: 'accepted',
    $or: [{ requester: userId }, { recipient: userId }],
  })
    .select('requester recipient')
    .lean();

  return records.map((record) => counterpartId(record, userId));
}

async function mutualPartnerIds(firstUserId, secondUserId) {
  const [firstIds, secondIds] = await Promise.all([
    acceptedPartnerIds(firstUserId),
    acceptedPartnerIds(secondUserId),
  ]);
  const secondSet = new Set(secondIds.map(String));
  return firstIds.filter((id) => secondSet.has(String(id)));
}

async function countMutualConnections(firstUserId, secondUserId) {
  if (!firstUserId || !secondUserId || String(firstUserId) === String(secondUserId)) {
    return 0;
  }
  return (await mutualPartnerIds(firstUserId, secondUserId)).length;
}

async function listMutualConnections(user, targetUserId) {
  if (String(user._id) === String(targetUserId)) {
    throw ApiError.badRequest(
      'Choose another account to compare connections.',
      'MUTUAL_SELF',
    );
  }
  const target = await getTargetUser(targetUserId);
  const ids = await mutualPartnerIds(user._id, target._id);
  const summaries = await getUserSummaryMap(ids);

  return {
    user: summaries.get(String(target._id)) || null,
    connections: ids.map((id) => summaries.get(String(id))).filter(Boolean),
    count: ids.length,
  };
}

async function getRelationship(viewer, targetUserId) {
  if (!viewer) {
    return {
      connectionStatus: 'none',
      connectionId: null,
      connectionCount: await Connection.countDocuments({
        status: 'accepted',
        $or: [{ requester: targetUserId }, { recipient: targetUserId }],
      }),
      mutualConnectionsCount: 0,
    };
  }

  if (String(viewer._id) === String(targetUserId)) {
    return {
      connectionStatus: 'self',
      connectionId: null,
      connectionCount: await Connection.countDocuments({
        status: 'accepted',
        $or: [{ requester: targetUserId }, { recipient: targetUserId }],
      }),
      mutualConnectionsCount: 0,
    };
  }

  const [connection, connectionCount, mutualConnectionsCount] = await Promise.all([
    Connection.findOne({ pairKey: Connection.pairKey(viewer._id, targetUserId) }).lean(),
    Connection.countDocuments({
      status: 'accepted',
      $or: [{ requester: targetUserId }, { recipient: targetUserId }],
    }),
    countMutualConnections(viewer._id, targetUserId),
  ]);

  let connectionStatus = 'none';
  if (connection?.status === 'accepted') {
    connectionStatus = 'accepted';
  } else if (connection?.status === 'pending') {
    connectionStatus =
      String(connection.requester) === String(viewer._id)
        ? 'pending_outgoing'
        : 'pending_incoming';
  }

  return {
    connectionStatus,
    connectionId: connection ? String(connection._id) : null,
    connectionCount,
    mutualConnectionsCount,
  };
}

async function listSuggestions(user, query = {}) {
  if (user.role === ROLES.ADMIN) {
    return { suggestions: [], criteria: [] };
  }

  const limit = clampLimit(query.limit, 10, 20);
  const [viewerProfile, blockedIds, existing] = await Promise.all([
    getUserProfile(user),
    blockService.getBlockedUserIds(user._id),
    Connection.find({ $or: [{ requester: user._id }, { recipient: user._id }] })
      .select('requester recipient')
      .lean(),
  ]);

  const excludedIds = new Set([
    String(user._id),
    ...blockedIds.map(String),
    ...existing.map((record) => counterpartId(record, user._id)),
  ]);

  const candidates = await User.find({
    _id: { $nin: [...excludedIds] },
    role: { $in: [ROLES.ATHLETE, ROLES.COACH, ROLES.RECRUITER] },
    status: { $in: ['active', 'restricted'] },
  })
    .select('name role status')
    .limit(200)
    .lean();

  if (candidates.length === 0) {
    return { suggestions: [], criteria: [] };
  }

  const summaries = await getUserSummaryMap(candidates.map((candidate) => candidate._id));
  const viewerSports = new Set((viewerProfile?.sports || []).map(lower).filter(Boolean));
  const viewerCity = lower(viewerProfile?.location?.city);
  const viewerCountry = lower(viewerProfile?.location?.country);

  const suggestions = [];
  for (const candidate of candidates) {
    const summary = summaries.get(String(candidate._id));
    if (!summary?.slug) {
      continue;
    }

    const sharedSports = (summary.sports || []).filter((sport) =>
      viewerSports.has(lower(sport)),
    );
    const sameCity =
      Boolean(viewerCity) && lower(summary.location?.city) === viewerCity;
    const sameCountry =
      Boolean(viewerCountry) &&
      !sameCity &&
      lower(summary.location?.country) === viewerCountry;
    const sameRole = candidate.role === user.role;

    const reasons = [
      ...sharedSports.map((sport) => `Shared sport: ${sport}`),
      ...(sameCity ? [`Same city: ${summary.location.city}`] : []),
      ...(sameCountry && !sameCity
        ? [`Same country: ${summary.location.country}`]
        : []),
      ...(sameRole
        ? [`Shared role: ${ROLE_LABELS[candidate.role] || candidate.role}`]
        : []),
    ];

    const score =
      sharedSports.length * 3 +
      (sameCity ? 2 : 0) +
      (sameCountry ? 1 : 0) +
      (sameRole ? 1 : 0);

    if (reasons.length === 0) {
      continue;
    }

    suggestions.push({ user: summary, reasons, score, sharedSports });
  }

  suggestions.sort(
    (first, second) =>
      second.score - first.score ||
      second.sharedSports.length - first.sharedSports.length ||
      first.user.name.localeCompare(second.user.name),
  );

  return {
    suggestions: suggestions.slice(0, limit),
    criteria: [
      'Shared sport',
      'Same city or country',
      'Same platform role',
    ],
  };
}

async function removeConnectionsBetween(firstUserId, secondUserId) {
  await Connection.deleteMany({
    pairKey: Connection.pairKey(firstUserId, secondUserId),
  });
}

module.exports = {
  sendConnectionRequest,
  respondToConnection,
  cancelConnectionRequest,
  removeConnection,
  listConnections,
  listRequests,
  getRelationship,
  listSuggestions,
  listMutualConnections,
  acceptedPartnerIds,
  countMutualConnections,
  removeConnectionsBetween,
};

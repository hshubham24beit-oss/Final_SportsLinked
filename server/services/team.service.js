const mongoose = require('mongoose');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const blockService = require('./block.service');
const notificationService = require('./notification.service');
const {
  PUBLIC_ROLES,
  TEAM_MEMBER_ROLES,
  TEAM_UPDATES_KEPT,
  USER_STATUS,
} = require('../config/constants');

const UPDATE_ROLES = ['owner', 'manager', 'coach'];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsRegex(value) {
  return new RegExp(escapeRegex(value), 'i');
}

function serializeTeam(record) {
  const raw = record.toObject ? record.toObject() : { ...record };
  raw.id = raw._id.toString();
  delete raw._id;
  delete raw.__v;
  delete raw.updates;
  return raw;
}

function serializeMembership(record) {
  if (!record) {
    return null;
  }
  const raw = record.toObject ? record.toObject() : { ...record };
  raw.id = raw._id.toString();
  delete raw._id;
  delete raw.__v;
  return raw;
}

function normalizeLocation(input, existing) {
  if (!input) {
    return existing;
  }

  const current = existing?.toObject ? existing.toObject() : existing || {};
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
      coordinates: currentCoordinates,
    };
  }

  return location;
}

function assertPublicRole(user) {
  if (!PUBLIC_ROLES.includes(user.role)) {
    throw ApiError.forbidden(
      'This account cannot create teams or groups.',
      'TEAM_ROLE_FORBIDDEN',
    );
  }
}

function canManageTeam(team, user, membership) {
  return (
    String(team.owner) === String(user._id) ||
    (membership?.status === 'active' && membership.role === 'manager')
  );
}

function canPostUpdate(team, user, membership) {
  return (
    String(team.owner) === String(user._id) ||
    (membership?.status === 'active' && UPDATE_ROLES.includes(membership.role))
  );
}

function decorateTeam(record, viewer, membership) {
  const raw = serializeTeam(record);
  const isOwner = String(raw.owner) === String(viewer._id);
  const activeMember = membership?.status === 'active';
  return {
    ...raw,
    isOwner,
    membership: serializeMembership(membership),
    membershipStatus: membership?.status || null,
    memberRole: isOwner ? 'owner' : membership?.role || null,
    canManage: isOwner || (activeMember && membership.role === 'manager'),
    canPostUpdate: isOwner || (activeMember && UPDATE_ROLES.includes(membership.role)),
    canLeave: activeMember && !isOwner,
  };
}

async function findTeam(teamId, user, { ownerOnly = false } = {}) {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw ApiError.notFound('Team not found.', 'TEAM_NOT_FOUND');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw ApiError.notFound('Team not found.', 'TEAM_NOT_FOUND');
  }

  const isOwner = String(team.owner) === String(user._id);
  const membership = await TeamMembership.findOne({
    team: team._id,
    user: user._id,
  });

  if (ownerOnly && !isOwner) {
    throw ApiError.forbidden(
      'Only the team owner can perform this action.',
      'TEAM_FORBIDDEN',
    );
  }

  if (!isOwner) {
    await blockService.assertNotBlocked(user._id, team.owner);
    const canView =
      team.privacy === 'public' ||
      membership?.status === 'active' ||
      membership?.status === 'invited';
    if (!canView) {
      throw ApiError.notFound('Team not found.', 'TEAM_NOT_FOUND');
    }
  }

  return { team, isOwner, membership };
}

async function listDiscover(viewer, query) {
  const blockedIds = await blockService.getBlockedUserIds(viewer._id);
  const filter = {
    privacy: 'public',
    owner: { $nin: blockedIds },
  };
  const conditions = [];

  if (query.q) {
    const matcher = containsRegex(query.q);
    conditions.push({
      $or: [
        { name: matcher },
        { description: matcher },
        { sport: matcher },
        { ownerName: matcher },
      ],
    });
  }
  if (query.sport) {
    filter.sport = containsRegex(query.sport);
  }
  if (query.type) {
    filter.type = query.type;
  }
  if (query.location) {
    const matcher = containsRegex(query.location);
    conditions.push({
      $or: [
        { 'location.city': matcher },
        { 'location.region': matcher },
        { 'location.country': matcher },
      ],
    });
  }
  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const page = query.page || 1;
  const limit = query.limit || 12;
  const [records, total] = await Promise.all([
    Team.find(filter)
      .sort({ memberCount: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Team.countDocuments(filter),
  ]);

  const memberships = await TeamMembership.find({
    user: viewer._id,
    team: { $in: records.map((record) => record._id) },
  }).lean();
  const membershipByTeam = new Map(
    memberships.map((membership) => [String(membership.team), membership]),
  );

  return {
    teams: records.map((record) =>
      decorateTeam(record, viewer, membershipByTeam.get(String(record._id))),
    ),
    meta: { page, limit, total },
  };
}

async function listMyTeams(user) {
  const memberships = await TeamMembership.find({
    user: user._id,
    status: { $in: ['active', 'invited'] },
  }).lean();
  const teamIds = memberships.map((membership) => membership.team);
  const teams = await Team.find({
    $or: [{ _id: { $in: teamIds } }, { owner: user._id }],
  }).sort({ updatedAt: -1, _id: -1 });

  const membershipByTeam = new Map(
    memberships.map((membership) => [String(membership.team), membership]),
  );
  return {
    teams: teams.map((team) =>
      decorateTeam(team, user, membershipByTeam.get(String(team._id))),
    ),
  };
}

async function getTeam(user, teamId) {
  const { team, isOwner, membership } = await findTeam(teamId, user);
  return {
    ...decorateTeam(team, user, membership),
    isOwner,
    canEdit: isOwner,
    canInvite: isOwner || (membership?.status === 'active' && membership.role === 'manager'),
    canViewUpdates:
      isOwner || (membership?.status === 'active'),
  };
}

async function createTeam(user, input) {
  assertPublicRole(user);
  const team = await Team.create({
    ...input,
    owner: user._id,
    ownerName: user.name,
    location: normalizeLocation(input.location),
    memberCount: 1,
    updates: [],
  });

  await TeamMembership.create({
    team: team._id,
    user: user._id,
    role: 'owner',
    status: 'active',
    joinedAt: new Date(),
    respondedAt: new Date(),
  });

  return getTeam(user, team.id);
}

async function updateTeam(user, teamId, input) {
  const { team } = await findTeam(teamId, user, { ownerOnly: true });
  const { location, ...fields } = input;
  for (const [key, value] of Object.entries(fields)) {
    team.set(key, value);
  }
  if (location !== undefined) {
    team.location = normalizeLocation(location, team.location);
  }
  await team.save();
  return getTeam(user, team.id);
}

async function deleteTeam(user, teamId) {
  const { team } = await findTeam(teamId, user, { ownerOnly: true });
  await TeamMembership.deleteMany({ team: team._id });
  await team.deleteOne();
  return { id: String(team._id), deleted: true };
}

async function resolveInviteTarget(input) {
  const query = input.userId
    ? { _id: input.userId }
    : { email: String(input.email || '').toLowerCase() };
  const target = await User.findOne(query).select('name email role status');
  if (!target) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }
  if (target.role === 'admin') {
    throw ApiError.forbidden(
      'Administrator accounts cannot join teams.',
      'TEAM_ADMIN_FORBIDDEN',
    );
  }
  if (target.status !== USER_STATUS.ACTIVE) {
    throw ApiError.conflict(
      'Only active accounts can be invited to a team.',
      'TEAM_MEMBER_INACTIVE',
    );
  }
  return target;
}

async function inviteMember(user, teamId, input) {
  const { team, membership: actorMembership } = await findTeam(teamId, user);
  if (!canManageTeam(team, user, actorMembership)) {
    throw ApiError.forbidden(
      'Only the team owner or a manager can invite members.',
      'TEAM_MANAGE_FORBIDDEN',
    );
  }

  const target = await resolveInviteTarget(input);
  if (String(target._id) === String(user._id)) {
    throw ApiError.badRequest('You cannot invite yourself.', 'TEAM_SELF_INVITE');
  }
  if (String(target._id) === String(team.owner)) {
    throw ApiError.conflict('That member already owns this team.', 'TEAM_MEMBER_EXISTS');
  }
  await blockService.assertNotBlocked(user._id, target._id);

  const existing = await TeamMembership.findOne({
    team: team._id,
    user: target._id,
  });
  if (existing?.status === 'active') {
    throw ApiError.conflict('That member is already on the team.', 'TEAM_MEMBER_EXISTS');
  }
  if (existing?.status === 'invited') {
    throw ApiError.conflict(
      'That member already has a pending invitation.',
      'TEAM_INVITE_EXISTS',
    );
  }

  const role = input.role || 'member';
  if (!TEAM_MEMBER_ROLES.includes(role) || role === 'owner') {
    throw ApiError.badRequest('Choose a valid member role.', 'TEAM_ROLE_INVALID');
  }

  const membership = await TeamMembership.findOneAndUpdate(
    { team: team._id, user: target._id },
    {
      $set: {
        role,
        status: 'invited',
        invitedBy: user._id,
        invitedAt: new Date(),
        respondedAt: null,
        joinedAt: null,
        removedAt: null,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await notificationService.createNotification({
    userId: target._id,
    type: 'team_invitation',
    title: 'Team invitation',
    message: `${user.name} invited you to join ${team.name}.`,
    link: `/teams/${team.id}`,
    metadata: { teamId: team.id, role },
  });

  return {
    membership: serializeMembership(membership),
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
    },
  };
}

async function respondToInvitation(user, teamId, accept) {
  const { team, membership } = await findTeam(teamId, user);
  if (!membership || membership.status !== 'invited') {
    throw ApiError.notFound(
      'No pending invitation was found for this team.',
      'TEAM_INVITATION_NOT_FOUND',
    );
  }

  membership.status = accept ? 'active' : 'declined';
  membership.respondedAt = new Date();
  membership.joinedAt = accept ? new Date() : null;
  await membership.save();

  if (accept) {
    await Team.updateOne({ _id: team._id }, { $inc: { memberCount: 1 } });
    await notificationService.createNotification({
      userId: team.owner,
      type: 'team_member_joined',
      title: 'Team invitation accepted',
      message: `${user.name} joined ${team.name}.`,
      link: `/teams/${team.id}`,
      metadata: { teamId: team.id, userId: user.id },
    });
  }

  return {
    membership: serializeMembership(membership),
    team: accept ? await getTeam(user, team.id) : null,
  };
}

async function listMembers(user, teamId) {
  const { team, membership } = await findTeam(teamId, user);
  const canManage = canManageTeam(team, user, membership);
  const isMember = membership?.status === 'active';

  let statuses = ['active'];
  if (canManage) {
    statuses = ['active', 'invited'];
  } else if (membership?.status === 'invited') {
    statuses = ['invited'];
  } else if (!isMember && team.privacy !== 'public') {
    throw ApiError.forbidden(
      'You do not have access to this team member list.',
      'TEAM_MEMBERS_FORBIDDEN',
    );
  }

  const records = await TeamMembership.find({
    team: team._id,
    status: { $in: statuses },
    ...(membership?.status === 'invited' && !canManage
      ? { user: user._id }
      : {}),
  })
    .sort({ status: 1, role: 1, joinedAt: 1, createdAt: 1 })
    .populate('user', 'name email role status')
    .lean();

  return {
    members: records
      .filter((record) => record.user)
      .map((record) => ({
        id: record._id.toString(),
        role: record.role,
        status: record.status,
        invitedAt: record.invitedAt,
        joinedAt: record.joinedAt,
        respondedAt: record.respondedAt,
        user: {
          id: record.user._id.toString(),
          name: record.user.name,
          role: record.user.role,
          ...(canManage ? { email: record.user.email } : {}),
        },
      })),
    canManage,
    team: { id: team.id, name: team.name, owner: String(team.owner) },
  };
}

async function removeMember(user, teamId, targetUserId) {
  const { team, membership: actorMembership } = await findTeam(teamId, user);
  if (!canManageTeam(team, user, actorMembership)) {
    throw ApiError.forbidden(
      'Only the team owner or a manager can remove members.',
      'TEAM_MANAGE_FORBIDDEN',
    );
  }
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.notFound('Team member not found.', 'TEAM_MEMBER_NOT_FOUND');
  }
  if (String(targetUserId) === String(team.owner)) {
    throw ApiError.forbidden('The team owner cannot be removed.', 'TEAM_OWNER_IMMUTABLE');
  }

  const target = await TeamMembership.findOne({
    team: team._id,
    user: targetUserId,
    status: { $in: ['active', 'invited'] },
  });
  if (!target) {
    throw ApiError.notFound('Team member not found.', 'TEAM_MEMBER_NOT_FOUND');
  }
  if (
    target.role === 'manager' &&
    String(team.owner) !== String(user._id)
  ) {
    throw ApiError.forbidden(
      'Only the team owner can remove a manager.',
      'TEAM_MANAGE_FORBIDDEN',
    );
  }

  const wasActive = target.status === 'active';
  target.status = 'removed';
  target.removedAt = new Date();
  await target.save();
  if (wasActive) {
    await Team.updateOne(
      { _id: team._id, memberCount: { $gt: 0 } },
      { $inc: { memberCount: -1 } },
    );
  }

  return { userId: String(target.user), removed: true };
}

async function updateMemberRole(user, teamId, targetUserId, role) {
  const { team } = await findTeam(teamId, user, { ownerOnly: true });
  if (role === 'owner' || !TEAM_MEMBER_ROLES.includes(role)) {
    throw ApiError.badRequest('Choose a valid member role.', 'TEAM_ROLE_INVALID');
  }
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.notFound('Team member not found.', 'TEAM_MEMBER_NOT_FOUND');
  }
  const target = await TeamMembership.findOne({
    team: team._id,
    user: targetUserId,
    status: 'active',
  });
  if (!target) {
    throw ApiError.notFound('Active team member not found.', 'TEAM_MEMBER_NOT_FOUND');
  }
  if (target.role === 'owner') {
    throw ApiError.forbidden('The owner role cannot be changed.', 'TEAM_OWNER_IMMUTABLE');
  }
  target.role = role;
  await target.save();
  return { membership: serializeMembership(target) };
}

async function leaveTeam(user, teamId) {
  const { team, membership } = await findTeam(teamId, user);
  if (String(team.owner) === String(user._id)) {
    throw ApiError.badRequest(
      'Transfer or delete the team instead of leaving as its owner.',
      'TEAM_OWNER_CANNOT_LEAVE',
    );
  }
  if (!membership || membership.status !== 'active') {
    throw ApiError.notFound('Active membership not found.', 'TEAM_MEMBER_NOT_FOUND');
  }

  membership.status = 'removed';
  membership.removedAt = new Date();
  await membership.save();
  await Team.updateOne(
    { _id: team._id, memberCount: { $gt: 0 } },
    { $inc: { memberCount: -1 } },
  );
  return { teamId: team.id, left: true };
}

async function listUpdates(user, teamId) {
  const { team, isOwner, membership } = await findTeam(teamId, user);
  if (!isOwner && membership?.status !== 'active') {
    throw ApiError.forbidden(
      'Join the team to view its updates.',
      'TEAM_UPDATES_FORBIDDEN',
    );
  }
  return {
    updates: [...team.updates]
      .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
      .map((update) => ({
        ...(update.toObject ? update.toObject() : update),
        id: String(update._id),
        _id: undefined,
      })),
    team: { id: team.id, name: team.name },
  };
}

async function postUpdate(user, teamId, text) {
  const { team, isOwner, membership } = await findTeam(teamId, user);
  if (!isOwner && !canPostUpdate(team, user, membership)) {
    throw ApiError.forbidden(
      'Only team owners, managers, and coaches can post updates.',
      'TEAM_UPDATE_FORBIDDEN',
    );
  }

  const role = isOwner ? 'owner' : membership.role;
  const update = {
    _id: new mongoose.Types.ObjectId(),
    author: user._id,
    authorName: user.name,
    authorRole: role,
    text,
    createdAt: new Date(),
  };

  await Team.updateOne(
    { _id: team._id },
    {
      $push: {
        updates: {
          $each: [update],
          $slice: -TEAM_UPDATES_KEPT,
        },
      },
    },
  );

  const members = await TeamMembership.find({
    team: team._id,
    status: 'active',
  })
    .select('user')
    .lean();
  const recipients = new Set(
    members.map((member) => String(member.user)).filter((id) => id !== String(user._id)),
  );
  if (String(team.owner) !== String(user._id)) {
    recipients.add(String(team.owner));
  }

  await Promise.all(
    [...recipients].map((recipientId) =>
      notificationService.createNotification({
        userId: recipientId,
        type: 'team_update',
        title: `New update from ${team.name}`,
        message: text.length > 180 ? `${text.slice(0, 177)}...` : text,
        link: `/teams/${team.id}`,
        metadata: { teamId: team.id, updateId: String(update._id) },
      }),
    ),
  );

  return {
    update: {
      ...update,
      id: String(update._id),
      _id: undefined,
    },
  };
}

module.exports = {
  listDiscover,
  listMyTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  respondToInvitation,
  listMembers,
  removeMember,
  updateMemberRole,
  leaveTeam,
  listUpdates,
  postUpdate,
  serializeTeam,
  findTeam,
  containsRegex,
};

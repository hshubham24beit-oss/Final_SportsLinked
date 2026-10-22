const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const SavedOpportunity = require('../models/SavedOpportunity');
const Application = require('../models/Application');
const User = require('../models/User');
const Organization = require('../models/Organization');
const blockService = require('./block.service');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsRegex(value) {
  return new RegExp(escapeRegex(value), 'i');
}

function serializeOpportunity(record) {
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

function mergeEligibility(input, existing) {
  if (!input) {
    return existing;
  }

  const current = existing?.toObject ? existing.toObject() : existing || {};
  const merged = { ...current };
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function uniqueCaseInsensitive(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function publisherNameFor(user) {
  if (user.role === ROLES.RECRUITER) {
    const organization = await Organization.findOne({ user: user._id }).select('name').lean();
    if (organization?.name) {
      return organization.name;
    }
  }
  return user.name;
}

function assertOwner(opportunity, user) {
  if (String(opportunity.publisher) !== String(user._id)) {
    throw ApiError.forbidden(
      'You can only manage opportunities you created.',
      'OPPORTUNITY_FORBIDDEN',
    );
  }
}

async function findOpportunity(opportunityId, user, { ownerOnly = false } = {}) {
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }

  const opportunity = await Opportunity.findById(opportunityId);
  if (!opportunity) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }

  const isOwner = String(opportunity.publisher) === String(user._id);
  if (ownerOnly) {
    assertOwner(opportunity, user);
  } else if (opportunity.status === 'draft' && !isOwner) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }

  if (!isOwner) {
    await blockService.assertNotBlocked(user._id, opportunity.publisher);
  }

  return { opportunity, isOwner };
}

function activeFilter() {
  return { status: 'published', deadline: { $gt: new Date() } };
}

function sortFor(sort) {
  if (sort === 'recent') {
    return { publishedAt: -1, createdAt: -1, _id: -1 };
  }
  if (sort === 'title') {
    return { title: 1, _id: 1 };
  }
  return { deadline: 1, createdAt: -1, _id: 1 };
}

async function decorateForViewer(opportunities, viewer) {
  if (opportunities.length === 0) {
    return [];
  }

  const ids = opportunities.map((opportunity) => opportunity._id);
  const [savedRecords, applications] = await Promise.all([
    SavedOpportunity.find({ user: viewer._id, opportunity: { $in: ids } })
      .select('opportunity')
      .lean(),
    Application.find({ athlete: viewer._id, opportunity: { $in: ids } })
      .select('opportunity status')
      .lean(),
  ]);

  const savedIds = new Set(savedRecords.map((record) => String(record.opportunity)));
  const applicationByOpportunity = new Map(
    applications.map((application) => [String(application.opportunity), application.status]),
  );

  return opportunities.map((opportunity) => ({
    ...serializeOpportunity(opportunity),
    isOwner: String(opportunity.publisher) === String(viewer._id),
    saved: savedIds.has(String(opportunity._id)),
    myApplicationStatus: applicationByOpportunity.get(String(opportunity._id)) || null,
  }));
}

async function listOpportunities(viewer, query) {
  const filter = activeFilter();
  const conditions = [];

  if (query.q) {
    const matcher = containsRegex(query.q);
    conditions.push({
      $or: [
        { title: matcher },
        { description: matcher },
        { sport: matcher },
        { positions: matcher },
        { publisherName: matcher },
      ],
    });
  }
  if (query.type) {
    filter.type = query.type;
  }
  if (query.sport) {
    filter.sport = containsRegex(query.sport);
  }
  if (query.position) {
    filter.positions = containsRegex(query.position);
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
    Opportunity.find(filter)
      .sort(sortFor(query.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Opportunity.countDocuments(filter),
  ]);

  return {
    opportunities: await decorateForViewer(records, viewer),
    meta: { page, limit, total },
  };
}

async function listMyOpportunities(user, query) {
  if (![ROLES.COACH, ROLES.RECRUITER].includes(user.role)) {
    throw ApiError.forbidden(
      'Only coaches and recruiters can publish opportunities.',
      'OPPORTUNITY_ROLE_FORBIDDEN',
    );
  }

  const page = query.page || 1;
  const limit = query.limit || 12;
  const filter = { publisher: user._id };
  if (query.status) {
    filter.status = query.status;
  }

  const [records, total] = await Promise.all([
    Opportunity.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Opportunity.countDocuments(filter),
  ]);

  return {
    opportunities: records.map((record) => ({
      ...serializeOpportunity(record),
      isOwner: true,
    })),
    meta: { page, limit, total },
  };
}

async function getOpportunity(user, opportunityId) {
  const { opportunity, isOwner } = await findOpportunity(opportunityId, user);
  const [decorated] = await decorateForViewer([opportunity], user);

  return {
    ...decorated,
    isOwner,
    canEdit: isOwner && ['draft', 'published'].includes(opportunity.status),
  };
}

async function createOpportunity(user, input) {
  if (![ROLES.COACH, ROLES.RECRUITER].includes(user.role)) {
    throw ApiError.forbidden(
      'Only coaches and recruiters can publish opportunities.',
      'OPPORTUNITY_ROLE_FORBIDDEN',
    );
  }

  if (input.deadline <= new Date()) {
    throw ApiError.badRequest('The deadline must be in the future.', 'DEADLINE_INVALID');
  }

  const opportunity = await Opportunity.create({
    ...input,
    publisher: user._id,
    publisherName: await publisherNameFor(user),
    publisherRole: user.role,
    location: normalizeLocation(input.location),
    eligibility: input.eligibility || {},
    requiredDocuments: uniqueCaseInsensitive(input.requiredDocuments),
    positions: uniqueCaseInsensitive(input.positions),
    status: 'draft',
  });

  return getOpportunity(user, opportunity.id);
}

async function updateOpportunity(user, opportunityId, input) {
  const { opportunity } = await findOpportunity(opportunityId, user, { ownerOnly: true });

  if (!['draft', 'published'].includes(opportunity.status)) {
    throw ApiError.conflict(
      'Closed or expired opportunities cannot be edited.',
      'OPPORTUNITY_NOT_EDITABLE',
    );
  }

  if (input.deadline !== undefined) {
    if (opportunity.status === 'published' && input.deadline <= new Date()) {
      throw ApiError.badRequest('The deadline must be in the future.', 'DEADLINE_INVALID');
    }
    opportunity.deadline = input.deadline;
  }

  const {
    location,
    eligibility,
    requiredDocuments,
    positions,
    deadline: _deadline,
    ...fields
  } = input;
  for (const [key, value] of Object.entries(fields)) {
    opportunity.set(key, value);
  }

  if (location !== undefined) {
    opportunity.location = normalizeLocation(location, opportunity.location);
  }
  if (eligibility !== undefined) {
    opportunity.eligibility = mergeEligibility(eligibility, opportunity.eligibility);
  }
  if (requiredDocuments !== undefined) {
    opportunity.requiredDocuments = uniqueCaseInsensitive(requiredDocuments);
  }
  if (positions !== undefined) {
    opportunity.positions = uniqueCaseInsensitive(positions);
  }

  await opportunity.save();
  return getOpportunity(user, opportunity.id);
}

async function publishOpportunity(user, opportunityId) {
  const { opportunity } = await findOpportunity(opportunityId, user, { ownerOnly: true });

  if (opportunity.status !== 'draft') {
    throw ApiError.conflict(
      'Only draft opportunities can be published.',
      'OPPORTUNITY_NOT_DRAFT',
    );
  }
  if (opportunity.deadline <= new Date()) {
    throw ApiError.badRequest('The deadline must be in the future.', 'DEADLINE_INVALID');
  }

  opportunity.status = 'published';
  opportunity.publishedAt = new Date();
  await opportunity.save();

  return getOpportunity(user, opportunity.id);
}

async function closeOpportunity(user, opportunityId) {
  const { opportunity } = await findOpportunity(opportunityId, user, { ownerOnly: true });

  if (opportunity.status !== 'published') {
    throw ApiError.conflict(
      'Only published opportunities can be closed.',
      'OPPORTUNITY_NOT_PUBLISHED',
    );
  }

  opportunity.status = 'closed';
  opportunity.closedAt = new Date();
  await opportunity.save();

  return getOpportunity(user, opportunity.id);
}

async function saveOpportunity(user, opportunityId) {
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }

  const opportunity = await Opportunity.findOne({
    _id: opportunityId,
    ...activeFilter(),
  }).select('_id');
  if (!opportunity) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }

  await SavedOpportunity.updateOne(
    { user: user._id, opportunity: opportunity._id },
    { $setOnInsert: { user: user._id, opportunity: opportunity._id } },
    { upsert: true },
  );

  return { saved: true, opportunityId: opportunity.id };
}

async function unsaveOpportunity(user, opportunityId) {
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    throw ApiError.notFound('Opportunity not found.', 'OPPORTUNITY_NOT_FOUND');
  }

  await SavedOpportunity.deleteOne({ user: user._id, opportunity: opportunityId });
  return { saved: false, opportunityId };
}

async function listSavedOpportunities(user, query) {
  const activeIds = await Opportunity.find(activeFilter()).distinct('_id');
  if (activeIds.length === 0) {
    return { opportunities: [], meta: { page: query.page, limit: query.limit, total: 0 } };
  }

  const page = query.page || 1;
  const limit = query.limit || 12;
  const filter = { user: user._id, opportunity: { $in: activeIds } };

  const [records, total] = await Promise.all([
    SavedOpportunity.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('opportunity')
      .lean(),
    SavedOpportunity.countDocuments(filter),
  ]);

  const activeRecords = records.filter((record) => record.opportunity);
  const applications = await Application.find({
    athlete: user._id,
    opportunity: { $in: activeRecords.map((record) => record.opportunity._id) },
  })
    .select('opportunity status')
    .lean();
  const applicationByOpportunity = new Map(
    applications.map((application) => [String(application.opportunity), application.status]),
  );

  return {
    opportunities: activeRecords.map((record) => ({
      ...serializeOpportunity(record.opportunity),
      isOwner: String(record.opportunity.publisher) === String(user._id),
      saved: true,
      myApplicationStatus:
        applicationByOpportunity.get(String(record.opportunity._id)) || null,
    })),
    meta: { page, limit, total },
  };
}

async function expireDueOpportunities(now = new Date()) {
  const result = await Opportunity.updateMany(
    { status: 'published', deadline: { $lte: now } },
    { $set: { status: 'expired', expiredAt: now } },
  );

  return { expired: result.modifiedCount };
}

module.exports = {
  listOpportunities,
  listMyOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  publishOpportunity,
  closeOpportunity,
  saveOpportunity,
  unsaveOpportunity,
  listSavedOpportunities,
  expireDueOpportunities,
  activeFilter,
  findOpportunity,
  publisherNameFor,
  serializeOpportunity,
  uniqueCaseInsensitive,
  containsRegex,
  User,
};

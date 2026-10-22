const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const ApiError = require('../utils/ApiError');
const blockService = require('./block.service');
const notificationService = require('./notification.service');
const { PUBLIC_ROLES } = require('../config/constants');

const ACTIVE_REGISTRATION_STATUSES = ['registered', 'waitlisted', 'interested'];
const ATTENDEE_STATUSES = ['registered', 'waitlisted'];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsRegex(value) {
  return new RegExp(escapeRegex(value), 'i');
}

function serializeEvent(record) {
  const raw = record.toObject ? record.toObject() : { ...record };
  raw.id = raw._id.toString();
  delete raw._id;
  delete raw.__v;
  return raw;
}

function normalizeVenue(input, existing) {
  if (!input) {
    return existing;
  }

  const current = existing?.toObject ? existing.toObject() : existing || {};
  const currentLocation = current.location || {};
  const currentCoordinates = currentLocation.coordinates?.coordinates;
  const hasCurrentCoordinates =
    Array.isArray(currentCoordinates) &&
    currentCoordinates.length === 2 &&
    Number.isFinite(currentCoordinates[0]) &&
    Number.isFinite(currentCoordinates[1]);

  const locationInput = input.location || {};
  const location = {
    city:
      locationInput.city !== undefined
        ? locationInput.city
        : currentLocation.city || '',
    region:
      locationInput.region !== undefined
        ? locationInput.region
        : currentLocation.region || '',
    country:
      locationInput.country !== undefined
        ? locationInput.country
        : currentLocation.country || '',
  };

  if (
    locationInput.latitude !== undefined &&
    locationInput.longitude !== undefined
  ) {
    location.coordinates = {
      type: 'Point',
      coordinates: [locationInput.longitude, locationInput.latitude],
    };
  } else if (hasCurrentCoordinates) {
    location.coordinates = {
      type: 'Point',
      coordinates: currentCoordinates,
    };
  }

  return {
    name: input.name !== undefined ? input.name : current.name || '',
    address: input.address !== undefined ? input.address : current.address || '',
    location,
  };
}

function assertOrganizer(event, user) {
  if (String(event.organizer) !== String(user._id)) {
    throw ApiError.forbidden(
      'You can only manage events you organize.',
      'EVENT_FORBIDDEN',
    );
  }
}

function assertEventRole(user) {
  if (!PUBLIC_ROLES.includes(user.role)) {
    throw ApiError.forbidden(
      'This account cannot organize events.',
      'EVENT_ROLE_FORBIDDEN',
    );
  }
}

async function blockedIdsFor(userId) {
  return blockService.getBlockedUserIds(userId);
}

async function findEvent(eventId, user, { ownerOnly = false } = {}) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw ApiError.notFound('Event not found.', 'EVENT_NOT_FOUND');
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found.', 'EVENT_NOT_FOUND');
  }

  const isOwner = String(event.organizer) === String(user._id);
  if (ownerOnly) {
    assertOrganizer(event, user);
  } else if (!isOwner) {
    await blockService.assertNotBlocked(user._id, event.organizer);
    if (event.status === 'draft') {
      throw ApiError.notFound('Event not found.', 'EVENT_NOT_FOUND');
    }
  }

  const registration = await EventRegistration.findOne({
    event: event._id,
    user: user._id,
  });

  if (
    !isOwner &&
    event.status === 'cancelled' &&
    !registration
  ) {
    throw ApiError.notFound('Event not found.', 'EVENT_NOT_FOUND');
  }

  return { event, isOwner, registration };
}

function decorateForViewer(events, viewer, registrationByEvent = new Map()) {
  const now = new Date();
  return events.map((event) => {
    const raw = serializeEvent(event);
    const registration = registrationByEvent.get(String(raw.id));
    const registrationStatus = registration?.status || null;
    const activeRegistration = ACTIVE_REGISTRATION_STATUSES.includes(registrationStatus);
    const full = Number(raw.registrationCount || 0) >= Number(raw.capacity || 0);
    const deadlineOpen =
      raw.registrationDeadline && new Date(raw.registrationDeadline) > now;
    const startsLater = raw.startAt && new Date(raw.startAt) > now;
    const registrationOpen =
      raw.status === 'published' && deadlineOpen && startsLater && !full;
    const isOwner = String(raw.organizer) === String(viewer._id);
    const canParticipate = PUBLIC_ROLES.includes(viewer.role) && !isOwner;

    return {
      ...raw,
      isOwner,
      registrationStatus,
      registered: registrationStatus === 'registered',
      waitlisted: registrationStatus === 'waitlisted',
      interested: registrationStatus === 'interested',
      spotsRemaining: Math.max(0, Number(raw.capacity || 0) - Number(raw.registrationCount || 0)),
      registrationOpen,
      waitlistOpen:
        raw.status === 'published' &&
        deadlineOpen &&
        startsLater &&
        full &&
        Boolean(raw.allowWaitlist),
      canRegister: canParticipate && registrationOpen && !activeRegistration,
      canExpressInterest:
        canParticipate &&
        raw.status === 'published' &&
        deadlineOpen &&
        startsLater &&
        !activeRegistration,
      canCancelRegistration: canParticipate && activeRegistration,
      canEdit: isOwner && ['draft', 'published'].includes(raw.status),
    };
  });
}

async function registrationsByEventFor(viewer, events) {
  if (events.length === 0) {
    return new Map();
  }
  const records = await EventRegistration.find({
    user: viewer._id,
    event: { $in: events.map((event) => event._id) },
  }).lean();
  return new Map(records.map((record) => [String(record.event), record]));
}

function sortFor(sort) {
  if (sort === 'recent') {
    return { publishedAt: -1, createdAt: -1, _id: -1 };
  }
  if (sort === 'title') {
    return { title: 1, _id: 1 };
  }
  return { startAt: 1, _id: 1 };
}

async function listEvents(viewer, query) {
  const blockedIds = await blockedIdsFor(viewer._id);
  const filter = {
    status: 'published',
    startAt: { $gte: new Date() },
    organizer: { $nin: blockedIds },
  };
  const conditions = [];

  if (query.q) {
    const matcher = containsRegex(query.q);
    conditions.push({
      $or: [
        { title: matcher },
        { description: matcher },
        { sport: matcher },
        { organizerName: matcher },
        { 'venue.name': matcher },
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
        { 'venue.location.city': matcher },
        { 'venue.location.region': matcher },
        { 'venue.location.country': matcher },
      ],
    });
  }
  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const page = query.page || 1;
  const limit = query.limit || 12;
  const [records, total] = await Promise.all([
    Event.find(filter)
      .sort(sortFor(query.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  const registrations = await registrationsByEventFor(viewer, records);
  return {
    events: decorateForViewer(records, viewer, registrations),
    meta: { page, limit, total },
  };
}

async function listMyEvents(user, query) {
  const filter = { organizer: user._id };
  if (query.status) {
    filter.status = query.status;
  }

  const page = query.page || 1;
  const limit = query.limit || 12;
  const [records, total] = await Promise.all([
    Event.find(filter)
      .sort({ startAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);
  const registrations = await registrationsByEventFor(user, records);

  return {
    events: decorateForViewer(records, user, registrations),
    meta: { page, limit, total },
  };
}

async function getEvent(user, eventId) {
  const { event, isOwner, registration } = await findEvent(eventId, user);
  const registrations = new Map([[String(event._id), registration]]);
  const [decorated] = decorateForViewer([event], user, registrations);
  return {
    ...decorated,
    isOwner,
    canDelete:
      isOwner &&
      Number(event.registrationCount) === 0 &&
      Number(event.waitlistCount) === 0,
  };
}

async function createEvent(user, input) {
  assertEventRole(user);
  const now = new Date();
  if (input.registrationDeadline <= now) {
    throw ApiError.badRequest(
      'Registration must close in the future.',
      'EVENT_REGISTRATION_CLOSED',
    );
  }
  if (input.startAt <= now) {
    throw ApiError.badRequest('The event must start in the future.', 'EVENT_DATE_INVALID');
  }

  const event = await Event.create({
    ...input,
    organizer: user._id,
    organizerName: user.name,
    organizerRole: user.role,
    venue: normalizeVenue(input.venue),
    status: 'draft',
  });

  return getEvent(user, event.id);
}

async function updateEvent(user, eventId, input) {
  const { event } = await findEvent(eventId, user, { ownerOnly: true });
  if (!['draft', 'published'].includes(event.status)) {
    throw ApiError.conflict(
      'Only draft or published events can be edited.',
      'EVENT_NOT_EDITABLE',
    );
  }

  const nextStart = input.startAt || event.startAt;
  const nextEnd = input.endAt || event.endAt;
  const nextDeadline = input.registrationDeadline || event.registrationDeadline;
  const nextCapacity = input.capacity ?? event.capacity;
  const now = new Date();

  if (nextEnd < nextStart) {
    throw ApiError.badRequest(
      'The event end must be on or after its start.',
      'EVENT_DATE_INVALID',
    );
  }
  if (nextDeadline > nextStart) {
    throw ApiError.badRequest(
      'Registration must close no later than the event start.',
      'EVENT_REGISTRATION_CLOSED',
    );
  }
  if (nextCapacity < event.registrationCount) {
    throw ApiError.conflict(
      'Capacity cannot be lower than the number of confirmed registrations.',
      'EVENT_CAPACITY_TOO_LOW',
    );
  }
  if (event.status === 'published') {
    if (nextDeadline <= now) {
      throw ApiError.badRequest(
        'Registration must close in the future.',
        'EVENT_REGISTRATION_CLOSED',
      );
    }
    if (nextStart <= now) {
      throw ApiError.badRequest(
        'The event must start in the future.',
        'EVENT_DATE_INVALID',
      );
    }
  }

  const { venue, ...fields } = input;
  for (const [key, value] of Object.entries(fields)) {
    event.set(key, value);
  }
  if (venue !== undefined) {
    event.venue = normalizeVenue(venue, event.venue);
  }

  await event.save();
  return getEvent(user, event.id);
}

async function publishEvent(user, eventId) {
  const { event } = await findEvent(eventId, user, { ownerOnly: true });
  if (event.status !== 'draft') {
    throw ApiError.conflict('Only draft events can be published.', 'EVENT_NOT_DRAFT');
  }
  const now = new Date();
  if (event.registrationDeadline <= now) {
    throw ApiError.badRequest(
      'Registration must close in the future.',
      'EVENT_REGISTRATION_CLOSED',
    );
  }
  if (event.startAt <= now) {
    throw ApiError.badRequest('The event must start in the future.', 'EVENT_DATE_INVALID');
  }

  event.status = 'published';
  event.publishedAt = now;
  await event.save();
  return getEvent(user, event.id);
}

async function cancelEvent(user, eventId, reason = '') {
  const { event } = await findEvent(eventId, user, { ownerOnly: true });
  if (!['draft', 'published'].includes(event.status)) {
    throw ApiError.conflict(
      'This event cannot be cancelled.',
      'EVENT_NOT_CANCELLABLE',
    );
  }

  event.status = 'cancelled';
  event.cancelledAt = new Date();
  event.cancellationReason = reason || '';
  await event.save();

  const attendees = await EventRegistration.find({
    event: event._id,
    status: { $in: ATTENDEE_STATUSES },
  })
    .select('user status')
    .lean();

  await Promise.all(
    attendees.map((attendee) =>
      notificationService.createNotification({
        userId: attendee.user,
        type: 'event_cancelled',
        title: 'Event cancelled',
        message: `${event.title} has been cancelled by the organizer.${
          event.cancellationReason ? ` Reason: ${event.cancellationReason}` : ''
        }`,
        link: `/events/${event.id}`,
        metadata: { eventId: event.id, reason: event.cancellationReason },
      }),
    ),
  );

  return getEvent(user, event.id);
}

async function deleteEvent(user, eventId) {
  const { event } = await findEvent(eventId, user, { ownerOnly: true });
  const activeRegistrations = await EventRegistration.countDocuments({
    event: event._id,
    status: { $in: ACTIVE_REGISTRATION_STATUSES },
  });
  if (activeRegistrations > 0) {
    throw ApiError.conflict(
      'Cancel the event and resolve registrations before deleting it.',
      'EVENT_HAS_REGISTRATIONS',
    );
  }

  await EventRegistration.deleteMany({ event: event._id });
  await event.deleteOne();
  return { id: String(event._id), deleted: true };
}

async function rollbackCounter(eventId, field) {
  await Event.updateOne(
    { _id: eventId },
    [
      {
        $set: {
          [field]: { $max: [0, { $subtract: [`$${field}`, 1] }] },
        },
      },
    ],
  );
}

async function registerForEvent(user, eventId) {
  if (!PUBLIC_ROLES.includes(user.role)) {
    throw ApiError.forbidden(
      'This account cannot register for events.',
      'EVENT_ROLE_FORBIDDEN',
    );
  }

  const { event, isOwner } = await findEvent(eventId, user);
  if (isOwner) {
    throw ApiError.badRequest(
      'Organizers cannot register for their own events.',
      'EVENT_OWN_EVENT',
    );
  }

  const now = new Date();
  if (event.status !== 'published') {
    throw ApiError.conflict('This event is not open for registration.', 'EVENT_NOT_OPEN');
  }
  if (event.registrationDeadline <= now || event.startAt <= now) {
    throw ApiError.conflict(
      'Registration for this event has closed.',
      'EVENT_REGISTRATION_CLOSED',
    );
  }

  const existing = await EventRegistration.findOne({
    event: event._id,
    user: user._id,
  });
  if (existing && ACTIVE_REGISTRATION_STATUSES.includes(existing.status)) {
    throw ApiError.conflict(
      'You already have an active registration for this event.',
      'EVENT_ALREADY_REGISTERED',
    );
  }

  const counterFilter = {
    _id: event._id,
    status: 'published',
    startAt: { $gt: now },
    registrationDeadline: { $gt: now },
  };
  const tryRegistered = () =>
    Event.findOneAndUpdate(
      {
        ...counterFilter,
        $expr: { $lt: ['$registrationCount', '$capacity'] },
      },
      { $inc: { registrationCount: 1 } },
      { new: true },
    );
  const tryWaitlisted = () =>
    Event.findOneAndUpdate(
      {
        ...counterFilter,
        $expr: { $gte: ['$registrationCount', '$capacity'] },
      },
      { $inc: { waitlistCount: 1 } },
      { new: true },
    );

  let status = 'registered';
  let counted = await tryRegistered();
  if (!counted) {
    const latest = await Event.findById(event._id).select(
      'capacity registrationCount allowWaitlist',
    );
    if (latest && latest.registrationCount >= latest.capacity) {
      if (!latest.allowWaitlist) {
        throw ApiError.conflict('This event is full.', 'EVENT_FULL');
      }
      status = 'waitlisted';
      counted = await tryWaitlisted();
    } else {
      counted = await tryRegistered();
    }
  }
  if (!counted) {
    throw ApiError.conflict(
      'Registration changed while you were submitting. Please try again.',
      'EVENT_REGISTRATION_RETRY',
    );
  }
  const counterField = status === 'registered' ? 'registrationCount' : 'waitlistCount';

  let registration;
  try {
    registration = await EventRegistration.findOneAndUpdate(
      { event: event._id, user: user._id },
      {
        $set: {
          status,
          registeredAt: now,
          cancelledAt: null,
          promotedAt: null,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  } catch (error) {
    await rollbackCounter(event._id, counterField);
    if (error?.code === 11000) {
      throw ApiError.conflict(
        'You already have an active registration for this event.',
        'EVENT_ALREADY_REGISTERED',
      );
    }
    throw error;
  }

  const decorated = await getEvent(user, eventId);
  return { event: decorated, registration: registration.toJSON(), waitlisted: status === 'waitlisted' };
}

async function expressInterest(user, eventId) {
  if (!PUBLIC_ROLES.includes(user.role)) {
    throw ApiError.forbidden(
      'This account cannot express interest in events.',
      'EVENT_ROLE_FORBIDDEN',
    );
  }

  const { event, isOwner } = await findEvent(eventId, user);
  if (isOwner) {
    throw ApiError.badRequest(
      'Organizers cannot express interest in their own events.',
      'EVENT_OWN_EVENT',
    );
  }
  const now = new Date();
  if (event.status !== 'published') {
    throw ApiError.conflict('This event is not open.', 'EVENT_NOT_OPEN');
  }
  if (event.registrationDeadline <= now || event.startAt <= now) {
    throw ApiError.conflict(
      'This event is no longer accepting interest.',
      'EVENT_REGISTRATION_CLOSED',
    );
  }

  const existing = await EventRegistration.findOne({
    event: event._id,
    user: user._id,
  });
  if (existing && existing.status === 'interested') {
    throw ApiError.conflict(
      'You have already expressed interest in this event.',
      'EVENT_ALREADY_INTERESTED',
    );
  }
  if (existing && ['registered', 'waitlisted'].includes(existing.status)) {
    throw ApiError.conflict(
      'You already have an active registration for this event.',
      'EVENT_ALREADY_REGISTERED',
    );
  }

  const registration = await EventRegistration.findOneAndUpdate(
    { event: event._id, user: user._id },
    {
      $set: {
        status: 'interested',
        registeredAt: now,
        cancelledAt: null,
        promotedAt: null,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return {
    event: await getEvent(user, eventId),
    registration: registration.toJSON(),
  };
}

async function cancelRegistration(user, eventId) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw ApiError.notFound('Event not found.', 'EVENT_NOT_FOUND');
  }
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found.', 'EVENT_NOT_FOUND');
  }

  const registration = await EventRegistration.findOne({
    event: event._id,
    user: user._id,
    status: { $in: ACTIVE_REGISTRATION_STATUSES },
  });
  if (!registration) {
    throw ApiError.notFound(
      'You do not have an active registration for this event.',
      'EVENT_REGISTRATION_NOT_FOUND',
    );
  }

  const previousStatus = registration.status;
  registration.status = 'cancelled';
  registration.cancelledAt = new Date();
  await registration.save();

  let promotedWaitlist = false;
  if (previousStatus === 'registered') {
    const promotable =
      event.status === 'published' && new Date(event.startAt) > new Date();
    const promoted = promotable
      ? await EventRegistration.findOneAndUpdate(
          { event: event._id, status: 'waitlisted' },
          { $set: { status: 'registered', promotedAt: new Date() } },
          { new: true, sort: { createdAt: 1, _id: 1 } },
        )
      : null;

    if (promoted) {
      promotedWaitlist = true;
      await rollbackCounter(event._id, 'waitlistCount');
      await notificationService.createNotification({
        userId: promoted.user,
        type: 'event_waitlist_promoted',
        title: 'You are off the waitlist',
        message: `A place opened up for ${event.title}. Your registration is now confirmed.`,
        link: `/events/${event.id}`,
        metadata: { eventId: event.id },
      });
    } else {
      await rollbackCounter(event._id, 'registrationCount');
    }
  } else if (previousStatus === 'waitlisted') {
    await rollbackCounter(event._id, 'waitlistCount');
  }

  return { event: await getEvent(user, eventId), promotedWaitlist };
}

async function listRegistrants(user, eventId, query) {
  const { event } = await findEvent(eventId, user, { ownerOnly: true });
  const filter = { event: event._id };
  if (query.status) {
    filter.status = query.status;
  }

  const page = query.page || 1;
  const limit = query.limit || 24;
  const [records, total, counts] = await Promise.all([
    EventRegistration.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email role status')
      .lean(),
    EventRegistration.countDocuments(filter),
    EventRegistration.aggregate([
      { $match: { event: event._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = counts.reduce((result, entry) => {
    result[entry._id] = entry.count;
    return result;
  }, {});

  return {
    registrants: records.map((record) => ({
      id: record._id.toString(),
      status: record.status,
      registeredAt: record.registeredAt,
      cancelledAt: record.cancelledAt,
      promotedAt: record.promotedAt,
      createdAt: record.createdAt,
      user: record.user
        ? {
            id: record.user._id.toString(),
            name: record.user.name,
            email: record.user.email,
            role: record.user.role,
            status: record.user.status,
          }
        : null,
    })),
    event: { id: event.id, title: event.title, capacity: event.capacity },
    statusCounts,
    meta: { page, limit, total },
  };
}

module.exports = {
  listEvents,
  listMyEvents,
  getEvent,
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  deleteEvent,
  registerForEvent,
  expressInterest,
  cancelRegistration,
  listRegistrants,
  serializeEvent,
  findEvent,
  containsRegex,
};

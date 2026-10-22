const eventService = require('../services/event.service');
const { success, paginated } = require('../utils/apiResponse');

async function listEvents(req, res) {
  const result = await eventService.listEvents(req.user, req.query);
  return paginated(res, {
    data: { events: result.events },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Events retrieved.',
  });
}

async function listMyEvents(req, res) {
  const result = await eventService.listMyEvents(req.user, req.query);
  return paginated(res, {
    data: { events: result.events },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Your events retrieved.',
  });
}

async function getEvent(req, res) {
  const event = await eventService.getEvent(req.user, req.params.id);
  return success(res, { data: { event }, message: 'Event retrieved.' });
}

async function createEvent(req, res) {
  const event = await eventService.createEvent(req.user, req.body);
  return success(res, {
    statusCode: 201,
    data: { event },
    message: 'Draft event created.',
  });
}

async function updateEvent(req, res) {
  const event = await eventService.updateEvent(req.user, req.params.id, req.body);
  return success(res, { data: { event }, message: 'Event updated.' });
}

async function publishEvent(req, res) {
  const event = await eventService.publishEvent(req.user, req.params.id);
  return success(res, { data: { event }, message: 'Event published.' });
}

async function cancelEvent(req, res) {
  const event = await eventService.cancelEvent(
    req.user,
    req.params.id,
    req.body.reason,
  );
  return success(res, {
    data: { event },
    message: 'Event cancelled and attendees notified.',
  });
}

async function deleteEvent(req, res) {
  const result = await eventService.deleteEvent(req.user, req.params.id);
  return success(res, { data: result, message: 'Event deleted.' });
}

async function registerForEvent(req, res) {
  const result = await eventService.registerForEvent(req.user, req.params.id);
  return success(res, {
    statusCode: 201,
    data: result,
    message: result.waitlisted
      ? 'Added to the event waitlist.'
      : 'Event registration confirmed.',
  });
}

async function expressInterest(req, res) {
  const result = await eventService.expressInterest(req.user, req.params.id);
  return success(res, {
    statusCode: 201,
    data: result,
    message: 'Interest recorded.',
  });
}

async function cancelRegistration(req, res) {
  const result = await eventService.cancelRegistration(req.user, req.params.id);
  return success(res, {
    data: result,
    message: result.promotedWaitlist
      ? 'Registration cancelled and the next waitlisted member was promoted.'
      : 'Event registration cancelled.',
  });
}

async function listRegistrants(req, res) {
  const result = await eventService.listRegistrants(
    req.user,
    req.params.id,
    req.query,
  );
  return paginated(res, {
    data: {
      registrants: result.registrants,
      event: result.event,
      statusCounts: result.statusCounts,
    },
    page: result.meta.page,
    limit: result.meta.limit,
    total: result.meta.total,
    message: 'Event registrants retrieved.',
  });
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
};

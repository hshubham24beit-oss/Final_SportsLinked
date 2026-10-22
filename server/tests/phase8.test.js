const request = require('supertest');
const {
  app,
  API,
  DEFAULT_PASSWORD,
  registerAndLogin,
  authHeader,
} = require('./helpers');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const Notification = require('../models/Notification');

function userId(account) {
  return account.loginResponse.body.data.user.id;
}

function futureDate(days, hour = 10) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

function eventPayload(overrides = {}) {
  const startAt = overrides.startAt || futureDate(10);
  const endAt = overrides.endAt || new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
  const registrationDeadline =
    overrides.registrationDeadline || new Date(startAt.getTime() - 24 * 60 * 60 * 1000);
  return {
    ...{
      title: 'Community athletics meet',
      description: 'A community athletics meet for local competitors.',
      sport: 'Athletics',
      type: 'competition',
      venue: {
        name: 'Local track',
        address: '1 Stadium Way',
        location: { city: 'Pune', region: 'Maharashtra', country: 'India' },
      },
      capacity: 2,
      allowWaitlist: true,
    },
    ...overrides,
    startAt,
    endAt,
    registrationDeadline,
  };
}

async function createPublishedEvent(organizer, overrides = {}) {
  const created = await request(app)
    .post(`${API}/events`)
    .set(authHeader(organizer.accessToken))
    .send(eventPayload(overrides));
  expect(created.status).toBe(201);
  const published = await request(app)
    .post(`${API}/events/${created.body.data.event.id}/publish`)
    .set(authHeader(organizer.accessToken));
  expect(published.status).toBe(200);
  return published.body.data.event;
}

async function register(account, eventId) {
  return request(app)
    .post(`${API}/events/${eventId}/register`)
    .set(authHeader(account.accessToken));
}

async function cancelRegistration(account, eventId) {
  return request(app)
    .delete(`${API}/events/${eventId}/registration`)
    .set(authHeader(account.accessToken));
}

async function createTeam(owner, overrides = {}) {
  const response = await request(app)
    .post(`${API}/teams`)
    .set(authHeader(owner.accessToken))
    .send({
      name: 'Northside Track Club',
      description: 'A local track and field training group for committed athletes.',
      sport: 'Athletics',
      type: 'team',
      privacy: 'private',
      location: { city: 'Pune', region: 'Maharashtra', country: 'India' },
      ...overrides,
    });
  expect(response.status).toBe(201);
  return response.body.data.team;
}

async function invite(owner, teamId, payload) {
  return request(app)
    .post(`${API}/teams/${teamId}/members`)
    .set(authHeader(owner.accessToken))
    .send(payload);
}

async function respond(account, teamId, accept) {
  return request(app)
    .post(`${API}/teams/${teamId}/respond`)
    .set(authHeader(account.accessToken))
    .send({ accept });
}

async function joinTeam(owner, teamId, account, role = 'member') {
  const invitation = await invite(owner, teamId, {
    userId: userId(account),
    role,
  });
  expect(invitation.status).toBe(201);
  const accepted = await respond(account, teamId, true);
  expect(accepted.status).toBe(200);
}

describe('Phase 8 events and teams', () => {
  it('creates drafts, publishes events, and keeps unregistered drafts private', async () => {
    const organizer = await registerAndLogin({ name: 'Event Organizer', role: 'coach' });
    const athlete = await registerAndLogin({ name: 'Event Athlete', role: 'athlete' });

    const created = await request(app)
      .post(`${API}/events`)
      .set(authHeader(organizer.accessToken))
      .send(eventPayload());
    expect(created.status).toBe(201);
    expect(created.body.data.event.status).toBe('draft');
    expect(created.body.data.event.isOwner).toBe(true);

    const eventId = created.body.data.event.id;
    const hidden = await request(app)
      .get(`${API}/events/${eventId}`)
      .set(authHeader(athlete.accessToken));
    expect(hidden.status).toBe(404);

    const listedDraft = await request(app)
      .get(`${API}/events`)
      .set(authHeader(athlete.accessToken));
    expect(listedDraft.body.data.events).toHaveLength(0);

    const mine = await request(app)
      .get(`${API}/events/mine`)
      .set(authHeader(organizer.accessToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data.events).toHaveLength(1);
    expect(mine.body.data.events[0].status).toBe('draft');

    const published = await request(app)
      .post(`${API}/events/${eventId}/publish`)
      .set(authHeader(organizer.accessToken));
    expect(published.status).toBe(200);
    expect(published.body.data.event.status).toBe('published');

    const visible = await request(app)
      .get(`${API}/events/${eventId}`)
      .set(authHeader(athlete.accessToken));
    expect(visible.status).toBe(200);
    expect(visible.body.data.event.canRegister).toBe(true);

    const listed = await request(app)
      .get(`${API}/events?sport=Athletics`)
      .set(authHeader(athlete.accessToken));
    expect(listed.body.data.events).toHaveLength(1);

    const forbiddenUpdate = await request(app)
      .patch(`${API}/events/${eventId}`)
      .set(authHeader(athlete.accessToken))
      .send({ title: 'Hijacked event' });
    expect(forbiddenUpdate.status).toBe(403);
    expect(forbiddenUpdate.body.code).toBe('EVENT_FORBIDDEN');

    const ownRegistration = await register(organizer, eventId);
    expect(ownRegistration.status).toBe(400);
    expect(ownRegistration.body.code).toBe('EVENT_OWN_EVENT');
  });

  it('enforces capacity and promotes the oldest waitlisted attendee on cancellation', async () => {
    const organizer = await registerAndLogin({ name: 'Waitlist Host', role: 'coach' });
    const first = await registerAndLogin({ name: 'Waitlist First', role: 'athlete' });
    const second = await registerAndLogin({ name: 'Waitlist Second', role: 'athlete' });
    const third = await registerAndLogin({ name: 'Waitlist Third', role: 'athlete' });
    const event = await createPublishedEvent(organizer, { capacity: 1 });

    const firstRegistration = await register(first, event.id);
    expect(firstRegistration.status).toBe(201);
    expect(firstRegistration.body.data.waitlisted).toBe(false);

    const duplicate = await register(first, event.id);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('EVENT_ALREADY_REGISTERED');

    const secondRegistration = await register(second, event.id);
    expect(secondRegistration.status).toBe(201);
    expect(secondRegistration.body.data.waitlisted).toBe(true);

    const thirdRegistration = await register(third, event.id);
    expect(thirdRegistration.status).toBe(201);
    expect(thirdRegistration.body.data.waitlisted).toBe(true);

    const registrants = await request(app)
      .get(`${API}/events/${event.id}/registrants`)
      .set(authHeader(organizer.accessToken));
    expect(registrants.status).toBe(200);
    expect(registrants.body.data.event.capacity).toBe(1);
    expect(registrants.body.data.statusCounts).toEqual({
      registered: 1,
      waitlisted: 2,
    });

    const secondId = userId(second);
    expect(
      await Notification.exists({
        user: secondId,
        type: 'event_waitlist_promoted',
      }),
    ).toBeNull();

    const cancelled = await cancelRegistration(first, event.id);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.promotedWaitlist).toBe(true);

    const promoted = await EventRegistration.findOne({
      event: event.id,
      user: secondId,
    });
    expect(promoted.status).toBe('registered');
    expect(promoted.promotedAt).toBeTruthy();
    expect(
      await Notification.exists({
        user: secondId,
        type: 'event_waitlist_promoted',
      }),
    ).toBeTruthy();

    const updatedEvent = await Event.findById(event.id);
    expect(updatedEvent.registrationCount).toBe(1);
    expect(updatedEvent.waitlistCount).toBe(1);

    const nonOwnerRegistrants = await request(app)
      .get(`${API}/events/${event.id}/registrants`)
      .set(authHeader(third.accessToken));
    expect(nonOwnerRegistrants.status).toBe(403);
  });

  it('rejects full events without a waitlist and registrations after the deadline', async () => {
    const organizer = await registerAndLogin({ name: 'Capacity Host', role: 'coach' });
    const first = await registerAndLogin({ name: 'Capacity First', role: 'athlete' });
    const second = await registerAndLogin({ name: 'Capacity Second', role: 'athlete' });
    const event = await createPublishedEvent(organizer, {
      capacity: 1,
      allowWaitlist: false,
    });

    expect((await register(first, event.id)).status).toBe(201);
    const full = await register(second, event.id);
    expect(full.status).toBe(409);
    expect(full.body.code).toBe('EVENT_FULL');

    const deadlineEvent = await Event.create({
      organizer: userId(organizer),
      organizerName: 'Capacity Host',
      organizerRole: 'coach',
      title: 'Closed registration event',
      description: 'An event whose registration deadline has already passed.',
      sport: 'Athletics',
      type: 'community',
      startAt: futureDate(4),
      endAt: futureDate(4, 12),
      registrationDeadline: futureDate(-1),
      capacity: 10,
      allowWaitlist: true,
      status: 'published',
      publishedAt: new Date(),
    });

    const closed = await register(first, deadlineEvent.id);
    expect(closed.status).toBe(409);
    expect(closed.body.code).toBe('EVENT_REGISTRATION_CLOSED');
  });

  it('notifies registered and waitlisted attendees when an organizer cancels', async () => {
    const organizer = await registerAndLogin({ name: 'Cancel Coach', role: 'coach' });
    const registered = await registerAndLogin({ name: 'Cancel Registered', role: 'athlete' });
    const waitlisted = await registerAndLogin({ name: 'Cancel Waitlisted', role: 'athlete' });
    const event = await createPublishedEvent(organizer, { capacity: 1 });

    expect((await register(registered, event.id)).status).toBe(201);
    expect((await register(waitlisted, event.id)).status).toBe(201);

    const cancelled = await request(app)
      .post(`${API}/events/${event.id}/cancel`)
      .set(authHeader(organizer.accessToken))
      .send({ reason: 'Severe weather warning.' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.event.status).toBe('cancelled');

    for (const account of [registered, waitlisted]) {
      const notification = await Notification.findOne({
        user: userId(account),
        type: 'event_cancelled',
      });
      expect(notification).toBeTruthy();
      expect(notification.message).toContain('Severe weather');
    }

    const hidden = await request(app)
      .get(`${API}/events/${event.id}`)
      .set(authHeader((await registerAndLogin({ role: 'athlete' })).accessToken));
    expect(hidden.status).toBe(404);
  });

  it('supports private team invitations, role-based management, and member updates', async () => {
    const owner = await registerAndLogin({ name: 'Team Owner', role: 'athlete' });
    const member = await registerAndLogin({ name: 'Team Member', role: 'athlete' });
    const outsider = await registerAndLogin({ name: 'Team Outsider', role: 'athlete' });

    const team = await createTeam(owner);
    expect(team.privacy).toBe('private');
    expect(team.memberCount).toBe(1);
    expect(team.membership.role).toBe('owner');

    const hidden = await request(app)
      .get(`${API}/teams/${team.id}`)
      .set(authHeader(outsider.accessToken));
    expect(hidden.status).toBe(404);

    const discover = await request(app)
      .get(`${API}/teams/discover`)
      .set(authHeader(outsider.accessToken));
    expect(discover.body.data.teams).toHaveLength(0);

    const unauthorizedInvite = await invite(member, team.id, {
      userId: userId(outsider),
    });
    expect(unauthorizedInvite.status).toBe(404);

    const invitation = await invite(owner, team.id, {
      userId: userId(member),
      role: 'coach',
    });
    expect(invitation.status).toBe(201);
    expect(invitation.body.data.membership.status).toBe('invited');
    expect(
      await Notification.exists({
        user: userId(member),
        type: 'team_invitation',
      }),
    ).toBeTruthy();

    const duplicateInvite = await invite(owner, team.id, {
      userId: userId(member),
    });
    expect(duplicateInvite.status).toBe(409);
    expect(duplicateInvite.body.code).toBe('TEAM_INVITE_EXISTS');

    const pendingView = await request(app)
      .get(`${API}/teams/${team.id}`)
      .set(authHeader(member.accessToken));
    expect(pendingView.status).toBe(200);
    expect(pendingView.body.data.team.membershipStatus).toBe('invited');

    const accepted = await respond(member, team.id, true);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.membership.status).toBe('active');
    expect(accepted.body.data.membership.role).toBe('coach');
    expect(accepted.body.data.team.memberCount).toBe(2);

    const members = await request(app)
      .get(`${API}/teams/${team.id}/members`)
      .set(authHeader(member.accessToken));
    expect(members.status).toBe(200);
    expect(members.body.data.members).toHaveLength(2);
    expect(
      members.body.data.members.find((entry) => entry.user.id === userId(owner)).role,
    ).toBe('owner');

    const memberInvite = await invite(member, team.id, {
      email: outsider.payload.email,
    });
    expect(memberInvite.status).toBe(403);
    expect(memberInvite.body.code).toBe('TEAM_MANAGE_FORBIDDEN');

    const ownerUpdate = await request(app)
      .post(`${API}/teams/${team.id}/updates`)
      .set(authHeader(owner.accessToken))
      .send({ text: 'Training moves to 6:30am on Saturday.' });
    expect(ownerUpdate.status).toBe(201);
    expect(ownerUpdate.body.data.update.authorRole).toBe('owner');

    expect(
      await Notification.exists({
        user: userId(member),
        type: 'team_update',
      }),
    ).toBeTruthy();

    const coachUpdate = await request(app)
      .post(`${API}/teams/${team.id}/updates`)
      .set(authHeader(member.accessToken))
      .send({ text: 'Bring a water bottle and warm layers.' });
    expect(coachUpdate.status).toBe(201);

    await request(app)
      .patch(`${API}/teams/${team.id}/members/${userId(member)}`)
      .set(authHeader(owner.accessToken))
      .send({ role: 'member' })
      .expect(200);

    const memberUpdate = await request(app)
      .post(`${API}/teams/${team.id}/updates`)
      .set(authHeader(member.accessToken))
      .send({ text: 'This should be rejected.' });
    expect(memberUpdate.status).toBe(403);
    expect(memberUpdate.body.code).toBe('TEAM_UPDATE_FORBIDDEN');

    const outsiderUpdate = await request(app)
      .get(`${API}/teams/${team.id}/updates`)
      .set(authHeader(outsider.accessToken));
    expect(outsiderUpdate.status).toBe(404);

    const ownerRemoval = await request(app)
      .delete(`${API}/teams/${team.id}/members/${userId(owner)}`)
      .set(authHeader(owner.accessToken));
    expect(ownerRemoval.status).toBe(403);
    expect(ownerRemoval.body.code).toBe('TEAM_OWNER_IMMUTABLE');

    const leave = await request(app)
      .delete(`${API}/teams/${team.id}/membership`)
      .set(authHeader(member.accessToken));
    expect(leave.status).toBe(200);
    expect((await Team.findById(team.id)).memberCount).toBe(1);
    expect(
      (await TeamMembership.findOne({ team: team.id, user: userId(member) })).status,
    ).toBe('removed');
  });

  it('cascades event and team data when an account is deleted', async () => {
    const organizer = await registerAndLogin({ name: 'Cascade Coach', role: 'coach' });
    const leaving = await registerAndLogin({ name: 'Leaving Member', role: 'athlete' });
    const waitlisted = await registerAndLogin({ name: 'Cascade Waitlisted', role: 'athlete' });
    const event = await createPublishedEvent(organizer, { capacity: 1 });
    const team = await createTeam(organizer);

    expect((await register(leaving, event.id)).status).toBe(201);
    expect((await register(waitlisted, event.id)).status).toBe(201);
    await joinTeam(organizer, team.id, leaving, 'coach');
    await request(app)
      .post(`${API}/teams/${team.id}/updates`)
      .set(authHeader(leaving.accessToken))
      .send({ text: 'A departing member update.' })
      .expect(201);

    const deleted = await request(app)
      .delete(`${API}/auth/account`)
      .set(authHeader(leaving.accessToken))
      .send({ password: DEFAULT_PASSWORD });
    expect(deleted.status).toBe(200);

    expect(
      await EventRegistration.exists({ event: event.id, user: userId(leaving) }),
    ).toBeNull();
    expect(
      (await EventRegistration.findOne({ event: event.id, user: userId(waitlisted) })).status,
    ).toBe('registered');
    expect(
      await Notification.exists({
        user: userId(waitlisted),
        type: 'event_waitlist_promoted',
      }),
    ).toBeTruthy();

    const updatedTeam = await Team.findById(team.id);
    expect(updatedTeam.memberCount).toBe(1);
    expect(updatedTeam.updates).toHaveLength(0);
    expect(
      await TeamMembership.exists({ team: team.id, user: userId(leaving) }),
    ).toBeNull();
  });

  it('lists public teams in discovery and restricts private member lists', async () => {
    const owner = await registerAndLogin({ name: 'Public Team Owner', role: 'coach' });
    const member = await registerAndLogin({ name: 'Private Team Member', role: 'athlete' });
    const outsider = await registerAndLogin({ name: 'Discovery Viewer', role: 'athlete' });

    const publicTeam = await createTeam(owner, {
      name: 'Open City Runners',
      privacy: 'public',
      sport: 'Running',
    });
    const privateTeam = await createTeam(owner, {
      name: 'Private Performance Group',
      privacy: 'private',
      sport: 'Running',
    });

    const discover = await request(app)
      .get(`${API}/teams/discover?sport=Running`)
      .set(authHeader(outsider.accessToken));
    expect(discover.status).toBe(200);
    expect(discover.body.data.teams.map((team) => team.id)).toContain(publicTeam.id);
    expect(discover.body.data.teams.map((team) => team.id)).not.toContain(privateTeam.id);

    const publicTeamView = await request(app)
      .get(`${API}/teams/${publicTeam.id}`)
      .set(authHeader(outsider.accessToken));
    expect(publicTeamView.status).toBe(200);
    expect(publicTeamView.body.data.team.membership).toBeNull();

    await joinTeam(owner, privateTeam.id, member);
    const privateMembers = await request(app)
      .get(`${API}/teams/${privateTeam.id}/members`)
      .set(authHeader(member.accessToken));
    expect(privateMembers.status).toBe(200);
    expect(privateMembers.body.data.members).toHaveLength(2);

    const outsiderMembers = await request(app)
      .get(`${API}/teams/${privateTeam.id}/members`)
      .set(authHeader(outsider.accessToken));
    expect(outsiderMembers.status).toBe(404);

    const mine = await request(app)
      .get(`${API}/teams/mine`)
      .set(authHeader(member.accessToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data.teams.map((team) => team.id)).toContain(privateTeam.id);
  });
});

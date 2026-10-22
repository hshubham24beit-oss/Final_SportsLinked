import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./client', () => ({ default: apiMock }));

const { eventsApi } = await import('./events.api');
const { teamsApi } = await import('./teams.api');
const {
  emptyEventForm,
  eventPayload,
  eventToForm,
  eventTypeLabel,
  eventStatusVariant,
} = await import('../utils/events');
const {
  emptyTeamForm,
  teamPayload,
  teamToForm,
  teamRoleLabel,
} = await import('../utils/teams');

describe('Phase 8 events and teams clients', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((mock) => mock.mockReset());
  });

  it('builds event requests with clean filters and encoded identifiers', () => {
    eventsApi.list({ q: 'sprint', sport: '', type: 'trial', page: 2, limit: 12 });
    eventsApi.mine({ status: 'draft', page: 1 });
    eventsApi.get('event/1');
    eventsApi.register('event/1');
    eventsApi.cancelRegistration('event/1');
    eventsApi.cancel('event/1', 'Weather');
    eventsApi.registrants('event/1', { status: 'registered', page: 1 });

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/events', {
      params: { q: 'sprint', type: 'trial', page: 2, limit: 12 },
    });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/events/mine', {
      params: { status: 'draft', page: 1 },
    });
    expect(apiMock.get).toHaveBeenCalledWith('/events/event%2F1');
    expect(apiMock.post).toHaveBeenCalledWith('/events/event%2F1/register');
    expect(apiMock.delete).toHaveBeenCalledWith('/events/event%2F1/registration');
    expect(apiMock.post).toHaveBeenCalledWith('/events/event%2F1/cancel', {
      reason: 'Weather',
    });
    expect(apiMock.get).toHaveBeenCalledWith('/events/event%2F1/registrants', {
      params: { status: 'registered', page: 1 },
    });
  });

  it('builds team membership and update requests', () => {
    teamsApi.discover({ q: 'track', sport: '', type: 'team', page: 1 });
    teamsApi.invite('team/1', { email: 'member@example.com', role: 'coach' });
    teamsApi.respond('team/1', true);
    teamsApi.removeMember('team/1', 'user/2');
    teamsApi.updateMemberRole('team/1', 'user/2', 'manager');
    teamsApi.postUpdate('team/1', 'Training moved');

    expect(apiMock.get).toHaveBeenCalledWith('/teams/discover', {
      params: { q: 'track', type: 'team', page: 1 },
    });
    expect(apiMock.post).toHaveBeenCalledWith('/teams/team%2F1/members', {
      email: 'member@example.com',
      role: 'coach',
    });
    expect(apiMock.post).toHaveBeenCalledWith('/teams/team%2F1/respond', {
      accept: true,
    });
    expect(apiMock.delete).toHaveBeenCalledWith(
      '/teams/team%2F1/members/user%2F2',
    );
    expect(apiMock.patch).toHaveBeenCalledWith(
      '/teams/team%2F1/members/user%2F2',
      { role: 'manager' },
    );
    expect(apiMock.post).toHaveBeenCalledWith('/teams/team%2F1/updates', {
      text: 'Training moved',
    });
  });

  it('converts event forms to API payloads and restores edit values', () => {
    const form = {
      ...emptyEventForm(),
      title: '  Sprint trials ',
      description: 'Open sprint trials for local athletes.',
      sport: ' Athletics ',
      type: 'trial',
      startAt: '2026-11-10T09:00',
      endAt: '2026-11-10T12:00',
      registrationDeadline: '2026-11-08T18:00',
      capacity: '32',
      allowWaitlist: false,
      venueName: ' City track ',
      address: '1 Stadium Way',
      city: 'Pune',
      region: 'Maharashtra',
      country: 'India',
    };

    const payload = eventPayload(form);
    expect(payload.title).toBe('Sprint trials');
    expect(payload.sport).toBe('Athletics');
    expect(payload.capacity).toBe(32);
    expect(payload.allowWaitlist).toBe(false);
    expect(payload.venue.name).toBe('City track');
    expect(payload.venue.location.city).toBe('Pune');
    expect(payload.startAt).toBe(new Date('2026-11-10T09:00').toISOString());

    const restored = eventToForm({
      ...payload,
      venue: payload.venue,
    });
    expect(restored.startAt).toBe('2026-11-10T09:00');
    expect(restored.endAt).toBe('2026-11-10T12:00');
    expect(restored.capacity).toBe('32');
    expect(restored.venueName).toBe('City track');
    expect(eventTypeLabel('trial')).toBe('Trial');
    expect(eventStatusVariant('cancelled')).toBe('danger');
  });

  it('converts team forms and exposes role labels', () => {
    const form = {
      ...emptyTeamForm(),
      name: ' Northside Track Club ',
      description: 'A local track and field training group.',
      sport: 'Athletics',
      type: 'training_group',
      privacy: 'private',
      city: 'Pune',
      region: 'Maharashtra',
      country: 'India',
    };
    const payload = teamPayload(form);

    expect(payload.name).toBe('Northside Track Club');
    expect(payload.type).toBe('training_group');
    expect(payload.privacy).toBe('private');
    expect(payload.location.city).toBe('Pune');

    const restored = teamToForm({
      ...payload,
      location: payload.location,
    });
    expect(restored.name).toBe('Northside Track Club');
    expect(restored.city).toBe('Pune');
    expect(teamRoleLabel('manager')).toBe('Manager');
  });
});

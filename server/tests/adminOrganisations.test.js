const request = require('supertest');
const {
  app,
  API,
  DEFAULT_PASSWORD,
  registerAndLogin,
  authHeader,
} = require('./helpers');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const Event = require('../models/Event');
const Team = require('../models/Team');

const DAY = 24 * 60 * 60 * 1000;

async function createAdmin(name = 'Organisation Admin') {
  const email = `org-admin-${Date.now()}-${Math.random().toString(16).slice(2, 7)}@example.com`;
  const admin = await User.create({
    name,
    email,
    passwordHash: 'temporary-password-hash',
    role: 'admin',
    onboardingCompleted: true,
    isEmailVerified: true,
  });
  await admin.setPassword(DEFAULT_PASSWORD);
  await admin.save();

  const login = await request(app)
    .post(`${API}/auth/login`)
    .send({ email, password: DEFAULT_PASSWORD });
  expect(login.status).toBe(200);
  return { admin, accessToken: login.body.data.accessToken, email };
}

async function onboardOrganization(overrides = {}) {
  const registered = await registerAndLogin({
    name: 'Northstar Academy Owner',
    role: 'recruiter',
  });
  const payload = {
    name: 'Northstar Athletics Academy',
    headline: 'Sprint development and youth pathway programmes',
    bio: 'A Pune-based academy supporting sprint athletes from grassroots to national competition.',
    organizationType: 'academy',
    location: { city: 'Pune', region: 'Maharashtra', country: 'India' },
    sports: ['Athletics'],
    foundedYear: 2015,
    activities: ['Sprint development', 'Youth pathway'],
    contact: {
      email: 'hello@northstar.example',
      phone: '+91 98765 43210',
      website: 'https://northstar.example',
    },
    ...overrides,
  };
  const response = await request(app)
    .post(`${API}/profiles/onboarding`)
    .set(authHeader(registered.accessToken))
    .send(payload);
  expect([200, 201]).toContain(response.status);

  const user = await User.findOne({ email: registered.payload.email });
  const organization = await Organization.findOne({ user: user._id });
  expect(organization).toBeTruthy();
  return { ...registered, user, organization };
}

async function createAthlete() {
  return User.create({
    name: 'Application Athlete',
    email: `org-athlete-${Date.now()}-${Math.random().toString(16).slice(2, 7)}@example.com`,
    passwordHash: 'temporary-password-hash',
    role: 'athlete',
    onboardingCompleted: true,
    isEmailVerified: true,
  });
}

describe('Admin organisation directory', () => {
  it('lists, searches, and filters organisations with activity counts', async () => {
    const owner = await onboardOrganization();
    const athlete = await createAthlete();
    const { accessToken: adminToken } = await createAdmin();

    const published = await Opportunity.create({
      publisher: owner.user._id,
      publisherName: owner.organization.name,
      publisherRole: 'recruiter',
      type: 'trials',
      title: 'Open sprint trials',
      description: 'Trials for the upcoming competitive sprint squad.',
      sport: 'Athletics',
      deadline: new Date(Date.now() + 14 * DAY),
      status: 'published',
    });
    await Opportunity.create({
      publisher: owner.user._id,
      publisherName: owner.organization.name,
      publisherRole: 'recruiter',
      type: 'scholarships',
      title: 'Academy scholarship draft',
      description: 'Draft scholarship opportunity for talented junior athletes.',
      sport: 'Athletics',
      deadline: new Date(Date.now() + 30 * DAY),
      status: 'draft',
    });
    await Application.create({
      opportunity: published._id,
      athlete: athlete._id,
      submittedSnapshot: { name: athlete.name },
      status: 'submitted',
    });
    await Team.create({
      owner: owner.user._id,
      ownerName: owner.organization.name,
      name: 'Northstar Sprint Squad',
      description: 'Competitive sprint squad training throughout the season.',
      sport: 'Athletics',
    });
    await Event.create({
      organizer: owner.user._id,
      organizerName: owner.organization.name,
      organizerRole: 'recruiter',
      title: 'Northstar open trials',
      description: 'Open trials for athletes seeking academy selection.',
      sport: 'Athletics',
      startAt: new Date(Date.now() + 21 * DAY),
      endAt: new Date(Date.now() + 21 * DAY + 3 * 60 * 60 * 1000),
      registrationDeadline: new Date(Date.now() + 18 * DAY),
      capacity: 120,
      status: 'published',
    });

    const list = await request(app)
      .get(`${API}/admin/organisations`)
      .query({ q: 'Northstar', organizationType: 'academy', status: 'active' })
      .set(authHeader(adminToken));

    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data.organizations).toHaveLength(1);
    const summary = list.body.data.organizations[0];
    expect(summary).toMatchObject({
      name: 'Northstar Athletics Academy',
      slug: owner.organization.slug,
      organizationType: 'academy',
      owner: {
        id: owner.user._id.toString(),
        email: owner.payload.email,
        status: 'active',
      },
    });
    expect(summary.counts.opportunities).toMatchObject({
      total: 2,
      byStatus: { published: 1, draft: 1 },
    });
    expect(summary.counts.applications).toMatchObject({
      total: 1,
      byStatus: { submitted: 1 },
    });
    expect(summary.counts.teams.total).toBe(1);
    expect(summary.counts.events.total).toBe(1);

    const byOwnerEmail = await request(app)
      .get(`${API}/admin/organisations`)
      .query({ q: owner.user.email })
      .set(authHeader(adminToken));
    expect(byOwnerEmail.body.meta.total).toBe(1);

    const wrongType = await request(app)
      .get(`${API}/admin/organisations`)
      .query({ organizationType: 'federation' })
      .set(authHeader(adminToken));
    expect(wrongType.body.meta.total).toBe(0);
  });

  it('returns organisation detail, respects owner status, and blocks non-admins', async () => {
    const owner = await onboardOrganization();
    const { accessToken: adminToken } = await createAdmin();
    await User.updateOne(
      { _id: owner.user._id },
      { $set: { isEmailVerified: true } },
    );

    await Opportunity.create({
      publisher: owner.user._id,
      publisherName: owner.organization.name,
      publisherRole: 'recruiter',
      type: 'camps',
      title: 'Winter sprint camp',
      description: 'A focused winter camp for sprint technique and conditioning.',
      sport: 'Athletics',
      deadline: new Date(Date.now() + 12 * DAY),
      status: 'published',
    });

    const detail = await request(app)
      .get(`${API}/admin/organisations/${owner.organization._id}`)
      .set(authHeader(adminToken));

    expect(detail.status).toBe(200);
    expect(detail.body.data.organization).toMatchObject({
      id: owner.organization._id.toString(),
      name: 'Northstar Athletics Academy',
      organizationType: 'academy',
      foundedYear: 2015,
      owner: {
        email: owner.payload.email,
        emailVerified: true,
      },
    });
    expect(detail.body.data.organization.activities).toContain('Sprint development');
    expect(detail.body.data.organization.contact).toMatchObject({
      email: 'hello@northstar.example',
      website: 'https://northstar.example',
    });
    expect(detail.body.data.recentOpportunities).toHaveLength(1);
    expect(detail.body.data.recentOpportunities[0].title).toBe('Winter sprint camp');

    await request(app)
      .patch(`${API}/admin/users/${owner.user._id}/status`)
      .set(authHeader(adminToken))
      .send({ status: 'restricted', reason: 'Organisation ownership under review.' })
      .expect(200);

    const restricted = await request(app)
      .get(`${API}/admin/organisations`)
      .query({ status: 'restricted' })
      .set(authHeader(adminToken));
    expect(restricted.body.meta.total).toBe(1);
    expect(restricted.body.data.organizations[0].owner.status).toBe('restricted');

    const forbidden = await request(app)
      .get(`${API}/admin/organisations`)
      .set(authHeader(owner.accessToken));
    expect(forbidden.status).toBe(403);

    const missing = await request(app)
      .get(`${API}/admin/organisations/not-a-valid-id`)
      .set(authHeader(adminToken));
    expect(missing.status).toBe(404);
  });
});

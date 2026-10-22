const request = require('supertest');
const { app, API, registerAndLogin, authHeader } = require('./helpers');
const Achievement = require('../models/Achievement');
const Notification = require('../models/Notification');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { expireOpportunities } = require('../jobs/expireOpportunities');

const DAY = 24 * 60 * 60 * 1000;

function futureDate(days = 30) {
  return new Date(Date.now() + days * DAY).toISOString();
}

function athleteProfile(overrides = {}) {
  return {
    headline: 'National-level sprint athlete',
    bio: 'Sprint athlete with consistent national competition experience.',
    location: { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
    sports: ['Athletics'],
    positions: ['100m'],
    level: 'professional',
    ageCategory: 'senior',
    competitionLevel: 'national',
    experienceYears: 6,
    currentTeam: 'Mumbai Striders',
    availableForTrials: true,
    ...overrides,
  };
}

function opportunityBody(overrides = {}) {
  return {
    type: 'trials',
    title: 'National sprint trials',
    description: 'Open trials for sprint athletes aiming to join the national training group.',
    sport: 'Athletics',
    positions: ['100m'],
    positionsAvailable: 2,
    deadline: futureDate(),
    location: { city: 'Pune', country: 'India' },
    requiredDocuments: ['Medical certificate'],
    eligibility: {
      levels: ['professional'],
      minExperienceYears: 5,
    },
    ...overrides,
  };
}

async function onboardAthlete(overrides = {}) {
  const registered = await registerAndLogin({
    name: overrides.name || 'Phase Four Athlete',
    role: 'athlete',
  });
  const response = await request(app)
    .post(`${API}/profiles/onboarding`)
    .set(authHeader(registered.accessToken))
    .send(athleteProfile(overrides.profile));

  expect([200, 201]).toContain(response.status);
  return { ...registered, profile: response.body.data.profile };
}

async function createPublishedOpportunity(accessToken, overrides = {}) {
  const created = await request(app)
    .post(`${API}/opportunities`)
    .set(authHeader(accessToken))
    .send(opportunityBody(overrides));
  expect(created.status).toBe(201);

  const published = await request(app)
    .post(`${API}/opportunities/${created.body.data.opportunity.id}/publish`)
    .set(authHeader(accessToken));
  expect(published.status).toBe(200);
  return published.body.data.opportunity;
}

async function uploadMedicalDocument(accessToken) {
  const response = await request(app)
    .post(`${API}/applications/documents`)
    .set(authHeader(accessToken))
    .attach('document', Buffer.from('%PDF-1.4\nphase four test document\n'), {
      filename: 'medical-certificate.pdf',
      contentType: 'application/pdf',
    });

  expect(response.status).toBe(201);
  return { ...response.body.data.document, label: 'Medical certificate' };
}

describe('Phase 4 opportunities and applications', () => {
  it('lets publishers manage drafts and athletes discover, save, and close opportunities', async () => {
    const recruiter = await registerAndLogin({ name: 'Trial Recruiter', role: 'recruiter' });
    const athlete = await onboardAthlete({ name: 'Saving Athlete' });

    const created = await request(app)
      .post(`${API}/opportunities`)
      .set(authHeader(recruiter.accessToken))
      .send(opportunityBody());
    expect(created.status).toBe(201);
    const opportunity = created.body.data.opportunity;
    expect(opportunity.status).toBe('draft');
    expect(opportunity.publisherName).toBe('Trial Recruiter');

    const hidden = await request(app)
      .get(`${API}/opportunities`)
      .set(authHeader(athlete.accessToken));
    expect(hidden.body.data.opportunities).toHaveLength(0);

    const published = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/publish`)
      .set(authHeader(recruiter.accessToken));
    expect(published.status).toBe(200);

    const listed = await request(app)
      .get(`${API}/opportunities?q=sprint&type=trials&sport=Athletics`)
      .set(authHeader(athlete.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.meta.total).toBe(1);
    expect(listed.body.data.opportunities[0]).toMatchObject({
      id: opportunity.id,
      saved: false,
      isOwner: false,
    });

    const saved = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/save`)
      .set(authHeader(athlete.accessToken));
    expect(saved.status).toBe(201);

    const savedList = await request(app)
      .get(`${API}/opportunities/saved`)
      .set(authHeader(athlete.accessToken));
    expect(savedList.body.meta.total).toBe(1);
    expect(savedList.body.data.opportunities[0].saved).toBe(true);

    const detail = await request(app)
      .get(`${API}/opportunities/${opportunity.id}`)
      .set(authHeader(athlete.accessToken));
    expect(detail.body.data.opportunity.saved).toBe(true);

    const removed = await request(app)
      .delete(`${API}/opportunities/${opportunity.id}/save`)
      .set(authHeader(athlete.accessToken));
    expect(removed.body.data.saved).toBe(false);

    const otherCoach = await registerAndLogin({ name: 'Other Coach', role: 'coach' });
    const forbidden = await request(app)
      .patch(`${API}/opportunities/${opportunity.id}`)
      .set(authHeader(otherCoach.accessToken))
      .send({ title: 'Hijacked title' });
    expect(forbidden.status).toBe(403);

    const closed = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/close`)
      .set(authHeader(recruiter.accessToken));
    expect(closed.body.data.opportunity.status).toBe('closed');

    const afterClose = await request(app)
      .get(`${API}/opportunities`)
      .set(authHeader(athlete.accessToken));
    expect(afterClose.body.meta.total).toBe(0);
  });

  it('validates eligibility, required documents, duplicate applications, and status history', async () => {
    const recruiter = await registerAndLogin({ name: 'Eligibility Recruiter', role: 'recruiter' });
    const athlete = await onboardAthlete({ name: 'Eligible Athlete' });
    const opportunity = await createPublishedOpportunity(recruiter.accessToken, {
      eligibility: {
        levels: ['professional'],
        ageCategories: ['senior'],
        minExperienceYears: 5,
        requiresVerifiedAchievement: true,
      },
    });

    const withoutDocuments = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/apply`)
      .set(authHeader(athlete.accessToken))
      .send({ coverNote: 'I would like to be considered.' });
    expect(withoutDocuments.status).toBe(409);
    expect(withoutDocuments.body.code).toBe('APPLICATION_NOT_ELIGIBLE');
    expect(withoutDocuments.body.message).toContain('Medical certificate');

    const document = await uploadMedicalDocument(athlete.accessToken);

    const withoutAchievement = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/apply`)
      .set(authHeader(athlete.accessToken))
      .send({ documents: [document] });
    expect(withoutAchievement.status).toBe(409);
    expect(withoutAchievement.body.message).toContain('verified achievement');

    const user = await User.findOne({ email: athlete.payload.email });
    await Achievement.create({
      user: user._id,
      title: 'National sprint finalist',
      sport: 'Athletics',
      competition: 'National Championships',
      result: 'Finalist',
      verificationStatus: 'verified',
    });

    const applied = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/apply`)
      .set(authHeader(athlete.accessToken))
      .send({ coverNote: 'I would like to be considered.', documents: [document] });
    expect(applied.status).toBe(201);
    const application = applied.body.data.application;
    expect(application.status).toBe('submitted');
    expect(application.submittedSnapshot.name).toBe('Eligible Athlete');
    expect(application.submittedSnapshot.verifiedAchievementCount).toBeGreaterThanOrEqual(1);
    expect(application.statusHistory[0].status).toBe('submitted');

    const duplicate = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/apply`)
      .set(authHeader(athlete.accessToken))
      .send({ documents: [document] });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('APPLICATION_DUPLICATE');

    const publisherNotifications = await Notification.countDocuments({
      user: recruiter.loginResponse.body.data.user.id,
      type: 'application_received',
    });
    expect(publisherNotifications).toBe(1);

    const applicants = await request(app)
      .get(`${API}/opportunities/${opportunity.id}/applicants`)
      .set(authHeader(recruiter.accessToken));
    expect(applicants.status).toBe(200);
    expect(applicants.body.meta.total).toBe(1);
    expect(applicants.body.data.applications[0].athlete.name).toBe('Eligible Athlete');

    const otherCoach = await registerAndLogin({ name: 'Unrelated Coach', role: 'coach' });
    const forbiddenApplicants = await request(app)
      .get(`${API}/opportunities/${opportunity.id}/applicants`)
      .set(authHeader(otherCoach.accessToken));
    expect(forbiddenApplicants.status).toBe(403);

    const shortlisted = await request(app)
      .post(`${API}/applications/${application.id}/shortlist`)
      .set(authHeader(recruiter.accessToken));
    expect(shortlisted.status).toBe(200);
    expect(shortlisted.body.data.application.status).toBe('shortlisted');
    expect(shortlisted.body.data.application.statusHistory).toHaveLength(2);

    const accepted = await request(app)
      .patch(`${API}/applications/${application.id}/status`)
      .set(authHeader(recruiter.accessToken))
      .send({ status: 'accepted', note: 'Offer sent.' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.application.decidedAt).toBeTruthy();

    const invalidTransition = await request(app)
      .patch(`${API}/applications/${application.id}/status`)
      .set(authHeader(recruiter.accessToken))
      .send({ status: 'rejected' });
    expect(invalidTransition.status).toBe(409);
    expect(invalidTransition.body.code).toBe('APPLICATION_STATUS_INVALID');

    const athleteNotifications = await request(app)
      .get(`${API}/notifications`)
      .set(authHeader(athlete.accessToken));
    expect(athleteNotifications.status).toBe(200);
    expect(athleteNotifications.body.meta.total).toBe(2);
    expect(athleteNotifications.body.data.notifications[0].readAt).toBeNull();

    const unread = await request(app)
      .get(`${API}/notifications/unread-count`)
      .set(authHeader(athlete.accessToken));
    expect(unread.body.data.count).toBe(2);

    const readAll = await request(app)
      .post(`${API}/notifications/read-all`)
      .set(authHeader(athlete.accessToken));
    expect(readAll.status).toBe(200);

    const unreadAfter = await request(app)
      .get(`${API}/notifications/unread-count`)
      .set(authHeader(athlete.accessToken));
    expect(unreadAfter.body.data.count).toBe(0);
  });

  it('lets athletes withdraw applications and notifies the publisher', async () => {
    const recruiter = await registerAndLogin({ name: 'Withdraw Recruiter', role: 'recruiter' });
    const athlete = await onboardAthlete({ name: 'Withdrawing Athlete' });
    const opportunity = await createPublishedOpportunity(recruiter.accessToken, {
      requiredDocuments: [],
      eligibility: {},
    });

    const applied = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/apply`)
      .set(authHeader(athlete.accessToken))
      .send({});
    expect(applied.status).toBe(201);
    const application = applied.body.data.application;

    const withdrawn = await request(app)
      .post(`${API}/applications/${application.id}/withdraw`)
      .set(authHeader(athlete.accessToken));
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.application.status).toBe('withdrawn');

    const secondWithdrawal = await request(app)
      .post(`${API}/applications/${application.id}/withdraw`)
      .set(authHeader(athlete.accessToken));
    expect(secondWithdrawal.status).toBe(409);

    const notifications = await request(app)
      .get(`${API}/notifications`)
      .set(authHeader(recruiter.accessToken));
    expect(
      notifications.body.data.notifications.some(
        (notification) => notification.type === 'application_withdrawn',
      ),
    ).toBe(true);
  });

  it('expires published opportunities past their deadline and blocks applications', async () => {
    const recruiter = await registerAndLogin({ name: 'Expiry Recruiter', role: 'coach' });
    const athlete = await onboardAthlete({ name: 'Expiry Athlete' });
    const opportunity = await createPublishedOpportunity(recruiter.accessToken, {
      requiredDocuments: [],
      eligibility: {},
    });

    await Opportunity.updateOne(
      { _id: opportunity.id },
      { $set: { deadline: new Date(Date.now() - DAY) } },
    );

    const result = await expireOpportunities();
    expect(result.expired).toBe(1);

    const stored = await Opportunity.findById(opportunity.id);
    expect(stored.status).toBe('expired');
    expect(stored.expiredAt).toBeTruthy();

    const list = await request(app)
      .get(`${API}/opportunities`)
      .set(authHeader(athlete.accessToken));
    expect(list.body.meta.total).toBe(0);

    const apply = await request(app)
      .post(`${API}/opportunities/${opportunity.id}/apply`)
      .set(authHeader(athlete.accessToken))
      .send({});
    expect(apply.status).toBe(409);
    expect(apply.body.code).toBe('OPPORTUNITY_NOT_ACCEPTING');
  });

  it('returns real role dashboard data', async () => {
    const recruiter = await registerAndLogin({ name: 'Dashboard Recruiter', role: 'recruiter' });
    const athlete = await onboardAthlete({ name: 'Dashboard Athlete' });
    const opportunity = await createPublishedOpportunity(recruiter.accessToken, {
      requiredDocuments: [],
      eligibility: {},
    });

    await request(app)
      .post(`${API}/opportunities/${opportunity.id}/save`)
      .set(authHeader(athlete.accessToken));
    await request(app)
      .post(`${API}/opportunities/${opportunity.id}/apply`)
      .set(authHeader(athlete.accessToken))
      .send({});

    const athleteDashboard = await request(app)
      .get(`${API}/dashboard`)
      .set(authHeader(athlete.accessToken));
    expect(athleteDashboard.status).toBe(200);
    expect(athleteDashboard.body.data.dashboard.stats.savedOpportunities).toBe(1);
    expect(athleteDashboard.body.data.dashboard.stats.applications).toBe(1);
    expect(athleteDashboard.body.data.dashboard.recommendedOpportunities).toHaveLength(1);

    const publisherDashboard = await request(app)
      .get(`${API}/dashboard`)
      .set(authHeader(recruiter.accessToken));
    expect(publisherDashboard.status).toBe(200);
    expect(publisherDashboard.body.data.dashboard.stats.activeOpportunities).toBe(1);
    expect(publisherDashboard.body.data.dashboard.stats.totalApplications).toBe(1);
    expect(publisherDashboard.body.data.dashboard.recentApplications[0].athlete.name).toBe(
      'Dashboard Athlete',
    );
  });
});

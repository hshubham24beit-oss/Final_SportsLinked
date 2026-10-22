const request = require('supertest');
const {
  app,
  API,
  DEFAULT_PASSWORD,
  registerAndLogin,
  authHeader,
} = require('./helpers');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Notification = require('../models/Notification');
const VerificationRequest = require('../models/VerificationRequest');
const { expireVerificationRequests } = require('../services/verification.service');

const DAY = 24 * 60 * 60 * 1000;

function athleteProfile(overrides = {}) {
  return {
    headline: 'Verified national sprint athlete',
    bio: 'Sprint athlete with national competition experience and verified results.',
    location: { city: 'Pune', region: 'Maharashtra', country: 'India' },
    sports: ['Athletics'],
    positions: ['100m'],
    level: 'professional',
    ageCategory: 'senior',
    competitionLevel: 'national',
    experienceYears: 7,
    ...overrides,
  };
}

async function onboardAthlete(name = 'Phase Five Athlete', overrides = {}) {
  const registered = await registerAndLogin({ name, role: 'athlete' });
  const response = await request(app)
    .post(`${API}/profiles/onboarding`)
    .set(authHeader(registered.accessToken))
    .send(athleteProfile(overrides));
  expect([200, 201]).toContain(response.status);
  return { ...registered, profile: response.body.data.profile };
}

async function createAdmin(name = 'Verification Admin') {
  const email = `phase5-admin-${Date.now()}-${Math.random().toString(16).slice(2, 7)}@example.com`;
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

async function createAchievement(accessToken, overrides = {}) {
  const response = await request(app)
    .post(`${API}/achievements`)
    .set(authHeader(accessToken))
    .send({
      title: 'National 100m silver medal',
      sport: 'Athletics',
      competition: 'National Athletics Championship',
      result: 'Silver medal',
      date: new Date(Date.now() - 30 * DAY).toISOString(),
      ...overrides,
    });
  expect(response.status).toBe(201);
  return response.body.data.achievement;
}

async function uploadEvidence(accessToken, label = 'Official result certificate') {
  const response = await request(app)
    .post(`${API}/verifications/evidence`)
    .set(authHeader(accessToken))
    .field('label', label)
    .attach('evidence', Buffer.from('%PDF-1.4\nphase five private evidence\n'), {
      filename: 'result-certificate.pdf',
      contentType: 'application/pdf',
    });
  expect(response.status).toBe(201);
  return response.body.data.evidence;
}

async function submitAchievementVerification(accessToken, achievementId, evidenceId) {
  const response = await request(app)
    .post(`${API}/verifications`)
    .set(authHeader(accessToken))
    .send({
      type: 'achievement',
      achievementId,
      statement: 'This result was published by the national federation.',
      evidenceIds: [evidenceId],
      officialLinks: [
        {
          url: 'https://example.com/results/national-championship',
          label: 'Official results',
        },
      ],
    });
  expect(response.status).toBe(201);
  return response.body.data.request;
}

describe('Phase 5 verification, evidence, reports, blocks, and administration', () => {
  it('keeps verification evidence private and approves only the selected achievement', async () => {
    const athlete = await onboardAthlete('Evidence Athlete');
    const otherAthlete = await onboardAthlete('Unrelated Athlete');
    const { accessToken: adminToken } = await createAdmin();

    const verifiedAchievement = await createAchievement(athlete.accessToken);
    const unverifiedAchievement = await createAchievement(athlete.accessToken, {
      title: 'State relay bronze medal',
      result: 'Bronze medal',
    });
    const evidence = await uploadEvidence(athlete.accessToken);
    const verification = await submitAchievementVerification(
      athlete.accessToken,
      verifiedAchievement.id,
      evidence.id,
    );

    expect(verification.status).toBe('requested');
    expect(verification.evidence[0]).toMatchObject({
      id: evidence.id,
      originalName: 'result-certificate.pdf',
      mimeType: 'application/pdf',
    });
    expect(verification.evidence[0].storage).toBeUndefined();
    expect(verification.evidence[0].publicId).toBeUndefined();

    const ownList = await request(app)
      .get(`${API}/verifications`)
      .set(authHeader(athlete.accessToken));
    expect(ownList.status).toBe(200);
    const pendingAchievement = ownList.body.data.achievements.find(
      (item) => item.id === verifiedAchievement.id,
    );
    expect(pendingAchievement).toMatchObject({
      verificationStatus: 'pending',
      requestStatus: 'requested',
    });

    const unauthorizedQueue = await request(app)
      .get(`${API}/admin/verifications`)
      .set(authHeader(athlete.accessToken));
    expect(unauthorizedQueue.status).toBe(403);

    const queue = await request(app)
      .get(`${API}/admin/verifications?status=requested`)
      .set(authHeader(adminToken));
    expect(queue.status).toBe(200);
    expect(queue.body.data.requests).toHaveLength(1);
    expect(queue.body.data.requests[0].evidence[0].storage).toBeUndefined();

    const forbiddenEvidence = await request(app)
      .get(
        `${API}/verifications/${verification.id}/evidence/${evidence.id}/url`,
      )
      .set(authHeader(otherAthlete.accessToken));
    expect(forbiddenEvidence.status).toBe(403);
    expect(forbiddenEvidence.body.code).toBe('EVIDENCE_FORBIDDEN');

    const ownerEvidence = await request(app)
      .get(
        `${API}/verifications/${verification.id}/evidence/${evidence.id}/url`,
      )
      .set(authHeader(athlete.accessToken));
    expect(ownerEvidence.status).toBe(200);
    expect(ownerEvidence.body.data.evidence.url).toContain('/api/v1/verifications/evidence/');

    const proofPath = new URL(ownerEvidence.body.data.evidence.url).pathname;
    const proofDownload = await request(app).get(proofPath);
    expect(proofDownload.status).toBe(200);
    expect(proofDownload.headers['content-type']).toContain('application/pdf');
    expect(proofDownload.headers['cache-control']).toContain('no-store');

    const adminEvidence = await request(app)
      .get(
        `${API}/admin/verifications/${verification.id}/evidence/${evidence.id}/url`,
      )
      .set(authHeader(adminToken));
    expect(adminEvidence.status).toBe(200);

    const claim = await request(app)
      .post(`${API}/admin/verifications/${verification.id}/claim`)
      .set(authHeader(adminToken));
    expect(claim.status).toBe(200);
    expect(claim.body.data.request.status).toBe('under_review');

    const decision = await request(app)
      .post(`${API}/admin/verifications/${verification.id}/decision`)
      .set(authHeader(adminToken))
      .send({
        decision: 'approved',
        reason: 'The certificate matches the official federation result.',
      });
    expect(decision.status).toBe(200);
    expect(decision.body.data.request).toMatchObject({
      status: 'verified',
      decision: 'approved',
    });
    expect(decision.body.data.request.audit.map((entry) => entry.action)).toEqual([
      'submitted',
      'evidence_accessed',
      'claimed',
      'approved',
    ]);

    const [verifiedRecord, untouchedRecord] = await Promise.all([
      Achievement.findById(verifiedAchievement.id),
      Achievement.findById(unverifiedAchievement.id),
    ]);
    expect(verifiedRecord.verificationStatus).toBe('verified');
    expect(verifiedRecord.verifiedAt).toBeInstanceOf(Date);
    expect(untouchedRecord.verificationStatus).toBe('unverified');

    const publicProfile = await request(app).get(
      `${API}/profiles/${athlete.profile.slug}`,
    );
    expect(publicProfile.status).toBe(200);
    const publicAchievements = publicProfile.body.data.profile.achievements;
    expect(
      publicAchievements.find((item) => item.id === verifiedAchievement.id).verified,
    ).toBe(true);
    expect(
      publicAchievements.find((item) => item.id === unverifiedAchievement.id).verified,
    ).toBe(false);

    const athleteUser = await User.findOne({ email: athlete.payload.email });
    const notification = await Notification.findOne({
      user: athleteUser._id,
      type: 'verification_decision',
    });
    expect(notification).toBeTruthy();
  });

  it('expires verified requests and removes the affected achievement badge', async () => {
    const athlete = await onboardAthlete('Expiry Athlete');
    const { accessToken: adminToken } = await createAdmin('Expiry Admin');
    const achievement = await createAchievement(athlete.accessToken);
    const evidence = await uploadEvidence(athlete.accessToken);
    const verification = await submitAchievementVerification(
      athlete.accessToken,
      achievement.id,
      evidence.id,
    );

    const decision = await request(app)
      .post(`${API}/admin/verifications/${verification.id}/decision`)
      .set(authHeader(adminToken))
      .send({
        decision: 'approved',
        reason: 'Verified against the official results archive.',
        expiresAt: new Date(Date.now() + 2 * DAY).toISOString(),
      });
    expect(decision.status).toBe(200);

    await VerificationRequest.updateOne(
      { _id: verification.id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    const result = await expireVerificationRequests();
    expect(result.expired).toBe(1);

    const expired = await VerificationRequest.findById(verification.id);
    expect(expired.status).toBe('expired');
    const expiredAchievement = await Achievement.findById(achievement.id);
    expect(expiredAchievement.verificationStatus).toBe('expired');

    const user = await User.findOne({ email: athlete.payload.email });
    expect(
      await Notification.exists({ user: user._id, type: 'verification_expired' }),
    ).toBeTruthy();
  });

  it('publishes identity verification separately from achievements', async () => {
    const athlete = await onboardAthlete('Identity Athlete');
    const { accessToken: adminToken } = await createAdmin('Identity Admin');
    const evidence = await uploadEvidence(athlete.accessToken, 'Government identity document');

    const submitted = await request(app)
      .post(`${API}/verifications`)
      .set(authHeader(athlete.accessToken))
      .send({
        type: 'identity',
        statement: 'Government identity document for account ownership.',
        evidenceIds: [evidence.id],
      });
    expect(submitted.status).toBe(201);
    expect(submitted.body.data.request.type).toBe('identity');

    const approved = await request(app)
      .post(`${API}/admin/verifications/${submitted.body.data.request.id}/decision`)
      .set(authHeader(adminToken))
      .send({
        decision: 'approved',
        reason: 'Identity document matches the account holder.',
      });
    expect(approved.status).toBe(200);
    expect(approved.body.data.request.expiresAt).toBeTruthy();

    const profile = await request(app).get(`${API}/profiles/${athlete.profile.slug}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.profile.verifications.identity).toMatchObject({
      requestId: submitted.body.data.request.id,
    });
    expect(profile.body.data.profile.verifications.qualifications).toEqual([]);
    expect(profile.body.data.profile.achievements).toEqual([]);
  });

  it('handles reports, blocking, and admin account restrictions', async () => {
    const reporter = await onboardAthlete('Reporting Athlete');
    const target = await onboardAthlete('Reported Athlete');
    const targetUser = await User.findOne({ email: target.payload.email });
    const { accessToken: adminToken } = await createAdmin('Moderation Admin');

    const report = await request(app)
      .post(`${API}/reports`)
      .set(authHeader(reporter.accessToken))
      .send({
        targetType: 'user',
        targetId: targetUser._id.toString(),
        reason: 'impersonation',
        details: 'This account is using another athlete’s identity.',
      });
    expect(report.status).toBe(201);
    expect(report.body.data.report.status).toBe('open');

    const duplicate = await request(app)
      .post(`${API}/reports`)
      .set(authHeader(reporter.accessToken))
      .send({
        targetType: 'user',
        targetId: targetUser._id.toString(),
        reason: 'impersonation',
      });
    expect(duplicate.status).toBe(409);

    const adminReports = await request(app)
      .get(`${API}/admin/reports?status=open`)
      .set(authHeader(adminToken));
    expect(adminReports.status).toBe(200);
    expect(adminReports.body.data.reports).toHaveLength(1);
    expect(adminReports.body.data.statusCounts.open).toBe(1);

    const resolved = await request(app)
      .patch(`${API}/admin/reports/${report.body.data.report.id}`)
      .set(authHeader(adminToken))
      .send({
        status: 'resolved',
        resolution: 'Identity documents reviewed with the account holder.',
      });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.report.status).toBe('resolved');

    const resolvedQueue = await request(app)
      .get(`${API}/admin/reports?status=resolved`)
      .set(authHeader(adminToken));
    expect(resolvedQueue.body.data.statusCounts.resolved).toBe(1);

    const blocked = await request(app)
      .post(`${API}/blocks`)
      .set(authHeader(reporter.accessToken))
      .send({
        userId: targetUser._id.toString(),
        reason: 'Impersonation concerns',
      });
    expect(blocked.status).toBe(201);

    const hiddenProfile = await request(app)
      .get(`${API}/profiles/${target.profile.slug}`)
      .set(authHeader(reporter.accessToken));
    expect(hiddenProfile.status).toBe(404);

    const blockList = await request(app)
      .get(`${API}/blocks`)
      .set(authHeader(reporter.accessToken));
    expect(blockList.body.data.blocked).toHaveLength(1);
    expect(blockList.body.data.blocked[0].user.id).toBe(targetUser._id.toString());

    const restricted = await request(app)
      .patch(`${API}/admin/users/${targetUser._id}/status`)
      .set(authHeader(adminToken))
      .send({
        status: 'restricted',
        reason: 'Repeated impersonation reports under review.',
      });
    expect(restricted.status).toBe(200);
    expect(restricted.body.data.user.status).toBe('restricted');

    const forbiddenPost = await request(app)
      .post(`${API}/achievements`)
      .set(authHeader(target.accessToken))
      .send({
        title: 'Blocked achievement',
        sport: 'Athletics',
      });
    expect(forbiddenPost.status).toBe(403);
    expect(forbiddenPost.body.code).toBe('ACCOUNT_RESTRICTED');

    const reactivated = await request(app)
      .patch(`${API}/admin/users/${targetUser._id}/status`)
      .set(authHeader(adminToken))
      .send({
        status: 'active',
        reason: 'Appeal accepted and identity confirmed.',
      });
    expect(reactivated.status).toBe(200);

    const restoredPost = await request(app)
      .post(`${API}/achievements`)
      .set(authHeader(target.accessToken))
      .send({
        title: 'Restored achievement',
        sport: 'Athletics',
      });
    expect(restoredPost.status).toBe(201);

    const unblocked = await request(app)
      .delete(`${API}/blocks/${targetUser._id}`)
      .set(authHeader(reporter.accessToken));
    expect(unblocked.status).toBe(200);
    expect(
      (await request(app)
        .get(`${API}/profiles/${target.profile.slug}`)
        .set(authHeader(reporter.accessToken))).status,
    ).toBe(200);
  });
});

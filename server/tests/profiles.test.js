const request = require('supertest');
const fs = require('fs/promises');
const {
  app,
  API,
  DEFAULT_PASSWORD,
  registerAndLogin,
  authHeader,
} = require('./helpers');
const AthleteProfile = require('../models/AthleteProfile');
const CoachProfile = require('../models/CoachProfile');
const Organization = require('../models/Organization');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const config = require('../config/env');
const { calculateProfileCompletion, getCompletionBreakdown } = require('../utils/profileCompletion');

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function athletePayload(overrides = {}) {
  return {
    headline: '100m and 200m sprinter',
    bio: 'National-level sprinter focused on breaking personal records and competing internationally.',
    location: {
      city: 'Mumbai',
      region: 'Maharashtra',
      country: 'India',
      latitude: 19.076,
      longitude: 72.8777,
    },
    contact: {
      email: 'asha@example.com',
      phone: '+91 90000 00000',
      website: 'https://asha.example.com',
      preferences: { showEmail: false, allowMessages: true },
    },
    visibility: {
      bio: 'public',
      location: 'public',
      sports: 'public',
      career: 'public',
      personalBests: 'public',
      statistics: 'public',
      achievements: 'public',
      media: 'public',
      contact: 'connections',
    },
    sports: ['Athletics'],
    positions: ['100m', '200m'],
    level: 'professional',
    experienceYears: 6,
    currentTeam: 'Mumbai Striders',
    careerHistory: [
      {
        organization: 'Mumbai Striders',
        role: 'Sprint athlete',
        startDate: '2022-01-01',
        current: true,
      },
    ],
    personalBests: [
      { event: '100m', result: '10.81', unit: 's', competition: 'State Championships' },
    ],
    preferredOpportunities: ['trials', 'contracts'],
    availableForTrials: true,
    ...overrides,
  };
}

function coachPayload(overrides = {}) {
  return {
    headline: 'Strength and sprint coach',
    bio: 'Certified coach working with emerging sprint and jump athletes.',
    location: { city: 'Pune', country: 'India', latitude: 18.5204, longitude: 73.8567 },
    sports: ['Athletics'],
    specializations: ['Sprint training', 'Strength and conditioning'],
    experienceYears: 9,
    currentOrganization: 'Pune Athletics Academy',
    availability: 'open_to_roles',
    certifications: [{ name: 'Level 2 Athletics Coach', issuer: 'National Federation', year: 2020 }],
    careerHistory: [{ organization: 'Pune Athletics Academy', role: 'Head coach', current: true }],
    ...overrides,
  };
}

function organizationPayload(overrides = {}) {
  return {
    name: 'Pune Athletics Academy',
    headline: 'Developing the next generation of track athletes',
    bio: 'A community-focused athletics academy with track and field programmes.',
    organizationType: 'academy',
    sports: ['Athletics'],
    foundedYear: 2012,
    activities: ['Youth sprint programme', 'Athlete scholarships'],
    location: { city: 'Pune', country: 'India' },
    contact: { email: 'hello@puneathletics.example', website: 'https://puneathletics.example' },
    ...overrides,
  };
}

async function onboard(accessToken, payload) {
  return request(app)
    .post(`${API}/profiles/onboarding`)
    .set(authHeader(accessToken))
    .send(payload);
}

describe('Profile completion', () => {
  it('calculates weighted completion between 0 and 100', () => {
    expect(calculateProfileCompletion('athlete', {})).toBe(0);
    expect(calculateProfileCompletion('unknown', {})).toBe(0);

    const full = {
      bio: 'Bio',
      avatar: { url: 'https://example.com/avatar.jpg' },
      headline: 'Headline',
      location: { city: 'Mumbai', coordinates: { coordinates: [72.8, 19.0] } },
      sports: ['Athletics'],
      level: 'amateur',
      experienceYears: 1,
      currentTeam: 'Team',
      careerHistory: [{}],
      personalBests: [{}],
      preferredOpportunities: ['trials'],
      availableForTrials: false,
    };

    expect(calculateProfileCompletion('athlete', full)).toBe(100);
    const breakdown = getCompletionBreakdown('athlete', full);
    expect(breakdown.total).toBe(100);
    expect(breakdown.missing).toEqual([]);
  });
});

describe('Role-specific onboarding', () => {
  it('creates an athlete profile, sets onboarding state, and calculates completion', async () => {
    const { accessToken, payload } = await registerAndLogin({
      name: 'Asha Sprint',
      role: 'athlete',
    });

    const response = await onboard(accessToken, athletePayload());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.profile).toMatchObject({
      slug: 'asha-sprint',
      role: 'athlete',
      level: 'professional',
      currentTeam: 'Mumbai Striders',
      availableForTrials: true,
    });
    expect(response.body.data.profile.location).toMatchObject({
      city: 'Mumbai',
      latitude: 19.076,
      longitude: 72.8777,
    });
    expect(response.body.data.profile.completion.score).toBe(92);
    expect(response.body.data.user.onboardingCompleted).toBe(true);

    const storedUser = await User.findOne({ email: payload.email });
    expect(storedUser.onboardingCompleted).toBe(true);
    expect(await AthleteProfile.countDocuments({ user: storedUser._id })).toBe(1);
  });

  it('creates coach profiles with coaching-specific fields', async () => {
    const { accessToken } = await registerAndLogin({ name: 'Coach Rao', role: 'coach' });

    const response = await onboard(accessToken, coachPayload());

    expect(response.status).toBe(200);
    expect(response.body.data.profile).toMatchObject({
      role: 'coach',
      availability: 'open_to_roles',
      currentOrganization: 'Pune Athletics Academy',
    });
    expect(response.body.data.profile.specializations).toHaveLength(2);
    expect(response.body.data.profile.completion.score).toBe(92);
  });

  it('creates organization profiles for recruiter accounts', async () => {
    const { accessToken } = await registerAndLogin({
      name: 'Academy Owner',
      role: 'recruiter',
    });

    const response = await onboard(accessToken, organizationPayload());

    expect(response.status).toBe(200);
    expect(response.body.data.profile).toMatchObject({
      role: 'recruiter',
      name: 'Pune Athletics Academy',
      organizationType: 'academy',
      foundedYear: 2012,
    });
    expect(await Organization.countDocuments()).toBe(1);
  });

  it('rejects incomplete onboarding and does not create a profile', async () => {
    const { accessToken } = await registerAndLogin({ name: 'Incomplete Athlete', role: 'athlete' });

    const response = await onboard(accessToken, {
      headline: 'Sprinter',
      bio: 'Short bio',
      sports: ['Athletics'],
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('ONBOARDING_INCOMPLETE');
    expect(response.body.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(['location.city', 'experienceYears']),
    );
    expect(await AthleteProfile.countDocuments()).toBe(0);
  });

  it('generates unique slugs for accounts with the same name', async () => {
    const first = await registerAndLogin({ name: 'Same Name', role: 'athlete' });
    const second = await registerAndLogin({ name: 'Same Name', role: 'athlete' });

    const firstResponse = await onboard(first.accessToken, athletePayload());
    const secondResponse = await onboard(second.accessToken, athletePayload());

    expect(firstResponse.body.data.profile.slug).toBe('same-name');
    expect(secondResponse.body.data.profile.slug).toBe('same-name-2');
  });
});

describe('Profile editing and ownership', () => {
  it('returns no profile before onboarding and updates only the authenticated profile', async () => {
    const { accessToken } = await registerAndLogin({ name: 'New Athlete', role: 'athlete' });

    const empty = await request(app)
      .get(`${API}/profiles/me`)
      .set(authHeader(accessToken));
    expect(empty.status).toBe(200);
    expect(empty.body.data.profile).toBeNull();

    await onboard(accessToken, athletePayload());

    const update = await request(app)
      .patch(`${API}/profiles/me`)
      .set(authHeader(accessToken))
      .send({ headline: 'Updated headline', sports: ['Athletics', 'Football'] });

    expect(update.status).toBe(200);
    expect(update.body.data.profile.headline).toBe('Updated headline');
    expect(update.body.data.profile.sports).toEqual(['Athletics', 'Football']);
    expect(update.body.data.profile.location.city).toBe('Mumbai');
  });

  it('requires authentication for private profile management', async () => {
    const response = await request(app).get(`${API}/profiles/me`);
    expect(response.status).toBe(401);
  });

  it('keeps section visibility enforced for anonymous, connected, and owner viewers', async () => {
    const owner = await registerAndLogin({ name: 'Private Athlete', role: 'athlete' });
    const viewer = await registerAndLogin({ name: 'Viewer Coach', role: 'coach' });

    const onboarding = await onboard(
      owner.accessToken,
      athletePayload({
        visibility: {
          bio: 'private',
          statistics: 'private',
          contact: 'connections',
        },
      }),
    );
    const slug = onboarding.body.data.profile.slug;

    const anonymous = await request(app).get(`${API}/profiles/${slug}`);
    expect(anonymous.status).toBe(200);
    expect(anonymous.body.data.profile.bio).toBe('');
    expect(anonymous.body.data.profile.contact).toBeNull();
    expect(anonymous.body.data.profile.statistics).toEqual([]);

    const connected = await request(app)
      .get(`${API}/profiles/${slug}`)
      .set(authHeader(viewer.accessToken));
    expect(connected.status).toBe(200);
    expect(connected.body.data.profile.bio).toBe('');
    expect(connected.body.data.profile.contact).not.toBeNull();
    expect(connected.body.data.profile.contact.email).toBeNull();

    const ownerView = await request(app)
      .get(`${API}/profiles/${slug}`)
      .set(authHeader(owner.accessToken));
    expect(ownerView.body.data.profile.bio).toContain('National-level sprinter');
    expect(ownerView.body.data.profile.contact.email).toBe('asha@example.com');
    expect(ownerView.body.data.profile.viewer.isOwner).toBe(true);
  });

  it('does not expose email publicly unless the contact preference allows it', async () => {
    const owner = await registerAndLogin({ name: 'Contact Athlete', role: 'athlete' });
    const onboarding = await onboard(
      owner.accessToken,
      athletePayload({
        contact: {
          email: 'public@example.com',
          preferences: { showEmail: true, allowMessages: true },
        },
        visibility: { contact: 'public' },
      }),
    );

    const response = await request(app).get(`${API}/profiles/${onboarding.body.data.profile.slug}`);

    expect(response.body.data.profile.contact).toMatchObject({
      email: 'public@example.com',
      allowMessages: true,
    });
  });
});

describe('Statistics', () => {
  it('lets athletes manage embedded statistics and exposes visible statistics publicly', async () => {
    const { accessToken } = await registerAndLogin({ name: 'Stats Athlete', role: 'athlete' });
    const onboarding = await onboard(accessToken, athletePayload());
    const slug = onboarding.body.data.profile.slug;

    const created = await request(app)
      .post(`${API}/profiles/me/statistics`)
      .set(authHeader(accessToken))
      .send({ metric: 'Season wins', value: 7, unit: 'races', date: '2025-09-01' });

    expect(created.status).toBe(201);
    expect(created.body.data.statistic).toMatchObject({ metric: 'Season wins', value: 7 });
    const statisticId = created.body.data.statistic.id;

    const updated = await request(app)
      .patch(`${API}/profiles/me/statistics/${statisticId}`)
      .set(authHeader(accessToken))
      .send({ value: 8 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.statistic.value).toBe(8);

    const list = await request(app)
      .get(`${API}/profiles/me/statistics`)
      .set(authHeader(accessToken));
    expect(list.body.data.statistics).toHaveLength(1);

    const publicProfile = await request(app).get(`${API}/profiles/${slug}`);
    expect(publicProfile.body.data.profile.statistics[0]).toMatchObject({
      id: statisticId,
      value: 8,
    });

    const deleted = await request(app)
      .delete(`${API}/profiles/me/statistics/${statisticId}`)
      .set(authHeader(accessToken));
    expect(deleted.status).toBe(200);
  });

  it('rejects statistics for coach accounts', async () => {
    const { accessToken } = await registerAndLogin({ name: 'Stats Coach', role: 'coach' });
    await onboard(accessToken, coachPayload());

    const response = await request(app)
      .post(`${API}/profiles/me/statistics`)
      .set(authHeader(accessToken))
      .send({ metric: 'Sessions', value: 10 });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('STATISTICS_ROLE_FORBIDDEN');
  });
});

describe('Achievements', () => {
  it('keeps evidence private, prevents ownership bypass, and shows only verified badges publicly', async () => {
    const owner = await registerAndLogin({ name: 'Achievement Athlete', role: 'athlete' });
    const other = await registerAndLogin({ name: 'Other Athlete', role: 'athlete' });
    const onboarding = await onboard(owner.accessToken, athletePayload());
    const slug = onboarding.body.data.profile.slug;

    const created = await request(app)
      .post(`${API}/achievements`)
      .set(authHeader(owner.accessToken))
      .send({
        title: 'State 100m champion',
        sport: 'Athletics',
        competition: 'State Championships',
        result: 'Gold',
        date: '2025-06-15',
        evidenceRefs: [{ url: 'https://evidence.example.com/certificate.pdf', label: 'Certificate' }],
        verificationStatus: 'verified',
      });

    expect(created.status).toBe(201);
    expect(created.body.data.achievement.verified).toBe(false);
    expect(created.body.data.achievement.verificationStatus).toBe('unverified');
    expect(created.body.data.achievement.evidenceRefs).toHaveLength(1);
    const achievementId = created.body.data.achievement.id;

    const ownList = await request(app)
      .get(`${API}/achievements`)
      .set(authHeader(owner.accessToken));
    expect(ownList.body.data.achievements[0].evidenceRefs).toHaveLength(1);

    const publicProfile = await request(app).get(`${API}/profiles/${slug}`);
    expect(publicProfile.body.data.profile.achievements[0]).toMatchObject({
      title: 'State 100m champion',
      verified: false,
    });
    expect(publicProfile.body.data.profile.achievements[0].evidenceRefs).toBeUndefined();
    expect(publicProfile.body.data.profile.achievements[0].verificationStatus).toBeUndefined();

    const forbidden = await request(app)
      .patch(`${API}/achievements/${achievementId}`)
      .set(authHeader(other.accessToken))
      .send({ result: 'Silver' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('ACHIEVEMENT_FORBIDDEN');

    await Achievement.updateOne(
      { _id: achievementId },
      { verificationStatus: 'verified', verifiedAt: new Date() },
    );

    const verifiedProfile = await request(app).get(`${API}/profiles/${slug}`);
    expect(verifiedProfile.body.data.profile.achievements[0].verified).toBe(true);
    expect(verifiedProfile.body.data.profile.achievements[0].evidenceRefs).toBeUndefined();
  });
});

describe('Image uploads', () => {
  it('stores development uploads locally and serves them from the API origin', async () => {
    const { accessToken } = await registerAndLogin({ name: 'Photo Athlete', role: 'athlete' });
    await onboard(accessToken, athletePayload());

    const upload = await request(app)
      .post(`${API}/profiles/me/avatar`)
      .set(authHeader(accessToken))
      .attach('image', TINY_PNG, { filename: 'avatar.png', contentType: 'image/png' });

    expect(upload.status).toBe(200);
    expect(upload.body.data.profile.avatar.provider).toBe('local');
    expect(upload.body.data.profile.avatar.url).toContain('/uploads/athlete/avatar/');
    expect(upload.body.data.profile.completion.score).toBe(100);

    const imagePath = new URL(upload.body.data.profile.avatar.url).pathname;
    const imageResponse = await request(app).get(imagePath);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers['content-type']).toContain('image/png');

    const storedProfile = await AthleteProfile.findOne();
    const storedAvatarPath = `${config.uploadsDir}/${storedProfile.avatar.publicId}`;

    const clearedAvatar = await request(app)
      .delete(`${API}/profiles/me/avatar`)
      .set(authHeader(accessToken));
    expect(clearedAvatar.status).toBe(200);
    expect(clearedAvatar.body.data.profile.avatar).toBeUndefined();
    expect(clearedAvatar.body.data.profile.completion.score).toBeLessThan(100);
    await expect(fs.access(storedAvatarPath)).rejects.toThrow();

    const coverUpload = await request(app)
      .post(`${API}/profiles/me/cover`)
      .set(authHeader(accessToken))
      .attach('image', TINY_PNG, { filename: 'cover.png', contentType: 'image/png' });
    expect(coverUpload.status).toBe(200);
    expect(coverUpload.body.data.profile.cover.provider).toBe('local');

    const storedCoverPath = `${config.uploadsDir}/${coverUpload.body.data.profile.cover.publicId}`;
    const clearedCover = await request(app)
      .delete(`${API}/profiles/me/cover`)
      .set(authHeader(accessToken));
    expect(clearedCover.status).toBe(200);
    expect(clearedCover.body.data.profile.cover).toBeUndefined();
    await expect(fs.access(storedCoverPath)).rejects.toThrow();

    const gallery = await request(app)
      .post(`${API}/profiles/me/gallery`)
      .set(authHeader(accessToken))
      .field('caption', 'Track session')
      .attach('image', TINY_PNG, { filename: 'gallery.png', contentType: 'image/png' });
    expect(gallery.status).toBe(201);
    expect(gallery.body.data.profile.mediaGallery).toHaveLength(1);
    expect(gallery.body.data.profile.mediaGallery[0].caption).toBe('Track session');

    const galleryId = gallery.body.data.profile.mediaGallery[0].id;
    const removed = await request(app)
      .delete(`${API}/profiles/me/gallery/${galleryId}`)
      .set(authHeader(accessToken));
    expect(removed.status).toBe(200);
    expect(removed.body.data.profile.mediaGallery).toHaveLength(0);
  });

  it('rejects non-image uploads', async () => {
    const { accessToken } = await registerAndLogin({ name: 'Bad Photo Athlete', role: 'athlete' });
    await onboard(accessToken, athletePayload());

    const response = await request(app)
      .post(`${API}/profiles/me/avatar`)
      .set(authHeader(accessToken))
      .attach('image', Buffer.from('not an image'), {
        filename: 'avatar.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(415);
    expect(response.body.code).toBe('UNSUPPORTED_IMAGE_TYPE');
  });
});

describe('Account deletion cascade', () => {
  it('removes the profile, achievements, uploads, and account', async () => {
    const { accessToken, payload } = await registerAndLogin({
      name: 'Delete Athlete',
      role: 'athlete',
    });
    await onboard(accessToken, athletePayload());
    await request(app)
      .post(`${API}/achievements`)
      .set(authHeader(accessToken))
      .send({ title: 'Regional medal', sport: 'Athletics', result: 'Bronze' });
    await request(app)
      .post(`${API}/profiles/me/avatar`)
      .set(authHeader(accessToken))
      .attach('image', TINY_PNG, { filename: 'avatar.png', contentType: 'image/png' });

    const profile = await AthleteProfile.findOne();
    const avatarPath = `${config.uploadsDir}/${profile.avatar.publicId}`;

    const response = await request(app)
      .delete(`${API}/auth/account`)
      .set(authHeader(accessToken))
      .send({ password: DEFAULT_PASSWORD });

    expect(response.status).toBe(200);
    expect(await User.findOne({ email: payload.email })).toBeNull();
    expect(await AthleteProfile.countDocuments()).toBe(0);
    expect(await Achievement.countDocuments()).toBe(0);
    await expect(fs.access(avatarPath)).rejects.toThrow();
  });

  it('deletes coach and organization profile records as well', async () => {
    const coach = await registerAndLogin({ name: 'Delete Coach', role: 'coach' });
    await onboard(coach.accessToken, coachPayload());
    const org = await registerAndLogin({ name: 'Delete Org', role: 'recruiter' });
    await onboard(org.accessToken, organizationPayload());

    await request(app)
      .delete(`${API}/auth/account`)
      .set(authHeader(coach.accessToken))
      .send({ password: DEFAULT_PASSWORD });
    await request(app)
      .delete(`${API}/auth/account`)
      .set(authHeader(org.accessToken))
      .send({ password: DEFAULT_PASSWORD });

    expect(await CoachProfile.countDocuments()).toBe(0);
    expect(await Organization.countDocuments()).toBe(0);
  });
});

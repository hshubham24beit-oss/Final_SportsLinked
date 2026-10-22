const request = require('supertest');
const {
  app,
  API,
  DEFAULT_PASSWORD,
  registerAndLogin,
  authHeader,
} = require('./helpers');
const AthleteProfile = require('../models/AthleteProfile');
const CoachProfile = require('../models/CoachProfile');
const Achievement = require('../models/Achievement');
const SavedCandidate = require('../models/SavedCandidate');
const BlockedUser = require('../models/BlockedUser');
const User = require('../models/User');

let slugCounter = 0;

function nextSlug(name) {
  slugCounter += 1;
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slugCounter}`;
}

function athleteProfileData(overrides = {}) {
  return {
    headline: 'Sprint athlete focused on national competition',
    bio: 'A dedicated athlete with a record of consistent performances.',
    sports: ['Athletics'],
    positions: ['100m'],
    skills: ['Sprint starts'],
    level: 'professional',
    ageCategory: 'senior',
    competitionLevel: 'national',
    experienceYears: 6,
    currentTeam: 'Mumbai Striders',
    availableForTrials: true,
    preferredOpportunities: ['trials'],
    statistics: [{ metric: 'Season wins', value: 8, unit: 'races' }],
    location: {
      city: 'Mumbai',
      region: 'Maharashtra',
      country: 'India',
      coordinates: { type: 'Point', coordinates: [72.8777, 19.076] },
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
    profileCompletion: 80,
    ...overrides,
  };
}

async function createAthlete({
  name,
  email,
  profile = {},
  status = 'active',
  onboardingCompleted = true,
} = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const user = await User.create({
    name,
    email: email || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${suffix}@example.com`,
    passwordHash: 'not-used-in-discovery-tests',
    role: 'athlete',
    status,
    onboardingCompleted,
    isEmailVerified: true,
  });

  const profileDocument = await AthleteProfile.create({
    user: user._id,
    slug: nextSlug(name),
    ...athleteProfileData(profile),
  });

  return { user, profile: profileDocument };
}

async function createViewer(role, name = 'Discovery Viewer') {
  const { accessToken, payload } = await registerAndLogin({ name, role });
  return { accessToken, payload };
}

async function createAdmin() {
  const email = `admin-${Date.now()}@example.com`;
  const admin = await User.create({
    name: 'Discovery Admin',
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

  return login.body.data.accessToken;
}

function search(accessToken, query = '') {
  return request(app)
    .get(`${API}/discovery/athletes${query ? `?${query}` : ''}`)
    .set(authHeader(accessToken));
}

function names(response) {
  return response.body.data.athletes.map((athlete) => athlete.name);
}

describe('Athlete discovery', () => {
  it('enforces role access and returns privacy-safe athlete cards', async () => {
    const { user: sprintUser } = await createAthlete({
      name: 'Asha Sprint',
      profile: {
        visibility: {
          location: 'public',
          sports: 'public',
          bio: 'public',
          career: 'public',
          statistics: 'public',
          achievements: 'public',
          contact: 'connections',
        },
      },
    });
    await createAthlete({
      name: 'Private Sport',
      profile: { sports: ['Football'], visibility: { sports: 'private' } },
    });

    const coach = await createViewer('coach', 'Coach Viewer');
    const recruiter = await createViewer('recruiter', 'Recruiter Viewer');
    const athlete = await createViewer('athlete', 'Athlete Viewer');
    const adminToken = await createAdmin();

    expect((await request(app).get(`${API}/discovery/athletes`)).status).toBe(401);
    expect((await search(athlete.accessToken)).status).toBe(403);
    expect((await search(coach.accessToken)).status).toBe(200);
    expect((await search(recruiter.accessToken)).status).toBe(200);
    expect((await search(adminToken)).status).toBe(200);

    const response = await search(coach.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.data.athletes).toHaveLength(1);
    expect(response.body.data.athletes[0]).toMatchObject({
      userId: String(sprintUser._id),
      name: 'Asha Sprint',
      competitionLevel: 'national',
      ageCategory: 'senior',
      saved: false,
      location: { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
    });
    expect(response.body.data.athletes[0].location.latitude).toBeUndefined();
    expect(response.body.data.athletes[0].contact).toBeUndefined();
    expect(response.body.meta).toMatchObject({ page: 1, limit: 12, total: 1, totalPages: 1 });
  });

  it('filters by keyword, sport, position, skill, team, level, age, and competition', async () => {
    await createAthlete({
      name: 'Asha Sprint',
      profile: { currentTeam: 'Mumbai Striders' },
    });
    await createAthlete({
      name: 'Ravi Kicker',
      profile: {
        headline: 'Creative midfield prospect',
        sports: ['Football'],
        positions: ['Midfielder'],
        skills: ['Passing'],
        level: 'amateur',
        ageCategory: 'under_21',
        competitionLevel: 'college',
        experienceYears: 3,
        currentTeam: 'Pune United',
        availableForTrials: false,
      },
    });
    await createAthlete({
      name: 'Neha Swimmer',
      profile: {
        sports: ['Swimming'],
        positions: ['Freestyle'],
        skills: ['Butterfly'],
        level: 'elite',
        ageCategory: 'under_18',
        competitionLevel: 'international',
        currentTeam: 'Delhi Aquatics',
      },
    });
    const coach = await createViewer('coach', 'Filter Coach');

    const cases = [
      ['q=Asha', ['Asha Sprint']],
      ['sport=Football', ['Ravi Kicker']],
      ['position=midfielder', ['Ravi Kicker']],
      ['skill=passing', ['Ravi Kicker']],
      ['team=Pune', ['Ravi Kicker']],
      ['level=elite', ['Neha Swimmer']],
      ['ageCategory=under_21', ['Ravi Kicker']],
      ['competitionLevel=international', ['Neha Swimmer']],
      ['q=Swimming', ['Neha Swimmer']],
      ['q=Striders', ['Asha Sprint']],
    ];

    for (const [query, expectedNames] of cases) {
      const response = await search(coach.accessToken, query);
      expect(response.status).toBe(200);
      expect(names(response).sort()).toEqual(expectedNames.sort());
    }
  });

  it('filters by location, nearby coordinates, trials, statistics, and achievements', async () => {
    await createAthlete({ name: 'Mumbai Athlete' });
    await createAthlete({
      name: 'Pune Athlete',
      profile: {
        sports: ['Football'],
        positions: ['Goalkeeper'],
        currentTeam: 'Pune United',
        location: {
          city: 'Pune',
          region: 'Maharashtra',
          country: 'India',
          coordinates: { type: 'Point', coordinates: [73.8567, 18.5204] },
        },
        statistics: [{ metric: 'Clean sheets', value: 9 }],
        availableForTrials: false,
      },
    });
    await createAthlete({
      name: 'Verified Vaishali',
      profile: {
        sports: ['Badminton'],
        positions: ['Singles'],
        currentTeam: 'State Academy',
        statistics: [{ metric: 'Season wins', value: 12 }],
      },
    });
    const verified = await createAthlete({
      name: 'Verified Vikram',
      profile: {
        sports: ['Tennis'],
        positions: ['Singles'],
        currentTeam: 'National Academy',
        statistics: [{ metric: 'Titles', value: 4 }],
      },
    });
    const anyAchievement = await createAthlete({
      name: 'Achievement Anaya',
      profile: { sports: ['Hockey'], positions: ['Forward'] },
    });

    await Achievement.create({
      user: verified.user._id,
      title: 'National tennis champion',
      sport: 'Tennis',
      verificationStatus: 'verified',
    });
    await Achievement.create({
      user: anyAchievement.user._id,
      title: 'District hockey medal',
      sport: 'Hockey',
      verificationStatus: 'unverified',
    });

    const coach = await createViewer('coach', 'Location Coach');

    expect(names(await search(coach.accessToken, 'location=Pune'))).toEqual([
      'Pune Athlete',
    ]);
    expect(names(await search(coach.accessToken, 'lat=18.52&lng=73.85&radiusKm=40'))).toEqual([
      'Pune Athlete',
    ]);
    expect(names(await search(coach.accessToken, 'availableForTrials=true'))).toEqual(
      expect.arrayContaining(['Mumbai Athlete']),
    );
    expect(names(await search(coach.accessToken, 'availableForTrials=true'))).not.toContain(
      'Pune Athlete',
    );
    expect(names(await search(coach.accessToken, 'statMetric=Clean%20sheets&statMin=8'))).toEqual([
      'Pune Athlete',
    ]);
    expect(names(await search(coach.accessToken, 'statMetric=Titles&statMin=3&statMax=5'))).toEqual([
      'Verified Vikram',
    ]);
    expect(names(await search(coach.accessToken, 'achievements=any')).sort()).toEqual(
      ['Achievement Anaya', 'Verified Vikram'].sort(),
    );
    expect(names(await search(coach.accessToken, 'verification=verified'))).toEqual([
      'Verified Vikram',
    ]);
  });

  it('respects section privacy and excludes suspended and blocked athletes', async () => {
    await createAthlete({
      name: 'Visible Athlete',
      profile: { bio: 'Public headline', headline: 'Visible headline' },
    });
    await createAthlete({
      name: 'Private Sports',
      profile: { sports: ['Athletics'], visibility: { sports: 'private' } },
    });
    await createAthlete({
      name: 'Private Location',
      profile: {
        sports: ['Athletics'],
        location: {
          city: 'Pune',
          coordinates: { type: 'Point', coordinates: [73.8567, 18.5204] },
        },
        visibility: { location: 'private' },
      },
    });
    await createAthlete({
      name: 'Private Bio',
      profile: {
        headline: 'Secret headline',
        bio: 'Secret bio',
        sports: ['Athletics'],
        visibility: { bio: 'private' },
      },
    });
    await createAthlete({
      name: 'Private Stats',
      profile: {
        sports: ['Athletics'],
        statistics: [{ metric: 'Goals', value: 20 }],
        visibility: { statistics: 'private' },
      },
    });
    const privateAchievements = await createAthlete({
      name: 'Private Achievements',
      profile: {
        sports: ['Athletics'],
        visibility: { achievements: 'private' },
      },
    });
    const suspended = await createAthlete({
      name: 'Suspended Athlete',
      status: 'suspended',
      profile: { sports: ['Athletics'] },
    });
    const blocked = await createAthlete({
      name: 'Blocked Athlete',
      profile: { sports: ['Athletics'] },
    });

    await Achievement.create({
      user: privateAchievements.user._id,
      title: 'Private verified award',
      sport: 'Athletics',
      verificationStatus: 'verified',
    });
    await Achievement.create({
      user: suspended.user._id,
      title: 'Suspended verified award',
      sport: 'Athletics',
      verificationStatus: 'verified',
    });

    const coach = await createViewer('coach', 'Privacy Coach');
    const coachUser = await User.findOne({ email: coach.payload.email });
    await BlockedUser.create({ blocker: coachUser._id, blocked: blocked.user._id });

    const all = await search(coach.accessToken, 'limit=48');
    const allNames = names(all);
    expect(allNames).toContain('Visible Athlete');
    expect(allNames).toContain('Private Bio');
    expect(allNames).not.toContain('Private Sports');
    expect(allNames).not.toContain('Suspended Athlete');
    expect(allNames).not.toContain('Blocked Athlete');

    const privateBioCard = all.body.data.athletes.find(
      (athlete) => athlete.name === 'Private Bio',
    );
    expect(privateBioCard.headline).toBe('');
    expect(privateBioCard.bio).toBe('');
    const privateLocationCard = all.body.data.athletes.find(
      (athlete) => athlete.name === 'Private Location',
    );
    expect(privateLocationCard.location).toBeNull();

    expect(names(await search(coach.accessToken, 'location=Pune'))).not.toContain(
      'Private Location',
    );
    expect(
      names(await search(coach.accessToken, 'statMetric=Goals&statMin=10')),
    ).not.toContain('Private Stats');
    expect(names(await search(coach.accessToken, 'verification=verified'))).not.toContain(
      'Private Achievements',
    );
    expect(names(await search(coach.accessToken, 'verification=verified'))).not.toContain(
      'Suspended Athlete',
    );
    expect(names(await search(coach.accessToken, 'location=Pune'))).not.toContain(
      'Private Sports',
    );
  });

  it('supports nearby search from the viewer profile and validates location input', async () => {
    await createAthlete({
      name: 'Near Mumbai',
      profile: {
        location: {
          city: 'Mumbai',
          coordinates: { type: 'Point', coordinates: [72.8777, 19.076] },
        },
      },
    });
    await createAthlete({
      name: 'Far Delhi',
      profile: {
        location: {
          city: 'Delhi',
          coordinates: { type: 'Point', coordinates: [77.209, 28.6139] },
        },
      },
    });

    const coach = await createViewer('coach', 'Nearby Coach');
    const viewer = await User.findOne({ email: coach.payload.email });
    await CoachProfile.create({
      user: viewer._id,
      slug: `nearby-coach-${Date.now()}`,
      headline: 'Coach near Mumbai',
      bio: 'Working with athletes in Mumbai.',
      sports: ['Athletics'],
      specializations: ['Sprints'],
      experienceYears: 5,
      location: {
        city: 'Mumbai',
        country: 'India',
        coordinates: { type: 'Point', coordinates: [72.88, 19.07] },
      },
    });

    const near = await search(coach.accessToken, 'nearMe=true&radiusKm=100');
    expect(near.status).toBe(200);
    expect(names(near)).toEqual(['Near Mumbai']);

    const coachWithoutCoordinates = await createViewer('coach', 'No Location Coach');
    const missingCoordinates = await search(
      coachWithoutCoordinates.accessToken,
      'nearMe=true',
    );
    expect(missingCoordinates.status).toBe(400);
    expect(missingCoordinates.body.code).toBe('NEARBY_LOCATION_UNAVAILABLE');
  });

  it('validates filters and paginates results', async () => {
    for (let index = 1; index <= 3; index += 1) {
      await createAthlete({
        name: `Paged Athlete ${index}`,
        profile: {
          sports: ['Athletics'],
          ageCategory: 'senior',
          availableForTrials: true,
          profileCompletion: 50 + index,
        },
      });
    }
    const coach = await createViewer('coach', 'Pagination Coach');

    const first = await search(coach.accessToken, 'sport=Athletics&limit=2&page=1');
    expect(first.status).toBe(200);
    expect(first.body.data.athletes).toHaveLength(2);
    expect(first.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const second = await search(coach.accessToken, 'sport=Athletics&limit=2&page=2');
    expect(second.body.data.athletes).toHaveLength(1);

    expect((await search(coach.accessToken, 'page=0')).status).toBe(400);
    expect((await search(coach.accessToken, 'limit=100')).status).toBe(400);
    expect((await search(coach.accessToken, 'lat=19.0')).status).toBe(400);
    expect((await search(coach.accessToken, 'statMin=5')).status).toBe(400);
    expect((await search(coach.accessToken, 'statMetric=Goals&statMin=9&statMax=2')).status).toBe(
      400,
    );
  });

  it('saves, lists, and removes candidates for coaches and recruiters only', async () => {
    const athlete = await createAthlete({ name: 'Saved Sam' });
    const hidden = await createAthlete({
      name: 'Hidden Hema',
      profile: { sports: ['Athletics'] },
    });

    const coach = await createViewer('coach', 'Saving Coach');
    const recruiter = await createViewer('recruiter', 'Saving Recruiter');
    const athleteViewer = await createViewer('athlete', 'Saving Athlete');
    const adminToken = await createAdmin();
    const coachUser = await User.findOne({ email: coach.payload.email });

    const saved = await request(app)
      .post(`${API}/discovery/saved/${athlete.user._id}`)
      .set(authHeader(coach.accessToken));
    expect(saved.status).toBe(201);
    expect(saved.body.data).toMatchObject({ saved: true });

    const duplicate = await request(app)
      .post(`${API}/discovery/saved/${athlete.user._id}`)
      .set(authHeader(coach.accessToken));
    expect(duplicate.status).toBe(201);
    expect(await SavedCandidate.countDocuments({ savedBy: coachUser._id })).toBe(1);

    const listed = await request(app)
      .get(`${API}/discovery/saved`)
      .set(authHeader(coach.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.data.athletes).toHaveLength(1);
    expect(listed.body.data.athletes[0].name).toBe('Saved Sam');
    expect(listed.body.data.athletes[0].saved).toBe(true);

    const searchResult = await search(coach.accessToken, 'q=Saved');
    expect(searchResult.body.data.athletes[0].saved).toBe(true);

    const recruiterSave = await request(app)
      .post(`${API}/discovery/saved/${hidden.user._id}`)
      .set(authHeader(recruiter.accessToken));
    expect(recruiterSave.status).toBe(201);

    await AthleteProfile.updateOne(
      { user: hidden.user._id },
      { $set: { 'visibility.sports': 'private' } },
    );
    const recruiterList = await request(app)
      .get(`${API}/discovery/saved`)
      .set(authHeader(recruiter.accessToken));
    expect(recruiterList.body.data.athletes).toHaveLength(0);
    expect(recruiterList.body.meta.total).toBe(0);

    const removed = await request(app)
      .delete(`${API}/discovery/saved/${athlete.user._id}`)
      .set(authHeader(coach.accessToken));
    expect(removed.status).toBe(200);
    expect(removed.body.data.saved).toBe(false);

    const athleteForbidden = await request(app)
      .post(`${API}/discovery/saved/${athlete.user._id}`)
      .set(authHeader(athleteViewer.accessToken));
    expect(athleteForbidden.status).toBe(403);

    const adminForbidden = await request(app)
      .post(`${API}/discovery/saved/${athlete.user._id}`)
      .set(authHeader(adminToken));
    expect(adminForbidden.status).toBe(403);

    await BlockedUser.create({ blocker: coachUser._id, blocked: athlete.user._id });
    const blockedSave = await request(app)
      .post(`${API}/discovery/saved/${athlete.user._id}`)
      .set(authHeader(coach.accessToken));
    expect(blockedSave.status).toBe(404);
  });
});

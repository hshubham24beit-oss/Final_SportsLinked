import { describe, expect, it } from 'vitest';
import {
  buildProfilePayload,
  createEmptyProfile,
  getAchievementVerificationMeta,
  getCompletionLabel,
  profileToForm,
  validateProfileStep,
} from './profile';

describe('profile form utilities', () => {
  it('builds a normalised athlete payload', () => {
    const form = createEmptyProfile('athlete');
    form.headline = '  Sprint athlete  ';
    form.sports = [' Athletics ', ''];
    form.level = 'professional';
    form.experienceYears = '6';
    form.location.latitude = '19.076';
    form.location.longitude = '72.8777';
    form.careerHistory.push({
      id: 'existing-id',
      organization: 'Mumbai Striders',
      role: 'Sprinter',
      startDate: '2022-01-01',
      endDate: '',
      current: true,
      description: '',
    });
    form.personalBests.push({
      id: 'best-id',
      event: '100m',
      result: '10.81',
      unit: 's',
      date: '2025-06-01',
      competition: 'State Championships',
    });

    const payload = buildProfilePayload(form, 'athlete');

    expect(payload.headline).toBe('Sprint athlete');
    expect(payload.sports).toEqual(['Athletics']);
    expect(payload.level).toBe('professional');
    expect(payload.experienceYears).toBe(6);
    expect(payload.location.latitude).toBeCloseTo(19.076);
    expect(payload.location.longitude).toBeCloseTo(72.8777);
    expect(payload.careerHistory).toHaveLength(1);
    expect(payload.careerHistory[0]).not.toHaveProperty('id');
    expect(payload.careerHistory[0].current).toBe(true);
    expect(payload.personalBests[0]).not.toHaveProperty('id');
    expect(payload.personalBests[0].result).toBe('10.81');
  });

  it('builds role-specific coach and organisation payloads', () => {
    const coach = createEmptyProfile('coach');
    coach.specializations = [' Sprint training '];
    coach.experienceYears = '9';
    coach.certifications.push({
      id: 'cert-id',
      name: 'Level 2 Coach',
      issuer: 'National Federation',
      year: '2020',
    });
    coach.availability = 'open_to_consulting';

    const coachPayload = buildProfilePayload(coach, 'coach');
    expect(coachPayload.specializations).toEqual(['Sprint training']);
    expect(coachPayload.experienceYears).toBe(9);
    expect(coachPayload.certifications[0]).toEqual({
      name: 'Level 2 Coach',
      issuer: 'National Federation',
      year: 2020,
    });
    expect(coachPayload).not.toHaveProperty('level');

    const organisation = createEmptyProfile('recruiter');
    organisation.name = 'Pune Athletics Academy';
    organisation.organizationType = 'academy';
    organisation.activities = ['Youth sprint programme'];
    organisation.foundedYear = '2012';

    const organisationPayload = buildProfilePayload(organisation, 'recruiter');
    expect(organisationPayload.name).toBe('Pune Athletics Academy');
    expect(organisationPayload.organizationType).toBe('academy');
    expect(organisationPayload.foundedYear).toBe(2012);
    expect(organisationPayload).not.toHaveProperty('careerHistory');
  });

  it('converts persisted profile dates and nested fields into form values', () => {
    const form = profileToForm(
      {
        role: 'athlete',
        headline: 'Sprinter',
        experienceYears: 6,
        sports: ['Athletics'],
        location: { city: 'Mumbai' },
        contact: { email: 'athlete@example.com' },
        visibility: { contact: 'private' },
        careerHistory: [
          {
            id: 'career-id',
            organization: 'Club',
            role: 'Athlete',
            startDate: '2022-01-01T00:00:00.000Z',
            current: true,
          },
        ],
      },
      'athlete',
    );

    expect(form.experienceYears).toBe(6);
    expect(form.location.city).toBe('Mumbai');
    expect(form.contact.email).toBe('athlete@example.com');
    expect(form.visibility.contact).toBe('private');
    expect(form.careerHistory[0].startDate).toBe('2022-01-01');
  });

  it('validates required onboarding fields by step', () => {
    const form = createEmptyProfile('athlete');
    form.level = '';

    expect(validateProfileStep(form, 'athlete', 'basics')).toMatchObject({
      headline: expect.any(String),
      bio: expect.any(String),
      'location.city': expect.any(String),
    });
    expect(validateProfileStep(form, 'athlete', 'role')).toMatchObject({
      sports: expect.any(String),
      level: expect.any(String),
      experienceYears: expect.any(String),
    });
  });

  it('labels completion and verification states without claiming unverified badges', () => {
    expect(getCompletionLabel('media')).toBe('Add gallery photos');
    expect(getAchievementVerificationMeta('verified')).toMatchObject({
      label: 'Verified',
      variant: 'success',
    });
    expect(getAchievementVerificationMeta('pending').label).toBe('Pending review');
    expect(getAchievementVerificationMeta('self_reported').label).toBe('Self-reported');
  });
});

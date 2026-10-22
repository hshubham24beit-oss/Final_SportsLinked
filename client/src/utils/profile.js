export const ATHLETE_LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'amateur', label: 'Amateur' },
  { value: 'semi_professional', label: 'Semi-professional' },
  { value: 'professional', label: 'Professional' },
  { value: 'elite', label: 'Elite' },
];

export const ATHLETE_AGE_CATEGORY_OPTIONS = [
  { value: 'under_14', label: 'Under 14' },
  { value: 'under_16', label: 'Under 16' },
  { value: 'under_18', label: 'Under 18' },
  { value: 'under_21', label: 'Under 21' },
  { value: 'senior', label: 'Senior / open' },
  { value: 'masters', label: 'Masters (35+)' },
];

export const ATHLETE_COMPETITION_LEVEL_OPTIONS = [
  { value: 'recreational', label: 'Recreational' },
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'state', label: 'State' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
];

export const OPPORTUNITY_OPTIONS = [
  { value: 'trials', label: 'Trials' },
  { value: 'scholarships', label: 'Scholarships' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'part_time', label: 'Part-time roles' },
  { value: 'full_time', label: 'Full-time roles' },
  { value: 'representation', label: 'Representation' },
  { value: 'other', label: 'Other opportunities' },
];

export const COACH_AVAILABILITY_OPTIONS = [
  { value: 'open_to_roles', label: 'Open to coaching roles' },
  { value: 'open_to_consulting', label: 'Open to consulting' },
  { value: 'not_available', label: 'Not currently available' },
];

export const ORGANIZATION_TYPE_OPTIONS = [
  { value: 'club', label: 'Club' },
  { value: 'academy', label: 'Academy' },
  { value: 'team', label: 'Team' },
  { value: 'agency', label: 'Agency' },
  { value: 'federation', label: 'Federation' },
  { value: 'school', label: 'School' },
  { value: 'university', label: 'University' },
  { value: 'other', label: 'Other' },
];

export const VISIBILITY_OPTIONS = [
  {
    value: 'public',
    label: 'Public',
    description: 'Visible to anyone with your profile link.',
  },
  {
    value: 'connections',
    label: 'Signed-in members',
    description: 'Visible to signed-in SportLinked members only.',
  },
  {
    value: 'private',
    label: 'Only me',
    description: 'Hidden from everyone except you.',
  },
];

export const PROFILE_SECTIONS = [
  'bio',
  'location',
  'sports',
  'career',
  'personalBests',
  'statistics',
  'achievements',
  'media',
  'contact',
];

export const SECTION_LABELS = {
  bio: 'Bio and headline',
  location: 'Location',
  sports: 'Sport details',
  career: 'Career history',
  personalBests: 'Personal bests',
  statistics: 'Statistics',
  achievements: 'Achievements',
  media: 'Photos',
  contact: 'Contact details',
};

const DEFAULT_VISIBILITY = {
  bio: 'public',
  location: 'public',
  sports: 'public',
  career: 'public',
  personalBests: 'public',
  statistics: 'public',
  achievements: 'public',
  media: 'public',
  contact: 'connections',
};

const COMPLETION_LABELS = {
  bio: 'Add a bio',
  avatar: 'Add a profile photo',
  cover: 'Add a cover image',
  headline: 'Add a headline',
  location: 'Add your city',
  coordinates: 'Add map coordinates',
  sports: 'Add your sports',
  level: 'Choose your level',
  experience: 'Add years of experience',
  currentTeam: 'Add your current team',
  career: 'Add career history',
  personalBests: 'Add a personal best',
  opportunities: 'Choose preferred opportunities',
  trials: 'Set trial availability',
  specializations: 'Add specializations',
  currentOrganization: 'Add your current organisation',
  certifications: 'Add a certification',
  availability: 'Set coaching availability',
  organizationType: 'Choose an organisation type',
  activities: 'Add programmes or activities',
  foundedYear: 'Add a founding year',
  contactEmail: 'Add a contact email',
  website: 'Add a website',
  media: 'Add gallery photos',
};

export function emptyCareerEntry() {
  return {
    organization: '',
    role: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  };
}

export function emptyPersonalBest() {
  return {
    event: '',
    result: '',
    unit: '',
    date: '',
    competition: '',
  };
}

export function emptyCertification() {
  return {
    name: '',
    issuer: '',
    year: '',
  };
}

export function emptyAchievement() {
  return {
    title: '',
    sport: '',
    competition: '',
    result: '',
    date: '',
    description: '',
    evidenceRefs: [{ url: '', label: '' }],
  };
}

export function emptyStatistic() {
  return {
    metric: '',
    value: '',
    unit: '',
    date: '',
  };
}

export function createEmptyProfile(role) {
  return {
    headline: '',
    bio: '',
    name: '',
    organizationType: 'club',
    level: 'amateur',
    ageCategory: '',
    competitionLevel: '',
    experienceYears: '',
    currentTeam: '',
    currentOrganization: '',
    availability: 'open_to_roles',
    foundedYear: '',
    sports: [],
    positions: [],
    skills: [],
    specializations: [],
    activities: [],
    preferredOpportunities: [],
    availableForTrials: false,
    location: {
      city: '',
      region: '',
      country: '',
      latitude: '',
      longitude: '',
    },
    contact: {
      email: '',
      phone: '',
      website: '',
      preferences: {
        showEmail: false,
        allowMessages: true,
      },
    },
    visibility: { ...DEFAULT_VISIBILITY },
    careerHistory: [],
    personalBests: [],
    certifications: [],
    ...(role === 'coach' ? { availability: 'open_to_roles' } : {}),
  };
}

function dateForInput(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export function profileToForm(profile, role) {
  const base = createEmptyProfile(role || profile?.role);
  if (!profile) {
    return base;
  }

  return {
    ...base,
    headline: profile.headline || '',
    bio: profile.bio || '',
    name: profile.name || '',
    organizationType: profile.organizationType || 'club',
    level: profile.level || 'amateur',
    ageCategory: profile.ageCategory || '',
    competitionLevel: profile.competitionLevel || '',
    experienceYears: profile.experienceYears ?? '',
    currentTeam: profile.currentTeam || '',
    currentOrganization: profile.currentOrganization || '',
    availability: profile.availability || 'open_to_roles',
    foundedYear: profile.foundedYear ?? '',
    sports: [...(profile.sports || [])],
    positions: [...(profile.positions || [])],
    skills: [...(profile.skills || [])],
    specializations: [...(profile.specializations || [])],
    activities: [...(profile.activities || [])],
    preferredOpportunities: [...(profile.preferredOpportunities || [])],
    availableForTrials: Boolean(profile.availableForTrials),
    location: {
      city: profile.location?.city || '',
      region: profile.location?.region || '',
      country: profile.location?.country || '',
      latitude: profile.location?.latitude ?? '',
      longitude: profile.location?.longitude ?? '',
    },
    contact: {
      email: profile.contact?.email || '',
      phone: profile.contact?.phone || '',
      website: profile.contact?.website || '',
      preferences: {
        showEmail: Boolean(profile.contact?.preferences?.showEmail),
        allowMessages: profile.contact?.preferences?.allowMessages !== false,
      },
    },
    visibility: {
      ...DEFAULT_VISIBILITY,
      ...(profile.visibility || {}),
    },
    careerHistory: (profile.careerHistory || []).map((entry) => ({
      id: entry.id,
      organization: entry.organization || '',
      role: entry.role || '',
      startDate: dateForInput(entry.startDate),
      endDate: dateForInput(entry.endDate),
      current: Boolean(entry.current),
      description: entry.description || '',
    })),
    personalBests: (profile.personalBests || []).map((entry) => ({
      id: entry.id,
      event: entry.event || '',
      result: entry.result || '',
      unit: entry.unit || '',
      date: dateForInput(entry.date),
      competition: entry.competition || '',
    })),
    certifications: (profile.certifications || []).map((entry) => ({
      id: entry.id,
      name: entry.name || '',
      issuer: entry.issuer || '',
      year: entry.year ?? '',
    })),
  };
}

function trim(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function numberOrUndefined(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function hasEntryContent(entry) {
  return Object.entries(entry).some(([key, value]) => {
    if (key === 'id' || key === 'current') {
      return false;
    }
    return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
  });
}

export function buildProfilePayload(form, role) {
  const latitude = numberOrUndefined(form.location.latitude);
  const longitude = numberOrUndefined(form.location.longitude);
  const payload = {
    headline: trim(form.headline) || '',
    bio: trim(form.bio) || '',
    location: {
      city: trim(form.location.city) || '',
      region: trim(form.location.region) || '',
      country: trim(form.location.country) || '',
      ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {}),
    },
    contact: {
      email: trim(form.contact.email) || '',
      phone: trim(form.contact.phone) || '',
      website: trim(form.contact.website) || '',
      preferences: {
        showEmail: Boolean(form.contact.preferences.showEmail),
        allowMessages: Boolean(form.contact.preferences.allowMessages),
      },
    },
    visibility: { ...form.visibility },
    sports: form.sports.map((item) => item.trim()).filter(Boolean),
  };

  if (role === 'athlete') {
    payload.level = form.level;
    if (form.ageCategory) {
      payload.ageCategory = form.ageCategory;
    }
    if (form.competitionLevel) {
      payload.competitionLevel = form.competitionLevel;
    }
    payload.positions = form.positions.map((item) => item.trim()).filter(Boolean);
    payload.skills = form.skills.map((item) => item.trim()).filter(Boolean);
    const experienceYears = numberOrUndefined(form.experienceYears);
    if (experienceYears !== undefined) {
      payload.experienceYears = experienceYears;
    }
    payload.currentTeam = trim(form.currentTeam) || '';
    payload.preferredOpportunities = [...form.preferredOpportunities];
    payload.availableForTrials = Boolean(form.availableForTrials);
    payload.careerHistory = form.careerHistory
      .filter(hasEntryContent)
      .map((entry) => ({
        organization: trim(entry.organization) || '',
        role: trim(entry.role) || '',
        ...(entry.startDate ? { startDate: entry.startDate } : {}),
        ...(entry.current ? { current: true } : entry.endDate ? { endDate: entry.endDate } : {}),
        description: trim(entry.description) || '',
      }));
    payload.personalBests = form.personalBests
      .filter(hasEntryContent)
      .map((entry) => ({
        event: trim(entry.event) || '',
        result: trim(entry.result) || '',
        unit: trim(entry.unit) || '',
        ...(entry.date ? { date: entry.date } : {}),
        competition: trim(entry.competition) || '',
      }));
  }

  if (role === 'coach') {
    payload.specializations = form.specializations.map((item) => item.trim()).filter(Boolean);
    const experienceYears = numberOrUndefined(form.experienceYears);
    if (experienceYears !== undefined) {
      payload.experienceYears = experienceYears;
    }
    payload.currentOrganization = trim(form.currentOrganization) || '';
    payload.availability = form.availability;
    payload.preferredOpportunities = [...form.preferredOpportunities];
    payload.certifications = form.certifications
      .filter(hasEntryContent)
      .map((entry) => ({
        name: trim(entry.name) || '',
        issuer: trim(entry.issuer) || '',
        ...(numberOrUndefined(entry.year) !== undefined
          ? { year: numberOrUndefined(entry.year) }
          : {}),
      }));
    payload.careerHistory = form.careerHistory
      .filter(hasEntryContent)
      .map((entry) => ({
        organization: trim(entry.organization) || '',
        role: trim(entry.role) || '',
        ...(entry.startDate ? { startDate: entry.startDate } : {}),
        ...(entry.current ? { current: true } : entry.endDate ? { endDate: entry.endDate } : {}),
        description: trim(entry.description) || '',
      }));
  }

  if (role === 'recruiter') {
    payload.name = trim(form.name) || '';
    payload.organizationType = form.organizationType;
    payload.activities = form.activities.map((item) => item.trim()).filter(Boolean);
    const foundedYear = numberOrUndefined(form.foundedYear);
    if (foundedYear !== undefined) {
      payload.foundedYear = foundedYear;
    }
  }

  return payload;
}

export function getCompletionMissingLabels(profile) {
  const missing = profile?.completion?.missing || [];
  return missing.map((key) => COMPLETION_LABELS[key] || key);
}

export function getCompletionLabel(key) {
  return COMPLETION_LABELS[key] || key;
}

export function getAchievementVerificationMeta(status) {
  if (status === 'verified') {
    return { label: 'Verified', variant: 'success' };
  }
  if (status === 'pending') {
    return { label: 'Pending review', variant: 'warning' };
  }
  if (status === 'rejected') {
    return { label: 'Verification rejected', variant: 'danger' };
  }
  return { label: 'Self-reported', variant: 'neutral' };
}

export function toDateInput(value) {
  return dateForInput(value);
}

export function getOnboardingSteps(role) {
  return [
    {
      key: 'basics',
      label: 'Basics',
      title: role === 'recruiter' ? 'Tell us about your organisation' : 'Start with the essentials',
      description:
        role === 'recruiter'
          ? 'This is the introduction athletes and coaches will see first.'
          : 'Create a clear introduction that shows who you are and what you are working toward.',
    },
    {
      key: 'role',
      label: role === 'recruiter' ? 'Organisation' : 'Sport profile',
      title:
        role === 'athlete'
          ? 'Your sporting identity'
          : role === 'coach'
            ? 'Your coaching focus'
            : 'Organisation details',
      description:
        role === 'athlete'
          ? 'Add the sports, level, and goals that should define your profile.'
          : role === 'coach'
            ? 'Show the sports and specialisations you coach, plus the roles you are open to.'
            : 'Describe what your organisation does and where you operate.',
    },
    {
      key: 'experience',
      label: role === 'recruiter' ? 'Programmes' : 'Experience',
      title:
        role === 'athlete'
          ? 'Experience and personal bests'
          : role === 'coach'
            ? 'Experience and certifications'
            : 'Programmes and activities',
      description:
        role === 'athlete'
          ? 'Add the career steps and performance markers that support your profile.'
          : role === 'coach'
            ? 'Document your coaching history and credentials.'
            : 'List the programmes, teams, or services your organisation offers.',
    },
    {
      key: 'contact',
      label: 'Privacy',
      title: 'Contact details and visibility',
      description:
        'Choose what you share publicly and which details are reserved for signed-in members.',
    },
    {
      key: 'review',
      label: 'Review',
      title: 'Review your profile',
      description: 'Check the essentials before your public profile goes live.',
    },
  ];
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUrl(value) {
  return /^https?:\/\/\S+$/i.test(value);
}

export function validateProfileStep(form, role, stepKey) {
  const errors = {};

  if (stepKey === 'basics') {
    if (!form.headline.trim()) errors.headline = 'Add a headline.';
    if (!form.bio.trim()) errors.bio = 'Add a short bio.';
    if (!form.location.city.trim()) errors['location.city'] = 'Add your city.';

    const latitude = form.location.latitude;
    const longitude = form.location.longitude;
    if ((latitude === '') !== (longitude === '')) {
      errors['location.latitude'] = 'Add both latitude and longitude, or leave both blank.';
    } else if (latitude !== '' && longitude !== '') {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        errors['location.latitude'] = 'Latitude must be between -90 and 90.';
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        errors['location.longitude'] = 'Longitude must be between -180 and 180.';
      }
    }
  }

  if (stepKey === 'role') {
    if (!form.sports.length) errors.sports = 'Add at least one sport.';
    if (role === 'athlete') {
      if (!form.level) errors.level = 'Choose your competition level.';
      if (form.experienceYears === '' || Number(form.experienceYears) < 0) {
        errors.experienceYears = 'Add your years of experience.';
      }
    }
    if (role === 'coach') {
      if (!form.specializations.length) {
        errors.specializations = 'Add at least one specialisation.';
      }
      if (form.experienceYears === '' || Number(form.experienceYears) < 0) {
        errors.experienceYears = 'Add your years of coaching experience.';
      }
    }
    if (role === 'recruiter') {
      if (!form.name.trim()) errors.name = 'Add the organisation name.';
      if (!form.organizationType) errors.organizationType = 'Choose an organisation type.';
    }
  }

  if (stepKey === 'contact') {
    if (form.contact.email.trim() && !isEmail(form.contact.email.trim())) {
      errors['contact.email'] = 'Enter a valid email address.';
    }
    if (form.contact.website.trim() && !isUrl(form.contact.website.trim())) {
      errors['contact.website'] = 'Enter a valid http(s) URL.';
    }
  }

  return errors;
}

export function stepIndexForField(field) {
  if (!field) return 0;
  if (field.startsWith('contact.') || field === 'visibility') return 3;
  if (
    field.startsWith('careerHistory') ||
    field.startsWith('personalBests') ||
    field.startsWith('certifications') ||
    field === 'activities'
  ) {
    return 2;
  }
  if (
    field === 'sports' ||
    field === 'level' ||
    field === 'ageCategory' ||
    field === 'competitionLevel' ||
    field === 'skills' ||
    field === 'experienceYears' ||
    field === 'specializations' ||
    field === 'availability' ||
    field === 'name' ||
    field === 'organizationType'
  ) {
    return 1;
  }
  return 0;
}

export { DEFAULT_VISIBILITY };

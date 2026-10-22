export const OPPORTUNITY_TYPE_OPTIONS = [
  { value: 'team_recruitment', label: 'Team recruitment' },
  { value: 'trials', label: 'Trials' },
  { value: 'scholarships', label: 'Scholarships' },
  { value: 'tournaments', label: 'Tournaments' },
  { value: 'camps', label: 'Camps' },
  { value: 'academy_admissions', label: 'Academy admissions' },
  { value: 'coaching_positions', label: 'Coaching positions' },
  { value: 'internships', label: 'Internships' },
];

export const OPPORTUNITY_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
  { value: 'expired', label: 'Expired' },
];

export const APPLICATION_STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Not selected' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export const OPPORTUNITY_SORT_OPTIONS = [
  { value: 'deadline', label: 'Closing soonest' },
  { value: 'recent', label: 'Recently published' },
  { value: 'title', label: 'Title A-Z' },
];

export const APPLICATION_ACTION_OPTIONS = [
  { value: 'under_review', label: 'Move to review' },
  { value: 'shortlisted', label: 'Shortlist' },
  { value: 'accepted', label: 'Accept' },
  { value: 'rejected', label: 'Not selected' },
];

export function opportunityTypeLabel(value) {
  return OPPORTUNITY_TYPE_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function opportunityStatusLabel(value) {
  return OPPORTUNITY_STATUS_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function applicationStatusLabel(value) {
  return APPLICATION_STATUS_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function opportunityStatusVariant(value) {
  if (value === 'published') return 'success';
  if (value === 'draft') return 'warning';
  if (value === 'closed') return 'neutral';
  if (value === 'expired') return 'danger';
  return 'neutral';
}

export function applicationStatusVariant(value) {
  if (value === 'accepted') return 'success';
  if (value === 'shortlisted') return 'brand';
  if (value === 'under_review') return 'warning';
  if (value === 'rejected') return 'danger';
  if (value === 'withdrawn') return 'neutral';
  return 'neutral';
}

export function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function dateInputToIso(value) {
  if (!value) return undefined;
  return new Date(`${value}T23:59:59`).toISOString();
}

export function formatDeadline(value) {
  if (!value) return 'No deadline';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function emptyOpportunityForm() {
  return {
    type: 'trials',
    title: '',
    description: '',
    sport: '',
    positions: [],
    location: { city: '', region: '', country: '' },
    deadline: '',
    eventStartDate: '',
    eventEndDate: '',
    positionsAvailable: 1,
    contactInstructions: '',
    requiredDocuments: [],
    eligibility: {
      levels: [],
      ageCategories: [],
      competitionLevels: [],
      minExperienceYears: '',
      maxExperienceYears: '',
      requiresVerifiedAchievement: false,
      notes: '',
    },
  };
}

export function opportunityToForm(opportunity) {
  return {
    type: opportunity.type || 'trials',
    title: opportunity.title || '',
    description: opportunity.description || '',
    sport: opportunity.sport || '',
    positions: opportunity.positions || [],
    location: {
      city: opportunity.location?.city || '',
      region: opportunity.location?.region || '',
      country: opportunity.location?.country || '',
    },
    deadline: toDateInput(opportunity.deadline),
    eventStartDate: toDateInput(opportunity.eventStartDate),
    eventEndDate: toDateInput(opportunity.eventEndDate),
    positionsAvailable: opportunity.positionsAvailable || 1,
    contactInstructions: opportunity.contactInstructions || '',
    requiredDocuments: opportunity.requiredDocuments || [],
    eligibility: {
      levels: opportunity.eligibility?.levels || [],
      ageCategories: opportunity.eligibility?.ageCategories || [],
      competitionLevels: opportunity.eligibility?.competitionLevels || [],
      minExperienceYears: opportunity.eligibility?.minExperienceYears ?? '',
      maxExperienceYears: opportunity.eligibility?.maxExperienceYears ?? '',
      requiresVerifiedAchievement:
        opportunity.eligibility?.requiresVerifiedAchievement || false,
      notes: opportunity.eligibility?.notes || '',
    },
  };
}

export function opportunityPayload(form) {
  return {
    type: form.type,
    title: form.title.trim(),
    description: form.description.trim(),
    sport: form.sport.trim(),
    positions: form.positions,
    location: form.location,
    deadline: dateInputToIso(form.deadline),
    eventStartDate: dateInputToIso(form.eventStartDate),
    eventEndDate: dateInputToIso(form.eventEndDate),
    positionsAvailable: Number(form.positionsAvailable) || 1,
    contactInstructions: form.contactInstructions.trim(),
    requiredDocuments: form.requiredDocuments,
    eligibility: {
      levels: form.eligibility.levels,
      ageCategories: form.eligibility.ageCategories,
      competitionLevels: form.eligibility.competitionLevels,
      minExperienceYears:
        form.eligibility.minExperienceYears === ''
          ? undefined
          : Number(form.eligibility.minExperienceYears),
      maxExperienceYears:
        form.eligibility.maxExperienceYears === ''
          ? undefined
          : Number(form.eligibility.maxExperienceYears),
      requiresVerifiedAchievement: form.eligibility.requiresVerifiedAchievement,
      notes: form.eligibility.notes.trim(),
    },
  };
}

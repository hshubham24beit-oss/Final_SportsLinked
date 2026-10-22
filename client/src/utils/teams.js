export const TEAM_TYPE_OPTIONS = [
  { value: 'team', label: 'Team' },
  { value: 'training_group', label: 'Training group' },
];

export const TEAM_PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

export const TEAM_MEMBER_ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'coach', label: 'Coach' },
  { value: 'member', label: 'Member' },
];

export const TEAM_TYPE_LABELS = Object.fromEntries(
  TEAM_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export const TEAM_ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  coach: 'Coach',
  member: 'Member',
};

export const TEAM_MEMBER_STATUS_LABELS = {
  invited: 'Invited',
  active: 'Active',
  declined: 'Declined',
  removed: 'Removed',
};

export function teamRoleLabel(role) {
  return TEAM_ROLE_LABELS[role] || 'Member';
}

export function emptyTeamForm() {
  return {
    name: '',
    description: '',
    sport: '',
    type: 'team',
    privacy: 'public',
    city: '',
    region: '',
    country: '',
  };
}

export function teamToForm(team) {
  return {
    name: team.name || '',
    description: team.description || '',
    sport: team.sport || '',
    type: team.type || 'team',
    privacy: team.privacy || 'public',
    city: team.location?.city || '',
    region: team.location?.region || '',
    country: team.location?.country || '',
  };
}

export function teamPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    sport: form.sport.trim(),
    type: form.type,
    privacy: form.privacy,
    location: {
      city: form.city.trim(),
      region: form.region.trim(),
      country: form.country.trim(),
    },
  };
}

export function teamLocation(team) {
  return [team.location?.city, team.location?.region, team.location?.country]
    .filter(Boolean)
    .join(', ');
}

import {
  FiActivity,
  FiBriefcase,
  FiCalendar,
  FiCompass,
  FiCpu,
  FiFilter,
  FiFlag,
  FiGrid,
  FiMessageCircle,
  FiRss,
  FiSearch,
  FiShield,
  FiSlash,
  FiTarget,
  FiUser,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';

export const ROLE_OPTIONS = [
  {
    value: 'athlete',
    label: 'Athlete',
    icon: FiActivity,
    tagline: 'Be discovered',
    description: 'Build a credible sporting profile and get noticed for the right opportunities.',
  },
  {
    value: 'coach',
    label: 'Coach',
    icon: FiTarget,
    tagline: 'Find and develop talent',
    description: 'Discover athletes, follow progress, and connect around programmes and roles.',
  },
  {
    value: 'recruiter',
    label: 'Recruiter',
    icon: FiBriefcase,
    tagline: 'Recruit with confidence',
    description: 'Search verified athlete profiles and manage opportunities for your organisation.',
  },
];

export const ROLE_META = {
  athlete: {
    label: 'Athlete',
    icon: FiActivity,
    summary:
      'Your workspace for building a credible profile, presenting achievements, and finding opportunities.',
    nextUp: [
      'Verified performance insights',
      'Team and competition feeds',
      'Advanced profile analytics',
    ],
    nav: [
      { label: 'Dashboard', to: '/dashboard', icon: FiGrid },
      { label: 'Feed', to: '/feed', icon: FiRss },
      { label: 'AI assistant', to: '/ai', icon: FiCpu },
      { label: 'My network', to: '/network', icon: FiUserPlus },
      { label: 'My profile', to: '/profile/edit', icon: FiUser },
      { label: 'Verification', to: '/verification', icon: FiShield },
      { label: 'Opportunities', to: '/opportunities', icon: FiBriefcase },
      { label: 'Events', to: '/events', icon: FiCalendar },
      { label: 'Teams', to: '/teams', icon: FiUsers },
      { label: 'My applications', to: '/applications', icon: FiActivity },
      { label: 'Saved opportunities', to: '/opportunities/saved', icon: FiCompass },
      { label: 'Safety', to: '/safety', icon: FiSlash },
      { label: 'Messages', to: '/messages', icon: FiMessageCircle },
    ],
  },
  coach: {
    label: 'Coach',
    icon: FiTarget,
    summary:
      'Your workspace for discovering athletes, supporting their development, and sharing opportunities.',
    nextUp: [
      'Candidate notes and outreach',
      'Shortlist sharing with recruiters',
      'Programme performance reporting',
    ],
    nav: [
      { label: 'Dashboard', to: '/dashboard', icon: FiGrid },
      { label: 'Feed', to: '/feed', icon: FiRss },
      { label: 'AI assistant', to: '/ai', icon: FiCpu },
      { label: 'My network', to: '/network', icon: FiUserPlus },
      { label: 'My profile', to: '/profile/edit', icon: FiUser },
      { label: 'Verification', to: '/verification', icon: FiShield },
      { label: 'Discover athletes', to: '/discovery', icon: FiSearch },
      { label: 'Opportunities', to: '/opportunities', icon: FiBriefcase },
      { label: 'Events', to: '/events', icon: FiCalendar },
      { label: 'Teams', to: '/teams', icon: FiUsers },
      { label: 'My opportunities', to: '/opportunities/mine', icon: FiFilter },
      { label: 'Safety', to: '/safety', icon: FiSlash },
      { label: 'Messages', to: '/messages', icon: FiMessageCircle },
    ],
  },
  recruiter: {
    label: 'Recruiter',
    icon: FiBriefcase,
    summary:
      'Your workspace for finding verified talent, posting opportunities, and managing a recruitment pipeline.',
    nextUp: [
      'Candidate notes and shortlist sharing',
      'Multi-recruiter collaboration',
      'Recruitment reporting',
    ],
    nav: [
      { label: 'Dashboard', to: '/dashboard', icon: FiGrid },
      { label: 'Feed', to: '/feed', icon: FiRss },
      { label: 'AI assistant', to: '/ai', icon: FiCpu },
      { label: 'My network', to: '/network', icon: FiUserPlus },
      { label: 'Organisation profile', to: '/profile/edit', icon: FiUser },
      { label: 'Verification', to: '/verification', icon: FiShield },
      { label: 'Talent search', to: '/discovery', icon: FiSearch },
      { label: 'Opportunities', to: '/opportunities', icon: FiBriefcase },
      { label: 'Events', to: '/events', icon: FiCalendar },
      { label: 'Teams', to: '/teams', icon: FiUsers },
      { label: 'Recruitment pipeline', to: '/opportunities/mine', icon: FiFilter },
      { label: 'Safety', to: '/safety', icon: FiSlash },
      { label: 'Messages', to: '/messages', icon: FiMessageCircle },
    ],
  },
  admin: {
    label: 'Administrator',
    icon: FiShield,
    summary:
      'Your workspace for platform oversight, verification review, and organisation management.',
    nextUp: [
      'Organisation verification',
      'Platform analytics',
      'Audit exports',
    ],
    nav: [
      { label: 'Dashboard', to: '/dashboard', icon: FiGrid },
      { label: 'Feed', to: '/feed', icon: FiRss },
      { label: 'Verification queue', to: '/admin/verifications', icon: FiShield },
      { label: 'Reports', to: '/admin/reports', icon: FiFlag },
      { label: 'Users', to: '/admin/users', icon: FiUsers },
      { label: 'Events', to: '/events', icon: FiCalendar },
      { label: 'Discover athletes', to: '/discovery', icon: FiSearch },
      { label: 'Organisations', icon: FiBriefcase, soon: true },
    ],
  },
};

export function getRoleMeta(role) {
  return ROLE_META[role] || ROLE_META.athlete;
}

export function getRoleLabel(role) {
  return getRoleMeta(role).label;
}

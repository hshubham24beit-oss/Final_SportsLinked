const ROLES = Object.freeze({
  ATHLETE: 'athlete',
  COACH: 'coach',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
});

const ROLE_VALUES = Object.values(ROLES);
const PUBLIC_ROLES = [ROLES.ATHLETE, ROLES.COACH, ROLES.RECRUITER];

const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  RESTRICTED: 'restricted',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
});

const USER_STATUS_VALUES = Object.values(USER_STATUS);

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const VISIBILITY_VALUES = ['public', 'connections', 'private'];

const PROFILE_SECTIONS = [
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

const VISIBILITY_DEFAULTS = {
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

const ATHLETE_LEVELS = ['beginner', 'amateur', 'semi_professional', 'professional', 'elite'];
const ATHLETE_LEVEL_LABELS = {
  beginner: 'Beginner',
  amateur: 'Amateur',
  semi_professional: 'Semi-professional',
  professional: 'Professional',
  elite: 'Elite',
};

const ATHLETE_AGE_CATEGORIES = ['under_14', 'under_16', 'under_18', 'under_21', 'senior', 'masters'];
const ATHLETE_AGE_CATEGORY_LABELS = {
  under_14: 'Under 14',
  under_16: 'Under 16',
  under_18: 'Under 18',
  under_21: 'Under 21',
  senior: 'Senior / open',
  masters: 'Masters (35+)',
};

const ATHLETE_COMPETITION_LEVELS = [
  'recreational',
  'school',
  'college',
  'state',
  'national',
  'international',
];
const ATHLETE_COMPETITION_LEVEL_LABELS = {
  recreational: 'Recreational',
  school: 'School',
  college: 'College',
  state: 'State',
  national: 'National',
  international: 'International',
};

const DISCOVERY_SORT_OPTIONS = ['relevance', 'completion', 'experience', 'recent'];
const ATHLETE_SKILLS_MAX = 20;

const OPPORTUNITY_TYPES = [
  'trials',
  'scholarships',
  'contracts',
  'part_time',
  'full_time',
  'representation',
  'other',
];
const OPPORTUNITY_LABELS = {
  trials: 'Trials',
  scholarships: 'Scholarships',
  contracts: 'Contracts',
  part_time: 'Part-time roles',
  full_time: 'Full-time roles',
  representation: 'Representation',
  other: 'Other opportunities',
};

const OPPORTUNITY_CATEGORIES = [
  'team_recruitment',
  'trials',
  'scholarships',
  'tournaments',
  'camps',
  'academy_admissions',
  'coaching_positions',
  'internships',
];
const OPPORTUNITY_CATEGORY_LABELS = {
  team_recruitment: 'Team recruitment',
  trials: 'Trials',
  scholarships: 'Scholarships',
  tournaments: 'Tournaments',
  camps: 'Camps',
  academy_admissions: 'Academy admissions',
  coaching_positions: 'Coaching positions',
  internships: 'Internships',
};

const OPPORTUNITY_STATUSES = ['draft', 'published', 'closed', 'expired'];
const OPPORTUNITY_STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  expired: 'Expired',
};
const OPPORTUNITY_SORT_OPTIONS = ['deadline', 'recent', 'title'];

const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'shortlisted',
  'rejected',
  'accepted',
  'withdrawn',
];
const APPLICATION_STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  rejected: 'Not selected',
  accepted: 'Accepted',
  withdrawn: 'Withdrawn',
};
const APPLICATION_STATUS_TRANSITIONS = {
  submitted: ['under_review', 'shortlisted', 'rejected', 'accepted', 'withdrawn'],
  under_review: ['shortlisted', 'rejected', 'accepted', 'withdrawn'],
  shortlisted: ['accepted', 'rejected', 'withdrawn'],
  rejected: [],
  accepted: [],
  withdrawn: [],
};

const NOTIFICATION_TYPES = [
  'application_received',
  'application_status_changed',
  'application_withdrawn',
  'verification_decision',
  'verification_expired',
  'connection_request',
  'connection_accepted',
  'connection_rejected',
  'post_like',
  'post_comment',
  'post_share',
  'message_received',
  'opportunity_deadline',
  'event_cancelled',
  'event_waitlist_promoted',
  'team_invitation',
  'team_member_joined',
  'team_update',
];

const EMAIL_PREFERENCE_KEYS = [
  'messages',
  'connections',
  'applications',
  'verifications',
  'social',
  'opportunityDeadlines',
  'events',
  'teams',
];

const EMAIL_PREFERENCE_LABELS = {
  messages: 'Direct messages',
  connections: 'Connection requests and updates',
  applications: 'Application activity',
  verifications: 'Verification decisions',
  social: 'Likes, comments, and shares',
  opportunityDeadlines: 'Saved opportunity deadline reminders',
  events: 'Event registrations and changes',
  teams: 'Team invitations, membership, and updates',
};

const EMAIL_PREFERENCE_DEFAULTS = {
  messages: true,
  connections: true,
  applications: true,
  verifications: true,
  social: false,
  opportunityDeadlines: true,
  events: true,
  teams: true,
};

const NOTIFICATION_EMAIL_CATEGORY = {
  application_received: 'applications',
  application_status_changed: 'applications',
  application_withdrawn: 'applications',
  verification_decision: 'verifications',
  verification_expired: 'verifications',
  connection_request: 'connections',
  connection_accepted: 'connections',
  connection_rejected: 'connections',
  post_like: 'social',
  post_comment: 'social',
  post_share: 'social',
  message_received: 'messages',
  opportunity_deadline: 'opportunityDeadlines',
  event_cancelled: 'events',
  event_waitlist_promoted: 'events',
  team_invitation: 'teams',
  team_member_joined: 'teams',
  team_update: 'teams',
};

const EVENT_TYPES = [
  'competition',
  'trial',
  'training',
  'camp',
  'showcase',
  'community',
  'other',
];
const EVENT_TYPE_LABELS = {
  competition: 'Competition',
  trial: 'Trial',
  training: 'Training session',
  camp: 'Camp',
  showcase: 'Showcase',
  community: 'Community event',
  other: 'Other',
};
const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'completed'];
const EVENT_STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  cancelled: 'Cancelled',
  completed: 'Completed',
};
const EVENT_SORT_OPTIONS = ['date', 'recent', 'title'];
const EVENT_REGISTRATION_STATUSES = [
  'registered',
  'waitlisted',
  'interested',
  'cancelled',
];
const EVENT_REGISTRATION_STATUS_LABELS = {
  registered: 'Registered',
  waitlisted: 'Waitlisted',
  interested: 'Interested',
  cancelled: 'Cancelled',
};
const EVENT_CAPACITY_MAX = 10000;
const EVENT_TITLE_MAX = 160;
const EVENT_DESCRIPTION_MAX = 10000;
const EVENT_CANCELLATION_REASON_MAX = 1000;

const TEAM_TYPES = ['team', 'training_group'];
const TEAM_TYPE_LABELS = {
  team: 'Team',
  training_group: 'Training group',
};
const TEAM_PRIVACY_VALUES = ['public', 'private'];
const TEAM_PRIVACY_LABELS = {
  public: 'Public',
  private: 'Private',
};
const TEAM_MEMBER_ROLES = ['owner', 'manager', 'coach', 'member'];
const TEAM_MEMBER_ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  coach: 'Coach',
  member: 'Member',
};
const TEAM_MEMBER_STATUSES = ['invited', 'active', 'declined', 'removed'];
const TEAM_MEMBER_STATUS_LABELS = {
  invited: 'Invited',
  active: 'Active',
  declined: 'Declined',
  removed: 'Removed',
};
const TEAM_NAME_MAX = 120;
const TEAM_DESCRIPTION_MAX = 4000;
const TEAM_UPDATE_MAX = 3000;
const TEAM_UPDATES_KEPT = 50;

const MESSAGE_TEXT_MAX = 4000;
const MESSAGE_PAGE_DEFAULT = 30;
const MESSAGE_PAGE_MAX = 100;
const CONVERSATION_PAGE_DEFAULT = 20;
const CONVERSATION_PAGE_MAX = 50;

const VERIFICATION_TYPES = ['identity', 'qualification', 'achievement'];
const VERIFICATION_TYPE_LABELS = {
  identity: 'Identity',
  qualification: 'Qualification',
  achievement: 'Achievement',
};
const VERIFICATION_STATUSES = [
  'unverified',
  'requested',
  'under_review',
  'verified',
  'rejected',
  'expired',
];
const VERIFICATION_STATUS_LABELS = {
  unverified: 'Not submitted',
  requested: 'Requested',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
};
const VERIFICATION_ACTIVE_STATUSES = ['requested', 'under_review', 'verified'];
const VERIFICATION_DECISIONS = ['approved', 'rejected'];
const VERIFICATION_EVIDENCE_MAX = 5;
const VERIFICATION_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
const VERIFICATION_SIGNED_URL_TTL_SECONDS = 5 * 60;
const VERIFICATION_DEFAULT_EXPIRY_DAYS = {
  identity: 730,
  qualification: 1095,
  achievement: 0,
};
const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const REPORT_TARGET_TYPES = ['user', 'post', 'opportunity', 'message'];
const REPORT_REASONS = [
  'spam',
  'harassment',
  'impersonation',
  'inappropriate_content',
  'fraud',
  'other',
];
const REPORT_REASON_LABELS = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or abuse',
  impersonation: 'Impersonation',
  inappropriate_content: 'Inappropriate content',
  fraud: 'Fraud or scam',
  other: 'Other',
};
const REPORT_STATUSES = ['open', 'under_review', 'resolved', 'dismissed'];
const REPORT_STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const OPPORTUNITY_REQUIRED_DOCUMENTS_MAX = 10;
const APPLICATION_DOCUMENTS_MAX = 10;
const APPLICATION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const COACH_AVAILABILITY = ['open_to_roles', 'open_to_consulting', 'not_available'];
const COACH_AVAILABILITY_LABELS = {
  open_to_roles: 'Open to coaching roles',
  open_to_consulting: 'Open to consulting',
  not_available: 'Not currently available',
};

const ORGANIZATION_TYPES = [
  'club',
  'academy',
  'team',
  'agency',
  'federation',
  'school',
  'university',
  'other',
];
const ORGANIZATION_TYPE_LABELS = {
  club: 'Club',
  academy: 'Academy',
  team: 'Team',
  agency: 'Agency',
  federation: 'Federation',
  school: 'School',
  university: 'University',
  other: 'Other',
};

const CONNECTION_STATUSES = ['pending', 'accepted', 'rejected', 'cancelled'];
const CONNECTION_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Connected',
  rejected: 'Declined',
  cancelled: 'Cancelled',
};
const CONNECTION_MESSAGE_MAX = 500;

const POST_TYPES = ['text', 'achievement', 'opportunity'];
const POST_TYPE_LABELS = {
  text: 'Update',
  achievement: 'Achievement',
  opportunity: 'Opportunity',
  share: 'Shared post',
};
const POST_VISIBILITY_VALUES = ['public', 'connections'];
const POST_VISIBILITY_LABELS = {
  public: 'Anyone',
  connections: 'Connections only',
};
const POST_TEXT_MAX = 3000;
const POST_MEDIA_MAX = 4;
const COMMENT_TEXT_MAX = 1000;
const FEED_PAGE_DEFAULT = 10;
const FEED_PAGE_MAX = 25;

const ACHIEVEMENT_VERIFICATION_STATUS = [
  'unverified',
  'pending',
  'verified',
  'rejected',
  'expired',
];
const STATISTIC_MAX = 50;
const GALLERY_MAX = 12;
const ACHIEVEMENT_EVIDENCE_MAX = 10;

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

module.exports = {
  ROLES,
  ROLE_VALUES,
  PUBLIC_ROLES,
  USER_STATUS,
  USER_STATUS_VALUES,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  VISIBILITY_VALUES,
  PROFILE_SECTIONS,
  VISIBILITY_DEFAULTS,
  ATHLETE_LEVELS,
  ATHLETE_LEVEL_LABELS,
  ATHLETE_AGE_CATEGORIES,
  ATHLETE_AGE_CATEGORY_LABELS,
  ATHLETE_COMPETITION_LEVELS,
  ATHLETE_COMPETITION_LEVEL_LABELS,
  DISCOVERY_SORT_OPTIONS,
  ATHLETE_SKILLS_MAX,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_LABELS,
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_CATEGORY_LABELS,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_SORT_OPTIONS,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TRANSITIONS,
  NOTIFICATION_TYPES,
  EMAIL_PREFERENCE_KEYS,
  EMAIL_PREFERENCE_LABELS,
  EMAIL_PREFERENCE_DEFAULTS,
  NOTIFICATION_EMAIL_CATEGORY,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  EVENT_SORT_OPTIONS,
  EVENT_REGISTRATION_STATUSES,
  EVENT_REGISTRATION_STATUS_LABELS,
  EVENT_CAPACITY_MAX,
  EVENT_TITLE_MAX,
  EVENT_DESCRIPTION_MAX,
  EVENT_CANCELLATION_REASON_MAX,
  TEAM_TYPES,
  TEAM_TYPE_LABELS,
  TEAM_PRIVACY_VALUES,
  TEAM_PRIVACY_LABELS,
  TEAM_MEMBER_ROLES,
  TEAM_MEMBER_ROLE_LABELS,
  TEAM_MEMBER_STATUSES,
  TEAM_MEMBER_STATUS_LABELS,
  TEAM_NAME_MAX,
  TEAM_DESCRIPTION_MAX,
  TEAM_UPDATE_MAX,
  TEAM_UPDATES_KEPT,
  MESSAGE_TEXT_MAX,
  MESSAGE_PAGE_DEFAULT,
  MESSAGE_PAGE_MAX,
  CONVERSATION_PAGE_DEFAULT,
  CONVERSATION_PAGE_MAX,
  VERIFICATION_TYPES,
  VERIFICATION_TYPE_LABELS,
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_ACTIVE_STATUSES,
  VERIFICATION_DECISIONS,
  VERIFICATION_EVIDENCE_MAX,
  VERIFICATION_EVIDENCE_MAX_BYTES,
  VERIFICATION_SIGNED_URL_TTL_SECONDS,
  VERIFICATION_DEFAULT_EXPIRY_DAYS,
  ALLOWED_EVIDENCE_TYPES,
  REPORT_TARGET_TYPES,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
  OPPORTUNITY_REQUIRED_DOCUMENTS_MAX,
  APPLICATION_DOCUMENTS_MAX,
  APPLICATION_DOCUMENT_MAX_BYTES,
  ALLOWED_DOCUMENT_TYPES,
  COACH_AVAILABILITY,
  COACH_AVAILABILITY_LABELS,
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
  CONNECTION_STATUSES,
  CONNECTION_STATUS_LABELS,
  CONNECTION_MESSAGE_MAX,
  POST_TYPES,
  POST_TYPE_LABELS,
  POST_VISIBILITY_VALUES,
  POST_VISIBILITY_LABELS,
  POST_TEXT_MAX,
  POST_MEDIA_MAX,
  COMMENT_TEXT_MAX,
  FEED_PAGE_DEFAULT,
  FEED_PAGE_MAX,
  ACHIEVEMENT_VERIFICATION_STATUS,
  STATISTIC_MAX,
  GALLERY_MAX,
  ACHIEVEMENT_EVIDENCE_MAX,
  IMAGE_MAX_BYTES,
  ALLOWED_IMAGE_TYPES,
};

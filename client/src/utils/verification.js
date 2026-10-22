export const VERIFICATION_TYPE_OPTIONS = [
  { value: 'identity', label: 'Identity' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'achievement', label: 'Achievement' },
];

export const REPORT_REASON_OPTIONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'other', label: 'Other' },
];

export const REPORT_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

export const ACCOUNT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'suspended', label: 'Suspended' },
];

const VERIFICATION_STATUS = {
  unverified: { label: 'Not submitted', variant: 'neutral' },
  requested: { label: 'Requested', variant: 'warning' },
  under_review: { label: 'Under review', variant: 'info' },
  verified: { label: 'Verified', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  expired: { label: 'Expired', variant: 'warning' },
};

const ACHIEVEMENT_STATUS = {
  unverified: { label: 'Not submitted', variant: 'neutral' },
  pending: { label: 'Pending review', variant: 'warning' },
  verified: { label: 'Verified', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  expired: { label: 'Expired', variant: 'warning' },
};

export function verificationStatusLabel(status) {
  return VERIFICATION_STATUS[status]?.label || 'Not submitted';
}

export function verificationStatusVariant(status) {
  return VERIFICATION_STATUS[status]?.variant || 'neutral';
}

export function achievementStatusLabel(status) {
  return ACHIEVEMENT_STATUS[status]?.label || 'Not submitted';
}

export function achievementStatusVariant(status) {
  return ACHIEVEMENT_STATUS[status]?.variant || 'neutral';
}

export function verificationTypeLabel(type) {
  return (
    VERIFICATION_TYPE_OPTIONS.find((option) => option.value === type)?.label ||
    type ||
    ''
  );
}

export function reportStatusVariant(status) {
  if (status === 'resolved') return 'success';
  if (status === 'dismissed') return 'neutral';
  if (status === 'under_review') return 'info';
  return 'warning';
}

export function reportReasonLabel(reason) {
  return REPORT_REASON_OPTIONS.find((option) => option.value === reason)?.label || reason;
}

export function reportStatusLabel(status) {
  return REPORT_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export function accountStatusVariant(status) {
  if (status === 'active') return 'success';
  if (status === 'restricted') return 'warning';
  if (status === 'suspended') return 'danger';
  return 'neutral';
}

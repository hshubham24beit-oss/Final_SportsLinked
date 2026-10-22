export const STATUS_META = {
  active: { label: 'Active', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'danger' },
  deactivated: { label: 'Deactivated', variant: 'neutral' },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: 'Unknown', variant: 'neutral' };
}

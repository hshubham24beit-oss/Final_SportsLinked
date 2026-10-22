export const AI_TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'concise', label: 'Concise' },
  { value: 'confident', label: 'Confident' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'reflective', label: 'Reflective' },
];

const GENERATED_BY_LABELS = {
  'ai-provider': 'AI-assisted draft',
  fallback: 'Built-in fallback draft',
  'rule-based': 'Built-in rule-based suggestion',
};

export function generatedByLabel(value) {
  return GENERATED_BY_LABELS[value] || 'Built-in suggestion';
}

export function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function suggestionVariant(suggestion) {
  return suggestion?.degraded ? 'warning' : 'brand';
}

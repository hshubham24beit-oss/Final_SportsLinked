const provider = require('./provider');

const TONE_LABELS = {
  professional: 'professional',
  concise: 'concise',
  enthusiastic: 'enthusiastic',
  reflective: 'reflective',
};

function clean(value) {
  return String(value || '').trim();
}

function sentence(value) {
  const text = clean(value);
  if (!text) {
    return '';
  }
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function formatDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function postFallback(input) {
  const sport = clean(input.sport);
  const parts = [];
  const opener =
    input.tone === 'enthusiastic'
      ? 'Sharing an update'
      : input.tone === 'reflective'
        ? 'Reflecting on'
        : 'Update';

  parts.push(`${opener}: ${sentence(input.topic)}`);
  if (input.details) {
    parts.push(sentence(input.details));
  }
  if (sport) {
    parts.push(`Sport: ${sport}.`);
  }
  return parts.join(' ').slice(0, 3000);
}

function achievementFallback(input) {
  const achievement = input.achievement || {};
  const title = clean(achievement.title) || clean(input.topic) || 'an achievement';
  const result = clean(achievement.result);
  const competition = clean(achievement.competition);
  const sport = clean(input.sport || achievement.sport);
  const date = formatDate(achievement.date);
  const parts = [];

  const context = competition ? ` at ${competition}` : '';
  parts.push(
    `${result ? `${result}` : 'Recorded a result'}${context} in ${title}${sport ? ` (${sport})` : ''}${date ? ` on ${date}` : ''}.`,
  );
  if (input.details) {
    parts.push(sentence(input.details));
  }
  parts.push('This description is based on the details supplied by the athlete.');
  return parts.join(' ').slice(0, 2000);
}

function criteriaFor(input) {
  const base = [
    { key: 'kind', label: 'Draft type', value: input.kind === 'post' ? 'Post' : 'Achievement description' },
    { key: 'topic', label: 'Topic', value: input.topic || 'Not provided' },
    { key: 'details', label: 'Details', value: input.details || 'Not provided' },
    { key: 'sport', label: 'Sport', value: input.sport || 'Not provided' },
    { key: 'tone', label: 'Tone', value: TONE_LABELS[input.tone] || 'professional' },
  ];

  if (input.kind === 'achievement') {
    base.push(
      { key: 'achievement.title', label: 'Achievement', value: input.achievement?.title || 'Not provided' },
      { key: 'achievement.competition', label: 'Competition', value: input.achievement?.competition || 'Not provided' },
      { key: 'achievement.result', label: 'Result', value: input.achievement?.result || 'Not provided' },
      { key: 'achievement.date', label: 'Date', value: formatDate(input.achievement?.date) || 'Not provided' },
    );
  }

  return base;
}

async function draftContent(user, input) {
  const fallback =
    input.kind === 'post' ? postFallback(input) : achievementFallback(input);
  const maxCharacters = input.kind === 'post' ? 3000 : 2000;

  const facts =
    input.kind === 'achievement'
      ? {
          kind: 'achievement description',
          topic: input.topic || '',
          details: input.details || '',
          sport: input.sport || input.achievement?.sport || '',
          achievement: {
            title: input.achievement?.title || '',
            competition: input.achievement?.competition || '',
            result: input.achievement?.result || '',
            date: input.achievement?.date || null,
          },
        }
      : {
          kind: 'social post',
          topic: input.topic || '',
          details: input.details || '',
          sport: input.sport || '',
        };

  const result = await provider.generateText({
    system:
      'You draft concise sports content. Use only the facts supplied. Never invent results, achievements, verification, statistics, endorsements, or claims about athletic ability. Return plain text only, without headings or quotation marks.',
    prompt: JSON.stringify({
      task:
        input.kind === 'post'
          ? 'Draft a social post for the user to review.'
          : 'Draft a factual achievement description for the user to review.',
      role: user.role,
      tone: input.tone || 'professional',
      maximumCharacters: Math.min(maxCharacters, 1200),
      facts,
    }),
    maxTokens: 350,
    temperature: 0.45,
  });

  const usingProvider = Boolean(result.text);
  const text = (usingProvider ? result.text : fallback).slice(0, maxCharacters);
  const generatedBy = usingProvider
    ? 'ai-provider'
    : result.configured
      ? 'fallback'
      : 'rule-based';

  return {
    draft: {
      kind: input.kind,
      text,
      label: 'Suggestion — review and edit before publishing',
      verified: false,
      generatedBy,
      degraded: generatedBy === 'fallback',
      wordCount: text.split(/\s+/).filter(Boolean).length,
      notice:
        generatedBy === 'fallback'
          ? 'The external AI provider was unavailable, so a built-in draft was generated instead.'
          : 'This is an editable suggestion. It has not been published or verified.',
    },
    criteria: criteriaFor(input),
  };
}

module.exports = {
  draftContent,
  criteriaFor,
};

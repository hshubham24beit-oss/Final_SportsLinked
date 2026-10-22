const provider = require('./provider');

const ROLE_LABELS = {
  athlete: 'athlete',
  coach: 'coach',
  recruiter: 'recruiter',
};

const TONE_OPENERS = {
  professional: 'Focused on',
  concise: '',
  confident: 'I bring',
};

function unique(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const key = String(value || '').trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function listText(values, fallback = '') {
  const items = unique(values).filter(Boolean);
  if (items.length === 0) {
    return fallback;
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function locationText(location = {}) {
  return [location.city, location.country].filter(Boolean).join(', ');
}

function criteriaFor(input) {
  return [
    { key: 'headline', label: 'Current headline', value: input.headline || 'Not provided' },
    { key: 'bio', label: 'Current bio', value: input.bio || 'Not provided' },
    { key: 'sports', label: 'Sports', value: listText(input.sports) || 'Not provided' },
    { key: 'positions', label: 'Positions', value: listText(input.positions) || 'Not provided' },
    {
      key: 'experienceYears',
      label: 'Experience',
      value:
        input.experienceYears === undefined
          ? 'Not provided'
          : `${input.experienceYears} years`,
    },
    {
      key: 'currentTeam',
      label: 'Current team or organisation',
      value: input.currentTeam || 'Not provided',
    },
    {
      key: 'location',
      label: 'Location',
      value: locationText(input.location) || 'Not provided',
    },
    {
      key: 'highlights',
      label: 'Highlights supplied',
      value: input.highlights?.length ? input.highlights.join(' | ') : 'Not provided',
    },
    { key: 'tone', label: 'Requested tone', value: input.tone || 'professional' },
  ];
}

function buildHeadline(user, input) {
  const roleLabel = ROLE_LABELS[user.role] || 'sports professional';
  const sport = input.sports?.[0];
  const position = input.positions?.[0];
  const experience =
    typeof input.experienceYears === 'number' && input.experienceYears > 0
      ? ` · ${input.experienceYears} years' experience`
      : '';
  const focus = position || sport || 'Sport';

  if (input.headline?.trim()) {
    return input.headline.trim().slice(0, 160);
  }
  if (user.role === 'coach') {
    return `${sport ? `${sport} ` : ''}coach${experience}`.slice(0, 160);
  }
  if (user.role === 'recruiter') {
    return `${sport ? `${sport} ` : ''}talent recruiter${experience}`.slice(0, 160);
  }
  return `${focus} ${roleLabel}${experience}`.slice(0, 160);
}

function buildBio(input) {
  const opener = TONE_OPENERS[input.tone] || TONE_OPENERS.professional;
  const sport = listText(input.sports, 'sport');
  const positions = listText(input.positions);
  const place = locationText(input.location);
  const sentences = [];

  if (opener === 'I bring') {
    sentences.push(
      `I bring experience across ${sport}${positions ? `, with a focus on ${positions}` : ''}.`,
    );
  } else if (opener) {
    sentences.push(
      `Focused on ${sport}${positions ? ` and ${positions}` : ''}.`,
    );
  } else {
    sentences.push(`${sport}${positions ? ` · ${positions}` : ''}.`);
  }

  if (typeof input.experienceYears === 'number' && input.experienceYears > 0) {
    sentences.push(`${input.experienceYears} years of experience in the sport.`);
  }

  if (input.currentTeam) {
    sentences.push(`Currently involved with ${input.currentTeam}.`);
  }

  if (place) {
    sentences.push(`Based in ${place}.`);
  }

  if (input.highlights?.length) {
    sentences.push(
      `Selected highlights include ${listText(input.highlights.slice(0, 4))}.`,
    );
  }

  sentences.push(
    'Open to relevant sporting opportunities and conversations that match this background.',
  );

  return sentences.join(' ').slice(0, 2000);
}

async function suggestProfile(user, input) {
  const criteria = criteriaFor(input);
  const headline = buildHeadline(user, input);
  const fallbackBio = buildBio(input);

  const result = await provider.generateText({
    system:
      'You improve short sports profiles. Rewrite only the facts supplied by the user. Do not invent achievements, numerical results, verification, endorsements, or claims about athletic ability. Return plain text only, no headings or quotes.',
    prompt: JSON.stringify({
      task: 'Rewrite this profile bio as a clear, factual suggestion.',
      role: user.role,
      tone: input.tone || 'professional',
      maximumCharacters: 900,
      facts: {
        headline: input.headline || '',
        bio: input.bio || '',
        sports: input.sports || [],
        positions: input.positions || [],
        experienceYears: input.experienceYears ?? null,
        currentTeam: input.currentTeam || '',
        location: {
          city: input.location?.city || '',
          country: input.location?.country || '',
        },
        highlights: input.highlights || [],
      },
    }),
    maxTokens: 350,
    temperature: 0.35,
  });

  const usingProvider = Boolean(result.text);
  const bio = (usingProvider ? result.text : fallbackBio).slice(0, 2000);
  const generatedBy = usingProvider
    ? 'ai-provider'
    : result.configured
      ? 'fallback'
      : 'rule-based';

  return {
    suggestion: {
      headline,
      bio,
      label: 'Suggestion — review and edit before saving',
      verified: false,
      generatedBy,
      degraded: generatedBy === 'fallback',
      notice:
        generatedBy === 'fallback'
          ? 'The external AI provider was unavailable, so a built-in factual draft was generated instead.'
          : 'This is an editable suggestion based only on the details you supplied. Review it before saving.',
    },
    criteria,
  };
}

module.exports = {
  suggestProfile,
  buildBio,
  buildHeadline,
  criteriaFor,
};

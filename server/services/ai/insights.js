const profileService = require('../profile.service');
const ApiError = require('../../utils/ApiError');
const { ROLES } = require('../../config/constants');

function toPlain(item) {
  return item?.toObject ? item.toObject() : item || {};
}

function metricKey(metric, unit) {
  return `${String(metric || '').trim().toLowerCase()}::${String(unit || '').trim().toLowerCase()}`;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function trendLabel(change) {
  if (change > 0) {
    return 'increased';
  }
  if (change < 0) {
    return 'decreased';
  }
  return 'unchanged';
}

function buildMetricGroups(statistics = []) {
  const groups = new Map();

  for (const item of statistics) {
    const raw = toPlain(item);
    const metric = String(raw.metric || '').trim();
    if (!metric || !Number.isFinite(Number(raw.value))) {
      continue;
    }
    const key = metricKey(metric, raw.unit);
    const group = groups.get(key) || {
      metric,
      unit: raw.unit || '',
      records: [],
    };
    group.records.push({
      value: Number(raw.value),
      unit: raw.unit || '',
      date: raw.date || null,
    });
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const records = [...group.records].sort((left, right) => {
      const leftTime = left.date ? new Date(left.date).getTime() : 0;
      const rightTime = right.date ? new Date(right.date).getTime() : 0;
      return leftTime - rightTime;
    });
    const dated = records.filter((record) => record.date);
    const latest = dated[dated.length - 1] || records[records.length - 1];
    const previous = dated.length >= 2 ? dated[dated.length - 2] : null;
    const change = previous ? latest.value - previous.value : null;

    return {
      metric: group.metric,
      unit: group.unit,
      recordCount: records.length,
      latest,
      previous,
      change,
      direction: change === null ? 'not enough records' : trendLabel(change),
      summary:
        change === null
          ? `One recorded value is available for ${group.metric}.`
          : `The latest recorded value for ${group.metric} is ${formatNumber(latest.value)}${group.unit ? ` ${group.unit}` : ''}, ${trendLabel(change)} by ${formatNumber(Math.abs(change))}${group.unit ? ` ${group.unit}` : ''} from the previous recorded value.`,
      records,
    };
  });
}

function buildPersonalBests(personalBests = []) {
  return personalBests
    .map(toPlain)
    .filter((item) => item.event)
    .map((item) => ({
      event: item.event || '',
      result: item.result || '',
      unit: item.unit || '',
      date: item.date || null,
      competition: item.competition || '',
    }))
    .sort((left, right) => {
      const leftTime = left.date ? new Date(left.date).getTime() : 0;
      const rightTime = right.date ? new Date(right.date).getTime() : 0;
      return rightTime - leftTime;
    });
}

async function performanceInsights(user) {
  if (user.role !== ROLES.ATHLETE) {
    throw ApiError.forbidden(
      'Performance insights are available for athlete accounts only.',
      'INSIGHTS_ROLE_FORBIDDEN',
    );
  }

  const profile = await profileService.getOwnProfile(user);
  if (!profile) {
    throw ApiError.notFound(
      'Complete onboarding before requesting performance insights.',
      'PROFILE_NOT_FOUND',
    );
  }

  const metricGroups = buildMetricGroups(profile.statistics || []);
  const personalBests = buildPersonalBests(profile.personalBests || []);
  const summary = metricGroups.map((group) => ({
    metric: group.metric,
    unit: group.unit,
    direction: group.direction,
    latestValue: group.latest?.value ?? null,
    latestDate: group.latest?.date || null,
    change: group.change,
    text: group.summary,
  }));

  if (personalBests.length > 0) {
    summary.push({
      metric: 'Personal bests',
      unit: '',
      direction: 'descriptive',
      latestValue: personalBests.length,
      latestDate: personalBests[0]?.date || null,
      change: null,
      text: `${personalBests.length} personal-best ${personalBests.length === 1 ? 'entry is' : 'entries are'} recorded across ${new Set(personalBests.map((entry) => entry.event)).size} event${new Set(personalBests.map((entry) => entry.event)).size === 1 ? '' : 's'}.`,
    });
  }

  return {
    insights: {
      summary,
      metricGroups,
      personalBests,
      recordCounts: {
        statistics: (profile.statistics || []).length,
        personalBests: personalBests.length,
      },
      label: 'Descriptive suggestion from your records',
      verified: false,
      generatedBy: 'rule-based',
      disclaimer:
        'This is a descriptive summary of the structured records you entered. It does not assess athletic ability, predict performance, or verify any result.',
      notice:
        'Trend text only compares recorded numbers. Review the underlying records below before drawing conclusions.',
    },
  };
}

module.exports = {
  performanceInsights,
  buildMetricGroups,
  buildPersonalBests,
};

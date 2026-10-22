import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./client', () => ({ default: apiMock }));

const { aiApi } = await import('./ai.api');
const {
  generatedByLabel,
  splitList,
  suggestionVariant,
} = await import('../utils/ai');

describe('Phase 9 AI client helpers', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((mock) => mock.mockReset());
  });

  it('sends profile and content drafts without extra client-side writes', () => {
    aiApi.profileSuggestion({ headline: 'Sprint athlete', bio: 'Context' });
    aiApi.contentDraft({ kind: 'post', topic: 'Training update' });

    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/ai/profile-suggestion', {
      headline: 'Sprint athlete',
      bio: 'Context',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/ai/content-draft', {
      kind: 'post',
      topic: 'Training update',
    });
  });

  it('requests matches, recommendations, and insights from AI endpoints', () => {
    aiApi.opportunityMatches({ sport: 'Athletics' });
    aiApi.profileRecommendations();
    aiApi.performanceInsights();

    expect(apiMock.post).toHaveBeenCalledWith('/ai/opportunity-matches', {
      sport: 'Athletics',
    });
    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/ai/profile-recommendations');
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/ai/performance-insights');
  });

  it('labels generated suggestions and converts comma-separated lists', () => {
    expect(generatedByLabel('ai-provider')).toBe('AI-assisted draft');
    expect(generatedByLabel('fallback')).toBe('Built-in fallback draft');
    expect(generatedByLabel('rule-based')).toBe('Built-in rule-based suggestion');
    expect(splitList(' 100m, Long jump ,, ')).toEqual(['100m', 'Long jump']);
    expect(suggestionVariant({ degraded: true })).toBe('warning');
    expect(suggestionVariant({ degraded: false })).toBe('brand');
  });
});

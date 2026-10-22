import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AiAssistant from './AiAssistant';

const mocks = vi.hoisted(() => ({
  profileGet: vi.fn(),
  profileUpdate: vi.fn(),
  profileSuggestion: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../api/profile.api', () => ({
  profileApi: {
    getMyProfile: mocks.profileGet,
    updateProfile: mocks.profileUpdate,
  },
}));

vi.mock('../api/ai.api', () => ({
  aiApi: {
    profileSuggestion: mocks.profileSuggestion,
    contentDraft: vi.fn(),
    opportunityMatches: vi.fn(),
    profileRecommendations: vi.fn(),
    performanceInsights: vi.fn(),
  },
}));

vi.mock('../api/posts.api', () => ({ postsApi: { create: vi.fn() } }));
vi.mock('../api/achievement.api', () => ({ achievementApi: { create: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'athlete-1', role: 'athlete', name: 'Test Athlete' },
  }),
}));
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    success: mocks.toastSuccess,
    error: vi.fn(),
    info: vi.fn(),
  }),
}));
vi.mock('../hooks/useDocumentTitle', () => ({ useDocumentTitle: () => {} }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/ai?tab=profile']}>
      <AiAssistant />
    </MemoryRouter>,
  );
}

describe('AI assistant page', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.profileGet.mockResolvedValue({
      data: {
        data: {
          profile: {
            headline: 'Sprint athlete',
            bio: 'I train and compete in sprint events.',
            sports: ['Athletics'],
            positions: ['100m'],
            experienceYears: 6,
            location: { city: 'Pune', region: 'Maharashtra', country: 'India' },
          },
        },
      },
    });
    mocks.profileUpdate.mockResolvedValue({ data: { data: { profile: {} } } });
    mocks.profileSuggestion.mockResolvedValue({
      data: {
        data: {
          suggestion: {
            headline: 'National sprint athlete',
            bio: 'Athletics athlete with six years of experience in Pune.',
            label: 'Suggestion - review and edit before saving',
            verified: false,
            generatedBy: 'rule-based',
            degraded: false,
          },
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads profile details and requires explicit approval before saving', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    expect(screen.getByRole('heading', { name: 'AI assistant' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Sprint athlete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Generate suggestion' }));

    expect(await screen.findByDisplayValue('National sprint athlete')).toBeInTheDocument();
    expect(mocks.profileUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Accept and save to profile' }));

    await waitFor(() => {
      expect(mocks.profileUpdate).toHaveBeenCalledWith({
        headline: 'National sprint athlete',
        bio: 'Athletics athlete with six years of experience in Pune.',
      });
    });
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Nothing is saved automatically/));
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });
});

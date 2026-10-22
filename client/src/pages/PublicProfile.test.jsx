import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicProfile from './PublicProfile';
import { profileApi } from '../api/profile.api';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../api/profile.api', () => ({
  profileApi: {
    getPublicProfile: vi.fn(),
  },
}));

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/p/test-athlete']}>
      <Routes>
        <Route path="/p/:slug" element={<PublicProfile />} />
      </Routes>
    </MemoryRouter>,
  );
}

const publicProfile = {
  slug: 'test-athlete',
  role: 'athlete',
  owner: {
    id: 'athlete-1',
    name: 'Test Athlete',
    joinedAt: '2025-01-01T00:00:00.000Z',
  },
  network: {
    connectionStatus: 'none',
    connectionCount: 12,
    followerCount: 34,
    followingCount: 8,
    mutualConnectionsCount: 3,
    isFollowing: false,
  },
  activity: [
    {
      id: 'post-1',
      type: 'text',
      text: 'Back on the track after a strong training block.',
      media: [],
      visibility: 'public',
      likeCount: 7,
      commentCount: 2,
      sharedPost: null,
      createdAt: '2026-10-20T09:00:00.000Z',
      author: { id: 'athlete-1', name: 'Test Athlete' },
    },
  ],
  headline: 'Sprint athlete',
  bio: 'Focused on national competition.',
  avatar: null,
  cover: null,
  location: { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
  contact: null,
  achievements: [
    {
      id: 'verified-1',
      title: 'State champion',
      sport: 'Athletics',
      competition: 'State Championships',
      result: 'Gold',
      date: '2025-06-01T00:00:00.000Z',
      description: 'Won the 100m final.',
      verified: true,
    },
    {
      id: 'unverified-1',
      title: 'Club medal',
      sport: 'Athletics',
      competition: 'Club meet',
      result: 'Silver',
      date: null,
      description: '',
      verified: false,
    },
  ],
  mediaGallery: [],
  statistics: [],
  personalBests: [],
  careerHistory: [],
  certifications: [],
  preferredOpportunities: [],
  sports: ['Athletics'],
  positions: ['100m'],
  level: 'professional',
  availableForTrials: false,
  viewer: { isOwner: false },
};

describe('PublicProfile', () => {
  beforeEach(() => {
    profileApi.getPublicProfile.mockReset();
  });

  it('renders public details and only marks explicitly verified achievements', async () => {
    profileApi.getPublicProfile.mockResolvedValue({
      data: { data: { profile: publicProfile } },
    });

    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Test Athlete' })).toBeInTheDocument();
    expect(screen.getByText('State champion')).toBeInTheDocument();
    expect(screen.getByText('Club medal')).toBeInTheDocument();
    expect(screen.getAllByText('Verified')).toHaveLength(1);
    expect(screen.queryByText('Pending review')).not.toBeInTheDocument();
    expect(screen.queryByText(/private evidence/i)).not.toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(
      screen.getByText('Back on the track after a strong training block.'),
    ).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText('3 mutual connections')).toBeInTheDocument();
  });

  it('shows a not-found state for missing profiles', async () => {
    profileApi.getPublicProfile.mockRejectedValue({ response: { status: 404 } });

    renderProfile();

    expect(await screen.findByText('Profile not found')).toBeInTheDocument();
  });
});

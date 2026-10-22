import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AthleteCard from './AthleteCard';

const athlete = {
  userId: 'athlete-1',
  slug: 'asha-sprint',
  name: 'Asha Sprint',
  avatarUrl: null,
  headline: 'Sprint athlete focused on national competition',
  sports: ['Athletics'],
  positions: ['100m'],
  skills: ['Sprint starts', 'Race tactics'],
  level: 'professional',
  ageCategory: 'senior',
  competitionLevel: 'national',
  experienceYears: 6,
  currentTeam: 'Mumbai Striders',
  location: { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
  availableForTrials: true,
  verifiedAchievements: 2,
  saved: false,
};

function renderCard(overrides = {}) {
  const props = {
    athlete,
    onPreview: vi.fn(),
    onToggleSaved: vi.fn(),
    isSaving: false,
    canSave: true,
    ...overrides,
  };
  render(
    <MemoryRouter>
      <AthleteCard {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe('AthleteCard', () => {
  it('renders only the discovery-safe athlete summary', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Asha Sprint' })).toHaveAttribute(
      'href',
      '/p/asha-sprint',
    );
    expect(screen.getByText('Mumbai, Maharashtra, India')).toBeInTheDocument();
    expect(screen.getByText('6 years experience')).toBeInTheDocument();
    expect(screen.getByText('Open to trials')).toBeInTheDocument();
    expect(screen.getByText('2 verified achievements')).toBeInTheDocument();
  });

  it('requests a saved toggle and opens the preview', () => {
    const props = renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Save Asha Sprint' }));
    expect(props.onToggleSaved).toHaveBeenCalledWith(athlete);

    fireEvent.click(screen.getByRole('button', { name: 'Quick view' }));
    expect(props.onPreview).toHaveBeenCalledWith(athlete);
  });

  it('hides the save control from roles that cannot save candidates', () => {
    renderCard({ canSave: false });

    expect(screen.queryByRole('button', { name: /Save Asha Sprint/ })).toBeNull();
  });
});

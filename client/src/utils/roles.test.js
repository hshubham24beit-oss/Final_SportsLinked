import { describe, expect, it } from 'vitest';
import { getRoleLabel, getRoleMeta, isNavItemActive, ROLE_OPTIONS } from './roles';

describe('role configuration', () => {
  it('offers only public roles during registration', () => {
    expect(ROLE_OPTIONS.map((role) => role.value)).toEqual(['athlete', 'coach', 'recruiter']);
  });

  it('gives each role a distinct navigation set', () => {
    const athleteNav = getRoleMeta('athlete').nav.map((item) => item.label);
    const recruiterNav = getRoleMeta('recruiter').nav.map((item) => item.label);

    expect(athleteNav).toContain('My profile');
    expect(recruiterNav).toContain('Talent search');
    expect(athleteNav).not.toEqual(recruiterNav);
  });

  it('falls back to athlete metadata for unknown roles', () => {
    expect(getRoleMeta('unknown')).toBe(getRoleMeta('athlete'));
    expect(getRoleLabel('admin')).toBe('Administrator');
  });

  it('links built admin tools and only leaves unbuilt tools as upcoming', () => {
    const adminNav = getRoleMeta('admin').nav;
    const organisations = adminNav.find((item) => item.label === 'Organisations');
    const opportunities = getRoleMeta('coach').nav.find(
      (item) => item.to === '/opportunities',
    );
    const messages = getRoleMeta('athlete').nav.find(
      (item) => item.to === '/messages',
    );

    expect(organisations.to).toBe('/admin/organisations');
    expect(organisations.soon).toBeUndefined();
    expect(adminNav.filter((item) => item.soon).every((item) => !item.to)).toBe(true);
    expect(opportunities.soon).toBeUndefined();
    expect(messages.soon).toBeUndefined();
  });

  it('links coaches and recruiters to saved candidates and saved opportunities', () => {
    ['coach', 'recruiter'].forEach((role) => {
      const destinations = getRoleMeta(role).nav.map((item) => item.to);

      expect(destinations).toContain('/discovery/saved');
      expect(destinations).toContain('/opportunities/saved');
    });
  });

  it('marks only the most specific navigation item as active', () => {
    const athleteNav = getRoleMeta('athlete').nav;
    const opportunities = athleteNav.find((item) => item.to === '/opportunities');
    const savedOpportunities = athleteNav.find(
      (item) => item.to === '/opportunities/saved',
    );
    const coachNav = getRoleMeta('coach').nav;
    const discover = coachNav.find((item) => item.to === '/discovery');
    const savedCandidates = coachNav.find((item) => item.to === '/discovery/saved');

    expect(isNavItemActive('/opportunities/saved', opportunities, athleteNav)).toBe(false);
    expect(isNavItemActive('/opportunities/saved', savedOpportunities, athleteNav)).toBe(true);
    expect(isNavItemActive('/opportunities/123', opportunities, athleteNav)).toBe(true);
    expect(isNavItemActive('/discovery/saved', discover, coachNav)).toBe(false);
    expect(isNavItemActive('/discovery/saved', savedCandidates, coachNav)).toBe(true);
    expect(isNavItemActive('/dashboard', opportunities, athleteNav)).toBe(false);
  });
});

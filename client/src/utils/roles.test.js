import { describe, expect, it } from 'vitest';
import { getRoleLabel, getRoleMeta, ROLE_OPTIONS } from './roles';

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

  it('marks future workspace tools as upcoming and leaves built tools active', () => {
    const adminNav = getRoleMeta('admin').nav;
    const futureItems = adminNav.filter((item) => item.soon);
    const opportunities = getRoleMeta('coach').nav.find(
      (item) => item.to === '/opportunities',
    );
    const messages = getRoleMeta('athlete').nav.find(
      (item) => item.to === '/messages',
    );

    expect(futureItems.length).toBeGreaterThan(0);
    expect(futureItems.every((item) => !item.to)).toBe(true);
    expect(opportunities.soon).toBeUndefined();
    expect(messages.soon).toBeUndefined();
  });
});

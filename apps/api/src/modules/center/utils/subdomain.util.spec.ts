import { buildSubdomainCandidate, slugifyCenterName } from './subdomain.util';

describe('subdomain utils', () => {
  it('slugifies center name into lowercase kebab-case', () => {
    expect(slugifyCenterName(' Academix Demo Center ')).toBe(
      'academix-demo-center',
    );
  });

  it('removes accents and non-url-safe characters', () => {
    expect(slugifyCenterName('École أكاديميّة 2026!!')).toBe('ecole-2026');
  });

  it('uses fallback when no valid slug characters exist', () => {
    expect(slugifyCenterName('***')).toBe('center');
  });

  it('builds suffixed candidates within 63-character DNS label limit', () => {
    const base = 'a'.repeat(63);
    expect(buildSubdomainCandidate(base, 0)).toHaveLength(63);
    expect(buildSubdomainCandidate(base, 1)).toBe(`${'a'.repeat(61)}-2`);
    expect(buildSubdomainCandidate(base, 10)).toBe(`${'a'.repeat(60)}-11`);
  });
});

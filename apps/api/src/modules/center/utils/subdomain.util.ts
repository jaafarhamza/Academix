const MAX_SUBDOMAIN_LENGTH = 63;
const SUBDOMAIN_FALLBACK = 'center';

export function slugifyCenterName(centerName: string): string {
  const normalized = centerName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  const safeSlug = slug || SUBDOMAIN_FALLBACK;
  return safeSlug.slice(0, MAX_SUBDOMAIN_LENGTH);
}

export function buildSubdomainCandidate(
  baseSubdomain: string,
  attempt: number,
): string {
  const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
  const truncatedBase = baseSubdomain.slice(
    0,
    MAX_SUBDOMAIN_LENGTH - suffix.length,
  );
  return `${truncatedBase}${suffix}`;
}

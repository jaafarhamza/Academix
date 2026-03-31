const MAX_GROUP_NAME_LENGTH = 140;
const GROUP_NAME_FALLBACK = 'Group';

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function buildStudentGroupBaseName(
  teacherFirstName: string,
  teacherLastName: string,
  subjectName: string,
): string {
  const teacherName = normalizeWhitespace(
    `${teacherFirstName} ${teacherLastName}`,
  );
  const normalizedSubjectName = normalizeWhitespace(subjectName);

  const baseName = [teacherName, normalizedSubjectName]
    .filter((part) => part.length > 0)
    .join(' - ');

  const safeName = baseName.length > 0 ? baseName : GROUP_NAME_FALLBACK;
  return safeName.slice(0, MAX_GROUP_NAME_LENGTH);
}

export function buildStudentGroupNameCandidate(
  baseName: string,
  attempt: number,
): string {
  const suffix = attempt === 0 ? '' : ` (${attempt + 1})`;
  const truncatedBase = baseName.slice(
    0,
    MAX_GROUP_NAME_LENGTH - suffix.length,
  );
  return `${truncatedBase}${suffix}`;
}

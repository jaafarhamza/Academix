import {
  buildStudentGroupBaseName,
  buildStudentGroupNameCandidate,
} from './student-group-name.util';

describe('student-group-name util', () => {
  it('builds base name from teacher and subject', () => {
    expect(buildStudentGroupBaseName('Nadia', 'Teacher', 'Mathematics')).toBe(
      'Nadia Teacher - Mathematics',
    );
  });

  it('normalizes whitespace and uses fallback when missing values', () => {
    expect(buildStudentGroupBaseName('  ', '', '   ')).toBe('Group');
    expect(
      buildStudentGroupBaseName('  Nadia  ', '  Teacher ', '  Math  Basics '),
    ).toBe('Nadia Teacher - Math Basics');
  });

  it('builds candidate names with incremental suffixes within length limit', () => {
    const base = 'A'.repeat(140);
    expect(buildStudentGroupNameCandidate(base, 0)).toHaveLength(140);
    expect(buildStudentGroupNameCandidate(base, 1)).toBe(
      `${'A'.repeat(136)} (2)`,
    );
    expect(buildStudentGroupNameCandidate(base, 9)).toBe(
      `${'A'.repeat(135)} (10)`,
    );
  });
});

export class TeacherSubjectTeacherDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
}

export class TeacherSubjectSubjectDto {
  id!: string;
  name!: string;
}

export class TeacherSubjectResponseDto {
  id!: string;
  teacher_id!: string;
  subject_id!: string;
  teacher!: TeacherSubjectTeacherDto;
  subject!: TeacherSubjectSubjectDto;
}

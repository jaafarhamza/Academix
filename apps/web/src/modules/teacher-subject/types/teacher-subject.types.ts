export type TeacherSubjectTeacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type TeacherSubjectSubject = {
  id: string;
  name: string;
};

export type TeacherSubjectAssignment = {
  id: string;
  teacher_id: string;
  subject_id: string;
  teacher: TeacherSubjectTeacher;
  subject: TeacherSubjectSubject;
};

export type TeacherSubjectListQuery = {
  teacherId?: string;
  subjectId?: string;
  page?: number;
  limit?: number;
};

export type TeacherSubjectCreatePayload = {
  teacherId: string;
  subjectId: string;
};

export type TeacherSubjectStatus = {
  module: string;
  status: string;
};

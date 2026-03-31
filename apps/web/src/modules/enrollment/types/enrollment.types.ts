export type Enrollment = {
  id: string;
  student_id: string;
  student_group_id: string;
  enrollmentDate: string;
  isActive: boolean;
};

export type EnrollmentListQuery = {
  studentId?: string;
  studentGroupId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export type EnrollmentCreatePayload = {
  studentId: string;
  studentGroupId: string;
  enrollmentDate?: string;
};

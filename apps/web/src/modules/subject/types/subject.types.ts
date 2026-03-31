export type Subject = {
  id: string;
  center_id: string;
  name: string;
  description: string;
};

export type SubjectDetail = Subject & {
  teacherAssignmentsCount: number;
  sessionsCount: number;
};

export type SubjectListQuery = {
  search?: string;
  page?: number;
  limit?: number;
};

export type SubjectCreatePayload = {
  name: string;
  description: string;
};

export type SubjectUpdatePayload = Partial<{
  name: string;
  description: string;
}>;

export type SubjectStatus = {
  module: string;
  status: string;
};

-- Multi-tenant RLS policies for tenant-scoped tables.
-- RLS is forced so table owners are also subject to policies.
--
-- Request context contract:
--   set_config('app.current_center_id', '<uuid>', true)
--
-- IMPORTANT:
-- - This migration intentionally allows "no context" (NULL current_center_id)
--   to preserve bootstrap/login flows. Harden this later by changing
--   app.tenant_access_by_center() to default-deny when context is missing.

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_center_uuid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_center_id text;
BEGIN
  raw_center_id := current_setting('app.current_center_id', true);

  IF raw_center_id IS NULL OR btrim(raw_center_id) = '' THEN
    RETURN NULL;
  END IF;

  RETURN raw_center_id::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION app.tenant_access_by_center(row_center_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.current_center_uuid() IS NULL
      OR row_center_id = app.current_center_uuid();
$$;

CREATE OR REPLACE FUNCTION app.tenant_access_teacher_subject(
  row_teacher_id uuid,
  row_subject_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = row_teacher_id
        AND app.tenant_access_by_center(u.center_id)
    )
    AND EXISTS (
      SELECT 1
      FROM subjects s
      WHERE s.id = row_subject_id
        AND app.tenant_access_by_center(s.center_id)
    );
$$;

CREATE OR REPLACE FUNCTION app.tenant_access_enrollment(
  row_student_id uuid,
  row_student_group_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = row_student_id
        AND app.tenant_access_by_center(u.center_id)
    )
    AND EXISTS (
      SELECT 1
      FROM student_groups sg
      WHERE sg.id = row_student_group_id
        AND app.tenant_access_by_center(sg.center_id)
    );
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_isolation_policy ON users;
CREATE POLICY users_tenant_isolation_policy
ON users
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subjects_tenant_isolation_policy ON subjects;
CREATE POLICY subjects_tenant_isolation_policy
ON subjects
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_subjects_tenant_isolation_policy ON teacher_subjects;
CREATE POLICY teacher_subjects_tenant_isolation_policy
ON teacher_subjects
FOR ALL
USING (app.tenant_access_teacher_subject(teacher_id, subject_id))
WITH CHECK (app.tenant_access_teacher_subject(teacher_id, subject_id));

ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_groups_tenant_isolation_policy ON student_groups;
CREATE POLICY student_groups_tenant_isolation_policy
ON student_groups
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enrollments_tenant_isolation_policy ON enrollments;
CREATE POLICY enrollments_tenant_isolation_policy
ON enrollments
FOR ALL
USING (app.tenant_access_enrollment(student_id, student_group_id))
WITH CHECK (app.tenant_access_enrollment(student_id, student_group_id));

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rooms_tenant_isolation_policy ON rooms;
CREATE POLICY rooms_tenant_isolation_policy
ON rooms
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_sessions_tenant_isolation_policy ON course_sessions;
CREATE POLICY course_sessions_tenant_isolation_policy
ON course_sessions
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_tenant_isolation_policy ON payments;
CREATE POLICY payments_tenant_isolation_policy
ON payments
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE center_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_costs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS center_costs_tenant_isolation_policy ON center_costs;
CREATE POLICY center_costs_tenant_isolation_policy
ON center_costs
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE center_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_expenses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS center_expenses_tenant_isolation_policy ON center_expenses;
CREATE POLICY center_expenses_tenant_isolation_policy
ON center_expenses
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permissions_tenant_isolation_policy ON role_permissions;
CREATE POLICY role_permissions_tenant_isolation_policy
ON role_permissions
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_tenant_isolation_policy ON notifications;
CREATE POLICY notifications_tenant_isolation_policy
ON notifications
FOR ALL
USING (app.tenant_access_by_center(center_id))
WITH CHECK (app.tenant_access_by_center(center_id));

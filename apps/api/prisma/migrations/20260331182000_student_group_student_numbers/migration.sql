-- Add denormalized active-student counter to student groups.
ALTER TABLE student_groups
ADD COLUMN student_numbers INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing active enrollments.
UPDATE student_groups AS sg
SET student_numbers = active_counts.active_count
FROM (
  SELECT
    student_group_id,
    COUNT(*)::INTEGER AS active_count
  FROM enrollments
  WHERE is_active = true
  GROUP BY student_group_id
) AS active_counts
WHERE sg.id = active_counts.student_group_id;

-- Prevent room double-booking at the database level.
-- Notes:
-- - Uses half-open ranges [start, end) so adjacent sessions are allowed.
-- - Ignores cancelled sessions.
-- - Requires btree_gist to support equality operators in GiST over uuid/enum.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE course_sessions
DROP CONSTRAINT IF EXISTS course_sessions_room_no_overlap_excl;

ALTER TABLE course_sessions
ADD CONSTRAINT course_sessions_room_no_overlap_excl
EXCLUDE USING gist (
  center_id WITH =,
  room_id WITH =,
  day WITH =,
  int4range(
    extract(epoch FROM start_time)::integer,
    extract(epoch FROM end_time)::integer,
    '[)'
  ) WITH &&
)
WHERE (status <> 'CANCELLED');

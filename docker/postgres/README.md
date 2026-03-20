# PostgreSQL Docker Assets

Use this directory for Postgres container-specific resources.

## `initdb/`

Any `*.sql`, `*.sql.gz`, or executable `*.sh` files under `/docker-entrypoint-initdb.d`
are executed only on first initialization of an empty Postgres data directory.

Suggested usage:

1. Place non-destructive bootstrap scripts in `initdb/` (extensions, seed roles, etc.).
2. Keep migrations in your application migration system (Prisma migrations in this project).
3. Avoid appending destructive SQL to initialization scripts because they only run once.

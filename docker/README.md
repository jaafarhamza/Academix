# Docker Compose Configuration

## Environment Variables

Use the provided template file as your Compose environment source:

```bash
docker compose --env-file docker/.env.compose.example -f docker-compose.yml up -d
```

For local/private usage, copy it and customize secrets:

```bash
cp docker/.env.compose.example docker/.env.compose.local
docker compose --env-file docker/.env.compose.local -f docker-compose.yml up -d
```

## What Is Configured

- Named volumes for PostgreSQL and pgAdmin persistence.
- Dedicated `public_network` and `private_network` for service segmentation.
- Compose-level variable interpolation for ports, credentials, URLs, volume names, and network names.

## Centralized Docker Layout

```text
docker/
  backend/    # NestJS Dockerfile
  frontend/   # Next.js Dockerfile
  nginx/      # Reverse proxy image + config templates
  postgres/   # Postgres init resources
```

- `docker/backend/Dockerfile` is used by the `api` service.
- `docker/frontend/Dockerfile` is used by the `web` service.
- `docker/postgres/initdb` is mounted to `/docker-entrypoint-initdb.d` (first DB init only).
- `docker/nginx` is prepared for a future reverse-proxy service.
- Legacy Dockerfiles under `apps/api` and `apps/web` were removed to avoid config drift.

## Health Checks And Logs

- All services have Docker health checks (`postgres`, `api`, `web`, `pgadmin`).
- All services use the same log driver + rotation policy via compose defaults.

Check health quickly:

```bash
docker compose --env-file docker/.env.compose.local -f docker-compose.yml ps
```

Follow logs for all services:

```bash
docker compose --env-file docker/.env.compose.local -f docker-compose.yml logs -f --tail=100
```

Follow logs per service:

```bash
docker compose --env-file docker/.env.compose.local -f docker-compose.yml logs -f --tail=100 api web postgres pgadmin
```

## Prisma Migrations (Initial + Verification)

Create/apply the initial migration in development:

```bash
cd apps/api
npm run prisma:migrate:dev -- --name init
```

Production-style apply (safe for deploy pipelines):

```bash
cd apps/api
npm run prisma:migrate:deploy
```

Verify migration status:

```bash
cd apps/api
npx prisma migrate status
```

Verify schema objects in PostgreSQL:

```bash
docker compose --env-file docker/.env.compose.local -f docker-compose.yml exec -T postgres \
  psql -U academix -d academix -c "\dt"
```

## Prisma Seed Data

Run seed data (1 center + sample users + sessions + payments + permissions + notifications):

```bash
cd apps/api
npm run prisma:seed
```

Verify seeded counts quickly:

```bash
docker compose --env-file docker/.env.compose.local -f docker-compose.yml exec -T postgres \
  psql -U academix -d academix -c "SELECT 'users' AS table_name, count(*) FROM users;"
```

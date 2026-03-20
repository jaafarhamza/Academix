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

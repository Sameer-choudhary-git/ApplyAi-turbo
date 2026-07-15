# Docker — ApplyAi (explainers & commands)

This document explains the repo Docker setup and common commands.

Why changes were made
- Switched scheduler/worker base image to node:22-bullseye-slim to avoid musl/OpenSSL issues (Prisma).
- Added common OS deps (libssl-dev, build-essential, procps) so native builds and runtime process checks work.
- Added PNPM_VERSION build arg for reproducible pnpm install.
- Healthchecks now verify a node process exists in container.

Where files are
- infra/docker/docker-compose.yml — service orchestration (redis, scheduler, worker, redis-ui).
- infra/docker/Dockerfile.scheduler — scheduler image.
- infra/docker/Dockerfile.worker — worker image.

Build / run
- From infra/docker:
  - Copy env: cp .env.docker .env
  - Start services: docker-compose up -d
  - Build images (explicit): docker-compose build --no-cache
  - Scale workers: docker-compose up -d --scale worker=3

Useful commands
- Show status: docker-compose ps
- Stream logs: docker-compose logs -f worker
- Tail all logs: docker-compose logs -f
- Stop & remove: docker-compose down
- Rebuild single service: docker-compose build worker && docker-compose up -d worker
- Remove all stopped containers: docker container prune
- Show container shell: docker exec -it applyai-worker /bin/bash

Notes on healthchecks
- Healthchecks use ps to confirm a node process is running. This is a lightweight runtime check for worker/scheduler containers.
- If you need a stricter check (e.g., attempt Redis or DB connection), implement a small script in the service that exits non-zero when dependencies are missing and use that script in healthcheck.

Troubleshooting
- Prisma / OpenSSL errors: Alpine (musl) images often need additional steps. Using Debian-based image (bullseye-slim) avoids many issues.
- build failures: ensure your environment variables from .env are present (DATABASE_URL, etc.) before starting containers.
- Long install times: first build caches dependencies; subsequent builds are faster.

Tips
- Keep .dockerignore at the repository root to avoid sending node_modules and build artifacts into Docker build context.
- Use --scale to run multiple workers for throughput.
- Use docker-compose logs -f worker to inspect failed jobs during debugging.

Common examples
- Start dev stack: cd infra/docker && cp .env.docker .env && docker-compose up -d
- Rebuild after code change: docker-compose build scheduler worker && docker-compose up -d
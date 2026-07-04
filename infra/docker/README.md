# Docker Setup for ApplyAI (Supabase Edition)

## Quick Start

```bash
cd infra/docker
cp .env.docker .env
docker-compose up -d
```

## Services

- **Redis** - BullMQ queue (port 6379)
- **Extractor** - Scrapes jobs hourly
- **Scheduler** - Queues users (cron)
- **Worker** - Applies to jobs (×1-5)
- **Redis UI** - Monitor at http://localhost:8081

Database: Supabase (managed PostgreSQL)

## Commands

```bash
docker-compose ps
docker-compose logs -f worker
docker-compose up -d --scale worker=3
docker-compose down
```

## Setup

1. Update `.env` with your Supabase DATABASE_URL
2. Run docker-compose up -d
3. Check: docker-compose ps

# Azure VM Docker deployment

This Compose stack runs the API, scheduler, worker, and internal Redis on the
Azure VM. The React frontend is deployed separately to Vercel.

## First deployment

```bash
cd infra/docker
cp .env.docker .env
# Edit .env and replace every placeholder with the production value.
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/health/ping
```

Set `API_HOST_PORT` in `.env` if the API should listen on a port other than
3000. For production, place a TLS reverse proxy (for example Caddy or Nginx)
in front of this port and set `PUBLIC_API_URL` to its HTTPS URL.

## Services

- `api` — public Hono API for the Vercel frontend
- `scheduler` — recurring job orchestration
- `worker` — BullMQ job processing; scale with `--scale worker=3`
- `redis` — private queue/cache; it is not published to the host

Redis Commander is intentionally disabled by default. Start it only for
maintenance with `docker compose --profile tools up -d redis-ui` and restrict
network access to its host port.

## Operations

```bash
docker compose logs -f api
docker compose logs -f worker
docker compose up -d --build
docker compose up -d --scale worker=3
docker compose down
```

The Azure Network Security Group should allow inbound `80` and `443` for the
reverse proxy, and should not expose Redis (`6379`) or Redis Commander.

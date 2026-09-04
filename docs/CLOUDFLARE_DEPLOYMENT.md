# Cloudflare Deployment Decision Record

## Decision

ApplyAI will use Cloudflare Workers as an **edge API gateway** in front of the existing Node/Hono API first. The Node API remains the system of record for Prisma, Redis, BullMQ enqueueing, Google APIs, and the current worker/scheduler topology.

```text
applyai.studio frontend
        |
        v
Cloudflare Worker: applyai-api-proxy
        |
        v
Render: Node/Hono API
        |
        +--> PostgreSQL/Supabase through Prisma + pg
        +--> Redis through redis/ioredis
        +--> BullMQ -> worker/scheduler
```

This is the least risky migration because the current API build explicitly targets Node and externalizes `pg`, Prisma’s PostgreSQL adapter, Redis clients, BullMQ, Playwright, and Sentry’s Node packages. The API also reads configuration from `process.env` and starts through `@hono/node-server`.

## Why Prisma is not the blocker by itself

Prisma can run in a Cloudflare Worker, but it must use an edge-compatible database path. Current Cloudflare and Prisma guidance supports PostgreSQL through Hyperdrive with `@prisma/adapter-pg`, or Prisma Postgres/Accelerate. A traditional direct TCP connection string is not a safe assumption for an edge isolate. A Worker-native Prisma client would need a request-scoped connection based on `env.HYPERDRIVE.connectionString` or an Accelerate URL rather than the current module-global `process.env.DATABASE_URL` client.

## What prevents a direct full migration today

The current API imports and behavior create several additional blockers:

| Current dependency | Why it matters for Workers | Required future change |
|---|---|---|
| `@hono/node-server` | Starts a Node HTTP listener | Export a Worker `fetch` handler instead |
| `@applyai/db` | Creates a module-global `PrismaPg` from `process.env` | Create Prisma per request from a Hyperdrive/Accelerate binding |
| `redis` | Uses a Node Redis client and socket connection | Replace with KV, Cache API, HTTP Redis, or a Worker-compatible cache adapter |
| `@applyai/queue`/BullMQ | BullMQ/ioredis assume Node Redis and long-lived consumers | Replace enqueueing with Cloudflare Queues or an HTTP queue gateway |
| `process.env` across routes | Workers use `c.env` bindings | Introduce typed Hono bindings and pass configuration to services |
| `googleapis` | Node-oriented OAuth client package | Replace with direct `fetch` OAuth calls or isolate Calendar routes on Node |
| Playwright/browser automation | Requires a browser runtime and is not an edge request concern | Keep in the Node worker/VM service |
| Scheduler process | Requires a long-running process and cron ownership | Keep current scheduler or use Cloudflare Cron Triggers to enqueue a queue message |

## Current implementation

`apps/cloudflare-api-proxy` is a small, locked-down Worker. It forwards supported HTTP methods, paths, query strings, authorization headers, cookies, and request bodies to one HTTPS origin. It handles ApplyAI preflight CORS for the production web origins and never imports the Node API bundle, Prisma, Redis, or worker packages.

The Worker is intentionally not an open proxy. It has one configured `API_ORIGIN`, rejects non-HTTPS origins, restricts methods, and returns a controlled 502 when the Render origin cannot be reached.

## Deployment steps

From the repository root:

```bash
pnpm install
pnpm --filter @applyai/cloudflare-api-proxy check-types
```

Set the Render API origin in `apps/cloudflare-api-proxy/wrangler.toml`, or use Wrangler environment-specific configuration. Then deploy:

```bash
pnpm --filter @applyai/cloudflare-api-proxy deploy
```

After deployment, configure the frontend API URL to use the Worker hostname or a custom Cloudflare route. Verify:

```bash
curl -i https://YOUR-WORKER-DOMAIN/health/ping
curl -i https://YOUR-WORKER-DOMAIN/health
```

Then verify one authenticated profile request and one read-only feature request from the browser. The Render API must remain reachable from Cloudflare, and Render CORS should continue to allow the Worker/website request pattern.

## Future full edge migration plan

A direct Workers API migration should be staged rather than attempted as one rewrite:

1. Introduce an `Env`-based configuration interface and remove route-level `process.env` reads.
2. Create a Worker entrypoint that exports `fetch` while preserving the existing Hono route composition.
3. Add a request-scoped Prisma factory using Hyperdrive or Prisma Accelerate.
4. Replace Redis cache calls with a storage abstraction and implement a KV/Cache API adapter.
5. Replace BullMQ API enqueue calls with Cloudflare Queues or a durable HTTP queue gateway.
6. Move Google OAuth from `googleapis` to direct standards-based `fetch` calls or retain those routes on the Node origin.
7. Add Worker-specific Sentry/observability and verify all third-party libraries under `nodejs_compat`.
8. Keep Playwright, Greenhouse autofill, Unstop browser automation, and generated-document work on a Node worker service.
9. Migrate read-heavy, low-risk routes first, then transactional routes after contract and load testing.
10. Switch frontend traffic route by route using Cloudflare routing, with Render retained as rollback origin.

## References

[1]: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/prisma-orm/ "Cloudflare Hyperdrive Prisma ORM example"
[2]: https://developers.cloudflare.com/workers/runtime-apis/nodejs/ "Cloudflare Workers Node.js compatibility"
[3]: https://www.prisma.io/docs/orm/v7/prisma-client/deployment/edge/overview "Prisma ORM edge deployment overview"
[4]: https://hono.dev/examples/prisma "Hono and Prisma on Cloudflare Workers"

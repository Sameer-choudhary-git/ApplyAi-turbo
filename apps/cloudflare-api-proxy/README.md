# ApplyAI Cloudflare API Proxy

This package provides a Cloudflare Workers edge gateway in front of the existing ApplyAI Node/Hono API.

## Why this boundary exists

The current API is a Node service. It directly uses Prisma with `@prisma/adapter-pg`, the `pg` driver, Node-oriented Redis clients, BullMQ enqueueing, `googleapis`, and a Node server adapter. The worker and scheduler also depend on Redis sockets, filesystem access, Playwright, and long-lived processes. Importing the complete API bundle into a Cloudflare Worker would therefore require a substantial runtime refactor.

This proxy is the safe first migration step:

```text
Browser -> Cloudflare Worker -> Render Node/Hono API -> Prisma/PostgreSQL
                                      |
                                      +-> Redis/BullMQ -> Worker/Scheduler
```

Cloudflare handles the public edge URL, TLS, routing, caching policy, and DDoS/WAF controls. Render continues to run the Node API, Prisma adapter, Redis integration, queue producers, and existing background services until a separate Workers-native API migration is intentionally completed.

## Local check

From the repository root:

```bash
pnpm --filter @applyai/cloudflare-api-proxy check-types
```

To run locally, set an origin in `wrangler.toml` or use a local Wrangler variable and run:

```bash
pnpm --filter @applyai/cloudflare-api-proxy dev
```

## Deploy

1. Install Wrangler and authenticate with the Cloudflare account that owns the Worker.
2. Replace the placeholder `API_ORIGIN` in `wrangler.toml` with the HTTPS Render API origin. Do not include a path beyond the API base path unless intentionally configured.
3. Run `pnpm install` from the repository root.
4. Run `pnpm --filter @applyai/cloudflare-api-proxy check-types`.
5. Run `pnpm --filter @applyai/cloudflare-api-proxy deploy`.
6. Point the frontend API URL at the Worker hostname or a custom Cloudflare route.
7. Verify `/health`, `/health/ping`, an authenticated profile request, and one read-only feature request.

The proxy is deliberately not an open proxy: it has one configured upstream origin, only allows the API methods, rejects non-HTTPS upstream configuration, and returns CORS headers only for the ApplyAI web origins.

## What remains on Render or another Node host

The following should not be moved into this Worker package without a separate architecture project:

- Prisma API routes that use the Node `pg` adapter directly.
- The Node Redis cache client.
- BullMQ queue producers unless they are replaced with Cloudflare Queues or an HTTP enqueue service.
- Playwright, browser automation, and Greenhouse/Unstop workers.
- The scheduler process and long-running worker process.
- Desktop helper and browser-extension services.

## Future full Workers migration

A full edge migration is possible, but it is not a Wrangler-only change. It would require a Worker-aware environment contract, request-scoped Prisma creation using Cloudflare Hyperdrive or Prisma Accelerate, replacement of the Redis cache with Workers KV/Cache API or a compatible HTTP Redis service, replacement of BullMQ enqueueing with Cloudflare Queues or a dedicated queue gateway, and refactoring all `process.env` reads to Hono bindings. Browser-heavy jobs would still remain on a Node worker service.

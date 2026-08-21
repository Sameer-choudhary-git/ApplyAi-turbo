# ApplyAI Turbo — Project Architecture and Flow Audit

**Author:** Manus AI  
**Audit date:** 15 August 2026  
**Branch:** `feature/greenhouse-job-discovery-apply`  
**Status:** Baseline audit completed; Greenhouse implementation has not yet started.

## 1. Purpose and scope

This document records the current architecture of the ApplyAi-turbo repository before adding Greenhouse discovery and scheduled application workflows. The audit covers the monorepo structure, applications, shared packages, runtime dependencies, persistence, queues, scheduling, authentication, frontend flow, browser automation, deployment surfaces, observability, and the uploaded `apply_ai_greenhouse_discovery.zip` materials.

The goal is to establish a reliable implementation baseline rather than infer behavior from package names alone. The conclusions below are based on the tracked source files, package manifests, Prisma schema, existing deployment documents, and the generated Greenhouse scripts.

> **Important boundary:** This audit is documentation and architecture analysis. It does not add Greenhouse code, modify the database schema, change schedules, or submit applications.

## 2. Executive summary

ApplyAI Turbo is a **pnpm/Turborepo monorepo** containing a Hono/Node API, a React/Vite web application, a Redis/BullMQ worker service, a node-cron scheduler, an Electron desktop helper, a Chrome extension, and shared domain packages. PostgreSQL is accessed through Prisma, Supabase supplies authentication and server-side user lookup, Redis/BullMQ provides asynchronous work delivery, Playwright performs browser automation, and Sentry is used for cross-service error tracking.

The current operational flow is platform-oriented. The scheduler enqueues daily extraction and validation jobs and hourly eligible-user application jobs. The worker resolves queue messages through registries, invokes platform services, and persists results. The web application reads and updates user profiles, preferences, jobs, applications, tasks, interviews, reminders, and networking data through the API.

The existing product already contains the main infrastructure needed for Greenhouse: background scheduling, durable queues, worker registries, Prisma persistence, API routes, preference storage, application history, and Sentry instrumentation. The Greenhouse work should therefore be added as a first-class platform workflow rather than as a standalone Python process copied into the repository.

The uploaded discovery package is useful as a **data-source and normalization reference**. It discovers public Greenhouse boards from seed pages, prior board records, and Common Crawl; validates each board through the public Greenhouse Job Board API; normalizes jobs; and stores an independent SQLite snapshot. It explicitly does not submit applications. Its discovery logic can inform a TypeScript worker implementation, but its SQLite/output-file model should be adapted to the existing Prisma and Redis/BullMQ architecture.

## 3. Repository structure

The repository is organized as a workspace with applications under `apps/`, reusable packages under `packages/`, infrastructure under `infra/`, operational documents at the root and in `docs/`, and a small performance-test area under `tests/`.

| Area                                                      | Current responsibility                                                                                                    | Principal technologies                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `apps/api`                                                | HTTP API, authentication middleware, user/profile operations, job/application/task/schedule endpoints, admin job triggers | Hono, Zod, Prisma, Supabase, Redis, Pino, tsup                                    |
| `apps/web`                                                | Authenticated browser workspace and management UI                                                                         | React 18, Vite, React Router, TanStack Query, Tailwind, Radix-style UI components |
| `apps/worker`                                             | Background extraction, validation, application, cleanup, and notification workers                                         | BullMQ, Redis, Prisma, Playwright, TypeScript                                     |
| `apps/scheduler`                                          | Cron registration and queue-enqueue orchestration                                                                         | `node-cron`, shared job classes, Sentry                                           |
| `apps/applyAi-desktop`                                    | Electron helper for local browser/session setup                                                                           | Electron, Playwright, Axios, dotenv                                               |
| `apps/chrome-extension`                                   | LinkedIn profile extraction and ApplyAI browser integration                                                               | Chrome Manifest V3, content scripts, extension popup                              |
| `packages/config`                                         | Shared environment resolution, API endpoints, platform/job configuration                                                  | TypeScript                                                                        |
| `packages/db`                                             | Prisma schema, migrations, generated client bootstrap, PostgreSQL adapter                                                 | Prisma 7, `@prisma/adapter-pg`, `pg`                                              |
| `packages/jobs`                                           | Typed queue job names and enqueueable job classes                                                                         | TypeScript, BullMQ facade                                                         |
| `packages/queue`                                          | Redis connection, queue factory, defaults, worker factory, worker lifecycle                                               | BullMQ, ioredis                                                                   |
| `packages/core/extractor`                                 | Platform extractor registry and current Unstop/Commudle collectors                                                        | Playwright, TypeScript                                                            |
| `packages/core/validation`                                | Active/inactive validation for persisted Unstop listings                                                                  | Prisma, optional Playwright                                                       |
| `packages/core/apply`                                     | Platform application agent registry and Unstop browser agent                                                              | Playwright, Prisma                                                                |
| `packages/contracts`                                      | Queue payload types for extraction, validation, and application                                                           | TypeScript                                                                        |
| `packages/utils`                                          | Encryption/cipher helpers and Cloudflare R2 storage helper                                                                | Node crypto, AWS SDK                                                              |
| `packages/logger`                                         | Structured request and application logging                                                                                | Pino                                                                              |
| `packages/sentry`                                         | Browser and Node Sentry wrappers                                                                                          | Sentry SDKs                                                                       |
| `packages/error-tracking`                                 | Provider abstraction using a strategy pattern                                                                             | TypeScript, Sentry/Datadog/Null strategies                                        |
| `packages/ui`                                             | Shared UI package scaffold                                                                                                | React, TypeScript                                                                 |
| `packages/typescript-config` and `packages/eslint-config` | Shared tooling configuration                                                                                              | TypeScript, ESLint                                                                |
| `infra`                                                   | Docker, Redis, Cloudflare deployment support                                                                              | Docker, Redis, TypeScript                                                         |
| `tests/performance`                                       | API load and Lighthouse performance scripts/results                                                                       | Node, Lighthouse                                                                  |

The workspace root exposes Turbo scripts for development, generation, build, linting, type checking, full checks, tests, and formatting. The root manifest declares pnpm as the package manager and Node 24 as the intended engine, while the service Dockerfiles currently build from Node 20-slim images. That runtime discrepancy should be resolved or explicitly documented before production changes.

## 4. Runtime and dependency model

The root `package.json` orchestrates the workspace through Turbo. The central runtime dependencies include Playwright for browser automation, Redis for queue/cache infrastructure, and the AWS S3 client for R2-compatible storage. The API adds Hono, Supabase, Prisma, PostgreSQL, Google APIs, Zod, and logging. The worker adds the platform automation dependencies, while the scheduler depends on the shared job package and cron wrapper.

The package dependency direction is intended to be layered:

```text
Web / Desktop / Extension
          |
          v
        API  <------>  PostgreSQL via @applyai/db
          |
          v
   @applyai/jobs  ------>  @applyai/queue  ------>  Redis/BullMQ
          |                                      |
          v                                      v
   Worker registries  ----------------------> handlers/services
          |
          v
  Core extractor / validation / apply agents
```

Shared configuration is resolved from `process.env` on the server and `import.meta.env` in the browser. The browser API origin follows `VITE_API_URL`, then `PUBLIC_API_URL`, then `API_URL`. The same configuration package exposes database, Supabase, R2, encryption, environment, API endpoint, and platform/job definitions.

## 5. Backend request flow

The API composition root creates a Hono application and applies Sentry context, request logging, secure headers, formatted JSON, and credentialed CORS. The allow-list contains the production web domains, the deployed Vercel frontend, the registered Chrome extension origin, and configured `FRONTEND_URL` values. The API mounts route groups for authentication, users, jobs, resume upload, Unstop sessions, flags, preferences, applications, tasks, schedule, interviews, networking, Google Calendar, and admin job controls.

Authenticated browser requests carry a Supabase access token in the `Authorization` header. The auth middleware validates that token through Supabase and stores the resolved user identity in Hono context. Route handlers then use the context user ID for Prisma queries. The API also has a service-role Supabase client for server-side operations; that client must never be exposed to the browser.

The onboarding route performs a transactional upsert of the core user row and recreates education, experience, skills, and preferences. The profile route assembles a frontend-facing response containing the user record, safe preference defaults, platform flags, active session indicators, and normalized profile arrays. Profile responses are cached in Redis for five minutes and invalidated after writes.

| Request area       | Current API behavior                                                               | Persistence or side effect                            |
| ------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Authentication     | Syncs or reads the authenticated user                                              | Supabase identity plus `users` row                    |
| Onboarding/profile | Upserts core profile and nested arrays transactionally                             | `users`, education, experience, skills, preferences   |
| Jobs               | Lists active Unstop internships with search, type, location, pagination            | Reads `unstop_internships`                            |
| Applications       | Lists user applications, updates status/interview state, creates follow-up objects | `user_job_applications`, interviews, tasks, reminders |
| Preferences        | Upserts global settings and any request fields ending in `Preferences`             | `user_preferences` JSON fields                        |
| Platform flags     | Updates known boolean flags derived from shared platform configuration             | Boolean fields on `users`                             |
| Scheduler/admin    | Lists and manually triggers registered background jobs                             | Enqueues shared job classes                           |
| Calendar           | Synchronizes interviews, tasks, and reminders with Google Calendar                 | Google OAuth/calendar records and remote events       |

## 6. Frontend flow

The React application initializes browser Sentry before rendering, forces the dark theme, wraps the app in an error boundary, and then mounts the authentication provider, TanStack Query provider, React Router, and toast system. The login route is public. All workspace routes are gated by authentication and render inside `AppShell`.

The principal workspace routes are the dashboard, applications, schedule, tasks, analytics, preferences, networking, saved jobs, and admin jobs. The preferences screen is the primary integration surface. It loads `/api/users/me`, maps preferences, flags, and sessions into local state, persists global settings through the preferences API, toggles known platform flags, and renders platform-specific session and extra-configuration components through a registry.

This is significant for Greenhouse because the current UI is already data-driven. A new platform can be surfaced by extending the shared platform configuration and registry, but Greenhouse discovery settings should not be hidden behind an Unstop-only cookie setup. Greenhouse public discovery does not require a candidate session for collection; application submission may require a separate, explicit candidate-profile/application strategy.

The web API helper adds the configured API origin, serializes JSON requests, attaches authorization headers, retries transient failures, and exposes GET/POST/PATCH/DELETE/upload helpers. This is the expected frontend boundary for new Greenhouse discovery and application endpoints.

## 7. Background scheduling and queue flow

The scheduler is a long-running Node process. It initializes Sentry, registers cron tasks, and closes Sentry cleanly on termination. The currently active schedule definitions are:

| Scheduler         | Cron expression | Current action                                                                     |
| ----------------- | --------------: | ---------------------------------------------------------------------------------- |
| Daily extraction  |     `0 2 * * *` | Enqueues Unstop extraction, Commudle extraction, and Unstop validation in parallel |
| Hourly user queue |     `0 * * * *` | Enqueues the eligible-user application queue job                                   |
| Five-minute task  |   `*/5 * * * *` | Registered but currently empty                                                     |

Cron callbacks are wrapped with execution IDs, Sentry spans, duration tracking, completion/failure events, breadcrumbs, and console logging. The wrapper catches task errors, records them, and prevents a silent failure from going unnoticed.

The shared jobs package defines names for extraction, validation, application, and cleanup. Each job class extends `BaseJob`, which forwards the queue, name, payload, and optional BullMQ options to `QueueService`. The queue package centralizes Redis connection setup, queue creation, default retries, exponential backoff, removal behavior, worker concurrency, and job-handler lookup.

The default queue policy is three attempts with exponential backoff starting at five seconds, completed jobs removed, and failed jobs retained. The worker service creates separate workers for extract, validation, apply, cleanup, and notification queues. Registries map job names to handlers, which then invoke domain services.

The current application path is:

```text
scheduler cron
  -> QueueEligibleUsersJob
  -> Redis/BullMQ apply queue
  -> apply worker registry
  -> QueueEligibleUsersHandler / EligibilityService
  -> ApplyUnstopInternshipsJob per eligible user
  -> ApplyUnstopInternshipsHandler
  -> ApplyUnstopInternshipService
  -> decrypt active Unstop cookie
  -> Unstop Playwright agent
  -> createMany user_job_applications
```

The current eligibility query requires global `autoApply`, at least one supported platform flag, and an active platform session. The scheduler-level helper also maintains a daily queue counter, but the worker-level eligibility service currently enqueues a user job without applying the same daily-limit and cooldown logic. This duplication should be reconciled before Greenhouse application scheduling is added.

## 8. Current discovery and application methodology

### 8.1 Existing Unstop discovery

The active Unstop extractor is Playwright-based. It opens the public internship listing, suppresses recurring login/signup overlays, paginates through job cards, and extracts title, company, link, stipend, experience, type, location, skills, tags, posted date, and days-left data. The worker extraction service then inserts the returned records into `unstop_internships` with `skipDuplicates`.

The current validation service first loads active Unstop records and validates them by calculating an expiry date from the scrape timestamp and the extracted days-left value. A browser-based validation fallback exists but is disabled in the active flow. Missing or closed opportunities are marked inactive rather than deleted.

### 8.2 Existing application automation

The Unstop agent launches Chromium with a visible browser, restores a user session from a decrypted cookie/state payload, checks for login/session expiry, visits each eligible listing, detects already-applied or ineligible states, interacts with the application flow, and records statuses such as `applied`, `already_applied`, `action_required`, `error`, or session-expired outcomes. The worker persists the returned result rows into `user_job_applications`.

The application ledger has a free-form platform string, job title, company, link, status, notes, optional type/location/deadline, timestamps, interview linkage, and JSON metadata. It does not currently enforce a unique application key such as `(userId, platform, externalJobId)`; Greenhouse work must add idempotency before any scheduled submission logic is enabled.

## 9. Persistence model

The Prisma schema uses PostgreSQL and contains the following major domains:

| Domain               | Representative models                                               | Role                                                                                                              |
| -------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| User profile         | `users`, `user_education`, `user_experience`, `user_skills`         | Candidate identity and profile data                                                                               |
| Targeting/automation | `user_preferences`                                                  | Work modes, opportunity types, locations, role keywords, industries, auto-apply, daily limit, platform JSON blobs |
| Platform sessions    | `user_platform_sessions`, `unstop_setup_tokens`                     | Encrypted platform cookies and temporary setup flow                                                               |
| Current job catalog  | `unstop_internships`                                                | Scraped Unstop records and active/inactive lifecycle                                                              |
| Application ledger   | `user_job_applications`                                             | Per-user application outcomes and interview linkage                                                               |
| Productivity         | `user_tasks`, `task_reminders`, `user_reminders`, `user_interviews` | Follow-ups, reminders, interviews, calendar synchronization                                                       |
| Networking           | `user_networking_contacts`, `linkedin_scrape_queue`                 | Contacts and extension-assisted LinkedIn capture                                                                  |
| Calendar             | `user_google_calendar`                                              | Google OAuth/calendar integration state                                                                           |

The schema is platform-specific for catalog data but generic for application history. Greenhouse jobs should not be forced into `unstop_internships`. The clean boundary is a dedicated Greenhouse board/job catalog with stable external identifiers, active-state tracking, last-seen timestamps, source metadata, and a relation or deterministic key that application records can reference through metadata or a new foreign key.

## 10. Uploaded Greenhouse materials review

The uploaded archive contains two standard-library Python scripts, CSV/JSONL test outputs, a discovery SQLite snapshot, seed files, and research documentation.

| Material                                        | Observed purpose                                                                                                                                                                                                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discover_greenhouse.py`                        | Finds candidate board tokens from seeds, shallow same-host crawling, robots/sitemaps, Common Crawl URL-index queries, and prior CSV records; canonicalizes and deduplicates candidates; validates boards; optionally enriches company names; writes normalized outputs |
| `greenhouse_collector.py`                       | Reads a board CSV, calls the public Greenhouse Job Board API, retries transient HTTP failures, normalizes job payloads, exports CSV/JSONL, and upserts board/job snapshots into SQLite                                                                                 |
| `boards.csv`                                    | Fixed curated board-token fallback list                                                                                                                                                                                                                                |
| `discovery_fetch_test/*`                        | Example discovered, validated, failed, job, and summary outputs                                                                                                                                                                                                        |
| `discovery_research.md` and `research_notes.md` | Explains the public API and the absence of a documented global board-token directory                                                                                                                                                                                   |
| `README.md`                                     | Documents commands, outputs, limitations, and daily cron guidance                                                                                                                                                                                                      |

The discovery script identifies public Greenhouse board URLs and tokens using these sources:

1. User-maintained seed URLs or company domains.
2. Public career-page links, canonical links, `robots.txt`, and common sitemaps.
3. Common Crawl CDX URL-index wildcard queries for Greenhouse board hosts.
4. Previously discovered board CSV records, retained and revalidated across runs.

Each candidate is validated against `https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs`. Successful responses must contain an HTTP 200 status and a JSON `jobs` array. The normalized job key is `board_token:job_id`; the SQLite writer marks jobs absent from a successful board refresh inactive instead of deleting them. This is a good lifecycle model for a Prisma implementation.

The generated package intentionally does not log into Greenhouse, access private candidate data, submit applications, or bypass authentication. It is therefore a discovery/collection component, not the complete requested apply workflow.

## 11. Greenhouse integration baseline

The target Greenhouse workflow should use the repository’s existing layers rather than introduce a second scheduler and a second persistence system.

```text
24-hour discovery cron
  -> Greenhouse discovery job
  -> extraction queue
  -> Greenhouse discovery handler/service
  -> public candidate sources + Greenhouse Job Board API
  -> Prisma greenhouse board/job tables
  -> new-job and updated-job status for the web UI

Separate 24-hour application cron
  -> Greenhouse application-selection job
  -> apply queue
  -> per-user/per-job eligibility and idempotency checks
  -> explicit application agent or review queue
  -> application ledger + audit metadata
  -> action-required/error outcomes visible in Applications
```

The two schedules should remain separate even if they share a queue infrastructure. Discovery must complete and persist a stable job snapshot before application selection runs. The application schedule should process only new, active, matching, not-yet-applied jobs and must enforce user-level limits atomically. If both schedules run at the same time, a run-lock or database-level claim is required to prevent duplicate discovery or duplicate applications.

The initial Greenhouse discovery implementation should preserve the generated package’s known limitations: it will not be a guaranteed global company directory, because public discovery sources are sampled and Greenhouse board tokens are not exposed through a documented global listing endpoint. The system should retain prior boards and failures so coverage grows instead of resetting on every run.

## 12. Risks, gaps, and implementation constraints

| Finding                                                                                    | Impact on Greenhouse work                                                 | Required response                                                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Current job catalog is Unstop-specific                                                     | Greenhouse jobs cannot be represented safely in `unstop_internships`      | Add Greenhouse-specific catalog models or a generalized catalog abstraction            |
| Application rows lack a stable external job key and uniqueness constraint                  | A daily apply run could create duplicate records or resubmit the same job | Add deterministic external IDs and an atomic claim/idempotency strategy                |
| The scheduler already has an hourly application queue                                      | User requirement is separate 24-hour discovery and apply schedules        | Add clearly named Greenhouse cron tasks and avoid accidental hourly submission         |
| Scheduler-level and worker-level eligibility logic differ                                  | Daily caps and cooldowns may be bypassed or counted inconsistently        | Consolidate eligibility and daily-limit enforcement in one domain service              |
| Greenhouse public discovery does not provide candidate sessions                            | Discovery can be credential-free, but submission is a different workflow  | Separate discovery credentials from application credentials/profile data               |
| Existing Unstop browser agent uses `headless: false`                                       | A server-side scheduled worker may not have a display                     | Choose a supported browser execution mode and define action-required fallback          |
| `packages/core/apply/src/ApplyService.ts` is empty while platform agents are used directly | A future platform abstraction is incomplete                               | Extend the existing agent registry/service pattern rather than rely on the empty class |
| Commudle extraction is currently a stub                                                    | Existing multi-platform architecture is only partially complete           | Keep Greenhouse implementation isolated and testable                                   |
| Several routes and generated/build artifacts show duplication or drift                     | Maintenance and deploy behavior may be inconsistent                       | Avoid broad cleanup during feature work; record follow-up issues separately            |
| Root wants Node 24 while Dockerfiles build Node 20                                         | Runtime behavior can differ between local and deployment environments     | Align versions or pin compatibility before production rollout                          |
| The uploaded scripts use SQLite and file exports                                           | A second persistence path would bypass the app UI and queue model         | Port the logic into shared TypeScript services and Prisma migrations                   |

## 13. Recommended implementation gates

Before scheduled Greenhouse applications are enabled, the implementation should pass these gates:

1. **Discovery gate:** A scheduled run can discover, validate, upsert, and deactivate Greenhouse boards/jobs idempotently without requiring a candidate login.
2. **Matching gate:** The system can explain why a job matches or does not match a user’s roles, locations, work modes, opportunity types, industries, and compensation criteria.
3. **Deduplication gate:** A user/job pair can be claimed atomically and cannot be submitted twice by overlapping scheduler or worker executions.
4. **Consent gate:** Greenhouse auto-apply is explicitly enabled per user and is off by default until the user has configured the required profile/application information.
5. **Limit gate:** The daily application limit is enforced at the final claim point, not only when jobs are queued.
6. **Audit gate:** Every attempt records the external job ID, board token, user, schedule/run ID, decision, status, timestamps, and failure/action-required reason.
7. **Review gate:** Forms or questions that cannot be answered safely are marked `action_required` rather than guessed or silently submitted.
8. **Operations gate:** Discovery and apply runs expose success/failure counts, retry behavior, and last-run state to operators and the web UI.

## 14. Audit conclusion

The repository has a workable foundation for the requested Greenhouse feature. The correct extension point is the existing scheduler → BullMQ → worker registry → domain service → Prisma → API → React flow. The uploaded Greenhouse scripts provide a strong discovery algorithm and normalization contract, but they should be treated as reference material and adapted into the existing architecture rather than run as an independent cron process.

Implementation should begin only after the Greenhouse data model, separate 24-hour discovery/apply schedules, idempotency strategy, and application consent/action-required behavior are explicitly agreed. This document is the baseline for that next design phase.

## References

[1]: ../package.json "ApplyAI Turbo root workspace manifest"
[2]: ../pnpm-workspace.yaml "ApplyAI Turbo workspace definition"
[3]: ../apps/api/src/app.ts "API composition root and route registration"
[4]: ../apps/api/src/routes/user.ts "User onboarding and profile API"
[5]: ../apps/api/src/routes/preferences.ts "Preference persistence API"
[6]: ../apps/api/src/routes/jobs.ts "Job listing API"
[7]: ../apps/api/src/routes/applications.ts "Application and follow-up API"
[8]: ../apps/scheduler/src/schedules/daily.ts "Daily scheduler definition"
[9]: ../apps/scheduler/src/schedules/hourly.ts "Hourly scheduler definition"
[10]: ../packages/jobs/src/JobNames.ts "Shared queue job names"
[11]: ../packages/queue/src/queueConfig.ts "BullMQ default retry configuration"
[12]: ../packages/db/prisma/schema.prisma "Prisma persistence schema"
[13]: ../packages/config/src/index.ts "Shared runtime and platform configuration"
[14]: ../apps/web/src/App.tsx "Frontend route and authentication tree"
[15]: ../apps/web/src/components/preferences/PlatformIntegrationsCard.tsx "Data-driven platform integration UI"
[16]: ../Dockerfile.scheduler "Scheduler deployment image"
[17]: ../Dockerfile.worker "Worker deployment image"
[18]: /home/ubuntu/greenhouse_review/README.md "Uploaded Greenhouse discovery package README"
[19]: /home/ubuntu/greenhouse_review/discover_greenhouse.py "Uploaded Greenhouse discovery implementation"
[20]: /home/ubuntu/greenhouse_review/greenhouse_collector.py "Uploaded Greenhouse collector implementation"
[21]: https://developers.greenhouse.io/job-board.html "Greenhouse Job Board API documentation"
[22]: https://index.commoncrawl.org/ "Common Crawl Index Server"
[23]: https://github.com/grnhse/greenhouse-api-docs/issues/518 "Greenhouse API documentation issue regarding board-token discovery"

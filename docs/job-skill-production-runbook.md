# Job Skill Production Runbook

**Branch:** `job-skill`  
**Base:** `feature/sentry-integration`  
**Purpose:** Deploy the subscription-entitlement and Job Skill pipeline without changing existing application, saved-job, networking, or Sentry route contracts.

## Deployment order

1. Deploy the branch with the API, scheduler, and worker processes stopped or in a maintenance window appropriate for the environment.
2. Install dependencies from the committed lockfile with `pnpm install --frozen-lockfile`.
3. Apply database changes with `pnpm --filter @applyai/db exec prisma migrate deploy`.
4. Generate the Prisma client with `pnpm --filter @applyai/db generate`.
5. Build and deploy the API, web, scheduler, and worker packages.
6. Start Redis-backed worker and scheduler processes before granting Job Skill access codes.
7. Set `ADMIN_USER_IDS` to a comma-separated allowlist of authenticated Supabase user IDs that may generate and revoke codes.
8. Verify `/api/health`, `/api/entitlements/me`, `/api/job-skill/providers`, and the existing `/api/saved-jobs` and `/api/networking` endpoints with an authenticated test account.

## Required runtime configuration

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | API, scheduler, worker, Prisma | Must point to the production PostgreSQL database. Run migrations before enabling features. |
| `REDIS_QUEUE_URL` or `REDIS_HOST`/`REDIS_PORT` | API enqueue path, scheduler, worker | Do not set `DISABLE_REDIS=true` in a production environment that enables Job Skill. |
| `ADMIN_USER_IDS` | Admin code management | Only authenticated IDs in this list can create or revoke access codes. |
| `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Resume uploads and Job Skill artifacts | Generated DOCX, ZIP, and report files use the existing R2 helper. |
| `JOB_SKILL_WORKER_CONCURRENCY` | Job Skill worker | Optional; defaults to `2`. Increase only after observing Redis, CPU, storage, and model usage. |
| `JOB_SKILL_LLM_API_KEY` | Optional material tailoring | If absent, deterministic fact-preserving material generation remains available. |
| `JOB_SKILL_LLM_BASE_URL` | Optional material tailoring | Optional OpenAI-compatible base URL. |
| `JOB_SKILL_LLM_MODEL` | Optional material tailoring | Optional; defaults to `gpt-5-mini` for the configured OpenAI-compatible service. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | API and web auth | Existing authentication requirements remain unchanged. |

## Access-code administration

Open the existing authenticated admin area at `/admin/subscriptions`. Generate a code by selecting `free`, `pro`, or `max`, setting a redemption limit, and optionally setting an expiration date. You can also provide JSON feature and limit overrides, such as `{\"analytics\":true}` or `{\"manual_runs_per_month\":100}`. The plaintext code is returned only in the creation response and is not stored in the database; the database stores a SHA-256 hash and a short display prefix.

The same screen lists customers. An administrator can assign Free, Pro, or Max directly to an existing customer, set an expiry date, add custom feature or limit overrides, revoke access, and inspect subscription audit history. This is the supported payment-free customer onboarding workflow until a payment provider is connected.

Share the code with the intended user through a secure channel. The user may enter it during onboarding. A Free-tier user can continue without a code. Redemption is atomic, user-scoped, idempotent for the same code and user, and protected against concurrent over-redemption through a conditional database update. The effective plan combines the base tier with any code or admin overrides. `-1` limits mean unlimited, while the worker still applies safe per-run processing caps to protect infrastructure.

## Job Skill operations

Open `/plans` to review the active Free, Pro, or Max plan and current usage. Open `/job-skill` after the user has an active Pro or Max entitlement. Select target roles and locations, verify the active provider badges, and run a manual search. The initial production provider is the existing Unstop dataset already maintained by ApplyAi. The adapter registry reports unsupported upstream providers explicitly rather than silently pretending they are active.

Enable nightly automation only after the manual run is stable. The scheduler polls due schedules every five minutes, snapshots the user profile and entitlement, creates an idempotent nightly run, and enqueues the search stage. The worker then executes search, normalization, deduplication, scoring, optional material generation, and report stages. A failed provider is recorded in the run rather than stopping other providers or users.

Generated resume, cover-letter, ZIP, and Markdown report artifacts are stored under user- and run-scoped R2 keys and are exposed to the same user through the Job Skill UI. The system presents apply links and creates application records only when the user explicitly marks an opportunity applied; it does not submit applications or bypass provider security controls.

## Rollback guidance

If a deployment issue is detected, first disable Job Skill schedules in the UI or revoke the affected access codes. Existing saved jobs, networking contacts, applications, and Sentry routes use their existing tables and endpoints and are not deleted by the new migrations. Roll back the API, web, scheduler, and worker code together if necessary, but retain the applied migrations unless a database specialist prepares a forward corrective migration. Do not manually delete entitlement or run records during rollback; they are audit and retry state.

## Acceptance checklist

| Check | Expected result |
| --- | --- |
| Existing saved jobs list/create/update/delete | Continues to work with user isolation |
| Existing networking create/list/update/delete | Uses the authenticated Supabase user ID; no `undefined` Prisma user context |
| Free onboarding with no code | Completes successfully and receives a frontend-only Free entitlement |
| Free service access | Service mutations are denied with a plan-upgrade response |
| Pro service access | Saved jobs, networking, applications, and Job Skill are available within configured limits |
| Max service access | Available plan features and usage limits resolve as unlimited (`-1`) |
| Admin customer assignment | Customer receives the selected plan, expiry, overrides, and an audit event |
| Valid one-time code redemption | Creates one redemption and one active entitlement |
| Repeated redemption by same user | Returns the existing entitlement idempotently |
| Concurrent redemptions beyond max usage | Only the configured number succeed |
| Invalid or revoked code | Returns a controlled client error and creates no redemption |
| Manual Job Skill run | Creates a queued run and returns `202` |
| Provider failure | Run completes or reports partial failure without affecting other users |
| Retry of same worker job | Does not duplicate an opportunity or artifact set |
| Nightly schedule pause | Stops creating new runs while preserving history |
| Generated materials | Contain only profile facts and are downloadable through user-scoped artifacts |
| Migration and builds | Prisma validates; API, worker, scheduler, jobs, queue, Sentry, and web builds complete |

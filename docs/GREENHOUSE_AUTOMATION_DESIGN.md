# Greenhouse Discovery and Scheduled Application Design

**Author:** Manus AI  
**Branch:** `feature/greenhouse-job-discovery-apply`  
**Status:** Design gate before implementation

## 1. Objective

The requested feature has two independent 24-hour workflows:

1. **Discovery:** Find new Greenhouse companies/boards and new or updated jobs, validate them, and make them available inside ApplyAI.
2. **Application:** Once per day, select eligible active jobs for each user, prevent duplicates, enforce daily limits, and process the application workflow with auditable outcomes.

The discovery workflow must not depend on candidate login credentials. Greenhouse publishes a public Job Board API when the board token is known, while the public API documentation does not provide a global board-token directory. The generated archive therefore correctly uses public career pages, prior discoveries, sitemaps, and Common Crawl as discovery sources. The Greenhouse API also exposes job-specific questions through the per-job endpoint, which is necessary for any application form builder or safe application decision.[1] [2] [3]

## 2. Architecture options

The repository already owns a scheduler, Redis/BullMQ queues, workers, Prisma persistence, API routes, and a React dashboard. Two viable implementation paths are available.

| Approach                                                                                                           | Tradeoffs                                                                                                                                                                                                                                                                                  | Cost                                                                                               | Setup complexity                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Integrate Greenhouse into the existing TypeScript scheduler, queues, workers, Prisma models, API, and web UI**   | Best consistency with the current system; one operational model, one database, one audit trail, and one dashboard. Requires Prisma migrations, new worker handlers, idempotent claims, and a careful separation between discovery and application submission.                              | Uses the existing API/scheduler/worker infrastructure; incremental hosting and database cost only. | Medium to high. Requires coordinated backend, worker, schema, and UI changes.                     |
| **Keep the uploaded Python scripts as a separate daily service and import their SQLite/JSON outputs into ApplyAI** | Fastest reuse of the generated discovery logic and standard-library implementation. Creates a second runtime, scheduler, storage model, monitoring path, and import boundary. The application workflow would still need to be implemented separately and could drift from discovery state. | Requires a persistent Python runtime and storage in addition to the existing services.             | Low to medium initially; medium to high ongoing because of synchronization and operational drift. |

The existing project structure is prepared for the first approach, while the uploaded archive is valuable reference code for candidate discovery, canonicalization, validation, normalization, and active/inactive lifecycle handling. The decision is intentionally left open until the application-submission method is confirmed.

## 3. Proposed data flow

### 3.1 Daily discovery

```text
24-hour scheduler: greenhouse discovery
  -> GreenhouseDiscoveryJob
  -> extraction queue
  -> GreenhouseDiscoveryHandler
  -> candidate sources
       - configured seed career pages/domains
       - prior valid boards
       - optional Common Crawl URL index
  -> canonicalize and deduplicate board tokens
  -> GET public Greenhouse board jobs endpoint
  -> upsert boards and jobs in PostgreSQL
  -> mark missing jobs inactive after a successful board refresh
  -> expose new/updated jobs through the API and web UI
```

The discovery run should have a run ID, start/end timestamps, source statistics, board success/failure counts, job counts, and retryable failure records. A successful board refresh may mark jobs absent from that board response inactive; a failed board request must not deactivate existing jobs.

### 3.2 Separate daily application run

```text
24-hour scheduler: greenhouse applications
  -> GreenhouseApplicationSelectionJob
  -> apply queue
  -> load users with Greenhouse auto-apply enabled
  -> match active jobs to user profile/preferences
  -> claim user/job pair atomically
  -> verify consent, completeness, limit, and duplicate state
  -> submit through the approved application method
  -> persist applied/action-required/error result
  -> expose outcome in Applications and operational status views
```

The application schedule should run separately from discovery, preferably after discovery has had time to complete. The scheduler should use a configurable UTC time or an explicit interval, and the two workflows should have independent run IDs, locks, metrics, and failure reporting.

## 4. Application-method constraint

Greenhouse discovery and Greenhouse application submission are different capabilities. The public board API is suitable for reading jobs. The documented application endpoint requires HTTP Basic Auth with a Greenhouse API key, expects job-specific fields, and requires the server/client to validate required fields.[2] That API key is normally an employer/integration credential, not a candidate login session.

Therefore, there are three possible submission modes:

| Submission mode                               | What is required                                                                                                                                     | Safe default                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Employer-authorized Greenhouse API submission | A valid employer/integration API key for each board or an authorized provider arrangement; server-side secret storage; job-specific question mapping | Do not enable until credentials, authorization, and ownership are explicitly confirmed |
| Browser-based hosted application form         | Candidate profile, resume/cover letter storage, form/question handling, browser runtime, and robust action-required handling                         | Use only with explicit user consent and never guess required answers                   |
| Preparation/review mode                       | Discover, match, prefill, generate an application package, and queue a review/action-required record without final submission                        | Recommended initial safety baseline if submission authorization is not available       |

The system must never infer answers to legal, demographic, work-authorization, disability, compensation, or consent questions. Unknown required questions should produce `action_required`, not a guessed response. Data-compliance consent should be an explicit user action.

## 5. Idempotency and safety controls

The application workflow must be safe under retries, overlapping scheduler runs, worker retries, and partial browser/API failures.

| Control                  | Required behavior                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stable external identity | Store board token, Greenhouse job ID, absolute URL, and a deterministic job key such as `greenhouse:{boardToken}:{jobId}`.                                |
| User/job uniqueness      | Enforce a unique user/job application claim or use an atomic claim table so the same user cannot receive two successful submissions for one external job. |
| Run lock                 | Prevent two discovery runs or two application-selection runs from operating on the same scope concurrently. Expire locks safely after worker failure.     |
| Daily limit              | Enforce the user’s daily limit at the final claim/submission point, not only when the scheduler queues work.                                              |
| Consent                  | Keep Greenhouse discovery enabled independently from Greenhouse auto-apply. Auto-apply is off by default and requires an explicit user toggle.            |
| Completeness             | Verify profile, resume, contact data, and required application answers before submission. Missing information becomes `action_required`.                  |
| Retry classification     | Retry network/5xx/rate-limit failures with backoff; do not blindly retry validation errors, missing answers, consent failures, or a confirmed duplicate.  |
| Action-required state    | Preserve a reviewable record with the job URL, question metadata, missing fields, and attempted run ID.                                                   |
| Audit metadata           | Record schedule/run ID, source, board token, job ID, decision reason, status, timestamps, and error category. Do not store secrets in logs.               |
| Data lifecycle           | Keep job snapshots and application records needed for audit; mark jobs inactive rather than deleting them after a successful refresh.                     |

## 6. Required user-facing controls

The preferences UI should expose discovery and application separately. Discovery can be enabled globally or by configured source scope. Greenhouse auto-apply must be a separate toggle from job discovery. The daily limit should reuse the existing `dailyApplyLimit` concept but be enforced per platform or through a clearly documented global limit.

The UI should show the last discovery run, number of boards found/validated/failed, new and updated job counts, last application run, queued count, submitted count, action-required count, skipped count, and error count. The existing Applications view can display Greenhouse results because the application ledger already has platform/status/notes fields, but it will need stronger external-job metadata and idempotency support.

## 7. Implementation boundary for the first slice

The first implementation slice should include:

- Greenhouse board and job persistence through Prisma migrations.
- TypeScript port/adaptation of the generated collector’s HTTP, normalization, retry, and active-state logic.
- Seed source configuration and retained-board discovery records.
- Optional Common Crawl discovery with bounded limits and clear rate controls.
- Separate daily discovery and daily application-selection schedules.
- BullMQ jobs, queues, handlers, and Sentry instrumentation.
- Matching and eligibility logic using existing profile/preferences data.
- Atomic user/job claims and duplicate prevention.
- API endpoints and minimal web UI for discovery status, job browsing, and application outcomes.
- Preparation/action-required mode by default unless the approved submission mode is configured.

The first slice should not attempt a global guaranteed company directory, solve every ATS, or silently submit forms that contain unanswered job-specific or legal questions.

## 8. Decision questions before submission implementation

The following decisions change the architecture and should be answered before the application worker is enabled:

1. Should Greenhouse applications start in **preparation/review mode**, or do you have authorized employer/integration API credentials for the boards you want to submit to?
2. If browser-based submission is required, should the system require manual confirmation for every application, or may it submit automatically only when every required field has a verified answer and the user has enabled Greenhouse auto-apply?
3. Should discovery use only a maintained seed list at first, or should the optional Common Crawl source be enabled from the first scheduled run?
4. Should the daily application limit be shared across all platforms or enforced separately for Greenhouse?

## 9. Confirmed product decisions

The product decisions are now confirmed. Discovery will use a **hybrid breadth strategy**: the system will refresh retained boards and configured seeds while also adding candidates found through public career-page crawling, sitemaps, and bounded Common Crawl searches. Every candidate will be validated before it becomes an active company or job source. This is intended to expand company coverage over time instead of repeatedly presenting only the original fixed company list.

Applications begin with an explicit user confirmation gate. After confirmation, the worker opens the company-hosted Greenhouse form with Playwright, fills verified profile fields, uploads the approved resume when available, and asks an optional server-side answer model for drafts only for non-sensitive questions. The model must return `canAnswer=false` when the profile does not support a truthful answer. Sensitive, legal, demographic, consent, ambiguous, or unresolved required questions become `action_required` and are tagged with both `greenhouse` and `action_required`. When every required field is verified or transparently drafted above the confidence threshold, the application becomes `ready_to_submit`. Automatic submission is available only when `GREENHOUSE_AUTO_SUBMIT=true`; it is blocked whenever any required field remains unresolved.

Application limits will use a hierarchical model. Each user has an overall daily cap `X`; each platform has a configurable daily limit such as `u`, `v`, `a`, or `b`; every platform limit is capped at 12; and the configuration must satisfy `u + v + a + b ≤ X`. The final claim/submission step will enforce both the platform cap and the remaining global capacity atomically.

## References

[1]: https://github.com/grnhse/greenhouse-api-docs/blob/master/source/includes/job-board/_jobs.md "Greenhouse Job Board jobs endpoint and job questions"
[2]: https://github.com/grnhse/greenhouse-api-docs/blob/master/source/includes/job-board/_applications.md "Greenhouse application submission endpoint and authentication requirements"
[3]: https://github.com/grnhse/greenhouse-api-docs/issues/518 "Greenhouse API documentation issue regarding board-token discovery"
[4]: https://index.commoncrawl.org/ "Common Crawl Index Server and CDX query guidance"

## 10. Implementation status

The implementation is now present on `feature/greenhouse-job-discovery-apply`. It includes the Prisma migration, a TypeScript Greenhouse core package, hybrid seed/career-page/sitemap/Common Crawl discovery, retained-board refresh, public Job Board API ingestion, active/inactive lifecycle handling, separate daily scheduler tasks, BullMQ worker handlers, Playwright form inspection and autofill, verified profile mapping, resume upload, optional OpenAI-compatible answer drafting, action-required metadata, guarded submission, API endpoints, a web discovery/review page, and hierarchical limit controls.

The application flow uses an explicit confirmation gate before external interaction. The scheduled application worker creates `pending_confirmation` records and queues autofill only after confirmation. Playwright then runs against the public hosted Greenhouse form, maps verified profile fields, uploads the approved resume, and stores field-level provenance. Optional AI drafting is restricted to non-sensitive questions and cannot invent candidate facts. Any unresolved required field changes the record to `action_required` and stores the question and reason under the Greenhouse-tagged metadata. If all required fields pass the safety gate and `GREENHOUSE_AUTO_SUBMIT=true`, the worker submits the form and records `applied`; otherwise it records `ready_to_submit` and the user can open the form for final review.

The following checks have passed locally on the feature branch:

| Check                                          | Result                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Prisma schema validation and client generation | Passed                                                                         |
| Greenhouse core package build and type check   | Passed                                                                         |
| Shared jobs package build                      | Passed                                                                         |
| API type check and production build            | Passed                                                                         |
| Worker type check and production build         | Passed; CJS emits an existing `import.meta` warning from generated Prisma code |
| Scheduler type check and production build      | Passed                                                                         |
| Web production build                           | Passed; existing large-bundle warning remains                                  |

Before deployment, run the new migration through the project’s normal Prisma migration process and configure `GREENHOUSE_SEEDS`, `GREENHOUSE_COMMON_CRAWL_ENABLED`, `GREENHOUSE_COMMON_CRAWL_LIMIT`, and `GREENHOUSE_WORKERS`. The scheduler accepts `GREENHOUSE_DISCOVERY_CRON` and `GREENHOUSE_APPLICATION_CRON`; the defaults are `15 2 * * *` and `0 4 * * *`, respectively, so discovery runs before daily application selection.

### 10.1 Autofill and submission controls

The current Greenhouse application worker uses Playwright against the public, company-hosted Greenhouse form. It inspects visible form controls, maps verified user fields such as name, email, phone, URLs, location, and resume, and stores field-level provenance in application metadata. Resume uploads use the user’s existing `resumeUrl` document.

For required non-sensitive fields that cannot be answered deterministically, the worker can call an OpenAI-compatible server-side model configured with `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL`. The prompt explicitly forbids inventing candidate facts. Model output must provide a truthful answer with confidence of at least `0.75`; otherwise the field remains unresolved. Legal, work-authorization, demographic, consent, medical, immigration, criminal-history, and other sensitive questions never go to automatic completion and are marked `action_required`.

Automatic submission requires both controls below:

| Control                                       | Purpose                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `GREENHOUSE_AUTO_SUBMIT=true`                 | Server-side deployment gate. It must be explicitly enabled in the worker/API environment. |
| Per-user Greenhouse setting `autoSubmit=true` | User-level consent, configurable from the Greenhouse page.                                |

If any required field remains unresolved, the record is stored as `action_required` with metadata tags `greenhouse` and `action_required`. If all required fields pass the safety gate, the record becomes `ready_to_submit`; with both controls enabled, Playwright submits and records `applied`. Queue failures are also persisted as `action_required` rather than silently disappearing.

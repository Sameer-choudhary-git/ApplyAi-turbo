# Job Skill Research Notes

## Scope

This document records the analysis of [mayankjoshii/claude-job-skill](https://github.com/mayankjoshii/claude-job-skill) and the mapping to ApplyAi-turbo. The upstream repository contains one Claude Skill definition (`SKILL.md`), a README, and no executable searcher, worker, scraper, resume generator, or scheduler implementation. The adaptation therefore needs to convert behavioral instructions into product workflows and background jobs rather than copy executable code.

## Upstream capability map

The upstream skill defines four commands: help, search, automate, and status. Its intended workflow is profile-first, then multi-platform search, link verification, ranking, tailored resume and cover-letter generation, application tracking, optional Gmail status detection, nightly automation, and weekly self-correction.

The search behavior targets Naukri, LinkedIn India, Instahyre, Cutshort, Hirist, Indeed India, Foundit, Shine, TimesJobs, Glassdoor India, Wellfound/AngelList, WeWorkRemotely, and direct company career pages. Results are deduplicated, verified, scored on holistic fitness, and shown with an apply link. The upstream design separates **fitness** (candidate qualification) from an internal **ATS keyword match** score. It requires no fabricated experience, flags skill gaps, and only prepares materials; it explicitly does not submit applications, create portal accounts, or handle CAPTCHAs, OTPs, or logins.

For each eligible match, the upstream behavior generates a role-specific ATS-oriented resume and a role-specific cover letter, checks the resume against a 70% internal keyword floor, organizes materials by company, and bundles them. The tracker lifecycle is Found → Ready to Apply → Applied → Acknowledged → Online Assessment → Interview Round 1 → Interview Round 2 → HR Round → Offer / Rejected / Ghosted.

The status behavior is Gmail-optional. When Gmail is connected, the skill searches only for messages associated with companies in the tracked applications, classifies acknowledgements, assessments, interviews, offers, and rejections, and records action-needed items. Without Gmail, it falls back to manual status updates. The rejection-analysis loop looks for consecutive rejections, high resolved-outcome rejection rates, role/platform/company-type concentration, and timing patterns; it must surface the reason for any strategy change and must not invent a diagnosis.

The automation behavior runs a nightly search, generates materials for matches at or above the fitness threshold, updates the tracker, optionally checks Gmail, and produces a morning report. The upstream instructions assume an external scheduled-task system, but this project already has a scheduler service and BullMQ-style worker queues, so the adaptation should use those existing components rather than create per-user Manus sessions.

## Existing ApplyAi-turbo anchors

| Concern | Existing project capability | Adaptation implication |
| --- | --- | --- |
| Authentication | Supabase bearer-token middleware writes `userId` into Hono context | Subscription redemption, user profile access, saved jobs, and job-skill routes must be authenticated and user-scoped. |
| Profile | `users`, education, experience, skills, preferences, resume URL, platform sessions | Job-skill search can use the existing profile and resume instead of requiring a second profile system. Missing targeting fields should be added to preferences or a job-skill settings record. |
| Applications | `user_job_applications` plus schedule/interview/task/reminder relations | Job-skill results should create/update tracked opportunity records or a dedicated search-result record that can be promoted into an application without duplicating the existing application lifecycle. |
| Saved jobs | New `user_saved_jobs` model and API were added on `feature/sentry-integration` | A search result can be saved into the existing saved-jobs flow and later marked applied. |
| Scheduler | Daily, hourly, and five-minute schedules are registered in `apps/scheduler/src/app.ts`; schedules enqueue jobs through shared helpers | Add a controlled job-skill nightly coordinator rather than doing scraping or generation inside the scheduler process. |
| Worker | Existing extraction, validation, apply, cleanup, and notification workers use shared queue/job abstractions | Add explicit job-skill queue payloads and worker handlers for search, scoring/material preparation, report generation, and optional status sync. |
| Admin operations | `/api/admin/jobs` uses authenticated users plus `ADMIN_USER_IDS` allowlist and can enqueue registry jobs | Subscription-code generation and job-skill run controls should follow this admin authorization pattern, ideally with auditable records rather than only environment configuration. |
| Frontend onboarding | Multi-step onboarding posts profile data to `/api/users/onboard`, then uploads a resume | Add an access-code/tier gate before final onboarding completion or at the beginning of onboarding, with clear code redemption states. |
| Existing automation entitlement | Eligibility currently checks `preferences.autoApply` and platform flags, but no subscription tier | Add explicit entitlement checks so job-skill automation and any future auto-apply capabilities can be controlled independently. |

## Recommended adaptation boundaries

The first implementation should not attempt unrestricted scraping of every upstream platform. It should define provider adapters with a small initial set of supported sources that are technically and legally accessible, normalize results into one schema, deduplicate by canonical URL and source identity, and record provider failures without failing the complete run. Direct application submission remains out of scope; the UI should present verified links for user review.

The first release should also separate the pipeline into durable stages: schedule/coordinator, per-user eligibility, provider search, normalization and deduplication, scoring, material generation, persistence, and report delivery. Each stage should be retryable and idempotent. A run record and per-result records are needed for observability and to avoid duplicate materials or repeated notifications.

## Subscription-code concept

The requested initial tier system should be an entitlement layer without payments. Admins generate one-time or reusable invitation codes that map to a tier, optional expiration, usage limit, and enabled feature set. Users redeem a code during onboarding or from settings. Redemption must be transactional, user-scoped, auditable, and idempotent for the same user/code. The user record should retain the active tier and the code redemption history should be immutable enough for audit and support.

The initial tier recommendation is a free/default tier plus an admin-granted job-skill tier. The names and limits should remain configuration-driven so a real payment provider can be added later without rewriting feature checks. The code itself should be generated with cryptographically secure randomness, stored hashed rather than in plaintext, displayed only at creation time, and never logged.

## Open design decisions to keep explicit in the flow document

The implementation plan must explicitly identify the first provider set, whether job-skill uses an internal LLM or a connected external service for scoring and document generation, where generated DOCX/ZIP artifacts are stored, whether Gmail status sync is included in the first release or feature-flagged, the maximum nightly workload per user/tier, and the admin UI/API surface for generating, revoking, and auditing codes. These decisions affect database shape, queue payloads, and operating cost.

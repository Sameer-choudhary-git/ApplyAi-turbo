# Job Skill Reference Findings

## Source

- Repository: [mayankjoshii/claude-job-skill](https://github.com/mayankjoshii/claude-job-skill)
- README: [README.md](https://raw.githubusercontent.com/mayankjoshii/claude-job-skill/main/README.md)
- Skill specification: [SKILL.md](https://raw.githubusercontent.com/mayankjoshii/claude-job-skill/main/SKILL.md)

## Confirmed behavior from the reference repository

The reference is a Claude Skill specification, not a ready-to-run backend service. It describes an AI-powered job search assistant for Indian professionals. Its stated discovery scope includes Naukri, LinkedIn, Instahyre, Cutshort, Hirist, Indeed India, Foundit, Shine, TimesJobs, Glassdoor, Wellfound/AngelList, WeWorkRemotely, and direct company career pages.

The reference uses web search queries such as `site:naukri.com`, `site:linkedin.com/jobs`, and similar site-scoped searches to find postings. It describes ranking opportunities against the user profile, checking whether links are live, generating tailored resumes and cover letters, and producing a report. It also describes nightly search automation and optional Gmail-based application-status detection.

The reference explicitly says it does not submit applications, create accounts, or handle CAPTCHAs, OTPs, or logins on the user’s behalf. Therefore, Job Skill is conceptually **discovery and preparation only**, whereas Greenhouse, LinkedIn feed analysis, and Unstop internship automation are separate application workflows with their own consent and safety controls.

## Comparison implication for ApplyAi-turbo

The current ApplyAi-turbo Job Skill backend has a real queue/API/UI pipeline and an implemented Unstop provider, but the other provider keys are currently exposed as unconfigured or “coming soon.” The reference repository provides the intended product behavior and provider list, but it does not provide authenticated provider APIs or production-grade provider adapters. Implementing the remaining sources requires either public APIs, licensed feeds, user-authorized connectors, permitted public-page retrieval, or a compliant search provider. AI is useful for query expansion, deduplication, classification, profile-to-job scoring, and truthful material drafting, but AI alone cannot retrieve jobs from providers that do not expose accessible data.

## Boundary to preserve

Job Skill should find, normalize, rank, and optionally prepare materials or save opportunities. It should not automatically submit applications. Automatic application remains in the Greenhouse, LinkedIn feed, and Unstop application pipelines, each with its own explicit consent, platform limits, and unresolved-field handling.

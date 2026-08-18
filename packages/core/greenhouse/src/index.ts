import { prisma } from "@applyai/db";

export const GREENHOUSE_API_ROOT = "https://boards-api.greenhouse.io/v1/boards";
const USER_AGENT = "ApplyAI-GreenhouseDiscovery/1.0 (+public-job-aggregation)";
const GREENHOUSE_HOSTS = new Set([
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
]);
const TRACKING_QUERY_KEYS = new Set([
  "gh_src",
  "gh_jid",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

export type GreenhouseCandidate = {
  company: string;
  boardToken: string;
  boardUrl: string;
  source: string;
  observedUrl?: string;
};

export type GreenhouseDiscoveryOptions = {
  seeds?: string[];
  commonCrawlEnabled?: boolean;
  commonCrawlLimit?: number;
  workers?: number;
};

export type GreenhouseDiscoverySummary = {
  runId: string;
  candidateBoards: number;
  validBoards: number;
  failedBoards: number;
  jobsSeen: number;
  newJobs: number;
  updatedJobs: number;
};

export type GreenhouseAutomationSettings = {
  autoSubmit: boolean;
};

export type GreenhouseLimitSnapshot = {
  overallLimit: number;
  platformLimits: Record<string, number>;
  totalUsed: number;
  platformUsed: number;
  remainingOverall: number;
  remainingPlatform: number;
};

function now(): Date {
  return new Date();
}

function startOfToday(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanHtml(value: unknown): string {
  if (!value) return "";
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function names(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => String(item.name || "").trim())
    .filter(Boolean);
}

function normalizeUrl(raw: string, base = ""): string {
  try {
    const url = new URL(raw.trim().replace(/^<|>$/g, ""), base || undefined);
    if (!/^https?:$/.test(url.protocol)) return "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase()))
        url.searchParams.delete(key);
    }
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function tokenFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    const token = GREENHOUSE_HOSTS.has(host)
      ? parts[0]
      : host.endsWith(".greenhouse.io")
        ? host.split(".")[0]
        : null;
    if (!token || /^(assets|jobs|embed|api|login|about)$/i.test(token))
      return null;
    if (!/^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/.test(token)) return null;
    return token;
  } catch {
    return null;
  }
}

function companyFromTitle(title: string, fallback: string): string {
  const normalized = title
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*[|-]\s*$/, "");
  const patterns = [
    /^Jobs at (.+)$/i,
    /^Careers at (.+)$/i,
    /^(.+?) Jobs$/i,
    /^(.+?) Careers$/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return fallback;
}

function candidateFromUrl(
  url: string,
  source: string,
  title = "",
  observedUrl = "",
): GreenhouseCandidate | null {
  const token = tokenFromUrl(url);
  if (!token) return null;
  return {
    company: companyFromTitle(
      title,
      token
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    ),
    boardToken: token,
    boardUrl: `https://boards.greenhouse.io/${encodeURIComponent(token)}`,
    source,
    observedUrl: observedUrl || url,
  };
}

function extractCandidates(
  body: string,
  baseUrl: string,
  source: string,
): GreenhouseCandidate[] {
  const urls = body.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const candidates = new Map<string, GreenhouseCandidate>();
  for (const raw of urls) {
    const normalized = normalizeUrl(raw, baseUrl);
    const candidate = candidateFromUrl(normalized, source, "", raw);
    if (candidate)
      candidates.set(candidate.boardToken.toLowerCase(), candidate);
  }
  return [...candidates.values()];
}

async function getText(
  url: string,
  timeoutMs = 25_000,
): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xml,text/plain,*/*",
      },
      signal: controller.signal,
    });
    return { status: response.status, body: await response.text() };
  } catch (error) {
    return {
      status: 0,
      body: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(
  url: string,
  timeoutMs = 45_000,
): Promise<{ status: number; data: unknown }> {
  const result = await getText(url, timeoutMs);
  if (result.status !== 200)
    return {
      status: result.status,
      data: { error: result.body.slice(0, 500) },
    };
  try {
    return { status: result.status, data: JSON.parse(result.body) };
  } catch {
    return { status: result.status, data: { error: "Invalid JSON response" } };
  }
}

async function crawlSeed(seed: string): Promise<GreenhouseCandidate[]> {
  const start = normalizeUrl(seed.includes("://") ? seed : `https://${seed}`);
  if (!start) return [];
  const direct = candidateFromUrl(start, "seed", "", start);
  if (direct) return [direct];
  const result = await getText(start);
  if (result.status !== 200) return [];
  const candidates = extractCandidates(result.body, start, "career_page");
  const sitemapUrls = [
    new URL("/robots.txt", start).toString(),
    new URL("/sitemap.xml", start).toString(),
  ];
  for (const sitemapUrl of sitemapUrls) {
    const sitemap = await getText(sitemapUrl, 15_000);
    if (sitemap.status === 200) {
      candidates.push(
        ...extractCandidates(sitemap.body, sitemapUrl, "sitemap"),
      );
      for (const match of sitemap.body.matchAll(/<loc[^>]*>([^<]+)<\/loc>/gi)) {
        const candidate = candidateFromUrl(
          normalizeUrl(match[1] || "", sitemapUrl),

          "sitemap",
        );
        if (candidate) candidates.push(candidate);
      }
    }
  }
  return candidates;
}

async function commonCrawlCandidates(
  limit: number,
): Promise<GreenhouseCandidate[]> {
  const info = await getJson(
    "https://index.commoncrawl.org/collinfo.json",
    30_000,
  );
  const collection = Array.isArray(info.data) ? info.data[0] : null;
  const api =
    collection && typeof collection === "object" && "cdx-api" in collection
      ? String(collection["cdx-api"])
      : "";
  if (!api) return [];
  const candidates: GreenhouseCandidate[] = [];
  for (const pattern of [
    "boards.greenhouse.io/*",
    "job-boards.greenhouse.io/*",
  ]) {
    const query = new URL(api);
    query.searchParams.set("url", pattern);
    query.searchParams.set("output", "json");
    query.searchParams.set("filter", "=status:200");
    query.searchParams.set("fl", "url,status");
    query.searchParams.set("collapse", "urlkey");
    query.searchParams.set(
      "limit",
      String(Math.max(1, Math.min(limit, 5_000))),
    );
    const result = await getText(query.toString(), 90_000);
    for (const line of result.body.split(/\r?\n/)) {
      try {
        const record = JSON.parse(line) as { url?: string };
        if (record.url)
          candidates.push(
            ...extractCandidates(record.url, record.url, "common_crawl"),
          );
      } catch {
        // Ignore malformed CDX rows and continue processing the index response.
      }
    }
  }
  return candidates;
}

export async function discoverCandidates(
  options: GreenhouseDiscoveryOptions = {},
): Promise<GreenhouseCandidate[]> {
  const seeds =
    options.seeds ??
    (process.env.GREENHOUSE_SEEDS || "")
      .split(",")
      .map((seed) => seed.trim())
      .filter(Boolean);
  const all: GreenhouseCandidate[] = [];
  for (const seed of seeds) all.push(...(await crawlSeed(seed)));
  if (
    options.commonCrawlEnabled ??
    process.env.GREENHOUSE_COMMON_CRAWL_ENABLED !== "false"
  ) {
    all.push(
      ...(await commonCrawlCandidates(
        options.commonCrawlLimit ??
          Number(process.env.GREENHOUSE_COMMON_CRAWL_LIMIT || 200),
      )),
    );
  }
  const unique = new Map<string, GreenhouseCandidate>();
  for (const candidate of all) {
    const key = candidate.boardToken.toLowerCase();
    const current = unique.get(key);
    if (!current || current.company === current.boardToken)
      unique.set(key, candidate);
  }
  return [...unique.values()].sort((a, b) =>
    a.company.localeCompare(b.company),
  );
}

function normalizeJob(
  candidate: GreenhouseCandidate,
  job: Record<string, unknown>,
  runId: string,
) {
  const jobId = String(job.id ?? "");
  const rawLocation =
    job.location && typeof job.location === "object"
      ? (job.location as Record<string, unknown>)
      : {};
  return {
    externalKey: `greenhouse:${candidate.boardToken}:${jobId}`,
    boardToken: candidate.boardToken,
    greenhouseJobId: jobId,
    title: String(job.title ?? "Untitled role"),
    company: String(job.company_name ?? candidate.company),
    jobLink: String(
      job.absolute_url ??
        `https://boards.greenhouse.io/${candidate.boardToken}/jobs/${jobId}`,
    ),
    location: rawLocation.name ? String(rawLocation.name) : null,
    departments: names(job.departments),
    offices: names(job.offices),
    firstPublished: parseDate(job.first_published),
    sourceUpdatedAt: parseDate(job.updated_at),
    applicationDeadline: parseDate(job.application_deadline),
    descriptionHtml: job.content ? String(job.content) : null,
    descriptionText: job.content ? cleanHtml(job.content) : null,
    metadata: job.metadata ?? null,
    raw: job,
    lastDiscoveryRunId: runId,
  };
}

async function fetchCandidate(candidate: GreenhouseCandidate) {
  const result = await getJson(
    `${GREENHOUSE_API_ROOT}/${encodeURIComponent(candidate.boardToken)}/jobs?content=true`,
  );
  const data = result.data as { jobs?: unknown[]; error?: string };
  if (result.status !== 200 || !Array.isArray(data.jobs)) {
    return {
      candidate,
      ok: false,
      status: result.status,
      error: data.error || `HTTP ${result.status}`,
      jobs: [] as Record<string, unknown>[],
    };
  }
  return {
    candidate,
    ok: true,
    status: result.status,
    error: null,
    jobs: data.jobs.filter((job): job is Record<string, unknown> =>
      Boolean(job && typeof job === "object"),
    ),
  };
}

async function persistBoardResult(
  runId: string,
  result: Awaited<ReturnType<typeof fetchCandidate>>,
) {
  const timestamp = now();
  const board = await prisma.greenhouse_boards.upsert({
    where: { boardToken: result.candidate.boardToken },
    create: {
      boardToken: result.candidate.boardToken,
      company: result.candidate.company,
      boardUrl: result.candidate.boardUrl,
      source: result.candidate.source,
    },
    update: {
      company: result.candidate.company,
      boardUrl: result.candidate.boardUrl,
      source: result.candidate.source,
    },
  });

  if (!result.ok) {
    await prisma.greenhouse_boards.update({
      where: { id: board.id },
      data: {
        status: "failed",
        lastCheckedAt: timestamp,
        lastStatus: result.status || null,
        lastError: result.error,
      },
    });
    return { jobsSeen: 0, newJobs: 0, updatedJobs: 0 };
  }

  await prisma.greenhouse_jobs.updateMany({
    where: { boardId: board.id },
    data: { isActive: false },
  });
  let newJobs = 0;
  let updatedJobs = 0;
  for (const rawJob of result.jobs) {
    const job = normalizeJob(result.candidate, rawJob, runId);
    const existing = await prisma.greenhouse_jobs.findUnique({
      where: { externalKey: job.externalKey },
      select: { id: true },
    });
    await prisma.greenhouse_jobs.upsert({
      where: { externalKey: job.externalKey },
      create: {
        ...job,
        boardId: board.id,
        isActive: true,
        lastSeenAt: timestamp,
      } as any,
      update: {
        ...job,
        boardId: board.id,
        isActive: true,
        lastSeenAt: timestamp,
      } as any,
    });
    if (existing) updatedJobs += 1;
    else newJobs += 1;
  }
  await prisma.greenhouse_boards.update({
    where: { id: board.id },
    data: {
      status: "active",
      lastCheckedAt: timestamp,
      lastSuccessAt: timestamp,
      lastStatus: result.status,
      lastError: null,
      activeJobCount: result.jobs.length,
    },
  });
  return { jobsSeen: result.jobs.length, newJobs, updatedJobs };
}

export async function runGreenhouseDiscovery(
  options: GreenhouseDiscoveryOptions = {},
): Promise<GreenhouseDiscoverySummary> {
  const run = await prisma.greenhouse_discovery_runs.create({
    data: { status: "running" },
  });
  try {
    const retained = await prisma.greenhouse_boards.findMany({
      where: { status: { not: "failed" } },
    });
    const candidates = await discoverCandidates(options);
    const byToken = new Map<string, GreenhouseCandidate>();
    for (const board of retained) {
      byToken.set(board.boardToken.toLowerCase(), {
        company: board.company,
        boardToken: board.boardToken,
        boardUrl: board.boardUrl,
        source: "retained",
      });
    }
    for (const candidate of candidates)
      byToken.set(candidate.boardToken.toLowerCase(), candidate);
    const allCandidates = [...byToken.values()];
    const results: Array<Awaited<ReturnType<typeof fetchCandidate>>> = [];
    const workers = Math.max(
      1,
      Math.min(
        options.workers ?? Number(process.env.GREENHOUSE_WORKERS || 6),
        12,
      ),
    );
    let cursor = 0;
    const consume = async () => {
      while (cursor < allCandidates.length) {
        const candidate = allCandidates[cursor++];
        if (!candidate) return;
        results.push(await fetchCandidate(candidate));
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(workers, allCandidates.length || 1) }, () =>
        consume(),
      ),
    );
    let validBoards = 0;
    let failedBoards = 0;
    let jobsSeen = 0;
    let newJobs = 0;
    let updatedJobs = 0;
    for (const result of results) {
      if (result.ok) validBoards += 1;
      else failedBoards += 1;
      const persisted = await persistBoardResult(run.id, result);
      jobsSeen += persisted.jobsSeen;
      newJobs += persisted.newJobs;
      updatedJobs += persisted.updatedJobs;
    }
    await prisma.greenhouse_discovery_runs.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: now(),
        candidateBoards: allCandidates.length,
        validBoards,
        failedBoards,
        jobsSeen,
        newJobs,
        updatedJobs,
        sources: {
          seeds: options.seeds ?? [],
          commonCrawlEnabled: options.commonCrawlEnabled ?? true,
        },
      },
    });
    return {
      runId: run.id,
      candidateBoards: allCandidates.length,
      validBoards,
      failedBoards,
      jobsSeen,
      newJobs,
      updatedJobs,
    };
  } catch (error) {
    await prisma.greenhouse_discovery_runs.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: now(),
        error:
          error instanceof Error ? error.stack || error.message : String(error),
      },
    });
    throw error;
  }
}

function parseGreenhousePreferences(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function getGreenhouseAutomationSettings(
  userId: string,
): Promise<GreenhouseAutomationSettings> {
  const preferences = await prisma.user_preferences.findUnique({
    where: { userId },
    select: { greenhousePreferences: true },
  });
  const greenhousePreferences = parseGreenhousePreferences(
    preferences?.greenhousePreferences,
  );
  return { autoSubmit: greenhousePreferences.autoSubmit === true };
}

export async function updateGreenhouseAutomationSettings(
  userId: string,
  settings: Partial<GreenhouseAutomationSettings>,
): Promise<GreenhouseAutomationSettings> {
  const current = await getGreenhouseAutomationSettings(userId);
  const next = { ...current, ...settings };
  await prisma.user_preferences.upsert({
    where: { userId },
    create: { userId, greenhousePreferences: next },
    update: { greenhousePreferences: next },
  });
  return next;
}

function parsePlatformLimits(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, limit]) => [
      key,
      Math.max(0, Math.min(12, Number(limit) || 0)),
    ]),
  );
}

export async function getUserLimitSnapshot(
  userId: string,
  platform = "greenhouse",
): Promise<GreenhouseLimitSnapshot> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
  const overallLimit = Math.max(
    0,
    Number(user?.preferences?.dailyApplyLimit ?? 10),
  );
  const platformLimits = parsePlatformLimits(
    user?.preferences?.platformDailyLimits,
  );
  const platformLimit = platformLimits[platform] ?? Math.min(12, overallLimit);
  const today = startOfToday();
  const [totalUsed, platformUsed] = await Promise.all([
    prisma.user_job_applications.count({
      where: { userId, appliedAt: { gte: today }, status: { not: "error" } },
    }),
    prisma.user_job_applications.count({
      where: {
        userId,
        platform,
        appliedAt: { gte: today },
        status: { not: "error" },
      },
    }),
  ]);
  return {
    overallLimit,
    platformLimits: { ...platformLimits, [platform]: platformLimit },
    totalUsed,
    platformUsed,
    remainingOverall: Math.max(0, overallLimit - totalUsed),
    remainingPlatform: Math.max(0, platformLimit - platformUsed),
  };
}

export async function prepareManualGreenhouseApplication(
  userId: string,
  jobId: string,
) {
  const job = await prisma.greenhouse_jobs.findFirst({
    where: { id: jobId, isActive: true },
  });
  if (!job) throw new Error("Greenhouse job not found or no longer active");
  const existing = await prisma.user_job_applications.findFirst({
    where: { userId, externalJobKey: job.externalKey },
  });
  if (existing) return existing;
  const limits = await getUserLimitSnapshot(userId);
  if (limits.remainingOverall <= 0)
    throw new Error("Overall daily application limit reached");
  if (limits.remainingPlatform <= 0)
    throw new Error("Greenhouse daily application limit reached");
  return prisma.user_job_applications.create({
    data: {
      userId,
      platform: "greenhouse",
      externalJobKey: job.externalKey,
      jobTitle: job.title,
      company: job.company,
      jobLink: job.jobLink,
      type: "job",
      location: job.location,
      deadline: job.applicationDeadline,
      status: "pending_confirmation",
      notes:
        "Prepared for manual confirmation. ApplyAI will not submit this application automatically.",
      metadata: {
        greenhouseJobId: job.greenhouseJobId,
        boardToken: job.boardToken,
        source: "greenhouse",
      },
    },
  });
}

export async function confirmManualGreenhouseApplication(
  userId: string,
  applicationId: string,
) {
  const existing = await prisma.user_job_applications.findFirst({
    where: { id: applicationId, userId, platform: "greenhouse" },
  });
  if (!existing) throw new Error("Greenhouse application not found");
  if (existing.status !== "pending_confirmation") return existing;
  return prisma.user_job_applications.update({
    where: { id: existing.id },
    data: {
      status: "autofill_queued",
      notes:
        "User confirmed. Greenhouse form autofill has been queued; unresolved fields will be marked action_required.",
    },
  });
}

export async function listGreenhouseJobs(
  input: {
    search?: string;
    location?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 24));
  const where = {
    isActive: true,
    ...(input.search
      ? {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            {
              company: { contains: input.search, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
    ...(input.location
      ? { location: { contains: input.location, mode: "insensitive" as const } }
      : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.greenhouse_jobs.findMany({
      where,
      orderBy: [{ lastSeenAt: "desc" }, { company: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        board: { select: { company: true, boardToken: true, source: true } },
      },
    }),
    prisma.greenhouse_jobs.count({ where }),
  ]);
  return {
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getGreenhouseDiscoveryStatus() {
  return prisma.greenhouse_discovery_runs.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
  });
}

function jobMatchesUser(
  job: { title: string; company: string; location: string | null },
  user: {
    preferences: {
      rolesOfInterest: unknown;
      preferredLocations: unknown;
    } | null;
    skills: Array<{ skill: string }>;
  },
): boolean {
  const roles = Array.isArray(user.preferences?.rolesOfInterest)
    ? user.preferences?.rolesOfInterest.map(String).filter(Boolean)
    : [];
  const skills = user.skills.map((item) => item.skill).filter(Boolean);
  const locations = Array.isArray(user.preferences?.preferredLocations)
    ? user.preferences?.preferredLocations.map(String).filter(Boolean)
    : [];
  const searchText = `${job.title} ${job.company}`.toLowerCase();
  const roleMatch =
    (roles.length === 0 && skills.length === 0) ||
    [...roles, ...skills].some((term) =>
      searchText.includes(term.toLowerCase()),
    );
  const locationMatch =
    locations.length === 0 ||
    locations.some(
      (term) =>
        !job.location ||
        job.location.toLowerCase().includes(term.toLowerCase()),
    );
  return roleMatch && locationMatch;
}

export async function selectGreenhouseApplications() {
  const users = await prisma.users.findMany({
    where: {
      isGreenhouseApplyEnabled: true,
      preferences: { is: { autoApply: true } },
    },
    include: { preferences: true, skills: true },
  });
  const jobs = await prisma.greenhouse_jobs.findMany({
    where: { isActive: true },
    orderBy: [{ lastSeenAt: "desc" }, { firstSeenAt: "desc" }],
    take: 200,
  });
  const prepared: Array<{
    userId: string;
    jobId: string;
    applicationId: string;
    status: string;
    submit: boolean;
  }> = [];
  for (const user of users) {
    const limits = await getUserLimitSnapshot(user.id, "greenhouse");
    let capacity = Math.min(
      limits.remainingOverall,
      limits.remainingPlatform,
      12,
    );
    if (capacity <= 0) continue;
    for (const job of jobs) {
      if (capacity <= 0 || !jobMatchesUser(job, user)) break;
      const existing = await prisma.user_job_applications.findFirst({
        where: { userId: user.id, externalJobKey: job.externalKey },
        select: { id: true },
      });
      if (existing) continue;
      const application = await prisma.user_job_applications.create({
        data: {
          userId: user.id,
          platform: "greenhouse",
          externalJobKey: job.externalKey,
          jobTitle: job.title,
          company: job.company,
          jobLink: job.jobLink,
          type: "job",
          location: job.location,
          deadline: job.applicationDeadline,
          status: "pending_confirmation",
          notes:
            "Daily Greenhouse discovery match. Review and confirm before opening the application form.",
          metadata: {
            greenhouseJobId: job.greenhouseJobId,
            boardToken: job.boardToken,
            source: "scheduled_selection",
            greenhouseTag: "greenhouse",
            tags: ["greenhouse"],
          },
        },
      });
      const greenhousePreferences = parseGreenhousePreferences(
        user.preferences?.greenhousePreferences,
      );
      prepared.push({
        userId: user.id,
        jobId: job.id,
        applicationId: application.id,
        status: "pending_confirmation",
        submit:
          process.env.GREENHOUSE_AUTO_SUBMIT === "true" &&
          greenhousePreferences.autoSubmit === true,
      });
      capacity -= 1;
    }
  }
  return {
    users: users.length,
    jobs: jobs.length,
    prepared: prepared.length,
    applications: prepared,
  };
}

import OpenAI from "openai";
import { prisma } from "@applyai/db";

export interface JobSkillCriteria {
  roles: string[];
  locations: string[];
  providerKeys: string[];
  companyTypes?: string[];
  seniority?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  maxResults: number;
}

export interface ProviderResult {
  provider: string;
  externalId: string | null;
  sourceUrl: string;
  canonicalUrl: string;
  title: string;
  company: string;
  location: string | null;
  jobType: string | null;
  salary: string | null;
  description: string | null;
  postedAt: Date | null;
  rawData: Record<string, unknown>;
}

type TavilyResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  published_date?: unknown;
  score?: unknown;
};

type TavilyResponse = {
  results?: TavilyResult[];
};

const DEFAULT_SEARCH_DOMAINS = [
  "naukri.com",
  "linkedin.com",
  "instahyre.com",
  "cutshort.io",
  "hirist.tech",
  "in.indeed.com",
  "foundit.in",
  "shine.com",
  "timesjobs.com",
  "glassdoor.co.in",
  "wellfound.com",
  "weworkremotely.com",
  "boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
  "apply.workable.com",
];

const DOMAIN_PROVIDER_MAP: Array<{ provider: string; domains: string[] }> = [
  { provider: "linkedin", domains: ["linkedin.com"] },
  { provider: "naukri", domains: ["naukri.com"] },
  { provider: "instahyre", domains: ["instahyre.com"] },
  { provider: "cutshort", domains: ["cutshort.io"] },
  { provider: "hirist", domains: ["hirist.tech"] },
  { provider: "indeed", domains: ["indeed.com", "in.indeed.com"] },
  { provider: "foundit", domains: ["foundit.in", "monster.com"] },
  { provider: "shine", domains: ["shine.com"] },
  { provider: "timesjobs", domains: ["timesjobs.com"] },
  { provider: "glassdoor", domains: ["glassdoor.com", "glassdoor.co.in"] },
  { provider: "wellfound", domains: ["wellfound.com", "angel.co"] },
  { provider: "weworkremotely", domains: ["weworkremotely.com"] },
  {
    provider: "company_careers",
    domains: ["greenhouse.io", "lever.co", "ashbyhq.com", "workable.com"],
  },
];

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(utm_|ref|source|trk|tracking)/i.test(key))
        url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesAny(
  value: string | null | undefined,
  terms: string[],
): boolean {
  if (!terms.length) return true;
  const target = (value || "").toLowerCase();
  return terms.some((term) => target.includes(term.toLowerCase()));
}

async function searchUnstop(
  criteria: JobSkillCriteria,
): Promise<ProviderResult[]> {
  const roles = criteria.roles.filter(Boolean);
  const locations = criteria.locations.filter(Boolean);
  const rows = await prisma.unstop_internships.findMany({
    where: {
      isActive: true,
      ...(roles.length
        ? {
            OR: roles.flatMap((role) => [
              { title: { contains: role, mode: "insensitive" as const } },
              { skills: { array_contains: role } },
            ]),
          }
        : {}),
    },
    orderBy: { scrapedAt: "desc" },
    take: Math.min(criteria.maxResults * 4, 200),
  });

  return rows
    .filter((row) => matchesAny(row.location, locations))
    .map((row) => ({
      provider: "unstop",
      externalId: row.id,
      sourceUrl: row.link,
      canonicalUrl: canonicalizeUrl(row.link),
      title: row.title,
      company: row.company,
      location: row.location,
      jobType: row.type,
      salary: row.stipend,
      description:
        [
          row.experience,
          Array.isArray(row.skills) ? row.skills.join(", ") : "",
          row.tags,
        ]
          .filter(Boolean)
          .join(" | ") || null,
      postedAt: parseDate(row.postedDate) || row.scrapedAt,
      rawData: {
        id: row.id,
        link: row.link,
        title: row.title,
        company: row.company,
        skills: row.skills,
        tags: row.tags,
        postedDate: row.postedDate,
        scrapedAt: row.scrapedAt,
      },
    }))
    .slice(0, criteria.maxResults);
}

function configuredSearchDomains(): string[] {
  const configured = [
    process.env.JOB_SKILL_SEARCH_DOMAINS,
    process.env.JOB_SKILL_CAREER_DOMAINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","));
  return unique([...configured, ...DEFAULT_SEARCH_DOMAINS]).slice(0, 300);
}

async function expandRoleQueries(
  criteria: JobSkillCriteria,
): Promise<string[]> {
  const apiKey = process.env.JOB_SKILL_LLM_API_KEY;
  if (!apiKey || !criteria.roles.length) return [];

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.JOB_SKILL_LLM_BASE_URL || undefined,
    });
    const response = await client.chat.completions.create({
      model: process.env.JOB_SKILL_LLM_MODEL || "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            'You expand job-search role terms. Return JSON only in the shape {"aliases":[string]}. Do not include employers, personal data, unsupported technologies, or unrelated roles. Return at most 6 concise aliases.',
        },
        {
          role: "user",
          content: JSON.stringify({
            roles: criteria.roles,
            locations: criteria.locations,
            seniority: criteria.seniority,
          }),
        },
      ],
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) return [];
    const parsed = JSON.parse(content) as { aliases?: unknown };
    return Array.isArray(parsed.aliases)
      ? parsed.aliases
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];
  } catch (error) {
    console.warn(
      "Job Skill role expansion unavailable; using deterministic queries:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

async function buildSearchQueries(
  criteria: JobSkillCriteria,
): Promise<string[]> {
  const aliases = await expandRoleQueries(criteria);
  const roles = unique([...criteria.roles, ...aliases]).slice(0, 8);
  const locations = criteria.locations.length
    ? criteria.locations
    : ["India", "Remote"];
  const queries: string[] = [];

  for (const role of roles) {
    for (const location of locations.slice(0, 3)) {
      queries.push(
        `"${role.replace(/"/g, "")}" "${location.replace(/"/g, "")}" jobs`,
      );
    }
  }

  if (!queries.length) queries.push("software jobs India remote careers");
  return unique(queries).slice(0, 8);
}

function providerForUrl(value: string): string {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      DOMAIN_PROVIDER_MAP.find(({ domains }) =>
        domains.some(
          (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
        ),
      )?.provider || "web_search"
    );
  } catch {
    return "web_search";
  }
}

function guessCompany(title: string, url: string): string {
  const titleCompany = title.match(/\s(?:at|@|\|)\s+([^|–—-]+)$/i)?.[1]?.trim();
  if (titleCompany && titleCompany.length <= 80) return titleCompany;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").split(".");
    const knownJobHosts = new Set([
      "greenhouse",
      "lever",
      "ashbyhq",
      "workable",
    ]);
    const pathCompany = parsed.pathname.split("/").filter(Boolean)[0];
    if (pathCompany && knownJobHosts.has(host[0] || ""))
      return pathCompany.replace(/[-_]/g, " ");
    const companyHost = host.at(-2) || host[0] || "company";
    return companyHost.replace(/[-_]/g, " ");
  } catch {
    return "Unknown company";
  }
}

function inferJobType(value: string): string | null {
  if (/intern|internship|apprentice/i.test(value)) return "Internship";
  if (/contract|freelance/i.test(value)) return "Contract";
  if (/part[- ]?time/i.test(value)) return "Part-time";
  if (/full[- ]?time/i.test(value)) return "Full-time";
  return null;
}

function inferSalary(value: string): string | null {
  const match = value.match(
    /(?:₹|Rs\.?|INR|USD|\$)\s?[\d,.]+(?:\s?[-–]\s?(?:₹|Rs\.?|INR|USD|\$)?\s?[\d,.]+)?(?:\s?(?:LPA|per annum|annually|k|K|million))?/i,
  );
  return match?.[0]?.trim() || null;
}

async function searchWeb(
  criteria: JobSkillCriteria,
): Promise<ProviderResult[]> {
  const apiKey = process.env.JOB_SKILL_SEARCH_API_KEY;
  if (!apiKey) throw new Error("JOB_SKILL_SEARCH_API_KEY is not configured");

  const endpoint = (
    process.env.JOB_SKILL_SEARCH_API_URL || "https://api.tavily.com/search"
  ).replace(/\/$/, "");
  const queries = await buildSearchQueries(criteria);
  const domains = configuredSearchDomains();
  const maxPerQuery = Math.min(
    20,
    Math.max(
      5,
      Math.ceil(criteria.maxResults / Math.max(1, Math.min(queries.length, 4))),
    ),
  );
  const results: ProviderResult[] = [];

  for (const query of queries) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: process.env.JOB_SKILL_SEARCH_DEPTH || "basic",
        max_results: maxPerQuery,
        include_answer: false,
        include_raw_content: false,
        include_domains: domains,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `search API returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    const payload = (await response.json()) as TavilyResponse;
    for (const item of payload.results || []) {
      const sourceUrl = stringValue(item.url);
      const title = stringValue(item.title);
      const description = stringValue(item.content);
      if (!sourceUrl || !title) continue;
      const searchable = `${title} ${sourceUrl} ${description}`;
      if (
        !/(job|career|opening|vacancy|apply|engineer|developer|intern|manager|designer|analyst|scientist|recruit)/i.test(
          searchable,
        )
      )
        continue;

      const canonicalUrl = canonicalizeUrl(sourceUrl);
      results.push({
        provider: providerForUrl(sourceUrl),
        externalId: canonicalUrl,
        sourceUrl,
        canonicalUrl,
        title,
        company: guessCompany(title, sourceUrl),
        location:
          criteria.locations.find((location) =>
            searchable.toLowerCase().includes(location.toLowerCase()),
          ) || null,
        jobType: inferJobType(searchable),
        salary: inferSalary(searchable),
        description: description || null,
        postedAt: parseDate(item.published_date),
        rawData: {
          query,
          title,
          url: sourceUrl,
          content: description,
          publishedDate: item.published_date,
          score: item.score,
        },
      });
    }

    if (results.length >= criteria.maxResults * 2) break;
  }

  const uniqueResults = Array.from(
    new Map(results.map((result) => [result.canonicalUrl, result])).values(),
  );
  return uniqueResults.slice(0, criteria.maxResults);
}

export const providerRegistry: Record<
  string,
  (criteria: JobSkillCriteria) => Promise<ProviderResult[]>
> = {
  unstop: searchUnstop,
  web_search: searchWeb,
};

export async function searchProviders(
  criteria: JobSkillCriteria,
): Promise<{ results: ProviderResult[]; failures: string[] }> {
  const failures: string[] = [];
  const results: ProviderResult[] = [];
  for (const providerKey of criteria.providerKeys) {
    const provider = providerRegistry[providerKey];
    if (!provider) {
      failures.push(
        `${providerKey}: provider is not configured in this deployment`,
      );
      continue;
    }
    try {
      results.push(...(await provider(criteria)));
    } catch (error) {
      failures.push(
        `${providerKey}: ${error instanceof Error ? error.message : "provider request failed"}`,
      );
    }
  }
  const uniqueResults = new Map<string, ProviderResult>();
  for (const result of results) uniqueResults.set(result.canonicalUrl, result);
  return {
    results: Array.from(uniqueResults.values()).slice(0, criteria.maxResults),
    failures,
  };
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length >= 2);
}

export function scoreOpportunity(
  result: ProviderResult,
  profile: any,
  criteria: JobSkillCriteria,
): { score: number; reason: string } {
  const searchable =
    `${result.title} ${result.description || ""} ${result.company}`.toLowerCase();
  const skills = Array.isArray(profile?.skills)
    ? profile.skills
        .map((skill: any) => (typeof skill === "string" ? skill : skill.skill))
        .filter(Boolean)
    : [];
  const skillHits = skills.filter((skill: string) =>
    searchable.includes(skill.toLowerCase()),
  );
  const roleHit =
    criteria.roles.length === 0 ||
    criteria.roles.some((role) =>
      result.title.toLowerCase().includes(role.toLowerCase()),
    );
  const locationHit =
    criteria.locations.length === 0 ||
    matchesAny(result.location, criteria.locations);
  const profileText = `${profile?.experience?.map((item: any) => `${item.role || ""} ${item.description || ""}`).join(" ") || ""} ${skills.join(" ")}`;
  const projectSkillHits = tokens(searchable).filter((token) =>
    profileText.toLowerCase().includes(token),
  ).length;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (skillHits.length / Math.max(1, Math.min(skills.length, 8))) * 55 +
          (roleHit ? 20 : 0) +
          (locationHit ? 15 : 0) +
          Math.min(10, projectSkillHits),
      ),
    ),
  );
  const gaps = criteria.roles.filter(
    (role) => !result.title.toLowerCase().includes(role.toLowerCase()),
  );
  const reason = `${skillHits.length} profile skill${skillHits.length === 1 ? "" : "s"} matched${roleHit ? "; role aligns" : "; role title differs"}${locationHit ? "; location aligns" : "; location may differ"}${gaps.length ? `; review target: ${gaps.slice(0, 2).join(", ")}` : ""}.`;
  return { score, reason };
}

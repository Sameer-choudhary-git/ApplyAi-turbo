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

export function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(utm_|ref|source|trk|tracking)/i.test(key)) url.searchParams.delete(key);
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

function matchesAny(value: string | null | undefined, terms: string[]): boolean {
  if (!terms.length) return true;
  const target = (value || "").toLowerCase();
  return terms.some((term) => target.includes(term.toLowerCase()));
}

async function searchUnstop(criteria: JobSkillCriteria): Promise<ProviderResult[]> {
  const roles = criteria.roles.filter(Boolean);
  const locations = criteria.locations.filter(Boolean);
  const rows = await prisma.unstop_internships.findMany({
    where: {
      isActive: true,
      ...(roles.length
        ? { OR: roles.flatMap((role) => [{ title: { contains: role, mode: "insensitive" as const } }, { skills: { array_contains: role } }]) }
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
      description: [row.experience, Array.isArray(row.skills) ? row.skills.join(", ") : "", row.tags].filter(Boolean).join(" | ") || null,
      postedAt: parseDate(row.postedDate) || row.scrapedAt,
      rawData: { id: row.id, link: row.link, title: row.title, company: row.company, skills: row.skills, tags: row.tags, postedDate: row.postedDate, scrapedAt: row.scrapedAt },
    }))
    .slice(0, criteria.maxResults);
}

export const providerRegistry: Record<string, (criteria: JobSkillCriteria) => Promise<ProviderResult[]>> = {
  unstop: searchUnstop,
};

export async function searchProviders(criteria: JobSkillCriteria): Promise<{ results: ProviderResult[]; failures: string[] }> {
  const failures: string[] = [];
  const results: ProviderResult[] = [];
  for (const providerKey of criteria.providerKeys) {
    const provider = providerRegistry[providerKey];
    if (!provider) {
      failures.push(`${providerKey}: provider is not configured in this deployment`);
      continue;
    }
    try {
      results.push(...(await provider(criteria)));
    } catch (error) {
      failures.push(`${providerKey}: ${error instanceof Error ? error.message : "provider request failed"}`);
    }
  }
  const unique = new Map<string, ProviderResult>();
  for (const result of results) unique.set(result.canonicalUrl, result);
  return { results: Array.from(unique.values()).slice(0, criteria.maxResults), failures };
}

function tokens(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9+#.]+/).filter((token) => token.length >= 2);
}

export function scoreOpportunity(result: ProviderResult, profile: any, criteria: JobSkillCriteria): { score: number; reason: string } {
  const searchable = `${result.title} ${result.description || ""} ${result.company}`.toLowerCase();
  const skills = Array.isArray(profile?.skills) ? profile.skills.map((skill: any) => typeof skill === "string" ? skill : skill.skill).filter(Boolean) : [];
  const skillHits = skills.filter((skill: string) => searchable.includes(skill.toLowerCase()));
  const roleHit = criteria.roles.length === 0 || criteria.roles.some((role) => result.title.toLowerCase().includes(role.toLowerCase()));
  const locationHit = criteria.locations.length === 0 || matchesAny(result.location, criteria.locations);
  const profileText = `${profile?.experience?.map((item: any) => `${item.role || ""} ${item.description || ""}`).join(" ") || ""} ${skills.join(" ")}`;
  const projectSkillHits = tokens(searchable).filter((token) => profileText.toLowerCase().includes(token)).length;
  const score = Math.max(0, Math.min(100, Math.round(
    (skillHits.length / Math.max(1, Math.min(skills.length, 8))) * 55 +
    (roleHit ? 20 : 0) +
    (locationHit ? 15 : 0) +
    Math.min(10, projectSkillHits),
  )));
  const gaps = criteria.roles.filter((role) => !result.title.toLowerCase().includes(role.toLowerCase()));
  const reason = `${skillHits.length} profile skill${skillHits.length === 1 ? "" : "s"} matched${roleHit ? "; role aligns" : "; role title differs"}${locationHit ? "; location aligns" : "; location may differ"}${gaps.length ? `; review target: ${gaps.slice(0, 2).join(", ")}` : ""}.`;
  return { score, reason };
}

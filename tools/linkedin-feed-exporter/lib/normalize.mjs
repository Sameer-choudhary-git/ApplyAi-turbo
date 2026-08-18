export function normalizeText(value = "") {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function canonicalizeUrl(value = "") {
  if (!value) return null;

  try {
    const url = new URL(value, "https://www.linkedin.com");
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(trk|lipi|midToken|midSig|eBP|originalSubdomain)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function parsePostId(url = "") {
  const normalized = canonicalizeUrl(url) || "";
  const patterns = [
    /\/feed\/update\/(urn:li:activity:\d+)/i,
    /\/posts\/[^/?#]*-(\d{8,})/i,
    /activity[:\-_](\d{8,})/i,
    /(\d{10,})/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1];
  }

  return normalized || null;
}

export function parseCount(value) {
  if (value === null || value === undefined) return null;
  const text = normalizeText(value).toLowerCase().replace(/,/g, "");
  if (!text) return null;

  const match = text.match(/(\d+(?:\.\d+)?)\s*([km])?/i);
  if (!match) return null;

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const multiplier = match[2]?.toLowerCase() === "k" ? 1_000 : match[2]?.toLowerCase() === "m" ? 1_000_000 : 1;
  return Math.round(base * multiplier);
}

export function extractEngagement(text = "") {
  const normalized = normalizeText(text);
  const read = (patterns) => {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match?.[1]) return parseCount(match[1]);
    }
    return null;
  };

  return {
    reactions: read([/(\d[\d,.]*\s*[km]?)\s+(?:reactions?|likes?)/i]),
    comments: read([/(\d[\d,.]*\s*[km]?)\s+comments?/i]),
    reposts: read([/(\d[\d,.]*\s*[km]?)\s+(?:reposts?|re-?shares?)/i]),
  };
}

export function extractSocialContext(text = "") {
  const normalized = normalizeText(text);
  const patterns = [
    { action: "loved", pattern: /^(.*?)\s+loved this/i },
    { action: "liked", pattern: /^(.*?)\s+likes? this/i },
    { action: "commented", pattern: /^(.*?)\s+commented on this/i },
    { action: "supported", pattern: /^(.*?)\s+supports? this/i },
    { action: "celebrated", pattern: /^(.*?)\s+celebrates? this/i },
    { action: "insightful", pattern: /^(.*?)\s+finds this insightful/i },
    { action: "funny", pattern: /^(.*?)\s+finds this funny/i },
    { action: "reposted", pattern: /^(.*?)\s+reposted this/i },
  ];

  for (const { action, pattern } of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const actor = normalizeText(match[1].split("\n").pop());
      return { actor: actor || null, action };
    }
  }

  return { actor: null, action: null };
}

export function classifyPost(snapshot) {
  const text = normalizeText(snapshot.rawText || snapshot.text || "");
  if (snapshot.job?.url || /\bview job\b|\bapply now\b/i.test(text)) return "job";
  if (snapshot.hasPoll) return "poll";
  if (snapshot.hasDocument) return "document";
  if (snapshot.hasVideo) return "video";
  if (snapshot.socialContext?.action === "reposted") return "repost";
  return "post";
}

export function extractJob(snapshot) {
  const candidate = snapshot.job || {};
  const text = normalizeText(snapshot.rawText || "");
  const jobUrl = canonicalizeUrl(candidate.url || snapshot.jobUrl);
  if (!jobUrl && !/\bview job\b|\bapply now\b/i.test(text)) return null;

  return {
    jobId: candidate.jobId || jobUrl || null,
    jobUrl,
    title: normalizeText(candidate.title || "") || null,
    company: normalizeText(candidate.company || "") || null,
    location: normalizeText(candidate.location || "") || null,
    employmentType: normalizeText(candidate.employmentType || "") || null,
    workplaceType: normalizeText(candidate.workplaceType || "") || null,
    sourcePostId: snapshot.postId || null,
    rawText: text || null,
  };
}

export function normalizeSnapshot(snapshot, pageUrl, capturedAt) {
  const postUrl = canonicalizeUrl(snapshot.postUrl);
  const postId = snapshot.postId || parsePostId(postUrl);
  const authorUrl = canonicalizeUrl(snapshot.author?.profileUrl || "");
  const authorName = normalizeText(snapshot.author?.name || "");
  const job = extractJob({ ...snapshot, postId });
  const normalized = {
    entityType: "post",
    postId,
    postUrl,
    postType: classifyPost({ ...snapshot, postId, job }),
    text: normalizeText(snapshot.text || ""),
    author: {
      name: authorName || null,
      profileUrl: authorUrl,
      headline: normalizeText(snapshot.author?.headline || "") || null,
    },
    socialContext: snapshot.socialContext || { actor: null, action: null },
    createdAt: snapshot.createdAt || null,
    relativeTime: normalizeText(snapshot.relativeTime || "") || null,
    engagement: snapshot.engagement || extractEngagement(snapshot.rawText),
    media: {
      imageUrls: [...new Set((snapshot.imageUrls || []).map(canonicalizeUrl).filter(Boolean))],
      hasVideo: Boolean(snapshot.hasVideo),
      hasDocument: Boolean(snapshot.hasDocument),
    },
    job,
    comments: snapshot.comments || [],
    reactions: snapshot.reactions || [],
    rawText: normalizeText(snapshot.rawText || "") || null,
    source: {
      pageUrl: canonicalizeUrl(pageUrl),
      capturedAt,
      extractionMode: snapshot.extractionMode || "visible-dom",
    },
  };

  return normalized;
}

export function dedupeRecords(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = record.postId || record.postUrl || `${record.author?.profileUrl || record.author?.name}|${record.createdAt || record.relativeTime}|${record.text}`;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, record);
      continue;
    }

    byKey.set(key, {
      ...previous,
      ...record,
      text: record.text.length >= previous.text.length ? record.text : previous.text,
      rawText: record.rawText?.length >= (previous.rawText || "").length ? record.rawText : previous.rawText,
      comments: mergeEntities(previous.comments, record.comments),
      reactions: mergeEntities(previous.reactions, record.reactions),
    });
  }
  return [...byKey.values()];
}

export function mergeEntities(left = [], right = []) {
  const values = [...left, ...right].filter(Boolean);
  const byKey = new Map();
  for (const value of values) {
    const key = value.id || value.profileUrl || `${value.name || ""}|${value.text || ""}|${value.type || ""}`;
    if (!byKey.has(key)) byKey.set(key, value);
  }
  return [...byKey.values()];
}

export function buildExports(records) {
  const authors = new Map();
  const jobs = new Map();
  const engagement = [];

  for (const record of records) {
    if (record.author?.name || record.author?.profileUrl) {
      const key = record.author.profileUrl || record.author.name;
      authors.set(key, {
        name: record.author.name,
        profileUrl: record.author.profileUrl,
        headline: record.author.headline,
        postCount: (authors.get(key)?.postCount || 0) + 1,
      });
    }
    if (record.job) jobs.set(record.job.jobId, record.job);
    engagement.push({
      postId: record.postId,
      postUrl: record.postUrl,
      author: record.author,
      socialContext: record.socialContext,
      counts: record.engagement,
      reactions: record.reactions,
      comments: record.comments,
    });
  }

  return {
    posts: records,
    jobs: [...jobs.values()],
    authors: [...authors.values()],
    engagement,
  };
}

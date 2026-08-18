#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import {
  canonicalizeUrl,
  dedupeRecords,
  extractEngagement,
  extractSocialContext,
  normalizeSnapshot,
  normalizeText,
  parsePostId,
  buildExports,
} from "./lib/normalize.mjs";

const DEFAULTS = {
  url: "https://www.linkedin.com/feed/",
  output: path.resolve("data/linkedin-feed/latest"),
  profileDir: path.resolve(".local/linkedin-profile"),
  maxPosts: 100,
  maxScrolls: 30,
  scrollPauseMs: 1500,
  maxIdleScrolls: 4,
  details: false,
  maxDetailPosts: 25,
  maxEngagementEntities: 200,
  headless: false,
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--headless") options.headless = true;
    else if (arg === "--details") options.details = true;
    else if (arg === "--url") options.url = argv[++index];
    else if (arg === "--output") options.output = path.resolve(argv[++index]);
    else if (arg === "--profile-dir") options.profileDir = path.resolve(argv[++index]);
    else if (arg === "--max-posts") options.maxPosts = Number(argv[++index]);
    else if (arg === "--max-scrolls") options.maxScrolls = Number(argv[++index]);
    else if (arg === "--scroll-pause-ms") options.scrollPauseMs = Number(argv[++index]);
    else if (arg === "--max-idle-scrolls") options.maxIdleScrolls = Number(argv[++index]);
    else if (arg === "--max-detail-posts") options.maxDetailPosts = Number(argv[++index]);
    else if (arg === "--max-engagement-entities") options.maxEngagementEntities = Number(argv[++index]);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`LinkedIn feed exporter\n\nUsage:\n  node tools/linkedin-feed-exporter/index.mjs [options]\n\nOptions:\n  --url <url>                         Feed URL to collect (default: LinkedIn feed)\n  --output <directory>                Output directory (default: data/linkedin-feed/latest)\n  --profile-dir <directory>           Local Playwright profile directory\n  --max-posts <n>                     Stop after n unique posts (default: 100)\n  --max-scrolls <n>                   Maximum feed scrolls (default: 30)\n  --scroll-pause-ms <n>               Pause between scrolls (default: 1500)\n  --max-idle-scrolls <n>              Stop after no new posts for n scrolls (default: 4)\n  --details                          Open up to --max-detail-posts posts to collect visible dialog entities\n  --max-detail-posts <n>              Detail pages to enrich (default: 25)\n  --max-engagement-entities <n>       Cap comments/reactions captured per post (default: 200)\n  --headless                          Run headless; headed mode is the safe default\n  --help                              Show this help\n\nThe first run may require you to sign in manually in the opened browser. No credentials are read or stored by this script.\n`);
}

function now() {
  return new Date().toISOString();
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeNdjson(filePath, values) {
  await fs.writeFile(filePath, values.map((value) => JSON.stringify(value)).join("\n") + (values.length ? "\n" : ""), "utf8");
}

async function waitForEnter(message) {
  console.log(message);
  if (!process.stdin.isTTY) return;
  await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", resolve);
  });
}

async function isLoggedIn(page) {
  const url = page.url();
  if (/\/login|\/checkpoint\//i.test(url)) return false;
  return await page.locator("body").evaluate((body) => {
    const text = body.innerText || "";
    return !/sign in|join now|email or phone|password/i.test(text.slice(0, 2_000));
  }).catch(() => false);
}

async function expandVisibleText(page) {
  const selectors = [
    'button:has-text("see more")',
    'button:has-text("… more")',
    '[data-testid="expandable-text-button"]',
    'button[aria-label*="see more" i]',
  ];
  let clicked = 0;
  for (const selector of selectors) {
    const buttons = page.locator(selector);
    const count = await buttons.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      if (await button.isVisible().catch(() => false)) {
        await button.click({ timeout: 1_000 }).catch(() => undefined);
        clicked += 1;
      }
    }
  }
  return clicked;
}

async function extractFeedSnapshots(page) {
  return await page.locator('div.feed-shared-update-v2, article, [role="article"], [role="listitem"]')
    .evaluateAll((cards) => {
      const clean = (value) => String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      const first = (root, selectors) => {
        for (const selector of selectors) {
          const element = root.querySelector(selector);
          if (element) return element;
        }
        return null;
      };
      const all = (root, selectors) => selectors.flatMap((selector) => [...root.querySelectorAll(selector)]);
      const links = (root) => [...root.querySelectorAll("a[href]")].map((anchor) => ({ href: anchor.href, text: clean(anchor.textContent) }));
      const toAbsolute = (value) => {
        try { return new URL(value, location.origin).toString(); } catch { return null; }
      };
      const dedupe = (values) => [...new Set(values.filter(Boolean))];
      const socialPattern = [
        ["loved", /^(.*?)\s+loved this/i],
        ["liked", /^(.*?)\s+likes? this/i],
        ["commented", /^(.*?)\s+commented on this/i],
        ["supported", /^(.*?)\s+supports? this/i],
        ["celebrated", /^(.*?)\s+celebrates? this/i],
        ["insightful", /^(.*?)\s+finds this insightful/i],
        ["funny", /^(.*?)\s+finds this funny/i],
        ["reposted", /^(.*?)\s+reposted this/i],
      ];

      return cards.map((card) => {
        const rawText = clean(card.innerText);
        const postLinks = links(card).filter(({ href }) => /\/feed\/update\/|\/posts\//i.test(href));
        const postUrl = postLinks[0]?.href || null;
        const profileLinks = links(card).filter(({ href, text }) => /linkedin\.com\/(in|company)\//i.test(href) && text.length > 1);
        const authorLink = profileLinks.find(({ text }) => !/^follow|connect|message$/i.test(text)) || profileLinks[0] || {};
        const textElement = first(card, [
          'div[data-testid="expandable-text-box"]',
          'p[componentkey^="feed-commentary_"]',
          '[data-test-id="main-feed-activity-card__commentary"]',
          '.feed-shared-update-v2__description',
        ]);
        let commentary = clean(textElement?.innerText || "");
        if (!commentary) {
          const candidates = [...card.querySelectorAll("p, span, div")]
            .map((element) => clean(element.innerText))
            .filter((value) => value.length >= 20 && value.length < rawText.length);
          commentary = candidates.sort((a, b) => b.length - a.length)[0] || "";
        }
        const socialContext = socialPattern.reduce((found, [action, pattern]) => {
          if (found.action) return found;
          const match = rawText.match(pattern);
          return match ? { action, actor: clean(match[1].split("\n").pop()) || null } : found;
        }, { actor: null, action: null });
        const timeElement = first(card, ["time", "span[aria-label*='ago' i]"]);
        const jobLink = links(card).find(({ href, text }) => /\/jobs\/view\//i.test(href) || /view job|apply now/i.test(text));
        const jobTitle = clean(first(card, ['a[href*="/jobs/view/"]', 'a[href*="/jobs/"]'])?.textContent);
        const images = all(card, [
          'img[src*="feedshare"]',
          'img[srcset*="feedshare"]',
          'img[data-delayed-url*="feedshare"]',
        ]).map((image) => image.currentSrc || image.src || image.getAttribute("data-delayed-url"));
        const reactions = rawText.match(/(\d[\d,.]*\s*[km]?)\s+(?:reactions?|likes?)/i)?.[1] || null;
        const comments = rawText.match(/(\d[\d,.]*\s*[km]?)\s+comments?/i)?.[1] || null;
        const reposts = rawText.match(/(\d[\d,.]*\s*[km]?)\s+(?:reposts?|re-shares?)/i)?.[1] || null;

        return {
          postId: postUrl ? (postUrl.match(/(\d{8,})/)?.[1] || null) : null,
          postUrl: toAbsolute(postUrl),
          text: commentary,
          rawText,
          author: {
            name: authorLink.text || null,
            profileUrl: toAbsolute(authorLink.href),
            headline: clean(first(card, ['[data-testid*="actor-headline" i]', '.update-components-actor__description'])?.textContent) || null,
          },
          socialContext,
          relativeTime: clean(timeElement?.getAttribute("datetime") || timeElement?.getAttribute("aria-label") || timeElement?.textContent),
          engagement: { reactions, comments, reposts },
          imageUrls: dedupe(images.map(toAbsolute)),
          hasVideo: Boolean(card.querySelector("video, [data-test-video]") ),
          hasDocument: Boolean(card.querySelector('a[href*="/document/"] img, [data-test-id*="document" i]')),
          hasPoll: Boolean(card.querySelector('[role="radio"], [data-test-id*="poll" i]')),
          job: jobLink ? { url: toAbsolute(jobLink.href), title: jobTitle || null } : null,
          domMarker: card.getAttribute("data-urn") || card.getAttribute("data-id") || null,
        };
      }).filter((snapshot) => snapshot.postUrl || snapshot.text || snapshot.job);
    });
}

async function extractDialogEntities(page, kind, cap) {
  const dialog = page.locator('[role="dialog"]').last();
  if (!(await dialog.isVisible().catch(() => false))) return { values: [], capped: false };
  const values = await dialog.locator('a[href*="/in/"], a[href*="/company/"]')
    .evaluateAll((elements, selectedKind) => elements.map((element) => ({
      id: element.href,
      name: String(element.textContent || "").replace(/\s+/g, " ").trim(),
      profileUrl: element.href,
      type: selectedKind,
    })).filter((value) => value.name), kind)
    .catch(() => []);
  const unique = [...new Map(values.map((value) => [value.id || `${value.name}|${value.type}`, value])).values()];
  return { values: unique.slice(0, cap), capped: unique.length > cap };
}

async function closeDialog(page) {
  const close = page.locator('[role="dialog"] button[aria-label*="close" i], [role="dialog"] button[data-test-modal-close-btn]').last();
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => undefined);
  else await page.keyboard.press("Escape").catch(() => undefined);
}

async function enrichPost(page, record, options) {
  if (!record.postUrl) return { record, detailStatus: "skipped-no-url" };
  const detailPage = await page.context().newPage();
  try {
    await detailPage.goto(record.postUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await detailPage.waitForTimeout(1_000);
    await expandVisibleText(detailPage);
    const detailSnapshot = (await extractFeedSnapshots(detailPage))[0];
    const enriched = {
      ...record,
      text: detailSnapshot?.text?.length > record.text.length ? detailSnapshot.text : record.text,
      rawText: detailSnapshot?.rawText?.length > (record.rawText || "").length ? detailSnapshot.rawText : record.rawText,
      engagement: detailSnapshot?.engagement || record.engagement || extractEngagement(record.rawText),
      comments: [],
      reactions: [],
      source: { ...record.source, extractionMode: "visible-dom+detail-dialog" },
    };
    const openDialog = async (kind) => {
      const buttons = detailPage.locator("button");
      const count = await buttons.count();
      const pattern = kind === "comments"
        ? /comments?/i
        : /reactions?|likes?|celebrate|support|insightful/i;
      let target = null;
      for (let index = 0; index < count; index += 1) {
        const button = buttons.nth(index);
        if (!(await button.isVisible().catch(() => false))) continue;
        const label = await button.getAttribute("aria-label").catch(() => "") || "";
        const text = normalizeText(await button.innerText().catch(() => ""));
        if (pattern.test(text + " " + label)) {
          target = button;
          break;
        }
      }
      if (!target) return { values: [], capped: false, attempted: false };
      await target.click({ timeout: 2_000 }).catch(() => undefined);
      await detailPage.waitForTimeout(500);
      const result = await extractDialogEntities(detailPage, kind, options.maxEngagementEntities);
      await closeDialog(detailPage);
      return { ...result, attempted: true };
    };
    const commentResult = await openDialog("comments");
    const reactionResult = await openDialog("reactions");
    enriched.comments = commentResult.values;
    enriched.reactions = reactionResult.values;
    enriched.source.engagementCoverage = {
      comments: { attempted: commentResult.attempted, captured: commentResult.values.length, capped: commentResult.capped },
      reactions: { attempted: reactionResult.attempted, captured: reactionResult.values.length, capped: reactionResult.capped },
    };
    return { record: enriched, detailStatus: "enriched" };
  } catch (error) {
    return { record, detailStatus: "failed", detailError: error instanceof Error ? error.message : String(error) };
  } finally {
    await detailPage.close().catch(() => undefined);
  }
}

async function collect(options) {
  await ensureDir(options.output);
  await ensureDir(options.profileDir);
  const startedAt = now();
  const collectionId = `linkedin-${startedAt.replace(/[-:.TZ]/g, "")}`;
  const browser = await chromium.launchPersistentContext(options.profileDir, {
    headless: options.headless,
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    serviceWorkers: "allow",
  });
  const page = browser.pages()[0] || await browser.newPage();
  const coverage = {
    requestedUrl: options.url,
    startedAt,
    endedAt: null,
    scrolls: 0,
    visibleCardsSeen: 0,
    snapshotsSeen: 0,
    uniquePosts: 0,
    detailPostsAttempted: 0,
    detailPostsEnriched: 0,
    gaps: [],
  };
  let records = [];

  try {
    console.log(`Opening ${options.url}`);
    await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    if (!(await isLoggedIn(page))) {
      if (options.headless) throw new Error("The browser is not signed in to LinkedIn. Run once without --headless, sign in manually, then retry.");
      await waitForEnter("Sign in manually in the opened browser, open the intended feed, then press ENTER here to continue.");
      if (!(await isLoggedIn(page))) throw new Error("The browser is not signed in to LinkedIn. No credentials were read or stored.");
    }

    let idleScrolls = 0;
    for (let scroll = 0; scroll < options.maxScrolls && records.length < options.maxPosts; scroll += 1) {
      coverage.scrolls = scroll + 1;
      const expanded = await expandVisibleText(page);
      if (expanded) await page.waitForTimeout(250);
      const snapshots = await extractFeedSnapshots(page);
      coverage.visibleCardsSeen += await page.locator('div.feed-shared-update-v2, article, [role="article"], [role="listitem"]').count().catch(() => 0);
      coverage.snapshotsSeen += snapshots.length;
      const normalized = snapshots.map((snapshot) => normalizeSnapshot(snapshot, page.url(), now())).filter((record) => record.postId || record.postUrl || record.text.length > 20);
      const before = records.length;
      records = dedupeRecords([...records, ...normalized]).slice(0, options.maxPosts);
      coverage.uniquePosts = records.length;
      idleScrolls = records.length === before ? idleScrolls + 1 : 0;
      console.log(`Scroll ${coverage.scrolls}: ${records.length} unique posts; ${idleScrolls}/${options.maxIdleScrolls} idle`);
      await writeJson(path.join(options.output, "posts.partial.json"), records);
      if (idleScrolls >= options.maxIdleScrolls) break;
      await page.mouse.wheel(0, Math.max(900, Math.floor(page.viewportSize()?.height || 900) * 0.85));
      await page.waitForTimeout(options.scrollPauseMs);
    }

    if (options.details) {
      const detailTargets = records.filter((record) => record.postUrl).slice(0, options.maxDetailPosts);
      for (const target of detailTargets) {
        coverage.detailPostsAttempted += 1;
        const result = await enrichPost(page, target, options);
        if (result.detailStatus === "enriched") coverage.detailPostsEnriched += 1;
        if (result.detailStatus === "failed") coverage.gaps.push(`Detail enrichment failed for ${target.postId || target.postUrl}: ${result.detailError}`);
        records = dedupeRecords(records.map((record) => record.postId === target.postId ? result.record : record));
        await writeJson(path.join(options.output, "posts.partial.json"), records);
      }
    } else {
      coverage.gaps.push("Detail enrichment was not requested; comments and reaction identities are limited to data already visible in feed cards.");
    }

    const invalid = records.filter((record) => !record.postId && !record.postUrl);
    if (invalid.length) coverage.gaps.push(`${invalid.length} records have no stable LinkedIn post URL or identifier.`);
    if (!records.length) coverage.gaps.push("No feed records were extracted; the page may not have been signed in, loaded, or accessible.");
    coverage.endedAt = now();
    const exports = buildExports(records);
    const manifest = {
      schemaVersion: "1.0.0",
      collectionId,
      collector: "linkedin-feed-exporter",
      collection: coverage,
      options: { ...options, profileDir: "[local-only]" },
      counts: {
        posts: exports.posts.length,
        jobs: exports.jobs.length,
        authors: exports.authors.length,
        engagementRows: exports.engagement.length,
        comments: exports.posts.reduce((sum, post) => sum + post.comments.length, 0),
        reactions: exports.posts.reduce((sum, post) => sum + post.reactions.length, 0),
      },
      notes: [
        "Records represent the data rendered to the signed-in user by the visible LinkedIn UI during this collection run.",
        "The tool does not bypass access controls, call undocumented private endpoints, solve CAPTCHAs, or claim universal completeness.",
      ],
    };
    await writeJson(path.join(options.output, "manifest.json"), manifest);
    await writeJson(path.join(options.output, "posts.json"), exports.posts);
    await writeJson(path.join(options.output, "jobs.json"), exports.jobs);
    await writeJson(path.join(options.output, "authors.json"), exports.authors);
    await writeJson(path.join(options.output, "engagement.json"), exports.engagement);
    await writeNdjson(path.join(options.output, "posts.ndjson"), exports.posts);
    await fs.rm(path.join(options.output, "posts.partial.json"), { force: true });
    console.log(`Finished. Wrote ${exports.posts.length} posts, ${exports.jobs.length} jobs, ${exports.authors.length} authors to ${options.output}`);
    if (coverage.gaps.length) console.log(`Coverage notes: ${coverage.gaps.join(" | ")}`);
  } finally {
    await browser.close();
  }
}

try {
  await collect(parseArgs(process.argv.slice(2)));
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}

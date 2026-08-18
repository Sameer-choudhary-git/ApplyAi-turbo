import test from "node:test";
import assert from "node:assert/strict";
import {
  dedupeRecords,
  extractEngagement,
  extractJob,
  parseCount,
  parsePostId,
} from "./lib/normalize.mjs";

test("parseCount handles exact, thousands, and millions", () => {
  assert.equal(parseCount("1,234"), 1234);
  assert.equal(parseCount("2.5K"), 2500);
  assert.equal(parseCount("1.2M"), 1200000);
});

test("parsePostId prefers stable LinkedIn activity identifiers", () => {
  assert.equal(parsePostId("https://www.linkedin.com/feed/update/urn:li:activity:1234567890123456789/"), "urn:li:activity:1234567890123456789");
  assert.equal(parsePostId("https://www.linkedin.com/posts/example_title-1234567890123456789"), "1234567890123456789");
});

test("extractEngagement reads the visible labels without guessing missing values", () => {
  assert.deepEqual(extractEngagement("1,234 reactions 56 comments 7 reposts"), {
    reactions: 1234,
    comments: 56,
    reposts: 7,
  });
  assert.deepEqual(extractEngagement("No visible counts"), {
    reactions: null,
    comments: null,
    reposts: null,
  });
});

test("extractJob keeps job records linked to the source post", () => {
  const job = extractJob({
    postId: "1234567890123",
    job: { url: "https://www.linkedin.com/jobs/view/987654321/", title: "Staff Engineer" },
    rawText: "Staff Engineer at Example Co · Remote · View job",
  });
  assert.equal(job.jobId, "https://www.linkedin.com/jobs/view/987654321");
  assert.equal(job.sourcePostId, "1234567890123");
  assert.equal(job.title, "Staff Engineer");
});

test("dedupeRecords merges longer text and engagement entities", () => {
  const merged = dedupeRecords([
    { postId: "1", text: "short", rawText: "short", comments: [], reactions: [] },
    { postId: "1", text: "a longer version", rawText: "a longer version", comments: [{ id: "c1" }], reactions: [{ id: "r1" }] },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].text, "a longer version");
  assert.deepEqual(merged[0].comments, [{ id: "c1" }]);
  assert.deepEqual(merged[0].reactions, [{ id: "r1" }]);
});

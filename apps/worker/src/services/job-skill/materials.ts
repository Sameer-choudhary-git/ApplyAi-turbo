import { createHash } from "node:crypto";
import { PassThrough } from "node:stream";
import * as archiverModule from "archiver";

const archiver = (archiverModule as any).default ?? archiverModule;
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import OpenAI from "openai";
import { uploadFileToR2 } from "@applyai/utils";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function listValue(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => typeof item === "string" ? item : stringValue(item?.skill)).filter(Boolean) : [];
}

function safeName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "job";
}

function buildResumeText(profile: any, opportunity: any, tailored: any | null): string {
  const name = stringValue(profile.fullName) || "Candidate";
  const skills = listValue(profile.skills);
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const summary = tailored?.resumeSummary || `Candidate with experience relevant to ${opportunity.title} at ${opportunity.company}.`;
  const lines = [name, stringValue(profile.location), stringValue(profile.linkedinUrl), "", "SUMMARY", summary, "", "SKILLS", skills.join(" · ") || "Not provided", "", "EXPERIENCE"];
  for (const item of experience) {
    lines.push(`${stringValue(item.role) || "Role"} — ${stringValue(item.company) || "Company"}`);
    if (stringValue(item.duration)) lines.push(stringValue(item.duration));
    if (stringValue(item.description)) lines.push(stringValue(item.description));
    lines.push("");
  }
  if (Array.isArray(profile.education) && profile.education.length) {
    lines.push("EDUCATION");
    for (const item of profile.education) lines.push(`${stringValue(item.degree) || "Degree"} — ${stringValue(item.institution) || "Institution"}${item.gpa ? ` (${item.gpa})` : ""}`);
  }
  return lines.join("\n");
}

function buildCoverLetterText(profile: any, opportunity: any, tailored: any | null): string {
  const name = stringValue(profile.fullName) || "Candidate";
  const skills = listValue(profile.skills).slice(0, 5).join(", ");
  return tailored?.coverLetter || `Hello ${opportunity.company} hiring team,\n\nI am interested in the ${opportunity.title} role. My background includes ${skills || "the skills described in my profile"}, and I would value the opportunity to apply that experience to your team.\n\nThe role's focus on ${opportunity.title} aligns with the work described in my experience. I have attached a resume tailored to the requirements in the posting and would welcome a conversation about the position.\n\nRegards,\n${name}`;
}

function docxBuffer(title: string, content: string): Promise<Buffer> {
  const paragraphs = content.split("\n").map((line) => new Paragraph({ text: line, spacing: { after: 100 } }));
  const document = new Document({ sections: [{ children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE }), ...paragraphs] }] });
  return Packer.toBuffer(document);
}

function zipBuffer(files: Array<{ name: string; buffer: Buffer }>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = new PassThrough();
    const chunks: Buffer[] = [];
    output.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    output.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    archive.pipe(output);
    for (const file of files) archive.append(file.buffer, { name: file.name });
    void archive.finalize();
  });
}

async function optionalTailoring(profile: any, opportunity: any): Promise<any | null> {
  const apiKey = process.env.JOB_SKILL_LLM_API_KEY;
  if (!apiKey) return null;
  const client = new OpenAI({ apiKey, baseURL: process.env.JOB_SKILL_LLM_BASE_URL || undefined });
  try {
    const response = await client.chat.completions.create({
      model: process.env.JOB_SKILL_LLM_MODEL || "gpt-5-mini",
      messages: [
        { role: "system", content: "You tailor job application materials using only facts in the candidate profile. Never invent skills, metrics, employers, dates, or achievements. Return JSON with resumeSummary and coverLetter strings only." },
        { role: "user", content: JSON.stringify({ profile, opportunity }) },
      ],
      max_completion_tokens: 2200,
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return { resumeSummary: stringValue(parsed.resumeSummary), coverLetter: stringValue(parsed.coverLetter) };
  } catch (error) {
    console.warn("Job Skill optional tailoring unavailable; using deterministic materials:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function generateMaterials(profile: any, opportunity: any): Promise<{ resume: Buffer; coverLetter: Buffer; zip: Buffer; resumeName: string; coverLetterName: string; zipName: string }> {
  const company = safeName(opportunity.company);
  const role = safeName(opportunity.title);
  const tailored = await optionalTailoring(profile, opportunity);
  const resumeName = `${company}_${role}_Resume.docx`;
  const coverLetterName = `${company}_${role}_CoverLetter.docx`;
  const resume = await docxBuffer(`${opportunity.title} — Resume`, buildResumeText(profile, opportunity, tailored));
  const coverLetter = await docxBuffer(`${opportunity.title} — Cover Letter`, buildCoverLetterText(profile, opportunity, tailored));
  const zipName = `${company}_${role}_Application_Materials.zip`;
  const zip = await zipBuffer([{ name: resumeName, buffer: resume }, { name: coverLetterName, buffer: coverLetter }]);
  return { resume, coverLetter, zip, resumeName, coverLetterName, zipName };
}

export function checksum(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function storeMaterial(buffer: Buffer, key: string, contentType: string): Promise<string> {
  return uploadFileToR2(buffer, key, contentType);
}

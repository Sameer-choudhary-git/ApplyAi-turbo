import { prisma } from "@applyai/db";
import { chromium, type Page } from "playwright";

type FieldInfo = {
  index: number;
  tag: string;
  type: string;
  name: string;
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
};

type DraftQuestion = {
  index: number;
  question: string;
  options: string[];
};

type DraftAnswer = {
  index: number;
  canAnswer: boolean;
  answer: string;
  confidence: number;
  reason: string;
};

type UserProfile = {
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  resumeUrl: string | null;
  skills: string[];
  education: Array<{
    institution: string;
    degree: string | null;
    fieldOfStudy: string | null;
    gpa: string | null;
  }>;
  experience: Array<{
    company: string;
    role: string | null;
    duration: string | null;
    description: string | null;
  }>;
};

const SENSITIVE_TERMS = [
  "authorization",
  "authorized to work",
  "work permit",
  "visa",
  "sponsor",
  "sponsorship",
  "immigration",
  "citizenship",
  "nationality",
  "gender",
  "race",
  "ethnicity",
  "veteran",
  "disability",
  "medical",
  "religion",
  "sexual orientation",
  "date of birth",
  "age",
  "criminal",
  "conviction",
  "terms",
  "privacy",
  "consent",
  "agree",
  "acknowledge",
  "demographic",
];

function normalized(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSensitive(question: string): boolean {
  const value = normalized(question);
  return SENSITIVE_TERMS.some((term) => value.includes(term));
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || fullName,
    last: parts.slice(1).join(" "),
  };
}

function fieldQuestion(field: FieldInfo): string {
  return [field.label, field.name, field.id, field.placeholder]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function fieldSelector(field: FieldInfo): string {
  if (field.id) return `#${CSS.escape(field.id)}`;
  if (field.name) return `[name=${JSON.stringify(field.name)}]`;
  return `form input, form textarea, form select`;
}

function directAnswer(field: FieldInfo, profile: UserProfile): string | null {
  const key = normalized(fieldQuestion(field));
  const name = splitName(profile.fullName);
  if (key.includes("first name") || key === "first") return name.first;
  if (key.includes("last name") || key === "last") return name.last;
  if (key.includes("full name") || key === "name") return profile.fullName;
  if (key.includes("email")) return profile.email;
  if (key.includes("phone") || key.includes("mobile")) return profile.phone;
  if (key.includes("linkedin")) return profile.linkedinUrl;
  if (key.includes("github")) return profile.githubUrl;
  if (key.includes("location") || key.includes("city")) return profile.location;
  if (key.includes("website") || key.includes("portfolio")) {
    return profile.githubUrl || profile.linkedinUrl;
  }
  if (key.includes("resume") || key.includes("cv")) return profile.resumeUrl;
  return null;
}

function optionMatch(value: string, options: string[]): string | null {
  const wanted = normalized(value);
  return (
    options.find((option) => normalized(option) === wanted) ??
    options.find((option) => normalized(option).includes(wanted)) ??
    null
  );
}

async function inspectFields(page: Page): Promise<FieldInfo[]> {
  const controls = page.locator(
    'form input:not([type="hidden"]), form textarea, form select',
  );
  const count = await controls.count();
  const fields: FieldInfo[] = [];
  for (let index = 0; index < count; index += 1) {
    const field = controls.nth(index);
    const info = await field.evaluate((element, currentIndex) => {
      const input = element as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement;
      const id = input.id || "";
      const associated = id
        ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
        : null;
      const parentLabel = input.closest("label");
      const label = associated?.textContent || parentLabel?.textContent || "";
      const options =
        input.tagName.toLowerCase() === "select"
          ? Array.from((input as HTMLSelectElement).options)
              .map((option) => option.textContent?.trim() || "")
              .filter(Boolean)
          : [];
      return {
        index: Number(currentIndex),
        tag: input.tagName.toLowerCase(),
        type: (input.getAttribute("type") || input.tagName).toLowerCase(),
        name: input.getAttribute("name") || "",
        id,
        label: label.replace(/\s+/g, " ").trim(),
        placeholder: input.getAttribute("placeholder") || "",
        required:
          input.required || input.getAttribute("aria-required") === "true",
        options,
      };
    }, index);
    fields.push(info);
  }
  return fields;
}

async function downloadResume(
  url: string,
  applicationId: string,
): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = url.toLowerCase().includes(".docx") ? ".docx" : ".pdf";
    const filePath = `${process.env.TEMP || process.env.TMP || "/tmp"}/applyai-${applicationId}-resume${extension}`;
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, buffer);
    return filePath;
  } catch {
    return null;
  }
}

function profileContext(
  profile: UserProfile,
  job: { title: string; company: string; descriptionText: string | null },
): string {
  return JSON.stringify({
    job: {
      title: job.title,
      company: job.company,
      description: job.descriptionText?.slice(0, 10_000) || "",
    },
    candidate: {
      bio: profile.bio,
      skills: profile.skills,
      education: profile.education,
      experience: profile.experience,
    },
  });
}

async function generateDraftAnswers(
  profile: UserProfile,
  job: { title: string; company: string; descriptionText: string | null },
  questions: DraftQuestion[],
): Promise<DraftAnswer[]> {
  const baseUrl = process.env.LLM_API_URL || process.env.OPENAI_API_BASE;
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!baseUrl || !apiKey || questions.length === 0) {
    return questions.map((question) => ({
      index: question.index,
      canAnswer: false,
      answer: "",
      confidence: 0,
      reason: "No configured answer-generation model is available",
    }));
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You draft truthful job-application answers from the supplied candidate profile. Never invent employers, dates, degrees, skills, work authorization, demographic facts, legal answers, compensation, or personal history. If the profile does not support an answer, return canAnswer=false. Keep answers concise and professional. Return JSON only as an array of {index,canAnswer,answer,confidence,reason}.",
          },
          {
            role: "user",
            content: `Candidate and job context: ${profileContext(profile, job)}\nQuestions: ${JSON.stringify(questions)}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "greenhouse_answer_drafts",
            strict: true,
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  canAnswer: { type: "boolean" },
                  answer: { type: "string" },
                  confidence: { type: "number" },
                  reason: { type: "string" },
                },
                required: [
                  "index",
                  "canAnswer",
                  "answer",
                  "confidence",
                  "reason",
                ],
                additionalProperties: false,
              },
            },
          },
        },
        max_completion_tokens: 2000,
      }),
    },
  );
  if (!response.ok)
    throw new Error(`Answer model failed with HTTP ${response.status}`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Answer model returned no content");
  const parsed = JSON.parse(content) as DraftAnswer[];
  return Array.isArray(parsed) ? parsed : [];
}

async function fillField(
  page: Page,
  field: FieldInfo,
  value: string,
): Promise<void> {
  const locator = page
    .locator('form input:not([type="hidden"]), form textarea, form select')
    .nth(field.index);
  if (field.tag === "select") {
    const option = optionMatch(value, field.options);
    if (option) await locator.selectOption({ label: option });
    return;
  }
  if (field.type === "radio" || field.type === "checkbox") {
    const normalizedValue = normalized(value);
    if (["true", "yes", "agree", "i agree"].includes(normalizedValue)) {
      await locator.check();
    }
    return;
  }
  await locator.fill(value);
}

export async function autofillGreenhouseApplication(
  userId: string,
  applicationId: string,
  options: { submit?: boolean } = {},
) {
  const application = await prisma.user_job_applications.findFirst({
    where: { id: applicationId, userId, platform: "greenhouse" },
  });
  if (!application) throw new Error("Greenhouse application not found");

  const metadata = (application.metadata || {}) as Record<string, unknown>;
  const greenhouseJobId = String(metadata.greenhouseJobId || "");
  const job = await prisma.greenhouse_jobs.findFirst({
    where: {
      greenhouseJobId,
      externalKey: application.externalJobKey || undefined,
    },
  });
  if (!job) throw new Error("Greenhouse job details are unavailable");

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { skills: true, education: true, experience: true },
  });
  if (!user) throw new Error("User profile not found");

  const profile: UserProfile = {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    linkedinUrl: user.linkedinUrl,
    githubUrl: user.githubUrl,
    resumeUrl: user.resumeUrl,
    skills: user.skills.map((item) => item.skill),
    education: user.education.map((item) => ({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.fieldOfStudy,
      gpa: item.gpa,
    })),
    experience: user.experience.map((item) => ({
      company: item.company,
      role: item.role,
      duration: item.duration,
      description: item.description,
    })),
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: "ApplyAI-Greenhouse/1.0" });
  const filled: Array<Record<string, unknown>> = [];
  const unresolved: Array<Record<string, unknown>> = [];
  let submitted = false;

  try {
    await page.goto(application.jobLink, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => undefined);
    const fields = await inspectFields(page);
    const draftQuestions: DraftQuestion[] = [];
    const resumePath = profile.resumeUrl
      ? await downloadResume(profile.resumeUrl, applicationId)
      : null;

    for (const field of fields) {
      const question = fieldQuestion(field);
      if (!question || field.type === "hidden") continue;
      if (isSensitive(question)) {
        if (field.required) {
          unresolved.push({
            field: question,
            required: true,
            reason: "Sensitive or legal answer requires the user",
          });
        }
        continue;
      }
      if (field.type === "file") {
        if (
          resumePath &&
          (normalized(question).includes("resume") ||
            normalized(question).includes("cv"))
        ) {
          await page
            .locator(
              'form input:not([type="hidden"]), form textarea, form select',
            )
            .nth(field.index)
            .setInputFiles(resumePath);
          filled.push({
            field: question,
            source: "verified_profile",
            value: "resume uploaded",
          });
        } else if (field.required) {
          unresolved.push({
            field: question,
            required: true,
            reason: "Required document is unavailable",
          });
        }
        continue;
      }
      const value = directAnswer(field, profile);
      if (value) {
        await fillField(page, field, value);
        filled.push({ field: question, source: "verified_profile", value });
      } else if (field.required) {
        draftQuestions.push({
          index: field.index,
          question,
          options: field.options,
        });
      }
    }

    let drafts: DraftAnswer[] = [];
    try {
      drafts = await generateDraftAnswers(profile, job, draftQuestions);
    } catch (error) {
      for (const question of draftQuestions) {
        unresolved.push({
          field: question.question,
          required: true,
          reason:
            error instanceof Error ? error.message : "Answer generation failed",
        });
      }
    }

    for (const question of draftQuestions) {
      const draft = drafts.find((item) => item.index === question.index);
      if (
        draft?.canAnswer &&
        draft.answer &&
        draft.confidence >= 0.75 &&
        !isSensitive(question.question)
      ) {
        await fillField(page, fields[question.index]!, draft.answer);
        filled.push({
          field: question.question,
          source: "ai_draft",
          value: draft.answer,
          confidence: draft.confidence,
        });
      } else {
        unresolved.push({
          field: question.question,
          required: true,
          options: question.options,
          reason: draft?.reason || "No truthful answer could be verified",
          suggestedAnswer: draft?.answer || null,
        });
      }
    }

    const actionRequired = unresolved.length > 0;
    const allowAutoSubmit =
      options.submit === true &&
      process.env.GREENHOUSE_AUTO_SUBMIT === "true" &&
      !actionRequired;
    if (allowAutoSubmit) {
      const submitButton = page
        .locator('button[type="submit"], input[type="submit"]')
        .first();
      if ((await submitButton.count()) > 0) {
        await submitButton.click();
        await page
          .waitForLoadState("networkidle", { timeout: 15_000 })
          .catch(() => undefined);
        submitted = true;
      }
    }

    const nextStatus = submitted
      ? "applied"
      : actionRequired
        ? "action_required"
        : "ready_to_submit";
    const nextMetadata = {
      ...metadata,
      greenhouseTag: "greenhouse",
      tags: ["greenhouse", ...(unresolved.length ? ["action_required"] : [])],
      autofill: {
        completedAt: new Date().toISOString(),
        fields: filled,
        unresolved,
        submitted,
        actionRequired,
      },
    };
    return prisma.user_job_applications.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
        statusUpdatedAt: new Date(),
        appliedAt: submitted ? new Date() : application.appliedAt,
        notes: actionRequired
          ? `Greenhouse form autofilled where possible. ${unresolved.length} required field(s) need user action.`
          : submitted
            ? "Greenhouse application submitted automatically after verified autofill."
            : "Greenhouse form autofilled and ready for final submission.",
        metadata: nextMetadata as any,
      },
    });
  } finally {
    await browser.close();
  }
}

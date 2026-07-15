import { chromium } from "playwright";
import { prisma } from "@applyai/db";

function parsePostedDate(value?: string): Date | null {
  if (!value) return null;

  const clean = value.replace(/^Posted\s+/i, "").trim();

  const date = new Date(clean);

  return isNaN(date.getTime()) ? null : date;
}

function parseDaysLeft(value?: string): number | null {
  if (!value) return null;

  const match = value.match(/\d+/);

  if (!match) return null;

  return Number(match[0]);
}

export async function validateByDate(jobs: any[]) {
  const now = new Date();

  for (const job of jobs) {
    const scrapedAt =
      job.scrapedAt instanceof Date ? job.scrapedAt : new Date(job.scrapedAt);
    const daysLeft = parseDaysLeft(job.daysLeft);

    if (isNaN(scrapedAt.getTime()) || daysLeft === null) {
      continue;
    }

    // ✅ expiry = scrapedAt + daysLeft (daysLeft is "days left" as of the
    // moment we scraped it, so the countdown starts from scrapedAt, not
    // from the posted date — postedDate has no bearing on the expiry math)
    const expiryDate = new Date(scrapedAt);

    expiryDate.setDate(scrapedAt.getDate() + daysLeft);

    const isActive = expiryDate >= now;

    await prisma.unstop_internships.update({
      where: {
        id: job.id,
      },
      data: {
        isActive,
        expiresAt: expiryDate,
      },
    });

    console.log(`${isActive ? "✅" : "❌"} ${job.title}`);
  }
}

async function validateByWeb(jobs: any[]) {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  for (const job of jobs) {
    try {
      await page.goto(job.link, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });

      await page.waitForTimeout(2000);

      const html = await page.content();

      let closed = false;

      if (
        html.includes("Registrations Closed") ||
        html.includes("Application Closed") ||
        html.includes("This opportunity is no longer accepting") ||
        html.includes("Page not found")
      ) {
        closed = true;
      }

      // apply button missing
      const applyBtn = page.locator("#un-register-btn").first();

      if (!(await applyBtn.isVisible())) {
        closed = true;
      }

      if (closed) {
        console.log(`❌ closed: ${job.title}`);

        await prisma.unstop_internships.update({
          where: {
            id: job.id,
          },
          data: {
            isActive: false,
            expiresAt: new Date(),
          },
        });
      } else {
        console.log(`✅ active: ${job.title}`);
      }
    } catch (err) {
      console.error(`validation failed ${job.title}`, err);
    }
  }

  await browser.close();
}

export async function validateUnstopInternships() {
  console.log("🔎 validating internships...");

  const jobs = await prisma.unstop_internships.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      scrapedAt: "asc",
    },
  });
  console.log(`Found ${jobs.length} active internships to validate`);

  await validateByDate(jobs);

  // await validateByWeb(jobs);
}
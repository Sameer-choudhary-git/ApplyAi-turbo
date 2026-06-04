import { chromium } from "playwright";
import { prisma } from "@applyai/db";
import type { ApplyAgentInput, ApplyResult } from "../../types/jobs";
import {makeInActive} from "../../../utils";

export async function unstopApplyAgent(
  input: ApplyAgentInput
): Promise<ApplyResult> {
  const { userId, cookie, preferences } = input;

  const results: ApplyResult["applications"] = [];

  const internships = await prisma.unstop_internships.findMany({
    where: {
      isActive: true,
    },
    take: 20,
  });
  console.log(`Found ${internships.length} active internships`);

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({storageState: JSON.parse(cookie)});
  // console.log("Adding cookie to context:", cookie);
  // const parsedStorageState = JSON.parse(cookie);

  // const cookiesArray = Array.isArray(parsedStorageState)
  //   ? parsedStorageState
  //   : (parsedStorageState.cookies || []);

  // if (cookiesArray.length === 0) {
  //   throw new Error("No cookies found in storage state");
  // }

  // await context.addCookies(cookiesArray);
  // how to log parsedStorageState in a readable way?
  // console.log("Parsed storage state:", JSON.stringify(parsedStorageState, null, 2));
  // const parsedStorageStateCookies = JSON.stringify(parsedStorageState.cookies, null, 2);
  // console.log(`Adding ${parsedStorageStateCookies} cookies to context`);

  const page = await context.newPage();

  for (const internship of internships) {
    try {
      const alreadyApplied =
        await prisma.user_job_applications.findFirst({
          where: {
            userId,
            jobLink: internship.link,
          },
        });

      if (alreadyApplied) {
        continue;
      }

      console.log(`Applying to: ${internship.title}`);

      await page.goto(internship.link, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      const applyBtn = page
        .locator("#un-register-btn")
        .first();


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

      if (!(await applyBtn.isVisible()) || closed) {
        results.push({
          title: internship.title,
          company: internship.company,
          link: internship.link,
          status: closed ? "CLOSED" : "BUTTON_NOT_FOUND",
        });
        if (closed) {
          await makeInActive(internship.id as string);
        }
        continue;
      }

      const text = await applyBtn.textContent();

      if (
        text?.toLowerCase().includes("applied") ||
        text?.toLowerCase().includes("registered")
      ) {
        results.push({
          title: internship.title,
          company: internship.company,
          link: internship.link,
          status: "ALREADY_APPLIED",
        });

        continue;
      }

      await applyBtn.click();

      await page.waitForTimeout(2500);

      // 🔥 eligibility
      const eligibilityText = page.locator("#s_menu", {
        hasText: "You are not eligible",
      });

      if (await eligibilityText.isVisible()) {
        results.push({
          title: internship.title,
          company: internship.company,
          link: internship.link,
          status: "NOT_ELIGIBLE",
        });

        continue;
      }

      // 🔥 checkbox
      const checkbox = page.locator("#acceptance-input");

      if (await checkbox.isVisible()) {
        await checkbox.evaluate((el: HTMLElement) => el.click());
      }

      // 🔥 submit
      const nextBtn = page.getByRole("button", {
        name: "Next",
      });

      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }

      await page.waitForTimeout(4000);

      console.log(`Successfully applied to: ${internship.title}`);

      results.push({
        title: internship.title,
        company: internship.company,
        link: internship.link,
        status: "APPLIED",
      });

    } catch (err) {
      console.error(err);

      results.push({
        title: internship.title,
        company: internship.company,
        link: internship.link,
        status: "ERROR",
        notes: String(err),
      });
    }
  }

  await browser.close();

  return {
    success: true,
    applications: results,
  };
}
import { chromium } from "playwright";
import { prisma } from "@applyai/db";
import type { ApplyAgentInput, ApplyResult } from "../../types/ApplyTypes";
import { makeInActive } from "../../utils";

export async function unstopApplyAgent(
  input: ApplyAgentInput,
): Promise<ApplyResult> {
  const { userId, cookie } = input;
  const results: ApplyResult["applications"] = [];

  console.log(`\n${"═".repeat(60)}`);
  console.log(`🚀 unstopApplyAgent started | userId: ${userId}`);
  console.log(`${"═".repeat(60)}`);

  const appliedLinks = (
    await prisma.user_job_applications.findMany({
      where: { userId },
      select: { jobLink: true },
    })
  ).map((x) => x.jobLink);

  const internships = await prisma.unstop_internships.findMany({
    where: {
      isActive: true,
      link: {
        notIn: appliedLinks,
      },
    },
    take: 20,
  });
  console.log(`📋 Found ${internships.length} active internships in DB`);

  console.log(`🌐 Launching Chromium...`);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: JSON.parse(cookie),
  });
  const page = await context.newPage();
  console.log(`✅ Browser context created`);

  // ─── Auth check ──────────────────────────────────────────────────────────
  console.log(`\n🔐 Checking session validity...`);
  console.log(`   → Navigating to https://unstop.com/auth/login`);
  await page.goto("https://unstop.com/auth/login", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.waitForTimeout(2000);

  const finalUrl = page.url();
  console.log(`   → Landed on: ${finalUrl}`);

  const isLoggedIn =
    finalUrl.startsWith("https://unstop.com") &&
    !finalUrl.includes("/auth/login");

  if (!isLoggedIn) {
    console.error(`❌ Session expired — still on login page`);
    console.log(`   → Deleting stale cookie from DB for userId: ${userId}`);
    await prisma.user_platform_sessions.deleteMany({
      where: { userId, platform: "unstop" },
    });
    console.log(`   ✅ Cookie deleted. Closing browser.`);
    await browser.close();
    return {
      success: false,
      error: "SESSION_EXPIRED",
      applications: [],
    };
  }
  console.log(`✅ Session valid — redirected to: ${finalUrl}`);

  // ─── Main loop ───────────────────────────────────────────────────────────
  for (const [index, internship] of internships.entries()) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(
      `[${index + 1}/${internships.length}] ${internship.title} @ ${internship.company}`,
    );
    console.log(`   🔗 ${internship.link}`);

    try {
      // ── Navigate ─────────────────────────────────────────────────────────
      console.log(`   🌐 Navigating to job page...`);
      await page.goto(internship.link, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);
      console.log(`   → Page loaded: ${page.url()}`);

      // ── Closed check ─────────────────────────────────────────────────────
      const html = await page.content();
      const closed =
        html.includes("Registrations Closed") ||
        html.includes("Application Closed") ||
        html.includes("This opportunity is no longer accepting") ||
        html.includes("Page not found");

      if (closed) {
        console.log(`   🚫 Opportunity is closed — marking inactive in DB`);
        await makeInActive(internship.id as string);
        continue;
      }

      // ── Apply button ──────────────────────────────────────────────────────
      const applyBtn = page.locator("#un-register-btn").first();
      const applyBtnVisible = await applyBtn.isVisible();
      console.log(`   🔘 Apply button visible: ${applyBtnVisible}`);

      if (!applyBtnVisible) {
        console.log(`   ⚠️  Apply button not found — skipping`);
        continue;
      }

      const btnText = await applyBtn.textContent();
      console.log(`   🔘 Apply button text: "${btnText?.trim()}"`);

      if (
        btnText?.toLowerCase().includes("applied") ||
        btnText?.toLowerCase().includes("registered")
      ) {
        console.log(`   ✅ Already applied on Unstop — recording status`);
        results.push({
          title: internship.title,
          company: internship.company,
          link: internship.link,
          status: "ALREADY_APPLIED",
          type: "internship",
          platform: "unstop",
        });
        continue;
      }

      // ── Click apply ───────────────────────────────────────────────────────
      console.log(`   🖱️  Clicking apply button...`);
      await applyBtn.click();
      await page.waitForTimeout(2500);
      console.log(`   → URL after click: ${page.url()}`);

      // ── Eligibility check — Pattern 1: inline banner ──────────────────────
      console.log(`   🎯 Checking eligibility (banner)...`);
      const eligibilityBanner = page.locator("#s_menu", {
        hasText: "You are not eligible",
      });
      const bannerVisible = await eligibilityBanner.isVisible();
      console.log(`   → Eligibility banner visible: ${bannerVisible}`);

      if (bannerVisible) {
        console.log(`   ⛔ Not eligible (banner) — skipping (no DB write)`);
        await page.keyboard.press("Escape");
        continue;
      }

      // ── Eligibility check — Pattern 2: un-lib-modal ───────────────────────
      console.log(`   🎯 Checking eligibility (modal)...`);
      const eligibilityModal = page.locator("un-lib-modal", {
        hasText: "You are not eligible",
      });
      const modalVisible = await eligibilityModal.isVisible();
      console.log(`   → Eligibility modal visible: ${modalVisible}`);

      if (modalVisible) {
        console.log(`   ⛔ Not eligible (modal) — clicking "Ok, I understand"`);
        const okSpan = page.locator("un-modal-footer span.un_btn", {
          hasText: "Ok, I understand",
        });
        const okSpanVisible = await okSpan.isVisible();
        console.log(`   → "Ok, I understand" span visible: ${okSpanVisible}`);
        if (okSpanVisible) {
          await okSpan.click();
          console.log(`   ✅ Modal dismissed cleanly`);
        } else {
          console.warn(`   ⚠️  Ok span not found — falling back to Escape`);
          await page.keyboard.press("Escape");
        }
        await page.waitForTimeout(500);
        continue; // no DB write
      }

      console.log(`   ✅ Eligible — proceeding with form`);

      // ── Disability radio ──────────────────────────────────────────────────
      console.log(`   ♿ Handling disability radio...`);
      const disabilityRadio = page.locator(
        'input[name="user_differently_abled"][value="0"]',
      );
      const disabilityRadioCount = await disabilityRadio.count();
      console.log(
        `   → Disability radio inputs found: ${disabilityRadioCount}`,
      );

      if (disabilityRadioCount > 0) {
        await disabilityRadio.evaluate((el: HTMLInputElement) => el.click());
        console.log(`   ✅ Disability radio clicked via evaluate()`);
      } else {
        console.log(`   → Trying label fallback for disability radio...`);
        const noLabel = page
          .locator("label", { hasText: /^No$/ })
          .filter({ has: page.locator('[name="user_differently_abled"]') })
          .first();
        const noLabelCount = await noLabel.count();
        console.log(`   → Fallback label found: ${noLabelCount > 0}`);
        if (noLabelCount > 0) {
          await noLabel.click();
          console.log(`   ✅ Disability label clicked`);
        } else {
          console.warn(`   ⚠️  Disability radio not found — proceeding anyway`);
        }
      }

      // ── Accept terms ──────────────────────────────────────────────────────
      console.log(`   📋 Handling terms checkbox...`);
      const checkbox = page.locator("#acceptance-input");
      const checkboxCount = await checkbox.count();
      console.log(`   → Checkbox found: ${checkboxCount > 0}`);

      if (checkboxCount > 0) {
        const isChecked = await checkbox.isChecked();
        console.log(`   → Already checked: ${isChecked}`);

        if (!isChecked) {
          // Click the <label> — Angular listens on label, not raw input
          const label = page.locator('label[for="acceptance-input"]');
          await label.click();
          console.log(`   ✅ Terms accepted via label click`);

          const nowChecked = await checkbox.isChecked();
          console.log(`   → Checkbox state after click: ${nowChecked}`);

          if (!nowChecked) {
            // Hard fallback: dispatch all events Angular needs
            await checkbox.evaluate((el: HTMLInputElement) => {
              el.checked = true;
              ["input", "change", "click"].forEach((event) =>
                el.dispatchEvent(new Event(event, { bubbles: true })),
              );
            });
            console.warn(`   ⚠️  Used JS fallback to force-check`);
          }
        } else {
          console.log(`   ✅ Checkbox already checked — skipping`);
        }
      } else {
        console.warn(`   ⚠️  Terms checkbox not found — proceeding anyway`);
      }

      // ── Click Next ────────────────────────────────────────────────────────
      console.log(`   🖱️  Looking for Next button...`);
      const nextBtn = page.getByRole("button", { name: "Next" });
      const nextBtnVisible = await nextBtn.isVisible();
      console.log(`   → Next button visible: ${nextBtnVisible}`);

      if (nextBtnVisible) {
        await nextBtn.click();
        console.log(`   ✅ Next button clicked`);
      } else {
        console.warn(`   ⚠️  Next button not visible — skipping click`);
      }

      await page.waitForTimeout(4000);
      const currentUrl = page.url().replace(/\/$/, "");
      const targetUrl = internship.link.replace(/\/$/, "");
      console.log(`   → Current URL : ${currentUrl}`);
      console.log(`   → Target URL  : ${targetUrl}`);

      // ── Multi-step or done ────────────────────────────────────────────────
      const isBackOnJobPage = currentUrl === targetUrl;
      const isSuccessPage = currentUrl.includes("/success");
      console.log(`   → Back on job page: ${isBackOnJobPage}`);
      console.log(`   → Success page: ${isSuccessPage}`);

      if (isBackOnJobPage || isSuccessPage) {
        console.log(
          `   ✅ Application successful — ${
            isSuccessPage ? "success page" : "redirected back to job page"
          }`,
        );

        console.log(`   💾 Saved to DB with status: APPLIED`);
        results.push({
          platform: "unstop",
          title: internship.title,
          company: internship.company,
          link: internship.link,
          status: "APPLIED",
          type: "internship",
        });
      } else {
        console.warn(`   ⚠️  Neither job page nor success — action required`);
        console.log(`   💾 Saved to DB with status: ACTION_REQUIRED`);
        results.push({
          platform: "unstop",
          title: internship.title,
          company: internship.company,
          link: internship.link,
          status: "ACTION_REQUIRED",
          notes: `Multi-step form, stopped at: ${currentUrl}`,
          type: "internship",
        });
      }
    } catch (err) {
      console.error(`   ❌ ERROR on "${internship.title}"`);
      console.error(`   → ${String(err)}`);
      if (err instanceof Error && err.stack) {
        console.error(`   Stack: ${err.stack}`);
      }
      results.push({
        title: internship.title,
        company: internship.company,
        link: internship.link,
        status: "ERROR",
        notes: String(err),
        type: "internship",
        platform: "unstop",
      });
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 Run complete — Summary:`);
  const summary = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  Object.entries(summary).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  console.log(`${"═".repeat(60)}\n`);

  await browser.close();
  console.log(`🌐 Browser closed. Agent done.`);
  return { success: true, applications: results };
}

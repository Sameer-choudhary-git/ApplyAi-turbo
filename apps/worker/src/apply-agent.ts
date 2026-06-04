import { chromium, Browser, Page, Locator } from "playwright";
import fs, { stat } from "fs";
import readline from "readline";

const USER_PROFILE = {
  FirstName: "Sameer",
  LastName: "Choudhary",
  Gender: "Male",
  Location: "North East Delhi",
  LocationFallback: "Delhi",
  Institute: "Delhi Technological University",
  Domain: "Engineering",
  Course: "B.Tech",
  Specialization: "Computer Science",
  GraduationYear: "2027",
  CourseDuration: "4 Years",
  UserType: "College Students",
  DifferentlyAbled: "No",
};

const INPUT_FILE = "internships.json";
const OUTPUT_FILE = "application_status.json";

const SELECTORS = {
  applyButton:
    '#un-register-btn, .register_btn, div[aria-label="Quick Apply"], button:has-text("Apply")',
  eligibilityHeader: "mat-dialog-container h2",
  formContainer: "app-player-registration-form, form",
  inputs: {
    firstName: "#player_firstname",
    lastName: "#player_name_last",
    email: "#player_email",
    mobile: "#player_mobile input",
    location: '#cities_input, input[name="player_location"]',
    institute: 'input[id*="organisation_select_input"]',
  },
  radios: {
    gender: 'input[name="user_gender"]',
    diffAbled: 'input[name="user_differently_abled"]',
    userType: 'input[name="user_type"]',
  },
  dropdownOptions: '.mat-option, .search-list-item, li[role="option"]',
  checkbox: 'input[name="acceptance"]',
  submitButton:
    'button:has-text("Next"), button:has-text("Submit"), button:has-text("Register")',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const askUser = (query: string) =>
  new Promise<string>((resolve) => rl.question(query, resolve));

async function runApplyAgent() {
  if (!fs.existsSync(INPUT_FILE) || !fs.existsSync("auth.json")) {
    console.error("❌ Missing input files.");
    process.exit(1);
  }

  const rawData = fs.readFileSync(INPUT_FILE, "utf-8");
  const targetInternships = JSON.parse(rawData).slice(0, 15);
  const results: any[] = [];

  const browser: Browser = await chromium.launch({
    headless: true,
    slowMo: 50,
  });
  const context = await browser.newContext({ storageState: "auth.json" });
  const page: Page = await context.newPage();

  console.log(`🤖 Agent V6 (Eligibility Skip Mode) Started...`);

  for (const [index, job] of targetInternships.entries()) {
    console.log(`\n==================================================`);
    console.log(`[${index + 1}] Visiting: ${job.title}`);

    let status = "Skipped";
    let notes = "";

    try {
      await page.goto(job.link, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);

      const applyBtn = page
        .locator("#un-register-btn", { hasText: /Quick Apply/i })
        .first();

      if (await applyBtn.isVisible()) {
        const btnText = (await applyBtn.textContent())?.toLowerCase();

        if (btnText?.includes("applied") || btnText?.includes("registered")) {
          console.log("   ⚠️  Already Applied.");
          status = "Already Applied";
        } else {
          console.log("   🖱️  Clicking Apply...");
          await applyBtn.click({ force: true });
          await page.waitForTimeout(2500);

          
          const eligibilityMessage = await page.locator("#s_menu", {
            hasText: "You are not eligible",
          });

          if (await eligibilityMessage.isVisible()) {
            console.log("   ⛔ Eligibility issue detected.");
            console.log("   ⏭️  Cancelling application for this internship.");
            status = "Skipped - Not Eligible";
            notes = "Eligibility issue detected.";
            await page.keyboard.press("Escape");
          } else {
            if(await handleGraduationYearEligibility(page)) {
              const formResult = await fillRegistrationForm(page, job.link);
              status = formResult.status;
              notes = formResult.notes;
            } else {
              console.log("⚠️ Some sort of issue with Graduation Year eligibility.");
              status = "Skipped - Graduation Year Eligibility Uncertain";
              notes = "Graduation Year eligibility uncertain, manual review needed.";
              await page.keyboard.press("Escape");
            }
          }
        }
      } else {
        console.log("   ❌ Apply button not found.");
        status = "Button Not Found";
      }
    } catch (e) {
      console.error(`   ❌ Error:`, e);
      status = "Error";
      notes = String(e);
    }

    results.push({ job: job.title, company: job.company, status, notes });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  }

  console.log(`\n✅ Done. Results saved to ${OUTPUT_FILE}`);
  await browser.close();
  process.exit(0);
}

async function handleGraduationYearEligibility(page: Page) {
  console.log("   🎓 Checking Graduation Year Eligibility (2027)...");
  const yearOption = page.locator("label", { hasText: "2027" }).first();

  if (await yearOption.isVisible({ timeout: 2000 })) {
    try {
      await yearOption.click();
      console.log("      ✅ Success: Selected 2027.");
      return true;
    } catch (e) {
      console.log("      ⚠️ Found '2027' option but failed to click.");
    }
  } else {
    console.log("      ℹ️ '2027' option not found. Skipping.");
  }
  return false;
}

async function fillRegistrationForm(page: Page, jobUrl: string) {
  if ((await page.locator(SELECTORS.formContainer).count()) === 0) {
    if (!page.url().includes("unstop.com"))
      return { status: "External Link", notes: page.url() };
    return { status: "Error", notes: "No form found." };
  }

  console.log("   📝 Filling Form...");

  await handleLocation(page, USER_PROFILE.LocationFallback, "India");

  await page.locator('label[for="un-radio-3-input"]').click();
  await page
    .locator("#acceptance-input")
    .evaluate((el: HTMLElement) => el.click());
  console.log("   🖱️  Clicking Next/Submit...");
  await page.getByRole("button", { name: "Next" }).click();

  console.log("   ⏳ Waiting for navigation...");
  await page.waitForTimeout(4000);

  const currentUrl = page.url();
  const cleanCurrent = currentUrl.replace(/\/$/, "");
  const cleanTarget = jobUrl.replace(/\/$/, "");

  if (cleanCurrent === cleanTarget) {
    console.log("   ✅ Success: Redirected back to Job Page.");
    return { status: "Applied", notes: "Form submitted successfully." };
  } else {
    console.log(`   ⚠️  Still on form or next step. URL: ${currentUrl}`);
    // screenshot for evidence
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `manual_review_${timestamp}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`   📸 Screenshot saved: ${filename}`);
    return {
      status: "Manual Review Required",
      notes: `Did not redirect to job page.`,
    };
  }
}

async function handleLocation(
  page: Page,
  city: string,
  country: string = "India",
) {
  console.log("   📍 Checking Location Field Type...");

  const textInput = page.locator("#cities_input");
  const selectDropdown = page.locator("#player-location");

  if (await textInput.isVisible()) {
    console.log("      👉 Detected: Standard Text Input");

    if ((await textInput.inputValue()) === "") {
      await textInput.click();
      await textInput.pressSequentially(city, { delay: 100 });

      try {
        await page.waitForSelector(".un_dropdown_item", {
          state: "visible",
          timeout: 3000,
        });
        await page.locator(".un_dropdown_item").first().click();
      } catch (e) {
        console.log("      ⚠️ No suggestions appeared, leaving text as is.");
      }
    } else {
      console.log("      ✅ Location already filled.");
    }
  } else if (await selectDropdown.isVisible()) {
    console.log("      👉 Detected: Dropdown (Arrow)");

    await selectDropdown.click();
    await page.waitForSelector("mat-option", { state: "visible" });

    const countryOption = page
      .locator("mat-option")
      .filter({ hasText: country })
      .first();
    const cityOption = page
      .locator("mat-option")
      .filter({ hasText: city })
      .first();

    if (await cityOption.isVisible()) {
      console.log(`      ✅ Selecting City: ${city}`);
      await cityOption.click();
    } else if (await countryOption.isVisible()) {
      console.log(`      ✅ City not found, selecting Country: ${country}`);
      await countryOption.click();
    } else {
      console.log(
        "      ⚠️ Exact match not found. Selecting first available option.",
      );
      await page.locator("mat-option").first().click();
    }
  } else {
    console.log("      ⚠️ No recognized location input found (Skipping).");
  }
}

async function fillInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector).first();
  if (
    (await input.isVisible()) &&
    (await input.isEnabled()) &&
    (await input.inputValue()) === ""
  ) {
    await input.fill(value);
    console.log(`      Filled ${value}`);
  }
}

async function selectRadio(
  page: Page,
  nameSelector: string,
  valueCode: string,
) {
  const radio = page.locator(`${nameSelector}[value="${valueCode}"]`);
  if ((await radio.count()) > 0)
    await radio.evaluate((el: HTMLElement) => el.click());
}

async function handleSearchDropdown(
  page: Page,
  selector: string,
  value: string,
  fallback: string,
  label: string,
) {
  const input = page.locator(selector).first();
  if (!(await input.isVisible()) || (await input.isDisabled())) return;
  if ((await input.inputValue()).length > 2) return;

  console.log(`   🔻 Searching ${label}: "${value}"`);
  await input.click({ force: true });
  await input.fill(value);
  await page.waitForTimeout(2000);

  const options = page.locator(SELECTORS.dropdownOptions);
  if ((await options.getByText(value, { exact: true }).count()) > 0) {
    await options.getByText(value, { exact: true }).first().click();
  } else if (fallback && (await options.getByText(fallback).count()) > 0) {
    await options.getByText(fallback).first().click();
  }
}

runApplyAgent();
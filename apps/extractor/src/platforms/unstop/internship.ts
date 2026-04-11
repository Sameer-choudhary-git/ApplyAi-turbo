import { Extractor } from "../../core/types";
import { chromium, Browser, Page } from "playwright";
import * as fs from "node:fs";

const TARGET_URL =
  "https://unstop.com/internships?quickApply=true&datePosted=1&oppstatus=open";
const DATA_FILE = "internships.json";

const SELECTORS = {
  card: "app-competition-listing a.item",
  title: ".cptn h3",
  company: ".cptn > p",
  otherFields: ".other_fields",
  skills: ".center-bullet .left-tags",
  tags: ".skill_list un-chip",
  stipend: ".cash_container",
  footerDates: ".dates-fields",
  nextButton: 'li.right-arrow:not(.disabled) img[alt="Angle right icon"]',
};

interface Internship {
  title: string;
  company: string;
  link: string;
  experience: string;
  type: string;
  location: string;
  skills: string[];
  tags: string[];
  stipend: string;
  postedDate: string;
  daysLeft: string;
}

export const unstopInternships: Extractor = {
  platform: "unstop",
  category: "internships",

  async run() {
    let allInternships: Internship[] = [];

    // ✅ Fresh incognito browser — no auth needed
    const browser: Browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      // No storageState = fresh incognito session
    });
    const page: Page = await context.newPage();

    // ✅ Fix: stub out __name that esbuild/tsx injects into serialized functions
    await page.addInitScript(function () {
      (window as any).__name = function (fn: any) { return fn; };
    });

    let currentPage = 1;

    try {
      console.log("--- Scraper Started (Incognito) ---");
      await page.goto(TARGET_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      console.log(`✅ Navigated to ${TARGET_URL}`);

      while (true) {
        console.log(`\n📄 Scraping Page ${currentPage}...`);

        try {
          await page.waitForSelector(SELECTORS.card, { timeout: 10000 });
        } catch (e) {
          console.log("   🛑 No cards found (End of results).");
          break;
        }

        const pageData = await page.evaluate(function (sel) {
          const cards = document.querySelectorAll(sel.card);
          const results: any[] = [];

          cards.forEach(function (card) {
            const anchor = card as HTMLAnchorElement;

            const getText = function (selector: string) {
              return anchor.querySelector(selector)?.textContent?.trim() || "";
            };

            const title = getText(sel.title) || "Unknown Title";
            const company = getText(sel.company) || "Unknown Company";
            const stipend =
              getText(sel.stipend).replace(/\s+/g, " ") || "Not Disclosed";

            const skills = Array.from(
              anchor.querySelectorAll(`${sel.skills} span`),
            ).map(function (s) {
              return s.textContent?.trim() || "";
            }).filter(function (s) {
              return Boolean(s);
            });

            const tags = Array.from(
              anchor.querySelectorAll(`${sel.tags} .chip_text`),
            ).map(function (t) {
              return t.textContent?.trim() || "";
            }).filter(function (t) {
              return Boolean(t);
            });

            let experience = "";
            let type = "";
            let location = "";

            const metaDivs = anchor.querySelectorAll(`${sel.otherFields} > div`);
            metaDivs.forEach(function (div) {
              const text = div.textContent?.trim() || "";
              const img = div.querySelector("img");
              const iconSrc = img?.src || "";

              if (text.includes("experience") || iconSrc.includes("job"))
                experience = text;
              else if (text.includes("Time") || iconSrc.includes("schedule"))
                type = text;
              else if (
                iconSrc.includes("location") ||
                text.includes("Office") ||
                text.includes("Remote") ||
                text.includes("Hybrid")
              )
                location = text;
            });

            let postedDate = "";
            let daysLeft = "";
            const dateLabels = anchor.querySelectorAll(`${sel.footerDates} .tag-text`);
            dateLabels.forEach(function (lbl) {
              const txt = lbl.textContent?.trim() || "";
              if (txt.includes("Posted")) postedDate = txt;
              else if (txt.includes("left") || txt.includes("End")) daysLeft = txt;
            });

            results.push({
              title,
              company,
              link: anchor.href,
              stipend,
              experience,
              type,
              location,
              skills,
              tags,
              postedDate,
              daysLeft,
            });
          });

          return results;
        }, SELECTORS);

        console.log(`   ✅ Found ${pageData.length} internships.`);
        allInternships = allInternships.concat(pageData);

        const nextBtn = page.locator(SELECTORS.nextButton);

        if ((await nextBtn.count()) > 0 && (await nextBtn.first().isVisible())) {
          console.log("   ➡️ Clicking Next Page...");
          await nextBtn.first().click();
          await page.waitForTimeout(5000);
          currentPage++;
        } else {
          console.log("   🛑 Next button hidden or disabled. Finished.");
          break;
        }
      }

      console.log(`\n💾 Saving ${allInternships.length} internships to ${DATA_FILE}...`);
      fs.writeFileSync(DATA_FILE, JSON.stringify(allInternships, null, 2));
      console.log("✅ Done! Check internships.json");
    } catch (error) {
      console.error("Agent Error:", error);
    } finally {
      await browser.close();
    }

    return allInternships;
  },
};
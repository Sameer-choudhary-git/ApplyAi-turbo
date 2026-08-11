const lighthouse = require("lighthouse");
const { chromium } = require("playwright");

async function run() {
  const url = process.argv[2];

  if (!url) {
    console.error("Usage: node lighthouse.js <url>");
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "networkidle",
  });

  console.log(`Testing: ${url}`);

  await browser.close();

  const result = await lighthouse(url, {
    output: "html",
    onlyCategories: [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
    ],
  });

  console.log("Lighthouse test completed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
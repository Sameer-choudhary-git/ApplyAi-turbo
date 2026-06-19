// login-linkedin.js

const { chromium } = require("playwright");

(async () => {

    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext();

    const page = await context.newPage();

    await page.goto(
        "https://www.linkedin.com/login"
    );

    console.log(
        "Login manually."
    );

    console.log(
        "After feed loads, press ENTER in terminal."
    );

    process.stdin.once(
        "data",
        async () => {

            await context.storageState({
                path: "linkedin-session.json"
            });

            console.log(
                "Session saved."
            );

            await browser.close();
        }
    );

})();
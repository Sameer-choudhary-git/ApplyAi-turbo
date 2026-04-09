import { chromium, firefox } from 'playwright';

async function globalSetup() {
    const browser = await firefox.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://unstop.com/login');
    try {
        await page.waitForURL('**/dashboard**', { timeout: 190000 });
        console.log('Login detected!');
        await context.storageState({ path: 'auth.json' });
        console.log('✅ Success! Session saved to auth.json');
    } catch (e) {
        console.error('❌ Timeout: You took too long to log in.');
    }
    await browser.close();
}

globalSetup();
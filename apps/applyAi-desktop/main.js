require('dotenv').config();
const { app, dialog } = require('electron');
const { firefox } = require('playwright');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

// Read from process.env first (dev), fall back to package.json extraMetadata (prod build)
const pkg = require('./package.json');
const ENV = pkg.env || {};

const API_ENDPOINT = process.env.API_ENDPOINT || ENV.API_ENDPOINT || 'http://localhost:3000/api/sessions/unstop/submit';
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || ENV.ENCRYPTION_KEY;

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('engibuddy', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('engibuddy');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    const url = commandLine.find(arg => arg.startsWith('engibuddy://'));
    if (url) handleDeepLink(url);
  });

  app.whenReady().then(() => {
    // ✅ Now dialog is safe to use
    if (!ENCRYPTION_KEY_HEX) {
      dialog.showErrorBox('Config Error', 'ENCRYPTION_KEY env var is missing. Cannot start.');
      app.quit();
      return;
    }

    const url = process.argv.find(arg => arg.startsWith('engibuddy://'));
    if (url) {
      handleDeepLink(url);
    } else {
      app.quit();
    }
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
}

async function handleDeepLink(urlStr) {
  try {
    const url = new URL(urlStr);
    const token = url.searchParams.get('token');
    if (!token) throw new Error('No setup token found in the URL.');
    await runUnstopLoginFlow(token);
  } catch (error) {
    dialog.showErrorBox('EngiBuddy Setup Error', error.message);
    app.quit();
  }
}

async function runUnstopLoginFlow(token) {
  let browser;
  try {
    browser = await firefox.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://unstop.com/auth/login');
    await page.waitForURL('**/dashboard/**', { timeout: 300_000 });

    const storageState = await context.storageState();
    const encryptedCookie = encryptData(storageState);

    await axios.post(API_ENDPOINT, {
      setupToken: token,
      encryptedCookie,
    });

    await dialog.showMessageBox({
      type: 'info',
      title: 'Success',
      message: 'Unstop session linked! You can close this window.',
    });
  } catch (error) {
    dialog.showErrorBox('Authentication Failed', `Failed to link account: ${error.message}`);
  } finally {
    if (browser) await browser.close();
    app.quit();
  }
}

function encryptData(data) {
  const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}
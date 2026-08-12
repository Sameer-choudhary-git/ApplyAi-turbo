require('dotenv').config();
const { app, dialog } = require('electron');
const { firefox } = require('playwright');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

// Import Sentry for Node.js
let Sentry = null;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  console.log('ℹ️  Sentry not installed, error tracking disabled');
}

// Read from process.env first (dev), fall back to package.json extraMetadata (prod build)
const pkg = require('./package.json');
const ENV = pkg.env || {};

const API_ENDPOINT = process.env.API_ENDPOINT || ENV.API_ENDPOINT;
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || ENV.ENCRYPTION_KEY;
const SENTRY_DSN = process.env.SENTRY_DSN || ENV.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Sentry if DSN is available
if (Sentry && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    debug: NODE_ENV === 'development',
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  console.log(`✅ Sentry initialized for Desktop (${NODE_ENV})`);
} else {
  console.warn('⚠️  Sentry DSN not configured - error reporting disabled');
}

// Capture uncaught exceptions
if (Sentry) {
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    Sentry.captureException(error, {
      tags: {
        error_type: 'uncaught_exception',
        service: 'desktop',
      },
    });
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    Sentry.captureException(reason, {
      tags: {
        error_type: 'unhandled_rejection',
        service: 'desktop',
      },
    });
  });
}

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
    if (!API_ENDPOINT || !ENCRYPTION_KEY_HEX) {
      const errorMsg = 'API_ENDPOINT and ENCRYPTION_KEY configuration values are required. Cannot start.';
      console.error('❌ ' + errorMsg);
      
      if (Sentry) {
        Sentry.captureMessage(errorMsg, 'error');
      }
      
      dialog.showErrorBox('Config Error', errorMsg);
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

  // Graceful shutdown
  app.on('before-quit', async () => {
    if (Sentry) {
      await Sentry.close(2000);
    }
  });
}

async function handleDeepLink(urlStr) {
  try {
    const url = new URL(urlStr);
    const token = url.searchParams.get('token');
    if (!token) throw new Error('No setup token found in the URL.');
    
    if (Sentry) {
      Sentry.setTag('flow', 'unstop_setup');
      Sentry.addBreadcrumb({
        message: 'Starting Unstop setup flow',
        level: 'info',
        data: { token_length: token.length },
      });
    }
    
    await runUnstopLoginFlow(token);
  } catch (error) {
    console.error('❌ Deep link error:', error);
    
    if (Sentry) {
      Sentry.captureException(error, {
        tags: {
          flow: 'deep_link_handling',
        },
      });
    }
    
    dialog.showErrorBox('EngiBuddy Setup Error', error.message);
    app.quit();
  }
}

async function runUnstopLoginFlow(token) {
  let browser;
  let startTime = Date.now();
  
  try {
    if (Sentry) {
      Sentry.addBreadcrumb({
        message: 'Starting Firefox browser',
        level: 'info',
        category: 'browser',
      });
    }
    
    browser = await firefox.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://unstop.com/auth/login');
    
    if (Sentry) {
      Sentry.addBreadcrumb({
        message: 'Navigated to Unstop login',
        level: 'info',
        category: 'browser',
      });
    }
    
    await page.waitForURL('**/dashboard/**', { timeout: 300_000 });

    if (Sentry) {
      Sentry.addBreadcrumb({
        message: 'Successfully logged in',
        level: 'info',
        category: 'browser',
      });
    }

    const storageState = await context.storageState();
    const encryptedCookie = encryptData(storageState);

    if (Sentry) {
      Sentry.addBreadcrumb({
        message: 'Encrypted session data',
        level: 'info',
        category: 'encryption',
      });
    }

    // Send to API
    const duration = Date.now() - startTime;
    await axios.post(API_ENDPOINT, {
      setupToken: token,
      encryptedCookie,
    });

    if (Sentry) {
      Sentry.addBreadcrumb({
        message: 'Session data sent to API',
        level: 'info',
        category: 'api',
        data: { duration_ms: duration },
      });
    }

    await dialog.showMessageBox({
      type: 'info',
      title: 'Success',
      message: 'Unstop session linked! You can close this window.',
    });
    
    console.log('✅ Unstop setup completed successfully');
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = `Failed to link account: ${error.message}`;
    
    console.error('❌ ' + errorMsg);

    if (Sentry) {
      Sentry.captureException(error, {
        tags: {
          flow: 'unstop_login',
          duration_ms: duration,
        },
        contexts: {
          flow_context: {
            duration_ms: duration,
            step: 'browser_automation',
          },
        },
      });
    }

    dialog.showErrorBox('Authentication Failed', errorMsg);
  } finally {
    if (browser) {
      await browser.close();
      if (Sentry) {
        Sentry.addBreadcrumb({
          message: 'Browser closed',
          level: 'info',
          category: 'browser',
        });
      }
    }
    app.quit();
  }
}

function encryptData(data) {
  try {
    const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    
    if (Sentry) {
      Sentry.captureException(error, {
        tags: {
          operation: 'encryption',
        },
      });
    }
    
    throw new Error('Failed to encrypt session data');
  }
}

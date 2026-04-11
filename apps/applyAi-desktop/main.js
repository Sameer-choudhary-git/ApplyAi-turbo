require('dotenv').config();
const { app, dialog } = require('electron');
const { firefox } = require('playwright');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

// Configuration
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:3000/api/sessions/unstop/submit';
// AES-256-GCM requires a 32-byte key. In production, securely provide this via env vars.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : crypto.randomBytes(32); 

// Ensure this app is the default handler for engibuddy://
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
    // Catch the deep link when the app is already open (Windows/Linux)
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        const url = commandLine.find(arg => arg.startsWith('engibuddy://'));
        if (url) handleDeepLink(url);
    });

    app.whenReady().then(() => {
        // Catch the deep link if it was the first instance opened (Windows)
        const url = process.argv.find(arg => arg.startsWith('engibuddy://'));
        if (url) handleDeepLink(url);
    });

    // Catch deep link on macOS
    app.on('open-url', (event, url) => {
        event.preventDefault();
        handleDeepLink(url);
    });
}

async function handleDeepLink(urlStr) {
    try {
        const url = new URL(urlStr);
        const token = url.searchParams.get('token');
        
        if (!token) {
            throw new Error('No setup token found in the URL.');
        }

        await runUnstopLoginFlow(token);
    } catch (error) {
        dialog.showErrorBox('EngiBuddy Setup Error', error.message);
        app.quit();
    }
}

async function runUnstopLoginFlow(token) {
    let browser;
    try {
        // Launch local Firefox visible to the user
        browser = await firefox.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Navigate to Unstop login
        await page.goto('https://unstop.com/auth/login');

        // Wait for the user to successfully log in.
        // Adjust this selector or URL based on Unstop's actual post-login state.
        // E.g., waiting for the dashboard URL or a specific logged-in element.
        await page.waitForURL('**/dashboard/**', { timeout: 300000 }); // 5 minutes to log in

        // Capture Cookies / Storage State
        const storageState = await context.storageState();
        
        // Encrypt the state (AES-256-GCM)
        const encryptedPayload = encryptData(storageState);

        // Send back to your Hono server
        await axios.post(API_ENDPOINT, {
            setupToken: token,
            encryptedCookie: encryptedPayload
        });

        dialog.showMessageBox({
            type: 'info',
            title: 'Success',
            message: 'Unstop session successfully linked! You can close this window.'
        });

    } catch (error) {
        dialog.showErrorBox('Authentication Failed', `Failed to link account: ${error.message}`);
    } finally {
        if (browser) await browser.close();
        app.quit();
    }
}

function encryptData(data) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag
    };
}
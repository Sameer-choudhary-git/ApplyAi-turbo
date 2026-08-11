# ApplyAI Networking Assistant

Manifest V3 Chrome extension that captures the current LinkedIn profile and saves it directly into the ApplyAI networking backend.

## Features

- Reads the active LinkedIn profile page
- Prefills a contact draft
- Imports the current ApplyAI Supabase session token from the open web app tab
- Posts directly to `POST /api/networking`

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `D:\Shinchan\Coding\ApplyAi-turbo\apps\chrome-extension`.

## Use

1. Open the ApplyAI web app in one tab and log in.
2. Open the extension popup on that tab.
3. Click **Import from this tab** to store your session token.
4. Open a LinkedIn profile page.
5. Click **Capture profile**.
6. Click **Save to networking**.

## Notes

- The backend URL is editable in the popup.
- The token is stored locally in Chrome extension storage.
- LinkedIn extraction relies on visible page content and standard profile selectors.
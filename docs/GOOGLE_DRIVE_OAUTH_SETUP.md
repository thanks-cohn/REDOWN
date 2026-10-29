# Google Drive OAuth: REDOWN Chrome extension

## Publisher setup (once)

1. Open `chrome://extensions` and copy REDOWN's 32-character Extension ID. The extension manifest already contains a stable public key. Use the **actual ID of the extension users will install**.
2. In https://console.cloud.google.com/ select or create a project and enable **Google Drive API**.
3. Open Google Auth Platform > **Branding**, **Audience**, **Data Access**. Use an External audience for public customers, add yourself under **Test users** while the project is in Testing, and declare ONLY `https://www.googleapis.com/auth/drive.file`.
4. Google Auth Platform > **Clients** > Create Client > **Chrome Extension**. Enter your REDOWN Extension ID in **Item ID**. Copy the resulting **OAuth Client ID** ending in `.apps.googleusercontent.com`.
5. In `extension/manifest.json`, replace `REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com` with the real Client ID and reload REDOWN through `chrome://extensions`.
6. Open Shelf > Google Drive > **LOGIN!** > select account > approve access. REDOWN checks Google's Drive `about.get` before displaying **Connected**.

**No OAuth client secret** is required. Never commit passwords, access tokens, or refresh tokens. The OAuth Client ID itself is public.

## What is implemented

- Minimal `drive.file` scope; user approves file-limited access, not their entire Drive.
- Chrome Identity interactive consent starts ONLY when LOGIN! is clicked.
- Google Drive `about.get` verifies the token and account after consent.
- On Shelf reopen, noninteractive token checks avoid unsolicited consent windows.
- A 401 removes the stale token from Chrome's cache and retries once.
- Only display metadata is saved in `googleDriveConnection`, **not** access tokens.
- Chrome handles token caching/refresh. Future background uploads must request tokens noninteractively.

## Not implemented yet

- Uploading or remote ingest into Google Drive and its right-click context menu.
- A user-selected destination folder, or saved-file/folder deep links.
- Production OAuth verification/publishing for all external users.

The login UI must never imply that a file has been delivered just because OAuth succeeded.

## Test

- Missing client ID: show Setup; LOGIN! explains that publisher setup is required.
- With valid client ID and listed test account: consent, then Connected.
- Denied/cancelled consent: never claim Connected.
- Reopen Shelf: silent verification without a new consent prompt.
- Revoked auth: Check login; one click to reconnect.
- Cloudflare R2 credentials, animations, palettes, and Explorer remain untouched.

Docs: https://developer.chrome.com/docs/extensions/reference/api/identity
https://developers.google.com/workspace/guides/create-credentials
https://developers.google.com/workspace/drive/api/guides/api-specific-auth
https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get

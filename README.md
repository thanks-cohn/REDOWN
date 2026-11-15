# REDOWN Basic

An independent Manifest V3 Chrome extension for saving supported web files to Google Drive, Dropbox, or OneDrive. Three native save actions feed one coordinator; a save counts only after the provider adapter confirms the uploaded object through a separate metadata request. No server, relay, original REDOWN installation, or Cloudflare account is required. The sole runtime dependency is a small vendored `fflate` ZIP module; test tools are development-only.

**LIVE RIGHT-CLICK SAVE UNVERIFIED — RELEASE BLOCKED.** Google Drive, Dropbox and OneDrive still require authorized live Chrome right-click acceptance, including independent verification of saved bytes and filename. Local tests cannot satisfy that gate. See [acceptance evidence](docs/ACCEPTANCE.md).

## Install for development

1. Run `npm ci --ignore-scripts`, `npm test`, and `npm run check`.
2. Configure public registrations in `deployment/standalone.json`; run `npm run build -- --profile standalone` and `npm run package -- --profile standalone`.
3. In an isolated Chrome profile permitting Developer mode, load `dist/standalone/extension/` unpacked. Toolbar click opens the real Chrome **side-panel Shelf**. A restricted/unsupported side-panel API falls back explicitly to an extension tab.
4. Use Sign In only after public registration setup; **Setup required** disables doomed login attempts. Toggle light/dark with the keyboard-accessible sun/moon control.

See [portable deployment profiles](docs/PORTABLE_DEPLOYMENT_PROFILES.md) for both build variants, field definitions, exact redirects, storage isolation and live gates.

**GO TO only opens the provider website.** A working website session does not grant the extension OAuth access. Refresh reuses a valid token or silently renews it; Reconnect/Approve requests missing or expired permission interactively. A failed or uncertain save needs an explicit new click after checking the provider for a possible existing object.

## Independent OAuth configuration

REDOWN Basic must have its own stable extension ID and registrations. Its redirect URLs and tokens are independent of REDOWN. Do not copy REDOWN's manifest key, extension ID, client IDs, or local storage. Development extension IDs can change when the unpacked path changes. Register the ID actually shown by Chrome; a release identity needs its own approved registration.

Set the provider public client IDs and expected extension identity in the selected `deployment/*.json` profile. Build generates compatible manifest OAuth fields and runtime configuration; no save engine, Shelf or provider adapter edits are required. Incomplete profiles remain truthful and unready. Provider app approval, consent-screen restrictions, tenant policy, and quota still apply.

| Provider | Registration and permission |
| --- | --- |
| Google Drive | Create a Google OAuth **Chrome Extension** client for Basic's extension ID; enable Drive API and configure the consent screen/test users. Use `https://www.googleapis.com/auth/drive.file`. This grants access to files this application creates/opens, not arbitrary Drive contents. |
| Dropbox | Create a Dropbox API app with `account_info.read`, `files.metadata.read`, and `files.content.write` permissions. Register exactly `https://<BASIC_EXTENSION_ID>.chromiumapp.org/dropbox`. Enable the requested scopes in the app console. Basic uses an authorization code with PKCE and offline refresh; no client secret belongs in an extension. App-folder vs full-Dropbox access determines the app's visible root. |
| OneDrive | Register a Microsoft Entra public client/SPA with the account types you intend to support and exact redirect `https://<BASIC_EXTENSION_ID>.chromiumapp.org/onedrive`. Allow public PKCE authorization-code exchange without a client secret. Request delegated `Files.ReadWrite`, `User.Read`, and `offline_access`. Tenant consent policy and SPA token lifetime apply. |

Microsoft registration has an important live constraint: an extension token exchange and a SPA redirect can trigger Microsoft’s Origin/CORS policy (`AADSTS9002326` or `AADSTS9002327`). Verify the exact redirect/client platform and public-client settings in an authorized browser session; do not work around this with a client secret in the extension or by disabling browser security. This configuration remains unverified here.

Inspect `chrome.identity.getRedirectURL('dropbox')` and `chrome.identity.getRedirectURL('onedrive')` in the extension worker if checking redirects. Never paste token values into logs or chat. Scope or registration changes may require Reconnect/Approve; opening a provider website cannot fix them.

## Supported sources and limits

Basic fetches actual bytes in the extension, never passes the source URL to a provider as upload metadata, and does not save a browser disk intermediate. It supports accessible HTTP(S) images, downloadable links, and other nonempty file responses up to **32 MiB per attempt**. Unknown source lengths are bounded while reading and sized before upload; OneDrive therefore receives a known total. This is an application memory bound, not a claim about provider file-size limits.

HTML/login pages, blocked/empty responses, unsafe URLs, browser-only `blob:`/`file:` sources, and resources requiring unsupported browser/source authentication fail truthfully. Host permissions do not override authentication, DRM, browser restrictions, server policy, or expired signed links. Basic does not promise arbitrary web-page archival or universal download support. Provider objects are kept separate for explicit new saves; an ambiguous commit is never automatically retried as a new object.

The extension asks for context menus, local storage, identity, and downloads (local diagnostics ZIP), plus HTTP(S) host access to fetch arbitrary user-selected resources and provider APIs. It injects no content scripts. Chrome’s cookie, redirect and protected-resource rules still apply to its source requests; broad host access is not a bypass.

## History, counter and diagnostics

History uses bounded indexed pages (40 entries by default). Image and URL expansion are independent; available local previews load only when opened/needed. Page size, expansion defaults, and light/dark theme persist. Clearing local History never deletes cloud objects or resets the cumulative confirmed-save ledger.

Diagnostics starts **on**, retaining the newest **4,000 events**. Settings accepts any positive whole-number event cap or **Unlimited**, which removes the app's count limit but not browser quota/device limits. Turning collection off preserves existing diagnostics and does not stop saving, History, error feedback, or the counter. Clear Diagnostics affects optional events only.

More › Diagnostics exports retained events to a local ZIP, including when collection is off. The warning matters: redacted URLs can still reveal browsing activity and private paths. No diagnostics is sent to a provider or analytics service. Credentials, file contents, and private response bodies do not belong in the export.

## Developer references

- [API](docs/API.md): versioned operations, guarded callers, schemas, examples and errors.
- [Architecture](docs/ARCHITECTURE.md): data ownership, state transitions, uncertainty and privacy.
- [Extraction map](docs/EXTRACTION.md): inspected source, useful mechanisms and exclusions.
- [Acceptance](docs/ACCEPTANCE.md): exact local test evidence and live release blockers.
- [License and notices](THIRD_PARTY_NOTICES.md).

No deployment, store publication, merge or live cloud-object creation is part of this implementation.

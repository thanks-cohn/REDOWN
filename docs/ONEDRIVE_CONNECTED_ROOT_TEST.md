# OneDrive connected login and root-save implementation

**Branch:** `codex/v3-parity-first-reconstruction`  
**Status:** IMPLEMENTED FOR OWNER CHROME TESTING; LIVE UPLOAD NOT YET VERIFIED.  
**Prerequisite:** The owner ran REDOWN's installed-Chrome diagnostic successfully and obtained `ONEDRIVE_OAUTH_DIAGNOSTIC_PASSED` on November 1, 2026. This is real evidence for PKCE authorization-code redemption and read-only root access in the registered extension. It is **not** a saved connection, refresh test, or upload test.

## Owner-visible behavior

1. Update the actual installed unpacked extension's files to this branch and **Reload** it at `chrome://extensions`. A Chrome Web Store build requires a separately released updated package. Confirm the extension ID remains `mkadkgpekmkknfbniacdlmgikihjjepf`.
2. Open REDOWN Shelf and select **Connect OneDrive**. This is a **new persistent login**: the earlier diagnostic deliberately discarded its token, so one more sign-in is expected. Accept the requested Microsoft sign-in/Graph endpoint origins and Microsoft delegated `Files.ReadWrite User.Read offline_access` consent. A green/connected Shelf state and OneDrive menu **Save to OneDrive root** appear only after account + drive + root ID checks succeed.
3. Open a public HTTP(S) image or file in Chrome, right-click it and select **REDOWN → OneDrive → Save to OneDrive root**. If Chrome asks for source host and OneDrive upload endpoint permissions, grant them. No REDOWN folder, separate transfer tab or local Downloads copy is created.
4. Inspect the OneDrive root at https://onedrive.live.com/ (or your organization OneDrive site). In the Shelf look for completed status and a verified History receipt. Only metadata-confirmed root files are marked completed.
5. Save the same file/name twice to check Graph `@microsoft.graph.conflictBehavior:rename` (“Keep Both”). Inspect the distinct returned filenames in OneDrive and History. For larger tests, use a public HTTP(S) file exposing an accurate `Content-Length`, known bytes, and a source that does not redirect.

**Do not start with private or authenticated download URLs.** The current browser-mediated transport deliberately omits cookies and refuses redirects and private/local hosts. Run a small known public file first.

## Production isolation

- New `extension/onedrive-auth.js`: registered Chrome extension ID and Microsoft callback, PKCE S256, one-use state and code, account/drive/root verification, trusted-only storage of refresh token, rotation on refresh, sender-bound connected state and disconnect. No client secret or externally delegated credentials.
- `extension/onedrive-api.js`: bounded sequential 5 MiB fragments through Microsoft Graph createUploadSession scoped by the verified **root item ID**, Rename conflict policy, browser-only preauthenticated PUTs without Graph bearer, known total size, host allowlist and after-commit Graph drive item metadata proof. No application-level file-size cap, but provider quotas, URL restrictions and Chrome worker lifetime remain real limits.
- `extension/onedrive-provider.js`: single active upload per worker, explicit per-click source permission, cancelled/blocked/interrupted/uncertain states, protected owner account binding, History receipts for terminal outcomes. Interrupted/final commits are **not blindly replayed**.
- `extension/onedrive-menu.js`: exactly two provider-owned native entries, showing login until genuinely connected and Save to root only when connected. The existing one native menu writer/dispatcher remains intact.
- `extension/shelf-onedrive.js`, `extension/shelf.html` and `extension/onedrive-controls.css`: connected state, Open OneDrive, Disconnect, Cancel save, status/progress and the separate optional diagnostic. No automatic login popup.
- No changes to Google Drive, Dropbox, Cloudflare auth, the V3 menu engine, shared providers, boot implementation, existing Chrome key or manifest permissions. Uses the existing optional HTTPS host permission and requests specific origins at the user gesture.

## Verification and release gates

- Run `node scripts/check-syntax.mjs` and `node --test tests/onedrive.test.mjs tests/onedrive-oauth-diagnostic.test.mjs tests/onedrive-connected.test.mjs` or the focused GitHub Action.
- Tests use synthetic Microsoft responses and streams, and protect the previous menu projection/V3 routes. They do not prove the live upload host or Chrome service worker behavior.
- Owner's live browser must verify: persistent Shelf connect, extension restart and refresh, duplicate “Keep Both”, a small file then multiple chunks, readback with correct file size/root/filename, ordinary source permissions, cancellation, log out, and failed/ambiguous upload receipts.
- Unknown `Content-Length`, compressed source responses, redirects, private sources, zero-byte uploads and upload endpoints outside the approved Microsoft host allowlist are blocked rather than falsely marked successful.
- An active transfer interrupted by worker shutdown is marked **uncertain** on next worker start. Full durable resume, retries/backoff and 5 TB end-to-end capability have **not** been verified. Always check the drive before retrying an uncertain final chunk.
- A root write cannot be called production-verified solely because OAuth passed. **Do not publish general availability until live bytes and metadata proof are recorded.**

## Error reading

- `ONEDRIVE_EXTENSION_ID_MISMATCH`: installed extension ID differs from registered callback.
- `ONEDRIVE_PERMISSION_REQUIRED`: connect from the Shelf after allowing Microsoft hosts.
- `ONEDRIVE_TOKEN_REJECTED`: inspect sanitized AADSTS/HTTP code; real Chrome diagnostic already passed once, so avoid speculative Entra changes.
- `ONEDRIVE_SOURCE_UNSAFE`, `ONEDRIVE_SOURCE_LENGTH_UNKNOWN`, `ONEDRIVE_SOURCE_TRUNCATED`: select a supported public HTTP(S) file with known, accurate length.
- `ONEDRIVE_UPLOAD_HOST_PERMISSION`, `ONEDRIVE_UPLOAD_URL_UNTRUSTED`: report the diagnostic code only. Do not share full upload URLs because they may be temporary authorization credentials.
- `ONEDRIVE_GRAPH_403`, `ONEDRIVE_GRAPH_507`: tenant policy/consent or storage quota may prevent upload.
- `ONEDRIVE_COMMIT_UNCERTAIN`, `ONEDRIVE_PROOF_UNCERTAIN`: do not blindly repeat. Inspect root, item name and bytes first.

The actual public Graph upload-session contract is documented at https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0 .

## Browser-source privacy and upload-host repair (November 1, 2026)

The prior errors "OneDrive right-click save accepts public HTTPS files only" and
"Microsoft returned an upload host outside approved OneDrive endpoints" were
REDOWN-side validation errors. Microsoft was not inspecting or vetoing the source URL.

1. REDOWN, in Chrome, obtains the chosen source URL from the native right-click event and fetches the file bytes itself. Public HTTP and HTTPS URLs are supported with narrow per-site Chrome permission. Inline data: URLs are decoded locally into a Blob to determine size. HTTP fetching is unencrypted; use HTTPS when available. Browser blob:, chrome: and file: URLs still need a separate page/local bridge and are NOT silently supported.
2. Graph receives only REDOWN's bearer token, the verified root destination path and filename, and the createUploadSession request. It does NOT receive the source URL, source webpage URL, frame URL, signed source query or local REDOWN History. REDOWN's History fields omit query strings.
3. REDOWN receives the opaque upload session URL privately from the authenticated Graph response and PUTs byte ranges using no-referrer, omit-credentials and NO Graph bearer on upload PUT. Never display, log or persist the opaque URL.
4. Validate the Graph upload URL for public HTTPS, no embedded credentials, no fragment, no private address. Do not constrain it to just two old Microsoft domain suffixes. For an unfamiliar Graph-provided host, Shelf offers "Allow upload host: hostname" and requests ONLY that exact HTTPS origin from Chrome. The approved origin is stored in REDOWN (not the upload URL), scoped to the current OneDrive connection. Right-click again after approval. Source-site permission alone is never destination approval for an unfamiliar host.
5. Mark a file completed only after Graph confirms the destination item, root parent, size and filename.

Microsoft inevitably receives the OneDrive account, destination filename, byte count and file contents because it stores the file. Files are NOT end-to-end encrypted by this feature. Microsoft does not need the original source URL or the local REDOWN History to perform the upload.

Not yet proved: the user's actual live Chrome upload after this repair, cookie-restricted sources, redirect support, arbitrary blob: URLs, source streams lacking an exact size, interrupted-session resume, or provider token/URL behavior after Microsoft's 2027 migration.

Focused tests: node --test tests/onedrive.test.mjs tests/onedrive-oauth-diagnostic.test.mjs tests/onedrive-connected.test.mjs.

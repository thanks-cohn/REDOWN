# OneDrive connected login and root-save implementation

**Branch:** `codex/v3-parity-first-reconstruction`  
**Status:** IMPLEMENTED FOR OWNER CHROME TESTING; LIVE UPLOAD NOT YET VERIFIED.  
**Prerequisite:** The owner ran REDOWN's installed-Chrome diagnostic successfully and obtained `ONEDRIVE_OAUTH_DIAGNOSTIC_PASSED` on November 1, 2026. This is real evidence for PKCE authorization-code redemption and read-only root access in the registered extension. It is **not** a saved connection, refresh test, or upload test.

## Owner-visible behavior

1. Update the actual installed unpacked extension's files to this branch and **Reload** it at `chrome://extensions`. A Chrome Web Store build requires a separately released updated package. Confirm the extension ID remains `mkadkgpekmkknfbniacdlmgikihjjepf`.
2. Open REDOWN Shelf and select **Connect OneDrive**. This is a **new persistent login**: the earlier diagnostic deliberately discarded its token, so one more sign-in is expected. Accept the requested Microsoft sign-in/Graph endpoint origins and Microsoft delegated `Files.ReadWrite User.Read offline_access` consent. A green/connected Shelf state and OneDrive menu **Save to OneDrive root** appear only after account + drive + root ID checks succeed.
3. Open a public HTTPS image or file in Chrome, right-click it and select **REDOWN → OneDrive → Save to OneDrive root**. If Chrome asks for source host and OneDrive upload endpoint permissions, grant them. No REDOWN folder, separate transfer tab or local Downloads copy is created.
4. Inspect the OneDrive root at https://onedrive.live.com/ (or your organization OneDrive site). In the Shelf look for completed status and a verified History receipt. Only metadata-confirmed root files are marked completed.
5. Save the same file/name twice to check Graph `@microsoft.graph.conflictBehavior:rename` (“Keep Both”). Inspect the distinct returned filenames in OneDrive and History. For larger tests, use a public HTTPS file exposing an accurate `Content-Length`, known bytes, and a source that does not redirect.

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
- `ONEDRIVE_SOURCE_UNSAFE`, `ONEDRIVE_SOURCE_LENGTH_UNKNOWN`, `ONEDRIVE_SOURCE_TRUNCATED`: select a supported public HTTPS file with known, accurate length.
- `ONEDRIVE_UPLOAD_HOST_PERMISSION`, `ONEDRIVE_UPLOAD_URL_UNTRUSTED`: report the diagnostic code only. Do not share full upload URLs because they may be temporary authorization credentials.
- `ONEDRIVE_GRAPH_403`, `ONEDRIVE_GRAPH_507`: tenant policy/consent or storage quota may prevent upload.
- `ONEDRIVE_COMMIT_UNCERTAIN`, `ONEDRIVE_PROOF_UNCERTAIN`: do not blindly repeat. Inspect root, item name and bytes first.

The actual public Graph upload-session contract is documented at https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0 .

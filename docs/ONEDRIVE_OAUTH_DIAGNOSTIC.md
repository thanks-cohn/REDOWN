# REDOWN OneDrive: run Microsoft OAuth diagnostic in the owner's Chrome

**Branch:** `codex/v3-parity-first-reconstruction`  
**State:** DIAGNOSTIC IMPLEMENTED, LIVE RESULT NOT TESTED, OneDrive uploads DISABLED.  
**Owner's Microsoft client:** `a8e034a8-6462-4022-b3f3-a79ffb6b1b84`  
**Expected extension ID:** `mkadkgpekmkknfbniacdlmgikihjjepf`  
**Expected redirect:** `https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/onedrive`

## In the browser that actually runs REDOWN

1. Ensure that the installed extension uses a build **containing these latest branch commits**. GitHub changes do not update an already installed extension automatically. In `chrome://extensions`, enable Developer mode and use **Reload** for a locally loaded extension pointing to the updated `extension/` files. Do not change the existing extension ID/key. If the installed build came from the Chrome Web Store, install or publish an updated build through the appropriate development process first.
2. Click REDOWN to open the **Shelf**, then click **Test Microsoft sign-in** below the current OneDrive control. This is an opt-in test, not a production account connection.
3. Grant only the requested optional permissions for `login.microsoftonline.com` and `graph.microsoft.com`. The test then opens Microsoft's sign-in window.
4. Sign in to a test Microsoft account and approve the displayed permissions as appropriate. The Shelf reports a sanitized stage, code, and optional HTTP/AADSTS code. It **never displays access tokens, refresh tokens, authorization codes, account emails or signed URLs**.
5. If the result is `ONEDRIVE_OAUTH_DIAGNOSTIC_PASSED`, the extension has completed real code+PKCE redemption and read-only `/me` and `/me/drive/root` proof. **This does not test refresh, upload, resume, Keep Both or write authorization, and does not enable OneDrive saves.**
6. If it fails, record **only** the output code, stage, HTTP status and AADSTS code. Do not share authorization redirect URLs or copied DevTools request bodies/tokens. Do not repeatedly retry a code that might already have been redeemed.

## How to interpret important failures

| Diagnostic | Meaning | Next action |
| --- | --- | --- |
| `ONEDRIVE_EXTENSION_ID_MISMATCH` | The installed ID or callback differs from the Entra registration | Confirm exact ID and `chrome.identity.getRedirectURL('onedrive')`; do not change the signed extension key blindly |
| `ONEDRIVE_HOST_PERMISSION_REQUIRED` | Chrome did not grant required Microsoft endpoint origins | Re-run the Shelf test and accept the narrow permissions |
| `ONEDRIVE_AUTH_WINDOW_FAILED` | Chrome auth window was dismissed/blocked or failed before callback | Retry once, check whether the consent flow/redirect opens; do not diagnose token redemption |
| `ONEDRIVE_AUTH_REJECTED` | Microsoft declined authorization before handing back a code | Use the sanitized AADSTS code to check app registration, consent or tenant policy |
| `ONEDRIVE_TOKEN_REJECTED` with `AADSTS9002327` | A SPA-registered callback may be incompatible with token redemption lacking a browser Origin header | Verify actual Chrome network behavior; **only then** consider moving this same redirect from SPA to Mobile and desktop applications (custom redirect), not adding a second conflicting callback |
| `ONEDRIVE_TOKEN_REJECTED` with `AADSTS9002326` | A non-SPA callback received a cross-origin redemption | Check the actual configured platform and request mode before changing Entra |
| `ONEDRIVE_GRAPH_ROOT_REJECTED` | Sign-in and token worked but the drive root was not readable | Check drive provisioning, account type, consent and Graph HTTP status; not evidence of write success |
| `ONEDRIVE_OAUTH_DIAGNOSTIC_PASSED` | Identity and read-only root verification succeeded | Implement persistent secure auth, worker restart/refresh and real root uploads under a separate reviewed change |

No Entra settings were modified by these commits. Microsoft secrets and generated codes are never written to REDOWN storage or transfer history; the diagnostic retains only ephemeral values in memory. The token endpoint request is made by the real extension worker with the browser-generated Origin behavior, without a forged Origin header.

## Isolation and limitations

- OneDrive's native menu still fails closed; V3 still owns Cloudflare destinations. The Google Drive and Dropbox routes remain unchanged.
- Existing OneDrive login/save operations still report `ONEDRIVE_OAUTH_NOT_VERIFIED` until a separate tested production auth/upload implementation. The new Shelf button is a test **only**.
- The live browser flow cannot be performed by a remote coding agent without access to the owner's approved Chrome/Entra session. Automated unit tests use synthetic identities, requests and tokens and do not count as live verification.
- The already existing manifest optional HTTPS host permission is used; no new broad mandatory permission or additional OAuth application was created.

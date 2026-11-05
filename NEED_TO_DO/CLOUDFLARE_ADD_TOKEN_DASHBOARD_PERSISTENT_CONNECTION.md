# NEED TO DO — Cloudflare dashboard “Add Token” popup and persistent authorized connections

**Owner request:** November 5, 2026  
**Product:** REDOWN, existing dashboard and existing Cloudflare R2 integration  
**Status:** Requested feature, **NOT implemented or verified**  
**Priority:** High — remove repetitive login friction after the core MEGA S4 / Universal File API connector is stable.

## Owner-visible behavior

Under the **Cloudflare Buckets** area of REDOWN's main dashboard, place a prominent, aesthetically integrated **Add Token** button. It should be visible even if Cloudflare is not currently logged in. Clicking it opens **one in-dashboard modal popup** (not an external browser page or debug console), where a customer can enter/reuse their own Cloudflare credentials.

The popup supports the five fields established in the Codex integration work. Labels for users should be human-readable:

| UI label | Internal configuration name | Purpose |
| --- | --- | --- |
| Cloudflare API Token | `CLOUDFLARE_API_TOKEN` | Authorized Cloudflare management API calls, Workers/R2 account operations |
| Cloudflare Account ID | `CLOUDFLARE_ACCOUNT_ID` | Select correct Cloudflare account (identifier, not a secret) |
| R2 Access Key ID | `CLOUDFLARE_ACCESS_KEY_ID` | R2 S3-compatible object API identity |
| R2 Secret Access Key | `CLOUDFLARE_SECRET_ACCESS_KEY` | R2 S3-compatible object API signing secret |
| R2 S3 API Endpoint | `S3_API_ENDPOINT` | The specific account's R2 S3-compatible HTTPS endpoint |

These are **names to map internally**, not an instruction to place credentials in source code, repository files or environment variables on every customer's computer. The Codex environment variables are for developer/testing setup; the customer-facing dialog must securely collect and manage each user's own values.

**Workflow:** Dashboard → Cloudflare Buckets → **Add Token** → enter relevant credentials → **Test Connection** (read-only) → **Save & Connect** after validation → display authenticated buckets and existing authorized capabilities. If appropriate, allow an advanced section to provide only the management-token/account pair or only the R2 S3 triple, with clear capability indicators; do not pretend either credential kind authorizes all functions. If the user already has Cloudflare connected, present **Manage Credentials**, **Replace**, **Recheck**, and **Disconnect/Revoke Locally** (where available), rather than forcing them through OAuth again.

## Why we are doing this

Users should **not have to log into Cloudflare repeatedly** merely to browse buckets, open the Explorer or resume authorized operations when a saved token/key is still valid. A successful direct-token connection should be recognized as a legitimate Cloudflare connection, separately from OAuth, without a circular "Manage → sign in again" loop. Keep login as an alternative: some account actions may still require OAuth/scopes, and tokens may expire, be revoked or lack permissions. Never promise indefinite access.

## Technical contract

1. Reuse REDOWN's existing Cloudflare account/session, bucket discovery and R2 S3 provider adapter wherever practical. A direct-token connection is an **additional authenticated connection method**, not a second, incompatible File API engine or a separate Cloudflare Explorer.
2. Validate **identity** and **scopes** for the management API token against the account, and **independently** validate S3 credentials/endpoint for authorized R2 bucket listing. Never confuse a Cloudflare API token with R2 S3 keys. Use Cloudflare R2's documented SigV4 configuration, not the MEGA S4 signing region. Show exactly which functions are authorized (read/list/write/Workers management) rather than guessing from key presence.
3. Once validated, persist the **connection identity and secret references** across dashboard/Shelf/Explorer, extension service-worker suspension, browser restart and Chrome profile restart. Preserve the last selected account/bucket and refresh status accurately. Fail closed on expired/revoked keys; offer Update Token, don't loop through OAuth automatically.
4. **Credential protection is mandatory.** Password-mask secrets; default to never re-display plaintext. Prefer a trusted local component/native companion with Windows OS-protected secret storage (e.g., DPAPI/Credential Manager), or another independently justified trusted secret channel. Never embed raw reusable secrets in a public Worker, extension bundle, URL, page DOM, History, debug logs, GitHub, crash report or unprotected exported settings. Do not falsely claim Chrome local storage by itself is encrypted/secret-safe. Document any temporary security limitations and avoid offering an unsafe "remember forever" setting without a suitable protected store.
5. Bind each saved credential set to the correct Cloudflare account/profile. Support rotation, manual removal and an obvious account switch without mixing buckets or writing to the wrong account. Disconnect clears locally retained credentials and session references; do not imply it revokes remotely issued keys unless a supported remote revocation action succeeds.
6. **No implicit provisioning/mutations.** Clicking Add Token, Test Connection or Save & Connect must not create buckets, upload objects, deploy Workers, change R2 billing/public URL settings, or activate buckets without a separately explicit and verifiable action.
7. Integrate with existing **Explorer provider tabs**, Dashboard bucket cards and Click2Cloud/right-click destinations without replacing V3 engine. Existing OAuth users remain functional; Cloudflare should continue to work even if MEGA S4 is disconnected and vice versa. Connection state and success counters are based on verified operations, not merely token presence.
8. Add accessible, polished modal UX: clear names and short hints for obtaining token/key/endpoint, optional paste-from-env-format parsing locally only if safe, show/hide secret, scoped validation messages, keyboard/focus handling and cancel without state changes. Do not send users through a separate page if a popup can perform the needed task.

## Verification / acceptance criteria

- [ ] Fresh REDOWN profile with no Cloudflare login: Dashboard bucket area offers **Add Token**; opening/closing the modal works without an OAuth popup.
- [ ] Supply valid user-owned API token/account ID and R2 S3 keys/endpoint: test is read-only, identifies actual scopes, and **Save & Connect** displays real authorized buckets; no fake logged-in state.
- [ ] Close/reopen Shelf, restart Chrome, suspend/restart MV3 service worker: connection survives *when credentials are still valid and safely retained*; no repeated unnecessary sign-in.
- [ ] Invalid, expired, permission-restricted or wrong-account credentials: meaningful error, no mutations, no leakage, and a straightforward Replace Token action.
- [ ] Management-only vs S3-only vs both: UI accurately distinguishes capabilities; no unsupported operations advertised.
- [ ] Cloudflare Explorer and TRUE REMOTE continue using their correct verified permission/capability paths; MEGA S4 is still independent.
- [ ] Existing Cloudflare OAuth connections, R2 bucket behavior, right-click menus and BOOT behavior pass non-regression checks.
- [ ] Security review confirms no raw credentials in extension-visible exports, browser console, dashboard HTML, source commits, History or URLs. Clearly document credential-at-rest strategy and limitations.

**Suggested implementation sequencing:** Finish/verify the current MEGA S4 connector and provider tab groundwork, then implement this Cloudflare dashboard Add Token login option through the same independent provider-connection model. This is **a tracked future implementation request only**, not approval for live Cloudflare Worker/R2 changes.

**Cross-reference:** [Current real MEGA S4 + Cloudflare Codex request](../docs/CODEX_P0_MEGA_S4_REDOWNS3_CONNECTOR.md).

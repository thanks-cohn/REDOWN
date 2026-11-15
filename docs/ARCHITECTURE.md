# Architecture

API version 1. One MV3 module worker owns the native menus, validated operations and save coordinator. The Shelf is a thin client of that same API. No website-facing network API or server is present.

```text
native right click ──> coordinator <── guarded extension API <── Shelf
                           │
                  auth → source bytes → provider adapter
                           │
                    IndexedDB transaction
               attempts / counter ledger / events / settings
```

## Save lifecycle and proof

`RECEIVED → AUTH_CHECK → SOURCE_CHECK → UPLOADING → CONFIRMING → SAVED | FAILED | UNCERTAIN`.

The coordinator assigns each attempt its own ID, persists its progress and owns the terminal decision. Only a provider-confirmed object can become `SAVED`. The provider receives bytes, sanitized filename and essential API metadata, never the host page URL or resource URL as extra metadata. The source is buffered before upload with a per-request size bound; no universal provider size claim is made. Adapters independently read object metadata after upload to confirm identity/name/size. Google and OneDrive compare SHA-256 when supplied, otherwise stream an exact-byte readback; Dropbox compares the actual uploaded bytes’ block content hash. A provider’s safe conflict rename is retained as the actual History filename while the adapter separately binds the requested filename. Actual stored bytes must additionally be checked in live acceptance.

Source acquisition reads at most 32 MiB per attempt before upload. This makes unknown Content-Length safe to handle and gives OneDrive valid total/range headers. Readiness means an upload may be attempted with current authorization, not a promise that source access or provider quota will succeed. GO TO has no role in OAuth readiness.

An interrupted worker cannot infer success from `UPLOADING`, a session URL, or a previous click. Recovery queries the attempts state index for unfinished states only; unfinished persisted work becomes uncertain rather than being replayed. Check the cloud destination before initiating a new save. Bounded read retries may be safe; ambiguous object creation/finalization must not be repeated blindly. A new user click is a new operation and can legitimately create another object.

## Storage and ownership

- **Attempts/History:** durable core records, including failure and uncertainty. Indexed chronological paging bounds loaded rows. Local deletion has no provider delete effect.
- **Confirmation ledger and counter:** distinct from deletable History. Confirmation of the same attempt increments once in an atomic transaction; replay cannot increment again.
- **Settings:** persisted theme, page size, expansion defaults, optional diagnostic collection and event cap.
- **Diagnostics:** separate, optional stage/outcome events. Off stops only new optional events. When optional diagnostic writes fail, saving remains independent and History/terminal feedback carries the best-effort `DIAGNOSTICS_STORAGE_UNAVAILABLE` warning. Finite retention prunes oldest records with cursors; Unlimited removes the app-level count limit, not browser quota.
- **Credentials:** trusted extension storage/Chrome identity only. Never returned by the public internal API, stored in History, included in diagnostics or copied from REDOWN.

Indexed loading and cursor pruning avoid full-history rendering or loading Unlimited diagnostics into RAM for ordinary viewing. Export may fail because of quota or browser resource limits; failures must be visible and must not be described as successful exports.

## UI behavior

Exactly three cards use the same layout. Only a newly received terminal success/failure event triggers that card's two green/red flashes. Rendering an existing record is not an event. Uncertain and in-progress operations never flash green. Reduced motion substitutes a static outcome indicator.

History groups a loaded record into exactly one local-calendar section; see the presentation implementation for exclusive day/week/year boundaries. Expansion defaults are applied only to currently loaded pages. Manual image/URL toggles work independently and remain per-record/per-component for the current Shelf lifetime, including rerenders and page navigation. Closing/reopening the Shelf resets those temporary overrides; saved defaults remain preferences, not a durable per-record expansion ledger.

## Security boundary

Worker messages are accepted only from Basic's own Shelf URL and extension ID. Input validation precedes effects. No content script, external message listener, page-global bridge, localhost server or unauthenticated HTTP endpoint exposes operations to websites. Own-extension scripts use the same documented dispatcher, not an alternate state-mutating path.

OAuth registrations belong to Basic's extension identity. PKCE callbacks require matching redirect/state and are consumed once. Tokens are never upload destination URLs and must not be forwarded to a preauthenticated OneDrive session host. Source requests allow browser-managed credentials and omit referrers; browser cookie restrictions still apply, so protected sources can fail even when the visible page is logged in. Source redirects are followed by the browser, and final response bytes/type are validated. Provider requests omit page/source provenance. Local URLs are sanitized before persistence; redaction is precautionary, not a claim that every private URL can be detected.

## Deliberate exclusions

No folders/explorer/destination manager, complex queue, background resume engine, Cloudflare Worker, R2, billing, original counter, mascot, telemetry recorder, service framework or native helper. See [EXTRACTION.md](EXTRACTION.md). Separate modules isolate browser authentication, source acquisition, provider transfer, durable state and presentation without parallel pipelines.

## Portable Shelf and identity boundary

Toolbar opening uses the standard Chrome sidePanel behavior; there is no normal competing action listener. Unsupported/restricted API gets one honest extension-tab fallback. The sun/moon SVG changes appearance via existing theme settings, independently of auth. `lib/identity.js` validates public profiles, runtime identity, callbacks, manifest/scopes and registration-bound local state. Build-time manifest generation lives in `scripts/build.mjs`; changing deployment never edits coordinator/provider upload logic. `lib/store.js` shares a constant Basic namespace while preserving its existing data. Static configuration is not provider readiness.

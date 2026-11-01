# BOOT API 1

BOOT coordinates the existing entry-bootstrap toolbar opener/configuration and
background menu reconciliation lane. It is an internal extension API, not an HTTP,
content-script or externally callable endpoint. The offline diagnostics gateway
remains read-only repository inspection; it cannot certify or repair a browser.

In Settings, enable Debug Mode and use **Inspect startup**, **Repair entrypoints**,
or **Export startup receipts**. No BOOT overlay appears during healthy use.
From the exact Settings (`options.html`) extension context:

```js
await chrome.runtime.sendMessage({type:'bootV1',operation:'status'});
await chrome.runtime.sendMessage({type:'bootV1',operation:'audit'});
await chrome.runtime.sendMessage({type:'bootV1',operation:'history',input:{limit:32}});
await chrome.runtime.sendMessage({type:'bootV1',operation:'repair'});
// Explicitly reconcile even if the previous acknowledgement was healthy:
await chrome.runtime.sendMessage({type:'bootV1',operation:'repair',input:{target:'nativeMenu'}});
```

These return `{ok:true,result,correlationId}`; rejected senders get
`DIAGNOSTICS_DISABLED`. Sender extension ID, exact Settings URL and Debug Mode
are all required. Unknown operations/targets and invalid limits fail. Internal
worker callers use `RedownBoot.status/audit/repair/history`; never expose that
object through an external messaging handler. Result schema:
[`schemas/boot/v1.schema.json`](../../schemas/boot/v1.schema.json).
`node scripts/boot-fixtures.mjs` produces six inspectable schema fixtures in work/.

`status` reads local state and the current desired projection fingerprint. It
never restores CURRENT, writes storage, refreshes OAuth, lists buckets or opens
surfaces. `audit` adds bounded `chrome.action.getPopup` inspection and structured
stage evidence. `history` reads at most 64 chronological receipts from the existing
`entryPointEvidence` ring; no second store is created. Queries do not add passive
runtime message traces. Storage/API reads time out. A missing interval is unknown.

`repair` accepts target `all` (default), `toolbar`, or `nativeMenu` only. Default
repair touches unhealthy components; explicit targets (including explicit `all`) request reconciliation. The Settings repair button explicitly requests `all`.
It joins simultaneous repairs, caps attempts to three per worker epoch with exponential cooldown (one second initially, two seconds after the second attempt), and reports `REPAIR_BOUNDED` thereafter.
No automated polling or retry timer is created. Each delegated operation is
observed for at most eight seconds; a timeout does not cancel a Chrome API call
already issued, and is not acknowledgement. The existing serialized menu lane
remains the sole writer, including a trailing pass for coalesced changes (maximum
two passes). Further supersession is degraded and recoverable next wake/Apply.
Chrome menu callbacks have five-second acknowledgement deadlines. Worker restart
removes in-memory locks; persisted desired/applied mismatch remains inspectable.

The response lists attempted and acknowledged components and manual action need.
Repair never opens Shelf without a toolbar gesture, opens tabs, refreshes tokens,
prepares Workers, deletes CURRENT, overwrites backup or changes public access.
Toolbar repair uses `applyToolbarOpenMode`; the next real click uses the original
Shelf-first opener and attached popup fallback. Unknown Shelf render state is
not itself permission to open a second surface. A pending open is recorded;
late rejection cannot override a newer attempt.

## Evidence meanings

* `worker.ready`: background reached adapter configuration in this epoch. An
  in-worker API cannot report or heal failure to evaluate the worker itself.
* `toolbar.ready`: last successful configuration/open observation, not proof all
  windows will accept a gesture. Degraded observations remain separate.
* `shelf.ready`: bounded document handshake in the last observed invoking window.
  API acceptance alone remains degraded; no handshake remains unknown. This is
  not a certificate for every browser window.
* `nativeMenu.registered`: desired fingerprint matches the last acknowledged
  applied fingerprint. Chrome has no universal native-row enumeration API:
  `visibleRows` is always `not-verifiable`. No cached receipt proves physical
  presence after an arbitrary browser defect.
* `cloudflare.connected`: stored credential present and locally unexpired, **not**
  provider validation. `defaultDestination.ready`: current local exact authorized
  V3 default route resolves, **not** proof a remote write will succeed.
* Overall cannot become ready solely because credentials or registration exist.

Receipts distinguish activation, browser startup, install/update, registration
begin/acknowledgement/failure, toolbar outcomes, dispatch classification and
save-route resolution. They contain version, opaque worker epoch/attempt ID,
ISO observation time, optional measured duration, recovery and error category.
Raw native IDs can encode private locations: persistent click evidence uses a
private per-worker salted SHA-256 identity plus exact dispatch kind. Actual IDs
can be inspected transiently in the trusted worker debugger; labels never route
saves. No URLs, credential values, account/bucket names or contents are exported.
Older receipts without an epoch are retained as unknown-origin observations.

The storage ring is bounded to 64, and its I/O is bounded; unavailable storage
cannot prevent toolbar opening. Persisted history cannot survive extension-origin
data deletion/uninstall. Ordinary page refresh, HTTP cache clearing, worker
restart, extension update and deleting `chrome.storage`/IndexedDB are distinct.
Independent verified backups are required after actual data deletion.


## Fresh-profile protected entrypoint (new recovery hardening, installed acceptance OPEN)

The MV3 manifest now points to `extension/service-worker.js`, a small classic worker
entrypoint that imports the **existing** `background.js` without changing its
single `entry-bootstrap.js` toolbar launcher or native menu writer. In normal
operation `background.js` imports that early launcher and all current handlers
exactly once. The small outer entrypoint catches a synchronous failure to load
the large core (including a broken core import) and, when the original toolbar
listener was never registered, imports the **same** early launcher as a degraded
recovery route. No duplicate action listener is installed if the first import
already registered it.

`RedownWorkerCoreStatus` reports `ready` or `failed` in the worker, while
`boot.status()` reports `components.worker.state: "failed"` and
`overall: "blocked"` after a trapped core failure, even if Shelf can still
be opened. A `CORE_IMPORT_FAILED` receipt is added to the existing bounded
`entryPointEvidence` ring, visible in Debug Mode through BOOT history/audit.
The worker's Chrome Errors view remains authoritative for the actual underlying
JavaScript/extension registration exception. No provider calls, login or menu
reconstruction are added to the early emergency path.

**Important limitation:** This catches core import or evaluation failures
*after the small entrypoint itself can run*. It cannot force Chrome to start
an extension worker whose manifest, initial entrypoint or Chrome registration
fails before any script runs; nor does it prove that the owner's observed
first-install dead click had that particular cause. An inactive worker between
clicks is normal in MV3; the important failure is failure to wake/dispatch
a click or to open a usable UI.

**Installed Chrome reproduction acceptance:**
1. Install REDOWN unpacked in an **entirely new Chrome profile** and keep the
   first-failure state without pressing Reload.
2. On `chrome://extensions` inspect the REDOWN card's Errors and
   service-worker status **before** pressing Reload. Capture exact exception
   type/line, extension ID/version, and any registration failure. Do not include
   tokens or private URLs.
3. Click the toolbar icon on a normal website or new tab; it must open Shelf,
   or the existing attached popup on a definitive, supported failure, before
   any Cloudflare login.
4. Separately run a controlled **core import failure fixture**, confirm that
   the original toolbar listener remains usable and `boot.status()` truthfully
   reports a blocked core with `CORE_IMPORT_FAILED`.
5. Repeat first install and cold wake across independent profiles; verify the
   normal core registers the correct native root/Manage and saving still works.
6. Compare the *same* profile after clicking Chrome's Reload only if needed,
   and use the before/after errors to identify which actual transition failed.

Automated fixture: `node --test tests/worker-bootstrap-first-install.test.mjs`.
Use `npm run reliability:check` for repository gates. The bootstrap fallback
and syntax checks do **not** replace installed Chrome visual/gesture tests.

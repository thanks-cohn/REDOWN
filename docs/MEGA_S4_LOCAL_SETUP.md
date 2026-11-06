# MEGA S4 local setup

Open REDOWN's Beta Explorer and select **MEGA S4**. The existing Cloudflare R2
Explorer remains available in its own tab. MEGA does not require Cloudflare login.

Create dedicated, restricted S4 keys in MEGA Object Storage → Keys. Copy your
actual S3 endpoint from MEGA's account UI (the verified endpoint family is
`https://s3.<region>.megas4.com`). Ordinary MEGA Drive passwords do not work.
The connection dialog contains an editable **Signing Region** input and seven
clickable location pills: Amsterdam, Luxembourg, Paris, Barcelona, Montreal,
Vancouver and Tokyo. Clicking a pill fills the MEGA endpoint URL. The signing
region also fills automatically for mappings documented by established S4
clients: Amsterdam (`eu-central-1`), Luxembourg (`eu-central-2`), Montreal
(`ca-central-1`), Vancouver (`ca-west-1`). For Paris, Barcelona and Tokyo,
the signer stays blank until the user supplies the exact region from their
MEGA account or verified documentation; do not guess a signing region.
Users may edit both fields freely.

The **Zone number (optional)** accepts 1 or 2; blank chooses endpoint zone 1.
It never changes the SigV4 signing region. Both numbered zone hosts per
location appear in maintained S3-client preset lists; the successful historical
development preflight only verified the supplied `ca-west-1` signer for the
configured endpoint. Always honor user-entered exact endpoint overrides.

The TRUE REMOTE control is capability-gated. The existing S4 adapter supports
**browser bytes → cloud**, including a bounded HTTPS source fetch with CORS and
permissions constraints; it does not support Worker-direct transfer. For this
version TRUE REMOTE is visibly OFF and disabled, with an explanation. It must
be enabled only after a verified MEGA Worker route exists, and default ON when
both options are actually supported. If only TRUE REMOTE is supported, it is
locked ON; if only browser bytes is supported, it is locked OFF. The API must
reject unsupported mode requests instead of silently misrouting them.

Keys stay in the trusted extension page's memory only. They are not stored in
Chrome storage, a native vault, diagnostics, or source files. Reloading or closing
the page requires reconnecting. All scripts in that trusted page are inside the
credential trust boundary; this is not hardware-backed protection. Cancel clears
the inputs; Disconnect drops the connection. Never paste real keys into chat,
issues, committed files, or test fixtures. Revoke or rotate keys in MEGA if exposed.

Connect performs signed, read-only bucket discovery. A permitted bucket appears
in the existing Explorer. Select it to list objects. Select **Connect / Change
MEGA keys** to reconnect. Switching provider tabs retains each provider's current
location, loaded items, selection, navigation history and clipboard in page memory.
R2 and MEGA identities are fenced; cross-provider copying is disabled.

Uploads use **keep both** or **skip**. Replace is rejected. Each PUT is conditional
on absence and only reports verified success after an independent GET compares
every byte. An uncertain write is not retried. Refresh and inspect the exact
destination before retrying. Empty folders are zero-byte S3 folder markers.
Folder deletion, copy, move, rename, multipart, public URLs and archive actions
are disabled/unimplemented for MEGA in this initial vertical slice.

Uploads, previews, downloads and remote acquisition have a **32 MiB per-object
limit**. Remote acquisition buffers in bounded page memory and uses the same
conditional writer/readback as upload; it does not intentionally download an
intermediate file to OS disk. It is not unlimited streaming. Redirects are refused.
Download reports *started*, not browser completion. Read streams are cancellable
and do not buffer the entire object in the adapter.

## Development verification

Run from the existing isolated checkout; do not create a worktree:

```sh
npm ci --ignore-scripts --no-audit --no-fund
node --test --test-isolation=none tests/mega-s4.test.mjs
node --test --test-isolation=none --test-name-pattern='MEGA popup' tests/beta-explorer.test.mjs
```

Privately configure `MEGA_S4_ENDPOINT`, `MEGA_S4_ACCESS_KEY_ID`,
`MEGA_S4_SECRET_ACCESS_KEY`, and the now explicitly supplied `MEGA_S4_REGION`.
The read-only check is `node scripts/mega-s4-live.mjs`. It does not print secrets.
For a separately approved **test** bucket and new objects only under
`__redown_mega_test__/`, use `node scripts/mega-s4-live.mjs
--approved-disposable-write`. This checks marker creation, upload, exact byte
readback, no-disk remote acquisition from the new object, deletion and absence.
Never use this flag without approval. If a write becomes uncertain, inspect the
test prefix: automatic replay and speculative cleanup are intentionally avoided.

In a cloud Node runtime requiring the inherited proxy, enable Node's
`NODE_USE_ENV_PROXY=1` and set `NODE_EXTRA_CA_CERTS` to the configured CA file;
keep TLS verification enabled. Browser execution uses extension host permissions.

## Installed Windows/Chrome acceptance still required

In an administrator-approved Chrome installation allowing unpacked extensions,
load the extension folder. Verify cold toolbar/Shelf/Explorer opening before
connecting MEGA, connect with dedicated keys, browse the approved test bucket,
create an empty nested folder, upload a disposable file and compare downloaded
bytes/hash, preview, disconnect/reconnect, and switch R2/MEGA tabs without state
leakage. Reload and verify the deliberate memory-only disconnect. Test bad keys,
offline operation and slow network while the R2 tab remains usable. Run the
existing BOOT acceptance matrix; the installed startup incident remains open.

Direct Worker-to-MEGA requires separate approved Worker resources and a trusted
short-lived signing/secret-binding design. No Worker deployment or Cloudflare
resource changes are included here. Use the exact development variable names
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY_ID`,
`CLOUDFLARE_SECRET_ACCESS_KEY`, `S3_API_ENDPOINT`; never substitute them for MEGA keys.

# P0 — Verified saves do not advance cloud cards or animate SUCCESS! (2026-11-02)

**Owner observation:** On installed REDOWN `CONSOLIDATED`, verified-looking saves do not increment the number on their cloud provider cards and no card SUCCESS! animation is visible. This is a release-blocking integrity and UX regression. The working falling energy balls are distinct and must remain intact.
**Status:** SOURCE REPAIRS IN PROGRESS / LIVE PROVIDER ACCEPTANCE OPEN. Do not close from DOM or storage mocks.
**Branch:** `CONSOLIDATED`; preserve the original V3 and flat-provider branches.

## Root-cause source findings
- Cloudflare native V3 right-clicks performed remote HEAD readback and set `receipt.verified`, but other R2 ingest paths recorded a successful Worker reply without an equivalent verified provider receipt. Since `providerSaveReceipts` correctly requires `verified:true`, their cards remained unchanged. Unified the remote exact-key, exact-size, ETag and source metadata HEAD verification before claiming Cloudflare completion.
- OneDrive's Graph adapter independently verifies the item ID, byte size, selected parent root, and drive identity. Its optional `webUrl` was nevertheless required by the legacy global counter through `delivered()`. The provider-specific verified receipt is now countable without relying on an optional web URL; no less verification.
- OneDrive provider previously swallowed local History/count record failures. It now holds the exact verified result with stable delivery ID for worker-restart reconciliation, never reuploads to recover bookkeeping.
- The Shelf's live `providerSaveReceipts` notification could be discarded while the Shelf/Chrome side-panel was briefly hidden; a Dropbox receipt could also be discarded before its linked connection state arrived. A bounded 20-second live-event handoff and correct idempotent consumption address those races; persisted hydration never replays historic animations.
- Neon numeric readouts previously displayed tiny and too narrow. New hot-pink square display is *behind the number only*, not the cloud card; keep the count prominent, tabular and shrink digits only if the 48px bezel needs space.

## Still outstanding
- No installed Chrome provider-confirmed live save and visible animation has been independently recorded for all four providers since these changes. Initial reports that the issue is fixed from code inspection alone were incorrect.
- Dropbox OAuth remains a separate P0; if Dropbox is not connected, do not fabricate a successful save or increment.
- Missing counter increments must be inspected by comparing `transferHistory`, `providerSaveReceipts`, `transferCounter`, provider-specific upload completion and History archival without editing user records or tokens.
- Google Drive uploads require independent verified Drive file readback. The feature must not silently count a transfer merely because its state says queued.
- Ensure the permanent count progresses monotonically with genuine new saves, remains over extension reload/restart, and deduplicates repeats by immutable delivery ID.

## Acceptance contract
1. Installed Chrome, Shelf visible, each provider: save a unique supported file, verify remote provider item/metadata, see the count advance **exactly once** and the correct transient theme SUCCESS! *inside* its actual card.
2. Neon: large alternating money-green/yellow SUCCESS!, 48x46px pink box behind each count, font shrinks only with more digits. Non-Neon: italic-serif letter-by-letter, two short flashes and a longer third beat. At rest no SUCCESS! text.
3. Upload failure, unsupported URL, cancelled OAuth, uncertain commit, pending upload, duplicate receipt, History hydration, theme switch, or Shelf reopen MUST NOT create a new increment or fake celebration.
4. Preserve global odometer (no reset), working energy balls, saved History, no third-party source browsing provenance disclosure and flat sibling menus.
5. Run targeted executable receipt→storage→UI tests and installed-Chrome test evidence. Record PASS/FAIL/NOT_TESTED honestly; do not conflate CI mocks with remote proof.

**Copy updates (owner approved):** top Shelf tab `REMOTES`; Cloudflare section `Your Privacy`; navigation back link `Back to Remotes`.

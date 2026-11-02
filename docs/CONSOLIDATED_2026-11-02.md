# CONSOLIDATED integration, November 2, 2026

Baseline: `codex/v3-parity-first-reconstruction` at `eada2c0e53132064cf63525b7be236104904515a`.
Additive source: `codex/flat-provider-native-menus` at `398ff8c306e7b625250fbcdb63f8db070e0047ad`.

## Recovered behavior
- Cloudflare remains the ONLY nested native REDOWN provider. Google Drive, Dropbox and OneDrive are direct first-level provider actions with no extra submenu.
- The shared V3 native writer remains the ONLY menu registration authority. The menu generation key is versioned to invalidate the previously acknowledged nested menus, and old child IDs are retired.
- Google Drive now uses the newer browser background/service-worker queue and stream rather than requiring the transfer page for each right-click. Its explicit Shelf login also connects in place. It uploads to My Drive root in this version; do not claim the REDOWN folder.
- Dropbox's direct leaf starts OAuth while retaining the clicked save; Shelf LOGIN can recover incomplete connection status. Its safe available filename selection is added without sharing more information with Dropbox.
- Dropbox proof version, account/namespace identity, server metadata, cryptographic content hash and verification-before-claim logic are preserved from V3. No unverified SUCCESS or odometer increments.
- OneDrive's working root upload and authentication internals are preserved, with only a leaf-menu dispatch adjustment.
- The current V3 `shelf-celestial.js` and existing falling energy balls, `shelf-save-feedback.js`, `save-impact.css`, odometer and theme-specific success choreography remain. The unwanted "Verified · from this update" caption is removed and a smaller count moves after each Free GB chip, before the three-dot control.
- Google Drive verified receipt identity is mapped to the V3 `google` provider counter key. Source and page provenance stays within REDOWN history; it is not sent to Google Drive or Dropbox.

## Important testing boundary
Source parsing and static integration checks were performed when building the commits. Live installed-Chrome OAuth, actual provider remote save receipts, menu rebuilding on existing Chrome state, and full repository tests have not been executed through the GitHub connector. These are NOT marked verified. Test with an unpacked extension after switching to CONSOLIDATED and reloading Chrome; inspect the existing Chrome extension errors before any release claim.

Original `main`, `codex/flat-provider-native-menus` and `codex/v3-parity-first-reconstruction` remain untouched.

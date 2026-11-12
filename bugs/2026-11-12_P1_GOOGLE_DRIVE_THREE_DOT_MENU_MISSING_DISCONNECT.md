# P1 — Google Drive three-dot provider menu omits Disconnect

**Owner report:** 2026-11-12, after REDOWN `main` pull to `7b7f6d1`.  
**Status:** **OPEN — owner-observed; absence independently confirmed by source inspection, no fix made.**  
**Priority:** P1 functional UX/parity; may obstruct consent recovery and account management.

## Observation

The **Google Drive (···) provider menu does not offer “Disconnect”**, unlike the Dropbox and OneDrive menus. The user specifically looked for the option while investigating broken OAuth refresh behavior.

## Confirmed source difference

- `extension/shelf.html` Google `.destination-options-menu` currently contains only `#shelf-google-folder` (Open REDOWN folder) and `#shelf-google-status`; **no Google Disconnect button exists in the markup**.
- The Dropbox equivalent includes `#shelf-dropbox-disconnect` and OneDrive includes `#shelf-onedrive-disconnect`.
- `extension/shelf-google-drive.js` wires `googleDriveCancel` but no Google Disconnect control; `extension/google-drive-provider.js` only lists `googleDriveOpen`, `googleDriveStatus`, `googleDriveCancel` as trusted message types. **There is no exposed provider disconnect command in this adapter.**
- This is a real source-level feature gap. It does **not** prove the absent Disconnect caused today's no-popup issue.

## Expected behavior

- Provide a clearly named **Disconnect Google Drive** option inside Google Drive's three-dot menu when connected, consistent with the other cards.
- Implement via the **existing trusted provider auth/connection owner and authorized message contract**, not ad hoc UI storage deletion. Clearly describe whether Disconnect removes the local OAuth/session grant, what happens to saved configuration, and how to reconnect afterward.
- Do not silently delete saved destinations, History, verified receipts, pending/uncertain jobs or cloud files. Never revoke the entire Google account or unrelated grants merely to update a visual status.
- Expose an explicit, non-destructive confirmation if disconnect has broad effects, and distinguish *disconnect account* from *cancel current transfers*.
- Preserve GO TO, ↻ authorized refresh, existing identity binding and account-switch protections; add positive and negative test cases covering keyboard, Shelf and restart.
- **No forced disconnect is required to investigate today's OAuth issue.**

**Related:** `CRITICAL/2026-11-12_P0_ALL_PROVIDER_RECONNECT_CONTROLS_FAIL_TO_OPEN_EXPECTED_OAUTH_RECOVERY.md`.

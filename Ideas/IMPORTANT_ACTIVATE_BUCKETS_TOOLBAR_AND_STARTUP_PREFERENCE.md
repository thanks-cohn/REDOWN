# IMPORTANT — Activate Buckets beside Refresh, with SNES-inspired readiness signals

**Project:** REDOWN / `thanks-cohn/REDOWN`
**Branch:** `beta-explorer`
**Date:** 2026-10-30
**Status:** Source changes committed. Installed Chrome and live Cloudflare acceptance not yet performed.

## Owner's requested interaction

Replace the distracting sidebar bucket/destination selection controls with one prominent **Activate Buckets** button immediately next to **Refresh** on the Explorer toolbar. Keep Refresh strictly a read-only refresh/recovery action; never conflate it with Cloudflare Worker provisioning or public access.

The Activate Buckets button discovers accessible R2 buckets across connected accounts. A saved **preferred startup bucket** is used first when deciding where to start and which bucket to check first. REDOWN must not silently prepare every bucket on load: clicking **Activate Buckets** displays confirmation before any required Worker writes. Already-ready Workers are verified and reused rather than needlessly redeployed; unprepared or stale buckets may be explicitly prepared with the existing `prepareBucket` API.

Move **Saved Destinations**, the available bucket navigator, and individual destination setup controls into the **Settings** drawer rather than crowding the primary sidebar. Settings must offer a stored preferred startup bucket selector populated from discovered accessible accounts/buckets, including an automatic fallback. The selection is not itself permission to make a bucket public.

## Delightful state feedback, not continuous visual noise

- **Amber** glowing outline + short stepped SNES-style flash when accessible buckets need REDOWN setup.
- **Blue** during active verification/preparation.
- **Green** only when every discovered accessible bucket has been verified ready in this session.
- **Red** when one or more buckets failed verification/preparation.
- **Neutral** when saved profiles exist but Worker readiness has not yet been verified, or when storage discovery is incomplete.
- Honor `prefers-reduced-motion`. Do not loop the alert indefinitely. Keep readable accessible text/labels and a pending bucket count.

**Refresh** retains its existing independent warning indicator for connection/discovery errors.

## Implementation footprint and safety semantics

- `extension/beta/explorer.html`: new toolbar button beside Refresh; old selectors moved into Settings, with startup preference.
- `extension/beta/explorer.css`: stateful SNES-inspired appearance, reduced-motion support, responsive settings.
- `extension/beta/bucket-activation.mjs`: pure account-scoped discovery/preference/state/priority helpers.
- `extension/beta/explorer.mjs`: save preference locally; choose preferred bucket at startup (or last location/first accessible), scan buckets sequentially on explicit confirmation, report partial failures, check Workers, prepare missing configurations, keep Refresh independent.
- `extension/beta/r2-adapter.mjs`: expose the true owning bucket separately from a profile's preferred save destination so activation state does not confuse the two.
- `tests/beta-bucket-activation.test.mjs` and `tests/beta-explorer.test.mjs`: pure logic checks and a UI scenario for no-automatic-provisioning/confirmed activation.

The activation action must **not** call `cfEnablePublicAccess`, publish objects, erase files, or activate paid Cloudflare subscriptions. All Cloudflare provisioning remains constrained by the existing authenticated service and an explicit user confirmation. Cloudflare account/R2 subscription activation remains a separate Cloudflare onboarding concern.

## Verification and remaining limits

Source syntax and pure bucket-selection/state scenarios were checked in the current implementation session. **Full Node tests, live Chrome, and live R2 Worker acceptance were not available**; the feature is not certified for production. On a future installed-Chrome verification, test disconnected state, empty inventory, multiple accounts, preferred-first ordering, ready/needs-repair/missing Worker, cancellation, partial failure, Chrome context-menu rebuild after profile change, keyboard focus, narrow viewport, and reduced-motion animation.

Do not confuse **configured** with **verified ready**. The initial state may be neutral until an explicit check; missing saved profiles can reliably prompt attention without background provisioning.

## Follow-on idea

If a future account has hundreds of accessible buckets, consider a confirmation dialog where the user can activate **only the preferred bucket** or **all discoverable buckets**, rather than running potentially many Worker deployments. No silent cost-incurring behavior or extra cloud writes should be introduced.

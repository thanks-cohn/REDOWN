# Bucket selection opens Explorer — 22 October 2026

Starting remote main: 71e7efc6fadd239e16db80c4e1e3eff412e6408f.

After a primary Storage bucket button finishes selecting an existing configuration or preparing a new destination, an ok result opens that exact account/bucket root through the existing goLocation path. Missing Explorer inventory is refreshed through the existing reader first. The Explorer section is brought into view with reduced-motion preference respected and receives keyboard focus without a second scroll. Folder listing and error feedback remain owned by existing Explorer navigation.

Cached selection does not deploy or repair a Worker and does not turn its amber/unverified state into a verified success. The inset repair control remains independent and does not perform the new automatic navigation. A navigation failure does not mark successful bucket setup as broken; it reports a separate Explorer-opening error.

Account/list generation and connected-element checks reject stale setup results. Pointer or keyboard interaction inside Explorer while setup is pending preserves the user's newer intent. Temporary event listeners are removed in finally, including canceled/error paths.

Verification: options/debug/storage DOM suite 18/18; new coverage includes waiting for completion, cached selection, exact account/bucket/root, repair separation, failed setup, refreshed lists, newer pointer/keyboard interactions and separate navigation failure. Full local suite 327 tests: 320 pass, seven known baseline failures, zero new failures. Overall remains partial, not release-certified. Installed Chrome/provider and native scrolling acceptance remain pending; no cloud resources were changed for testing. Presentation and settings are unchanged. The isolated Vision preview is separate from this implementation.

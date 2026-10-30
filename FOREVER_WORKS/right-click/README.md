# Right-click systems: source-backed preservation audit

**Indexed partial audit**, 30 October 2026. Source revision **e621ef2dcf11cad3042e5b268a83470df606b85d**, branch release/cloudflare-true-remote, extension 0.5.27. No production behavior, canonical model, frozen evidence, customer profiles or provider resources were changed. [Handoff](HANDOFF_LATEST.md) records delivery and unfinished work.

The cloud workspace became unavailable at approximately minute 15, after source/history inspection, tests and standalone layout captures. These chapters were recovered from inspected source and session observations through GitHub. Local raw logs, screenshots and the longer uncommitted draft were inaccessible at delivery. Their results are identified as session observations, **not fabricated attachments**. Recover them if the workspace returns; do not replace richer local work blindly.

## Ten-minute reading route

1. [Purpose and invariants — Map P](PURPOSE_AND_INVARIANTS.md).
2. [Four surfaces](SURFACE_INVENTORY.md), [Legacy source](LEGACY_SOURCE_MAP.md), [Modern source](MODERN_SOURCE_MAP.md).
3. [Wiring/state — Map W](WIRING_AND_STATE.md), [runtime/security](CHROME_RUNTIME_AND_SECURITY.md).
4. [CSS/presentation — Map V](PRESENTATION_AND_CSS.md), independently from routing.
5. [Feature comparison](SIDE_BY_SIDE_MATRIX.md), [tests/gaps](BEHAVIORAL_TESTS_AND_GAPS.md).
6. [Future API proposal](RIGHT_CLICK_API_READINESS.md), [reconstruction drills](COLD_AGENT_RECONSTRUCTION.md), [documentary source index](SOURCE_INDEX.json).

## Evidence rules

**SOURCE_INSPECTED**, **LOCAL_TEST_PASS**, **LOCAL_TEST_FAIL**, **HISTORICAL_REPORT**, **OWNER_INTENT**, **INSTALLED_BROWSER_VERIFIED**, **LIVE_PROVIDER_VERIFIED**, **INFERENCE/UNKNOWN** classify provenance. PASS / FAIL / PARTIAL / BLOCKED / UNSUPPORTED / NOT_TESTED classify outcomes separately. Unless marked otherwise, implementation statements are SOURCE_INSPECTED at the pin. There are **no installed-browser or live-provider verified observations** in this audit.

Current scoped local results: focused **88/85/3** total/pass/fail; full regression **686/634/52**. Reliability fails. Structural Forever model validation passes; combined published-schema/source check reports222 source-drift occurrences across253 records and no other errors. See [verification limits](BEHAVIORAL_TESTS_AND_GAPS.md).

## Existing Forever Works authority

Cross-reference, do not duplicate: [destinations capability](../../forever/capabilities/redown.capability.destinations.json), [invariant](../../forever/invariants/redown.invariant.destinations.json), [implementation](../../forever/implementations/redown.implementation.destinations.json), [destination-state compatibility](../../forever/compatibility/redown.compatibility.destination-state.json). These are inferred/unreviewed at **424f29e5a4216085fa24ffd1a48b79f4123d6f8f**, not this release. Presentation capture uses **31fdbee412361c1d4e01d24929960e6e39aa1a84**. Neither older test counts nor hashes certify current behavior.

Actual installed upstream: [UPSTREAM.json](../upstream/forever-works/UPSTREAM.json), Forever schema/model0.1 and Public API0.1 at **f76056aa59942935cad5ab53f26a78cefedff77d**. [Policy](../POLICY.md), [traceability](../TRACEABILITY.md), [presentation preservation](../CONSUMER_PRESENTATION_PRESERVATION.md) and [Creators Notes](../CREATORS_NOTES.md) retain their authority distinctions. No canonical JSON was proposed or inserted. SOURCE_INDEX is a non-normative navigation index, not a new Forever record kind.

## What the source establishes

Modern is the active destination-definition editor through guarded background save, while Legacy is a storage/preferences surface with obsolete menu callbacks retained. Explicit Modern activation/dedicated setup can seed definitions; Chrome's checkbox writes mode. Profiles own the saved model; a freshly resolved ID owns the click target. Shared menuEntries provides flat Simple and immediate-parent Nested plans. Red × removes menu definitions, never cloud storage.

Current restored compact presentation differs from the superseded four-region studio. Preview code exists but the restored HTML has no destination-preview host. Saving can succeed while native rebuilding fails; native registration, rendering and cloud completion remain separate truths.

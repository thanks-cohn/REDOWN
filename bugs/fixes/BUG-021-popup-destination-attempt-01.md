# BUG-021 — Popup destination readability and persistence

Attempt: 01. Recorded: 2026-10-23T01:22:59.357890+00:00. Baseline main: b53faab4be029501102e8b3e523ec1e46ba1da97. Version: 0.5.19.

Owner reported folder dropdown options rendered white on white and requested all connected buckets plus persistent destination choices. Native folder selects inherited a light text treatment without a matching native option background. The popup previously loaded only saved profiles and did not persist its destination state.

Fix: explicit black-on-white native folder controls/options; existing read-only account and bucket discovery; serialized local destination preferences; paginated restoration with stale-operation guards. Missing remembered destinations block Send and request an explicit choice. Refresh retries discovery. Newly selected buckets use existing setup only when Send is requested. No automatic provider mutations on opening.

Verification: 44 focused tests passed; Explorer smoke 205/205; full suite 358 tests, 351 passes, seven retained baseline failures, zero new failures. DOM/message/provider mocks and in-memory Worker checks are automated source evidence, not installed Chrome or live Cloudflare certification. Native Windows select rendering and end-to-end delivery remain owner acceptance tasks.

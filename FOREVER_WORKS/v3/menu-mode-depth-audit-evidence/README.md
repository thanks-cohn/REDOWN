# Reproduction and evidence boundary

Source commit `10bd512093e44f09d0b60676f89d1688c44b82ff`. Run from repository root with Node and repository dependencies installed:

```sh
node FOREVER_WORKS/v3/menu-mode-depth-audit-evidence/reproduce.mjs
node --test tests/right-click-v3.test.mjs tests/history-go-to.test.mjs
npm run reliability:check
```

- reproduce.mjs is an audit-only, nonproduction harness. It executes unchanged V3 domain and sliced actual REST listing adapter with synthetic cloud responses. projections.json contains A–G current Simple/Narrow full descriptors, exact inputs, subfolder Level calls and REST normalization output. regenerate projections.json before interpreting changed source. reproduce.log records successful assertions.
- source-index.json pins required source SHA-256 hashes and relevant lines. Review the full functions at the pinned commit; anchors are navigation, not a complete call graph.
- focused.log: 54 pass, 0 fail, including existing DOM, sliced transaction, cache, routing and state tests. None establish installed Chrome or live R2 behavior.
- reliability.log/json: 621 pass, 69 failed names, incomplete. Syntax, API registry, issue inventory pass; architecture freshness fails. Same 69 failed names as archived History implementation full run, no added failed names (regression-comparison.json). Runner's newFailures is relative to its older registry baseline, not the previous Work delivery. No historical hashes/assertions were changed.
- onboarding logs and forever-describe.log: read-only repository entrypoint output; no provider operations.
- tags-before.txt/tags-after.txt and preservation.json: protected refs unchanged, zero production diff. This repository-backed deliverable is committed with the project, not a separately stored copy.

No browser was installed/used and no live cloud request or mutation was made. Native Chrome projections are descriptor evidence, not rendered screenshots. Timeout and revoked authorization paths in existing tests are synthetic. Official documentation references and exact source policy differences are in the audit.

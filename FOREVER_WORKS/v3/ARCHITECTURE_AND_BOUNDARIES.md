# V3 foundation — 30 October 2026

Owner scope correction `244138c6602de4276db5adc4df079e221cc4d9f4` was adopted by fast-forward before the implementation commit. This is only a Right-click subsystem rebuild. Explorer, History, URL, Cloudflare and transfer engines are preserved. The sole shared transfer integration adds the existing Worker byte count to the internal receipt so the new right-click caller can verify completion; request/transport/URL behavior is unchanged. Package closure changes are necessary to load the new setup and Settings.

Implementation on `codex/v3-parity-first-reconstruction`, starting at `bfbca3b185e1e81b81910c2fb2df7a7d3d99f79e`. This is implementation evidence, not accepted Forever intent or release certification. Historical checkpoints, tags, frozen catalogs and the release branch are not rewritten.

The only active setup mount is `beta/explorer.html#v3-setup`. Fresh `right-click-v3-ui.js` and `right-click-v3.css` own its DOM, events, view state and scoped styling. They do not import either previous editor. Account → bucket → folder hierarchy is rebuilt from canonical V3 destination identities. Options links to that surface and retains ordinary storage/domain preferences.

`right-click-v3.js` owns validation, projection, click resolution and subtree deletion. `background.js` owns the serialized store transaction, engine selection, native registration and the existing transport/history path. `right-click-legacy.js` delegates release Simple/Nested planning/resolution to the retained runtime modules and supports engine-only pre-v1 `menuTree` records. It never creates a setup view or migrates saved records. Old unsafe deep flattening is not restored.

V3 uses `rightClickV3`; Legacy uses existing `profiles` menu fields and `rightClickMode`. Missing engine selection defaults to Legacy. No automatic menu import, no cross-engine save, no automatic release-behavior replacement. Activation may update infrastructure profiles through existing flows; it is separate from menu definition commits.

## Non-negotiable URL preservation

`public-addresses.js`, `cloudflare-api.js`, `beta/explorer.mjs`, `explorer-status.js`, URL persistence, domain configuration and public-enable handlers remain unchanged. The URL portion of `quick-links.js` is retained; only its old dedicated setup controller is removed, and its existing account control is moved into the URL tab. Existing Yes/No public-access consent and exact object-key encoding remain. See `evidence/url-preservation.json` for byte comparisons of complete shared files and background URL functions. No Worker source, URL internals, permissions or manifest changes.

Future providers are deferred. The first implementation is R2-specific and uses existing prepared profiles and remote ingestion. No provider framework, billing layer or replacement Explorer is introduced.

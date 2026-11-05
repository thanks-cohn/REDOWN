# Controlled Chutey / REDOWN visual and interaction evidence

These captures run the actual tracked Chutey view and REDOWN Shelf DOM. Cloud,
native and Chrome messaging interfaces are mocked. They are not installed
extension, live destination, native Windows or physical low-RAM proof.

Equivalent component widths/heights are used; Chutey's local-folder consent strip
is hidden for the read-view comparison. Images are synthetic white 1px PNGs.

| Shelf width | List + inline preview | Grid + completed-row preview | Full Shelf |
|---|---|---|---|
| 320px | [Pair](parity-320-list.png) | [Pair](parity-320-grid.png) | [Shelf](shelf-320.png) |
| 360px | [Pair](parity-360-list.png) | [Pair](parity-360-grid.png) | [Shelf](shelf-360.png) |
| 390px | [Pair](parity-390-list.png) | [Pair](parity-390-grid.png) | [Shelf](shelf-390.png) |
| 540px | [Pair](parity-540-list.png) | [Pair](parity-540-grid.png) | [Shelf](shelf-540.png) |
| 700px | [Pair](parity-700-list.png) | [Pair](parity-700-grid.png) | [Shelf](shelf-700.png) |
| 900px | [Pair](parity-900-list.png) | [Pair](parity-900-grid.png) | [Shelf](shelf-900.png) |

Themes: [Porcelain](theme-porcelain.png) · [Midnight](theme-midnight.png) · [Ocean](theme-ocean.png) · [Neon](theme-neon.png).

The reproducible harness is `scripts/shelf-mini-explorer-browser.mjs`.
`browser.json` contains dimensions, assertions, original File bytes/name/MIME,
listing/render measurements and explicit fixture classification. `source-hashes.json`
pins the source content. `regression-comparison.json` compares every failing test
name before and after; `baseline.log` and `final.log` retain the exact local runs.
`reliability.json` retains the existing policy's failure classification; its old
seven-failure baseline must not be mistaken for the fresh 111-failure baseline.
`installed-chrome.json` records the read-only administrator policy blocker.
`package.json` is an audit-only runtime inventory; no release artifact is published.

See [implementation and outstanding gates](../CHUTEY_PARITY_IMPLEMENTATION.md)
and [one-install worker RFC](../RCOMPLEX_UNIVERSAL_WORKER_RFC.md).

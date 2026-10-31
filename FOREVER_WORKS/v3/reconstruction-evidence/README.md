# Reconstruction regression evidence

Local Linux / Node tests, synthetic Chrome storage/menus and provider fixtures.
No installed-browser or live-provider pass is implied.

- `focused.log`: `node --test tests/right-click-v3.test.mjs tests/history-go-to.test.mjs`, **66 pass, 0 fail**. Existing tests adapted only where owner semantics intentionally changed; Simple, tree interactions, exact receipts and failed-row DOM preservation remain asserted. New tests include combined real UI/dispatcher/transaction and lost reply, literal Unknown request, equal-prefix and inferred-path cases, bucket authority, depth boundary, root fairness, running-tab reuse, new-instance reuse and latest selection.
- `reliability.log` / `reliability.json`: `npm run reliability:check`, **633 pass, 69 failed names, incomplete**, exit 1. Syntax, registry and issue inventory passed. Architecture freshness failed. No additional failed names compared with published audit; see `regression-comparison.json`. This comparison is against archived audit results, not a freshly rerun pristine checkout. Frozen evidence hashes/assertions were not updated to conceal failures.
- `installed-chrome.json`: existing isolated script, **blocked CHROME_NOT_AVAILABLE_ENOENT, zero assertions**. No native menus, real tab/panel lifecycle, rendered visual, keyboard/screen reader or MV3 suspension acceptance established.
- No live Cloudflare reads, writes, deployment, bucket/public changes or customer-data testing performed.
- `preservation.json`: unchanged History DOM source/CSS, Options, manifest, provider/public URL/Legacy/archive modules and exact existing tree-rendering, preview-rendering and Cloudflare prefix-ingest functions, against starting branch commit.
- `source-hashes.json`: final changed source/test hashes. `protected-tags.json`: unchanged protected tag object and peeled commit IDs.

Remaining acceptance: approved installed Chrome and authorized disposable R2
hierarchy, actual depth/menu rendering, parent/leaf saves, Keep Both, multiple
windows/panels, repeated GO TO with delayed reads, true MV3 suspension, visual
geometry and accessibility. Native budgets intentionally omit excess inventory;
status must remain partial. Stored frontier is diagnostic, not resumable indexing.

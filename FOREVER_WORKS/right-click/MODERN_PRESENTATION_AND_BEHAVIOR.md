# Modern restored presentation and observed clarity losses

[Route](README.md) · [Map V](PRESENTATION_AND_CSS.md) · [owner direction](OWNER_DIRECTION_2026_10_30.md)

Current 2e65ba137a35e1656b691fd2fdbf95082a0cdf4e, compact restore947b0cc/0c39d30 retained later safety wiring and red controls5913a5c/9272fe2/b981b68. Four-region/480px studio material is historical. No CSS or product code changed.

## DOM/cascade facts

#quick-panel-setup contains flex-wrapping destination toolbar (mode/profile/+Location/Save/Reload), live status, scroll stage, Simple auto-fit grid and Nested host. Optional dedicated setup is initially closed. Entry/group details hide secondary label/order/create actions. Simple red × is direct header child; Nested group × sits top-right absolute inside heading padded42px; root/child × sits in actions. Removal controls explicitly opacity1/visible and34×34px, danger token, hover/focus/active/reduced-motion states. Scoped hidden!important suppresses inactive/collapsed rows irrespective of red-control visibility.

Later .destination-card-head gap10px overrides earlier5px. Nested details :has(summary) display:block overrides older flex layout. Stage clamp260px/45vh/520px max65vh scrolls. Auto-fit card minimum uses min(100%,360px); Nested rows wrap, indentation guides reset below data-depth2. Current theme tokens own panel/text/accent/danger; options.html CSS is in a different document. There is no active studio container-query layout at480px.

[destinations.js:9 function renderPreview](../../extension/beta/destinations.js#L9) checks for destination-preview and returns; restored HTML has no such element. That is source-confirmed dormant preview, not a routing exception. Tests that inject host prove fixture plan parity only. Modern Nested headers/meta columns are generated then hidden by CSS; renderer/source existence is not screen visibility.

## Where Modern loses clarity

| Observation | Concrete basis / outcome | Evidence boundary |
|---|---|---|
| UI appears configured before saved | D1 card count3 while saved/native destinations2 | LOCAL_TEST; not categorical owner causal proof |
| Mixed immediate/draft effects | Mode persists immediately; folder creation is remote now; add/remove/label wait Save | SOURCE+LOCAL_TEST; owner mental-model risk |
| Default name violates owner direction | D6 files vs bucket art; New location explicitly seeded | OWNER_REPORT/LOCAL_TEST, confirmed naming mismatch |
| Hidden readiness blocks migration Save | D2 collapsed imported child remains unready until discovery | LOCAL_TEST; do not fix by inventing ready:true |
| Success status replaced by draft warning | D5 mode saved nested, text Unsaved changes | LOCAL_TEST/three-focus failure |
| Superseded visible preview absent | No host after restore, renderer returns | SOURCE; not proof native plan absent |
| Controls/complexity feel cluttered | Owner directly reports unattractive clutter, wants minimal intuitive aesthetic; outline is positive | OWNER_REPORT, not measured universal aesthetic failure |
| Small red controls/focus risks | Fixed34px; Simple removal rerenders without explicit post-remove focus; Nested group/last-root do focus | SOURCE; no44px compliance or screen-reader pass claimed |

Preserve visible red ×, mode/definitions/hierarchy, exact paths and useful folder outline. Owner asks to reduce visual clutter later, but no redesigned replacement is authorized now. Any future label-policy change must be independent from target prefix and receipt semantics.

## Captures

Current [wide Simple](evidence/phase-2/wide-simple.png), [narrow Simple](evidence/phase-2/narrow-simple.png), [constrained Simple](evidence/phase-2/panel-simple.png), [wide Nested](evidence/phase-2/wide-nested.png), [narrow Nested](evidence/phase-2/narrow-nested.png), [constrained Nested](evidence/phase-2/panel-nested.png); [computed measurements](evidence/phase-2/layout-measurements.json). Actual production renderer/CSS, synthetic mocked accounts/provider, no installed extension.

Six cases use1440×1000/320×800/wide-with320px wrapper; measured panels1100/273/320px, no document overflow in fixtures, red controls34px. Expanded eight-level tree yielded10 laid-out removal controls including scroll-hidden content. Not10 simultaneously onscreen. This verifies bounded rendering only; full Shelf, native flyouts, all themes, contrast, focus traversal, reduced-motion live state and assistive technology remain NOT_TESTED.

D9 confirms repeated account headings for two prepared profiles/buckets under the same account. Current renderer groups by profile, not unique account, and CSS hides meta; useful identity is available through root bucket selectors but repeated titles can add perceived clutter. This is a source/DOM clarity finding, not proof those groups are orphans. See differential JSON.

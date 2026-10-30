# Map V — presentation/CSS/layout, independently documented

[Route](README.md) · [Wiring](WIRING_AND_STATE.md)

SOURCE_INSPECTED declarations below are not measured geometry. OWNER_INTENT asks for visible red removal controls and preservation of aesthetics; current code does not prove preferred aesthetics. Standalone rendered fixtures were observed before workspace loss; screenshots/raw measurements could not be delivered. Installed rendering remains NOT_TESTED.

## Historical versus current composition

Legacy historical options.html used profile cards, Simple per-level select/create/actions and a three-column Nested selector/creator/actions hierarchy. This makes ownership explicit; “intuitive” still requires user evidence. Current Legacy shows storage preferences and delegation, not those editors.

Modern current uses compact restored toolbar, wrapping fields, scrollable stage and auto-fit cards. The four-region studio/480px container-query arrangement in the [structure handoff](../../docs/RIGHT_CLICK_STRUCTURE_HANDOFF.md) is historical after selective947b0cc/0c39d30 restoration. New routing safeguards, bounded indentation and later red controls remain. Shared renderer emits Nested headings/meta columns that Modern hides.

## Style ownership matrix

| Element | HTML/renderer | Owning styles/selectors | Tokens/states | Width/layout | Semantic cross-reference | Verification |
|---|---|---|---|---|---|---|
| Setup/tab panel | explorer.html quick-panel-setup, quick-links.js | explorer.css quick-links-panel/tabs/content:774+ | panel/line/text/accent, aria-selected/hidden | Existing panel wrapping rules, not active studio query | SurfaceB | Source; isolated fixture observed |
| Mode/toolbar | Static destination-toolbar/mode | CSS951–958 | bg/panel/accent-soft; aria-pressed thumb | Flex wrap; thumb32px translation/.16s; profile max230 | Immediate mode save, MapW | Source; reduced-motion rule |
| Stage/card grid | destination-stage/simple | CSS960–964 | panel/line/accent/shadow | clamp260px,45vh,520px; max65vh; overflow:auto; auto-fit min(min(100%,360px),1fr) | Presentation only | Source + fixture |
| Simple head/fields | renderSimple | CSS965–971;1206 overrides | muted path, weight650 | Head gap10 overrides5; fields wrap; label min120 | Draft updates | Source + DOM mocks |
| Simple × | head direct child destination-remove-x | CSS1218–1249 | danger55% border,9% fill,18% hover; focus2px/offset3 | Fixed34×34 min34; inline-grid; opacity1/visibility visible | Primary suppression/option remove | Red-X tests; fixture measured34 |
| Nested group × | nested-heading | CSS975+,1208–1215 | danger/line/panel | Heading wrap/min36/padding-right42; absolute top0/right0 | Clear roots + Undo | Source/fixture; long-label acceptance partial |
| Root/child × | nested-actions inline-remove | CSS1216–1249 | Same red family | Row wraps; actions auto-left margin/shrink0/gap8 | Remove root/branch | Source/removal mocks |
| Tree ancestry | shared nested-choice/children/data-depth | CSS978–986,1187–1190 | line/muted | choice min160; indent margin10/padding16; descendant children below data-depth2 reset guides/indent | Selection/collapse | Eight-level model; fixture expanded to8 |
| Disclosures | details/summary | CSS997–1000,1201 | muted/accent focus | Later :has(summary) display:block overrides old flex; input100% | Label/order/create reveal | Named-control fixtures |
| Creator | destination-inline-create/Nested form | CSS1180–1189 | panel/line/status | Flex wrap; input basis170/max320; hidden explicit | Real creation, MapW | Submit/cancel mocks |
| HTML folder picker | RedownDestinationMenus | CSS988 .context-menu.explorer-submenu | panel/text/line | Fixed z1000,min210/max320,max45vh,scroll | Selection only | Keyboard/paging fixtures |
| Legacy Simple rows | Historical options constructors | options.html311–316 | Legacy line/focus | Desktop5 columns; <=650 selectors/inputs full span, actions below | Historical segment clear/Create/+Child | Historical source; isolated fixture |
| Legacy Nested | Shared historical renderer | options.html374–388 | Fixed navy + tokens | Three columns;<=800 two with actions full-row;<=520 one | Historical controls | Source/fixture; no active Modern cascade |
| File-grid menu | menu#context/showMenu | explorer.css #context | panel/text/enabled state | JS clamps to viewport actual offset dimensions | SurfaceD mutations | Separate from native menu |

Options inline styles do not cascade into explorer.html. Shared class names do not imply one stylesheet. Modern theme attributes override text/panel/accent/danger; no measured contrast ratio or all-theme certification exists. Global focus-visible outlines and native control semantics help but do not establish full accessibility.

## Visibility, focus and interaction risks

Default Simple card: menu label + visible red ×, account/bucket/Choose folder/path, Entry options summary. Order/root/folder creation are secondary disclosures. Nested: title/include/group options/×, root selector/collapse/Add child/×; children initially collapsed. Each **rendered row/card** has removal without hover, but hidden collapsed descendants do not appear. Scoped hidden!important defeats ordinary display rules.

Later more-specific removal selectors override generic button padding. Hover/focus/active states and reduced-motion disable scaling/transition. Group removal focuses Undo; last-root removal focuses +Location. Simple rerender removal lacks explicit focus placement, so keyboard focus preservation remains a risk. Fixed34px target must not be called44px touch compliance. No ARIA tree-navigation contract follows from indentation alone.

Missing locations become unready/Previous entry text; hidden DOM is not deleted configuration. Empty states are explicit; preview code without host must not be claimed visible. Theme-dependent contrast, full Shelf scroll containment and long-label collision remain acceptance work.

## Observed standalone rendering — raw assets blocked by workspace loss

Chromium154.0.8037.57, Linux, synthetic profiles and mocked Chrome/provider. Production renderers/CSS loaded in isolated HTTP fixture, **no extension installed**, no provider requests. Modern cases used porcelain theme; historical515c272 fixture used its inline options CSS, shared historical Nested renderer and extracted Simple primary constructor. Fixture wrapper applied body display:block,16px padding, max1100 panel, optional320px panel, so these are not full-app measurements.

| Case | Viewport | Measured panel | Observed document horizontal overflow |
|---|---|---|---|
| Modern Simple/Nested wide |1440×1000|1100px|None in fixture |
| Modern Simple/Nested narrow |320×800|273px after wrapper/scrollbar|None in fixture |
| Modern Simple/Nested constrained |1440×1000|320px|None in fixture |
| Historical Legacy wide/narrow/constrained |Same three cases|1100/273/320px|None in fixture |

Modern removal controls measured34×34px, opacity1/visible. Expanded eight-level Nested yielded10 laid-out removal controls (group+root+8 children), including controls outside stage scroll viewport; this is **not10 simultaneously visible onscreen**. Screenshot inspection showed a narrow scrolling panel, wrapping toolbar and separate group/root removal controls. Historical wide fixture visibly separated dropdown, new-name input, Create, Child and Remove. These session observations are LOCAL_TEST_PASS for bounded fixture geometry, **PARTIAL evidence delivery**: inaccessible PNGs/JSON are not attached and cannot be independently inspected from this commit.

## Reproduce/complete acceptance — NOT_TESTED in installed Chrome

Use administrator-approved extension environment and synthetic/disposable state. Capture1440×1000,960×800,480×800,320×720, plus actual320/480px Shelf panels inside a wide viewport. Record actual panel width, theme, zoom/DPR/font/computed styles. Include empty/many cards, eight levels, long/duplicate names, × resting/hover/focus/disabled, collapsed/expanded rows, creator Escape, picker edge-fitting, keyboard/reorder/remove focus and scroll. Repeat supported themes, reduced-motion, screen reader and touch review. Capture native Chrome menu independently: **REDOWN CSS does not position Chrome flyouts**.

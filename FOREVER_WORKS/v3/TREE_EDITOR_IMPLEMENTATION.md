# Conventional V3 tree editor, 30 October 2026

Bounded implementation on `codex/v3-parity-first-reconstruction`, starting at `0e33d7ef9a477652a2fd25e2bd831e00d8dc4e03`. Protected `right-click-v3-before-tree-ui` remains `7f127abe9fcc2fa275e645cfc53c1c3a658a616d`.

## Decisions and primary references

- [WAI-ARIA APG tree](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/): tree/treeitem/group, expanded state, selection distinct from inclusion, roving focus, arrows, Home/End and first-character matching.
- [Fluent 2 tree](https://fluent2.microsoft.design/components/web/react/core/tree/usage/): compact indentation, folder icons, truncated labels with full paths, contextual secondary actions. Always reachable buttons and native More disclosures retain keyboard/touch access.
- [Windows File Explorer](https://support.microsoft.com/en-gb/windows/experience/fileexplorer/file-explorer-in-windows) and [Microsoft rename](https://support.microsoft.com/en-us/office/collab-files/rename-a-file): select rows, F2 and explicit Rename, visible Delete.
- [Finder rename](https://support.apple.com/en-mt/guide/mac-help/mchlp1144/mac): explicit editing followed by Return confirmation. F2 is the cross-platform editor shortcut here; Finder's Return-to-begin-rename shortcut is not adopted.
- [VS Code Explorer](https://code.visualstudio.com/docs/editing/getting-started/userinterface): familiar hierarchy, folder search and contextual row operations.

These inform behavior, not a visual clone. No dependencies added. The earlier phase-3 wiring blueprint and V3 domain/engine contracts were inspected. Their older Save-button proposal is superseded by this user's autosave requirement.

## Source-backed changes

| File | Reason |
| --- | --- |
| `extension/beta/right-click-v3-ui.js` | Replace destination cards with selected, expandable account/bucket/destination rows; read-only paged cloud folder tree; contextual inline add form; rename confirmation/cancellation; inclusion, sibling reorder, consequential subtree deletion and Undo. Serialized autosave snapshots use acknowledged revisions, distinguish registration failure, retain unknown/stale outcomes and block automatic replay. Session recovery retains confirmed edits until acknowledgement. |
| `extension/beta/right-click-v3.css` | Replace old card rules with scoped compact tree geometry, visible red Delete, focus/selection, responsive actions and contextual More disclosure. |
| `extension/beta/explorer.html` | Only V3 panel: remove manual Save, add Retry and Cancel, hide add form until contextual +. Shared Explorer and URL markup otherwise preserved. |
| `tests/right-click-v3.test.mjs` | Migrate two obsolete card/manual-save UI cases to accepted tree/autosave behavior; add rapid-edit serialization, stale-revision retention and keyboard-focus assertions. Existing domain, background, engine, routing, URL and packaging assertions remain. |
| `FOREVER_WORKS/v3/tree-editor-evidence/*` | Exact local logs, provisional regression classification, browser failure and a repeatable visual harness. |
| `FOREVER_WORKS/v3/HANDOFF_LATEST.md`, this document | Current limitations and next acceptance steps. |

No background, canonical model, authentication, transfer, History, URL, Explorer implementation, neon intro or other tabs changed. Existing background revision validation and parent-first acknowledged registration remain the engine boundary. V3 never dispatches cloud creation/deletion. Folder discovery uses `cfDestinationFolders` only. Inclusion follows existing disabled-ancestor semantics; child destinations are preserved in the model.

## Remaining acceptance work

This is an implementation increment, not completion of all requested acceptance gates. Search filters known destinations and loaded folders; it is not a recursive server search. The add picker filters one returned page; complete paginated browsing is available in the tree. Folder discovery is explicit through Browse folders and lazy folder expansion, not automatic exhaustive loading. Root/bucket naming and inclusion remain destination-only. Undo is one-session configuration undo. Recovery offers restore/discard, not automatic multi-window merging. Saving and updating Chrome share one pending status because the existing API acknowledges both together.

No new screenshots: Chromium is absent and Playwright download returned invalid/truncated ZIPs. The retained earlier screenshots depict the old editor and must not be presented as current evidence. New harness is supplied for desktop/narrow rendering when a browser is available. Full theme, screen-reader, touch, depth, zoom and responsive visual acceptance remain untested.

## Future presentation proposal

Keep this single canonical version-1 destination store and stable IDs. A later presentation-only setting may select Simple (flat eligible destinations) or Nested (existing hierarchical projection). Neither mode may duplicate destination data or add another editor. Switching must preserve hierarchy, paths, enabled state, sibling order and all IDs. Define stable action IDs and test branch Send here semantics before implementing flat projection. This proposal changes no runtime behavior.

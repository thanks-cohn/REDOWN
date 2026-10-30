# Non-executing reconstruction blueprint

[Navigation](README.md) · [wiring contract](UI_TO_WIRING_CONTRACT.md) · [decisions](KEEP_REPLACE_DECISION_MATRIX.md).

**PROPOSED FUTURE INTERFACE ONLY. No implementation or API is delivered.** Build only after separate authorization; retain exact valid R2 contracts and independently prove any intentional policy delta.

## Composition and task ownership

Keep the current Right-click setup and Bucket URLs tabs with their separate panels and native tab keyboard behavior. Setup retains a compact wrapping toolbar: clear Simple/Nested switch, prepared owner selector for new entries, +Location, Save and Reload. The folder outline remains the primary Nested structure; actual parent ancestry and visible selected path stay legible. A view may simplify repeated labels and secondary controls, but necessary actions must remain reachable without arbitrary hiding.

Simple destination card: readable custom/automatic name and permanently visible red × in a clean header position; identifiable account and bucket; existing-folder picker; exact destination path; secondary entry options for order/root/Create. Do not show creation inputs until explicit Create action, and do not seed them from existing selection. Folder depth must not introduce native Simple submenu levels.

Nested account/profile group: meaningful account + bucket/profile identity, include toggle, discreet group options, visible red group ×. Outline root/child rows keep expand/collapse, existing location selector, exact scoped parent/path, Add child and permanently visible red branch ×. Root/child/group deletion affects menu draft only; preserve existing group Undo and empty states. A label is not a folder name. Identical account headings must not conceal distinct profiles or imply duplicates are safely mergeable.

Optional dedicated REDOWN bucket remains an initially collapsed separate setup path, visibly distinct from +Location and Create folder. Bucket URLs stays separate; domain and public-access controls never run as a side effect of menu save.

## Static documentary view sketch

```text
[ Right-click setup ]  [ Bucket URLs ]
Simple [switch] Nested    [Prepared account / bucket]  [+ Location]
[Save menu] [Reload]     Honest draft / save / Chrome update status

Simple: [name                         red ×]
        [account] [bucket] [Choose folder]
        bucket / exact / selected / path
        Entry options: order, Bucket root, Create folder

Nested: Account · bucket/profile           red × group
        [Include group] [Group options]
        ▸ bucket        [Add child]        red × root
          ▸ folder      [Add child]        red × branch
            child       [Add child]        red × branch
        Explicit Create folder at the relevant parent, with separate typed input
```

This is task grouping, not a mandated new multi-panel layout or pixel mock. Maintain coherent macOS-like restraint using existing tokens/font/spacing/focus/motion principles. Align controls, keep enough whitespace to show ownership, avoid duplicated cards and jarring overflow. Do not make destructive controls hover-only, tooltip-dependent, or Cloudflare-delete operations.

## Wiring substitutions permitted in the later task

Replace view composition and closure-local draft orchestration if necessary. Keep profiles as store; no new destination database. Keep C.project/signature/validate/resolve, M.initialize/path/setLocation/menuEntries and guarded background save/build/click/transfer. Existing `RedownNestedEditor.mount` may serve the outline through draft callbacks; if its DOM is replaced, retain the same data semantics and tests rather than reviving Legacy options callbacks. Source contract shows private/exported boundaries; no public Right-click API exists.

A label/bucket/folder/reorder/remove event updates only the draft. Save passes complete projection and original expected signature. Mode changes must preserve both layouts and current mode-only save semantics unless a separately reviewed behavior change replaces them. Include retains configuration; collapse changes visibility; delete removes definitions; these must never be conflated.

Validation should identify the exact unready row/ancestor and make it visible/focusable, including collapsed imports. Discovery can establish ready only from matching current identity. Loading, errors and latest save receipt should have separate ownership so readiness updates cannot erase registration failure. Pending controls need reconciliation after async unlock; current source has a regression history here.

## Responsive and accessible acceptance

Use wrapping and scrolling, not arbitrary concealment. Preserve all functions at viewport1440/960/480/320 and actual320/480px panels within wide windows; test long/duplicate account labels, many cards, eight-level trees, 200% zoom, all supported themes, keyboard-only traversal, clear focus after deletion/Undo, screen reader labels/status and reduced motion. Current prior captures used standalone wrappers and34px red controls; they do not certify this blueprint. Exact target-size/contrast requirements need review and measurement; no compliance pass is implied.

Modern CSS styles only editor and HTML picker. Chrome owns native flyout layout. Folder outline and Native Nested ancestry must agree structurally via the same model, but one does not prove the other works.

## Staged later implementation and stop gates

1. Freeze exact R2 fixture baselines/native descriptors/targets and resolve remaining naming/save-policy decisions; no schema/profile migration as incidental UI cleanup.
2. Build only the thin view/draft boundary against existing helpers/messages, preserving tabs/outline/red controls and authorization/effect separation.
3. Run existing focused fixtures plus required contract cases; preserve known baseline failures unless separately fixing their actual requirements. No Legacy whole-profile writer or new planner/resolver.
4. Prove no-resurrection and infrastructure merge/stale save/registration-failure handling, then authorized installed Chrome layout/native behavior, restart and two windows.
5. Only under separate provider authorization prove exact account/bucket/key/bytes and receipt/history; no new provider transport bundled with view replacement.

Stop if expected signature/identity would be rewritten silently, sender boundary would broaden, remote creation occurs during selection, saved empty state resurrects, red × calls a delete endpoint, native descriptor target differs, or a passing mock is being used to claim installed/provider success. The audit does not undertake any step above.

# MUST HAVE — Chute-powered drag and drop from REDOWN to ChatGPT, Yandex, and Google

**Captured:** November 4, 2026  
**Priority:** P0 product interoperability and launch advertising differentiator  
**State:** REQUIRED / NOT YET VERIFIED; not a claim of currently working compatibility  
**Products:** REDOWN / Click2Cloud, Chute (Chutey), and Rcomplex OS

## Non-negotiable promise
A user can select an eligible file in REDOWN's cloud File Explorer and **drag it straight into supported upload/drop areas of ChatGPT, Yandex, and Google services**, with Chute supplying the local bridge/file-transfer behavior. The gesture must feel like ordinary dependable desktop file drag-and-drop: no confusing debug .exe popup, no manual temporary file hunt, no extra setup interaction at the moment of transfer, and no false success.

This is a **must-implement and must-test** capability and a headline **advertising proposition once verified**, not simply a mock demonstration.

## Implementation contract
1. Use Chute's established Windows-local bridge and REDOWN's provider-authenticated read/download abilities. Make the dragged payload interoperable with target sites that accept a real file drop. Preserve original filename, extension, MIME type where known, and bytes. Never silently supply just a URL or synthetic drag that a target site cannot accept.
2. Keep standard drag/drop interaction for both REDOWN's native Explorer and Chute. Respect browser/OS security boundaries. If Chrome's extension or browser drag events cannot materialize the file payload for a target site, use a documented, user-authorized OS-level file drag bridge rather than pretending it worked.
3. Support at minimum **ChatGPT**, **Yandex** (identify/test concrete target upload surfaces), and **Google** (identify/test concrete services, e.g. Drive and Gemini, rather than implying all Google properties accept uploads). Treat each destination separately because accepting file drag differs by site.
4. No surprise executable console or debug window, no new setup wizard when starting a drag; report permission, size, MIME, offline, auth-expired, cancelled, or unsupported-drop failures clearly. Preserve expected security: explicit user-initiated drag, least-privilege staging, short-lived temporary files, cleanup, and no unintended data sharing.
5. Preserve REDOWN's in-Explorer selection, card interactions, preview, navigation and pagination; dragging must never accidentally open a card, trigger a cloud save, or interfere with ordinary file/folder operations.
6. Verify single and multiple files when destinations support multiples; large-file streaming/staging; different provider accounts; retry/cancellation; browser restarts; Windows Explorer equivalence; cross-window positioning; target rejecting a drop; and accurate completion/failure feedback. Test using real browser UI + Chute bridge + actual destination upload, not unit tests alone.
7. Document acceptance receipts and compatibility matrix per target destination and browser version. Only advertise destinations proved by end-to-end live testing. As sites change, maintain compatibility checks and gracefully downgrade unsupported cases.

## Launch and advertising
**Proposed headline after verification:** “From your clouds to your AI tools. Just drag and drop.”

**Demo:** Open REDOWN → locate a cloud file → drag it directly onto a ChatGPT upload area → show the real file attached; repeat for a tested Yandex surface and a tested Google service. Capture genuine workflow, no staged fake successful upload.

**Copy guardrail:** Do not say “works with all of Google/Yandex” or “available now” until the named surfaces are confirmed working in production. A file being dragged visually does not establish it was accepted or uploaded.

## Done only when
- [ ] User drags from REDOWN into a real ChatGPT upload field and upload/attachment is independently verified.
- [ ] User drags into a specified real Yandex upload field and verifies result.
- [ ] User drags into specified real Google upload field(s) and verifies result.
- [ ] Drag works with standard expected gesture and no debug/console popup.
- [ ] Robust matrix and regression tests pass and production packaging is validated.
- [ ] Marketing claims name only tested supported destinations.

**Cross-reference:** `NEED_TO_DO/11012026.md`. This requirement complements, rather than replaces, Chute's general reliable Explorer drag-and-drop contract.

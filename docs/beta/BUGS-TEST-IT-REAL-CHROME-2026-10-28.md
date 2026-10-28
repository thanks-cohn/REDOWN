# OPEN BUGS: Test It real-Chrome acceptance, exercises 21–32 (October 28, 2026)

**Repository:** `thanks-cohn/REDOWN`  
**Branch:** `beta-explorer`  
**Status:** OPEN / PARTICIPANT TESTING IN PROGRESS  
**Priority:** CRITICAL  
**Evidence:** Owner's actual installed-Chrome screenshots (five captures) and exported `redown-test-it-7dc7421e-23e9-42d3-bf2c-5069ed4ad6a7.json`; a separate `redown-test-it-recovery-7dc7421e-23e9-42d3-bf2c-5069ed4ad6a7.json` was also supplied in the conversation. These personal test artifacts have **not** been committed to this repo. This report records the observations, not an implemented fix.

## Summary

The real participant can create a **verified red-outlined Test Copy** but cannot complete the very Rename / Rename Back / Move / Cut-and-Paste operations Test It asks them to perform. Production R2 reports that the connection cannot protect the source during removal. This is a known *capability gate*, not a missing red outline or an unsuccessful creation of the copy. Current behavior prevents the owner from completing the 60-exercise run.

Separately, the guide highlights toolbar **Copy** / **Cut** while requesting a **right-click context-menu** action, which can lead participants to an interaction that does not count. The read-only source approval dialog is obscured behind the Test It guide.

## Observed issues and desired results

| Exercise | Observed in installed Chrome | Expected behavior |
| --- | --- | --- |
| **21 – Choose a source file** | “Practice with this file?” approval prompt appears behind the Test It instruction panel; screenshot shows obstructed Yes/No decision. | Confirmation is topmost and focusable above the guide. Proposed copy: **Practice with this file?** followed by the exact bucket/key and **Your original will remain untouched.** Buttons **No** and **Yes, use this file**. Approving resumes the guide without dismissing it. |
| **22 – Copy the source** | Guide tells the participant to right-click the selected source and choose Copy, but visually highlights top-toolbar **Copy**. One screenshot shows toolbar Copy succeeded (“1 items copied to REDOWN clipboard”) while the step still requests a context-menu action. | Highlight the source file row and its context menu rather than toolbar Copy. Keep method-specific verification: context-menu Copy only passes a context-menu exercise; do not imply a toolbar click qualifies. |
| **26 – Rename the copy** | REDOWN refuses an identified red-outlined Test Copy: “REDOWN couldn't rename this copy. Its verified name is unchanged; this connection cannot protect the source during removal.” | Owner explicitly requests a practice-only permission model that allows real Rename of verified disposable Test Copies. Do not merely suppress the error or falsely pass the exercise. |
| **27 – Rename back** | Unable to perform after step 26 refusal. | Actual Rename Back must operate on the same tracked logical copy, verify result, and advance. |
| **31 – Cut a test-created copy** | Instruction says **right-click** a working copy and choose Cut, but the top-toolbar Cut is highlighted. The context-menu action was recognized (screenshot “Action recognized. Continue when you're ready”). | Highlight the tracked file row, not toolbar Cut. Verify context-menu provenance when requested. |
| **32 – Paste it into another location** | After Cut, Paste fails: “REDOWN couldn't move this copy. It remains in its original folder; this connection cannot protect the source during removal.” | Real move to the chosen folder with destination verification and updated logical identity/red outline; no false success or invisible source deletion. |

**Specific practice path from the export:** `4chan/files/65d77322dd2f3e921523682b266ffb0e2902a793.png` is the approved original. Test copies include `4chan/files/4chan/65d77322dd2f3e921523682b266ffb0e2902a793.png` and `4chan/files/4chan/o/65d77322dd2f3e921523682b266ffb0e2902a793 (copy).png`. Inspect construction and presentation of bucket vs prefix so no duplicate segment is introduced inadvertently; nested folders alone do not prove a path bug.

## Export observations

The session JSON has `id: 7dc7421e-23e9-42d3-bf2c-5069ed4ad6a7`, `index: 31` (zero-based), an approved original, tracked copy records with `receipt.verified: true`, ETags/version strings, and matching SHA-256 for the copied bytes. These are meaningful ownership records; they do not prove the backend can delete a particular upload atomically.

Participant's latest reported sequence: exercises 21–25 passed; 26–27 unusable after rename denial; 31 recognized; 32 blocked on destructive Paste. Consult the actual exported per-exercise verdicts when implementing/validating. The separate recovery export contains archived prior-session data and must not be confused with this active session.

## Implementation requirements (owner-requested policy change; not yet implemented)

1. **Explicit Test Copy authorization.** Preserve the immutable original and preflight that the target is a verified, explicitly tracked current-session Test Copy. The owner accepts that copies are disposable and requests that Rename, Rename Back, Move To, Cut/Paste, Delete and cleanup actually work on them. Do **not** extend this permission to unrelated objects, originals, mixed selections, or existing destination collisions.
2. **Consciously document the concurrency tradeoff.** The current production R2 Worker binding has an unconditional `delete(key)`; pre-delete HEAD cannot guarantee no external writer replaces an object between check and delete. Owner specifically requests relaxing this limitation **for verified practice copies only** rather than blocking all exercises. Implement only as an explicit, narrowly scoped opt-in policy with the residual replacement race prominently documented and preferably consented to before destructive practice. Do not claim an atomic or race-free removal; do not enable any blanket bypass or forged capability flag. If implementation cannot confine the risk to intended objects, keep the destructive operation blocked and report the blocker rather than misrepresenting it.
3. **Real operation and proof.** Use existing Explorer commands and universal API; after an operation check the destination object independently, source state, current logical copy identity, ledger, clipboard, and red marking. Failure is failure, not PASSED. Multi-file moves preserve partial progress and unresolved entries.
4. **Top-level source-approval dialog.** Explicit modal layering and focus ownership; guide moves behind or yields when approval opens, resumes afterward. Confirm Yes/No/keyboard/Escape on installed Chrome, not just jsdom.
5. **Method-correct highlighting.** For right-click context-menu exercises 22 and 31, highlight the actual selected file row and, when open, the correct context-menu action. Never point to a toolbar control that cannot satisfy the step.
6. **No Test It rewrite.** Preserve 60 exercises, existing six-dot grip, ordinary Explorer file operations, copy-only originals policy, previous performance repairs, and `main` / Legacy Explorer behavior. Keep changes scoped and test against actual installed Chrome + real R2 Worker.
7. **Acceptance evidence.** Owner should complete step 21 approval, context-menu Copy at 22, verified Paste, actual Rename and Rename Back at 26/27, context-menu Cut at 31, and actual Paste/move at 32 without Skip or misleading “passed” states. Capture export plus observed API outcomes and ensure no original changed. Run focused/full suites and explicitly distinguish memory-provider from live-R2 results.

## Other evidence / follow-up

- A screenshot at exercise 21 shows the Test It card in front of a partially hidden confirmation.
- Screenshots at 22 show toolbar Copy highlighted despite context-menu instruction.
- Screenshots at 31 show Cut highlighted in the toolbar despite context-menu instruction, with a selected red Test Copy and a recognized Cut.
- The participant plans to finish as much of Test It as possible and send additional failures. **Append new findings to this single document**, preserving reported vs verified vs fixed states.
- Prior performance and capability findings: [HANDOFF.md](HANDOFF.md), including the October 28 benchmark / blocker. Base report was produced after commit `f7137b36ef2205bd373c1e45fcc015e04f25f4e9`.

## Tracking

**OPEN:** 21 modal stacking; 22 right-click highlight; 26 rename blocked; 27 dependent; 31 right-click highlight; 32 move blocked.  
**UNVERIFIED:** Any deployed fix, installed-Chrome regression after repair, full 60-run completion.  
**Do not mark resolved on the strength of memory-provider mocks alone.**

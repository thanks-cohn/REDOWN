# Test It Copy/Paste correction, October 27, 2026

Scope: exercises 21–25 and command recognition, on beta-explorer.

## Causes and correction

- Copy referenced `selection` before its declaration. Selected identities now exist before command handling, and the approved source must match the account, bucket, and single selected key.
- Explorer's `guideAction('command', {action:'copy'})` spread replaced the event action with `copy`; Test It never entered its command branch. The command envelope now retains `action:'command'` and carries the verb as `commandAction`.
- Context menu and keyboard handlers forward via toolbar `.click()`. Those zero-detail clicks erased the original interaction evidence. Test It preserves the preceding menu/keyboard input for those forwarded Copy/Cut/Paste clicks.
- Exercise 25 passed a CSS selector to getElementById, which always missed the preview. It now queries the selector correctly and requires the copy identity from exercise 23, including when resuming a saved session.
- Exercise 23 requires Paste evidence tied to the approved original's ancestry, in addition to the existing independently verified copy evidence. Observer failures are caught at the event boundary and do not cancel Explorer commands.

The existing universal API and practice policy remain responsible for writes, absent-before checks, provider receipts, metadata and SHA-256 read-back, preserved originals, ownership, and interruption locks. No clipboard-only cloud success was added. No exercise definitions, Tour, Restart, gripper, or menu layout were changed.

## Verification

- `node --test tests/test-it*.test.mjs`: 22 passed, zero failed.
- New DOM regressions exercise the actual Explorer command-envelope function and Copy handler with mocked surroundings. They cover menu Copy/Paste, Ctrl+C/Ctrl+V, navigation and clipboard retention, account/bucket/key mismatches, mixed selections, missing destination, existing user filenames, provider failure, exercises 21–25 without skipping, and same-copy preview identity. Existing session tests cover interrupted writes, reconciliation, saved ownership, storage failures, and safe destructive operations.
- Ordinary Explorer Copy fills its internal clipboard with Test It stopped. Actual ordinary Explorer Paste against R2 was not verified.
- `npm run check`: passed.
- Final `npm test`: 470 total, 460 passed, 10 failed. The unchanged starting commit had 463 total, 453 passed, the same 10 failing test names. They concern historical agent/debug/semantic evidence, architecture references, issue review labels, Nested drag handle, and provisioning display. No baseline assertions or hashes were changed.
- `npm run reliability:check`: failed; its full-suite stage retained the same 10 failures. It is not release certification.
- Real browser attempt: Playwright is present, but its Chromium/headless executable is missing. No browser interactions were run. DOM tests use jsdom; cloud operations use disposable in-memory objects, not Cloudflare.
- Installed Chrome: NOT VERIFIED. Live Cloudflare R2: NOT VERIFIED. Live acceptance remains a tester retest, not a claimed result of these local checks.

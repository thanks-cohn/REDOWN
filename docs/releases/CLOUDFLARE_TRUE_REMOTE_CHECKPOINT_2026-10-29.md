# REDOWN-Click2Cloud / Cloudflare TRUE REMOTE release checkpoint

Date: 2026-10-29

## Protected original

- Repository: `thanks-cohn/REDOWN`
- Source: `beta-explorer` at `72f144d2d0c0655af56baa78eaee4fe0d0ae39d0`.
- Immutable commit bookmark (branch): `checkpoint/shelf-before-cloudflare-first-2026-10-29`.
- Future tag **candidate**: `SHELF-PRE-CLOUDFLARE-102926`. **Not created**; verify the recorded SHA before tagging.
- This original preserves all existing Google Drive sign-in scaffolding and the multi-provider Shelf.

## Separate Cloudflare-first release candidate

- Working branch: `release/cloudflare-true-remote`.
- Primary provider: Cloudflare R2, **TRUE REMOTE**.
- Shelf keeps the existing header, delivery counter, palette system, settings markup and settings navigation. The first tab label changes from `CLOUDS` to `OUR CLOUD`, and its content becomes a Cloudflare-centered connection and workflow view.
- Google Drive (sign-in-only), Dropbox and OneDrive are not offered as working destinations in this release. Future provider integration remains on `beta-explorer`.
- The release manifest removes the unfinished Google OAuth client and Google API host permission; no Google authorization attempt is made from the release Shelf.
- Cloudflare OAuth, R2 Explorer and transfer implementation are reused rather than rewritten.

## Important release gates: still OPEN

**Do not call this customer-safe or Chrome Web Store-approved on the basis of this commit.**

1. Reconcile root `LICENSE` and `extension/LICENSE`; obtain owner approval of shipped licensing.
2. Bring the package allowlist into sync with the current Shelf, its fonts, popup preference and Explorer files. Validate ZIP manifest at root and hashes.
3. Publish accurate privacy/support URLs, review host permissions and finish the Chrome Web Store listing.
4. Verify Cloudflare OAuth against the **final installed extension ID** in a clean user profile.
5. Perform disposable R2 end-to-end checks: connect, create destination, right-click save, independently verify object bytes; retry/reconnect, browser restart and failure/timeout behavior.
6. Clearly advertise the default **300 MiB** remote-file limit and incomplete durable restart/retry guarantees. Avoid shipping unreliable destructive operations without verification.
7. Keep store submission a separate explicit release action; no publish/deploy happened in this checkpoint.

The original branch and the pre-redesign bookmark must not be rebased or force-pushed to absorb release experiments.

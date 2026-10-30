# IMPORTANT IDEA: KEEP BOTH by Default, Reliable Right-Click Destinations, Public URL Prompt, and Better Download History

**Status:** IDEA / REPORTED UX ISSUES ONLY. Not implemented or verified.
**Repository:** `thanks-cohn/REDOWN`
**Branch for this note:** `release/cloudflare-true-remote`
**Reported:** 2026-10-29
**Scope:** File-name conflicts, right-click destination setup, URL locations, transfer history, error presentation.
**Implementation authorization:** None. This entry records requested behavior and observations; do not modify running code as part of this documentation-only change.

## 1. File-name conflict resolution must default to KEEP BOTH

**Requested change:** When a save/download would conflict with an existing filename at the selected destination, the **default selection must be `KEEP BOTH`, not `SKIP`.**

- Preserve the existing file and save the incoming file under a collision-safe, distinguishable name (for example, `photo (2).jpg`; illustrative convention, not a required naming algorithm).
- `KEEP BOTH` must be visibly preselected wherever a file conflict is resolved: right-click transfers, Explorer copy/move, paste, direct download/save, and bulk workflows where relevant.
- `SKIP` can remain an explicit alternative; never silently discard an incoming file merely because a name is in use.
- Never silently overwrite or delete an existing file. If an explicit `REPLACE` option exists, it should require a deliberate user choice.
- Distinguish the current destination, original name, and new resulting name in the resulting status/history entry.
- Handle repeated collisions safely, including simultaneous jobs and name collisions in the same batch. Confirm stored results rather than presenting a successful `KEEP BOTH` solely on request dispatch.
- Existing explicit user selections take precedence when intentionally chosen. The requested **initial default** is `KEEP BOTH`.

## 2. Right-click destination availability appears delayed or triggered by an unknown action

**User observation, not a confirmed diagnosis:** The right-click destination setup seems to become active after some other action or after some time has passed. The user is now able to add right-click destinations but cannot identify what unlocked that behavior.

**Expected behavior:**
- Once a Cloudflare connection and the necessary bucket/destination prerequisites are ready, the right-click destination controls must become usable promptly and predictably.
- Show understandable readiness/loading/error states. Do not leave controls looking disabled or inert until a mysterious extra click, reload, bucket selection, or elapsed interval.
- Existing destinations should show up consistently after sign-in, setup, and reopening the Explorer/Shelf; adding another simple location should not depend on an unrelated action.
- Configuration changes should propagate to Chrome's right-click/context menus without requiring undocumented actions.
- Investigate state initialization, bucket selection, permissions, loading/race conditions, and menu refresh/rebuild only as **hypotheses**. Capture reproducible steps and traces before assigning a root cause.

**Acceptance investigation:** Test first sign-in, existing users, cold start, delayed network connection, reconnect, bucket initialization, Simple/Nested editor switching, and post-reload state. Record whether the destination editor or Chrome context menu is unavailable and precisely what causes it to appear.

## 3. URL location must offer a YES / NO public URL setup prompt

When a user selects a URL location or attempts **Get URL** and the bucket's public URL has not been configured, show an inline question rather than a dead end.

**Suggested wording:**

> **This bucket does not have a public URL configured. Enable a public URL for this bucket?**
>
> **YES: Enable Public URL** · **NO: Not Now**

- Present the same decision model in both the URL-location surface and the right-click `Get URL` path.
- `YES` starts the existing user-confirmed public-access flow, then refreshes configured URL choices. `NO` leaves the bucket private and dismisses the prompt without side effects.
- Do not automatically enable public access on selection, hover, setup, or page load.
- Explain plainly that enabling a bucket-wide public address may make objects in that bucket accessible to anyone with a working link. Avoid implying that a newly enabled public URL is limited to one file.
- Reuse REDOWN's existing confirmed `cfEnablePublicAccess` flow, its exact scope (managed `r2.dev` access), and `cfPublicAddresses`/Get URL presentation instead of inventing a new enabling mechanism. Do not assume this operation provisions custom domains or that URL discovery establishes object accessibility.
- Handle cancellation, missing permissions, read-back failure, stale state, and already-configured addresses gracefully. Never declare activation successful until confirmed by the provider.

## 4. History must open with TODAY expanded

On opening the **History** view, today's date group should **already be expanded by default**, so users can immediately see their most recent transfers.

- Default-open today's group on each normal entry into History.
- Permit users to collapse it manually during their current visit. Other days may stay collapsed unless expanded by the user.
- Keep a readable timeline, with successful and failed items clearly distinguished.
- Use the viewer's local date to group entries accurately around midnight, while preserving original event timestamps.

## 5. Every download history item should distinguish TWO source URLs

For each download, show the best available provenance:

1. **Source URL (direct download URL):** The immediate address from which REDOWN actually retrieved the file. This is the essential, first-class field; do not substitute the saved R2 object URL or destination path for it.
2. **Parent page URL (when available):** The webpage that hosted or linked to that download URL. This is complementary context, not guaranteed to exist.

**Presentation:** Display the parent/hosting page above the direct download URL when available, with clear labels such as `From page` and `Downloaded from`. If the parent cannot be established, show only the direct source; never invent a referer or claim two links are the same when their meanings differ.

- Both URLs must be **clickable**, keyboard accessible, and able to wrap on multiple lines without breaking layout. Allow copying full original URLs even when their visible text is shortened.
- Preserve source provenance at the moment of the original transfer, subject to the data REDOWN actually has access to. Potential parent-page candidates may come from an initiating tab/page context or a supported browser event; capture only when available and reliably attributable.
- Distinguish `source URL`, `parent page`, and `destination/storage URL` conceptually, even if more destination fields are shown elsewhere.
- Avoid making private or sensitive URLs public through diagnostics or telemetry. Do not leak authentication tokens, signed-query credentials, or private browsing data into logs or shared reports. Be deliberate about local history retention and redaction.
- For redirects, accurately define whether the retained direct source is the initially requested URL or effective final URL; ideally preserve both when safely available, with unambiguous labels.

## 6. Errors: concise `Error: URL` presentation

The default visible failed entry should be compact and immediately identify the offending URL.

**Suggested compact form:**

`Error: https://example.com/path/to/file`

- Display the **URL associated with the failed request**, rather than replacing it with a long internal error sentence. Make the URL clickable when safe and copyable.
- A short plain-language error reason or `Details` disclosure may be available on expansion, without overwhelming the primary row.
- Identify which URL failed if a task involves multiple stages (origin download, R2 upload, URL lookup, etc.); do not mislabel a destination URL as an origin download URL.
- Preserve precise technical diagnostic detail in an appropriate restricted/debug context, safely sanitized, rather than showing verbose internal logs inline.
- A failed transfer must never be displayed as successful or silently disappear.

## 7. History and download messages: a clean vertical stream with wrapping and expandable long items

Replace the visual problem of extremely long history/status messages forming a single, sprawling, unwrapped line with a **simple vertical stream of entries**.

- One entry per item in a vertical list, with natural line wrapping and responsive width constraints.
- **Short entries:** show their useful summary automatically.
- **Long entries:** show a concise wrapped preview, **collapsed by default**, with a clear click/keyboard-accessible `Expand` / `Show more` action. Expanding shows the full message or URLs, still wrapped.
- Use a predictable threshold based on rendered lines/content length; don't truncate the underlying stored value or remove useful provenance.
- Preserve clickable links and selectable/copyable text. Very long strings without spaces must break safely without horizontally scrolling the entire page.
- Handle narrow Shelf/pop-out panels, Explorer, history view, and large batches. Expand/collapse must not reorder or lose individual entries.
- Consider virtualizing very long history streams for responsiveness without sacrificing access to old results.

## Suggested later acceptance checks

1. A filename collision initially proposes **KEEP BOTH**, writes a distinct new object, and keeps the original unchanged.
2. Context-menu destinations become available consistently upon successful prerequisite setup; there is no mystery action/time delay.
3. Unconfigured URL location and right-click Get URL both offer **YES/NO**. `NO` never changes bucket visibility; `YES` uses explicit confirmed activation and provider read-back.
4. History opens with **today expanded**; users may manually collapse it.
5. History shows direct download source URL for each item where captured, and parent page URL **above it** when available. Both wrap and are clickable/copyable.
6. Errors visibly read **`Error: <relevant URL>`** with deeper reason accessible if needed.
7. Long entries are wrapped and collapsed by default; short entries stay visible. No horizontal overflow, lost content, or broken links.
8. Tests distinguish source intent, mock behavior, installed Chrome behavior, and real Cloudflare/provider verification. This Ideas file itself does **not** certify any live fixes.

**Status reminder:** Requirements captured for later implementation, prioritization, and testing. No executable change or live validation is claimed.

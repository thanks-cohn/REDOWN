# IMPORTANT IDEA: FOLLOW THE ARROWS — REDOWN'S STATE-AWARE SETUP TREASURE HUNT

**Status:** Future product/UX proposal only. **Not implemented.**  
**Proposed:** 2026-10-30  
**Repository:** thanks-cohn/REDOWN  
**Scope:** Explorer toolbar, login, provider connection, bucket activation, refresh, onboarding, adaptive guidance, mascot.  
**Working names:** Follow the Arrows, REDOWN Pathfinder, Treasure Hunt Setup.  
**Related idea:** [Money Machine, OVERDRIVE & Gamified Odometer](./IMPORTANT_MONEY_MACHINE_OVERDRIVE_GAMIFIED_ODOMETER_AND_CREATOR_SHOWCASE.md).

## Core idea

When a user is logged out, not yet connected, or blocked by a prerequisite, REDOWN's existing toolbar buttons should *visually guide them to the action they need next*. In particular, the spaces for **New Folder**, **Upload Folders**, **Upload Files**, and **Activate Buckets** could temporarily become playful directional arrows.

- Need to log in? They point toward **Login / Connect**.
- Need to activate storage? They point toward **Activate Buckets**.
- Need an actual refresh? They point toward **Refresh**.
- Need to reach something lower on the page? They point **down**.
- If the target moves, the arrows update to point at its new position.
- Once everything is ready, controls are just normal working buttons again.

This should feel like a little **Easter egg hunt** that helps people discover the product instead of leaving them with inexplicably disabled buttons. The interface itself explains where to go.

## Example journeys

### 1. Logged out

Unavailable, connection-dependent toolbar actions show tasteful arrow styling angled toward the real login button. Their tooltips preserve identity and explain why they are unavailable: e.g., "Upload files: connect your account first." The **Login / Connect** target is highlighted, recognizable and clickable. After authentication, the UI reevaluates what prerequisite remains.

### 2. Connected, but storage activation needed

The unavailable action surfaces now guide toward the **Activate Buckets** button. Crucially, that target remains a real actionable button, *not another arrow*. If some other requirement is missing, guide to the actual requirement instead.

### 3. Refreshed state required

If the application knows that refreshing is necessary to discover or sync the latest state, arrows point toward **Refresh**. Do not suggest refresh for a permissions failure, offline backend or other condition it cannot solve. Upon successful refresh, restore the normal functional controls.

### 4. Target offscreen or below

Arrow direction adapts to the actual location of the control: left, right, up, down, or diagonally. For offscreen targets, a clear "Go to next action" affordance may scroll and focus the control. Do not force users to scan around blindly.

### 5. Fully ready

Remove onboarding arrow transformations and show the existing **New Folder**, **Upload Folders**, **Upload Files**, and other actual controls as originally intended. Celebrate readiness subtly if appropriate, possibly with a playful mascot acknowledgment. Do not make a setup event count as a completed file save.

## State-based logic, not a canned slideshow

The arrows must reflect authoritative live product state rather than assumptions from CSS or button visibility:

1. Determine the action the person is trying to perform and whether it is actually available.
2. If account authentication is needed, direct toward the correct login/connection control.
3. Otherwise if provider account selection or authorization is needed, direct toward that specific control.
4. Otherwise if supported storage must be activated, direct toward activation.
5. Otherwise if a real refresh is required, direct toward refresh.
6. Otherwise if a bucket, folder, destination or account selection is needed, direct toward selection.
7. Otherwise restore the original button with its original function.
8. If blocked by a non-user-fixable failure, show the true error and supported repair/retry route rather than a dishonest arrow.

Multiple disabled controls that share a prerequisite can all point to one visibly emphasized next step. Avoid competing spotlights, misleading loops, or routes that lead to another unresolved disabled button.

The design must be **provider-aware and provider-agnostic**: future Google Drive, Dropbox, OneDrive, Mega, and generic S3 providers may have different connection, account, activation and permission prerequisites. Cloudflare bucket activation is not a universal step.

## Aesthetic & interaction requirements

- Apple/Mac-quality polish: purposeful spacing, consistent button footprints, gentle arrow orientation changes, subtle destination glow and lightweight mascot personality.
- An arrow is a *temporary contextual visual treatment*, not permanent deletion of labels or working functionality.
- Retain the meaning of each control in tooltip text, accessible name, keyboard focus, and screen-reader description, such as "New Folder unavailable. Connect to Cloudflare first."
- The **destination** must remain recognizable and fully interactive. A single action should never be hidden by its own arrow.
- Prefer one concise explanatory message near the relevant controls over a forest of separate labels.
- Compute directions from actual target and origin geometry; adapt to responsive layout, split panes, scroll, browser zoom, window resize and repositioned controls.
- Use restrained motion; respect reduced-motion settings, and give users a dismiss/disable option if guidance feels distracting.
- No obstructive overlays, perpetual animations, click interception, pointer traps or unexpected navigation. Never turn a real Upload Files button into a login action without clearly indicating why.
- Optionally introduce one tiny easter-egg interaction after completing setup, but prioritize discoverability over novelty.

## Engineering / acceptance criteria for a future build

1. Audit present Explorer, toolbar, session/login, bucket activation, refresh and provider capability states *before implementing*. Use existing authoritative contracts and the unified agent API; do not create another competing connection state.
2. Preserve all original toolbar actions, keyboard behavior and layout proportions when they become available.
3. Verify each unavailable control identifies its *correct* next prerequisite, or an honest error if none is actionable.
4. Verify logged-out, logged-in-but-not-activated, stale-needs-refresh, wrong-provider, no-bucket-selected, fully-ready and error states.
5. Verify arrow orientation and target visibility in desktop, narrow windows, split panels, zoomed views and scrolled pages.
6. Verify screen-reader, keyboard and reduced-motion paths are at least as usable as the visual path.
7. Ensure guidance disappears immediately when state changes, and never reports authentication, activation or successful transfers without actual confirmation.
8. Add visual test cases documenting how multiple arrows converge without cluttering the toolbar.

## Product principle

**"The buttons themselves show you where to go next."**

The purpose is to turn REDOWN onboarding into a friendly little treasure hunt while leaving the software straightforward, accessible and trustworthy for people who prefer ordinary functional controls.

**This is an IDEA only. No code or runtime behavior is authorized to change by this document.**

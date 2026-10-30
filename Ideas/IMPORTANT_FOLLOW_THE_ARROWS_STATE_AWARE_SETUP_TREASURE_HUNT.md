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

## Optional future Settings: Magnetic Buttons / Follow the Cursor

**Owner's idea (2026-10-30):** Let users enable a playful setting where the existing toolbar buttons respond to the mouse. While uploading, waiting on a transfer, following setup guidance, or while a button would otherwise be inactive, its *visual presentation* can lean toward, trail, or gently follow the cursor. It should feel like a little family of responsive, expressive objects rather than an ordinary static toolbar.

### Configurable behaviors

- **Playful Buttons**: master toggle in Settings, opt-in by default.
- **When active**: selectable triggers, e.g. During Uploads, Inactive Buttons, and Guided Setup. Only choose states for which activity is actually safe.
- **Motion style**: Magnetic Lean (subtle), Follow / Trail (a small eased offset), or playful Cluster / Orbit (experimental). A magnetic cursor effect can make the button appear to follow without relocating its real clickable target.
- **Intensity**: Low / Medium / High with bounded displacement, reduced-motion support, and an obvious way to turn the feature off.
- **Return home**: on upload completion, user intent to click, keyboard focus, login change, or a newly usable action, the visual face settles smoothly into its canonical location.

### Important rules

- Never move the *actual hit box*, tab order, focus indicator, screen-reader identity, or layout anchor out from under the user. Prefer a separate decorative face or small bounded transform, leaving true controls in their original positions.
- Keep critical actions, progress, cancel, login, refresh and activation stable and reachable. Do not animate a button away from a user's pointer while they try to click it.
- Preserve visibility, meaning and accessibility. Button labels and hover/focus tooltips must remain understandable, and users can disable this whimsy.
- At most a few inactive buttons should react at once; avoid visual chaos or collisions. Responsive placement, z-index, and edge conditions must remain polished.
- This is independent from honest transfer state and the "Follow the Arrows" guidance. A button pointing to a prerequisite should never lose its directional meaning merely to chase the mouse.
- Avoid sustained CPU/GPU use; pause when the page is unfocused, hidden or under heavy workload. Never impair transfers.
- Acceptance should cover pointer movement, pointer clicks, keyboard, hover, focus, reduced motion, screen widths, both slow and fast uploads, loading and error states, and reactivation of controls.

**Desired feeling:** The buttons come alive when they are otherwise waiting, but retain all their real utility.

## Future Waiting-Time Mini-Game (distinct from Chrome Dino)

**Owner's idea (2026-10-30):** Consider a genuinely fun, optional little game for the moments when users are waiting for uploads, cloud preparation, or transfers to complete. The Chrome offline dinosaur is a reference for the *tiny, delightful surprise*, **not** a request to copy an endless-runner or its design. REDOWN should invent something with its own mascot, visual language and personality.

**Working title: "Bucket Brigade."** A miniature, original one-screen dexterity/puzzle game: REDOWN's mascot receives playful parcel/file icons and aims them into matching cloud buckets. Gradually build light combos, visual effects, and charming reactions, with subtle nods to the Money Machine audio language. Optional variations: sort by color, catch falling parcels, or connect a short path through whimsical storage destinations. Keep it clearly fictional and separate from actual account files or data. Refine exact mechanics through prototypes.

- **Entry:** an unobtrusive "Play while you wait" invitation in genuine waiting/progress areas, or an optional Settings toggle. Never launch automatically into a full-screen game.
- **Exit:** instant return to Explorer, with real upload progress always visible or one action away; completion notification remains unmissable and can gently end a round.
- **Integrity:** game points, mascot parcel counts and fictional buckets are **never** real file counts, upload status, Money Machine verified saves, destinations or data operations.
- **Performance:** no material CPU, memory, network, audio or transfer-performance impact. Pause on tab backgrounding, inactive window, low-resource mode, interruptions or real errors. Do not intentionally create, extend or simulate waiting.
- **Input:** mouse/touch and keyboard support; clear pause/restart/exit, accessible instructions and color-independent cues. Honor reduced motion and sound preferences.
- **Appearance:** compact, glossy, polished, immediately understandable, consistent with REDOWN's existing mascot and midnight-blue aesthetic, not an iframe ad or intrusive modal.
- **Achievement connection:** optional *cosmetic-only* unlocks (e.g. mascot reactions or decorative trails), never paywalled transfer reliability or misleading save-speed badges.
- **Scope:** future concept only; determine whether to include after core transfers and setup are reliable. Gameplay should add delight, not hide an unresolved stall or error.

**Related vision:** [Money Machine, OVERDRIVE & Gamified Odometer](./IMPORTANT_MONEY_MACHINE_OVERDRIVE_GAMIFIED_ODOMETER_AND_CREATOR_SHOWCASE.md). Distinguish the playful waiting game from the verified-save gamification system.


## Product principle

**"The buttons themselves show you where to go next."**

The purpose is to turn REDOWN onboarding into a friendly little treasure hunt while leaving the software straightforward, accessible and trustworthy for people who prefer ordinary functional controls.

**This is an IDEA only. No code or runtime behavior is authorized to change by this document.**

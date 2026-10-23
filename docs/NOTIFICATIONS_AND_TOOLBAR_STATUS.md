# Quiet default and toolbar feedback

Desktop notifications now require `notificationsEnabled === true` in local storage.
Dashboard offers an unchecked-by-default Desktop notifications toggle. The common
background notify helper reads the preference on each call, including failure and
gallery messages. Missing preferences remain disabled for existing profiles too.
Notification permission remains available; notification/storage failures remain cosmetic.

Chrome toolbar feasibility (2026-10-22):
https://developer.chrome.com/docs/extensions/reference/api/action
`chrome.action.setIcon` accepts bundled image paths or ImageData, including multiple
sizes. A service worker can render variants with OffscreenCanvas. No user-uploaded
images are required. Preferred future presentation: matching emerald/ruby variants
of the existing icon, retaining its silhouette, plus an accessible action title.
Only confirmed completion should be green; failures red, without exposing private
filenames in tooltips. Status should remain independent of desktop-notification opt-in.
Implemented in 0.5.24: the existing bundled icon is tinted using OffscreenCanvas
and setIcon ImageData at 16/32/48px. Six cubic eased frames spaced 40ms apart retain
alpha, silhouette and luminance detail. Emerald indicates a recorded successful
cloud/local delivery or confirmed Explorer transfer; ruby indicates a recorded
failure or Explorer transfer errors, partial move, or thrown transfer error.
Queued GitHub dispatches and empty Explorer operations do not trigger success.
Toolbar feedback remains independent of desktop notifications. New outcomes cancel
older animations; action titles provide text feedback without private object names.
The last outcome remains until another result or extension/browser restart; this
is transfer feedback, separate from the popup Cloudflare connection light.
Canvas/API failures are caught and cannot alter transfer outcomes. No permissions
or image uploads are added. Uninstrumented transfers/native downloads are excluded.
Installed Chrome animation/color acceptance remains pending.

Validation: reliability run 359 pass, seven retained baseline failures, zero new
failures. Two added preference tests pass (opt-in/default/off and storage failure).
Installed Chrome preference/notification acceptance remains pending.

0.5.24 validation: 364 passing tests, seven retained baseline failures and zero
new failures in reliability:check. Five focused toolbar/preference tests pass.
Syntax and audit-only packaging pass; release blockers remain unchanged.

## 0.5.25 correction: temporary sprite-style effect

Replaces the persistent 0.5.24 tint with two brief palette hits (120ms each,
separated by 160ms of original art). The final tint then dissolves over ten
60ms frames with an eased tail, returning every RGB channel to the original.
Finally restore the exact bundled icon paths and normal REDOWN tooltip.
The effect lasts about one second, with no sound or notification requirement.
A newer outcome cancels older flash/fade callbacks; only the newest effect restores
normal art. Rendering failures still attempt restoration without failing transfers.
Tests cover decreasing tint distance, exact final palette, original paths/title,
transparent pixels, overlapping effects and cosmetic API failures.
Installed Chrome visual acceptance remains pending.

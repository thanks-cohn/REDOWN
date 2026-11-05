# Destination compatibility — no blanket support claim

Protocol: REDOWN Chute browser adapter v1. Chute reference:
`3f9033b261667a2ad90af4a13c45701ae717ab12`.

| Surface | Implemented path | Verified outcome |
|---|---|---|
| Controlled HTML file input | Trusted browser drag, opaque reference, claimed/chunked original, Chute File/DataTransfer, input/change | PASS in Chromium 154 Linux HTTP fixture with mocked extension messaging/provider: 68 original PNG bytes, exact name, image/png and size. Same-document fixture, not installed extension or cross-origin proof. |
| ChatGPT attachment area | Chute File/drop dispatch; preserve trusted drag lifecycle and clean overlays | **UNVERIFIED**: no installed-extension or live attachment receipt |
| Google Lens (`lens.google.com`) | Chute image-input/trigger heuristics and File delivery | **UNVERIFIED**, host routing unit-tested only |
| Google Image Search (`www.google.com/imghp`, search paths) | Same image-specific adapter | **UNVERIFIED** independently of Lens |
| Yandex Images (`yandex.com/images/`, supported regional domains) | Same image-input/trigger adapter | **UNVERIFIED**: no live uploaded image receipt |
| Google Drive / Gemini | Image-search heuristics explicitly excluded; ordinary File dispatch may be accepted by a file area | **UNVERIFIED**; no advertised Google-wide support |
| Arbitrary HTML drop handlers | Real File, synthetic dragenter/over/drop | Target can reject untrusted events. Dispatch is not acceptance or upload completion. |
| Browser restricted pages, extension pages without receiver, desktop/OS | No receiver/native transport | **UNSUPPORTED**; Download, then choose file in target picker |
| Multiple files / >32 MiB (8 MiB when deviceMemory <=4) | No unbounded buffering or automatic native/public-URL fallback | **UNSUPPORTED** in v1; explicit Download/picker alternative |

Preparation is deliberate: asynchronous authorized cloud reads cannot run inside
synchronous dragstart. Select one file, choose **Prepare to drag**, then drag within
one minute. If the browser strips the private MIME across a boundary, the adapter
refuses delivery rather than dropping a cloud URL or unscoped text. Cross-window
behavior, focus/positioning and multi-monitor Windows behavior are still unverified.

`prepared` and `drag_started` are source states. A receiver can report
`drop_dispatched` or `failed`; a cancelled/outside drag is cleaned up.
`target_accepted` and `verified_complete` are intentionally never synthesized.
The user must inspect the destination attachment. No History success, odometer,
fireworks, provider save or public URL change is produced by a drag.

## Native blocker, reproducible without bypassing consent

Inspect `chute-reference/src/chute/explorer/interop.py:capabilities`: the public
contract reports `enabled: false`, reason `NATIVE_CONSENT_REQUIRED`. AdapterBridge
requires two enrolled participants; no REDOWN installed participant is supplied.
The native host checks Chrome's actual caller origin and serves enrolled local
folder sessions. It does not expose an approved REDOWN cloud-staging/OLE drag-out
operation. REDOWN has no nativeMessaging permission, and this change adds none.
There is no safe basis for silently uploading cloud bytes to its localhost store,
spoofing an enrolled origin, or starting another companion. The existing native
protocol needs a reviewed, enrolled implementation before OS-native support can
be claimed. Tests in the snapshot validate the disabled contract; they do not
supply that implementation.

The environment is Debian 13 / Chromium 154, not Windows 11. Its managed Chromium
policy blocks unpacked extension installation. Installed Chrome, live target
attachments, Windows low-RAM measurements and native kill/restart testing remain
release gates. See TEST_MATRIX_AND_EVIDENCE.md and its tracked blocker.

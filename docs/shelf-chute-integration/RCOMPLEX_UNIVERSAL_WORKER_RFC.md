# One installed Rcomplex Universal Worker — proposal only

This RFC implements no native host, enrollment, OAuth scope, permission, process,
installer or cloud backend change. It is separate from the Shelf layout PR.

A single OS broker should serve enrolled REDOWN, Chutey and future desktop clients.
Keep each extension's Chrome MV3 worker and REDOWN's remote Cloudflare Workers:
these have different lifecycle and authorization responsibilities.

Use a versioned native-messaging discovery handshake returning protocol versions,
client identity, supported capabilities, maximum chunk/buffer sizes and health.
Chrome supplies the actual extension origin. Independently enroll each client;
never trust a claimed origin in JSON. Desktop clients need equivalent OS-authenticated
IPC identities. Require explicit user consent per capability and exact local scope.

Separate modules own (1) local folder sessions and guarded file operations,
(2) bounded authorized cloud-byte staging, and (3) OS drag integration. REDOWN
continues to authorize/read clouds through its Universal File API; the broker
receives bytes, name, MIME and an opaque transfer ticket, never OAuth credentials,
source URLs, page provenance or arbitrary local paths. Chutey retains authority
for its approved local folders. An opaque source ticket grants neither client
access to another client's sessions. Capability negotiation must return unsupported
rather than silently downgrade consent or invent upload completion.

Cloud staging should stream into a per-client private temporary area, with quotas,
chunk backpressure, cancellation, hash/length checks and leases. One-use receiver
claims bind the OS operation and caller. Native OLE drag-out needs a separately
implemented and tested Windows data object with correct promised-file/lifetime
semantics; synthetic browser events cannot substitute for this. Distinguish staged,
drag started, OS delivered, target accepted and independently verified completion.
A broker receipt alone cannot prove a web upload finished.

One installer owns discovery, background startup, signed updates and uninstall.
Use a single supervised broker, no console/debug executables, competing listeners
or extra user-visible Python windows. Extensions reconnect with exponential bounded
backoff after broker crash/reboot/MV3 suspension; protocol generations invalidate
stale sessions. Crash-isolate codecs/drag integration, cap RAM and disk usage,
clean orphaned leases at startup, and measure idle CPU/RAM on physical 4 GB Windows
hardware. Do not promise numeric budgets before collecting measurements.

Migration sequence:

1. Resolve Chute commercial rights, protocol ownership, signing and update authority.
2. Test a versioned broker beside the current companion in an isolated development
   environment, without claiming the same production host registration.
3. Add explicit approved-client enrollment and per-capability consent UI. Negotiate
   compatibility with existing Chutey sessions; preserve their guarded roots.
4. Exercise real Windows file-input, ChatGPT, Lens, Image Search and Yandex targets
   separately; test multiple files, huge streams, cross-window/multi-monitor drag,
   crashes, worker suspension, target rejection, cancellation, disk full, expiry,
   origin spoofing, stale/replayed tickets and independent byte-hash oracles.
5. Stage a one-install migration with explicit owner approval. Preserve prior signed
   installer/host registration and session descriptors for rollback; invalidate new
   leases, switch discovery back and verify Chutey local access and REDOWN cloud
   operations. Never migrate credentials or enable native permissions silently.
6. Only after these gates add the future desktop IPC adapter. Keep the immediate
   browser fallback available when a capability is absent or the broker is offline.

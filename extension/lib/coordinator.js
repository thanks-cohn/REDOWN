import { fail, providerId, safeUrl, safeError, sourceUrl } from "./common.js";
import { acquireSource } from "./source.js";
export function createCoordinator({
  store,
  auth,
  adapters,
  acquire = acquireSource,
  notify = () => {},
  now = () => Date.now(),
}) {
  const running = new Map(),
    warnings = new Set();
  async function event(a, stage, outcome = "Uncertain", extra = {}) {
    try {
      await store.event({
        timestamp: new Date().toISOString(),
        attemptId: a.id,
        provider: a.provider,
        stage,
        outcome,
        hostUrl: a.hostUrl,
        sourceUrl: a.sourceUrl,
        ...extra,
      });
    } catch {
      warnings.add(a.id);
      try {
        await store.noteDiagnosticsWarning(a.id);
      } catch {
        /* Core save remains independent of optional log quota. */
      }
    }
  }
  async function execute(input, id, provider) {
    const createdAt = new Date().toISOString();
    const identity = JSON.stringify([
      provider,
      input.sourceUrl,
      input.hostUrl || "",
      input.filename || "",
    ]);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(identity),
    );
    const requestHash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    let a = {
      id,
      requestHash,
      provider,
      filename: "download",
      hostUrl: safeUrl(input.hostUrl),
      sourceUrl: safeUrl(input.sourceUrl),
      createdAt,
      updatedAt: createdAt,
      state: "RECEIVED",
    };
    const started = await store.begin(a);
    if (!started.created) return started.attempt;
    await event(a, "RECEIVED");
    let uploadStarted = false;
    try {
      a = await store.patch(id, { state: "AUTH_CHECK" });
      await event(a, "AUTH_CHECK");
      const status = await auth.status(provider);
      if (!status.ready)
        throw fail(
          status.reason || "AUTH_NOT_READY",
          "The extension is not ready to save to this provider.",
          status.nextAction ||
            "Sign in or reconnect from Providers, then explicitly retry this save.",
        );
      const token = await auth.token(provider);
      a = await store.patch(id, { state: "SOURCE_CHECK" });
      await event(a, "SOURCE_CHECK");
      sourceUrl(input.sourceUrl);
      const source = await acquire(input);
      a = await store.patch(id, {
        filename: source.filename,
        mime: source.mime,
        bytes: source.bytes.byteLength,
        preview: source.preview,
        state: "UPLOADING",
      });
      await event(a, "UPLOADING");
      const began = now();
      uploadStarted = true;
      const receipt = await adapters[provider].upload({
        bytes: source.bytes,
        filename: source.filename,
        mime: source.mime,
        token,
        attemptId: id,
        onConfirming: async () => {
          a = await store.patch(id, { state: "CONFIRMING" });
          await event(a, "CONFIRMING");
        },
      });
      if (a.state !== "CONFIRMING") {
        a = await store.patch(id, { state: "CONFIRMING" });
        await event(a, "CONFIRMING");
      }
      if (
        receipt?.confirmed !== true ||
        receipt.provider !== provider ||
        !receipt.id ||
        !(
          receipt.name === source.filename ||
          receipt.requestedName === source.filename
        ) ||
        Number(receipt.size) !== source.bytes.byteLength
      )
        throw Object.assign(
          fail(
            "CONFIRMATION_MISMATCH",
            "Provider confirmation did not match the intended file.",
            "Inspect the provider before retrying to avoid duplicates.",
          ),
          { uncertain: true },
        );
      const durationMs = Math.max(0, now() - began);
      a = await store.finish(id, {
        state: "SAVED",
        filename: receipt.name,
        confirmed: true,
        objectId: receipt.id,
        durationMs,
        ...(warnings.has(id)
          ? { diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE" }
          : {}),
        message: "Provider confirmed the saved file.",
        nextAction: "View the file on the provider website.",
      });
      await event(a, "SAVED", "Success", {
        bytes: a.bytes,
        durationMs,
        speedBps:
          durationMs > 0 ? Math.round((a.bytes * 1000) / durationMs) : null,
      });
    } catch (e) {
      const error = safeError(e);
      const state =
        e.uncertain || (uploadStarted && !e.definitive)
          ? "UNCERTAIN"
          : "FAILED";
      // If durable finalization fails, never show SAVED or increment in a separate transaction.
      a = await store.finish(id, {
        state,
        ...error,
        ...(warnings.has(id)
          ? { diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE" }
          : {}),
      });
      await event(a, state, state === "FAILED" ? "Failure" : "Uncertain", {
        code: error.code,
        cause: error.message,
        ...(Number.isInteger(e.httpStatus) ? { httpStatus: e.httpStatus } : {}),
      });
    }
    if (warnings.has(id))
      a = { ...a, diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE" };
    warnings.delete(id);
    try {
      await notify(a);
    } catch {}
    return a;
  }
  return {
    start(input) {
      providerId(input.provider);
      const id = input.requestId || crypto.randomUUID();
      if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(id))
        throw fail(
          "INVALID_REQUEST_ID",
          "Use an 8–100 character request ID containing letters, numbers, underscores or hyphens.",
        );
      const identity = JSON.stringify([
        input.provider,
        input.sourceUrl,
        input.hostUrl || "",
        input.filename || "",
      ]);
      if (running.has(id)) {
        const existing = running.get(id);
        if (existing.identity !== identity)
          throw fail(
            "IDEMPOTENCY_CONFLICT",
            "This request ID belongs to a different save.",
            "Use a new request ID for a new save.",
          );
        return existing.promise;
      }
      const promise = execute(input, id, input.provider).finally(() =>
        running.delete(id),
      );
      running.set(id, { identity, promise });
      return promise;
    },
  };
}

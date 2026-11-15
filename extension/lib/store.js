import { BASIC_STORAGE } from "./identity.js";
import { fail, TERMINAL } from "./common.js";
export const DEFAULTS = Object.freeze({
  theme: "light",
  pageSize: 40,
  expansionScope: "none",
  expansionComponent: "both",
  diagnosticsEnabled: true,
  diagnosticsCap: 4000,
});
const req = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const done = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error("Transaction aborted"));
  });
export function validateSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw fail("INVALID_SETTINGS", "Settings must be an object.");
  for (const [k, v] of Object.entries(input)) {
    const valid =
      k === "theme"
        ? ["light", "dark"].includes(v)
        : k === "pageSize"
          ? [10, 20, 40, 100].includes(v)
          : k === "expansionScope"
            ? ["none", "first", "all"].includes(v)
            : k === "expansionComponent"
              ? ["image", "urls", "both"].includes(v)
              : k === "diagnosticsEnabled"
                ? typeof v === "boolean"
                : k === "diagnosticsCap"
                  ? v === null || (Number.isSafeInteger(v) && v > 0)
                  : false;
    if (!valid)
      throw fail(
        "INVALID_SETTINGS",
        `Invalid setting: ${k}.`,
        "Use a positive whole-number diagnostics cap or Unlimited.",
      );
  }
  return input;
}
export async function openStore(
  indexedDB = globalThis.indexedDB,
  name = BASIC_STORAGE.database,
) {
  const opening = indexedDB.open(name, 1);
  opening.onupgradeneeded = () => {
    const db = opening.result;
    const attempts = db.createObjectStore("attempts", { keyPath: "id" });
    attempts.createIndex("createdAt", "createdAt");
    attempts.createIndex("state", "state");
    const events = db.createObjectStore("events", {
      keyPath: "id",
      autoIncrement: true,
    });
    events.createIndex("attemptId", "attemptId");
    db.createObjectStore("ledger", { keyPath: "id" });
    db.createObjectStore("meta");
  };
  const db = await req(opening);
  db.onversionchange = () => db.close();
  async function run(names, mode, fn) {
    const tx = db.transaction(names, mode);
    const completion = done(tx);
    try {
      const value = await fn(tx);
      await completion;
      return value;
    } catch (e) {
      try {
        tx.abort();
      } catch {}
      await completion.catch(() => {});
      throw e;
    }
  }
  const read = (store, key) =>
    run([store], "readonly", (tx) => req(tx.objectStore(store).get(key)));
  const settings = async () => ({
    ...DEFAULTS,
    ...(await read("meta", "settings")),
  });
  async function prune(tx, cap) {
    if (cap === null) return;
    const store = tx.objectStore("events");
    const n = await req(store.count());
    let remove = n - cap;
    if (remove <= 0) return;
    await new Promise((resolve, reject) => {
      const cursor = store.openCursor();
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c || remove <= 0) return resolve();
        c.delete();
        remove--;
        c.continue();
      };
    });
  }
  async function list(
    store,
    { page = 1, pageSize = 40, index, attemptId } = {},
  ) {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    )
      throw fail(
        "INVALID_PAGE",
        "Page must be positive and page size between 1 and 100.",
      );
    return run([store], "readonly", async (tx) => {
      let s = tx.objectStore(store);
      if (index) s = s.index(index);
      if (attemptId) s = s.index("attemptId");
      const range = attemptId ? IDBKeyRange.only(attemptId) : null;
      const total = await req(s.count(range));
      const items = [];
      const offset = (page - 1) * pageSize;
      if (!Number.isSafeInteger(offset))
        throw fail("INVALID_PAGE", "Page is too large.");
      if (offset < total)
        await new Promise((resolve, reject) => {
          let skipped = false;
          const r = s.openCursor(range, "prev");
          r.onerror = () => reject(r.error);
          r.onsuccess = () => {
            const c = r.result;
            if (!c || items.length >= pageSize) return resolve();
            if (offset && !skipped) {
              skipped = true;
              c.advance(offset);
              return;
            }
            items.push(c.value);
            c.continue();
          };
        });
      return {
        items,
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      };
    });
  }
  return {
    close: () => db.close(),
    settings,
    updateSettings: async (input) => {
      validateSettings(input);
      return run(["meta", "events"], "readwrite", async (tx) => {
        const s = {
          ...DEFAULTS,
          ...(await req(tx.objectStore("meta").get("settings"))),
          ...input,
        };
        await req(tx.objectStore("meta").put(s, "settings"));
        await prune(tx, s.diagnosticsCap);
        return s;
      });
    },
    getAttempt: (id) => read("attempts", id),
    begin: (attempt) =>
      run(["attempts", "ledger"], "readwrite", async (tx) => {
        const existing = await req(tx.objectStore("attempts").get(attempt.id));
        if (existing) {
          if (existing.requestHash !== attempt.requestHash)
            throw fail(
              "IDEMPOTENCY_CONFLICT",
              "This request ID belongs to a different save.",
              "Use a new request ID for a new save.",
            );
          return { created: false, attempt: existing };
        }
        if (await req(tx.objectStore("ledger").get(attempt.id)))
          throw fail(
            "ALREADY_COMPLETED",
            "This save already completed; its History record was deleted.",
            "Use a new request ID for a new save.",
          );
        await req(tx.objectStore("attempts").add(attempt));
        return { created: true, attempt };
      }),
    patch: (id, patch) =>
      run(["attempts"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts");
        const a = await req(s.get(id));
        if (!a) throw fail("ATTEMPT_NOT_FOUND", "Save attempt not found.");
        if (TERMINAL.has(a.state)) return a;
        const next = {
          ...a,
          ...patch,
          id,
          updatedAt: new Date().toISOString(),
        };
        await req(s.put(next));
        return next;
      }),
    finish: (id, patch) =>
      run(["attempts", "ledger", "meta"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts"),
          a = await req(s.get(id));
        if (!a) throw fail("ATTEMPT_NOT_FOUND", "Save attempt not found.");
        if (TERMINAL.has(a.state)) return a;
        if (!TERMINAL.has(patch.state))
          throw fail("INVALID_TRANSITION", "A terminal outcome is required.");
        if (
          patch.state === "SAVED" &&
          (!patch.objectId || patch.confirmed !== true)
        )
          throw fail(
            "CONFIRMATION_REQUIRED",
            "Provider confirmation is required.",
          );
        const next = {
          ...a,
          ...patch,
          id,
          updatedAt: new Date().toISOString(),
        };
        if (next.state === "SAVED") {
          const ledger = tx.objectStore("ledger"),
            meta = tx.objectStore("meta");
          if (!(await req(ledger.get(id)))) {
            await req(
              ledger.add({
                id,
                provider: a.provider,
                objectId: patch.objectId,
              }),
            );
            const count = (await req(meta.get("count"))) || 0;
            await req(meta.put(count + 1, "count"));
          }
        }
        await req(s.put(next));
        return next;
      }),
    noteDiagnosticsWarning: (id) =>
      run(["attempts"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts"),
          a = await req(s.get(id));
        if (a)
          await req(
            s.put({
              ...a,
              diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE",
            }),
          );
      }),
    counter: async () => ({ count: (await read("meta", "count")) || 0 }),
    historyList: async (input) =>
      list("attempts", {
        pageSize: (await settings()).pageSize,
        ...input,
        index: "createdAt",
      }),
    historyDelete: (id) =>
      run(["attempts"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts");
        const a = await req(s.get(id));
        if (a && !TERMINAL.has(a.state))
          throw fail("ATTEMPT_ACTIVE", "Wait until the save finishes.");
        await req(s.delete(id));
        return { deleted: !!a };
      }),
    historyClear: () =>
      run(["attempts"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts");
        let deleted = 0;
        await new Promise((resolve, reject) => {
          const r = s.openCursor();
          r.onerror = () => reject(r.error);
          r.onsuccess = () => {
            const c = r.result;
            if (!c) return resolve();
            if (TERMINAL.has(c.value.state)) {
              c.delete();
              deleted++;
            }
            c.continue();
          };
        });
        return { deleted };
      }),
    event: (event) =>
      run(["events", "meta"], "readwrite", async (tx) => {
        const s = {
          ...DEFAULTS,
          ...(await req(tx.objectStore("meta").get("settings"))),
        };
        if (!s.diagnosticsEnabled) return { recorded: false };
        await req(tx.objectStore("events").add(event));
        await prune(tx, s.diagnosticsCap);
        return { recorded: true };
      }),
    diagnosticsList: (input) => list("events", input),
    diagnosticsForAttempt: (id, input) =>
      list("events", { ...input, attemptId: id }),
    diagnosticsClear: () =>
      run(["events"], "readwrite", async (tx) => {
        await req(tx.objectStore("events").clear());
        return { cleared: true };
      }),
    // Keyset pages for export: bounded reads; never collect unlimited logs in RAM.
    eventChunk: (after = 0, limit = 100, upper = Infinity) =>
      run(
        ["events"],
        "readonly",
        (tx) =>
          new Promise((resolve, reject) => {
            const items = [];
            const r = tx
              .objectStore("events")
              .openCursor(IDBKeyRange.lowerBound(after, true));
            r.onerror = () => reject(r.error);
            r.onsuccess = () => {
              const c = r.result;
              if (!c || c.key > upper || items.length >= limit)
                return resolve(items);
              items.push(c.value);
              c.continue();
            };
          }),
      ),
    eventLastId: () =>
      run(
        ["events"],
        "readonly",
        (tx) =>
          new Promise((resolve, reject) => {
            const r = tx.objectStore("events").openCursor(null, "prev");
            r.onerror = () => reject(r.error);
            r.onsuccess = () => resolve(r.result?.key || 0);
          }),
      ),
    recover: () =>
      run(["attempts"], "readwrite", async (tx) => {
        let count = 0;
        const index = tx.objectStore("attempts").index("state");
        for (const state of [
          "RECEIVED",
          "AUTH_CHECK",
          "SOURCE_CHECK",
          "UPLOADING",
          "CONFIRMING",
        ]) {
          await new Promise((resolve, reject) => {
            const r = index.openCursor(IDBKeyRange.only(state));
            r.onerror = () => reject(r.error);
            r.onsuccess = () => {
              const c = r.result;
              if (!c) return resolve();
              c.update({
                ...c.value,
                state: "UNCERTAIN",
                code: "WORKER_INTERRUPTED",
                message: "The worker stopped before an outcome was recorded.",
                nextAction:
                  "Check the provider for the file before retrying; no automatic replay.",
                updatedAt: new Date().toISOString(),
              });
              count++;
              c.continue();
            };
          });
        }
        return { interrupted: count };
      }),
  };
}

// Runs only against fresh in-memory fake stores. Never accepts a caller-supplied adapter/store.
import { createSimulationEngine, initialState } from "./simulation.mjs";
import { API_VERSION } from "./contract.mjs";
export const ACCEPTANCE_VERSION = "1.0.0";
export const READINESS = Object.freeze({
  releaseReady: false,
  scope: "simulation foundation",
  requiredBeforeRelease: Object.freeze([
    "real R2 adapter and authorized byte-integrity acceptance",
    "second real provider with the same explorer contract",
    "local filesystem adapter and permission model",
    "binary upload/download and media preview",
    "durable interrupted-job recovery and safe reconciliation",
    "installed-extension security/accessibility/performance acceptance",
    "published competitor workflow benchmarks",
  ]),
  future: Object.freeze([
    "authorized cross-computer transport and device identity",
  ]),
});
export async function runSimulationAcceptance() {
  const startedAt = new Date().toISOString(),
    checks = [];
  const id = (key, provider = "fake-r2") => ({
    provider,
    account: "demo",
    container: "sandbox",
    key,
  });
  const hash = async (text) =>
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
      ),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  async function check(name, fn) {
    let snapshot = initialState(),
      tail = Promise.resolve();
    const receipts = [];
    const store = {
      read: async () => structuredClone(snapshot),
      update(fn) {
        const next = tail.then(() => {
          const candidate = structuredClone(snapshot),
            result = fn(candidate);
          snapshot = candidate;
          return result;
        });
        tail = next.catch(() => {});
        return next;
      },
    };
    const engine = createSimulationEngine(store),
      assert = (condition, code) => {
        if (!condition) throw Error(code);
      };
    const run = async (operation, args = {}) => {
      const job = await engine.run({
        apiVersion: API_VERSION,
        idempotencyKey: crypto.randomUUID(),
        operation,
        ...args,
      });
      receipts.push({
        id: job.id,
        operation,
        state: job.state,
        verification: job.receipt?.level || null,
        providerEvidence: false,
      });
      return job;
    };
    try {
      const evidence = await fn({ engine, store, run, assert, hash, id });
      checks.push({
        id: name,
        state: "passed",
        evidence: evidence || {},
        receipts,
      });
    } catch (error) {
      checks.push({
        id: name,
        state: "failed",
        code: /^[A-Z_]{1,80}$/.test(error.message)
          ? error.message
          : "ASSERTION_FAILED",
        receipts,
      });
    }
  }
  await check("complete-pagination", async ({ store, run, assert, id }) => {
    await store.update((s) => {
      for (let i = 0; i < 55; i++)
        s.objects.push({
          ...id("Page/" + i + ".txt"),
          revision: 1,
          content: "fixture",
        });
    });
    let cursor,
      keys = [];
    do {
      const job = await run("list", {
        source: id("Page/"),
        limit: 10,
        ...(cursor ? { cursor } : {}),
      });
      assert(job.state === "completed", "LIST_FAILED");
      keys.push(...job.result.objects.map((o) => o.key));
      cursor = job.result.cursor;
    } while (cursor);
    assert(
      keys.length === 55 && new Set(keys).size === 55,
      "PAGINATION_INCOMPLETE",
    );
    return { expectedObjects: 55, observedObjects: keys.length };
  });
  await check("upload-content-readback", async ({ run, assert, hash, id }) => {
    const content = "REDOWN acceptance fixture ✓";
    assert(
      (await run("upload", { destination: id("Fixture.txt"), content }))
        .state === "completed",
      "UPLOAD_FAILED",
    );
    const observed = await run("read", { source: id("Fixture.txt") });
    const expected = await hash(content),
      actual = await hash(observed.result.content);
    assert(actual === expected, "CONTENT_HASH_MISMATCH");
    return { algorithm: "SHA-256", expected, actual };
  });
  await check(
    "cross-provider-copy-preserves-source",
    async ({ run, assert, hash, id }) => {
      const before = await run("read", { source: id("Welcome.txt") });
      assert(
        (
          await run("copy", {
            source: id("Welcome.txt"),
            destination: id("Copied.txt", "fake-drive"),
          })
        ).state === "completed",
        "COPY_FAILED",
      );
      const source = await run("read", { source: id("Welcome.txt") }),
        target = await run("read", { source: id("Copied.txt", "fake-drive") });
      assert(
        source.result.content === before.result.content,
        "COPY_CHANGED_SOURCE",
      );
      assert(
        (await hash(target.result.content)) ===
          (await hash(before.result.content)),
        "CONTENT_HASH_MISMATCH",
      );
      return {
        sourceRetained: true,
        contentHash: await hash(target.result.content),
      };
    },
  );
  await check("verified-move", async ({ run, assert, id }) => {
    const job = await run("move", {
      source: id("Welcome.txt"),
      destination: id("Moved.txt", "fake-drive"),
      confirmed: true,
    });
    assert(
      job.state === "completed" && job.receipt.providerEvidence === false,
      "MOVE_UNVERIFIED",
    );
    assert(
      (await run("metadata", { source: id("Welcome.txt") })).state === "failed",
      "SOURCE_NOT_REMOVED",
    );
    assert(
      (await run("read", { source: id("Moved.txt", "fake-drive") })).state ===
        "completed",
      "DESTINATION_MISSING",
    );
    return { destinationObserved: true, sourceRemoved: true };
  });
  await check("conflict-retains-both", async ({ run, assert, store, id }) => {
    const before = await store.read();
    const job = await run("copy", {
      source: id("Welcome.txt"),
      destination: id("Documents/Example.txt"),
    });
    assert(job.error === "CONFLICT", "CONFLICT_NOT_DETECTED");
    assert(
      JSON.stringify((await store.read()).objects) ===
        JSON.stringify(before.objects),
      "CONFLICT_CHANGED_OBJECTS",
    );
    return { allObjectsUnchanged: true };
  });
  await check("recursive-copy", async ({ run, assert, id }) => {
    assert(
      (
        await run("copy", {
          source: id("Documents/"),
          destination: id("Tree/", "fake-drive"),
        })
      ).state === "completed",
      "RECURSIVE_COPY_FAILED",
    );
    assert(
      (await run("read", { source: id("Tree/Example.txt", "fake-drive") }))
        .state === "completed",
      "CHILD_MISSING",
    );
    assert(
      (await run("read", { source: id("Documents/Example.txt") })).state ===
        "completed",
      "SOURCE_CHANGED",
    );
    return { childObserved: true, sourceRetained: true };
  });
  await check("rename-exact-target", async ({ run, assert, id }) => {
    assert(
      (
        await run("rename", {
          source: id("Welcome.txt"),
          destination: id("Renamed.txt"),
          confirmed: true,
        })
      ).state === "completed",
      "RENAME_FAILED",
    );
    assert(
      (await run("read", { source: id("Renamed.txt") })).state === "completed",
      "RENAMED_TARGET_MISSING",
    );
    assert(
      (await run("read", { source: id("Documents/Example.txt") })).state ===
        "completed",
      "UNRELATED_OBJECT_CHANGED",
    );
  });
  await check("delete-exact-target", async ({ run, assert, id }) => {
    assert(
      (await run("delete", { source: id("Welcome.txt"), confirmed: true }))
        .state === "completed",
      "DELETE_FAILED",
    );
    assert(
      (await run("metadata", { source: id("Welcome.txt") })).state === "failed",
      "DELETE_NOT_OBSERVED",
    );
    assert(
      (await run("read", { source: id("Documents/Example.txt") })).state ===
        "completed",
      "UNRELATED_OBJECT_CHANGED",
    );
  });
  await check(
    "idempotency-across-coordinators",
    async ({ engine, store, assert, id }) => {
      const input = {
        apiVersion: API_VERSION,
        operation: "copy",
        source: id("Welcome.txt"),
        destination: id("Once.txt"),
        idempotencyKey: "same-request",
      };
      const [a, b] = await Promise.all([
        engine.run(input),
        createSimulationEngine(store).run(input),
      ]);
      assert(a.id === b.id, "DUPLICATE_EXECUTION");
      assert(
        (await store.read()).objects.filter((o) => o.key === "Once.txt")
          .length === 1,
        "DUPLICATE_OBJECT",
      );
      return { sameOperationId: true };
    },
  );
  await check("reopen-journal", async ({ engine, store, run, assert, id }) => {
    const job = await run("read", { source: id("Welcome.txt") }),
      reopened = createSimulationEngine(store);
    const evidence = await reopened.inspect(job.id);
    assert(
      evidence.state === "completed" && evidence.events.length === 7,
      "REOPEN_LOST_RECEIPT",
    );
    const before = JSON.stringify(await store.read());
    await reopened.diagnose(job.id);
    assert(JSON.stringify(await store.read()) === before, "INSPECTION_MUTATED");
    return { events: evidence.events.length, inspectionReadOnly: true };
  });
  await check("routing-fails-closed", async ({ run, assert, id }) => {
    const job = await run("read", {
      source: id("Welcome.txt", "cloudflare-r2"),
    });
    assert(job.error === "UNSUPPORTED_PROVIDER", "REAL_PROVIDER_ACCEPTED");
    return { realProviderBlocked: true };
  });
  await check(
    "destructive-confirmation",
    async ({ run, store, assert, id }) => {
      const before = JSON.stringify(await store.read());
      let blocked = false;
      try {
        await run("delete", { source: id("Welcome.txt") });
      } catch (error) {
        blocked = error.code === "CONFIRMATION_REQUIRED";
      }
      assert(blocked, "CONFIRMATION_BYPASSED");
      assert(
        JSON.stringify(await store.read()) === before,
        "UNCONFIRMED_MUTATION",
      );
      return { confirmationRequired: true };
    },
  );
  return {
    acceptanceVersion: ACCEPTANCE_VERSION,
    readiness: structuredClone(READINESS),
    startedAt,
    finishedAt: new Date().toISOString(),
    scope:
      "isolated in-memory simulation; actual shared core, no browser UI, no installed extension or real provider",
    state: checks.every((c) => c.state === "passed") ? "passed" : "failed",
    passed: checks.filter((c) => c.state === "passed").length,
    failed: checks.filter((c) => c.state === "failed").length,
    checks,
    unverified: [
      "installed extension",
      "live R2",
      "real Google Drive",
      "local filesystem integration",
      "binary upload/download",
      "network fault recovery",
      "cross-computer transport",
      "competitor parity",
    ],
  };
}

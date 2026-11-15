import test from "node:test";
import assert from "node:assert/strict";
import {
  createAdapters,
  sha256,
  dropboxHash,
  microsoftUploadURL,
} from "../extension/providers/index.js";
const value = {
  bytes: new Uint8Array([1, 2, 3, 4]),
  filename: "image.png",
  mime: "image/png",
  token: "secret-token",
  attemptId: "attempt",
};
const json = (data, status = 200, headers) =>
  new Response(JSON.stringify(data), { status, headers });
function fixture(
  provider,
  {
    bytes = value.bytes,
    mutate = (x) => x,
    interrupt = "",
    checksum = true,
    readback = bytes,
  } = {},
) {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, ...options });
    if (interrupt && url.includes(interrupt)) throw Error("raw private body");
    if (provider === "google") {
      if (url.includes("uploadType"))
        return new Response("", {
          headers: {
            location:
              "https://www.googleapis.com/upload/drive/v3/files?upload_id=opaque",
          },
        });
      if (options.method === "PUT") return json({ id: "google-id" });
      if (url.includes("alt=media")) return new Response(readback);
      return json(
        mutate({
          id: "google-id",
          name: value.filename,
          size: String(bytes.length),
          trashed: false,
          ...(checksum ? { sha256Checksum: await sha256(bytes) } : {}),
        }),
      );
    }
    if (provider === "dropbox") {
      if (url.endsWith("/start")) return json({ session_id: "session" });
      if (url.endsWith("/append_v2")) return new Response("");
      const object = {
        ".tag": "file",
        id: "id:dropbox-id",
        rev: "revision",
        name: value.filename,
        size: bytes.length,
        content_hash: await dropboxHash(bytes),
      };
      return json(url.endsWith("/finish") ? object : mutate(object));
    }
    if (url.includes("root?")) return json({ id: "root" });
    if (url.endsWith("createUploadSession"))
      return json({
        uploadUrl: "https://tenant.sharepoint.com/upload?opaque=session",
      });
    if (options.method === "PUT") {
      const range = options.headers["Content-Range"];
      const end = Number(range.split("-")[1].split("/")[0]);
      return end + 1 === bytes.length
        ? json({ id: "onedrive-id", name: value.filename }, 201)
        : json({ nextExpectedRanges: [`${end + 1}-`] }, 202);
    }
    if (url.endsWith("/content")) return new Response(readback);
    return json(
      mutate({
        id: "onedrive-id",
        name: value.filename,
        size: bytes.length,
        parentReference: { id: "root" },
        file: { hashes: checksum ? { sha256Hash: await sha256(bytes) } : {} },
      }),
    );
  };
  return {
    calls,
    fetch: request,
    adapters: createAdapters({ fetch: request }),
  };
}
for (const provider of ["google", "dropbox", "onedrive"]) {
  test(`${provider}: real byte payload and independent metadata/hash proof precede confirmation`, async () => {
    const f = fixture(provider);
    const result = await f.adapters[provider].upload(value);
    assert.equal(result.confirmed, true);
    assert.equal(result.size, 4);
    assert.equal(result.name, "image.png");
    const writes = f.calls.filter(
      (c) => c.body instanceof Uint8Array && c.body.length,
    );
    assert.deepEqual([...writes.flatMap((c) => [...c.body])], [...value.bytes]);
    for (const call of f.calls) {
      assert.equal(call.credentials, "omit");
      assert.equal(call.referrerPolicy, "no-referrer");
      assert.ok(!String(JSON.stringify(call.body)).includes("sourceUrl"));
      assert.ok(!String(JSON.stringify(call.body)).includes("hostUrl"));
    }
  });
  test(`${provider}: missing/mismatched metadata is uncertain, never confirmed`, async () => {
    const f = fixture(provider, { mutate: (o) => ({ ...o, size: "invalid" }) });
    await assert.rejects(
      f.adapters[provider].upload(value),
      (e) => e.uncertain === true,
    );
  });
  test(`${provider}: final ambiguous commit is sent once and never automatically replayed`, async () => {
    const suffix =
      provider === "google"
        ? "?upload_id="
        : provider === "dropbox"
          ? "/finish"
          : "/upload?";
    const f = fixture(provider, { interrupt: suffix });
    await assert.rejects(
      f.adapters[provider].upload(value),
      (e) => e.uncertain === true && !e.message.includes("raw private"),
    );
    assert.equal(f.calls.filter((c) => c.url.includes(suffix)).length, 1);
  });
  test(`${provider}: rejects empty and oversized input before network`, async () => {
    const f = fixture(provider);
    for (const bytes of [
      new Uint8Array(),
      new Uint8Array(32 * 1024 * 1024 + 1),
    ])
      await assert.rejects(f.adapters[provider].upload({ ...value, bytes }), {
        code: "UPLOAD_INPUT_INVALID",
      });
    assert.equal(f.calls.length, 0);
  });
}
for (const provider of ["google", "onedrive"]) {
  test(`${provider}: absent server SHA256 falls back to exact streamed byte readback`, async () => {
    const f = fixture(provider, { checksum: false });
    assert.equal((await f.adapters[provider].upload(value)).confirmed, true);
    assert.equal(f.calls.at(-1).redirect, "follow");
  });
  test(`${provider}: wrong readback bytes remain uncertain`, async () => {
    const f = fixture(provider, {
      checksum: false,
      readback: new Uint8Array([1, 2, 9, 4]),
    });
    await assert.rejects(f.adapters[provider].upload(value), {
      code: "PROVIDER_BYTES_MISMATCH",
      uncertain: true,
    });
  });
  test(`${provider}: server checksum mismatch cannot be marked saved`, async () => {
    const f = fixture(provider, {
      mutate: (o) =>
        provider === "google"
          ? { ...o, sha256Checksum: "bad" }
          : { ...o, file: { hashes: { sha256Hash: "bad" } } },
    });
    await assert.rejects(
      f.adapters[provider].upload(value),
      (e) => e.uncertain === true && /MISMATCH/.test(e.code),
    );
  });
}
test("Dropbox content hash is SHA256 of concatenated 4MiB block SHA256 values", async () => {
  const bytes = new Uint8Array(4 * 1024 * 1024 + 1).fill(19);
  const joined = new Uint8Array(64);
  joined.set(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", bytes.subarray(0, -1)),
    ),
  );
  joined.set(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.subarray(-1))),
    32,
  );
  assert.equal(await dropboxHash(bytes), await sha256(joined));
});
test("Dropbox sessions append successful empty HTTP body then finish exact remaining bytes", async () => {
  const bytes = new Uint8Array(4 * 1024 * 1024 + 1).fill(7),
    f = fixture("dropbox", { bytes });
  assert.equal(
    (await f.adapters.dropbox.upload({ ...value, bytes })).size,
    bytes.length,
  );
  const append = f.calls.find((c) => c.url.endsWith("/append_v2")),
    finish = f.calls.find((c) => c.url.endsWith("/finish"));
  assert.equal(append.body.length, 4 * 1024 * 1024);
  assert.equal(finish.body.length, 1);
  assert.equal(
    JSON.parse(finish.headers["Dropbox-API-Arg"]).cursor.offset,
    append.body.length,
  );
});
test("OneDrive uses exact known total, aligned nonfinal ranges and no Authorization on opaque upload URL", async () => {
  const bytes = new Uint8Array(16 * 320 * 1024 + 3),
    f = fixture("onedrive", { bytes });
  assert.equal(
    (await f.adapters.onedrive.upload({ ...value, bytes })).confirmed,
    true,
  );
  const chunks = f.calls.filter((c) => c.method === "PUT");
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].body.length % (320 * 1024), 0);
  for (const c of chunks) {
    assert.ok(!c.headers.Authorization);
    assert.ok(c.headers["Content-Range"].endsWith("/" + bytes.length));
  }
});
test("OneDrive refuses unexpected next byte range and never sends final fragment", async () => {
  let writes = 0;
  const adapters = createAdapters({
    fetch: async (url, options) => {
      if (url.includes("root?")) return json({ id: "root" });
      if (url.endsWith("createUploadSession"))
        return json({ uploadUrl: "https://tenant.sharepoint.com/upload" });
      writes++;
      return json({ nextExpectedRanges: ["0-"] }, 202);
    },
  });
  await assert.rejects(
    adapters.onedrive.upload({
      ...value,
      bytes: new Uint8Array(6 * 1024 * 1024),
    }),
    { code: "ONEDRIVE_RANGE_UNCERTAIN", uncertain: true },
  );
  assert.equal(writes, 1);
});
test("OneDrive session endpoint rejects HTTP, lookalike hosts, user info and unexpected ports", () => {
  for (const u of [
    "http://tenant.sharepoint.com/upload",
    "https://tenant.sharepoint.com.evil.test/upload",
    "https://user@tenant.sharepoint.com/upload",
    "https://tenant.sharepoint.com:444/upload",
    "file:///tmp/a",
  ])
    assert.throws(() => microsoftUploadURL(u), {
      code: "UPLOAD_ENDPOINT_INVALID",
    });
  assert.equal(
    microsoftUploadURL("https://tenant.1drv.com/upload"),
    "https://tenant.1drv.com/upload",
  );
});
test("Google refuses untrusted session endpoint without forwarding credentials", async () => {
  const calls = [];
  const a = createAdapters({
    fetch: async (url) => {
      calls.push(url);
      return new Response("", {
        headers: { location: "https://attacker.example/upload/drive/x" },
      });
    },
  });
  await assert.rejects(a.google.upload(value), {
    code: "UPLOAD_ENDPOINT_INVALID",
  });
  assert.equal(calls.length, 1);
});
test("metadata read retry is bounded to three while commit is never retried", async () => {
  let writes = 0,
    reads = 0;
  const a = createAdapters({
    fetch: async (url, options) => {
      if (url.includes("uploadType"))
        return new Response("", {
          headers: { location: "https://www.googleapis.com/upload/drive/x" },
        });
      if (options.method === "PUT") {
        writes++;
        return json({ id: "id" });
      }
      reads++;
      return json({}, 503);
    },
  });
  await assert.rejects(a.google.upload(value), (e) => e.uncertain === true);
  assert.equal(writes, 1);
  assert.equal(reads, 3);
});

// Full local pipeline from the native menu input through source acquisition,
// provider protocol and proof to the durable ledger. These are HTTP fixtures,
// deliberately distinct from authorized installed-Chrome/provider acceptance.
import "fake-indexeddb/auto";
import { openStore } from "../extension/lib/store.js";
import { acquireSource } from "../extension/lib/source.js";
import { createCoordinator } from "../extension/lib/coordinator.js";
import { clickedInput } from "../extension/background.js";
for (const provider of ["google", "dropbox", "onedrive"]) {
  test(`${provider}: native-click source bytes traverse real adapter proof, History and exactly-once ledger`, async () => {
    const f = fixture(provider),
      store = await openStore(
        indexedDB,
        "provider-integration-" + crypto.randomUUID(),
      );
    const sourceCalls = [];
    const input = {
      ...clickedInput(
        {
          menuItemId: "save:" + provider,
          linkUrl: "https://files.example/image.png?token=private",
          pageUrl: "https://page.example/article",
        },
        {},
      ),
      requestId: provider + "-native-real-pipeline",
    };
    const acquire = async (input) =>
      acquireSource(input, {
        fetch: async (url, options) => {
          sourceCalls.push({ url, options });
          return new Response(value.bytes, {
            headers: { "content-type": value.mime },
          });
        },
      });
    const adapters = createAdapters({
      fetch: async (url, options) => {
        const proof =
          url.includes("?fields=id,name") ||
          url.endsWith("/files/get_metadata") ||
          (url.includes("/me/drive/items/") &&
            !url.endsWith("createUploadSession"));
        if (proof)
          assert.equal(
            (await store.getAttempt(input.requestId)).state,
            "CONFIRMING",
          );
        return f.fetch(url, options);
      },
    });
    const c = createCoordinator({
      store,
      auth: {
        status: async () => ({ ready: true }),
        token: async () => value.token,
      },
      adapters,
      acquire,
    });
    try {
      const saved = await c.start(input);
      assert.equal(saved.state, "SAVED");
      assert.equal(saved.filename, "image.png");
      assert.equal(saved.bytes, 4);
      assert.equal(sourceCalls.length, 1);
      assert.equal(sourceCalls[0].url, input.sourceUrl);
      assert.equal((await store.counter()).count, 1);
      assert.equal(
        (await store.historyList()).items[0].objectId,
        saved.objectId,
      );
      const eventStages = (
        await store.diagnosticsForAttempt(saved.id)
      ).items.map((e) => e.stage);
      assert.ok(eventStages.includes("CONFIRMING"));
      assert.ok(eventStages.includes("SAVED"));
      const before = f.calls.length;
      await c.start(input);
      assert.equal(f.calls.length, before);
      assert.equal((await store.counter()).count, 1);
      for (const call of f.calls) {
        assert.ok(!String(call.body).includes("files.example"));
        assert.ok(!String(call.body).includes("page.example"));
      }
    } finally {
      store.close();
    }
  });
  test(`${provider}: native-click provider proof mismatch remains uncertain and does not increment`, async () => {
    const f = fixture(provider, { mutate: (o) => ({ ...o, size: 9999 }) }),
      store = await openStore(
        indexedDB,
        "provider-mismatch-" + crypto.randomUUID(),
      );
    const c = createCoordinator({
      store,
      auth: {
        status: async () => ({ ready: true }),
        token: async () => value.token,
      },
      adapters: f.adapters,
      acquire: (input) =>
        acquireSource(input, {
          fetch: async () =>
            new Response(value.bytes, {
              headers: { "content-type": value.mime },
            }),
        }),
    });
    try {
      const result = await c.start({
        ...clickedInput({
          menuItemId: "save:" + provider,
          srcUrl: "https://files.example/image.png",
          pageUrl: "https://page.example/",
        }),
        requestId: provider + "-native-mismatch",
      });
      assert.equal(result.state, "UNCERTAIN");
      assert.equal((await store.counter()).count, 0);
      assert.equal((await store.historyList()).total, 1);
    } finally {
      store.close();
    }
  });
  test(`${provider}: definitive precommit rejection is failed with no count or false success`, async () => {
    const store = await openStore(
      indexedDB,
      "provider-rejected-" + crypto.randomUUID(),
    );
    const adapters = createAdapters({ fetch: async () => json({}, 403) });
    const c = createCoordinator({
      store,
      auth: {
        status: async () => ({ ready: true }),
        token: async () => value.token,
      },
      adapters,
      acquire: (input) =>
        acquireSource(input, {
          fetch: async () =>
            new Response(value.bytes, {
              headers: { "content-type": value.mime },
            }),
        }),
    });
    try {
      const result = await c.start({
        ...clickedInput({
          menuItemId: "save:" + provider,
          srcUrl: "https://files.example/image.png",
        }),
        requestId: provider + "-native-denied",
      });
      assert.equal(result.state, "FAILED");
      assert.equal((await store.counter()).count, 0);
    } finally {
      store.close();
    }
  });
}

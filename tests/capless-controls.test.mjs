import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import * as fflate from "fflate";
const pause = () => new Promise((r) => setImmediate(r));
function fixture() {
  const html = readFileSync("extension/options.html", "utf8"),
    start = html.indexOf('<details id="capless-panel">'),
    panel = html.slice(start, html.indexOf("</details>", start) + 10),
    dom = new JSDOM(panel, { runScripts: "outside-only" }),
    w = dom.window;
  let on = false,
    accepted = false,
    aborted = false;
  const calls = [];
  w.confirm = () => accepted;
  w.RedownFlightRecorder = {
    status: async () => ({ on, raw: false, captureIncomplete: false }),
    setConsent: async (value, opt) => {
      calls.push([value, opt]);
      on = value;
    },
    reader: async () => ({
      exportPart: async () => ({
        files: { "manifest.json": "{}" },
        more: false,
      }),
    }),
    listIncidents: async () => [],
  };
  w.fflate = fflate;
  w.TextEncoder = TextEncoder;
  w.showSaveFilePicker = async () => ({
    createWritable: async () => ({
      write: async () => {
        throw new DOMException("denied", "NotAllowedError");
      },
      abort: async () => {
        aborted = true;
      },
      close: async () => {
        throw Error("must not close failed export");
      },
    }),
  });
  w.eval(readFileSync("extension/capless-controls.js", "utf8"));
  return {
    w,
    calls,
    setAccept: (v) => (accepted = v),
    get aborted() {
      return aborted;
    },
  };
}
test("cancel leaves OFF; explicit enable/re-enable confirmation; disabling never deletes", async () => {
  const f = fixture(),
    toggle = f.w.document.getElementById("capless-logging");
  await pause();
  toggle.checked = true;
  toggle.dispatchEvent(new f.w.Event("change"));
  await pause();
  assert.equal(f.calls.length, 0);
  assert.equal(toggle.checked, false);
  f.setAccept(true);
  toggle.checked = true;
  toggle.dispatchEvent(new f.w.Event("change"));
  await pause();
  assert.equal(f.calls[0][1].confirmed, true);
  toggle.checked = false;
  toggle.dispatchEvent(new f.w.Event("change"));
  await pause();
  assert.equal(f.calls[1][0], false);
  f.setAccept(false);
  toggle.checked = true;
  toggle.dispatchEvent(new f.w.Event("change"));
  await pause();
  assert.equal(f.calls.length, 2);
  f.w.close();
});
test("revoked export permission aborts output, preserves archive and never claims a complete ZIP", async () => {
  const f = fixture();
  f.setAccept(true);
  f.w.document.getElementById("capless-export").click();
  await pause();
  await pause();
  assert.equal(f.aborted, true);
  assert.match(
    f.w.document.getElementById("capless-output").textContent,
    /interrupted or permission denied/,
  );
  assert.equal(f.calls.length, 0);
  f.w.close();
});

test("CAPLESS settings are accessible without enabling Debug Mode", () => {
  const dom = new JSDOM(readFileSync("extension/options.html", "utf8"));
  assert.equal(
    dom.window.document
      .getElementById("capless-panel")
      .closest("[data-debug-detail]"),
    null,
  );
  dom.window.close();
});

test("multipart complete export includes all incident-history pages beyond the 16-slot index even without a capless archive", async () => {
  const f = fixture(),
    w = f.w,
    blobs = [],
    downloads = [];
  f.setAccept(true);
  delete w.showSaveFilePicker;
  w.Blob = Blob;
  w.URL.createObjectURL = (blob) => {
    blobs.push(blob);
    return "blob:fixture-" + blobs.length;
  };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    downloads.push(this.download);
  };
  w.RedownCaplessArchive = {
    digest: async (text) =>
      (await import("node:crypto"))
        .createHash("sha256")
        .update(text)
        .digest("hex"),
  };
  w.RedownFlightRecorder.reader = async () => ({
    exportPart: async () => {
      throw Error("ARCHIVE_NOT_INITIALIZED");
    },
  });
  w.RedownFlightRecorder.incidentPage = async (after = 0, boundary = 70) => {
    const count = Math.min(64, 70 - after),
      rows = Array.from({ length: count }, (_, n) => ({
        sequence: after + n + 1,
        trigger: { code: "WORKER_ERROR" },
      }));
    return {
      rows,
      boundary,
      nextAfter: after + count,
      more: after + count < 70,
      metadata: { durableIncidents: 70 },
    };
  };
  w.document.getElementById("capless-export").click();
  await pause();
  await pause();
  for (let n = 0; n < 2; n++) {
    assert.equal(w.document.getElementById("capless-next-part").hidden, false);
    w.document.getElementById("capless-next-part").click();
    await pause();
    await pause();
  }
  assert.equal(w.document.getElementById("capless-next-part").hidden, true);
  assert.equal(downloads.length, 3);
  let rows = 0;
  for (const blob of blobs) {
    const files = fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
    for (const [name, data] of Object.entries(files))
      if (name.startsWith("incident-history/"))
        rows += new TextDecoder().decode(data).trim().split("\n").length;
  }
  assert.equal(rows, 70);
  w.close();
});

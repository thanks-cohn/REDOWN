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

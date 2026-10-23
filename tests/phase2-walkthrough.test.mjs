import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { installWalkthrough } from "../extension/beta-walkthrough.mjs";
import { STEPS, GUIDE_VERSION } from "../extension/beta-walkthrough-steps.mjs";
const html = await readFile(
  new URL("../extension/beta-explorer.html", import.meta.url),
  "utf8",
);
function fixture(storage) {
  const dom = new JSDOM(html, {
      url: "https://redown.invalid/beta-explorer.html",
    }),
    document = dom.window.document;
  document.getElementById("explorer").hidden = false;
  dom.window.HTMLElement.prototype.getClientRects = function () {
    return this.hidden
      ? []
      : [
          {
            left: 30,
            top: 80,
            right: 130,
            bottom: 100,
            width: 100,
            height: 20,
          },
        ];
  };
  const guide = installWalkthrough({
    document,
    ...(storage ? { storage } : {}),
    uuid: () => crypto.randomUUID(),
  });
  guide.setEnabled(true);
  return {
    dom,
    document,
    guide,
    $: (id) => document.getElementById(id),
    event: (detail) =>
      document.dispatchEvent(
        new dom.window.CustomEvent("beta:guide-event", { detail }),
      ),
    close() {
      guide.destroy();
      dom.window.close();
    },
  };
}
test("guide content exposes five introductory steps plus complete contextual feature help", () => {
  const f = fixture();
  try {
    assert.equal(STEPS.length, 34);
    assert.equal(new Set(STEPS.map((s) => s.id)).size, STEPS.length);
    for (const step of STEPS)
      assert.ok(f.document.querySelector(step.target), step.id);
    assert.equal(f.$("walkthrough-jump").options.length, 34);
    assert.equal(f.$("walkthrough-panel").hidden, true);
  } finally {
    f.close();
  }
});
test("first five steps finish separately; full continuation starts at feature six and preserves reports", () => {
  const f = fixture();
  try {
    f.guide.start("quick");
    for (let i = 0; i < 5; i++) f.$("walkthrough-next").click();
    assert.equal(f.$("walkthrough-finish").hidden, false);
    assert.equal(f.guide.report().results.length, 5);
    assert.ok(f.guide.report().results.every((r) => r.status === "read"));
    f.$("walkthrough-continue").click();
    assert.equal(f.guide.report().index, 5);
    assert.equal(f.guide.report().mode, "full");
  } finally {
    f.close();
  }
});
test("task checks require matching new evidence and preserve exact observed operation IDs without private data", () => {
  const f = fixture();
  try {
    f.guide.start("help", "paste");
    assert.equal(f.$("walkthrough-next").disabled, true);
    f.event({
      kind: "operation",
      operation: "copy",
      state: "failed",
      crossProvider: true,
    });
    assert.equal(f.$("walkthrough-next").disabled, true);
    const operationId = crypto.randomUUID();
    f.event({
      kind: "operation",
      operation: "copy",
      state: "completed",
      crossProvider: true,
      operationId,
      filename: "private.txt",
      token: "secret",
      content: "private",
    });
    assert.equal(f.$("walkthrough-next").disabled, false);
    f.$("walkthrough-next").click();
    const report = f.guide.report();
    assert.equal(report.results[0].status, "observed_action");
    assert.equal(report.results[0].evidence.operationId, operationId);
    assert.doesNotMatch(JSON.stringify(report), /private|secret/);
  } finally {
    f.close();
  }
});
test("minimized guide still observes user actions; issue, skip and unavailable are never passes", () => {
  const f = fixture();
  try {
    f.guide.start("help", "preview");
    f.$("walkthrough-minimize").click();
    f.event({
      kind: "operation",
      operation: "read",
      state: "completed",
      operationId: crypto.randomUUID(),
    });
    f.$("walkthrough-restore").click();
    assert.equal(f.$("walkthrough-next").disabled, false);
    f.$("walkthrough-issue").click();
    assert.equal(f.guide.report().results[0].status, "reported_issue");
    f.guide.start("help", "pagination");
    f.$("walkthrough-unavailable").click();
    assert.equal(f.guide.report().results[0].status, "unavailable");
    f.guide.start("help", "delete");
    f.$("walkthrough-skip").click();
    assert.equal(f.guide.report().results[0].status, "skipped");
  } finally {
    f.close();
  }
});
test("pause and resume persist step identity without rerunning actions; Beta off blocks guides", () => {
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    },
    f = fixture(storage);
  try {
    f.guide.start("full");
    f.$("walkthrough-pass").click();
    f.guide.pause();
    const before = JSON.stringify(f.guide.report());
    f.guide.setEnabled(false);
    f.guide.resume();
    assert.equal(f.$("walkthrough-panel").hidden, true);
    f.guide.setEnabled(true);
    f.guide.resume();
    assert.equal(f.guide.report().index, 1);
    assert.equal(JSON.stringify(f.guide.report()), before);
    f.$("walkthrough-minimize").click();
    f.guide.setEnabled(false);
    assert.equal(f.$("walkthrough-restore").hidden, true);
  } finally {
    f.close();
  }
  const reopened = fixture(storage);
  try {
    reopened.guide.resume();
    assert.equal(reopened.guide.report().guideVersion, GUIDE_VERSION);
    assert.equal(reopened.guide.report().index, 1);
  } finally {
    reopened.close();
  }
});
test("missing or failed storage does not prevent in-memory guidance; Escape pauses and clears highlight", () => {
  const f = fixture({
    getItem: () => {
      throw Error("denied");
    },
    setItem: () => {
      throw Error("full");
    },
  });
  try {
    f.guide.start("quick");
    assert.match(f.$("walkthrough-save").textContent, /Could not save/);
    f.document.dispatchEvent(
      new f.dom.window.KeyboardEvent("keydown", { key: "Escape" }),
    );
    assert.equal(f.$("walkthrough-panel").hidden, true);
    assert.equal(f.document.querySelector(".walkthrough-highlight"), null);
    assert.equal(f.guide.report().results.length, 0);
  } finally {
    f.close();
  }
});
test("agent console self-tests isolate mutations from the UI journal and expose immutable guide discovery", async () => {
  const f = fixture();
  try {
    const api = f.dom.window.RedownBetaQA;
    const catalog = api.describe();
    assert.equal(catalog.cloudMutation, false);
    catalog.steps[5].event.state = "tampered";
    assert.equal(api.describe().steps[5].event.state, "completed");
    const before = f.guide.report();
    const result = await api.runSelfTest();
    assert.equal(result.state, "passed");
    assert.equal(result.passed, 12);
    assert.ok(result.checks.some((c) => c.evidence.algorithm === "SHA-256"));
    assert.deepEqual(f.guide.report(), before);
    f.guide.setEnabled(false);
    assert.equal((await api.runSelfTest()).code, "BETA_MODE_DISABLED");
  } finally {
    f.close();
  }
});
test("persisted guide imports drop unknown fields and private evidence before export", () => {
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    },
    first = fixture(storage);
  first.guide.start("quick");
  first.$("walkthrough-pass").click();
  first.close();
  const key = [...data.keys()][0],
    saved = JSON.parse(data.get(key));
  saved.privateToken = "secret";
  saved.results[0].evidence = {
    kind: "action",
    content: "private",
    operationId: "private-name",
  };
  data.set(key, JSON.stringify(saved));
  const second = fixture(storage);
  try {
    second.guide.resume();
    assert.doesNotMatch(
      JSON.stringify(second.guide.report()),
      /secret|private/,
    );
  } finally {
    second.close();
  }
});

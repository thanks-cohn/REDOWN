import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { createShelf } from "../extension/shelf.js";
import {
  defaultExpanded,
  historyGroup,
  safeLink,
  safePreview,
  outcome,
} from "../extension/lib/presentation.js";

const html = await readFile(
  new URL("../extension/shelf.html", import.meta.url),
  "utf8",
);
const defaults = {
  theme: "light",
  pageSize: 40,
  expansionScope: "none",
  expansionComponent: "image",
  diagnosticsEnabled: true,
  diagnosticsCap: 4000,
};
const attempt = (overrides = {}) => ({
  id: "attempt-1",
  provider: "google",
  filename: "sample.png",
  createdAt: "2026-11-15T10:00:00Z",
  state: "SAVED",
  hostUrl: "https://example.test/page",
  sourceUrl: "https://example.test/sample.png",
  ...overrides,
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
async function fixture({
  records = [],
  events = [],
  preferences = {},
  status = {},
  failures = {},
} = {}) {
  const dom = new JSDOM(html, { url: "chrome-extension://basic/shelf.html" });
  let settings = { ...defaults, ...preferences },
    count = 5;
  const calls = [],
    listeners = new Set(),
    confirmations = [];
  dom.window.confirm = (message) => {
    confirmations.push(message);
    return true;
  };
  const chrome = {
    runtime: {
      id: "basic",
      getManifest: () => ({ version: "1.0.0" }),
      onMessage: {
        addListener: (fn) => listeners.add(fn),
        removeListener: (fn) => listeners.delete(fn),
      },
      sendMessage: async ({ op, input }) => {
        calls.push({ op, input });
        if (failures[op])
          return {
            ok: false,
            error:
              typeof failures[op] === "function"
                ? failures[op]()
                : failures[op],
          };
        let value;
        if (op === "settings.get") value = settings;
        else if (op === "settings.update")
          value = settings = { ...settings, ...input };
        else if (op === "providers.list")
          value = ["google", "dropbox", "onedrive"].map((provider) => ({
            provider,
            connected: false,
            authorized: false,
            ready: false,
            ...status[provider],
          }));
        else if (op === "counter.get") value = { count };
        else if (op === "history.list" || op === "diagnostics.list") {
          const data = op === "history.list" ? records : events;
          const pageSize = input.pageSize || 40,
            page = input.page || 1;
          value = {
            page,
            pageSize,
            pages: Math.ceil(data.length / pageSize),
            total: data.length,
            items: data.slice((page - 1) * pageSize, page * pageSize),
          };
        } else if (op === "history.delete") {
          records.splice(
            records.findIndex((record) => record.id === input.id),
            1,
          );
          value = { deleted: true };
        } else if (op === "history.clear") {
          records.length = 0;
          value = { cleared: true };
        } else if (op === "diagnostics.clear") {
          events.length = 0;
          value = { cleared: true };
        } else value = {};
        return { ok: true, value };
      },
    },
  };
  const shelf = createShelf(dom.window.document, chrome);
  await shelf.ready;
  return {
    ...shelf,
    dom,
    document: dom.window.document,
    calls,
    confirmations,
    listeners,
    settings: () => settings,
    setCount: (n) => {
      count = n;
    },
  };
}

test("three identical-layout cards, exact provider order, counter, top-right persisted theme", async () => {
  const f = await fixture({ preferences: { theme: "dark" } });
  assert.deepEqual(
    [...f.document.querySelectorAll(".provider-card")].map(
      (card) => card.dataset.provider,
    ),
    ["google", "dropbox", "onedrive"],
  );
  for (const card of f.document.querySelectorAll(".provider-card"))
    assert.equal(card.querySelectorAll(".provider-actions button").length, 3);
  assert.equal(f.document.documentElement.dataset.theme, "dark");
  assert.equal(f.document.getElementById("save-count").textContent, "5");
  f.document.getElementById("theme-toggle").click();
  await flush();
  assert.equal(f.document.documentElement.dataset.theme, "light");
  assert.equal(f.settings().theme, "light");
});

test("GO TO remains independent of upload OAuth for all three providers", async () => {
  const f = await fixture();
  for (const card of f.document.querySelectorAll(".provider-card")) {
    assert.match(card.querySelector(".readiness").textContent, /Not connected/);
    [...card.querySelectorAll("button")]
      .find((button) => button.textContent === "GO TO")
      .click();
  }
  await flush();
  assert.deepEqual(
    f.calls
      .filter((call) => call.op === "providers.goTo")
      .map((call) => call.input.provider),
    ["google", "dropbox", "onedrive"],
  );
  assert.equal(f.calls.filter((call) => call.op.startsWith("auth.")).length, 0);
  for (const card of f.document.querySelectorAll(".provider-card"))
    assert.match(card.querySelector(".readiness").textContent, /Not connected/);
});

test("connected/missing-scope status offers targeted reconnect, Refresh uses separate operation", async () => {
  const f = await fixture({
    status: {
      dropbox: {
        connected: true,
        authorized: false,
        reason: "MISSING_SCOPES",
        nextAction: "Approve file uploads.",
      },
    },
  });
  const card = f.document.querySelector("[data-provider=dropbox]");
  assert.match(
    card.querySelector(".readiness").textContent,
    /approval required/,
  );
  assert.match(
    card.querySelector(".reason").textContent,
    /Approve file uploads/,
  );
  card.querySelector(".auth-action").click();
  await flush();
  [...card.querySelectorAll("button")]
    .find((button) => button.textContent === "Refresh")
    .click();
  await flush();
  assert.ok(
    f.calls.some(
      (call) =>
        call.op === "auth.reconnect" && call.input.provider === "dropbox",
    ),
  );
  assert.ok(
    f.calls.some(
      (call) => call.op === "auth.refresh" && call.input.provider === "dropbox",
    ),
  );
});

test("terminal event flashes only its card, replay/rerender never flashes, uncertain never green", async () => {
  const f = await fixture({ records: [attempt()] });
  const google = f.document.querySelector("[data-provider=google]"),
    dropbox = f.document.querySelector("[data-provider=dropbox]");
  assert.equal(f.document.querySelectorAll(".flash-success").length, 0);
  await f.onAttempt({ event: "attempt", attempt: attempt() }, { id: "basic" });
  assert.ok(google.classList.contains("flash-success"));
  assert.ok(!dropbox.classList.contains("flash-success"));
  google.dispatchEvent(new f.dom.window.Event("animationend"));
  await f.onAttempt({ event: "attempt", attempt: attempt() }, { id: "basic" });
  assert.ok(!google.classList.contains("flash-success"));
  await f.showView("history");
  assert.equal(f.document.querySelectorAll(".flash-success").length, 0);
  await f.showView("providers");
  await f.onAttempt({
    event: "attempt",
    attempt: attempt({
      id: "uncertain",
      provider: "dropbox",
      state: "UNCERTAIN",
    }),
  });
  assert.ok(!dropbox.classList.contains("flash-success"));
  await f.onAttempt({
    event: "attempt",
    attempt: attempt({ id: "failed", provider: "dropbox", state: "FAILED" }),
  });
  assert.ok(dropbox.classList.contains("flash-failure"));
});

test("flash CSS has exactly two iterations and reduced-motion static equivalent", async () => {
  const css = await readFile(
    new URL("../extension/shelf.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /flash-success\s*\{\s*animation:\s*success-flash 320ms ease-in-out 2;?\s*\}/,
  );
  assert.match(
    css,
    /flash-failure\s*\{\s*animation:\s*failure-flash 320ms ease-in-out 2;?\s*\}/,
  );
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(
    css,
    /\.provider-card\.flash-success,\s*\.provider-card\.flash-failure\s*\{\s*animation:\s*none;?\s*\}/,
  );
});

test("history includes accurate bullets and separate safe labeled URLs, no HTML injection", async () => {
  const f = await fixture({
    records: [
      attempt({
        filename: "<img src=x onerror=alert(1)>",
        hostUrl: "javascript:alert(1)",
        sourceUrl: "https://example.test/file",
        state: "UNCERTAIN",
      }),
    ],
  });
  await f.showView("history");
  const record = f.document.querySelector(".history-record");
  assert.equal(record.querySelector("h3 img"), null);
  assert.match(record.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.ok(record.classList.contains("uncertain"));
  assert.match(record.querySelector(".record-state").textContent, /Uncertain/);
  const urls = record.querySelector("[data-component=urls]");
  assert.match(urls.textContent, /Host page URL:Unavailable/);
  assert.equal(urls.querySelectorAll("a").length, 1);
  assert.equal(urls.querySelector("a").href, "https://example.test/file");
  assert.equal(urls.querySelector("a").rel, "noopener noreferrer");
});

test("image and URLs expand independently; previews are local, lazy and fall back on error", async () => {
  const f = await fixture({
    records: [attempt({ preview: "data:image/png;base64,YWJj" })],
  });
  await f.showView("history");
  const image = f.document.querySelector("[data-component=image]"),
    urls = f.document.querySelector("[data-component=urls]");
  assert.equal(image.querySelector("img"), null);
  assert.equal(image.open, false);
  assert.equal(urls.open, false);
  image.querySelector("summary").click();
  await new Promise((resolve) => f.dom.window.setTimeout(resolve, 0));
  assert.ok(image.querySelector("img"));
  assert.equal(image.querySelector("img").loading, "lazy");
  assert.equal(urls.open, false);
  image.querySelector("img").dispatchEvent(new f.dom.window.Event("error"));
  assert.equal(image.querySelector("img"), null);
  assert.match(image.textContent, /Preview unavailable/);
  await f.showView("history");
  assert.equal(f.document.querySelector("[data-component=image]").open, true);
  assert.equal(f.document.querySelector("[data-component=urls]").open, false);
});

test("history pagination requests only the selected page and applies first-page defaults", async () => {
  const records = Array.from({ length: 25 }, (_, i) =>
    attempt({ id: String(i), filename: `file-${i}.png` }),
  );
  const f = await fixture({
    records,
    preferences: {
      pageSize: 10,
      expansionScope: "first",
      expansionComponent: "urls",
    },
  });
  await f.showView("history");
  assert.equal(f.document.querySelectorAll(".history-record").length, 10);
  assert.ok(f.document.querySelector("[data-component=urls]").open);
  assert.ok(!f.document.querySelector("[data-component=image]").open);
  [...f.document.querySelectorAll("#history-pager button")]
    .find((button) => button.textContent === "Next")
    .click();
  await flush();
  assert.equal(f.document.querySelectorAll(".history-record").length, 10);
  assert.match(
    f.document.getElementById("history-pager").textContent,
    /Page 2 of 3/,
  );
  assert.ok(!f.document.querySelector("[data-component=urls]").open);
  assert.deepEqual(
    f.calls.filter((call) => call.op === "history.list").at(-1).input,
    { page: 2, pageSize: 10 },
  );
});

test("local History deletion and clear are confirmed, never call cloud or counter mutation", async () => {
  const f = await fixture({ records: [attempt(), attempt({ id: "second" })] });
  await f.showView("history");
  f.document.querySelector(".record-delete").click();
  await flush();
  assert.equal(f.document.querySelectorAll(".history-record").length, 1);
  f.document.getElementById("clear-history").click();
  await flush();
  assert.equal(f.document.querySelectorAll(".history-record").length, 0);
  assert.equal(f.confirmations.length, 2);
  assert.equal(f.document.getElementById("save-count").textContent, "5");
  assert.deepEqual(
    f.calls
      .filter((call) => /delete|clear/.test(call.op))
      .map((call) => call.op),
    ["history.delete", "history.clear"],
  );
});

test("settings preserve arbitrary cap, Unlimited, OFF and expansion preferences via same API", async () => {
  const f = await fixture();
  await f.showView("settings");
  const form = f.document.getElementById("settings-form");
  form.elements.namedItem("diagnosticsEnabled").checked = false;
  form.elements.namedItem("diagnosticsCap").value = "573";
  form.elements.namedItem("expansionScope").value = "all";
  form.elements.namedItem("expansionComponent").value = "both";
  form.dispatchEvent(new f.dom.window.Event("submit", { cancelable: true }));
  await flush();
  assert.equal(f.settings().diagnosticsCap, 573);
  assert.equal(f.settings().diagnosticsEnabled, false);
  assert.equal(f.settings().expansionScope, "all");
  assert.equal(f.settings().expansionComponent, "both");
  form.elements.namedItem("unlimited").click();
  assert.equal(form.elements.namedItem("diagnosticsCap").disabled, true);
  form.dispatchEvent(new f.dom.window.Event("submit", { cancelable: true }));
  await flush();
  assert.equal(f.settings().diagnosticsCap, null);
  assert.match(form.textContent, /browser\s+storage\s+quotas\s+still\s+apply/);
});

test("invalid caps are explained and do not cross API boundary", async () => {
  const f = await fixture();
  await f.showView("settings");
  const form = f.document.getElementById("settings-form");
  for (const value of ["0", "-3", "1.5", "9007199254740992"]) {
    form.elements.namedItem("diagnosticsCap").value = value;
    form.dispatchEvent(new f.dom.window.Event("submit", { cancelable: true }));
    await flush();
    assert.match(
      f.document.getElementById("settings-result").textContent,
      /positive whole-number/,
    );
  }
  assert.equal(
    f.calls.filter((call) => call.op === "settings.update").length,
    0,
  );
});

test("diagnostics remains viewable/exportable while OFF with local privacy confirmation", async () => {
  const event = {
    id: 1,
    timestamp: "2026-11-15T10:00:00Z",
    provider: "google",
    attemptId: "attempt-1",
    stage: "UPLOADING",
    outcome: "Uncertain",
    code: "NETWORK",
    cause: "Connection interrupted.",
    sourceUrl: "https://example.test/file",
    hostUrl: null,
  };
  const f = await fixture({
    events: [event],
    preferences: { diagnosticsEnabled: false },
  });
  await f.showView("diagnostics");
  assert.match(
    f.document.getElementById("diagnostics-mode").textContent,
    /Collection OFF/,
  );
  assert.equal(f.document.querySelectorAll(".diagnostic-event").length, 1);
  assert.match(
    f.document.querySelector(".diagnostic-event").textContent,
    /Speed: N\/A/,
  );
  f.document.getElementById("export-diagnostics").click();
  await flush();
  assert.match(f.confirmations.at(-1), /browsing URLs/);
  assert.ok(f.calls.some((call) => call.op === "diagnostics.exportZip"));
  f.document.getElementById("clear-diagnostics").click();
  await flush();
  assert.equal(f.document.querySelectorAll(".diagnostic-event").length, 0);
  assert.ok(!f.calls.some((call) => call.op === "history.clear"));
});

test("chronological buckets remain exclusive at day, week, year and DST boundaries", () => {
  const now = new Date(2027, 0, 3, 12);
  assert.match(
    historyGroup(new Date(2026, 11, 31, 12), now).key,
    /^day:2026-12-31$/,
  );
  assert.equal(historyGroup(new Date(2026, 11, 26, 12), now).key, "year:2026");
  const march = new Date(2026, 2, 15, 12);
  assert.equal(
    historyGroup(new Date(2026, 2, 9, 23), march).key,
    "day:2026-03-09",
  );
  assert.equal(
    historyGroup(new Date(2026, 2, 8, 23), march).key,
    "week:2026-03-02",
  );
  assert.equal(
    historyGroup(new Date(2025, 11, 31, 23), march).key,
    "year:2025",
  );
});

test("complete expansion scope/component matrix has independent outcomes on each page", () => {
  for (const scope of ["none", "first", "all"])
    for (const component of ["image", "urls", "both"])
      for (const page of [1, 2])
        for (const target of ["image", "urls"]) {
          const expected =
            scope !== "none" &&
            (scope === "all" || page === 1) &&
            (component === "both" || target === component);
          assert.equal(
            defaultExpanded(
              { expansionScope: scope, expansionComponent: component },
              page,
              target,
            ),
            expected,
          );
        }
});

test("unsafe URL and active-content preview schemes never render", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///tmp/a",
    "https://user:pass@example.test",
    undefined,
    "<script>",
  ])
    assert.equal(safeLink(value), null);
  for (const value of [
    "https://example.test/preview.png",
    "data:image/svg+xml;base64,YQ==",
    "data:text/html;base64,YQ==",
  ])
    assert.equal(safePreview(value), null);
  assert.equal(
    safeLink("https://example.test/file"),
    "https://example.test/file",
  );
  assert.equal(
    safePreview("data:image/png;base64,YQ=="),
    "data:image/png;base64,YQ==",
  );
  assert.equal(outcome("UPLOADING").tone, "uncertain");
  assert.match(outcome("UPLOADING").label, /In progress/);
});

test("rapid distinct completions each get two-flash animation; hidden cards never replay later", async () => {
  const f = await fixture(),
    card = f.document.querySelector("[data-provider=google]");
  await f.onAttempt({ event: "attempt", attempt: attempt({ id: "first" }) });
  await f.onAttempt({ event: "attempt", attempt: attempt({ id: "second" }) });
  card.dispatchEvent(new f.dom.window.Event("animationend"));
  assert.ok(
    card.classList.contains("flash-success"),
    "second distinct completion has its own animation",
  );
  card.dispatchEvent(new f.dom.window.Event("animationend"));
  assert.ok(!card.classList.contains("flash-success"));
  await f.showView("history");
  await f.onAttempt({ event: "attempt", attempt: attempt({ id: "hidden" }) });
  await f.showView("providers");
  assert.ok(!card.classList.contains("flash-success"));
});

test("optional diagnostics storage warning is visible without changing truthful save result", async () => {
  const record = attempt({
    diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE",
  });
  const f = await fixture({ records: [record] });
  await f.onAttempt({ event: "attempt", attempt: record });
  assert.match(
    f.document.getElementById("feedback").textContent,
    /DIAGNOSTICS_STORAGE_UNAVAILABLE/,
  );
  await f.showView("history");
  assert.match(
    f.document.querySelector(".history-record").textContent,
    /Diagnostics warning: DIAGNOSTICS_STORAGE_UNAVAILABLE/,
  );
  assert.match(f.document.querySelector(".record-state").textContent, /Saved/);
});

test("revoked authorization refresh failure updates readiness and preserves next action", async () => {
  const status = { google: { connected: true, authorized: true, ready: true } };
  const f = await fixture({
    status,
    failures: {
      "auth.refresh": () => {
        status.google = {
          connected: false,
          authorized: false,
          ready: false,
          reason: "AUTH_REVOKED",
          nextAction: "Reconnect to approve uploads.",
        };
        return {
          code: "AUTH_REVOKED",
          message: "Upload authorization was revoked.",
          nextAction: "Reconnect to approve uploads.",
        };
      },
    },
  });
  const card = f.document.querySelector("[data-provider=google]");
  assert.match(card.querySelector(".readiness").textContent, /Ready to Save/);
  [...card.querySelectorAll("button")]
    .find((button) => button.textContent === "Refresh")
    .click();
  await flush();
  assert.match(card.querySelector(".readiness").textContent, /Not connected/);
  assert.match(
    card.querySelector(".reason").textContent,
    /Reconnect to approve uploads/,
  );
  assert.match(
    f.document.getElementById("feedback").textContent,
    /AUTH_REVOKED.*Reconnect to approve uploads/,
  );
});

test("sun/moon toggle preserves SVG, accessible target label, saved preference and keyboard button semantics", async () => {
  const f = await fixture();
  const button = f.dom.window.document.getElementById("theme-toggle");
  assert.equal(button.tagName, "BUTTON");
  assert.equal(button.type, "button");
  assert.equal(button.querySelectorAll("svg").length, 1);
  assert.equal(button.getAttribute("aria-label"), "Switch to dark mode");
  button.click();
  await flush();
  assert.equal(f.settings().theme, "dark");
  assert.equal(button.querySelectorAll("svg").length, 1);
  assert.equal(button.getAttribute("aria-label"), "Switch to light mode");
  button.click();
  await flush();
  assert.equal(f.settings().theme, "light");
  assert.equal(button.querySelectorAll("svg").length, 1);
  const css = await readFile(
    new URL("../extension/shelf.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /theme-sun[\s\S]*transition/);
});
test("incomplete deployment shows Setup required, blocks doomed Sign In, keeps independent GO TO", async () => {
  const f = await fixture({
    status: Object.fromEntries(
      ["google", "dropbox", "onedrive"].map((id) => [
        id,
        {
          setupRequired: true,
          reason: "OAUTH_CONFIG_REQUIRED",
          nextAction: "Configure public profile and rebuild.",
        },
      ]),
    ),
  });
  for (const card of f.dom.window.document.querySelectorAll(".provider-card")) {
    const sign = card.querySelector(".auth-action");
    assert.equal(sign.disabled, true);
    assert.equal(sign.textContent, "Setup required");
    sign.click();
  }
  assert.equal(f.calls.filter((c) => c.op === "auth.connect").length, 0);
  const card = f.dom.window.document.querySelector(".provider-card");
  [...card.querySelectorAll("button")]
    .find((b) => b.textContent === "GO TO")
    .click();
  await flush();
  assert.ok(f.calls.some((c) => c.op === "providers.goTo"));
});

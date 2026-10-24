import {
  runSimulationAcceptance,
  READINESS,
} from "./file-engine/acceptance.mjs";
import { GUIDE_VERSION, STEPS } from "./beta-walkthrough-steps.mjs";
const STORAGE_KEY = "redown.phase2.beta.walkthrough.v1";
const scope =
  "local Beta simulation; guide observations and user reports, not provider certification";
const validDate = (value) =>
  typeof value === "string" &&
  value.length <= 40 &&
  Number.isFinite(Date.parse(value));
const validId = (value) =>
  typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value);
function cleanEvidence(value) {
  if (!value || typeof value !== "object") return null;
  const result = { kind: value.kind === "operation" ? "operation" : "action" };
  if (validId(value.operationId)) result.operationId = value.operationId;
  if (
    [
      "list",
      "metadata",
      "read",
      "copy",
      "move",
      "rename",
      "delete",
      "mkdir",
      "upload",
    ].includes(value.operation)
  )
    result.operation = value.operation;
  if (
    [
      "completed",
      "failed",
      "uncertain",
      "cancelled",
      "blocked_authorization",
      "partially_completed",
    ].includes(value.state)
  )
    result.state = value.state;
  if (
    [
      "CONFLICT",
      "INVALID_REQUEST",
      "INVALID_IDENTITY",
      "STALE_CURSOR",
      "NOT_FOUND_OR_INACCESSIBLE",
      "UNSUPPORTED_PROVIDER",
      "CAPACITY",
      "VERIFICATION_DISAGREEMENT",
      "INVALID_PROVIDER_RESPONSE",
    ].includes(value.code)
  )
    result.code = value.code;
  if (validDate(value.at)) result.at = value.at;
  return result;
}
function cleanSession(value) {
  if (
    !value ||
    value.guideVersion !== GUIDE_VERSION ||
    !validId(value.id) ||
    !validDate(value.startedAt) ||
    !Array.isArray(value.results) ||
    value.results.length > 500 ||
    !Number.isInteger(value.index) ||
    value.index < 0 ||
    value.index >= STEPS.length ||
    !["quick", "full", "help"].includes(value.mode)
  )
    return null;
  const result = {
    guideVersion: GUIDE_VERSION,
    id: value.id,
    startedAt: value.startedAt,
    scope,
    mode: value.mode,
    index: value.index,
    results: value.results
      .filter(
        (r) =>
          r &&
          STEPS.some((s) => s.id === r.stepId) &&
          [
            "read",
            "observed_action",
            "user_confirmed",
            "reported_issue",
            "unavailable",
            "skipped",
          ].includes(r.status) &&
          validDate(r.at),
      )
      .map((r) => ({
        stepId: r.stepId,
        status: r.status,
        at: r.at,
        ...(cleanEvidence(r.evidence)
          ? { evidence: cleanEvidence(r.evidence) }
          : {}),
      })),
  };
  if (validDate(value.finishedAt)) result.finishedAt = value.finishedAt;
  return result;
}

export function installWalkthrough({
  document,
  storage,
  inspectOperation = async () => ({ state: "unavailable" }),
  now = () => new Date().toISOString(),
  uuid = () => crypto.randomUUID(),
} = {}) {
  if (storage === undefined) {
    try {
      storage = document.defaultView.localStorage;
    } catch {
      storage = null;
    }
  }
  const win = document.defaultView,
    $ = (id) => document.getElementById(id);
  let session = null,
    index = 0,
    mode = "quick",
    observed = null,
    anchor = null,
    enabled = false,
    disposed = false;
  const panel = document.createElement("section");
  panel.id = "walkthrough-panel";
  panel.className = "walkthrough-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "walkthrough-title");
  panel.innerHTML = `<div class="walkthrough-top"><span id="walkthrough-counter">EXPLORER GUIDE</span><div><button id="walkthrough-minimize" aria-label="Minimize walkthrough">−</button><button id="walkthrough-close" aria-label="Pause and close walkthrough">×</button></div></div><h2 id="walkthrough-title">A little guidance.</h2><div id="walkthrough-menu"><p>Start with five essentials, check every workflow, or jump straight to the help you need.</p><div class="walkthrough-choices"><button id="walkthrough-quick">First 5 · Get started</button><button id="walkthrough-full">Full feature check</button><button id="walkthrough-automate">Run isolated automated checks</button><p id="walkthrough-automated-result" role="status"></p><button id="walkthrough-resume">Resume saved walkthrough</button></div><label>Help with a feature<select id="walkthrough-jump"></select></label><button id="walkthrough-help">Show this step</button></div><div id="walkthrough-step" hidden><p id="walkthrough-body"></p><div class="walkthrough-task"><strong>TRY IT</strong><p id="walkthrough-task"></p></div><p id="walkthrough-evidence" role="status" aria-live="polite"></p><div class="walkthrough-feedback"><button id="walkthrough-pass">Works for me</button><button id="walkthrough-issue">Report an issue</button><button id="walkthrough-unavailable">Not available</button></div><div class="walkthrough-controls"><button id="walkthrough-back">Back</button><button id="walkthrough-skip">Skip</button><button id="walkthrough-next">Next</button></div></div><div id="walkthrough-finish" hidden><p id="walkthrough-summary"></p><button id="walkthrough-continue">Continue with all features</button><button id="walkthrough-restart">Choose another guide</button></div><div class="walkthrough-bottom"><span id="walkthrough-save" role="status"></span><button id="walkthrough-export">Export report</button></div>`;
  document.body.append(panel);
  const minimized = document.createElement("button");
  minimized.id = "walkthrough-restore";
  minimized.className = "walkthrough-restore";
  minimized.textContent = "Continue walkthrough";
  minimized.hidden = true;
  document.body.append(minimized);
  for (const step of STEPS) {
    const option = document.createElement("option");
    option.value = step.id;
    option.textContent = step.title;
    $("walkthrough-jump").append(option);
  }
  let saved = null;
  try {
    saved = cleanSession(JSON.parse(storage?.getItem(STORAGE_KEY) || "null"));
  } catch {}
  function persist() {
    if (!session) return;
    session.index = index;
    session.mode = mode;
    try {
      if (!storage) throw Error("STORAGE_UNAVAILABLE");
      storage.setItem(STORAGE_KEY, JSON.stringify(session));
      saved = structuredClone(session);
      $("walkthrough-save").textContent = "Progress saved locally";
    } catch {
      $("walkthrough-save").textContent =
        "Could not save. Export before closing.";
    }
  }
  function clearAnchor() {
    anchor?.classList.remove("walkthrough-highlight");
    anchor = null;
  }
  function available() {
    return enabled && !$("explorer").hidden;
  }
  function place() {
    if (panel.hidden) return;
    const rect = anchor?.getBoundingClientRect(),
      width = Math.min(360, win.innerWidth - 24),
      height = Math.min(panel.scrollHeight || 450, win.innerHeight - 24);
    let left = win.innerWidth - width - 20,
      top = 90;
    if (rect && win.innerWidth > 760) {
      left = rect.right + 16;
      if (left + width > win.innerWidth - 12) left = rect.left - width - 16;
      if (left < 12) left = win.innerWidth - width - 16;
      top = Math.max(12, Math.min(rect.top, win.innerHeight - height - 12));
    } else if (win.innerWidth <= 760) {
      left = 12;
      top = Math.max(12, win.innerHeight - height - 12);
    }
    panel.style.width = width + "px";
    panel.style.left = Math.max(12, left) + "px";
    panel.style.top = top + "px";
    panel.style.maxHeight = win.innerHeight - 24 + "px";
  }
  function reveal() {
    clearAnchor();
    const step = STEPS[index],
      target = document.querySelector(step.target);
    for (
      let parent = target?.parentElement;
      parent;
      parent = parent.parentElement
    )
      if (parent.tagName === "DETAILS") parent.open = true;
    if (target?.tagName === "DETAILS") target.open = true;
    const visible =
      target && !target.hidden && target.getClientRects().length > 0;
    if (visible) {
      anchor = target;
      anchor.classList.add("walkthrough-highlight");
      target.scrollIntoView?.({ block: "center", behavior: "instant" });
    }
    return Boolean(visible);
  }
  function render() {
    if (!available()) return pause();
    panel.hidden = false;
    minimized.hidden = true;
    $("walkthrough-menu").hidden = true;
    $("walkthrough-finish").hidden = true;
    $("walkthrough-step").hidden = false;
    const step = STEPS[index];
    $("walkthrough-title").textContent = step.title;
    $("walkthrough-counter").textContent =
      (mode === "quick" ? "GET STARTED" : "FEATURE CHECK") +
      " · " +
      (mode === "help" ? index + 1 : index + 1) +
      " / " +
      (mode === "quick" ? 5 : STEPS.length);
    $("walkthrough-body").textContent = step.body;
    $("walkthrough-task").textContent = step.task;
    $("walkthrough-back").disabled = mode === "help" || index === 0;
    $("walkthrough-next").disabled = Boolean(step.event) && !observed;
    $("walkthrough-evidence").textContent = observed
      ? "Action observed locally. Verify the visible outcome too."
      : step.event
        ? "Waiting for you to try this action."
        : "Read the guidance, try the task and record what you find.";
    if (!reveal())
      $("walkthrough-evidence").textContent =
        "This control is not currently visible. Navigate to it, minimize the guide, or mark it unavailable.";
    place();
  }
  function menu() {
    if (!available()) return;
    panel.hidden = false;
    minimized.hidden = true;
    clearAnchor();
    $("walkthrough-menu").hidden = false;
    $("walkthrough-step").hidden = true;
    $("walkthrough-finish").hidden = true;
    $("walkthrough-title").textContent = "A little guidance.";
    $("walkthrough-counter").textContent = "EXPLORER GUIDE";
    $("walkthrough-resume").disabled = !saved;
    place();
    $("walkthrough-quick").focus();
  }
  function start(nextMode = "quick", stepId) {
    if (!available()) return;
    mode = nextMode;
    index = stepId ? STEPS.findIndex((s) => s.id === stepId) : 0;
    if (index < 0) index = 0;
    session = {
      guideVersion: GUIDE_VERSION,
      id: uuid(),
      startedAt: now(),
      scope,
      mode,
      index,
      results: [],
    };
    observed = null;
    persist();
    render();
    $("walkthrough-title").tabIndex = -1;
    $("walkthrough-title").focus();
  }
  function record(status) {
    if (!session) return;
    const result = { stepId: STEPS[index].id, status, at: now() };
    if (observed) result.evidence = { ...observed };
    session.results.push(result);
    if (session.results.length > 500) session.results.shift();
    persist();
  }
  function finish() {
    clearAnchor();
    $("walkthrough-step").hidden = true;
    $("walkthrough-finish").hidden = false;
    $("walkthrough-title").textContent =
      mode === "quick"
        ? "You know your way around."
        : "Your feature check is recorded.";
    $("walkthrough-summary").textContent =
      session.results.length +
      " recorded observations. " +
      session.results.filter((r) => r.status === "reported_issue").length +
      " reported issues. Untried steps remain unverified.";
    $("walkthrough-continue").hidden = mode !== "quick";
    session.finishedAt = now();
    persist();
    place();
  }
  function next(status) {
    record(status);
    if (mode === "help" || index + 1 >= (mode === "quick" ? 5 : STEPS.length)) {
      finish();
      return;
    }
    index++;
    observed = null;
    persist();
    render();
  }
  function pause() {
    panel.hidden = true;
    minimized.hidden = true;
    clearAnchor();
    if (session) persist();
    if(enabled) $("walkthrough-launch")?.focus();
  }
  function resume() {
    if (!available() || !saved) return;
    session = structuredClone(saved);
    index = session.index;
    mode = session.mode;
    observed = null;
    render();
  }
  function onEvent(event) {
    if (
      !available() ||
      !session ||
      (panel.hidden && minimized.hidden) ||
      $("walkthrough-step").hidden
    )
      return;
    const expected = STEPS[index].event;
    if (
      !expected ||
      !event.detail ||
      !Object.entries(expected).every(([k, v]) => event.detail[k] === v)
    )
      return;
    observed = cleanEvidence({
      kind: event.detail.kind,
      ...(event.detail.operationId
        ? { operationId: event.detail.operationId }
        : {}),
      ...(event.detail.operation ? { operation: event.detail.operation } : {}),
      ...(event.detail.state ? { state: event.detail.state } : {}),
      ...(event.detail.code ? { code: event.detail.code } : {}),
      at: now(),
    });
    $("walkthrough-next").disabled = false;
    $("walkthrough-evidence").textContent =
      "Action observed locally. Check the visible outcome, then continue.";
  }
  function onAvailability(event) {
    enabled = event.detail?.enabled === true;
    if (!enabled) pause();
  }
  function report() {
    return session
      ? structuredClone(session)
      : saved
        ? structuredClone(saved)
        : null;
  }
  $("walkthrough-launch").onclick = menu;
  $("walkthrough-quick").onclick = () => start("quick");
  $("walkthrough-full").onclick = () => start("full");
  $("walkthrough-help").onclick = () =>
    start("help", $("walkthrough-jump").value);
  $("walkthrough-resume").onclick = resume;
  $("walkthrough-next").onclick = () => {
    if (!STEPS[index].event || observed)
      next(observed ? "observed_action" : "read");
  };
  $("walkthrough-pass").onclick = () => next("user_confirmed");
  $("walkthrough-issue").onclick = () => next("reported_issue");
  $("walkthrough-unavailable").onclick = () => next("unavailable");
  $("walkthrough-skip").onclick = () => next("skipped");
  $("walkthrough-back").onclick = () => {
    if (index > 0) {
      index--;
      observed = null;
      persist();
      render();
    }
  };
  $("walkthrough-close").onclick = pause;
  $("walkthrough-minimize").onclick = () => {
    panel.hidden = true;
    clearAnchor();
    minimized.hidden = false;
    persist();
  };
  minimized.onclick = () => {
    if (available()) render();
  };
  $("walkthrough-restart").onclick = menu;
  $("walkthrough-continue").onclick = () => {
    mode = "full";
    index = 5;
    observed = null;
    delete session.finishedAt;
    persist();
    render();
  };
  $("walkthrough-export").onclick = () => {
    const data = report();
    if (!data) return;
    const url = win.URL.createObjectURL(
        new win.Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "redown-beta-walkthrough.json";
    a.click();
    win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
  };
  let lastSelfTest = null,
    running = null;
  async function runSelfTest() {
    if (!available()) return { state: "blocked", code: "BETA_MODE_DISABLED" };
    if (running) return running;
    $("walkthrough-automate").disabled = true;
    running = runSimulationAcceptance()
      .then((result) => {
        lastSelfTest = result;
        if (!disposed)
          $("walkthrough-automated-result").textContent =
            result.passed +
            " passed / " +
            result.failed +
            " failed · isolated core simulation";
        win.console.info("[REDOWN Beta acceptance]", JSON.stringify(result));
        return structuredClone(result);
      })
      .finally(() => {
        if (!disposed) $("walkthrough-automate").disabled = false;
        running = null;
      });
    return running;
  }
  $("walkthrough-automate").onclick = () =>
    runSelfTest().catch(() => {
      if (!disposed)
        $("walkthrough-automated-result").textContent =
          "Automated checks could not finish. No pass recorded.";
    });
  const consoleAPI = Object.freeze({
    describe: () => ({
      version: GUIDE_VERSION,
      scope: "Beta UI guide and isolated core self-test",
      operations: [
        "describe",
        "getWalkthroughReport",
        "getLastSelfTest",
        "runSelfTest",
        "startGuide",
        "inspectOperation",
      ],
      steps: STEPS.map(({ id, title, target, task, event }) => ({
        id,
        title,
        target,
        task,
        event: event ? { ...event } : null,
      })),
      cloudMutation: false,
      readiness: structuredClone(READINESS),
    }),
    inspectOperation: async (id) => {
      if (!available()) return { state: "blocked", code: "BETA_MODE_DISABLED" };
      if (!validId(id)) throw Error("INVALID_OPERATION_ID");
      return structuredClone(await inspectOperation(id));
    },
    getWalkthroughReport: report,
    getLastSelfTest: () =>
      lastSelfTest ? structuredClone(lastSelfTest) : null,
    runSelfTest,
    startGuide: (mode = "quick", stepId) => {
      if (!["quick", "full", "help"].includes(mode))
        throw Error("INVALID_GUIDE_MODE");
      start(mode, stepId);
    },
  });
  Object.defineProperty(win, "RedownBetaQA", {
    value: consoleAPI,
    configurable: true,
  });
  const keydown = (event) => {
    if (event.key === "Escape" && (!panel.hidden || !minimized.hidden)) {
      pause();
      event.preventDefault();
    }
  };
  document.addEventListener("beta:guide-event", onEvent);
  document.addEventListener("beta:availability", onAvailability);
  document.addEventListener("keydown", keydown);
  win.addEventListener("resize", place);
  win.addEventListener("scroll", place, true);
  return {
    start,
    resume,
    pause,
    report,
    setEnabled(value) {
      enabled = value === true;
      if (!enabled) pause();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      clearAnchor();
      document.removeEventListener("beta:guide-event", onEvent);
      document.removeEventListener("beta:availability", onAvailability);
      document.removeEventListener("keydown", keydown);
      win.removeEventListener("resize", place);
      win.removeEventListener("scroll", place, true);
      if (win.RedownBetaQA === consoleAPI) delete win.RedownBetaQA;
      panel.remove();
      minimized.remove();
    },
  };
}

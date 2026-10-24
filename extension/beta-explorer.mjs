import { installWalkthrough } from "./beta-walkthrough.mjs";
import { API_VERSION } from "./file-engine/contract.mjs";
import { createSimulationEngine } from "./file-engine/simulation.mjs";
import { openBetaStore } from "./file-engine/indexeddb-store.mjs";
export function installBetaExplorer({
  document,
  chrome,
  indexedDB = globalThis.indexedDB,
  confirm = globalThis.confirm,
  prompt = globalThis.prompt,
}) {
  const $ = (id) => document.getElementById(id);
  const walkthrough = installWalkthrough({
    document,
    inspectOperation: async (id) => {
      if (!engine) return { state: "unavailable" };
      const job = await engine.inspect(id);
      if (!job) return { state: "unavailable" };
      return {
        id: job.id,
        operation: job.request.operation,
        state: job.state,
        executor: job.executor,
        events: job.events,
        error: job.error || null,
        verification: job.receipt
          ? {
              level: job.receipt.level,
              providerEvidence: job.receipt.providerEvidence,
            }
          : null,
        source: job.request.source
          ? { provider: job.request.source.provider, identity: "redacted" }
          : null,
        destination: job.request.destination
          ? { provider: job.request.destination.provider, identity: "redacted" }
          : null,
      };
    },
  });
  const guideEvent = (detail) =>
    document.dispatchEvent(
      new document.defaultView.CustomEvent("beta:guide-event", { detail }),
    );
  let engine,
    store,
    opening,
    enabled = false,
    clipboard = null,
    selected = null,
    cursor = null,
    generation = 0;
  const identity = (provider, key) => ({
    provider,
    account: "demo",
    container: "sandbox",
    key,
  });
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + name);
    svg.setAttribute("aria-hidden", "true");
    svg.append(use);
    return svg;
  }
  function displayName(key) {
    return key.replace(/\/$/, "").split("/").pop() || "All files";
  }
  function updateSelection() {
    $("selection-name").textContent = selected
      ? displayName(selected.key)
      : "A closer look.";
    $("selection-meta").textContent = selected
      ? (selected.folder ? "Folder" : selected.size + " bytes") +
        " · " +
        (selected.provider === "fake-r2" ? "Simulated R2" : "Simulated Drive")
      : "Select a file or folder to see its details.";
    $("selection-icon").replaceChildren(
      icon(selected?.folder ? "folder" : "file"),
    );
    for (const id of ["copy", "cut", "rename", "delete"])
      $(id).disabled = !enabled || !selected;
    $("read").disabled = !enabled || !selected || selected.folder;
    $("paste").disabled = !enabled || !clipboard;
    for (const row of $("files").children)
      row.dataset.selected = String(row.dataset.key === selected?.key);
  }
  function selectObject(object, check) {
    selected = object;
    check.checked = true;
    $("preview").hidden = true;
    updateSelection();
    guideEvent({ kind: "action", action: "selection" });
  }
  function showActivity() {
    const panel = $("activity");
    panel.open = true;
    panel.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    $("jobs").focus();
    guideEvent({ kind: "action", action: "activity" });
  }
  function message(text, state = "") {
    $("status").textContent = text;
    $("status").dataset.state = state;
  }
  async function gate() {
    enabled =
      (await chrome.storage.local.get("betaModeEnabled")).betaModeEnabled ===
      true;
    $("explorer").hidden = !enabled;
    $("gate").dataset.enabled = String(enabled);
    $("gate").textContent = enabled
      ? "Beta Mode enabled · Simulation foundation"
      : "Beta Explorer is hidden. Enable the existing Beta Mode in Dashboard settings. Saved simulation jobs are retained.";
    if (!enabled) {
      generation++;
      clipboard = null;
      selected = null;
      $("preview").hidden = true;
      $("trace").textContent = "";
    }
    updateSelection();
    document.dispatchEvent(
      new document.defaultView.CustomEvent("beta:availability", {
        detail: { enabled },
      }),
    );
  }
  async function initialize() {
    if (!opening)
      opening = openBetaStore(indexedDB).then((value) => {
        store = value;
        engine = createSimulationEngine(store);
      });
    await opening;
  }
  async function allowed() {
    await gate();
    if (!enabled) throw Error("BETA_MODE_DISABLED");
    await initialize();
  }
  async function run(operation, args = {}) {
    await allowed();
    const result = await engine.run({
      apiVersion: API_VERSION,
      operation,
      idempotencyKey: crypto.randomUUID(),
      ...args,
    });
    guideEvent({
      kind: "operation",
      operation,
      state: result.state,
      operationId: result.id,
      ...(result.error
        ? {
            code: /^[A-Z_]{1,64}$/.test(result.error)
              ? result.error
              : "UNCLASSIFIED",
          }
        : {}),
      scope: args.source?.key ? "folder" : "root",
      search: Boolean(args.query),
      empty:
        Array.isArray(result.result?.objects) &&
        result.result.objects.length === 0,
      crossProvider: Boolean(
        args.source &&
          args.destination &&
          args.source.provider !== args.destination.provider,
      ),
    });
    return result;
  }
  async function browse(append = false) {
    await allowed();
    const ticket = ++generation;
    const result = await run("list", {
      source: identity($("provider").value, $("prefix").value),
      query: $("query").value,
      limit: 50,
      ...(append && cursor ? { cursor } : {}),
    });
    if (ticket !== generation || !enabled) return;
    if (result.state !== "completed") {
      message(result.error, "failed");
      return;
    }
    if (!append) {
      $("files").replaceChildren();
      selected = null;
    }
    for (const object of result.result.objects) {
      const row = document.createElement("li"),
        check = document.createElement("input"),
        button = document.createElement("button");
      row.dataset.key = object.key;
      check.type = "radio";
      check.name = "selected";
      check.setAttribute("aria-label", "Select " + object.key);
      check.onchange = () => selectObject(object, check);
      const art = document.createElement("span"),
        name = document.createElement("span"),
        meta = document.createElement("span");
      art.className = "file-art" + (object.folder ? " folder-art" : "");
      art.append(icon(object.folder ? "folder" : "file"));
      name.className = "file-name";
      name.textContent = displayName(object.key);
      meta.className = "file-meta";
      meta.textContent = object.folder
        ? "Folder"
        : object.size + " bytes · Text";
      button.append(art, name, meta);
      button.title = object.folder ? "Open " + object.key : object.key;
      button.onclick = () => {
        if (object.folder) {
          $("prefix").value = object.key;
          $("query").value = "";
          safe(() => browse());
        } else selectObject(object, check);
      };
      row.append(check, button);
      $("files").append(row);
    }
    $("file-count").textContent = $("files").children.length + " items";
    $("empty-state").hidden = $("files").children.length > 0;
    const folder = displayName($("prefix").value);
    $("location-label").textContent = folder;
    document.querySelector("h1").firstChild.textContent = folder;
    $("home").classList.toggle("active", !$("prefix").value);
    $("documents").classList.toggle(
      "active",
      $("prefix").value === "Documents/",
    );
    updateSelection();
    cursor = result.result.cursor;
    $("next").hidden = !cursor;
    message(
      "Simulated listing · " +
        (result.result.complete ? "complete" : "more pages available"),
      "completed",
    );
    await refreshJobs();
  }
  async function refreshJobs() {
    const jobs = await engine.inspect();
    $("job-count").textContent = jobs.length;
    $("jobs").replaceChildren(
      ...jobs
        .slice()
        .reverse()
        .map((job) => {
          const option = document.createElement("option");
          option.value = job.id;
          option.textContent =
            job.request.operation + " · " + job.state + " · " + job.id;
          return option;
        }),
    );
  }
  const pending = new Set();
  function safe(fn) {
    const task = Promise.resolve()
      .then(fn)
      .catch((error) =>
        message(error.code || error.message || "Action unavailable", "failed"),
      )
      .finally(() => pending.delete(task));
    pending.add(task);
    return task;
  }
  function requireSelection() {
    if (!selected) throw Error("Select one file or folder.");
    return identity(selected.provider, selected.key);
  }
  async function mutation(operation, args) {
    const result = await run(operation, args);
    message(
      result.state === "completed" ? "Simulation completed" : result.error,
      result.state,
    );
    await refreshJobs();
    $("trace").textContent = JSON.stringify(
      await engine.diagnose(result.id),
      null,
      2,
    );
    if (result.state === "completed") await browse();
    return result;
  }
  $("navigation").onsubmit = (event) => {
    event.preventDefault();
    safe(() => browse());
  };
  $("provider").onchange = () => {
    clipboard = null;
    $("prefix").value = "";
    safe(async () => {
      await browse();
      guideEvent({ kind: "action", action: "provider" });
    });
  };
  $("destination").onchange = () =>
    guideEvent({ kind: "action", action: "destination" });
  $("next").onclick = () =>
    safe(async () => {
      await browse(true);
      guideEvent({ kind: "action", action: "next-page" });
    });
  $("up").onclick = () => {
    const parts = $("prefix").value.replace(/\/$/, "").split("/");
    parts.pop();
    $("prefix").value = parts.length ? parts.join("/") + "/" : "";
    safe(async () => {
      await browse();
      guideEvent({ kind: "action", action: "up" });
    });
  };
  $("copy").onclick = () =>
    safe(async () => {
      await allowed();
      clipboard = { operation: "copy", source: requireSelection() };
      updateSelection();
      message("Simulated selection copied.");
      guideEvent({ kind: "action", action: "copy" });
    });
  $("cut").onclick = () =>
    safe(async () => {
      await allowed();
      clipboard = { operation: "move", source: requireSelection() };
      updateSelection();
      message("Simulated selection cut; source retained until paste.");
      guideEvent({ kind: "action", action: "cut" });
    });
  $("paste").onclick = () =>
    safe(async () => {
      if (!clipboard) throw Error("Copy or cut a simulated item first.");
      const captured = structuredClone(clipboard);
      if (
        captured.operation === "move" &&
        !confirm("Move this simulated item?")
      )
        return;
      const name =
        captured.source.key.replace(/\/$/, "").split("/").pop() +
        (captured.source.key.endsWith("/") ? "/" : "");
      const result = await mutation(captured.operation, {
        source: captured.source,
        destination: identity($("destination").value, $("prefix").value + name),
        ...(captured.operation === "move" ? { confirmed: true } : {}),
      });
      if (result.state === "completed" && captured.operation === "move") {
        clipboard = null;
        updateSelection();
      }
    });
  $("delete").onclick = () =>
    safe(async () => {
      const source = requireSelection();
      if (confirm("Delete the selected simulated item and its children?"))
        await mutation("delete", { source, confirmed: true });
    });
  $("rename").onclick = () =>
    safe(async () => {
      const source = requireSelection(),
        name = prompt("New name (same folder):");
      if (!name) return;
      if (name.includes("/") || name.includes("\\"))
        throw Error("Enter a single name.");
      const parts = source.key.replace(/\/$/, "").split("/");
      parts.pop();
      await mutation("rename", {
        source,
        destination: {
          ...source,
          key:
            (parts.length ? parts.join("/") + "/" : "") +
            name +
            (source.key.endsWith("/") ? "/" : ""),
        },
        confirmed: true,
      });
    });
  $("mkdir").onclick = () =>
    safe(async () => {
      const name = prompt("New simulated folder name:");
      if (!name) return;
      if (/[\/\\]/.test(name)) throw Error("Enter a single name.");
      await mutation("mkdir", {
        destination: identity(
          $("provider").value,
          $("prefix").value + name + "/",
        ),
      });
    });
  $("upload").onchange = () =>
    safe(async () => {
      const file = $("upload").files[0];
      if (!file) return;
      if (file.size > 65536)
        throw Error("Text fixtures are limited to 64 KiB.");
      if (file.type && !file.type.startsWith("text/"))
        throw Error("Choose a text fixture.");
      await mutation("upload", {
        destination: identity(
          $("provider").value,
          $("prefix").value + file.name,
        ),
        content: await file.text(),
      });
      $("upload").value = "";
    });
  $("read").onclick = () =>
    safe(async () => {
      const source = requireSelection();
      if (source.key.endsWith("/"))
        throw Error("Open the folder to browse it.");
      const result = await run("read", { source });
      if (result.state !== "completed") throw Error(result.error);
      if (!enabled) return;
      $("preview").textContent = result.result.content;
      $("preview").hidden = false;
      await refreshJobs();
    });
  $("refresh-jobs").onclick = () =>
    safe(async () => {
      await allowed();
      await refreshJobs();
      guideEvent({ kind: "action", action: "refresh-jobs" });
    });
  $("inspect").onclick = () =>
    safe(async () => {
      await allowed();
      $("trace").textContent = JSON.stringify(
        await engine.diagnose($("jobs").value),
        null,
        2,
      );
      guideEvent({ kind: "action", action: "inspect" });
    });

  $("home").onclick = () => {
    $("prefix").value = "";
    $("query").value = "";
    safe(() => browse());
  };
  $("documents").onclick = () => {
    $("prefix").value = "Documents/";
    $("query").value = "";
    safe(() => browse());
  };
  $("activity-link").onclick = $("show-activity").onclick = showActivity;
  for (const mode of ["grid", "list"])
    $("view-" + mode).onclick = () => {
      $("files").classList.toggle("file-list", mode === "list");
      for (const value of ["grid", "list"])
        $("view-" + value).setAttribute("aria-pressed", String(mode === value));
      guideEvent({ kind: "action", action: "view-" + mode });
    };
  document
    .querySelector(".comparison summary")
    .addEventListener("click", () =>
      guideEvent({ kind: "action", action: "comparison" }),
    );
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.betaModeEnabled)
      safe(async () => {
        await gate();
        if (enabled) await browse();
      });
  });
  safe(async () => {
    await gate();
    if (!enabled) return;
    await initialize();
    await browse();
  });

  return {
    async settle() {
      while (pending.size) await Promise.allSettled([...pending]);
    },
    close() {
      walkthrough.destroy();
      store?.close();
    },
  };
}
export const controller =
  typeof document !== "undefined" && typeof chrome !== "undefined"
    ? installBetaExplorer({ document, chrome })
    : null;

import {
  PROVIDERS,
  safeLink,
  safePreview,
  defaultExpanded,
  historyGroup,
  outcome,
} from "./lib/presentation.js";

export function createShelf(document, chrome) {
  const window = document.defaultView;
  const $ = (id) => document.getElementById(id);
  let settings = {},
    view = "providers",
    historyPage = 1,
    diagnosticsPage = 1;
  const overrides = new Map(),
    flashed = new Set(),
    cards = new Map();
  const newest = new Map(),
    flashQueues = new Map();
  let historyRequest = 0,
    diagnosticsRequest = 0;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  };

  async function call(op, input = {}) {
    const response = await chrome.runtime.sendMessage({ api: 1, op, input });
    if (!response?.ok) {
      const error = response?.error || {
        code: "API_UNAVAILABLE",
        message: "The extension did not respond. Try again.",
      };
      throw Object.assign(new Error(error.message || error.code), error);
    }
    return response.value;
  }
  function feedback(message, error = false) {
    $("feedback").textContent = message;
    $("feedback").hidden = !message;
    $("feedback").classList.toggle("error", error);
  }
  function report(error) {
    feedback(
      [error.code, error.message, error.nextAction].filter(Boolean).join(" · "),
      true,
    );
  }
  async function action(button, task) {
    button.disabled = true;
    try {
      await task();
    } catch (error) {
      report(error);
    } finally {
      button.disabled = false;
    }
  }
  function applyTheme() {
    document.documentElement.dataset.theme = settings.theme || "light";
    const dark = settings.theme === "dark";
    const label = dark ? "Switch to light mode" : "Switch to dark mode";
    $("theme-toggle").querySelector(".theme-label").textContent = dark
      ? "Light mode"
      : "Dark mode";
    $("theme-toggle").setAttribute("aria-label", label);
    $("theme-toggle").title = label;
    $("theme-toggle").setAttribute("aria-pressed", String(dark));
  }
  function fillSettings() {
    const form = $("settings-form");
    for (const name of [
      "pageSize",
      "expansionScope",
      "expansionComponent",
      "theme",
    ])
      form.elements.namedItem(name).value = settings[name];
    form.elements.namedItem("diagnosticsEnabled").checked =
      settings.diagnosticsEnabled;
    const unlimited = settings.diagnosticsCap === null;
    form.elements.namedItem("unlimited").checked = unlimited;
    form.elements.namedItem("diagnosticsCap").value = unlimited
      ? "4000"
      : String(settings.diagnosticsCap);
    form.elements.namedItem("diagnosticsCap").disabled = unlimited;
  }
  function drawRecent(provider) {
    const card = cards.get(provider),
      record = newest.get(provider);
    if (!card) return;
    const slot = card.querySelector(".recent-outcome");
    slot.className = "recent-outcome";
    if (!record) {
      slot.textContent = "No recent save attempt";
      return;
    }
    const status = outcome(record.state);
    slot.classList.add(status.tone);
    slot.textContent = `${status.label}${record.code ? ` · ${record.code}` : ""}`;
  }
  function remember(records) {
    for (const record of records) {
      const previous = newest.get(record.provider);
      if (!previous || record.createdAt >= previous.createdAt)
        newest.set(record.provider, record);
    }
    for (const provider of PROVIDERS) drawRecent(provider.id);
  }
  function startFlash(provider) {
    const card = cards.get(provider),
      queue = flashQueues.get(provider);
    card.classList.remove("flash-success", "flash-failure");
    if (!queue?.length || view !== "providers") return;
    // Restart a completed animation even when two consecutive outcomes share a tone.
    void card.offsetWidth;
    card.classList.add(`flash-${queue[0]}`);
  }
  function flash(provider, tone) {
    if (view !== "providers") return; // Never replay a hidden card's animation on navigation.
    const card = cards.get(provider);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      card.classList.remove("flash-success", "flash-failure");
      card.classList.add(`flash-${tone}`);
      return;
    }
    const queue = flashQueues.get(provider) || [];
    flashQueues.set(provider, queue);
    queue.push(tone);
    if (queue.length === 1) startFlash(provider);
  }
  function makeProviderCards() {
    for (const provider of PROVIDERS) {
      const card = el("article", undefined, "provider-card");
      card.dataset.provider = provider.id;
      card.append(
        el("div", provider.label[0], "provider-symbol"),
        el("h2", provider.label),
      );
      const readiness = el("p", undefined, "readiness uncertain");
      readiness.append(
        el("span", undefined, "dot"),
        el("span", "Checking authorization…"),
      );
      const reason = el(
        "p",
        "Loading extension authorization status.",
        "reason",
      );
      const actions = el("div", undefined, "provider-actions");
      const connect = el("button", "Sign In", "primary auth-action");
      connect.type = "button";
      connect.addEventListener("click", () =>
        action(connect, async () => {
          try {
            await call(connect.dataset.operation || "auth.connect", {
              provider: provider.id,
            });
          } finally {
            await refreshProviders();
          }
        }),
      );
      const refresh = el("button", "Refresh");
      refresh.type = "button";
      refresh.addEventListener("click", () =>
        action(refresh, async () => {
          try {
            await call("auth.refresh", { provider: provider.id });
          } finally {
            await refreshProviders();
          }
        }),
      );
      const go = el("button", "GO TO");
      go.type = "button";
      go.title = "Open provider website. This does not authorize uploads.";
      go.addEventListener("click", () =>
        action(go, () => call("providers.goTo", { provider: provider.id })),
      );
      actions.append(connect, refresh, go);
      card.append(
        readiness,
        reason,
        actions,
        el("p", "No recent save attempt", "recent-outcome"),
      );
      card.addEventListener("animationend", (event) => {
        if (event.target !== card) return;
        flashQueues.get(provider.id)?.shift();
        startFlash(provider.id);
      });
      cards.set(provider.id, card);
      $("provider-cards").append(card);
    }
  }
  async function refreshProviders() {
    const statuses = await call("providers.list");
    for (const status of statuses) {
      const card = cards.get(status.provider || status.id);
      if (!card) continue;
      const text = status.setupRequired
        ? "Setup required"
        : status.ready
          ? "Ready to Save"
          : status.authorized
            ? "Authorized · refresh required"
            : status.connected
              ? "Connected · approval required"
              : "Not connected";
      const readiness = card.querySelector(".readiness");
      readiness.className = `readiness ${status.ready ? "success" : "uncertain"}`;
      readiness.lastElementChild.textContent = text;
      card.querySelector(".reason").textContent =
        [status.reason, status.nextAction].filter(Boolean).join(" · ") ||
        (status.ready
          ? "Authorization supports an upload attempt. Each save is verified separately."
          : "Sign in to authorize this extension.");
      const connect = card.querySelector(".auth-action");
      connect.disabled = !!status.setupRequired;
      connect.textContent = status.setupRequired
        ? "Setup required"
        : status.connected
          ? "Reconnect / Approve"
          : "Sign In";
      connect.dataset.operation = status.connected
        ? "auth.reconnect"
        : "auth.connect";
    }
  }
  async function refreshCounter() {
    const result = await call("counter.get");
    $("save-count").textContent = Number(result.count).toLocaleString();
  }

  function renderPager(container, result, navigate) {
    container.replaceChildren();
    const previous = el("button", "Previous"),
      next = el("button", "Next");
    previous.disabled = result.page <= 1;
    next.disabled = result.page >= Math.max(1, result.pages);
    previous.addEventListener("click", () => navigate(result.page - 1));
    next.addEventListener("click", () => navigate(result.page + 1));
    container.append(
      previous,
      el(
        "span",
        `Page ${result.page} of ${Math.max(1, result.pages)} · ${result.total.toLocaleString()} ${container.id.startsWith("history") ? "records" : "events"}`,
      ),
      next,
    );
  }
  function addUrl(parent, label, value) {
    const row = el("p", undefined, "url-row");
    row.append(el("strong", label));
    const href = safeLink(value);
    if (href) {
      const link = el("a", href);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      row.append(link);
    } else row.append(el("span", "Unavailable"));
    parent.append(row);
  }
  function expansion(record, component, title) {
    const details = el("details");
    details.dataset.component = component;
    const key = `${record.id}:${component}`;
    details.open = overrides.has(key)
      ? overrides.get(key)
      : defaultExpanded(settings, historyPage, component);
    const summary = el("summary", title);
    details.append(summary);
    summary.addEventListener("click", () => overrides.set(key, !details.open));
    return details;
  }
  function loadPreview(details, slot, preview) {
    let loaded = false;
    const load = () => {
      if (loaded || !details.open) return;
      loaded = true;
      const image = el("img");
      image.alt = "Saved resource preview";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener(
        "error",
        () => {
          slot.classList.remove("has-preview");
          slot.replaceChildren(el("span", "Preview unavailable"));
        },
        { once: true },
      );
      image.src = preview;
      slot.replaceChildren(image);
    };
    details.addEventListener("toggle", load);
    if (details.open) {
      // Browser-native lazy loading defers decoding until the expanded record is visible.
      if (window.IntersectionObserver) {
        const observer = new window.IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            load();
            observer.disconnect();
          }
        });
        observer.observe(slot);
      } else load();
    }
  }
  function recordCard(record) {
    const status = outcome(record.state),
      card = el("article", undefined, `history-record ${status.tone}`);
    card.dataset.id = record.id;
    const heading = el("div", undefined, "record-title"),
      title = el("h3");
    title.append(
      el("span", undefined, "dot"),
      el("span", record.filename || "Unnamed resource"),
    );
    const remove = el("button", "Delete", "quiet danger record-delete");
    remove.setAttribute(
      "aria-label",
      `Delete local record for ${record.filename || "unnamed resource"}`,
    );
    remove.addEventListener("click", () =>
      action(remove, async () => {
        if (
          !window.confirm(
            "Delete this local History record? The cloud file and confirmed-saves counter stay unchanged.",
          )
        )
          return;
        await call("history.delete", { id: record.id });
        await renderHistory();
      }),
    );
    heading.append(title, remove);
    card.append(heading);
    const label =
      PROVIDERS.find((provider) => provider.id === record.provider)?.label ||
      record.provider;
    card.append(
      el(
        "p",
        `${label} · ${new Date(record.createdAt).toLocaleString()}`,
        "record-meta",
      ),
      el("p", status.label, `record-state ${status.tone}`),
    );
    if (record.code || record.message || record.nextAction)
      card.append(
        el(
          "p",
          [record.code, record.message, record.nextAction]
            .filter(Boolean)
            .join(" · "),
          "record-detail",
        ),
      );
    if (record.diagnosticsWarning)
      card.append(
        el(
          "p",
          `Diagnostics warning: ${record.diagnosticsWarning}. The save outcome above remains authoritative.`,
          "record-detail",
        ),
      );
    const imageDetails = expansion(record, "image", "Image preview"),
      preview = safePreview(record.preview);
    const slot = el(
      "div",
      preview
        ? "Preview loads when opened"
        : "No local image preview available",
      `preview-slot${preview ? " has-preview" : ""}`,
    );
    imageDetails.append(slot);
    if (preview) loadPreview(imageDetails, slot, preview);
    const urls = expansion(record, "urls", "URLs");
    addUrl(urls, "Host page URL:", record.hostUrl);
    addUrl(urls, "Source resource URL:", record.sourceUrl);
    card.append(imageDetails, urls);
    return card;
  }
  async function renderHistory() {
    const request = ++historyRequest;
    const result = await call("history.list", {
      page: historyPage,
      pageSize: settings.pageSize,
    });
    if (request !== historyRequest) return;
    if (!result.items.length && historyPage > 1) {
      historyPage = Math.max(1, result.pages);
      return renderHistory();
    }
    historyPage = result.page;
    remember(result.items);
    $("history-list").replaceChildren();
    let previous = null;
    for (const record of result.items) {
      const group = historyGroup(record.createdAt);
      if (group.key !== previous) {
        $("history-list").append(el("h2", group.label, "group-heading"));
        previous = group.key;
      }
      $("history-list").append(recordCard(record));
    }
    if (!result.items.length)
      $("history-list").append(
        el(
          "p",
          "No save attempts yet. Right-click a downloadable resource to begin.",
          "empty",
        ),
      );
    renderPager($("history-pager"), result, (page) => {
      historyPage = page;
      renderHistory().catch(report);
    });
  }
  async function renderDiagnostics() {
    const request = ++diagnosticsRequest;
    const result = await call("diagnostics.list", {
      page: diagnosticsPage,
      pageSize: 40,
    });
    if (request !== diagnosticsRequest) return;
    if (!result.items.length && diagnosticsPage > 1) {
      diagnosticsPage = Math.max(1, result.pages);
      return renderDiagnostics();
    }
    diagnosticsPage = result.page;
    $("diagnostics-list").replaceChildren();
    $("diagnostics-mode").textContent =
      `Collection ${settings.diagnosticsEnabled ? "ON" : "OFF"} · ${settings.diagnosticsCap === null ? "Unlimited retention (browser quota applies)" : `Newest ${Number(settings.diagnosticsCap).toLocaleString()} events retained`}. Speed measures upload plus confirmation bytes/time, excluding source acquisition, when available.`;
    for (const event of result.items) {
      const tone =
        event.outcome === "Success"
          ? "success"
          : event.outcome === "Failure"
            ? "failure"
            : "uncertain";
      const article = el("article", undefined, `diagnostic-event ${tone}`),
        heading = el("div", undefined, "event-heading");
      heading.append(
        el("span", undefined, "dot"),
        el("span", `${event.outcome} · ${event.stage}`),
      );
      article.append(
        heading,
        el(
          "p",
          `${new Date(event.timestamp).toLocaleString()} · ${PROVIDERS.find((p) => p.id === event.provider)?.label || event.provider || "System"} · ${event.attemptId || "No attempt"}`,
          "event-meta",
        ),
      );
      if (event.code || event.cause)
        article.append(
          el("p", [event.code, event.cause].filter(Boolean).join(" · ")),
        );
      const speed = Number.isFinite(event.speedBps)
        ? `${Math.round(event.speedBps).toLocaleString()} bytes/s`
        : "N/A";
      article.append(
        el(
          "p",
          `Speed: ${speed}${Number.isFinite(event.bytes) ? ` · ${event.bytes.toLocaleString()} bytes` : ""}${Number.isFinite(event.durationMs) ? ` · ${event.durationMs} ms` : ""}`,
        ),
      );
      const urls = el("details");
      urls.append(el("summary", "URLs"));
      addUrl(urls, "Host page URL:", event.hostUrl);
      addUrl(urls, "Source resource URL:", event.sourceUrl);
      article.append(urls);
      $("diagnostics-list").append(article);
    }
    if (!result.items.length)
      $("diagnostics-list").append(
        el("p", "No retained diagnostic events.", "empty"),
      );
    renderPager($("diagnostics-pager"), result, (page) => {
      diagnosticsPage = page;
      renderDiagnostics().catch(report);
    });
  }
  async function showView(next) {
    view = next;
    if (view !== "providers") {
      flashQueues.clear();
      for (const card of cards.values())
        card.classList.remove("flash-success", "flash-failure");
    }
    for (const panel of document.querySelectorAll(".view"))
      panel.hidden = panel.id !== `view-${view}`;
    for (const button of document.querySelectorAll("[data-view]")) {
      if (button.dataset.view === view)
        button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    $("more-menu").open = false;
    if (view === "history") await renderHistory();
    if (view === "settings") fillSettings();
    if (view === "diagnostics") await renderDiagnostics();
  }
  async function onAttempt(message, sender) {
    if (
      message?.event !== "attempt" ||
      (sender?.id && sender.id !== chrome.runtime.id)
    )
      return;
    const attempt = message.attempt;
    if (!attempt || !cards.has(attempt.provider)) return;
    remember([attempt]);
    if (
      ["SAVED", "FAILED"].includes(attempt.state) &&
      !flashed.has(attempt.id)
    ) {
      flashed.add(attempt.id);
      flash(
        attempt.provider,
        attempt.state === "SAVED" ? "success" : "failure",
      );
    }
    if (attempt.diagnosticsWarning)
      feedback(
        `Diagnostics warning: ${attempt.diagnosticsWarning}. The save outcome is recorded in History.`,
        true,
      );
    if (attempt.state === "UNCERTAIN")
      feedback("Save result uncertain. Check the provider before retrying.");
    if (attempt.state === "FAILED")
      feedback(
        [attempt.code, attempt.message, attempt.nextAction]
          .filter(Boolean)
          .join(" · "),
        true,
      );
    try {
      await Promise.all([refreshCounter(), refreshProviders()]);
      if (view === "history") await renderHistory();
      if (view === "diagnostics") await renderDiagnostics();
    } catch (error) {
      report(error);
    }
  }

  makeProviderCards();
  $("theme-toggle").addEventListener("click", () =>
    action($("theme-toggle"), async () => {
      settings = await call("settings.update", {
        theme: settings.theme === "dark" ? "light" : "dark",
      });
      applyTheme();
      if (view === "settings") fillSettings();
    }),
  );
  for (const button of document.querySelectorAll("[data-view]"))
    button.addEventListener("click", () =>
      showView(button.dataset.view).catch(report),
    );
  document.querySelector(".identity").addEventListener("click", (event) => {
    event.preventDefault();
    showView("providers").catch(report);
  });
  const form = $("settings-form");
  form.elements.namedItem("unlimited").addEventListener("change", () => {
    form.elements.namedItem("diagnosticsCap").disabled =
      form.elements.namedItem("unlimited").checked;
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const cap = form.elements.namedItem("diagnosticsCap").value,
      unlimited = form.elements.namedItem("unlimited").checked;
    if (
      !unlimited &&
      (!/^\d+$/.test(cap) ||
        !Number.isSafeInteger(Number(cap)) ||
        Number(cap) <= 0)
    ) {
      $("settings-result").textContent =
        "Enter a positive whole-number event cap, or choose Unlimited.";
      return;
    }
    const submit = form.querySelector("[type=submit]");
    action(submit, async () => {
      settings = await call("settings.update", {
        theme: form.elements.namedItem("theme").value,
        pageSize: Number(form.elements.namedItem("pageSize").value),
        expansionScope: form.elements.namedItem("expansionScope").value,
        expansionComponent: form.elements.namedItem("expansionComponent").value,
        diagnosticsEnabled:
          form.elements.namedItem("diagnosticsEnabled").checked,
        diagnosticsCap: unlimited ? null : Number(cap),
      });
      historyPage = 1;
      applyTheme();
      $("settings-result").textContent = "Settings saved.";
    });
  });
  $("clear-history").addEventListener("click", () =>
    action($("clear-history"), async () => {
      if (
        !window.confirm(
          "Clear all local History records? This does not delete cloud files or reset confirmed saves.",
        )
      )
        return;
      await call("history.clear");
      historyPage = 1;
      await renderHistory();
    }),
  );
  $("clear-diagnostics").addEventListener("click", () =>
    action($("clear-diagnostics"), async () => {
      if (
        !window.confirm(
          "Clear retained diagnostic events? History and cloud files stay unchanged.",
        )
      )
        return;
      await call("diagnostics.clear");
      diagnosticsPage = 1;
      await renderDiagnostics();
    }),
  );
  $("export-diagnostics").addEventListener("click", () =>
    action($("export-diagnostics"), async () => {
      if (
        !window.confirm(
          "The ZIP may contain browsing URLs. It stays on this device. Review it before sharing. Export retained diagnostic events?",
        )
      )
        return;
      await call("diagnostics.exportZip");
      feedback(
        "Diagnostics ZIP download requested. Check your browser downloads.",
      );
    }),
  );
  chrome.runtime.onMessage.addListener(onAttempt);
  $("about-version").textContent =
    `Version ${chrome.runtime.getManifest?.().version || "development"}`;
  const ready = (async () => {
    try {
      settings = await call("settings.get");
      applyTheme();
      fillSettings();
      await Promise.all([
        refreshProviders(),
        refreshCounter(),
        call("history.list", { page: 1, pageSize: 40 }).then((result) =>
          remember(result.items),
        ),
      ]);
    } catch (error) {
      report(error);
    }
  })();
  return {
    ready,
    call,
    showView,
    onAttempt,
    destroy() {
      chrome.runtime.onMessage.removeListener?.(onAttempt);
    },
  };
}

if (typeof document !== "undefined" && globalThis.chrome?.runtime?.id)
  createShelf(document, globalThis.chrome);

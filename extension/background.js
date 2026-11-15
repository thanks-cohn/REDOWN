import { openStore } from "./lib/store.js";
import { PROVIDERS } from "./lib/common.js";
import { createAuth } from "./lib/auth.js";
import { createAdapters } from "./providers/index.js";
import { createCoordinator } from "./lib/coordinator.js";
import { createApi } from "./lib/api.js";
export const MENU_ITEMS = PROVIDERS.map((p) => ({
  id: `save:${p.id}`,
  title: `Save to ${p.label}`,
  contexts: ["image", "link", "audio", "video"],
}));
let menuWrite = Promise.resolve();
export function installMenus(chrome) {
  const next = menuWrite
    .catch(() => {})
    .then(async () => {
      for (const item of MENU_ITEMS) {
        try {
          await chrome.contextMenus.update(item.id, {
            title: item.title,
            contexts: item.contexts,
          });
        } catch {
          await new Promise((resolve, reject) =>
            chrome.contextMenus.create(item, () => {
              const error = chrome.runtime?.lastError;
              if (error) reject(Error("Native menu registration failed."));
              else resolve();
            }),
          );
        }
      }
    });
  menuWrite = next;
  return next;
}
export function clickedInput(info, tab) {
  const provider = MENU_ITEMS.find(
    (item) => item.id === info.menuItemId,
  )?.id.slice(5);
  if (!provider) return null;
  return {
    provider,
    sourceUrl: info.srcUrl || info.linkUrl || "",
    hostUrl: info.pageUrl || tab?.url || "",
  };
}
// Register the standard native opener once; fallback only when unsupported/restricted.
export async function configureShelf(chrome) {
  if (chrome.sidePanel?.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      return "side-panel";
    } catch {
      /* A restricted platform can still use an explicit extension tab. */
    }
  }
  chrome.action.onClicked.addListener(() => {
    void chrome.tabs.create({ url: chrome.runtime.getURL("shelf.html") });
  });
  return "tab-fallback";
}
export function boot(chrome) {
  const ready = (async () => {
    await chrome.storage.local.setAccessLevel({
      accessLevel: "TRUSTED_CONTEXTS",
    });
    const store = await openStore();
    await store.recover();
    const auth = createAuth({ chrome, fetch: globalThis.fetch }),
      adapters = createAdapters({ fetch: globalThis.fetch });
    const coordinator = createCoordinator({
      store,
      auth,
      adapters,
      notify: (attempt) =>
        chrome.runtime
          .sendMessage({ event: "attempt", attempt })
          .catch(() => {}),
    });
    return {
      store,
      api: createApi({ store, auth, coordinator, chrome }),
      coordinator,
    };
  })();
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.event) return false;
    ready
      .then(({ api }) => api.message(message, sender))
      .then(respond, () =>
        respond({
          ok: false,
          error: {
            code: "STORAGE_UNAVAILABLE",
            message: "Local storage is unavailable; save was not started.",
            nextAction: "Free browser storage and reopen the extension.",
          },
        }),
      );
    return true;
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const input = clickedInput(info, tab);
    if (!input) return;
    ready
      .then(({ api }) => api.invoke("saves.start", input))
      .catch(() => {
        // The Shelf displays storage failures through API; keep the toolbar visibly marked until reopened.
        void chrome.action.setBadgeText({ text: "!" });
        void chrome.action.setBadgeBackgroundColor({ color: "#b91c1c" });
      });
  });
  void configureShelf(chrome);
  chrome.runtime.onInstalled.addListener(() => {
    void installMenus(chrome).catch(() => {});
  });
  chrome.runtime.onStartup.addListener(() => {
    void installMenus(chrome).catch(() => {});
  });
  void installMenus(chrome).catch(() => {});
  return ready;
}
if (globalThis.chrome?.runtime?.id) boot(globalThis.chrome);

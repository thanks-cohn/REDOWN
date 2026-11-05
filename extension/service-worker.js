/* REDOWN MV3 entrypoint: preserve the existing single toolbar opener when the
 * large core background fails to evaluate. This is NOT another opener/menu writer.
 * No storage, OAuth, provider or network dependency precedes the core import. */
(() => {
  'use strict';
  try {
    importScripts('background.js');
    globalThis.RedownWorkerCoreStatus = 'ready';
  } catch (error) {
    // An import/parse failure in the large core must not prevent a usable Shelf.
    // Chrome may show the worker as healthy while the core is not: BOOT reports
    // this distinction explicitly and the original toolbar listener remains.
    globalThis.RedownWorkerCoreStatus = 'failed';
    console.error('REDOWN core background failed to load; toolbar recovery remains available.', error);
    if (globalThis.RedownEntryListenerRegistered !== true) {
      // This is the SAME original entry-bootstrap, not a competing launcher.
      try {
        importScripts('entry-bootstrap.js');
      } catch (bootstrapError) {
        console.error('REDOWN toolbar bootstrap also failed; inspect chrome://extensions Errors.', bootstrapError);
      }
    }
    if (typeof globalThis.entryEvidence === 'function') {
      try {
        globalThis.entryEvidence('worker', 'load', 'core', 'CORE_IMPORT_FAILED', 'toolbar-recovery');
      } catch { /* Evidence must never prevent toolbar access. */ }
    }
    // Only on a failed core load: preserve the existing BOOT Debug API route.
    // No duplicate listener in normal operation; no cloud or mutation handlers.
    if (globalThis.RedownCoreMessageHandlerRegistered !== true) {
      chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (message?.type !== 'bootV1') return false;
        (async () => {
          const enabled = (await boundedEntry(chrome.storage.local.get('debugModeEnabled'), 1000)).debugModeEnabled;
          if (sender?.id !== chrome.runtime.id ||
              sender?.url !== chrome.runtime.getURL('options.html') ||
              enabled !== true) return {ok:false,code:'DIAGNOSTICS_DISABLED'};
          if (!globalThis.RedownBoot) return {ok:false,code:'BOOT_UNAVAILABLE'};
          return {ok:true,result:await globalThis.RedownBoot.query(message.operation,message.input)};
        })().then(respond, () => respond({ok:false,code:'BOOT_DIAGNOSTIC_UNAVAILABLE'}));
        return true;
      });
    }
  }
})();

// Optional Chute interoperability cannot prevent the existing Shelf/core boot.
try { importScripts('chute-stage.js'); importScripts('chute-worker.js'); }
catch { console.warn('REDOWN browser file handoff unavailable.'); }

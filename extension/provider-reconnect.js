/* User-gesture recovery controls on trusted Shelf, Options and Popup. No uploads. */
(() => {
  const commands = {
    google: "googleDriveOpen",
    dropbox: "dropboxConnect",
    onedrive: "onedriveConnect",
  };
  for (const button of document.querySelectorAll("[data-provider-reconnect]")) {
    const provider = button.dataset.providerReconnect,
      name = RedownProviderConnection.names[provider];
    const output = document.getElementById(
      button.getAttribute("aria-describedby"),
    );
    button.title = "Reconnect " + name + " / Refresh authorization";
    button.setAttribute("aria-label", "Reconnect " + name);
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      const restoreFocus = document.activeElement === button;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      if (output) output.textContent = "Checking " + name + " authorization…";
      try {
        const result = await chrome.runtime.sendMessage({
          type: commands[provider],
        });
        if (!result?.ok)
          throw Object.assign(
            Error(
              result?.error ||
                "Authorization did not complete. Navigation and existing saves are preserved.",
            ),
            { code: result?.code },
          );
        if (output)
          output.textContent =
            "Authorization refreshed. Existing uncertain saves were not retried.";
      } catch (error) {
        if (output)
          output.textContent =
            (error.code ? error.code + " · " : "") +
            (error.message || "Authorization unavailable. Try again later.");
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        if (restoreFocus && document.activeElement === document.body)
          button.focus({ preventScroll: true });
      }
    });
  }
})();

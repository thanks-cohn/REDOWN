// Dashboard-only presentation of the shared Shelf/Popup toolbar preference.
(() => {
  const choices = [...document.querySelectorAll('input[name="sidebar-toolbar-mode"]')];
  const feedback = document.getElementById('sidebar-settings-status');
  if (choices.length !== 2 || !feedback) return;

  const update = value => {
    const mode = value === 'popup' ? 'popup' : 'shelf';
    for (const input of choices) input.checked = input.value === mode;
  };
  const enable = value => {
    for (const input of choices) input.disabled = !value;
  };
  const load = async () => {
    const {toolbarOpenMode} = await chrome.storage.local.get('toolbarOpenMode');
    update(toolbarOpenMode);
  };

  for (const choice of choices) {
    choice.addEventListener('change', async () => {
      if (!choice.checked) return;
      enable(false);
      try {
        await chrome.storage.local.set({toolbarOpenMode: choice.value});
        update(choice.value);
        feedback.textContent = 'Saved. REDOWN will open the ' + (choice.value === 'popup' ? 'Popup.' : 'Shelf.');
      } catch {
        feedback.textContent = 'Could not save the preference. Try again.';
        await load().catch(() => {});
      } finally {
        enable(true);
      }
    });
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.toolbarOpenMode) update(changes.toolbarOpenMode.newValue);
  });
  load().then(() => enable(true)).catch(() => {
    feedback.textContent = 'Opening preference is unavailable.';
    enable(false);
  });
})();

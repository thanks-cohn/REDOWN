/* Explicit consent UI. No log deletion on OFF, no remote uploads or repair actions. */
(() => {
  const $ = (id) => document.getElementById(id),
    toggle = $("capless-logging");
  if (!toggle) return;
  const flight = globalThis.RedownFlightRecorder;
  let cursor = null,
    busy = false,
    rawTouched = false;
  const disclosure =
    "CAPLESS LOGGING appends local disk-backed history with NO application retention cap. Browser quota, eviction, OS/process termination and permission loss can interrupt capture. Long sessions consume disk and can affect performance. Default archives are SECURE; optional RAW contains complete signed URLs, account/destination identities and original errors in plaintext in your Chrome profile. Nothing uploads automatically. Enable CAPLESS LOGGING?";
  async function refresh() {
    if (!flight) {
      $("capless-status").textContent =
        "Recorder unavailable · capture incomplete";
      toggle.disabled = true;
      return;
    }
    const s = await flight.status();
    toggle.checked = s.on;
    if (!rawTouched) $("capless-raw").checked = s.raw;
    $("capless-state").textContent = s.on ? "ON" : "OFF";
    $("capless-status").textContent = JSON.stringify(s, null, 2);
    $("capless-warning").hidden = !s.captureIncomplete;
    if (s.captureIncomplete) $("capless-panel").open = true;
  }
  toggle.addEventListener("change", async () => {
    const on = toggle.checked;
    toggle.disabled = true;
    try {
      if (on && !confirm(disclosure)) {
        toggle.checked = false;
        return;
      }
      await flight.setConsent(on, {
        confirmed: on,
        raw: $("capless-raw").checked,
      });
      rawTouched = false;
    } catch {
      $("capless-status").textContent =
        "Archive could not change state. Capture incomplete; check backend/quota. Existing history is preserved.";
    } finally {
      toggle.disabled = false;
      await refresh();
    }
  });
  $("capless-raw").addEventListener("change", async () => {
    rawTouched = true;
    const s = await flight.status();
    if (!s.on) return;
    if (
      !confirm(
        "Change CAPLESS privacy mode? RAW is private plaintext and may contain signed secrets. Previously recorded history is preserved.",
      )
    ) {
      $("capless-raw").checked = s.raw;
      return;
    }
    try {
      await flight.setConsent(true, {
        confirmed: true,
        raw: $("capless-raw").checked,
      });
      rawTouched = false;
    } catch {}
    await refresh();
  });
  $("capless-inspect").addEventListener("click", async () => {
    try {
      const reader = await flight.reader();
      const data = {
        archive: await reader.stats(),
        integrity: await reader.verify(),
        stats: await reader.attempts({
          site: $("capless-site").value || undefined,
          provider: $("capless-provider").value || undefined,
          accountRef: $("capless-account").value || undefined,
          from: $("capless-from").value
            ? $("capless-from").value + "T00:00:00.000Z"
            : undefined,
          to: $("capless-to").value
            ? $("capless-to").value + "T23:59:59.999Z"
            : undefined,
        }),
        quota: (await navigator.storage?.estimate?.()) || "unavailable",
        osFreeBytes: "unavailable",
      };
      $("capless-output").textContent = JSON.stringify(data, null, 2);
    } catch {
      $("capless-output").textContent =
        "Archive unavailable/denied · capture incomplete. No existing data was reset.";
    }
  });
  function download(files, name) {
    const encoded = {};
    for (const [key, value] of Object.entries(files))
      encoded[key] = new TextEncoder().encode(value);
    const bytes = fflate.zipSync(encoded, { level: 6 }),
      url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" })),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function part() {
    const reader = await flight.reader(),
      result = await reader.exportPart(cursor || {});
    if (!cursor)
      result.files["pinned-incidents.json"] = JSON.stringify(
        await flight.listIncidents(),
        null,
        2,
      );
    download(
      result.files,
      "REDOWN-CAPLESS-PART-" + (cursor?.partNumber || 1) + ".zip",
    );
    cursor = result.more
      ? {
          after: result.nextAfter,
          boundary: result.boundary,
          gapAfter: result.nextGapAfter,
          gapsDone: result.gapsDone,
          snapshot: result.snapshot,
          pendingAfter: result.nextPendingAfter,
          pendingDone: result.pendingDone,
          nextAfter: result.nextAfter,
          partNumber: (cursor?.partNumber || 1) + 1,
        }
      : null;
    $("capless-next-part").hidden = !cursor;
    $("capless-output").textContent = result.more
      ? "Archive part generated. Keep every part; click Export next part until finished. No download completion is assumed."
      : "All parts for the selected durable snapshot were generated. Retain every ZIP and verify segment checksums. Newer/in-flight writes are outside that snapshot.";
  }
  $("capless-export").addEventListener("click", async () => {
    if (busy) return;
    if (
      !confirm(
        "Export the COMPLETE recorded capless archive? It may include private RAW history and signed secrets. Keep it private. A supported file picker streams one ZIP; otherwise export bounded ZIP parts. No server upload occurs.",
      )
    )
      return;
    busy = true;
    try {
      if (typeof window.showSaveFilePicker === "function") {
        const handle = await window.showSaveFilePicker({
            suggestedName: "REDOWN-CAPLESS-COMPLETE.zip",
            types: [
              {
                description: "ZIP archive",
                accept: { "application/zip": [".zip"] },
              },
            ],
          }),
          writer = await handle.createWritable(),
          reader = await flight.reader();
        let output = Promise.resolve(),
          failure = null;
        const zip = new fflate.Zip((error, data) => {
          if (error) {
            failure = error;
            return;
          }
          output = output.then(() => writer.write(data));
        });
        try {
          let state = null,
            partNumber = 0;
          do {
            partNumber++;
            const result = await reader.exportPart(state || {});
            for (const [name, value] of Object.entries(result.files)) {
              const entry = new fflate.ZipPassThrough(
                "parts/" + String(partNumber).padStart(6, "0") + "/" + name,
              );
              zip.add(entry);
              entry.push(new TextEncoder().encode(value), true);
              await output;
              if (failure) throw failure;
            }
            state = result.more
              ? {
                  after: result.nextAfter,
                  boundary: result.boundary,
                  gapAfter: result.nextGapAfter,
                  gapsDone: result.gapsDone,
                  snapshot: result.snapshot,
                  pendingAfter: result.nextPendingAfter,
                  pendingDone: result.pendingDone,
                }
              : null;
          } while (state);
          const pins = new fflate.ZipPassThrough("pinned-incidents.json");
          zip.add(pins);
          pins.push(
            new TextEncoder().encode(
              JSON.stringify(await flight.listIncidents()),
            ),
            true,
          );
          zip.end();
          await output;
          if (failure) throw failure;
          await writer.close();
          $("capless-output").textContent =
            "Complete committed-snapshot ZIP written. Verify hashes before sharing. Uncommitted writes remain explicitly outside that snapshot.";
        } catch (error) {
          await writer.abort().catch(() => {});
          throw error;
        }
      } else {
        cursor = null;
        await part();
      }
    } catch {
      $("capless-output").textContent =
        "Export interrupted or permission denied. Existing archive is preserved; no complete export is claimed.";
    } finally {
      busy = false;
    }
  });
  $("capless-next-part").addEventListener("click", async () => {
    if (busy || !cursor) return;
    busy = true;
    try {
      await part();
    } catch {
      $("capless-output").textContent =
        "Archive part failed. Cursor and committed archive remain available.";
    } finally {
      busy = false;
    }
  });
  $("flight-inspect").addEventListener("click", async () => {
    $("capless-output").textContent = JSON.stringify(
      await flight.snapshot(),
      null,
      2,
    );
  });
  $("flight-delete-incidents").addEventListener("click", async () => {
    if (
      confirm(
        "Delete the pinned incident envelopes only? Save history, capless segments and other diagnostics will remain.",
      )
    ) {
      await flight.deleteIncidents(true);
      $("capless-output").textContent =
        "Pinned incident envelopes explicitly deleted. Other data preserved.";
    }
  });
  window.addEventListener("redown-flight-status", () => {
    if (!busy) void refresh();
  });
  void refresh();
})();

export const PROVIDERS = Object.freeze([
  { id: "google", label: "Google Drive" },
  { id: "dropbox", label: "Dropbox" },
  { id: "onedrive", label: "OneDrive" },
]);

export function safeLink(value) {
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function safePreview(value) {
  return typeof value === "string" &&
    value.length <= 400_000 &&
    /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
    ? value
    : null;
}

export function defaultExpanded(settings, page, component) {
  const scope = settings.expansionScope;
  return (
    (scope === "all" || (scope === "first" && page === 1)) &&
    (settings.expansionComponent === "both" ||
      settings.expansionComponent === component)
  );
}

function localDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Exclusive buckets: last seven local dates, then Monday weeks this year, then years.
// Calendar setters deliberately avoid 24-hour arithmetic across DST transitions.
export function historyGroup(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime()))
    return { key: "unknown", label: "Date unavailable" };
  const day = localDay(date),
    today = localDay(now),
    oldestDay = localDay(now);
  oldestDay.setDate(oldestDay.getDate() - 6);
  if (day >= oldestDay) {
    const yesterday = localDay(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const label =
      +day === +today
        ? "Today"
        : +day === +yesterday
          ? "Yesterday"
          : date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
    return { key: `day:${dayKey(day)}`, label };
  }
  if (date.getFullYear() === now.getFullYear()) {
    const monday = localDay(date);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return {
      key: `week:${dayKey(monday)}`,
      label: `Week of ${monday.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }
  return {
    key: `year:${date.getFullYear()}`,
    label: String(date.getFullYear()),
  };
}

export function outcome(state) {
  if (state === "SAVED")
    return { tone: "success", label: "Saved · provider confirmed" };
  if (state === "FAILED")
    return { tone: "failure", label: "Failed · not saved" };
  if (state === "UNCERTAIN")
    return {
      tone: "uncertain",
      label: "Uncertain · check provider before retrying",
    };
  return {
    tone: "uncertain",
    label: `In progress · ${String(state || "received")
      .toLowerCase()
      .replaceAll("_", " ")}`,
  };
}

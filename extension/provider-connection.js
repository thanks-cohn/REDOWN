/* Pure shared projection: website navigation is never OAuth or upload proof. */
(() => {
  "use strict";
  const names = {
    google: "Google Drive",
    dropbox: "Dropbox",
    onedrive: "OneDrive",
  };
  function transient(code = "") {
    return /^(?:ONEDRIVE_(?:NETWORK|GRAPH_(?:429|5\d\d)|TOKEN_(?:429|5\d\d))|GOOGLE_(?:NETWORK|HTTP_(?:429|5\d\d))|DROPBOX_(?:NETWORK|HTTP_(?:429|5\d\d)))$/.test(
      code,
    );
  }
  function project(provider, state = {}, transfer = {}, now = Date.now()) {
    const disconnected = state.phase === "disconnected";
    const accountKnown =
      !disconnected &&
      Boolean(
        state.accountKnown ||
          state.accountId ||
          state.connectionId ||
          state.phase === "connected",
      );
    const priorTransfer =
      !!state.checkedAt &&
      ((!transfer.updatedAt && !transfer.at) ||
        (transfer.updatedAt || transfer.at) <= state.checkedAt);
    const code =
      state.code ||
      (!priorTransfer
        ? transfer.code ||
          (/OAuth2 not granted or revoked/i.test(transfer.error || "")
            ? "GOOGLE_AUTH_REQUIRED"
            : "")
        : "");
    const sourceNetwork =
      !state.code && transfer.phase === "source" && code === "ONEDRIVE_NETWORK";
    const unavailable =
      (!sourceNetwork && transient(code)) || state.phase === "unavailable";
    const revoked =
      /AUTH_REQUIRED|INVALID_GRANT|SCOPES|ACCOUNT_CHANGED|GRAPH_(401|403)$/.test(
        code,
      ) || state.oauthGrantState === "required";
    const fresh =
      state.phase === "connected" &&
      Number.isFinite(state.checkedAt) &&
      now - state.checkedAt < 300000;
    const oauthGrantState = revoked
      ? "required"
      : fresh
        ? "verified"
        : state.phase === "connecting"
          ? "checking"
          : "unknown";
    const providerReachability = unavailable
      ? "unavailable"
      : fresh
        ? "reachable"
        : "unknown";
    const destinationReady =
      fresh &&
      !unavailable &&
      !revoked &&
      (provider === "google" || state.rootReady === true)
        ? "verified"
        : "unknown";
    const hint = state.statusUnavailable
      ? "Status unavailable · website session unverified"
      : sourceNetwork
        ? "Source request interrupted · provider status is separate"
        : unavailable
          ? "Temporarily unavailable · " + code
          : revoked
            ? "Reconnect required"
            : state.phase === "connecting"
              ? "Checking authorization…"
              : fresh
                ? "Authorization checked · website session unverified"
                : "Authorization unverified";
    return {
      provider,
      accountKnown,
      websiteSession: "unknown",
      oauthGrantState,
      requiredScopes:
        provider === "google"
          ? ["https://www.googleapis.com/auth/drive.file"]
          : provider === "onedrive"
            ? ["Files.ReadWrite", "User.Read", "offline_access"]
            : [
                "account_info.read",
                "files.metadata.read",
                "files.content.read",
                "files.content.write",
              ],
      providerReachability,
      destinationReady,
      uploadReadiness:
        "Requires a fresh verified transfer; website session is independent",
      lastVerifiedSave:
        transfer.status === "completed" && transfer.verified === true
          ? transfer.at || null
          : null,
      checkedAt: state.checkedAt || null,
      stale: !fresh,
      code,
      retryable: unavailable,
      primary:
        accountKnown ||
        state.statusUnavailable ||
        (state.phase === "reconnect" && state.accountKnown === undefined)
          ? "GO TO"
          : "LOGIN",
      hint,
      navigation:
        provider === "google"
          ? "https://drive.google.com/drive/u/0/my-drive"
          : provider === "dropbox"
            ? "https://www.dropbox.com/home"
            : ["business", "documentLibrary"].includes(state.driveType)
              ? "https://www.office.com/launch/onedrive"
              : "https://onedrive.live.com/",
      name: names[provider],
    };
  }
  globalThis.RedownProviderConnection = { project, transient, names };
})();

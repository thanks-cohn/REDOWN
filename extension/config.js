// Generated public deployment profile. Configure deployment/*.json and run npm run build.
export const CONFIG = {
  profile: "standalone",
  extensionIdentity: {
    expectedId: "",
    publicKey: "",
  },
  clientIds: {
    google: "",
    dropbox: "",
    onedrive: "",
  },
  scopes: {
    google: ["https://www.googleapis.com/auth/drive.file"],
    dropbox: [
      "account_info.read",
      "files.metadata.read",
      "files.content.write",
    ],
    onedrive: ["Files.ReadWrite", "User.Read", "offline_access"],
  },
  platforms: {
    google: "chrome-identity",
    dropbox: "pkce",
    onedrive: "pkce",
  },
  authority: {
    microsoftHost: "https://login.microsoftonline.com",
    microsoftTenant: "common",
  },
  redirects: {
    dropbox: "",
    onedrive: "",
  },
};

# Download filename collisions

Remote downloads and browser-assisted download uploads now preserve an existing object and select the first free numbered name in the requested folder: `photo.jpg`, `photo-1.jpg`, `photo-2.jpg`. The Worker response supplies the actual key, filename and URL; destination receipts use that key for Explorer previews. Unique URLs also avoid reusing the immutable URL of an older object.

The embedded STORAGE Worker implements naming; R2 does not allocate filenames. An `If-None-Match: *` conditional put prevents a competing download from overwriting a name chosen between the existence check and write. If that rare race occurs, the transfer fails with a retry message rather than claiming success or replacing bytes. Streaming remains streamed; this does not buffer known-length files just to replay a collision.

Worker profile version is now 4, so the normal preparation path upgrades older deployed profiles before downloading. No second Worker is required. Existing explicit Explorer copy conflict policies and direct local-upload skip behavior are unchanged.

Verification: 15 targeted tests passed across download-collisions, destination-search-regression and explorer-worker; npm run check and git diff --check passed. Fixtures exercise the actual embedded Worker with mocked storage, including original preservation, repeated numbering, returned URLs, remote downloads and a conditional-write race. Live Chrome/R2 deployment and known-length streaming in Cloudflare were not exercised here.

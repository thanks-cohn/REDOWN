# REDOWN

<p align="center">
  <img src="mascot-rodn.png" alt="REDOWN mascot" width="180">
</p>

**Remote downloads, without the download.**

Source repository: [thanks-cohn/REDOWN](https://github.com/thanks-cohn/REDOWN).

REDOWN is a browser extension for organizing and transferring files to Cloudflare R2. Send supported remote files to your storage without first saving them to your computer, or upload files directly from your device.

## What you can do

- **Remote downloads:** Send supported files from the web to a selected R2 destination.
- **Your locations, your way:** Organize buckets and folders using simple or nested right-click menus.
- **Browse and manage:** Explore your configured R2 locations from the extension.
- **Upload from your computer:** Select local files and transfer them to R2 with retry handling for temporary failures.

## Owner and Authorized-Tester Setup Only

The setup instructions below are for REDOWN's rights holders and people they have expressly authorized in writing. They are not an invitation or permission for the general public to install, run, copy, or modify REDOWN.

1. [Download the repository ZIP](https://github.com/thanks-cohn/REDOWN/archive/refs/heads/main.zip) and extract it.
2. Open `chrome://extensions` in Chrome (or your browser's extensions page).
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select the `extension/` folder.
5. Open REDOWN, choose **Connect Cloudflare**, and authorize access to your R2 storage.

For remote transfers, REDOWN uses a Cloudflare Worker to send data to R2 without routing the file contents through your computer. Local uploads use a separate direct-upload path.

**Note:** Keep the settings page open until local uploads finish. An interrupted upload session does not currently resume after closing or reloading that page.

## License

**Publicly visible, not publicly licensed.** REDOWN's original materials are reserved under the [REDOWN Proprietary Source License 2.1](LICENSE). No permission is granted to install, run, copy, modify, redistribute, or commercially or noncommercially use the source without prior written authorization, except where an existing grant, separate third-party license, GitHub terms, or applicable law provides otherwise. The public repository does not make REDOWN open source.

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

## Get started

1. [Download the repository ZIP](https://github.com/thanks-cohn/REDOWN/archive/refs/heads/main.zip) and extract it.
2. Open `chrome://extensions` in Chrome (or your browser's extensions page).
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select the `extension/` folder.
5. Open REDOWN, choose **Connect Cloudflare**, and authorize access to your R2 storage.

For remote transfers, REDOWN uses a Cloudflare Worker to send data to R2 without routing the file contents through your computer. Local uploads use a separate direct-upload path.

**Note:** Keep the settings page open until local uploads finish. An interrupted upload session does not currently resume after closing or reloading that page.

## Current development roadmap and test evidence

- [Latest milestone map: release sequencing and next acceptance gates](docs/roadmap/LATEST-RELEASE-MILESTONES.md)
- [Owner-observed R2 Quick baseline: 926/926 planned cases passed, full-corpus acceptance incomplete](docs/laboratory/QUICK-R2-OWNER-BASELINE-2026-10-26.md)

## Agent Operability Benchmark (AOB) — founding proposal

**How effectively can unfamiliar, authorized AI agents discover, operate, verify, diagnose, recover and maintain software without undocumented human knowledge?**

On **24 October 2026**, REDOWN documented its proposal for the **Agent Operability Benchmark (AOB)**: a general-purpose methodology intended to evaluate the *operability of software by agents*, rather than only the performance of AI models on tasks. REDOWN is its **initial case study and proposed first demonstration** through existing Agent Accessibility Conformance (AAC), Resource Atlas, Universal File API and Forever Works evidence. **AOB is currently a proposal, not an established standard, independently validated benchmark, public leaderboard or claim of being the first such idea anywhere.** REDOWN has no certified AOB score.

The approach proposes comparable task outcomes across software projects, documented permissions, independent verification, resource and context efficiency, reproducible research evidence, and mandatory safety gates. It is designed to stand independently of REDOWN so that other software may eventually be studied fairly, including software that outperforms REDOWN.

- [AOB founding statement and reading guide](docs/aob/README.md)
- [General benchmark methodology and provisional scoring](docs/aob/SPECIFICATION.md)
- [Research validity, independence and governance](docs/aob/RESEARCH_AND_GOVERNANCE.md)
- [REDOWN initial case-study evidence and limitations](docs/aob/REDOWN_DEMONSTRATION.md)

The repository remains proprietary. A potential later independent publication or license for AOB requires an explicit owner decision.

## License

REDOWN's original materials are provided under the [REDOWN Proprietary Source License 2.0](LICENSE). Reuse requires prior written permission, subject to applicable law and existing third-party rights.

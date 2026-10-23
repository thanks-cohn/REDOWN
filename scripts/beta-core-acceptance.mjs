import { runSimulationAcceptance } from "../extension/file-engine/acceptance.mjs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const report = await runSimulationAcceptance();
report.environment = { node: process.version, platform: process.platform };
report.sourceCommit = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).stdout.trim();
report.sourceFiles = [];
for (const path of [
  "extension/file-engine/contract.mjs",
  "extension/file-engine/simulation.mjs",
  "extension/file-engine/acceptance.mjs",
])
  report.sourceFiles.push({
    path,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
  });
await mkdir("work/beta-walkthrough", { recursive: true });
await writeFile(
  "work/beta-walkthrough/core.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (report.state !== "passed") process.exitCode = 1;

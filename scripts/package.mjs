import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { zipSync } from "fflate";
import { buildDeployment } from "./build.mjs";
const args = process.argv.slice(2),
  at = args.indexOf("--profile");
const { out, report } = await buildDeployment({
  profileName: at < 0 ? undefined : args[at + 1],
  configPath: args.includes("--config")
    ? args[args.indexOf("--config") + 1]
    : undefined,
});
const files = {};
async function walk(path, prefix) {
  for (const d of await readdir(path, { withFileTypes: true })) {
    const p = `${path}/${d.name}`,
      key = `${prefix}/${d.name}`;
    if (d.isDirectory()) await walk(p, key);
    else files[key] = new Uint8Array(await readFile(p));
  }
}
await walk(`${out}/extension`, "extension");
await walk("docs", "docs");
for (const p of ["README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"])
  files[p] = new Uint8Array(await readFile(p));
files["build-report.json"] = new Uint8Array(
  await readFile(`${out}/build-report.json`),
);
await mkdir("dist", { recursive: true });
const archive = zipSync(files);
await writeFile(`dist/redown-basic-${report.profile}.zip`, archive);
await writeFile("dist/redown-basic.zip", archive);
console.log(
  `Packaged ${report.profile}: dist/redown-basic-${report.profile}.zip. Load dist/${report.profile}/extension. Live release gate remains blocked.`,
);

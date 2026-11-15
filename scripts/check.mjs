import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
async function walk(path) {
  let out = [];
  for (const d of await readdir(path, { withFileTypes: true })) {
    const p = `${path}/${d.name}`;
    if (d.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(m?js)$/.test(d.name)) out.push(p);
  }
  return out;
}
for (const p of [
  ...(await walk("extension")),
  ...(await walk("tests")),
  ...(await walk("scripts")),
])
  execFileSync(process.execPath, ["--check", p], { stdio: "inherit" });
const m = JSON.parse(await readFile("extension/manifest.json", "utf8"));
if (
  m.manifest_version !== 3 ||
  m.background.type !== "module" ||
  m.externally_connectable ||
  m.content_scripts
)
  throw Error("Manifest boundary regression");
console.log("JavaScript syntax and MV3 boundary checks passed.");

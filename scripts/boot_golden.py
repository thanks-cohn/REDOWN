#!/usr/bin/env python3
"""REDOWN BOOT Golden 500 controller (Python 3.10+, Node.js project deps).

Produces 500 distinct lifecycle/fault pairs. Each is executed against REDOWN's
real background bootstrap source in its existing VM/Chrome-API fault harness.
Mock results NEVER certify an installed Chrome worker, toolbar, Shelf, or cloud.
Run from REDOWN repository root:
  python scripts/boot_golden.py --rounds 2 --installed-chrome
  # Windows: py -3 scripts/boot_golden.py --rounds 2 --installed-chrome
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
FAMILIES = (
    "baseline", "fresh-empty", "missing-id-cache", "disconnected",
    "popup-preferred", "stale-applying", "stale-applied",
    "missing-destinations", "disabled-destination", "nested-selected",
    "depth-selected", "two-destinations", "unprepared-worker",
    "history-heavy", "account-switched", "reinstall-like-storage",
    "cold-worker-wake", "missing-child-after-wake",
    "missing-root-after-wake", "lost-cache-after-wake",
)
FAULTS = (
    "none", "panel-rejected", "panel-synchronous-throw", "popup-open-rejected",
    "popup-registration-rejected", "panel-options-rejected", "storage-rejected",
    "native-child-create-rejected", "native-all-creates-rejected",
    "native-child-callback-lost", "native-child-removal-rejected",
    "core-import-early", "core-import-late", "panel-close-rejected",
    "tab-create-rejected", "window-create-rejected", "remove-all-rejected",
    "panel-and-native-create", "panel-and-lost-callback",
    "popup-registration-and-panel", "storage-and-panel",
    "core-early-and-popup-registration", "core-late-and-panel",
    "native-denial-and-storage", "native-create-and-popup",
)
assert len(FAMILIES) == 20 and len(FAULTS) == 25

FOCUSED_TESTS = (
    "tests/boot.test.mjs", "tests/worker-bootstrap-first-install.test.mjs",
    "tests/entry-point-reliability.test.mjs", "tests/right-click-dispatch.test.mjs",
    "tests/right-click-current.test.mjs",
)

def manifest() -> dict:
    cases = [
        {"id": f"BOOT-{1 + i*len(FAULTS) + j:03d}",
         "family": family, "fault": fault,
         "intent": f"{family} with injected condition {fault}"}
        for i, family in enumerate(FAMILIES)
        for j, fault in enumerate(FAULTS)
    ]
    assert len(cases) == 500 and len({c["id"] for c in cases}) == 500
    return {"schemaVersion": 1, "classification": "VM_MOCK_ONLY",
            "policy": "20 lifecycle families x 25 distinct fault injections",
            "cases": cases}

def run(command: list[str], out: Path, timeout: int = 300,
        env: dict | None = None) -> dict:
    start = time.perf_counter()
    try:
        proc = subprocess.run(command, cwd=ROOT, capture_output=True,
                              text=True, encoding="utf-8", errors="replace",
                              env=env, timeout=timeout, check=False)
        status = "PASS" if proc.returncode == 0 else "FAIL"
        log = proc.stdout + ("\n--- stderr ---\n" + proc.stderr if proc.stderr else "")
        code = proc.returncode
    except FileNotFoundError as exc:
        status, log, code = "BLOCKED", type(exc).__name__ + ": executable unavailable", None
    except subprocess.TimeoutExpired:
        status, log, code = "BLOCKED", "Execution exceeded bounded timeout", None
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(log, encoding="utf-8")
    return {"status": status, "exitCode": code, "log": str(out.relative_to(ROOT)),
            "durationSeconds": round(time.perf_counter()-start, 3)}

def read_attempts(path: Path, requested: list[dict]) -> list[dict]:
    if not path.exists():
        return [{"id": c["id"], "family": c["family"], "fault": c["fault"],
                 "status": "ERROR", "failureCodes": ["NO_EXECUTION_RECEIPT"]}
                for c in requested]
    records = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            try:
                records.append(json.loads(line))
            except (json.JSONDecodeError, ValueError):
                pass
    ids = [c["id"] for c in requested]
    if sorted(x.get("id") for x in records) != sorted(ids) or len(records) != len(ids):
        return [{"id": c["id"], "family": c["family"], "fault": c["fault"],
                 "status": "ERROR", "failureCodes": ["RECEIPT_COVERAGE_MISMATCH"]}
                for c in requested]
    return records

def safe_path(path_text: str) -> Path:
    output = (ROOT / path_text).resolve()
    if not output.is_relative_to(ROOT):
        raise ValueError("Output must remain inside the REDOWN repository")
    return output

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rounds", type=int, default=2, help="Full 500-case runs (1 to 10)")
    parser.add_argument("--rerun-failures", type=int, default=1,
                        help="Triage reruns of failed cases only (0 to 3)")
    parser.add_argument("--output", default="work/boot-golden",
                        help="Repository-relative evidence directory")
    parser.add_argument("--installed-chrome", action="store_true",
                        help="Also run existing isolated real-Chrome smoke; never use your personal profile")
    parser.add_argument("--chrome-bin", default="",
                        help="Chrome/Chromium binary path; defaults to CHROME_BIN or system runner default")
    parser.add_argument("--skip-focused", action="store_true",
                        help="Skip focused historical regressions (cannot satisfy release gate)")
    args = parser.parse_args()
    if not 1 <= args.rounds <= 10 or not 0 <= args.rerun_failures <= 3:
        parser.error("rounds must be 1..10 and rerun-failures 0..3")
    out_dir = safe_path(args.output)
    if out_dir == ROOT:
        parser.error("--output cannot be repository root")
    out_dir.mkdir(parents=True, exist_ok=True)
    payload = manifest()
    manifest_bytes = (json.dumps(payload, indent=2) + "\n").encode("utf-8")
    (out_dir / "cases.json").write_bytes(manifest_bytes)
    digest = hashlib.sha256(manifest_bytes).hexdigest()
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    report: dict = {
        "schemaVersion": 1, "program": "REDOWN BOOT Golden 500",
        "startedAt": started, "corpusSha256": digest,
        "totalUniqueCases": 500, "proofLevel": "VM_MOCK_ONLY",
        "knownHistoricalCause": "menu removeAll on missing ID cache; native callback ambiguity",
        "historicalOwnerIncident": "OPEN: service worker registration vs evaluation vs Shelf dispatch not established",
        "checks": {}, "iterations": [], "installedChrome": {"status": "NOT_RUN"},
    }

    def gate(label: str, command: list[str], timeout: int = 300) -> None:
        report["checks"][label] = run(command, out_dir / "checks" / (label + ".log"), timeout)

    # Static entrypoint/package checks and prior causal reproductions.
    gate("syntax", ["node", "scripts/check-syntax.mjs"])
    gate("historical-menu-reproduction", ["node", "scripts/boot-reproduction.mjs"])
    gate("boot-schema", [sys.executable, "tests/boot-schema-conformance.py"])
    if not args.skip_focused:
        gate("focused-historical-regressions",
             ["node", "--test", *FOCUSED_TESTS], timeout=600)
    else:
        report["checks"]["focused-historical-regressions"] = {"status": "NOT_RUN"}

    failures_ever: set[str] = set()
    last_records: dict[str, dict] = {}
    for iteration in range(1, args.rounds+1):
        in_path = out_dir / f"round-{iteration:02d}.json"
        out_path = out_dir / f"round-{iteration:02d}.jsonl"
        in_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        execution = run(["node", "scripts/boot-golden-matrix.mjs",
                         "--input", str(in_path), "--output", str(out_path)],
                        out_dir / f"round-{iteration:02d}.log", timeout=600)
        records = read_attempts(out_path, payload["cases"])
        failed = [r for r in records if r.get("status") != "PASS"]
        failures_ever.update(x["id"] for x in failed)
        last_records.update({r["id"]: r for r in records})
        report["iterations"].append({
            "round": iteration, "cases": len(records),
            "passed": len(records)-len(failed), "failed": len(failed),
            "execution": execution, "failedCaseIds": [x["id"] for x in failed]
        })
        print(f"Round {iteration}: {len(records)-len(failed)}/500 VM cases passed")
        if execution["status"] == "BLOCKED":
            break

    # Re-run failures to detect nondeterminism. A first failure stays a failure;
    # no rerun can silently erase a recorded regression.
    for iteration in range(1, args.rerun_failures+1):
        pending = [c for c in payload["cases"] if c["id"] in failures_ever]
        if not pending:
            break
        rerun_in = out_dir / f"triage-{iteration:02d}.json"
        rerun_out = out_dir / f"triage-{iteration:02d}.jsonl"
        rerun_in.write_text(json.dumps({**payload, "cases": pending}, indent=2) + "\n",
                            encoding="utf-8")
        execution = run(["node", "scripts/boot-golden-matrix.mjs",
                         "--input", str(rerun_in), "--output", str(rerun_out)],
                        out_dir / f"triage-{iteration:02d}.log", timeout=600)
        records = read_attempts(rerun_out, pending)
        now_failed = [r for r in records if r.get("status") != "PASS"]
        report["iterations"].append({
            "triageRound": iteration, "cases": len(records),
            "failed": len(now_failed), "execution": execution,
            "failedCaseIds": [x["id"] for x in now_failed],
            "warning": "Rerun PASS does not clear the original failure"
        })
        print(f"Triage {iteration}: {len(now_failed)}/{len(records)} still failing")

    if args.installed_chrome:
        installed = out_dir / "installed-chrome.json"
        env = os.environ.copy()
        if args.chrome_bin:
            env["CHROME_BIN"] = args.chrome_bin
        command = ["node", "scripts/installed-chrome.mjs", "extension", str(installed)]
        probe = run(command, out_dir / "installed-chrome.log", timeout=180, env=env)
        try:
            data = json.loads(installed.read_text(encoding="utf-8"))
            # Only the existing smoke's own declared evidence, not toolbar-click proof.
            report["installedChrome"] = {
                "status": data.get("state", "BLOCKED").upper(),
                "assertions": data.get("assertions", []),
                "code": data.get("code", ""),
                "limitation": "Smoke is NOT an actual first toolbar gesture or Shelf render acceptance",
                "execution": probe
            }
        except (FileNotFoundError, json.JSONDecodeError):
            report["installedChrome"] = {"status": "BLOCKED", "execution": probe}

    summary = collections.Counter(
        reason for record in last_records.values()
        for reason in record.get("failureCodes", []))
    report["failingCaseIds"] = sorted(failures_ever)
    report["failureKinds"] = dict(sorted(summary.items()))
    report["neverPassedCaseCount"] = sum(
        1 for x in last_records.values() if x.get("status") != "PASS")
    checks_ok = all(x.get("status") == "PASS" for x in report["checks"].values())
    corpus_ok = len(last_records) == 500 and not failures_ever
    chrome_ok = report["installedChrome"].get("status") == "PASSED"
    report["gate"] = {
        "simulatedBoot": "PASS" if corpus_ok and checks_ok else "FAIL_OR_BLOCKED",
        "installedChromeSmoke": "PASS" if chrome_ok else "BLOCKED_OR_NOT_RUN",
        "firstToolbarGestureAndShelfRender": "NOT_VERIFIED",
        "ownerOriginalIncidentRootCause": "OPEN",
        "launchReady": False,
    }
    report["finishedAt"] = dt.datetime.now(dt.timezone.utc).isoformat()
    (out_dir / "report.json").write_text(json.dumps(report, indent=2) + "\n",
                                         encoding="utf-8")
    top = ", ".join(f"{name}: {count}" for name, count in summary.most_common(12)) or "none"
    markdown = (
        "# REDOWN BOOT Golden 500 — execution report\n\n"
        f"Started: {started}  \nCorpus SHA-256: `{digest}`  \n"
        f"Distinct executed case identities: {len(last_records)}/500  \n"
        f"Failed in any round: {len(failures_ever)}  \n"
        f"Failure categories: {top}  \n"
        f"Installed Chrome smoke: {report['installedChrome']['status']}  \n\n"
        "## Interpretation\n\n"
        "A successful VM matrix is only harness evidence; even an installed smoke does "
        "not prove a first toolbar gesture or a Shelf render. The owner's failure-to-"
        "start incident remains OPEN until a pre-Reload Chrome error/worker trace "
        "identifies the actual failing boundary and a fresh-profile repeat passes.\n\n"
        "Never delete the user's Chrome profile, tokens, or storage to manufacture success.\n"
    )
    (out_dir / "report.md").write_text(markdown, encoding="utf-8")
    print(f"Evidence: {out_dir / 'report.json'}")
    print(f"Simulated gate: {report['gate']['simulatedBoot']}; "
          f"installed Chrome: {report['gate']['installedChromeSmoke']}; "
          "launch ready: NO (first gesture and owner incident unresolved)")
    return 0 if corpus_ok and checks_ok else 1

if __name__ == "__main__":
    sys.exit(main())

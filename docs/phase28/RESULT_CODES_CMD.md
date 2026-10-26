# Owner Windows CMD test

Run in **CMD**, not PowerShell. Close old Python windows and stop the old Laboratory
connection. Start from a clean checkout; preserve any unrelated local changes.

```bat
cd /d "%USERPROFILE%\Desktop\Extension\remote-download-2-cloudfare"
git status --short
git fetch origin
git switch fix/lab-result-codes
git pull --ff-only
git branch --show-current
git rev-parse HEAD
.venv\Scripts\python.exe -m pip install --upgrade --no-deps .\clients\python
.venv\Scripts\python.exe -c "from importlib.metadata import version; print(version('redown-client'))"
```

Expected Python: **0.5.5**. At `chrome://extensions`, confirm REDOWN's loaded directory
is this checkout's `extension` folder, reload it and copy its installed extension ID.
The unchanged manifest version 0.5.26 alone does not identify the branch.

```bat
set /p REDOWN_EXTENSION_ID=Paste REDOWN extension ID:
.venv\Scripts\python.exe -m redown.install_host --extension-id "%REDOWN_EXTENSION_ID%"
```

Open REDOWN Python Laboratory. Discover buckets, select **only test-1-new**, start
the local connection, choose the intended grant duration, and keep the page open.
For Doctor, keep separate write approval unchecked. This checks the actual provider
route/settings/capabilities without deploying or changing its Worker:

```bat
set "REDOWN_DOCTOR=%USERPROFILE%\Downloads\REDOWN-Doctor-%RANDOM%-%RANDOM%.json"
.venv\Scripts\python.exe -m redown.lab doctor --report "%REDOWN_DOCTOR%"
echo %REDOWN_DOCTOR%
```

Approve this invocation's matching code in the extension within 120 seconds.
Review Doctor's actual Worker capabilities and blockers. Do not assume this checkout
updated a deployed Worker. If conditional creation is unavailable, testing stays
blocked; no deployment was authorized or performed by this implementation.

For Quick, stop/restart the Laboratory connection, keep only test-1-new selected,
and explicitly check separate laboratory write approval. A new approval generates
a fresh namespace, without touching the historical uncertain namespace. Run:

```bat
set "REDOWN_REPORT=%USERPROFILE%\Downloads\REDOWN-Quick-%RANDOM%-%RANDOM%.json"
.venv\Scripts\python.exe -m redown.lab complete --directory "C:\Users\jg202\Downloads\REDOWN-Samples-20261024-212219" --depth Quick --profile Balanced --report "%REDOWN_REPORT%"
echo %REDOWN_REPORT%
```

Approve the **new** matching Quick code. Every CLI invocation requires its own
approval, even with a connected GUI. Inventory/hash progress and testing summaries
appear in the right sidebar. Confirm actual inventory equals 2,221 files /
157,571,693 bytes; differences need investigation. Copy results includes safe codes,
counts, grouped problems and references. Local JSON contains complete evidence and
sensitive local metadata; preserve it privately. A final Markdown companion is saved.

Exit 1 means a failed/indeterminate case; exit 2 means incomplete acceptance without
those case outcomes. Neither indicates full acceptance. If pairing/auth interrupts,
keep the checkpoint and follow its original code. Do not rerun into the same prefix.
The historical uncertain-write namespace must remain untouched by this Quick test.
Read-only reconciliation is a separate explicitly approved procedure in
[the auth-recovery record](../../FOREVER_WORKS/bugs/FW-REDOWN-LAB-AUTH-RECOVERY-20261026.md).

After Quick is stable and its evidence reviewed, use a **fresh** write approval and:

```bat
set "REDOWN_REPORT=%USERPROFILE%\Downloads\REDOWN-Comprehensive-%RANDOM%-%RANDOM%.json"
.venv\Scripts\python.exe -m redown.lab complete --directory "C:\Users\jg202\Downloads\REDOWN-Samples-20261024-212219" --depth Comprehensive --profile Balanced --report "%REDOWN_REPORT%"
```

Comprehensive tests every eligible small file, not the excluded larger files.
No owner Windows installation, real Worker capability, real token lifecycle or live
corpus transfer has been verified by the implementation environment.

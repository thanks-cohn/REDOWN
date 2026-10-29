#!/usr/bin/env python3
"""REDOWN deterministic 500 MiB fixture generator. Standard library only."""
import argparse, csv, hashlib, json, random, struct, wave, io, zlib
from pathlib import Path

MIB = 1024 * 1024
SEED = 20261028

def write_blob(path, size, seed):
    path.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    with path.open("wb") as f:
        remaining = size
        while remaining:
            n = min(1024 * 1024, remaining)
            f.write(rng.randbytes(n))
            remaining -= n

def create(root, mode, size_mib):
    if root.exists():
        raise SystemExit("Refusing to overwrite existing directory: " + str(root))
    root.mkdir(parents=True)
    entries = []
    def add(rel, data):
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    for i in range(100):
        add(f"nested/group-{i%10:02d}/record-{i:03d}.txt",
            (f"REDOWN fixture {i}\nUnicode: café 日本語 ✅\n".encode() * (1 + i % 10)))
    add("data/sample.json", json.dumps({"fixture":"REDOWN","unicode":"café","items":list(range(50))},ensure_ascii=False).encode())
    add("data/sample.csv", ("id,name\n" + "".join(f"{i},record-{i}\n" for i in range(100))).encode())
    add("web/index.html", b"<!doctype html><html><title>REDOWN</title><body>Test</body></html>")
    add("web/icon.svg", b'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="blue"/></svg>')
    add("binary/empty.bin", b"")
    add("names/space in filename.txt", b"spaces")
    add("names/café-日本語.txt", "Unicode filename check".encode())
    add("documents/sample.pdf", b"%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n")
    (root / "empty-folder").mkdir()
    fixed = sum(p.stat().st_size for p in root.rglob("*") if p.is_file())
    total = size_mib * MIB
    if fixed > total:
        raise SystemExit("Requested corpus size is too small")
    remaining = total - fixed
    sizes = [180,130,100] if mode == "large" and remaining >= 410*MIB else ([50,40,30,20,10] if mode == "mixed" and remaining >= 150*MIB else [])
    for i, m in enumerate(sizes):
        n = m * MIB
        write_blob(root / f"payloads/blob-{i:03d}-{m}MiB.bin", n, SEED+i)
        remaining -= n
    # Numerous files for mixed operation testing, while preserving exact bytes.
    count = 30 if mode == "mixed" else 3
    base, extra = divmod(remaining, count)
    for i in range(count):
        n = base + (1 if i < extra else 0)
        write_blob(root / f"payloads/more-{i:03d}.bin", n, SEED+100+i)
    for p in sorted(root.rglob("*")):
        if p.is_file():
            h = hashlib.sha256()
            with p.open("rb") as f:
                for block in iter(lambda:f.read(MIB),b""):
                    h.update(block)
            entries.append({"path":p.relative_to(root).as_posix(),"bytes":p.stat().st_size,"sha256":h.hexdigest()})
    assert sum(x["bytes"] for x in entries) == total
    meta = {"corpus":"REDOWN","mode":mode,"target_mib_excluding_manifest":size_mib,"seed":SEED,"files":entries,"empty_directories":["empty-folder"]}
    (root/"MANIFEST.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding="utf-8")
    with (root/"MANIFEST.csv").open("w",encoding="utf-8-sig",newline="") as f:
        w = csv.DictWriter(f,fieldnames=["path","bytes","sha256"]);w.writeheader();w.writerows(entries)
    print(f"CREATED {root} | {len(entries)} files | {size_mib} MiB payload")

def verify(root):
    meta=json.loads((root/"MANIFEST.json").read_text(encoding="utf-8"))
    expected={x["path"] for x in meta["files"]}
    actual={p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file() and p.name not in ("MANIFEST.json","MANIFEST.csv")}
    if expected!=actual: raise SystemExit("FAIL: path list differs")
    for x in meta["files"]:
        p=root/x["path"];h=hashlib.sha256()
        with p.open("rb") as f:
            for b in iter(lambda:f.read(MIB),b""):h.update(b)
        if p.stat().st_size!=x["bytes"] or h.hexdigest()!=x["sha256"]:
            raise SystemExit("FAIL: "+x["path"])
    print("PASS:",len(expected),"files verified")

if __name__=="__main__":
    a=argparse.ArgumentParser();a.add_argument("--mode",choices=["mixed","large"],default="mixed")
    a.add_argument("--output",type=Path);a.add_argument("--size-mib",type=int,default=500)
    a.add_argument("--verify",type=Path);args=a.parse_args()
    if args.verify:verify(args.verify)
    elif args.output and args.size_mib>0:create(args.output,args.mode,args.size_mib)
    else:a.error("Supply --output or --verify")

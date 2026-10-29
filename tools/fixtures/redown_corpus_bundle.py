#!/usr/bin/env python3
"""Package and inspect REDOWN fixture ZIPs. Standard library only."""
import argparse, csv, hashlib, importlib.util, json, random, shutil, sys, zipfile
from collections import Counter
from pathlib import Path

MIB=1024*1024

def sha_stream(f):
    h=hashlib.sha256()
    for b in iter(lambda:f.read(MIB),b""):h.update(b)
    return h.hexdigest()

def inspect(zippath, report_dir=None, deep=False):
    with zipfile.ZipFile(zippath) as z:
        manifest=json.loads(z.read("MANIFEST.json"))
        records=manifest["files"]
        expected={x["path"]:x for x in records}
        actual={i.filename for i in z.infolist() if not i.is_dir()}-{"MANIFEST.json","MANIFEST.csv"}
        problems=[]
        if actual!=set(expected):
            problems.append("ZIP member list differs from manifest")
        for path in sorted(actual & set(expected)):
            info=z.getinfo(path)
            if info.file_size!=expected[path]["bytes"]:
                problems.append("Size mismatch: "+path)
        sample=sorted(actual & set(expected))
        if not deep and len(sample)>12:
            rng=random.Random(20261028)
            sample=sorted(set(sample[:3]+sample[-3:]+rng.sample(sample,6)))
        for path in (sorted(actual & set(expected)) if deep else sample):
            with z.open(path) as f: digest=sha_stream(f)
            if digest!=expected[path]["sha256"]:
                problems.append("SHA256 mismatch: "+path)
        total=sum(x["bytes"] for x in records)
        by_ext=Counter()
        for x in records:by_ext[Path(x["path"]).suffix.lower() or "(none)"]+=x["bytes"]
        summary={"status":"FAIL" if problems else "PASS","archive":str(zippath),
                 "archive_bytes":zippath.stat().st_size,"payload_bytes":total,
                 "file_count":len(records),"mode":manifest["mode"],"fully_verified":deep,
                 "hashes_checked":len(actual & set(expected)) if deep else len(sample),
                 "bytes_by_extension":dict(by_ext),
                 "largest_files":sorted(records,key=lambda x:-x["bytes"])[:20],
                 "problems":problems}
    if report_dir:
        report_dir.mkdir(parents=True,exist_ok=True)
        (report_dir/"SUMMARY.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
        with (report_dir/"FILES.csv").open("w",encoding="utf-8-sig",newline="") as f:
            w=csv.DictWriter(f,fieldnames=["path","bytes","sha256"]);w.writeheader();w.writerows(records)
        lines=[f"REDOWN FIXTURE: {summary['status']}",
               f"Archive: {zippath.name}",f"Payload: {total/MIB:.2f} MiB",
               f"Files: {len(records)}",f"Hashes checked: {summary['hashes_checked']}",
               f"Full verification: {deep}","", "Largest files:"]
        lines += [f"{x['bytes']/MIB:.2f} MiB  {x['path']}" for x in summary["largest_files"]]
        lines += ["","Problems:"]+(problems or ["None"])
        (report_dir/"README_REPORT.txt").write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(summary["status"],"|",len(records),"files |",f"{total/MIB:.2f} MiB payload")
    if problems:print("\n".join(problems));raise SystemExit(1)
    return summary

def build(output,mode,size,delete_unpacked):
    if output.exists() and any(output.iterdir()):
        raise SystemExit("Output directory not empty; use a fresh --out folder")
    output.mkdir(parents=True,exist_ok=True)
    generator=Path(__file__).with_name("redown_test_corpus.py")
    spec=importlib.util.spec_from_file_location("redown_test_corpus",generator)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    root=output/f"REDOWN-{mode}-{size}MiB"
    zippath=output/f"REDOWN-{mode}-{size}MiB.zip"
    module.create(root,mode,size)
    module.verify(root)
    manifest=json.loads((root/"MANIFEST.json").read_text(encoding="utf-8"))
    try:
        with zipfile.ZipFile(zippath,"w",compression=zipfile.ZIP_STORED,allowZip64=True) as z:
            for x in manifest["files"]:z.write(root/x["path"],arcname=x["path"])
            z.write(root/"MANIFEST.json",arcname="MANIFEST.json")
            z.write(root/"MANIFEST.csv",arcname="MANIFEST.csv")
        inspect(zippath,output/f"REDOWN-{mode}-{size}MiB-REPORT",deep=True)
        if delete_unpacked:
            shutil.rmtree(root)
            print("Removed unpacked corpus after verification")
    except BaseException:
        if zippath.exists():zippath.unlink()
        raise
    print("ZIP:",zippath)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="action",required=True)
    b=sub.add_parser("build");b.add_argument("--out",type=Path,required=True)
    b.add_argument("--mode",choices=["mixed","large"],default="mixed")
    b.add_argument("--size-mib",type=int,default=500)
    b.add_argument("--delete-unpacked",action="store_true")
    i=sub.add_parser("inspect");i.add_argument("--zip",type=Path,required=True)
    i.add_argument("--report-dir",type=Path);i.add_argument("--deep",action="store_true")
    args=p.parse_args()
    if args.action=="build":build(args.out,args.mode,args.size_mib,args.delete_unpacked)
    else:inspect(args.zip,args.report_dir,args.deep)

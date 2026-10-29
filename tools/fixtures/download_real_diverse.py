#!/usr/bin/env python3
"""REDOWN: download a diverse additional real-format fixture set.
Standard library only. Does not make a ZIP. Files remain individually accessible.
"""
import argparse,csv,hashlib,json,shutil,urllib.request
from pathlib import Path
from collections import Counter,defaultdict
MIB=1024*1024
CATALOG="https://loremfile.dev/manifest.json"
GROUPS={
"image":"jpg jpeg png gif webp tiff tif bmp heic avif ico svg apng",
"document":"pdf doc docx xls xlsx ppt pptx rtf txt md epub odt ods odp",
"data":"csv json ndjson xml yaml yml parquet sqlite db sql geojson avro",
"archive":"zip tar gz bz2 7z xz zst rar",
"audio":"mp3 wav flac ogg opus m4a aac aiff",
"video":"mp4 mov webm mkv avi ogv ts",
"web":"html css js wasm",
"misc":"eml mbox ics vcf ipynb ttf otf woff woff2 srt vtt toml ini log har gpx kml kmz"}
GROUPS={k:set(v.split()) for k,v in GROUPS.items()}
def group(fmt):
    return next((key for key,values in GROUPS.items() if fmt in values),"other")
def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda:f.read(MIB),b""):h.update(b)
    return h.hexdigest()
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root",type=Path,required=True)
    parser.add_argument("--target-mib",type=int,default=200)
    parser.add_argument("--min-free-mib",type=int,default=512)
    a=parser.parse_args()
    root=a.root.resolve();root.mkdir(parents=True,exist_ok=True)
    out=root/"EXTRA_200_MIB";out.mkdir(exist_ok=True)
    oldpaths=set();oldhashes=set()
    for manifest in root.rglob("FILES.csv"):
        if out in manifest.parents:continue
        with manifest.open(encoding="utf-8-sig",newline="") as f:
            for x in csv.DictReader(f):
                oldpaths.add(x.get("path","").lower().replace("\\","/"))
                oldhashes.add(x.get("sha256","").lower())
    with urllib.request.urlopen(CATALOG,timeout=30) as r:
        catalog=json.load(r)["fixtures"]
    choices=[]
    for item in catalog:
        rel=str(item.get("path","")).replace("\\","/")
        fmt=str(item.get("format","")).lower().lstrip(".")
        sz=item.get("bytes")
        if not rel or rel.startswith("/") or ":" in rel or ".." in rel.split("/"):continue
        if (item.get("status")!="active" or item.get("deprecated") or item.get("edge_case")
           or not isinstance(sz,int) or sz<=0 or not item.get("sha256") or not item.get("url")):continue
        if rel.lower() in oldpaths or item["sha256"].lower() in oldhashes:continue
        choices.append((group(fmt),fmt,sz,rel,item))
    # Choose one of each format first, then round robin to keep diversity high.
    buckets=defaultdict(list)
    for row in choices:buckets[row[1]].append(row)
    for values in buckets.values():values.sort(key=lambda r:r[2])
    selected=[]; used_formats=Counter();used_groups=Counter();selected_paths=set();planned=0
    target=a.target_mib*MIB
    while planned<target:
        available=[next((x for x in rows if x[3] not in selected_paths),None) for rows in buckets.values()]
        available=[x for x in available if x]
        if not available:break
        remain=target-planned
        available.sort(key=lambda x:(used_formats[x[1]],used_groups[x[0]],x[2]>remain,
                                     abs(x[2]-remain)))
        row=available[0];selected.append(row);selected_paths.add(row[3])
        used_formats[row[1]]+=1;used_groups[row[0]]+=1;planned+=row[2]
    print(f"PLANNED: {len(selected)} files, {len(used_formats)} formats, {planned/MIB:.2f} MiB")
    records=[];failures=[]
    for cat,fmt,size,rel,item in selected:
        dest=(out/rel).resolve()
        if not dest.is_relative_to(out.resolve()):
            failures.append((rel,"unsafe target"));continue
        try:
            if not(dest.exists() and dest.stat().st_size==size and digest(dest)==item["sha256"].lower()):
                if shutil.disk_usage(out).free < size+a.min_free_mib*MIB:
                    failures.append((rel,"insufficient free disk space"));continue
                dest.parent.mkdir(parents=True,exist_ok=True)
                temp=dest.with_name(dest.name+".part")
                try:
                    if temp.exists():temp.unlink()
                    with urllib.request.urlopen(item["url"],timeout=90) as src,temp.open("wb") as f:
                        while True:
                            chunk=src.read(MIB)
                            if not chunk:break
                            f.write(chunk)
                    if temp.stat().st_size!=size or digest(temp)!=item["sha256"].lower():
                        raise ValueError("source size or SHA-256 mismatch")
                    temp.replace(dest)
                finally:
                    if temp.exists():temp.unlink()
            records.append(dict(path=rel,category=cat,format=fmt,bytes=size,
                                sha256=item["sha256"].lower(),source=item["url"]))
            print("PASS",fmt,rel)
        except Exception as exc:
            failures.append((rel,str(exc)));print("FAIL",rel,str(exc))
    with (out/"FILES.csv").open("w",newline="",encoding="utf-8-sig") as f:
        writer=csv.DictWriter(f,fieldnames=["path","category","format","bytes","sha256","source"])
        writer.writeheader();writer.writerows(records)
    total=sum(r["bytes"] for r in records)
    summary=dict(target_mib=a.target_mib,verified_mib=round(total/MIB,2),
                 verified_files=len(records),formats=sorted({r["format"] for r in records}),
                 category_counts=dict(Counter(r["category"] for r in records)),
                 reached_target=total>=target,failures=[dict(path=p,error=e) for p,e in failures],
                 repository_note="Local real-file fixtures; no ZIP generated.")
    (out/"SUMMARY.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print("RESULT",json.dumps({k:summary[k] for k in ("verified_mib","verified_files","reached_target")}))
    if total<target:raise SystemExit("TARGET NOT MET: inspect SUMMARY.json; source may lack enough diverse data")
if __name__=="__main__":main()

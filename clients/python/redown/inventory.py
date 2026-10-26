"""Deterministic, bounded, read-only local fixture inventory. No media decoding claim."""
import hashlib
import os
import stat
from pathlib import Path


def inventory(directory, *, per_extension=5, max_files=100000, max_file_bytes=1024**3,
              max_total_bytes=4*1024**3, cancel=None, buffer_bytes=1024*1024):
    if (per_extension is not None and not 1 <= per_extension <= 5) or min(max_files, max_file_bytes, max_total_bytes, buffer_bytes) < 1:
        raise ValueError('Invalid scan limits')
    root = Path(directory).resolve(strict=True)
    if not root.is_dir():
        raise ValueError('Choose a directory')
    files, exclusions, groups = [], [], {}
    total = 0
    stopped = False
    entries = 0
    discovered_files = 0; discovered_bytes = 0
    def linked(p):
        return p.is_symlink() or bool(getattr(p.lstat(), "st_file_attributes", 0) & 0x400)
    def exclude(path, reason):
        exclusions.append({'relpath': path, 'reason': reason})
    def walk_error(error):
        exclude(os.path.relpath(error.filename, root), 'INACCESSIBLE_DIRECTORY')
    for current, dirs, names in os.walk(root, followlinks=False, onerror=walk_error):
        dirs.sort(); names.sort()
        entries += len(dirs) + len(names)
        if entries > max_files:
            exclude(Path(current).relative_to(root).as_posix(), 'SCAN_ENTRY_LIMIT_REMAINDER_NOT_SCANNED')
            stopped = True; break
        for name in list(dirs):
            p = Path(current) / name
            try:
                unsafe = linked(p) or not p.resolve().is_relative_to(root)
            except OSError:
                unsafe = True
            if unsafe:
                dirs.remove(name); exclude(p.relative_to(root).as_posix(), 'LINK_OR_JUNCTION_OR_INACCESSIBLE')
        for name in names:
            if cancel and cancel.is_set():
                stopped = True; break
            p = Path(current) / name
            rel = p.relative_to(root).as_posix()
            if len(files) + len(exclusions) >= max_files:
                exclude(rel, 'SCAN_ENTRY_LIMIT_REMAINDER_NOT_SCANNED'); stopped = True; break
            try:
                if not p.resolve().is_relative_to(root):
                    exclude(rel, 'OUTSIDE_ROOT'); continue
                before = p.lstat()
                if not stat.S_ISREG(before.st_mode) or linked(p):
                    exclude(rel, 'LINK_OR_NONREGULAR'); continue
                discovered_files += 1; discovered_bytes += before.st_size
                if before.st_size > max_file_bytes or total + before.st_size > max_total_bytes:
                    exclude(rel, 'FILE_BYTE_LIMIT' if before.st_size > max_file_bytes else 'TOTAL_HASH_BYTE_LIMIT'); continue
                digest = hashlib.sha256(); count = 0; signature = b""
                # O_NOFOLLOW where available, plus inode/mtime checks to detect replacements.
                fd = os.open(p, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_BINARY', 0))
                with os.fdopen(fd, 'rb') as stream:
                    opened = os.fstat(stream.fileno())
                    if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
                        raise OSError('changed')
                    while True:
                        if cancel and cancel.is_set():
                            stopped = True
                            raise OSError('cancelled')
                        chunk = stream.read(min(buffer_bytes, max_file_bytes-count+1, max_total_bytes-total-count+1))
                        if not chunk: break
                        if not signature: signature = chunk[:32]
                        count += len(chunk)
                        if count > max_file_bytes or total + count > max_total_bytes:
                            raise OSError('limit or change')
                        digest.update(chunk)
                    after = p.stat(follow_symlinks=False)
                    if (before.st_size, before.st_mtime_ns, before.st_ino) != (after.st_size, after.st_mtime_ns, after.st_ino) or count != before.st_size:
                        raise OSError('changed')
                total += count
                suffix = p.suffix
                row = {'relpath': rel, 'extension': suffix.lower() or '[none]', 'originalExtension': suffix,
                       'caseNormalized': suffix != suffix.lower(), 'bytes': count, 'sha256': digest.hexdigest(),
                       'mediaValidation': 'NOT_TESTED', 'zeroBytes': count == 0, 'sparse': bool(count and hasattr(before, 'st_blocks') and before.st_blocks*512 < count), 'depth': len(p.relative_to(root).parts)-1}
                if per_extension is None:
                    known = [(b'\x89PNG\r\n\x1a\n','png'),(b'\xff\xd8\xff','jpeg'),(b'GIF8','gif'),(b'%PDF-','pdf'),(b'PK\x03\x04','zip'),(b'\x1f\x8b','gzip'),(b'RIFF','riff')]
                    row.update(formatHint=next((name for magic,name in known if signature.startswith(magic)), 'unknown'), unicodeName=not rel.isascii(), unusualName=any(c in rel for c in ' #?%'), streamingCandidate=count>65536, multipartCandidate=count>=64*1024**2)
                files.append(row); groups.setdefault(row['extension'], []).append(row)
            except OSError:
                exclude(rel, 'UNREADABLE_OR_CHANGED')
        if stopped: break
    folded = {}
    for row in files: folded.setdefault(row['relpath'].casefold(), []).append(row['relpath'])
    collisions = [paths for paths in folded.values() if len(paths) > 1]
    if per_extension is None:
        duplicates = {}
        for row in files: duplicates.setdefault(row['sha256'], []).append(row['relpath'])
        return {'version':'2.0.0','root':str(root),'discoveredFiles':discovered_files,'discoveredBytes':discovered_bytes,'complete':not stopped,'hashedFiles':len(files),'hashedBytes':total,'selectedBytes':total,'selected':files,'countsByExtension':{ext:{'eligible':len(rows),'selected':len(rows)} for ext,rows in sorted(groups.items())},'exclusions':exclusions,'caseCollisions':collisions,'duplicates':[v for v in duplicates.values() if len(v)>1],'mediaValidation':'NOT_TESTED: signature hints do not establish validity or corruption','limits':{'maxEntries':max_files,'maxFileBytes':max_file_bytes,'maxTotalHashBytes':max_total_bytes,'bufferBytes':buffer_bytes}}
    selected = []
    for ext, rows in sorted(groups.items()):
        unique = {}
        for row in sorted(rows, key=lambda r: r['relpath']):
            if row['sha256'] in unique:
                exclude(row['relpath'], 'DUPLICATE_CONTENT_WITHIN_EXTENSION')
            else: unique[row['sha256']] = row
        ordered = sorted(unique.values(), key=lambda r: (r['bytes'], r['depth'], r['relpath']))
        # Quantiles cover both extremes and the interior; depth/path break ties deterministically.
        n = min(per_extension, len(ordered))
        indexes = {round(i*(len(ordered)-1)/(n-1)) for i in range(n)} if n > 1 else {len(ordered)//2}
        chosen = [ordered[i] for i in sorted(indexes)]
        selected.extend(chosen)
        for row in ordered:
            if row not in chosen: exclude(row['relpath'], 'PER_EXTENSION_LIMIT')
    return {'version': '1.0.0', 'limits': {'perExtension': per_extension, 'maxEntries': max_files,
            'maxFileBytes': max_file_bytes, 'maxTotalHashBytes': max_total_bytes},
            'complete': not stopped, 'hashedFiles': len(files), 'hashedBytes': total,
            'selectedBytes': sum(r['bytes'] for r in selected), 'selected': selected,
            'countsByExtension': {ext: {'eligible': len(rows), 'selected': sum(r['extension']==ext for r in selected)} for ext, rows in sorted(groups.items())},
            'exclusions': exclusions, 'caseCollisions': collisions, 'mediaValidation': 'NOT_TESTED: byte integrity does not establish format validity'}

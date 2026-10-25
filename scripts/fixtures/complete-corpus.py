"""Download distinct public fixture candidates; report gaps, never manufacture copies.

No provider credentials, package dependencies, execution, archive expansion or cloud writes.
Byte diversity does not prove format validity or redistribution rights.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

REPOS = ['apache/tika', 'gabriel-vasile/mimetype', 'python-pillow/Pillow',
         'strukturag/libheif', 'AOMediaCodec/libavif', 'libsndfile/libsndfile',
         'mozilla/pdf.js', 'mrdoob/three.js']
ADDITIONAL_REPOS = ['assimp/assimp', 'google/ExoPlayer', 'GNOME/gimp',
                    'ImageMagick/ImageMagick', 'numpy/numpy', 'apache/arrow-testing',
                    'fonttools/fonttools', 'wireshark/wireshark', 'tukaani-project/xz',
                    'FluidSynth/fluidsynth']
EXTRA = set('apng avifs blp bufr_d bw cur dcx dds dib emf eps exif fits flc fli fpx ftc ftu gbr gd ggr grb icc icns ico im im1 imt j2c j2k jfif jp2 jpc jpe jpeg jpf jxr lut mic mod mpo npy npz p7 pbm pcd pcf pcx pfm pgm pil pnm ppm psb pxr qoi ras rgb rle sgi spider tga tif tiff wal wdp wmf wmp xbm xpm txt csv json xml html bin'.split())
BAD = re.compile(r'(?:corrupt|malformed|invalid|truncat|decompression.?bomb|zipbomb|broken|badfile|fuzz)', re.I)
SAMPLE = re.compile(r'(?:^|/)(?:tests?|test[-_]?data|testing|fixtures|samples|examples|resources|images|data)(?:/|$)', re.I)
MAX_SAMPLE = 8_000_000
RESERVE = 5_000_000

def get(url, limit):
    request = urllib.request.Request(url, headers={'User-Agent': 'REDOWN-fixture-collector/1.0', 'Accept': 'application/vnd.github+json' if 'api.github.com/' in url else '*/*'})
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Response exceeds size limit')
    return data

def json_get(url):
    return json.loads(get(url, 25_000_000))

def candidates(repo):
    commit = json_get('https://api.github.com/repos/' + repo + '/commits?per_page=1')[0]['sha']
    tree = json_get('https://api.github.com/repos/' + repo + '/git/trees/' + commit + '?recursive=1')
    if tree.get('truncated'):
        print('  Note: GitHub returned a partial tree; coverage will remain partial.', flush=True)
    rows = []
    for item in tree.get('tree', []):
        path = item.get('path', '')
        if item.get('type') != 'blob' or not SAMPLE.search(path) or BAD.search(path) or not 0 <= item.get('size', MAX_SAMPLE + 1) <= MAX_SAMPLE:
            continue
        extension = Path(path).suffix.lower().lstrip('.')
        if not re.fullmatch('[a-z0-9_]{1,16}', extension):
            continue
        rows.append({**item, 'extension': extension, 'repo': repo, 'commit': commit,
                     'url': 'https://raw.githubusercontent.com/' + repo + '/' + commit + '/' + urllib.parse.quote(path, safe='/')})
    return sorted(rows, key=lambda row: (row['size'], row['path']))

def format_guard(extension, data):
    # .ts is also a source-code extension. Require repeated MPEG transport sync
    # bytes before counting it as a media candidate; this is not full decoding.
    if extension != 'ts':
        return True
    for stride, start in [(188, 0), (192, 4), (204, 0)]:
        if len(data) > start + 2 * stride and all(data[start + index * stride] == 0x47 for index in range(3)):
            return True
    return False

def file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def scan(root):
    catalog = root / 'blank-files-main/files/files.json'
    if not catalog.is_file():
        raise ValueError('Expected blank-files-main/files/files.json inside the selected existing collection')
    types = {row['type'].lower() for row in json.loads(catalog.read_text(encoding='utf-8'))['files']} | EXTRA
    folders = [root / 'blank-files-main/files', root / 'mimetype/mimetype-master/testdata',
               root / 'pillow/Pillow-main/Tests', root / 'additional-samples']
    known = {extension: set() for extension in types}
    manifest, excluded = [], []
    previous = root / 'corpus-files.json'
    previous_rows = json.loads(previous.read_text(encoding='utf-8')) if previous.is_file() and not previous.is_symlink() and previous.stat().st_size < RESERVE // 2 else []
    provenance = {(row.get('path'), row.get('sha256')): row for row in previous_rows if isinstance(row, dict)}
    for folder in folders:
        if not folder.is_dir():
            continue
        for path in sorted(folder.rglob('*')):
            if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(root) or path == catalog:
                continue
            extension = path.suffix.lower().lstrip('.')
            if extension not in known or BAD.search(path.relative_to(folder).as_posix()):
                continue
            if extension == 'ts':
                with path.open('rb') as stream:
                    is_media = format_guard(extension, stream.read(4096))
                if not is_media:
                    excluded.append({'path':path.relative_to(root).as_posix(), 'reason':'TS_TRANSPORT_SIGNATURE_NOT_CONFIRMED'})
                    continue
            digest = file_hash(path)
            if digest in known[extension]:
                continue
            known[extension].add(digest)
            relative = path.relative_to(root).as_posix()
            manifest.append(provenance.get((relative, digest), {'path': relative, 'extension': extension,
                             'bytes': path.stat().st_size, 'sha256': digest, 'source': 'existing-local-sample',
                             'formatValidation': 'unvalidated'}))
    # Extra extensions are targets only if there is at least one existing sample.
    catalog_types = {row['type'].lower() for row in json.loads(catalog.read_text(encoding='utf-8'))['files']}
    known = {extension: hashes for extension, hashes in known.items() if hashes or extension in catalog_types}
    return known, manifest, excluded

def collect(root, per_type=5, max_bytes=500_000_000, repositories=REPOS, candidate_reader=candidates, fetch=get):
    root = root.resolve(strict=True)
    if not root.is_dir() or root == Path(root.anchor):
        raise ValueError('Choose the existing sample collection directory')
    known, manifest, excluded = scan(root)
    used = sum(path.stat().st_size for path in root.rglob('*') if path.is_file() and not path.is_symlink())
    if used + RESERVE > max_bytes:
        raise ValueError('Existing collection is too close to the disk budget; nothing downloaded')
    output = root / 'additional-samples'
    if output.is_symlink():
        raise ValueError('Symlink output directory is not accepted')
    output.mkdir(exist_ok=True)
    errors, downloaded = [], 0
    for repo in repositories:
        missing = {extension for extension, hashes in known.items() if len(hashes) < per_type}
        if not missing or used + RESERVE >= max_bytes:
            break
        print('Looking for missing samples in ' + repo + ' ...', flush=True)
        try:
            rows = candidate_reader(repo)
        except Exception as error:
            errors.append({'repository': repo, 'error': type(error).__name__, 'httpStatus': getattr(error, 'code', None)})
            print('  Source unavailable; continuing with other sources.', flush=True)
            continue
        attempts = {}
        for row in rows:
            extension = row['extension']
            if extension not in missing or len(known[extension]) >= per_type or row['size'] + used + RESERVE > max_bytes:
                continue
            attempts[extension] = attempts.get(extension, 0) + 1
            if attempts[extension] > 30:
                continue
            try:
                data = fetch(row['url'], min(MAX_SAMPLE, max_bytes - used - RESERVE))
                if len(data) != row['size'] or hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() != row['sha']:
                    raise ValueError('Git blob verification failed')
                if not format_guard(extension, data):
                    continue
                if data.startswith(b'version https://git-lfs.github.com/spec/'):
                    continue
                digest = hashlib.sha256(data).hexdigest()
                if digest in known[extension]:
                    continue
                folder = output / extension
                if folder.is_symlink():
                    raise ValueError('Symlink target rejected')
                folder.mkdir(exist_ok=True)
                destination = folder / (digest + '.' + extension)
                with destination.open('xb') as stream:
                    stream.write(data)
                used += len(data)
                known[extension].add(digest)
                manifest.append({'path': destination.relative_to(root).as_posix(), 'extension': extension,
                                 'bytes': len(data), 'sha256': digest, 'source': row['url'],
                                 'repository': repo, 'commit': row['commit'], 'gitBlobSha': row['sha'],
                                 'formatValidation': 'unvalidated', 'redistributionRights': 'review-source-before-publishing'})
                downloaded += 1
                print('  .' + extension + ': ' + str(min(len(known[extension]), per_type)) + '/' + str(per_type), flush=True)
            except Exception as error:
                errors.append({'repository': repo, 'path': row['path'], 'error': type(error).__name__, 'httpStatus': getattr(error, 'code', None)})
    coverage = [{'extension': extension, 'distinctSamples': len(hashes), 'target': per_type,
                 'missing': max(0, per_type - len(hashes))} for extension, hashes in sorted(known.items())]
    gaps = [row for row in coverage if row['missing']]
    report = {'status': 'INCOMPLETE' if gaps else 'COUNT_TARGET_REACHED_UNVALIDATED', 'targetPerFormat': per_type,
              'downloadedFiles': downloaded, 'maxBytes': max_bytes, 'fileBytesBeforeReports': used,
              'formatValidation': 'Not established by extensions, distinct hashes or repository origin',
              'publication': 'Keep upstream notices and review per-fixture rights before website redistribution',
              'sourcesSearched': list(repositories), 'coverage': coverage, 'gaps': gaps, 'errors': errors, 'excludedExistingSamples': excluded}
    for name, value in [('corpus-coverage.json', report), ('corpus-files.json', manifest)]:
        path = root / name
        if path.is_symlink():
            raise ValueError('Symlink report rejected')
        content = json.dumps(value, indent=2).encode('utf-8') + b'\n'
        if len(content) > RESERVE // 2:
            raise ValueError('Report budget exceeded')
        path.write_bytes(content)
    print('\nAdded ' + str(downloaded) + ' distinct files. Formats still short: ' + str(len(gaps)), flush=True)
    print('Coverage report: ' + str(root / 'corpus-coverage.json'), flush=True)
    print('Checksum/source manifest: ' + str(root / 'corpus-files.json'), flush=True)
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--folder', required=True)
    parser.add_argument('--additional-sources', action='store_true', help='Search ten additional source pools without repeating the first pass')
    parser.add_argument('--per-type', type=int, default=5, choices=range(1, 11))
    parser.add_argument('--max-mb', type=int, default=500, choices=range(20, 501))
    args = parser.parse_args()
    try:
        report = collect(Path(args.folder), args.per_type, args.max_mb * 1_000_000, repositories=ADDITIONAL_REPOS if args.additional_sources else REPOS)
    except Exception as error:
        print('Stopped: ' + str(error), file=sys.stderr)
        return 2
    return 1 if report['gaps'] else 0

if __name__ == '__main__':
    raise SystemExit(main())

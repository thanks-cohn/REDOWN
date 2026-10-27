"""Compare a bounded local inventory with an untrusted SHA-256 manifest.

Only the manifest itself and explicitly named artifacts are exempt from the payload
set. No filename glob, extension, or generator claim establishes an exemption.
"""
import json
import re
from pathlib import Path, PurePosixPath

MAX_MANIFEST_BYTES = 8 * 1024 * 1024


def relative_name(value):
    if not isinstance(value, str) or not value or '\\' in value or ':' in value or '\x00' in value:
        raise ValueError('INVALID_MANIFEST_PATH')
    path = PurePosixPath(value)
    if path.is_absolute() or any(p in ('', '.', '..') for p in value.split('/')):
        raise ValueError('INVALID_MANIFEST_PATH')
    return value


def unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError('DUPLICATE_JSON_KEY')
        value[key] = item
    return value


def compare(scan, manifest='manifest.json', artifacts=(), required=False):
    root = Path(scan['root'])
    result = dict(status='NOT_TESTED', manifest=manifest, cases=[], artifacts=[],
                  verification='Independent inventory SHA-256; no media validity claim')
    try:
        name = relative_name(manifest)
        artifact_names = {relative_name(p) for p in artifacts}
        if name in artifact_names:
            raise ValueError('MANIFEST_ARTIFACT_CONFLICT')
        path = root / name
        if not path.exists() and not path.is_symlink():
            result.update(status='FAIL' if required else 'NOT_TESTED', code='MANIFEST_MISSING')
            return result
        # Inventory has already rejected links, junctions, changes and byte-limit exclusions.
        observed = {r['relpath']: r for r in scan['selected']}
        if name not in observed or observed[name]['bytes'] > MAX_MANIFEST_BYTES:
            raise ValueError('MANIFEST_UNREADABLE_OR_LIMITED')
        with path.open('rb') as stream:
            content = stream.read(MAX_MANIFEST_BYTES + 1)
        import hashlib
        if hashlib.sha256(content).hexdigest() != observed[name]['sha256']:
            raise ValueError('MANIFEST_CHANGED')
        document = json.loads(content.decode('utf-8-sig'), object_pairs_hook=unique_object)
        rows = document.get('files') if isinstance(document, dict) else document
        if not isinstance(rows, list) or not rows:
            raise ValueError('UNSUPPORTED_MANIFEST_SCHEMA')
        expected = {}
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError('UNSUPPORTED_MANIFEST_SCHEMA')
            names = [row[k] for k in ('path', 'relpath', 'name') if k in row]
            sizes = [row[k] for k in ('bytes', 'size') if k in row]
            if len(names) != 1 or len(sizes) != 1:
                raise ValueError('AMBIGUOUS_MANIFEST_ROW')
            rel = relative_name(names[0]); size = sizes[0]; digest = row.get('sha256')
            if rel in expected or rel == name or rel in artifact_names:
                raise ValueError('DUPLICATE_OR_CONFLICTING_MANIFEST_PATH')
            if type(size) is not int or size < 0 or not isinstance(digest, str) or not re.fullmatch('[a-fA-F0-9]{64}', digest):
                raise ValueError('INVALID_MANIFEST_SIZE_OR_HASH')
            expected[rel] = dict(bytes=size, sha256=digest.lower())
        excluded = {r['relpath']: r['reason'] for r in scan['exclusions']}
        for rel, target in sorted(expected.items()):
            actual = observed.get(rel)
            state = 'NOT_TESTED' if rel in excluded else 'FAIL' if actual is None else 'PASS' if all(actual[k] == target[k] for k in target) else 'FAIL'
            code = excluded.get(rel) or ('MISSING_PAYLOAD' if actual is None else 'MATCH' if state == 'PASS' else 'SIZE_OR_HASH_MISMATCH')
            result['cases'].append(dict(path=rel, status=state, code=code, expected=target,
                                        actual={k: actual[k] for k in target} if actual else None))
        for rel, actual in sorted(observed.items()):
            if rel in expected:
                continue
            classification = 'MANIFEST' if rel == name else 'DECLARED_ARTIFACT' if rel in artifact_names else 'UNEXPECTED'
            item = dict(path=rel, classification=classification, bytes=actual['bytes'], sha256=actual['sha256'])
            result['artifacts'].append(item)
            if classification == 'UNEXPECTED':
                result['cases'].append(dict(path=rel, status='FAIL', code='UNEXPECTED_FILE'))
        for rel in sorted(artifact_names - observed.keys()):
            result['cases'].append(dict(path=rel, status='NOT_TESTED' if rel in excluded else 'FAIL', code='DECLARED_ARTIFACT_UNAVAILABLE'))
        result.update(expectedFiles=len(expected), expectedBytes=sum(r['bytes'] for r in expected.values()),
                      verifiedFiles=sum(c['status'] == 'PASS' for c in result['cases']),
                      status='FAIL' if any(c['status'] == 'FAIL' for c in result['cases']) else 'INCOMPLETE' if not scan['complete'] or scan['exclusions'] or any(c['status'] != 'PASS' for c in result['cases']) else 'PASS')
    except (OSError, ValueError, UnicodeError, RecursionError) as error:
        result.update(status='FAIL', code=str(error) if isinstance(error, ValueError) and re.fullmatch('[A-Z_]+', str(error)) else 'INVALID_OR_UNREADABLE_MANIFEST')
    return result

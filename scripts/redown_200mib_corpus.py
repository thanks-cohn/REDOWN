#!/usr/bin/env python3
"""Create 200 MiB of genuine-format transfer fixtures and independent SHA-256 manifest.
Standard library only. Local-only. Does not invoke REDOWN or cloud storage.
"""
import csv
import hashlib
import json
import pathlib
import random
import struct
import wave
import zipfile
import zlib

MIB = 1024 * 1024
TARGET = 200 * MIB
ROOT = pathlib.Path.home() / 'Downloads' / 'REDOWN-Large-200MiB'
if ROOT.exists() and any(ROOT.iterdir()):
    raise SystemExit(f'ABORT: folder already has files, nothing overwritten: {ROOT}')
ROOT.mkdir(parents=True, exist_ok=True)
rng = random.Random(20261026)

def write_noise(stream, count):
    while count:
        n = min(count, 65536)
        stream.write(rng.randbytes(n))
        count -= n

# ZIP archive: real ZIP container, 50 MiB random entry.
with zipfile.ZipFile(ROOT / 'archive-large.zip', 'w', allowZip64=True) as z:
    with z.open('data.bin', 'w', force_zip64=True) as f:
        write_noise(f, 50 * MIB)

# WAV: real 16-bit stereo PCM.
with wave.open(str(ROOT / 'audio-large.wav'), 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(44100)
    # 30 MiB sample payload, using frames aligned to stereo sample width.
    remaining = 30 * MIB
    while remaining:
        n = min(remaining, 65536)
        f.writeframesraw(rng.randbytes(n))
        remaining -= n

# BMP: true 24-bit uncompressed image, 4096*2048*3 = 24 MiB pixels.
w, h = 4096, 2048
pixels = w * h * 3
with (ROOT / 'image-large.bmp').open('wb') as f:
    f.write(b'BM' + struct.pack('<IHHI', 54 + pixels, 0, 0, 54))
    f.write(struct.pack('<IiiHHIIiiII', 40, w, h, 1, 24, 0, pixels, 2835, 2835, 0, 0))
    write_noise(f, pixels)

# PNG: correct signature, IHDR, streaming IDAT chunks, CRC, IEND.
w, h = 2048, 2730
with (ROOT / 'image-large.png').open('wb') as f:
    f.write(b'\x89PNG\r\n\x1a\n')
    def chunk(kind, data):
        f.write(struct.pack('>I', len(data)))
        f.write(kind)
        f.write(data)
        f.write(struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff))
    chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    comp = zlib.compressobj(level=0)
    pending = bytearray()
    for _ in range(h):
        pending.extend(comp.compress(b'\x00' + rng.randbytes(w * 3)))
        if len(pending) >= 131072:
            chunk(b'IDAT', bytes(pending))
            pending.clear()
    pending.extend(comp.flush())
    if pending:
        chunk(b'IDAT', bytes(pending))
    chunk(b'IEND', b'')

# Machine-readable CSV and JSON. Large and small files test ordinary workloads.
with (ROOT / 'records-large.csv').open('w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['row', 'name', 'checksum_like_data'])
    i = 0
    while f.tell() < 30 * MIB:
        writer.writerow([i, f'item-{i}', f'{rng.getrandbits(256):064x}'])
        i += 1
with (ROOT / 'records-large.json').open('w', encoding='utf-8') as f:
    f.write('{"records":[')
    i = 0
    while f.tell() < 20 * MIB:
        if i:
            f.write(',')
        json.dump({'id': i, 'value': f'{rng.getrandbits(256):064x}'}, f, separators=(',', ':'))
        i += 1
    f.write(']}')
with (ROOT / 'notes-üñíçødé.txt').open('wb') as f:
    line = 'REDOWN Unicode name / ordinary UTF-8 contents: naïve café.\n'.encode('utf-8')
    remaining = 10 * MIB
    while remaining:
        piece = line[:min(len(line), remaining)]
        f.write(piece)
        remaining -= len(piece)

# Useful exact boundary cases, small enough for the current 65,536-byte transport.
for name, size in [('boundary-65535.bin', 65535), ('boundary-65536.bin', 65536),
                   ('boundary-65537.bin', 65537), ('tiny-4k.bin', 4096)]:
    with (ROOT / name).open('wb') as f:
        write_noise(f, size)

payloads = sorted(p for p in ROOT.iterdir() if p.is_file())
used = sum(p.stat().st_size for p in payloads)
if used > TARGET:
    raise SystemExit(f'ABORT: inputs total {used} bytes > 200 MiB')
# Padding is real text, not mislabeled as video/photo, and makes exact 200 MiB.
with (ROOT / 'additional-notes.txt').open('wb') as f:
    text = b'REDOWN repeatable transfer test notes.\n'
    remaining = TARGET - used
    block = text * 1024
    while remaining >= len(block):
        f.write(block)
        remaining -= len(block)
    if remaining:
        f.write((text * (remaining // len(text) + 1))[:remaining])

payloads = sorted(p for p in ROOT.iterdir() if p.is_file())
manifest = {'schema': 'redown.test-corpus.v1', 'sizeBytes': TARGET,
            'generator': 'standard-library-only', 'files': []}
for p in payloads:
    digest = hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda: f.read(65536), b''):
            digest.update(part)
    manifest['files'].append({'name': p.name, 'bytes': p.stat().st_size,
                              'sha256': digest.hexdigest()})
assert sum(f['bytes'] for f in manifest['files']) == TARGET
(ROOT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print('Created:', ROOT)
print('Payload:', TARGET, 'bytes (200 MiB), excluding manifest')
for item in manifest['files']:
    print(f"{item['bytes']:>11}  {item['name']}")
print('SHA-256 manifest:', ROOT / 'manifest.json')
print('No cloud actions were performed.')

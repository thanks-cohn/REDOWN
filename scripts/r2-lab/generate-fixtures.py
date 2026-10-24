"""Reproducible CC0 synthetic corpus. No downloaded or relicensed third-party content."""
from pathlib import Path
import hashlib, io, json, struct, wave, zipfile, zlib
p = Path(__file__).resolve().parents[2] / 'test-fixtures/r2-lab'
p.mkdir(parents=True, exist_ok=True)
files = {'empty.bin': b'', 'unicode.txt': 'Hello, 世界 🌍\nNFC: é; NFD: e\u0301\n'.encode(), 'data.json': b'{"fixture":true,"items":[0,1,"test"]}\n', 'table.csv': b'name,value\nalpha,1\nbeta,2\n', 'shape.svg': b'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="red"/></svg>', 'page.html': b'<!doctype html><title>REDOWN fixture</title><p>Public test data</p>', 'bytes.bin': bytes(range(256)) * 4}
def chunk(t, v):
    return struct.pack('>I', len(v)) + t + v + struct.pack('>I', zlib.crc32(t + v) & 0xffffffff)
files['pixel.png'] = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b'\0\xff\0\0')) + chunk(b'IEND', b'')
objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>', b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>', b'<< /Length 0 >>\nstream\n\nendstream']
pdf = b'%PDF-1.4\n'; offsets = [0]
for i, obj in enumerate(objects, 1):
    offsets.append(len(pdf)); pdf += str(i).encode() + b' 0 obj\n' + obj + b'\nendobj\n'
xref = len(pdf)
pdf += b'xref\n0 5\n0000000000 65535 f \n' + b''.join(f'{x:010d} 00000 n \n'.encode() for x in offsets[1:]) + f'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
files['page.pdf'] = pdf
out = io.BytesIO()
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(b'\0\0' * 80)
files['silence.wav'] = out.getvalue(); out = io.BytesIO()
with zipfile.ZipFile(out, 'w') as z:
    z.writestr(zipfile.ZipInfo('fixture.txt', (2020, 1, 1, 0, 0, 0)), b'CC0 deterministic fixture\n')
files['archive.zip'] = out.getvalue()
for name, data in files.items():
    (p / name).write_bytes(data)
manifest = {'version': '1.0.0', 'license': 'CC0-1.0', 'generator': 'scripts/r2-lab/generate-fixtures.py', 'fixtures': [{'name': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in sorted(files.items())]}
(p / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

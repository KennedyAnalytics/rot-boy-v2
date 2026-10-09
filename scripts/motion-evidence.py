"""Ordered before/after frame strips of each causal moment, from the actual MP4s.

    python scripts/motion-evidence.py <candidate.mp4> <baseline.mp4> <moments.json>

Each strip is two rows at 330px phone width: BEFORE (baseline) above AFTER
(candidate), same timestamps. Stills cannot establish motion quality alone;
dense ordered sequences are the closest image-input evidence available.
"""
import json, pathlib, subprocess, sys, hashlib
from PIL import Image, ImageDraw, ImageFont

candidate = pathlib.Path(sys.argv[1])
baseline = pathlib.Path(sys.argv[2])
moments = json.loads(pathlib.Path(sys.argv[3]).read_text(encoding='utf-8'))
out = candidate.parent / 'evidence' / 'motion-sequences'
out.mkdir(parents=True, exist_ok=True)
W = 330
H = int(W * 1920 / 1080)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
big = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 22)

def frame(video, t, target):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{t:.3f}', '-i', str(video), '-frames:v', '1', '-vf', f'scale={W}:-1', str(target)], check=True)

manifest = []
for m in moments:
    n = m.get('frames', 6)
    times = [round((m['start'] + (m['end'] - m['start']) * i / (n - 1)) * 30) / 30 for i in range(n)]
    sheet = Image.new('RGB', (n * W, 2 * (H + 30) + 36), '#f3f0e6')
    d = ImageDraw.Draw(sheet)
    d.text((8, 6), f"{m['name']}: {m['what']}", font=big, fill='#1c212b')
    for col, t in enumerate(times):
        for row, (kind, video) in enumerate([('BEFORE', baseline), ('AFTER', candidate)]):
            tmp = out / f"_{kind}-{col}.png"
            frame(video, t, tmp)
            im = Image.open(tmp).convert('RGB')
            y = 36 + row * (H + 30)
            sheet.paste(im, (col * W, y + 28))
            d.text((col * W + 6, y + 6), f'{kind} {t:.2f}s', font=font, fill='#e25b3a' if kind == 'AFTER' else '#1c212b')
            tmp.unlink()
    file = out / f"{m['name']}.png"
    sheet.save(file)
    manifest.append({**m, 'times': times, 'file': file.name})
(out / 'manifest.json').write_text(json.dumps({'candidate': str(candidate.resolve()), 'baseline': str(baseline.resolve()), 'candidateSha256': hashlib.sha256(candidate.read_bytes()).hexdigest(), 'baselineSha256': hashlib.sha256(baseline.read_bytes()).hexdigest(), 'phoneWidth': W, 'moments': manifest}, indent=2), encoding='utf-8')
print(f'{len(manifest)} motion sequences in {out}')

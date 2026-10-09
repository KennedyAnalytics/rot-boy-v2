"""Phone-scale evidence for any directed film, from the actual MP4 and props.

    python scripts/film-evidence.py <film.mp4> <props.json> [--before <other.mp4>]

Writes <film dir>/evidence/:
  hook-0-3s.png          frames every 0.25 s for the first 3 s (330 px)
  first-30s.png          frames every 2.5 s for the first 30 s
  chapter-NN.png         8 ordered frames per chapter, with timestamps
  contact-NN.png         one frame every 4 s across the film
  inspection-targets.json  shot/event times with heard narration and forbidden later states
  manifest.json
With --before, every strip is two rows: BEFORE above AFTER at identical times.
"""
import json, pathlib, subprocess, sys, hashlib, math
from PIL import Image, ImageDraw, ImageFont

video = pathlib.Path(sys.argv[1])
props = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding='utf-8'))
before = pathlib.Path(sys.argv[sys.argv.index('--before') + 1]) if '--before' in sys.argv else None
out = video.parent / 'evidence'
out.mkdir(parents=True, exist_ok=True)
W = 330
H = int(W * 1920 / 1080)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
big = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 21)
plan = props['plan']
duration = plan['durationSec']
words = props['words']
tmp = out / '_tmp.png'

def grab(src, t):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{max(0, t):.3f}', '-i', str(src), '-frames:v', '1', '-vf', f'scale={W}:-1', str(tmp)], check=True)
    return Image.open(tmp).convert('RGB')

def strip(name, title, times, cols=None):
    cols = cols or len(times)
    rows_per = 2 if before else 1
    lines = math.ceil(len(times) / cols)
    sheet = Image.new('RGB', (cols * W, 34 + lines * rows_per * (H + 26)), '#f3f0e6')
    d = ImageDraw.Draw(sheet)
    d.text((8, 6), title, font=big, fill='#1c212b')
    for i, t in enumerate(times):
        col, line = i % cols, i // cols
        for r, (kind, src) in enumerate(([('BEFORE', before)] if before else []) + [('AFTER' if before else '', video)]):
            y = 34 + (line * rows_per + r) * (H + 26)
            sheet.paste(grab(src, t), (col * W, y + 24))
            d.text((col * W + 6, y + 4), f'{kind} {t:.2f}s'.strip(), font=font, fill='#e25b3a' if kind == 'AFTER' else '#1c212b')
    sheet.save(out / f'{name}.png')
    return name

made = []
made.append(strip('hook-0-3s', 'First 3 seconds (every 0.25 s)', [i * 0.25 for i in range(13)], cols=7))
made.append(strip('first-30s', 'First 30 seconds (every 2.5 s)', [i * 2.5 for i in range(13)], cols=7))
for n, ch in enumerate(plan['chapters']):
    s, e = ch['start'], (plan['chapters'][n + 1]['start'] if n + 1 < len(plan['chapters']) else duration)
    times = [s + (e - s) * (k + 0.5) / 8 for k in range(8)]
    made.append(strip(f'chapter-{n + 1:02d}', f"Chapter {n + 1}: {ch['name']} ({s:.1f}-{e:.1f}s)", times, cols=8))
contact = [t for t in [i * 4.0 for i in range(int(duration // 4) + 1)] if t < duration]
for k in range(0, len(contact), 12):
    made.append(strip(f'contact-{k // 12 + 1:02d}', f'Contact sheet {k // 12 + 1}', contact[k:k + 12], cols=6))

# Inspection targets from this film's own direction.
direction = plan.get('direction') or {}
targets = []
def heard(t):
    return ' '.join(w['text'] for w in words if w['start'] <= t)[-1200:]
audit_path = video.parent / 'motion-audit.json'
events = json.loads(audit_path.read_text(encoding='utf-8'))['events'] if audit_path.exists() else []
shots = json.loads(audit_path.read_text(encoding='utf-8')).get('shots', []) if audit_path.exists() else []
times = set()
for e in events:
    if e['mode'] == 'actual':
        times.add(round((e['land'] + 0.35) * 30) / 30)
for t in sorted(times):
    if t >= duration:
        continue
    established = {e['state'] for e in events if e['cue'] <= t}
    future = [e['state'] for e in events if e['cue'] > t and e['mode'] == 'actual' and e['state'] not in established]
    targets.append({'name': f'frame-{len(targets):03d}', 'time': t, 'expect': heard(t), 'forbidState': ', '.join(dict.fromkeys(future)), 'why': 'Inspect essential phone-scale labels, sheet rows, teaching hierarchy, stage/presenter/caption collisions and visible state. Retained actual history is legitimate; conditional branches must be explicit.'})
(out / 'inspection-targets.json').write_text(json.dumps(targets, indent=2), encoding='utf-8')
tmp.unlink(missing_ok=True)
(out / 'manifest.json').write_text(json.dumps({'film': str(video.resolve()), 'filmSha256': hashlib.sha256(video.read_bytes()).hexdigest(), 'before': str(before.resolve()) if before else None, 'phoneWidth': W, 'strips': made, 'targets': len(targets)}, indent=2), encoding='utf-8')
print(f'{len(made)} strips and {len(targets)} targets in {out}')

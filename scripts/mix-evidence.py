"""Mix evidence for a delivered film against its narration-only render.

    python scripts/mix-evidence.py <narration-only.mp4> <mixed.mp4> <props.json> <out.json>

The music-and-effects stem is estimated as mixed minus narration-only (same
pipeline, same narration placement). Reports speech-to-stem ratio while words
are spoken, stem level in pauses, and the weakest speech moments with their
words, so the mix can be judged against the narration it must not obscure.
Standard library only.
"""
import json, math, subprocess, sys
from array import array

a_path, b_path, props_path, out_path = sys.argv[1:5]
SR = 8000
WIN = SR // 10  # 100 ms

def pcm(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return array('h', raw)

voice, mixed = pcm(a_path), pcm(b_path)
n = min(len(voice), len(mixed))
words = json.load(open(props_path, encoding='utf-8'))['words']
frames = n // WIN
speak = [0.0] * frames
for w in words:
    a, b = int(w['start'] * 10), min(frames, int(math.ceil(w['end'] * 10)))
    for i in range(max(0, a), b):
        speak[i] = 1.0

db = lambda energy: 10 * math.log10(energy + 1e-12)
v_e, s_e = [], []
for i in range(frames):
    lo = i * WIN
    ve = se = 0.0
    for k in range(lo, lo + WIN):
        x = voice[k] / 32768.0
        y = mixed[k] / 32768.0 - x
        ve += x * x
        se += y * y
    v_e.append(ve / WIN)
    s_e.append(se / WIN)

sp = [i for i in range(frames) if speak[i] and v_e[i] > 1e-5]
gap = [i for i in range(frames) if not speak[i]]
ratio = sorted((db(v_e[i]) - db(s_e[i]), i) for i in sp)
mean = lambda idx, e: db(sum(e[i] for i in idx) / max(1, len(idx)))
near = lambda t: ' '.join(w['text'] for w in words if abs(w['start'] - t) < 0.8)
pct = lambda p: ratio[min(len(ratio) - 1, int(p / 100 * len(ratio)))][0]

result = {
    'narrationOnly': a_path, 'mixed': b_path,
    'speech_dBFS': round(mean(sp, v_e), 2),
    'stemDuringSpeech_dBFS': round(mean(sp, s_e), 2),
    'stemInPauses_dBFS': round(mean(gap, s_e), 2),
    'speechToStem_dB': {'median': round(pct(50), 2), 'p5': round(pct(5), 2), 'min': round(ratio[0][0], 2)},
    'speechWindowsBelow10dB': sum(1 for r, _ in ratio if r < 10), 'speechWindows': len(ratio),
    'worstSpeechWindows': [{'t': round(i / 10, 1), 'speechToStem_dB': round(r, 1), 'words': near(i / 10)} for r, i in ratio[:8]],
}
json.dump(result, open(out_path, 'w', encoding='utf-8'), indent=2)
print(json.dumps({k: result[k] for k in ('speech_dBFS', 'stemDuringSpeech_dBFS', 'stemInPauses_dBFS', 'speechToStem_dB', 'speechWindowsBelow10dB', 'speechWindows')}))
for w in result['worstSpeechWindows'][:5]:
    print(w)

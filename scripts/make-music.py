"""Deterministic underscore bed, composed in code (no samples, no network).

    python scripts/make-music.py <seconds> <out.wav> [--hook 3.0]

Warm I-vi-IV-V in D at 84 BPM: a soft pad (slow attack, gentle detune), a
sub pulse on beats 1 and 3, and a quiet mallet arpeggio that enters after the
hook. Kept below the speech band and low in level; the film ducks it further
under every spoken word.
"""
import math, struct, sys, wave

seconds = float(sys.argv[1])
out = sys.argv[2]
hook = float(sys.argv[sys.argv.index('--hook') + 1]) if '--hook' in sys.argv else 3.0
SR = 32000
BPM = 84.0
beat = 60.0 / BPM
bar = 4 * beat
chord_len = 2 * bar
# Semitone offsets from D3 (146.83 Hz).
D3 = 146.83
chords = [
    [0, 4, 7, 11],    # Dmaj7
    [-3, 2, 5, 9],    # Bm7
    [-7, -3, 0, 4],   # Gmaj7
    [-5, -1, 2, 6],   # A6
]
hz = lambda semis: D3 * 2 ** (semis / 12)
n = int(seconds * SR)
two_pi = 2 * math.pi
samples = []
peak = 0.0
for i in range(n):
    t = i / SR
    ci = int(t // chord_len) % len(chords)
    local = t % chord_len
    chord = chords[ci]
    prev = chords[(ci - 1) % len(chords)]
    # Pad with a crossfaded attack so chord changes never click.
    a = min(1.0, local / 1.4)
    pad = 0.0
    for s in chord:
        f = hz(s)
        pad += a * (math.sin(two_pi * f * t) + 0.5 * math.sin(two_pi * f * 1.003 * t) + 0.12 * math.sin(two_pi * 2 * f * t))
    if local < 1.4:
        for s in prev:
            f = hz(s)
            pad += (1 - a) * (math.sin(two_pi * f * t) + 0.5 * math.sin(two_pi * f * 1.003 * t))
    pad *= 0.055
    # Sub pulse on beats 1 and 3 of each bar.
    pb = t % (2 * beat)
    root = hz(chord[0] - 12)
    sub = 0.16 * math.sin(two_pi * root * t) * math.exp(-5.0 * pb)
    # Mallet arpeggio in eighths, after the hook.
    arp = 0.0
    if t > hook:
        eighth = beat / 2
        k = int(t // eighth)
        pe = t % eighth
        note = hz(chord[[0, 1, 2, 3, 2, 1][k % 6]] + 12)
        env = math.exp(-9.0 * pe) * min(1.0, (t - hook) / 4.0)
        arp = 0.07 * env * (math.sin(two_pi * note * t) + 0.25 * math.sin(two_pi * 4 * note * t) * math.exp(-30 * pe))
    v = pad + sub + arp
    peak = max(peak, abs(v))
    samples.append(v)
gain = 0.6 / peak if peak else 1.0
with wave.open(out, 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * gain)) * 32767)) for s in samples))
print(f'wrote {out} {seconds:.1f}s peak-normalized from {peak:.3f}')

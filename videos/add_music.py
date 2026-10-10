"""Original evolving instrumental bed: arpeggio, bass, soft kick, hi-hat and chords."""
import argparse
import math
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 32000
BPM = 104
BEAT = 60 / BPM
# A minor -> F major -> C major -> G major: melodic movement, not a held chord.
PROGRESSION = [
    (45, [57, 60, 64, 69]),
    (41, [53, 57, 60, 65]),
    (48, [60, 64, 67, 72]),
    (43, [55, 59, 62, 67]),
]

def tone(midi, duration, kind="bell"):
    n = int(duration * SR)
    t = np.arange(n) / SR
    freq = 440 * 2 ** ((midi - 69) / 12)
    if kind == "bass":
        sig = np.sin(2 * np.pi * freq * t) + .20 * np.sin(4 * np.pi * freq * t)
        env = np.minimum(1, t / .035) * np.exp(-2.1 * t / max(duration, .01))
    else:
        sig = np.sin(2 * np.pi * freq * t) + .24 * np.sin(4 * np.pi * freq * t)
        env = np.minimum(1, t / .012) * np.exp(-3.1 * t / max(duration, .01))
    return sig * env

def add(buf, sound, at, gain):
    start = int(at * SR)
    if start >= len(buf):
        return
    end = min(len(buf), start + len(sound))
    if start >= 0:
        buf[start:end] += sound[:end-start] * gain

def soundtrack(duration):
    rng = np.random.default_rng(2026)
    buf = np.zeros(int(duration * SR), dtype=np.float64)
    bar = BEAT * 4
    for k in range(math.ceil(duration / bar)):
        base, chord = PROGRESSION[k % len(PROGRESSION)]
        start = k * bar
        add(buf, tone(base - 12, BEAT * 1.6, "bass"), start, .20)
        add(buf, tone(base - 12, BEAT * 1.3, "bass"), start + 2 * BEAT, .13)
        for j in range(8):
            note = chord[[0, 2, 1, 3, 2, 1, 0, 2][j]]
            add(buf, tone(note + 12, BEAT * .52), start + j * BEAT / 2, .072)
        for j in range(4):
            at = start + j * BEAT
            # Percussive kick with a descending pitch envelope.
            n = int(.24 * SR)
            t = np.arange(n) / SR
            phase = 2 * np.pi * (64 * t + 35 * (1 - np.exp(-t * 28)) / 28)
            kick = np.sin(phase) * np.exp(-t * 25)
            add(buf, kick, at, .22 if j in (0, 2) else .11)
            for offset in (0, .5):
                noise = rng.normal(0, 1, int(.055 * SR))
                env = np.exp(-np.arange(len(noise)) / SR * 90)
                add(buf, noise * env, at + offset * BEAT, .018)
    # Short opening and closing fades, gentle master saturation.
    nfade = min(int(SR * .9), len(buf)//2)
    buf[:nfade] *= np.linspace(0, 1, nfade)
    buf[-nfade:] *= np.linspace(1, 0, nfade)
    buf = np.tanh(buf * 1.5)
    peak = max(float(np.max(np.abs(buf))), 1e-8)
    return (buf / peak * .72 * 32767).astype("<i2")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("input", type=Path)
    p.add_argument("output", type=Path)
    a = p.parse_args()
    a.output.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(a.input)],
        capture_output=True, text=True, check=True)
    duration = float(result.stdout.strip())
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder) / "score.wav"
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(soundtrack(duration).tobytes())
        subprocess.run(["ffmpeg", "-y", "-i", str(a.input), "-i", str(wav),
            "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac",
            "-b:a", "192k", "-shortest", str(a.output)], check=True)
    print(a.output)

if __name__ == "__main__":
    main()

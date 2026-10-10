"""Cria trilha eletrônica instrumental original e adiciona ao MP4 com FFmpeg."""
import argparse
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="MP4 renderizado pelo Manim")
    parser.add_argument("output", type=Path, help="MP4 com trilha")
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error(f"Vídeo não encontrado: {args.input}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Quatro notas de um acorde de lá menor; música sintetizada, sem arquivos externos.
    # A trilha cobre toda a duração do vídeo, com fade-in/out nos últimos 2 segundos.
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(args.input)], capture_output=True, text=True, check=True)
    duration = float(probe.stdout.strip())
    fade_start = max(0, duration - 2)
    notes = [110, 164.81, 220, 261.63]
    sources = []
    for i, hz in enumerate(notes):
        sources += ["-f", "lavfi", "-i", f"sine=frequency={hz}:sample_rate=44100:duration={duration:.3f}"]
    mix = "".join(f"[{i}:a]volume={0.07 if i == 0 else 0.025}[a{i}];" for i in range(len(notes)))
    mix += "".join(f"[a{i}]" for i in range(len(notes)))
    mix += f"amix=inputs={len(notes)}:duration=longest,afade=t=in:st=0:d=1,afade=t=out:st={fade_start:.3f}:d=2[aout]"
    subprocess.run(["ffmpeg", "-y", *sources, "-i", str(args.input), "-filter_complex", mix, "-map", f"{len(notes)}:v:0", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(args.output)], check=True)
    print(f"Vídeo criado: {args.output}")


if __name__ == "__main__":
    main()

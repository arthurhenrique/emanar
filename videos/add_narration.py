"""Mix a high-quality, licensed Portuguese voiceover into the Instagram Reel.

Usage:
 python videos/add_narration.py input.mp4 voiceover.wav output.mp4

Provide a human recording or neural TTS audio. This script deliberately does
not generate eSpeak narration, which sounds robotic.
"""
import argparse
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("voiceover", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    for file in (args.video, args.voiceover):
        if not file.is_file():
            parser.error(f"Arquivo não encontrado: {file}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-y", "-i", str(args.video), "-i", str(args.voiceover),
        "-filter_complex",
        "[0:a]volume=0.12[music];"
        "[1:a]highpass=f=80,lowpass=f=12000,acompressor=threshold=0.08:ratio=3:attack=10:release=150,volume=1.4[voice];"
        "[music][voice]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.9[a]",
        "-map", "0:v:0", "-map", "[a]", "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k", "-shortest", str(args.output)
    ], check=True)


if __name__ == "__main__":
    main()

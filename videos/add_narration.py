"""Add Brazilian Portuguese male narration to an Instagram Reel.

Requires: espeak (pt-br voice), ffmpeg, ffprobe.
The espeak voice is synthetic and robotic: replace it with a licensed human
voice or a higher-quality TTS for production.
"""
import argparse
import subprocess
import tempfile
from pathlib import Path

SCRIPT = [
    "Já ficou travado, sem saber por onde começar uma tarefa?",
    "Você tem uma ideia, mas ela ainda está confusa. O que construir? Qual é o escopo?",
    "O Grill Me, do Matt Pocock, ajuda justamente nessa etapa.",
    "Em vez de sair codando, você responde perguntas que desafiam suas suposições.",
    "A cada resposta, a ideia fica mais clara. Você refina os requisitos e alinha o objetivo.",
    "O resultado é sair do abstrato e chegar a um plano concreto.",
    "Antes de codar, pense melhor. Grill Me."
]

def run(*args):
    subprocess.run(args, check=True)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("video", type=Path)
    p.add_argument("output", type=Path)
    a = p.parse_args()
    a.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        speech = Path(temp) / "narration.wav"
        run("espeak", "-v", "pt-br+m3", "-s", "142", "-a", "180", "-w", str(speech), " ".join(SCRIPT))
        # Original audio, when present, is a quieter backing track.
        run("ffmpeg", "-y", "-i", str(a.video), "-i", str(speech),
            "-filter_complex",
            "[0:a]volume=0.14[music];[1:a]volume=1.5,highpass=f=100,lowpass=f=6500[voice];"
            "[music][voice]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.93[a]",
            "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac",
            "-b:a", "192k", "-t", "60", str(a.output))

if __name__ == "__main__":
    main()

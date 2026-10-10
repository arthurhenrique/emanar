# Vídeos Emanar (Manim)

Animações em Python com [Manim Community](https://www.manim.community/), usando as cores oficiais de `index.html`.

## Pré-requisitos
Python 3.11+, FFmpeg, fontes e dependências do Manim (incluindo Cairo/Pango).

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r videos/requirements.txt
python -m manim -pqh videos/grill_me.py GrillMe
python videos/add_music.py videos/media/videos/grill_me/1080p60/GrillMe.mp4 videos/output/grill-me.mp4
```

O caminho do MP4 do Manim depende da versão/configuração. Se necessário, encontre-o com `find media videos/media -name 'GrillMe.mp4'`. O script de áudio aceita o caminho exato como primeiro argumento.

## Primeiro vídeo

**Grill Me: menos atrito, mais clareza.** Reel educativo vertical 1080×1920 sobre a skill Grill Me de Matt Pocock. Mostra como perguntas ajudam a refinar ideias abstratas, alinhar escopo e definir um plano. Vídeo conceitual de aproximadamente 30 segundos, sem alegar funcionalidades específicas ainda não documentadas. Visual 9:16, transições animadas, trilha eletrônica original gerada proceduralmente (sem música de terceiros). O áudio é sintetizado e mixado por FFmpeg, que deve estar instalado.

Paleta: verde-escuro `#063B31`, verde `#00AA78`, papel `#FBFAF4`, amarelo `#FFF19F`. Ajuste o roteiro em `grill_me.py` para refletir funcionalidades reais do Grill Me.

# Emanar | Instagram motion graphics

## Reel: Grill Me, de Matt Pocock

A cena em `grill_me.py` foi reconstruída em **Manim Community** para renderização vetorial nativa de **1080 × 1920, 30 fps, 9:16**. Inclui nuvem de conceitos conectados, árvore de perguntas, diagrama de refinamento e hierarquia animada da ideia ao plano. Paleta baseada no site Emanar: `#063B31`, `#00AA78`, `#FBFAF4`, `#FFF19F`.

### Renderizar
Instale Python 3.11+, FFmpeg, Manim e suas dependências nativas (Cairo/Pango).

```bash
pip install -r videos/requirements.txt
python -m manim -qh videos/grill_me.py GrillMe
```

### Áudio
`add_music.py` sintetiza uma trilha instrumental simples. Para resultado profissional, use uma música licenciada com dinâmica e uma voz humana ou neural natural em português brasileiro. O script `add_narration.py` recebe um arquivo de voz **já produzido**:

```bash
python videos/add_music.py CAMINHO_DO_MP4 videos/output/com-musica.mp4
python videos/add_narration.py videos/output/com-musica.mp4 voz-ptbr.wav videos/output/final.mp4
```

**Estado:** código atualizado no PR; não houve renderização nem inspeção visual deste novo Manim neste ambiente. A narração neural e uma trilha profissional não estão incluídas. Não considere o MP4 anterior um preview fiel do novo código.

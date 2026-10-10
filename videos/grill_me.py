"""Vídeo conceitual Grill Me, com identidade visual Emanar (Manim Community)."""
from manim import *

DARK = "#063B31"
GREEN = "#00AA78"
PAPER = "#FBFAF4"
YELLOW = "#FFF19F"
INK = "#10241F"

config.background_color = DARK
config.frame_width = 14.222
config.frame_height = 8
config.pixel_width = 1920
config.pixel_height = 1080
config.frame_rate = 30


class GrillMe(Scene):
    def label(self, message, size=52, color=PAPER):
        return Text(message, font="DejaVu Sans", font_size=size, color=color, weight=BOLD)

    def construct(self):
        eyebrow = self.label("EMANAR  /  APRESENTA", 26, GREEN).to_edge(UP, buff=.55)
        title = self.label("Grill Me", 108)
        underline = Line(LEFT * 2.6, RIGHT * 2.6, color=YELLOW, stroke_width=14).next_to(title, DOWN, buff=.18)
        subtitle = self.label("Menos atrito. Mais clareza.", 40).next_to(underline, DOWN, buff=.6)
        self.play(FadeIn(eyebrow, shift=DOWN), Write(title), run_time=1.8)
        self.play(Create(underline), FadeIn(subtitle, shift=UP), run_time=1.2)
        self.wait(1.4)
        self.play(FadeOut(VGroup(eyebrow, title, underline, subtitle)), run_time=.8)

        headline = self.label("Quando tudo parece complicado...", 49).to_edge(UP, buff=.85)
        problems = ["Informação espalhada", "Dúvidas acumuladas", "Tempo perdido"]
        cards = VGroup()
        for i, word in enumerate(problems):
            bg = RoundedRectangle(corner_radius=.24, width=4, height=2.05, fill_color=PAPER, fill_opacity=1, stroke_width=0)
            txt = self.label(word, 26, INK).move_to(bg)
            card = VGroup(bg, txt).shift(RIGHT * (i - 1) * 4.45 + DOWN * .45)
            cards.add(card)
        self.play(FadeIn(headline, shift=DOWN), run_time=1)
        self.play(LaggedStart(*[FadeIn(c, shift=UP) for c in cards], lag_ratio=.2), run_time=1.7)
        self.wait(1.1)
        self.play(*[c.animate.scale(.85).set_opacity(.3) for c in cards], run_time=.7)
        self.play(FadeOut(VGroup(headline, cards)), run_time=.6)

        circle = Circle(radius=1.35, color=GREEN, stroke_width=12)
        spark = self.label("?", 115, YELLOW).move_to(circle)
        question = self.label("E se fosse mais simples?", 57).next_to(circle, DOWN, buff=.7)
        self.play(Create(circle), FadeIn(spark, scale=.5), run_time=1.1)
        self.play(Write(question), run_time=1)
        self.wait(1.2)
        self.play(FadeOut(VGroup(circle, spark, question)), run_time=.7)

        heading = self.label("Grill Me", 85, GREEN).to_edge(UP, buff=.85)
        steps = ["Pergunte", "Organize", "Avance"]
        nodes = VGroup()
        for i, word in enumerate(steps):
            disc = Circle(radius=.83, fill_color=GREEN if i == 1 else PAPER, fill_opacity=1, stroke_width=0)
            num = self.label(str(i + 1), 55, PAPER if i == 1 else DARK).move_to(disc)
            caption = self.label(word, 32).next_to(disc, DOWN, buff=.38)
            nodes.add(VGroup(disc, num, caption).shift(RIGHT * (i - 1) * 4.3 + DOWN * .25))
        arrows = VGroup(*[Arrow(nodes[i][0].get_right() + RIGHT * .15, nodes[i + 1][0].get_left() + LEFT * .15, buff=.15, color=YELLOW, stroke_width=7) for i in range(2)])
        self.play(FadeIn(heading), run_time=.7)
        for i in range(3):
            self.play(FadeIn(nodes[i], scale=.8), run_time=.65)
            if i < 2:
                self.play(GrowArrow(arrows[i]), run_time=.35)
        self.wait(1.7)
        self.play(FadeOut(VGroup(heading, nodes, arrows)), run_time=.8)

        box = RoundedRectangle(width=10.7, height=4.5, corner_radius=.3, fill_color=PAPER, fill_opacity=1, stroke_width=0)
        final = self.label("Simplifique o próximo passo.", 53, DARK).move_to(box).shift(UP * .55)
        brand = self.label("Grill Me", 72, GREEN).move_to(box).shift(DOWN * .65)
        accent = Line(LEFT * 1.5, RIGHT * 1.5, color=YELLOW, stroke_width=13).next_to(brand, DOWN, buff=.24)
        footer = self.label("Uma apresentação Emanar", 25, PAPER).to_edge(DOWN, buff=.45)
        self.play(FadeIn(box, scale=.9), run_time=.9)
        self.play(Write(final), FadeIn(brand, shift=UP), Create(accent), run_time=1.6)
        self.play(FadeIn(footer), run_time=.7)
        self.wait(3)

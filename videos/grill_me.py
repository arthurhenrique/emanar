"""Grill Me / Matt Pocock: editorial motion graphics, native 1080x1920 Manim."""
from manim import *
import numpy as np

BG="#063B31"; GREEN="#00AA78"; CREAM="#FBFAF4"; YELLOW="#FFF19F"; MUTED="#74E5BD"
config.background_color=BG
config.frame_width=9
config.frame_height=16
config.pixel_width=1080
config.pixel_height=1920
config.frame_rate=30

class GrillMe(Scene):
    def t(self, words, size=42, color=CREAM):
        return Text(words, font="DejaVu Sans", font_size=size, color=color, weight=BOLD)
    def caption(self, words):
        return self.t(words, 27, MUTED).to_edge(DOWN, buff=1.65)
    def clear_scene(self):
        self.play(*[FadeOut(m) for m in list(self.mobjects) if m is not self.logo],run_time=.65)
    def construct(self):
        self.logo=self.t("EMANAR   /   TECH", 22, MUTED).to_edge(UP,buff=.85)
        self.add(self.logo)
        # Act 1: an unresolved thought, represented as a noisy vector field.
        headline=VGroup(self.t("UMA IDEIA.",64),self.t("MIL DÚVIDAS.",61,YELLOW)).arrange(DOWN,buff=.24).shift(UP*3.5)
        self.play(LaggedStart(*[FadeIn(x,shift=UP*.3) for x in headline],lag_ratio=.2),run_time=1.5)
        rng=np.random.default_rng(17)
        dots=VGroup(*[Dot(point=[rng.uniform(-2.7,2.7),rng.uniform(-1.9,1.4),0],radius=.045,color=MUTED) for _ in range(26)])
        edges=VGroup()
        for i in range(19):
            a,b=rng.choice(len(dots),2,replace=False)
            edges.add(Line(dots[a].get_center(),dots[b].get_center(),stroke_width=1.2,color=GREEN,stroke_opacity=.20))
        cloud=VGroup(edges,dots)
        self.play(LaggedStart(*[FadeIn(d) for d in dots],lag_ratio=.018),Create(edges),run_time=2)
        self.play(cloud.animate.scale(.93).set_opacity(.72),run_time=2)
        self.wait(2)
        self.clear_scene()
        # Act 2: transform a vague brief into interrogative branches.
        idea=RoundedRectangle(width=5.8,height=1.6,corner_radius=.25,color=YELLOW,fill_color=YELLOW,fill_opacity=1)
        idea_txt=self.t("TENHO UMA IDEIA",34,BG).move_to(idea)
        root=VGroup(idea,idea_txt).shift(UP*3.6)
        self.play(FadeIn(root,scale=.8),run_time=1)
        prompts=["Pra quem?", "Qual problema?", "O que é essencial?", "Como validar?"]
        cards=VGroup()
        for i,p in enumerate(prompts):
            rect=RoundedRectangle(width=6.2,height=1.12,corner_radius=.16,color=GREEN,stroke_width=2)
            label=self.t(p,31).move_to(rect)
            cards.add(VGroup(rect,label).move_to([0,1.5-i*1.55,0]))
        wires=VGroup(*[Line(root.get_bottom()+DOWN*.08,c.get_top()+UP*.08,color=MUTED,stroke_width=2,stroke_opacity=.28) for c in cards])
        self.play(LaggedStart(*[Create(w) for w in wires],lag_ratio=.15),run_time=1.4)
        self.play(LaggedStart(*[FadeIn(c,shift=RIGHT*.35) for c in cards],lag_ratio=.2),run_time=2.3)\n        self.bring_to_front(root,*cards)
        self.wait(3)
        self.clear_scene()
        # Act 3: question-driven refinement.
        name=self.t("GRILL ME",76,GREEN).shift(UP*4.7)
        by=self.t("skill de Matt Pocock",28).next_to(name,DOWN,buff=.25)
        self.play(Write(name),FadeIn(by),run_time=1.6)
        left=self.t("IDEIA VAGA",27,YELLOW).move_to(LEFT*2.1+UP*1.3)
        right=self.t("ESCOPO CLARO",26,MUTED).move_to(RIGHT*2.05+UP*1.3)
        center=Circle(radius=1.05,color=GREEN,stroke_width=8).shift(DOWN*1.2)
        question=self.t("?",94,YELLOW).move_to(center)
        arrows=VGroup(Arrow(left.get_bottom()+DOWN*.2,center.get_left()+LEFT*.18,buff=.2,color=CREAM,stroke_width=3),Arrow(center.get_right()+RIGHT*.18,right.get_bottom()+DOWN*.2,buff=.2,color=CREAM,stroke_width=3))
        self.play(FadeIn(left),Create(center),FadeIn(question),run_time=1.5)
        self.play(GrowArrow(arrows[0]),GrowArrow(arrows[1]),FadeIn(right),run_time=1.3)\n        self.bring_to_front(center,question,left,right)
        self.play(Rotate(question,angle=TAU),run_time=2)
        self.wait(4)
        self.clear_scene()
        # Act 4: a real hierarchy, not three disconnected boxes.
        title=self.t("DA IDEIA AO PLANO",42,YELLOW).shift(UP*5)
        self.play(FadeIn(title,shift=UP),run_time=.8)
        levels=[("IDEIA","O que queremos?"),("CRITÉRIOS","O que importa?"),("REQUISITOS","O que precisa existir?"),("PLANO","Qual é o próximo passo?")]
        bars=VGroup()
        for i,(a,b) in enumerate(levels):
            w=7.4-i*.75
            rect=RoundedRectangle(width=w,height=1.45,corner_radius=.16,stroke_color=GREEN,stroke_width=2,fill_color=GREEN,fill_opacity=.12+i*.12)
            main=self.t(a,31,CREAM).move_to(rect).shift(UP*.25)
            sub=self.t(b,19,MUTED).move_to(rect).shift(DOWN*.35)
            bars.add(VGroup(rect,main,sub).move_to([0,2.8-i*2.05,0]))
        for i,b in enumerate(bars):
            self.play(FadeIn(b,shift=UP*.4),run_time=.75)
            if i<3:
                self.play(GrowArrow(Arrow(b.get_bottom()+DOWN*.06,bars[i+1].get_top()+UP*.06,buff=.04,color=YELLOW,stroke_width=3)),run_time=.4)
        self.wait(3)
        self.clear_scene()
        # Act 5: editorial end card.
        mark=Circle(radius=2.1,color=GREEN,stroke_width=12)
        rays=VGroup(*[Line(2.35*RIGHT,2.8*RIGHT,color=YELLOW,stroke_width=6).rotate(a,about_point=ORIGIN) for a in np.linspace(0,TAU,16,endpoint=False)])
        brand=self.t("GRILL ME",65).move_to(mark)
        close=VGroup(self.t("ANTES DE CODAR,",39),self.t("REFINE A IDEIA.",43,YELLOW)).arrange(DOWN,buff=.18).shift(DOWN*3.6)
        self.play(Create(mark),LaggedStart(*[Create(r) for r in rays],lag_ratio=.03),run_time=2)
        self.play(Write(brand),run_time=1.2)
        self.play(FadeIn(close,shift=UP),run_time=1.1)
        self.wait(4)

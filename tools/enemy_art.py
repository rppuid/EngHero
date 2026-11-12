#!/usr/bin/env python3
"""적 원화를 도형으로 그린다(외부 원화를 받기 전까지 쓰는 그림). 결과: art-src/enemy/*.png
오른쪽을 보는 3/4 옆모습, 흰 배경. tools/sprites.py가 이것을 도트로 옮긴다."""
import math, os
from PIL import Image, ImageDraw

SS = 3  # 그린 뒤 줄여서 선을 매끈하게

def canvas(w, h):
    im = Image.new("RGB", (w * SS, h * SS), "white")
    return im, ImageDraw.Draw(im)

def S(pts):
    return [(x * SS, y * SS) for x, y in pts]

def blob(d, pts, fill, line="#2a1d24", lw=5):
    d.polygon(S(pts), fill=fill)
    d.line(S(pts + pts[:1]), fill=line, width=lw * SS, joint="curve")

def ell(d, cx, cy, rx, ry, fill, line=None, lw=5):
    box = [(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS]
    d.ellipse(box, fill=fill, outline=line, width=lw * SS if line else 0)

def curve(cx, cy, rx, ry, a0, a1, n=24):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]

def flame(d, base, tip, width, cols):
    """base에서 tip으로 솟는 불꽃 한 가닥."""
    bx, by = base; tx, ty = tip
    dx, dy = tx - bx, ty - by
    L = math.hypot(dx, dy); nx, ny = -dy / L, dx / L
    for k, c in enumerate(cols):
        s = 1 - k * 0.3
        w = width * s
        mx, my = bx + dx * 0.45, by + dy * 0.45
        ex, ey = bx + dx * s, by + dy * s
        pts = [(bx + nx * w, by + ny * w), (mx + nx * w * 0.9 + dx * 0.05, my + ny * w * 0.9), (ex, ey),
               (mx - nx * w * 0.7, my - ny * w * 0.7), (bx - nx * w, by - ny * w)]
        d.polygon(S(pts), fill=c)

def save(im, name):
    os.makedirs("art-src/enemy", exist_ok=True)
    im.resize((im.width // SS, im.height // SS), Image.LANCZOS).save(f"art-src/enemy/{name}.png")

def slime():
    im, d = canvas(520, 440)
    body = curve(260, 250, 200, 170, 180, 360) + [(456, 300), (440, 352), (392, 384), (260, 396), (128, 384), (80, 352), (64, 300)]
    blob(d, body, "#3fb8c9", lw=7)
    # 아래쪽 그늘
    d.polygon(S([(70, 318), (110, 350), (260, 372), (410, 350), (450, 318), (438, 354), (392, 382), (260, 394), (128, 382), (82, 354)]), fill="#23808f")
    # 속이 비치는 밝은 면과 반짝임
    ell(d, 250, 190, 150, 96, "#62d6e0")
    ell(d, 170, 142, 44, 26, "#d6fbff")
    ell(d, 226, 118, 14, 9, "#ffffff")
    # 눈 (걱정스러운 큰 눈, 오른쪽을 본다)
    for ex in (236, 356):
        ell(d, ex, 232, 34, 44, "#ffffff", "#2a1d24", 5)
        ell(d, ex + 10, 240, 19, 28, "#1c2a44")
        ell(d, ex + 4, 226, 8, 10, "#ffffff")
    d.line(S([(196, 172), (262, 186)]), fill="#2a1d24", width=6 * SS)
    d.line(S([(326, 186), (392, 172)]), fill="#2a1d24", width=6 * SS)
    # 입을 막은 X 봉인
    for a, b in (((270, 300), (322, 344)), ((322, 300), (270, 344))):
        d.line(S([a, b]), fill="#1a1024", width=13 * SS)
        d.line(S([a, b]), fill="#7b3fa0", width=5 * SS)
    save(im, "slime")

def merged(d, shapes, line="#241a22", lw=6):
    """여러 도형을 한 덩어리처럼: 먼저 전부 굵은 선 색으로 깔고, 그 위에 면을 칠한다."""
    for kind, geo, fill in shapes:
        if kind == "e":
            cx, cy, rx, ry = geo; ell(d, cx, cy, rx + lw, ry + lw, line)
        else:
            d.polygon(S(geo), fill=line); d.line(S(geo + geo[:1]), fill=line, width=lw * 2 * SS, joint="curve")
    for kind, geo, fill in shapes:
        if kind == "e":
            ell(d, *geo, fill)
        else:
            d.polygon(S(geo), fill=fill)

def leg(x, y, fwd=1, L=150, w=30):
    """위(x,y)에서 내려오는 다리. 무릎에서 한 번 꺾이고 발이 앞으로 나온다."""
    k = (x - 14 * fwd, y + L * 0.5); a = (x + 6 * fwd, y + L)
    return [(x - w, y), (x + w, y), (k[0] + w * 0.7, k[1]), (a[0] + w * 0.6, a[1] - 10), (a[0] + w * 1.5 * fwd + w * 0.2, a[1] + 8),
            (a[0] + w * 1.4 * fwd, a[1] + 22), (a[0] - w * 0.7, a[1] + 22), (k[0] - w * 0.75, k[1] + 6)]

def wolf():
    im, d = canvas(900, 640)
    FUR = "#4d4858"; FUR_D = "#353040"; FUR_L = "#716b7e"; BELLY = "#9a93a3"; INK = "#241a22"
    F1, F2, F3 = "#e8501e", "#ff9a2a", "#ffe066"
    for base, tip, w in (((190, 330), (40, 130), 62), ((180, 360), (20, 290), 48), ((210, 320), (150, 70), 52), ((185, 380), (60, 400), 34)):
        flame(d, base, tip, w, [F1, F2, F3])
    merged(d, [("p", leg(292, 400, 1, 140, 26), FUR_D), ("p", leg(590, 400, 1, 140, 24), FUR_D)], INK)
    for base, tip, w in (((560, 240), (470, 120), 40), ((600, 226), (560, 60), 54), ((650, 214), (660, 50), 50), ((690, 214), (740, 96), 34)):
        flame(d, base, tip, w, [F1, F2, F3])
    merged(d, [
        ("e", (300, 348, 118, 98), FUR),                       # 엉덩이
        ("p", [(280, 256), (560, 250), (640, 300), (600, 440), (300, 446)], FUR),  # 몸통
        ("e", (580, 336, 112, 118), FUR),                      # 가슴
        ("p", [(590, 240), (690, 190), (740, 300), (660, 400), (560, 330)], FUR),  # 목
        ("p", leg(350, 410, 1, 150, 30), FUR), ("p", leg(640, 410, 1, 152, 30), FUR),
        ("e", (724, 250, 86, 78), FUR),                        # 머리
        ("p", [(740, 214), (850, 250), (880, 276), (868, 304), (800, 322), (730, 318)], FUR),  # 주둥이
        ("p", [(668, 206), (676, 104), (728, 176)], FUR), ("p", [(724, 184), (762, 96), (792, 196)], FUR_L),
    ], INK)
    # 명암
    d.polygon(S([(250, 420), (360, 446), (540, 446), (640, 420), (668, 372), (600, 420), (360, 428)]), fill=BELLY)
    d.polygon(S(curve(300, 348, 104, 84, 190, 300)), fill=FUR_L)
    d.polygon(S(curve(580, 320, 96, 96, 200, 290)), fill=FUR_L)
    d.polygon(S([(540, 420), (600, 400), (650, 340), (690, 300), (700, 340), (660, 410), (600, 440)]), fill=BELLY)  # 가슴 털
    d.polygon(S([(742, 176), (762, 124), (778, 190)]), fill="#c9615a")
    d.polygon(S([(730, 300), (800, 300), (866, 286), (868, 304), (800, 322), (730, 318)]), fill=BELLY)
    for px in (372, 664):
        ell(d, px, 582, 40, 12, F2); ell(d, px, 580, 20, 7, F3)
    ell(d, 872, 270, 15, 13, INK)
    blob(d, [(770, 302), (784, 338), (798, 304)], "#ffffff", INK, 3)
    blob(d, [(820, 298), (832, 326), (844, 294)], "#ffffff", INK, 3)
    d.line(S([(724, 306), (800, 300), (866, 286)]), fill=INK, width=5 * SS)
    blob(d, [(736, 228), (790, 238), (802, 262), (752, 262)], F3, INK, 4)
    ell(d, 778, 251, 8, 10, INK)
    d.line(S([(722, 216), (806, 240)]), fill=INK, width=9 * SS)
    save(im, "wolf")

if __name__ == "__main__":
    slime(); wolf(); print("ok")

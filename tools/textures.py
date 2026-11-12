#!/usr/bin/env python3
"""사진 질감(art-src/tex)을 도트 질감으로 바꾼다. 결과: public/assets/tex/{이름}.png, {이름}_n.png(법선)
인물 도트와 칸 크기가 맞도록 낮은 해상도로 줄이고, 색을 몇 가지로 묶고, 색감을 게임에 맞게 옮긴다."""
import os, sys
import numpy as np
from PIL import Image, ImageEnhance
sys.path.insert(0, os.path.dirname(__file__))
from trace import rgb2lab, kmeans

# 이름: (원본, 한 변 칸 수, 색 수, 채도, 밝기, 색 옮김(R,G,B 곱), 대비)
JOBS = {
    "grass": ("leafy_grass", 256, 20, 1.3, 0.8, (0.8, 1.06, 0.6), 1.2),
    "dirt": ("grass_path_2", 256, 16, 1.15, 0.95, (1.06, 0.98, 0.84), 1.2),
    "floor": ("forest_floor", 256, 20, 1.2, 0.8, (0.95, 1.02, 0.8), 1.15),
    "bark": ("bark_brown_02", 128, 14, 1.15, 0.85, (1.08, 0.96, 0.82), 1.25),
    "rock": ("mossy_rock", 128, 16, 1.1, 0.95, (0.96, 1.0, 1.02), 1.25),
}

def quant(im, k):
    a = np.asarray(im, np.float64); lab = rgb2lab(a).reshape(-1, 3); rgb = a.reshape(-1, 3)
    rng = np.random.default_rng(2); pick = rng.choice(len(lab), min(len(lab), 8000), replace=False)
    cen, _ = kmeans(lab[pick], np.ones(len(pick)), k, it=25)
    lbl = np.concatenate([((lab[i:i + 50000, None] - cen[None]) ** 2).sum(-1).argmin(1) for i in range(0, len(lab), 50000)])
    pal = np.array([rgb[lbl == i].mean(0) if (lbl == i).any() else [0, 0, 0] for i in range(k)])
    return Image.fromarray(pal[lbl].reshape(a.shape).round().astype(np.uint8))

for name, (src, size, k, sat, bri, tint, con) in JOBS.items():
    im = Image.open(f"art-src/tex/{src}_diff.jpg").convert("RGB").resize((size, size), Image.BOX)
    a = np.asarray(im, np.float64) * np.array(tint); im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    im = ImageEnhance.Color(im).enhance(sat); im = ImageEnhance.Contrast(im).enhance(con); im = ImageEnhance.Brightness(im).enhance(bri)
    quant(im, k).save(f"public/assets/tex/{name}.png", optimize=True)
    n = Image.open(f"art-src/tex/{src}_nor_gl.jpg").convert("RGB").resize((size, size), Image.BOX)
    n.save(f"public/assets/tex/{name}_n.png", optimize=True)
    print(name, size, k, os.path.getsize(f"public/assets/tex/{name}.png") // 1024, "KB")

#!/usr/bin/env python3
"""art-src의 원본 그림에서 흰 배경을 지우고 웹용 webp를 만든다.
bust → public/assets/art/bust (512px), face(차례 표시용 얼굴 96px), full → public/assets/art/full (세로 900px)"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from trace import bg_mask

FACE = {  # 상반신 그림(1024 기준)에서 얼굴 가운데 x, y와 잘라 낼 한 변
    'dodam': (475, 295, 330), 'duduk': (500, 410, 330), 'garak': (471, 369, 330), 'grimo': (524, 430, 520),
    'maru': (553, 287, 330), 'muji': (410, 410, 330), 'naru': (500, 295, 330), 'sori': (450, 320, 330),
}

def cut(path):
    rgb = np.asarray(Image.open(path).convert("RGB"))
    a = Image.fromarray(((~bg_mask(rgb, tol=10)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    im = Image.fromarray(rgb).convert("RGBA"); im.putalpha(a)
    return im

FACE_ONLY = "--face" in sys.argv
for f in sorted(glob.glob("art-src/bust/*_normal.png" if FACE_ONLY else "art-src/bust/*.png")):
    n = os.path.basename(f)[:-4]
    im = cut(f)
    if not FACE_ONLY:
        im.resize((512, 512), Image.LANCZOS).save(f"public/assets/art/bust/{n}.webp", quality=82, method=6)
    if n.endswith("_normal"):
        cx, cy, s = FACE[n.split('_')[0]]  # 1024 기준 얼굴 가운데와 한 변
        face = im.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2))
        face.resize((96, 96), Image.LANCZOS).save(f"public/assets/art/face/{n.split('_')[0]}.webp", quality=85)
for f in ([] if FACE_ONLY else sorted(glob.glob("art-src/full/*.png"))):
    n = os.path.basename(f)[:-4]
    im = cut(f); im = im.crop(im.getbbox())
    h = 900; im.resize((round(im.width * h / im.height), h), Image.LANCZOS).save(f"public/assets/art/full/{n}.webp", quality=82, method=6)
print("ok")

#!/usr/bin/env python3
"""동작 그림(art-src/anim/{id}_{동작}.png, 장면 96×96)을 인물별 한 장으로 모은다.
받은 그림은 가장자리가 흐리고 색이 수천 가지라서, 인물마다 모든 장면을 같은 40색으로 묶고
반투명을 없애 또렷한 도트로 만든다. 결과: public/assets/art/anim/{id}.png (가로 6장면 × 세로 9줄)
줄 순서: idle, attack, hit, down, victory, walk_down, walk_left, walk_right, walk_up"""
import glob, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from trace import rgb2lab, kmeans

CELL, COLS, K = 96, 6, 40
ROWS = ["idle", "attack", "hit", "down", "victory"]

def build(cid):
    sheet = np.zeros((CELL * 9, CELL * COLS, 4), np.uint8)
    for r, name in enumerate(ROWS):
        im = np.asarray(Image.open(f"art-src/anim/{cid}_{name}.png").convert("RGBA"))
        sheet[r * CELL:(r + 1) * CELL, :im.shape[1]] = im
    walk = np.asarray(Image.open(f"art-src/anim/{cid}_walk.png").convert("RGBA"))
    for d in range(4):
        sheet[(5 + d) * CELL:(6 + d) * CELL] = walk[:, d * CELL * COLS:(d + 1) * CELL * COLS]
    op = sheet[..., 3] >= 128
    rgb = sheet[..., :3][op].astype(np.float64)
    lab = rgb2lab(rgb)
    rng = np.random.default_rng(5)
    pick = rng.choice(len(lab), min(len(lab), 9000), replace=False)
    cen, _ = kmeans(lab[pick], np.ones(len(pick)), K, it=30)
    lbl = np.empty(len(lab), np.int32)
    for i in range(0, len(lab), 60000):
        lbl[i:i + 60000] = ((lab[i:i + 60000, None] - cen[None]) ** 2).sum(-1).argmin(1)
    pal = np.array([rgb[lbl == i].mean(0) if (lbl == i).any() else [0, 0, 0] for i in range(K)])
    out = np.zeros_like(sheet)
    out[..., :3][op] = pal[lbl].round().astype(np.uint8)
    out[..., 3][op] = 255
    Image.fromarray(out).save(f"public/assets/art/anim/{cid}.png", optimize=True)
    return len(set(lbl.tolist()))

if __name__ == "__main__":
    ids = sorted({os.path.basename(f).split("_")[0] for f in glob.glob("art-src/anim/*_idle.png")})
    for cid in ids:
        print(cid, build(cid), "colors")

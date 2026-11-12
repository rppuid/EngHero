#!/usr/bin/env python3
"""그림 한 장을 팔레트 도트 격자로 옮긴다.
사용: python3 tools/trace.py <그림.png> <id> --h 76 [--k 28] [--box x0,y0,x1,y1] [--flip]
결과: <out>/<id>.js (팔레트와 글자 격자). --preview 로 확대한 확인용 PNG.
방법: 흰 배경 제거 → 칸 평균으로 줄이기 → 선명하게 → Lab 색 공간에서 k개 색으로 묶기.
"""
import argparse, json
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage

CH = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def rgb2lab(a):
    a = np.asarray(a, np.float64) / 255
    a = np.where(a > 0.04045, ((a + 0.055) / 1.055) ** 2.4, a / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = a @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def bg_mask(rgb, tol=16, hole=500):
    """테두리에서 이어진 흰 배경 + 그림 안에 갇힌 순백 구멍."""
    near = (rgb.min(-1) >= 255 - tol)
    lab, n = ndimage.label(near)
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    edge.discard(0)
    bg = np.isin(lab, list(edge))
    pure = (rgb.min(-1) >= 252)
    lab2, n2 = ndimage.label(pure & ~bg)
    if n2:
        size = ndimage.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
        bg |= np.isin(lab2, [i + 1 for i, s in enumerate(size) if s >= hole])
    return bg

def kmeans(lab, w, k, seed=3, it=40):
    rng = np.random.default_rng(seed)
    c = lab[rng.choice(len(lab), 1)]
    for _ in range(k - 1):
        d = ((lab[:, None] - c[None]) ** 2).sum(-1).min(1) * w
        c = np.vstack([c, lab[rng.choice(len(lab), 1, p=d / d.sum())]])
    for _ in range(it):
        lbl = ((lab[:, None] - c[None]) ** 2).sum(-1).argmin(1)
        for i in range(k):
            if (lbl == i).any():
                c[i] = np.average(lab[lbl == i], axis=0, weights=w[lbl == i])
    return c, ((lab[:, None] - c[None]) ** 2).sum(-1).argmin(1)

def trace(path, box, H, k, flip=False, sharp=1.1, hole=500):
    im = Image.open(path).convert("RGB")
    if box:
        im = im.crop(box)
    rgb = np.asarray(im)
    bg = bg_mask(rgb, hole=hole)
    ys, xs = np.where(~bg)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgb, bg = rgb[y0:y1, x0:x1].copy(), bg[y0:y1, x0:x1]
    if flip:
        rgb, bg = rgb[:, ::-1].copy(), bg[:, ::-1]
    sh, sw = rgb.shape[:2]
    W = max(1, round(sw * H / sh))
    # 배경 색이 가장자리로 번지지 않게: 알파를 곱한 평균
    a = (~bg).astype(np.float64)
    pm = Image.fromarray((rgb * a[..., None]).astype(np.uint8)).resize((W, H), Image.BOX)
    am = Image.fromarray((a * 255).astype(np.uint8)).resize((W, H), Image.BOX)
    an = np.asarray(am, np.float64) / 255
    small = np.asarray(pm, np.float64) / np.maximum(an, 1e-3)[..., None]
    small = np.clip(small, 0, 255)
    op = an >= 0.5
    if sharp:
        base = Image.fromarray(small.astype(np.uint8))
        blur = np.asarray(base.filter(ImageFilter.GaussianBlur(1.0)), np.float64)
        small = np.clip(small + sharp * (small - blur), 0, 255)
    lab = rgb2lab(small)
    pts = lab[op]
    cen, lbl = kmeans(pts, np.ones(len(pts)), k)
    col = small[op]
    pal = np.array([col[lbl == i].mean(0) if (lbl == i).any() else [0, 0, 0] for i in range(k)])
    lum = pal @ np.array([0.299, 0.587, 0.114])
    used = sorted(set(lbl.tolist()), key=lambda i: lum[i])
    remap = {u: n for n, u in enumerate(used)}
    grid = -np.ones((H, W), int)
    grid[op] = [remap[v] for v in lbl]
    rows = ["".join("." if v < 0 else CH[v] for v in r) for r in grid]
    colors = ["#%02x%02x%02x" % tuple(int(round(c)) for c in pal[u]) for u in used]
    return rows, colors

def preview(rows, colors, path, z=8):
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != ".":
                c = colors[CH.index(ch)]
                im.putpixel((x, y), (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255))
    out = Image.new("RGBA", (w * z + 24 + w * 2 + 20, h * z + 14), (70, 90, 80, 255))
    out.alpha_composite(im.resize((w * z, h * z), Image.NEAREST), (24, 14))
    out.alpha_composite(im.resize((w * 2, h * 2), Image.NEAREST), (w * z + 34, 14))
    d = ImageDraw.Draw(out)
    for x in range(0, w, 10):
        d.line([(24 + x * z, 0), (24 + x * z, h * z + 14)], fill=(255, 255, 255, 50)); d.text((26 + x * z, 1), str(x), fill="white")
    for y in range(0, h, 10):
        d.line([(0, 14 + y * z), (w * z + 24, 14 + y * z)], fill=(255, 255, 255, 50)); d.text((1, 15 + y * z), str(y), fill="white")
    out.convert("RGB").save(path)

def write_js(path, sid, rows, colors):
    js = "// tools/sprites.py가 만든 도트 격자. 직접 고치지 말고 tools/sprites.py의 보정 목록을 고친다.\nexport default " + json.dumps({"id": sid, "pal": colors, "rows": rows}, indent=1) + ";\n"
    open(path, "w").write(js)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("id")
    ap.add_argument("--box"); ap.add_argument("--h", type=int, default=76)
    ap.add_argument("--k", type=int, default=28); ap.add_argument("--sharp", type=float, default=1.1)
    ap.add_argument("--flip", action="store_true")
    ap.add_argument("--out", default="public/js/sprites"); ap.add_argument("--preview")
    a = ap.parse_args()
    box = tuple(int(v) for v in a.box.split(",")) if a.box else None
    rows, colors = trace(a.src, box, a.h, a.k, a.flip, a.sharp)
    if a.preview:
        preview(rows, colors, a.preview)
    write_js(f"{a.out}/{a.id}.js", a.id, rows, colors)
    print(a.id, len(rows[0]), "x", len(rows), len(colors), "colors")

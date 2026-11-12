#!/usr/bin/env python3
"""전투 도트 스프라이트를 한 번에 만든다. 결과: public/js/sprites/*.js
적 원화(art-src/enemy)를 도트 격자로 옮긴다. 인물은 동작 그림을 쓰므로 tools/anim.py가 맡는다."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from trace import trace, preview, write_js

JOBS = [  # id, 원본, 세로 칸 수, 색 수, 선명도
    ("slime", "art-src/enemy/slime_full.png", 30, 18, 0.6),
    ("wolf", "art-src/enemy/wolf_full.png", 62, 28, 0.7),
    ("tree", "art-src/enemy/tree_full.png", 98, 30, 0.7),
    ("mushroom", "art-src/enemy/mushroom_full.png", 46, 22, 0.6),
    ("bee", "art-src/enemy/bee_full.png", 46, 24, 0.7),
    ("boss_bear", "art-src/enemy/boss_bear_full.png", 112, 32, 0.7),
]
pv = sys.argv[1] if len(sys.argv) > 1 else None
for sid, src, h, k, sharp in JOBS:
    rows, colors = trace(src, None, h, k, False, sharp)
    write_js(f"public/js/sprites/{sid}.js", sid, rows, colors)
    if pv:
        preview(rows, colors, f"{pv}/{sid}.png", z=10)
    print(sid, len(rows[0]), "x", len(rows), len(colors))

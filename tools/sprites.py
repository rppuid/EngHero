#!/usr/bin/env python3
"""전투 도트 스프라이트를 한 번에 만든다. 결과: public/js/sprites/*.js
인물은 art-src/full(전투 자세 전신 그림), 적은 art-src/enemy에서 옮긴다."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from trace import trace, preview, write_js

JOBS = [  # id, 원본, 세로 칸 수, 색 수, 선명도
    ("maru", "art-src/full/maru_full.png", 80, 30, 0.8),
    ("muji", "art-src/full/muji_full.png", 80, 36, 0.7),
    ("naru", "art-src/full/naru_full.png", 82, 30, 0.8),
    ("slime", "art-src/enemy/slime.png", 34, 14, 0.6),
    ("wolf", "art-src/enemy/wolf.png", 64, 20, 0.6),
]
pv = sys.argv[1] if len(sys.argv) > 1 else None
for sid, src, h, k, sharp in JOBS:
    rows, colors = trace(src, None, h, k, False, sharp)
    write_js(f"public/js/sprites/{sid}.js", sid, rows, colors)
    if pv:
        preview(rows, colors, f"{pv}/{sid}.png", z=10)
    print(sid, len(rows[0]), "x", len(rows), len(colors))

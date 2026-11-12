#!/usr/bin/env python3
"""Gemini 이미지 모델로 그림 한 장을 만든다. 사용: gen_image.py <out.png> "<지시문>" [모델]
키는 실행 환경(프록시)이 넣어 주므로 GEMINI_API_KEY가 없어도 된다."""
import base64, json, os, sys, urllib.request
out, prompt = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "gemini-3-pro-image"
req = urllib.request.Request(
    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    data=json.dumps({"contents": [{"parts": [{"text": prompt}]}],
                     "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1"}}}).encode(),
    headers={"Content-Type": "application/json", "x-goog-api-key": os.environ.get("GEMINI_API_KEY", "dummy")})
try:
    d = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(f"{e.code} {e.read()[:600]}")
for p in d["candidates"][0]["content"]["parts"]:
    if "inlineData" in p:
        open(out, "wb").write(base64.b64decode(p["inlineData"]["data"])); print("saved", out); break
else:
    sys.exit(json.dumps(d)[:600])

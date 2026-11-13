#!/usr/bin/env python3
"""Burn word-by-word captions (white heavy text, black stroke, active word yellow) onto frames/ -> frames_cap/.
usage: python3 captions.py [first-last]"""
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
W, H, Y = 1080, 1920, 1190
SIZE = 92
words = json.load(open("work/words.json"))
# fix the last phrase: "Comment KEEP or RETURN..." is speech segment f708-766, "because ... dollars." is f774-854
fix = {"Comment": 708, "KEEP": 727, "or": 737, "RETURN…": 746, "because": 774, "you": 790, "just": 798, "found": 806, "one": 814, "million": 822, "dollars.": 838}
for i, w in enumerate(words):
    if w["f"] >= 700 and w["word"] in fix:
        w["f"] = fix[w["word"]]
words.sort(key=lambda w: w["f"])
# chunks of up to 3 words / 15 chars, breaking after punctuation
phrases, cur = [], []
for w in words:
    cur.append(w)
    if re.search(r"[.,?!:…]$", w["word"]):
        phrases.append(cur); cur = []
if cur: phrases.append(cur)
chunks = []
for p in phrases:
    n = -(-len(p) // 3)
    sizes = [len(p) // n + (1 if k < len(p) % n else 0) for k in range(n)]
    i = 0
    for s_ in sizes:
        chunks.append(p[i:i + s_]); i += s_
for i, c in enumerate(chunks):
    c0 = c[0]["f"] - 1
    nxt = chunks[i + 1][0]["f"] - 1 if i + 1 < len(chunks) else 860
    c_end = min(nxt, c[-1]["f"] + 26)
    for j, w in enumerate(c):
        w["end"] = c[j + 1]["f"] if j + 1 < len(c) else c_end
    c.insert(0, {"start": c0, "end": c_end})

font = ImageFont.truetype(FONT, SIZE)
clean = lambda s: re.sub(r"[.,?!:…]", "", s).upper().replace("YOU", "YOU")

def draw_chunk(base, ch, f):
    meta, ws = ch[0], ch[1:]
    age = f - meta["start"]
    s = min(1.0, 0.82 + 0.06 * age) if age < 4 else 1.0
    toks = [clean(w["word"]) for w in ws]
    fnt = ImageFont.truetype(FONT, int(SIZE * s))
    sp = int(22 * s)
    widths = [fnt.getbbox(t)[2] - fnt.getbbox(t)[0] for t in toks]
    total = sum(widths) + sp * (len(toks) - 1)
    scale = min(1.0, (W - 90) / total)
    if scale < 1:
        fnt = ImageFont.truetype(FONT, int(SIZE * s * scale)); sp = int(sp * scale)
        widths = [fnt.getbbox(t)[2] - fnt.getbbox(t)[0] for t in toks]; total = sum(widths) + sp * (len(toks) - 1)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d, ds = ImageDraw.Draw(layer), ImageDraw.Draw(shadow)
    x = (W - total) // 2
    for t, wd, w in zip(toks, widths, ws):
        active = w["f"] <= f < w["end"]
        col = (255, 222, 52) if active else (255, 255, 255)
        ox = x - fnt.getbbox(t)[0]
        ds.text((ox + 5, Y + 8), t, font=fnt, fill=(0, 0, 0, 170), stroke_width=12, stroke_fill=(0, 0, 0, 170), anchor="ls")
        d.text((ox, Y), t, font=fnt, fill=col, stroke_width=11, stroke_fill=(16, 14, 22), anchor="ls")
        x += wd + sp
    shadow = shadow.filter(ImageFilter.GaussianBlur(4))
    base.alpha_composite(shadow); base.alpha_composite(layer)

rng = sys.argv[1] if len(sys.argv) > 1 else "0-859"
a, b = map(int, rng.split("-"))
os.makedirs("frames_cap", exist_ok=True)
for f in range(a, b + 1):
    src = f"frames/f{f:04d}.jpg"
    if not os.path.exists(src): continue
    im = Image.open(src).convert("RGBA")
    for ch in chunks:
        if ch[0]["start"] <= f < ch[0]["end"]:
            draw_chunk(im, ch, f); break
    im.convert("RGB").save(f"frames_cap/f{f:04d}.jpg", quality=95)
print("captions", a, b, [" ".join(w["word"] for w in c[1:]) for c in chunks])

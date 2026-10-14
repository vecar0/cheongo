# 보부상: cut the one figure on white and append it to the npc sheet as frame 9 (same grade as npc_cut.py)
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage
S = sys.argv[1]   # folder holding npc_orig.webp/json (the sheet before this frame)
PAPER = np.array([234, 226, 210], np.float32)
a = np.asarray(Image.open('assets/raw/peddler.png').convert('RGB')).astype(np.float32)
mn = a.min(2); sat = a.max(2) - mn; bgish = (mn > 228) & (sat < 22)
lab, _ = ndimage.label(bgish); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fg = ndimage.binary_opening(~np.isin(lab, list(edge)), iterations=1)
l2, n = ndimage.label(fg); sizes = ndimage.sum(fg, l2, range(1, n + 1)); fg = np.isin(l2, [i + 1 for i, s in enumerate(sizes) if s > 400])
l3, n3 = ndimage.label(bgish & fg)
if n3: sizes = ndimage.sum(bgish & fg, l3, range(1, n3 + 1)); fg &= ~np.isin(l3, [i + 1 for i, s in enumerate(sizes) if s > 900])
alpha = np.clip((ndimage.gaussian_filter(fg.astype(np.float32), .7) - .15) / .7, 0, 1)
lum = a.mean(2, keepdims=True); col = a * .82 + lum * .18
w = np.clip((lum - 150) / 105, 0, 1); col = (col * (1 - w * .8) + (col / 255 * PAPER) * (w * .8)) * .72
band = (alpha > 0) & (alpha < .99); col[band] = col[band] * .85
col = 255 * (col / 255) ** 1.35   # mid-tones down: light cloth must not melt into the light paper
rim = np.clip(ndimage.gaussian_filter(ndimage.binary_dilation(alpha > .5, iterations=4).astype(np.float32), 1.2) - alpha, 0, 1)   # a thin ink outline, like the brush line round the game's own figures
col = col * (1 - rim[..., None]) + np.array([40, 36, 34.]) * rim[..., None]; alpha = np.maximum(alpha, rim * .85)
ys, xs = np.where(alpha > .05)
im = Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')
k = 240 / im.height; im = im.resize((round(im.width * k), 240), Image.LANCZOS)
sheet = Image.open(f'{S}/npc_orig.webp').convert('RGBA'); fr = json.load(open(f'{S}/npc_orig.json'))[:9]
x = max(f['x'] + f['w'] for f in fr) + 2
out = Image.new('RGBA', (x + im.width, 240), (0, 0, 0, 0)); out.paste(sheet.crop((0, 0, x - 2, 240)), (0, 0)); out.paste(im, (x, 0))
fr.append({"x": x, "y": 0, "w": im.width, "h": 240})
out.save('assets/sprites/npc.webp', quality=88, method=6); json.dump(fr, open('assets/sprites/npc.json', 'w'), separators=(',', ':'))
p = Image.new('RGBA', out.size, (214, 206, 188, 255)); p.alpha_composite(out); p.convert('RGB').save(f'{S}/npc_new.png'); print(fr[-1])

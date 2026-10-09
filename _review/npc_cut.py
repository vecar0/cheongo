import json, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src = np.asarray(Image.open('/home/user/akane/assets/raw/sheet-npc.png').convert('RGB')).astype(np.float32)
H, W, _ = src.shape; cw, ch = W / 3, H / 3
PAPER = np.array([234, 226, 210], np.float32)   # the game's hanji
frames, imgs = [], []
for r in range(3):
  for c in range(3):
    x0, y0, x1, y1 = int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)
    a = src[y0:y1, x0:x1]
    mn = a.min(2); sat = a.max(2) - mn
    bgish = (mn > 228) & (sat < 22)               # near-white, unsaturated
    lab, _ = ndimage.label(bgish)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))                 # only white that touches the cell border is background
    # soft edge: background-adjacent pixels get alpha from how white they are
    fg = ~bg
    fg = ndimage.binary_opening(fg, iterations=1)
    lab2, n = ndimage.label(fg)                   # drop specks
    if n:
      sizes = ndimage.sum(fg, lab2, range(1, n + 1)); keep = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s > 400]); fg = keep
    fg = ndimage.binary_fill_holes(fg) | (fg)
    # but keep real see-through gaps that are large and white (between legs, under the house): re-open big white enclosed regions
    encl = bgish & fg & ~ndimage.binary_erosion(~bgish, iterations=0)
    lab3, n3 = ndimage.label(bgish & fg)
    if n3:
      sizes = ndimage.sum(bgish & fg, lab3, range(1, n3 + 1))
      big = np.isin(lab3, [i + 1 for i, s in enumerate(sizes) if s > 900]); fg &= ~big
    alpha = ndimage.gaussian_filter(fg.astype(np.float32), .7)
    alpha = np.clip((alpha - .15) / .7, 0, 1)
    # 수묵: white is unpainted paper — light, unsaturated areas (smoke, plaster, white cloth) let the page show through,
    # the brush lines and shading inside them stay; lines are protected by local darkness
    lumf = a.mean(2); satf = a.max(2) - a.min(2)
    wt = np.clip((lumf - 175) / 70, 0, 1) * np.clip(1 - (satf - 18) / 40, 0, 1)
    dark_near = ndimage.minimum_filter(lumf, size=3) < 120
    wt[dark_near] *= .4
    alpha = alpha * (1 - [.22, .22, .22, .22, .22, .85, .5, .45, .55][r * 3 + c] * wt)
    # ink-and-paper grade: whites become hanji, colours a little quieter, edges defringed toward darker neighbours
    lum = a.mean(2, keepdims=True)
    col = a * .82 + lum * .18                      # desaturate 18%
    w = np.clip((lum - 150) / 105, 0, 1)           # how white
    col = col * (1 - w * .8) + (col / 255 * PAPER) * (w * .8)
    col = col * .96
    edgeband = (alpha > 0) & (alpha < .99)
    col[edgeband] = np.minimum(col[edgeband], col[edgeband] * .85)
    ys, xs = np.where(alpha > .05)
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)[by0:by1, bx0:bx1]
    im = Image.fromarray(rgba, 'RGBA'); s = 240 / im.height
    if im.width * s > 315: s = 315 / im.width
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    imgs.append(im)
x = 0; Wt = sum(i.width for i in imgs) + 2 * (len(imgs) - 1)
sheet = Image.new('RGBA', (Wt, 240), (0, 0, 0, 0))
for im in imgs:
  sheet.paste(im, (x, 0)); frames.append({"x": x, "y": 0, "w": im.width, "h": im.height}); x += im.width + 2
sheet.save('/tmp/claude-0/npcfix/npc.png'); json.dump(frames, open('/tmp/claude-0/npcfix/npc.json', 'w'), separators=(',', ':'))
bgv = Image.new('RGBA', sheet.size, (120, 60, 60, 255)); bgv.alpha_composite(sheet); bgv.convert('RGB').save('/tmp/claude-0/npcfix/on_red.png')
pap = Image.new('RGBA', sheet.size, (226, 219, 203, 255)); pap.alpha_composite(sheet); pap.convert('RGB').save('/tmp/claude-0/npcfix/on_paper.png')
print(frames)

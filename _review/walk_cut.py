# 걷기·달리기 다시 그림: grid sheets on white → game sheets. One crop box per character (the union of its frames, in cell
# coordinates) so the figure does not jitter; whites keyed out against the border, light paint toned to hanji like npc_cut.py.
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage
PAPER = np.array([234, 226, 210], np.float32)
def cells(name, cols, rows):
  a = np.asarray(Image.open(f'assets/raw/{name}.png').convert('RGB')).astype(np.float32); H, W, _ = a.shape
  return [a[int(r * H / rows):int((r + 1) * H / rows), int(c * W / cols):int((c + 1) * W / cols)] for r in range(rows) for c in range(cols)]
def mask(a):
  mn = a.min(2); sat = a.max(2) - mn; bg = (mn > 226) & (sat < 22)
  lab, _ = ndimage.label(bg); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
  fg = ndimage.binary_opening(~np.isin(lab, list(edge)), iterations=1)
  l2, n = ndimage.label(fg)
  if n: s = ndimage.sum(fg, l2, range(1, n + 1)); fg = np.isin(l2, [i + 1 for i, v in enumerate(s) if v > 300])
  l3, n3 = ndimage.label(bg & fg)   # big white pockets enclosed by the figure (between legs) are see-through
  if n3: s = ndimage.sum(bg & fg, l3, range(1, n3 + 1)); fg &= ~np.isin(l3, [i + 1 for i, v in enumerate(s) if v > 600])
  return fg
def grade(a, al):
  lum = a.mean(2, keepdims=True); col = a * .82 + lum * .18
  w = np.clip((lum - 150) / 105, 0, 1); col = (col * (1 - w * .8) + (col / 255 * PAPER) * (w * .8)) * .94
  band = (al > 0) & (al < .99); col[band] *= .85
  return col
def frames(name, cols, rows, h_out):
  cs = cells(name, cols, rows); ms = [mask(c) for c in cs]
  # common box: same size for every frame; each frame keeps its own feet line (bottom) and is centred on its own body
  boxes = [ndimage.find_objects(m.astype(int))[0] for m in ms]
  bw = max(b[1].stop - b[1].start for b in boxes) + 8; bh = max(b[0].stop - b[0].start for b in boxes) + 6
  out = []
  for c, m, b in zip(cs, ms, boxes):
    al = np.clip((ndimage.gaussian_filter(m.astype(np.float32), .7) - .15) / .7, 0, 1)
    rgba = np.dstack([np.clip(grade(c, al), 0, 255), al * 255]).astype(np.uint8)
    y1 = b[0].stop; cx = (b[1].start + b[1].stop) // 2
    canvas = np.zeros((bh, bw, 4), np.uint8); H, W = m.shape
    sy0, sx0 = y1 - bh, cx - bw // 2
    for yy in range(bh):
      sy = sy0 + yy
      if 0 <= sy < H:
        xs0, xs1 = max(0, sx0), min(W, sx0 + bw); canvas[yy, xs0 - sx0:xs1 - sx0] = rgba[sy, xs0:xs1]
    im = Image.fromarray(canvas, 'RGBA'); k = h_out / im.height
    out.append(im.resize((round(im.width * k), h_out), Image.LANCZOS))
  return out
def sheet(name, ims):
  W = sum(i.width for i in ims) + 2 * (len(ims) - 1); H = max(i.height for i in ims)
  sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fr = []; x = 0
  for i in ims: sh.paste(i, (x, 0)); fr.append({"x": x, "y": 0, "w": i.width, "h": i.height}); x += i.width + 2
  sh.save(f'assets/sprites/{name}.webp', quality=88, method=6); json.dump(fr, open(f'assets/sprites/{name}.json', 'w'), separators=(',', ':'))
  p = Image.new('RGBA', sh.size, (205, 198, 182, 255)); p.alpha_composite(sh); p.convert('RGB').save(f'{sys.argv[1]}/{name}.png')
  return fr
# 무명's run: 8 frames, the hat's centre recorded so the head rides level (MV_AX)
hero = frames('walk-hero', 4, 2, 190); sheet('mvrun', hero)
ax = []
for im in hero:
  a = np.asarray(im)[..., 3] > 100; ys = np.where(a.any(1))[0]; top = a[ys[0]:ys[0] + max(6, int(im.height * .1))]
  xs = np.where(top.any(0))[0]; ax.append(round(float(xs.mean()) / im.width, 3))
print('MV_AX mvrun', ax)
# the guardians' walks: one sheet, four frames each, in this order
B = ['gumiho', 'dokkaebi', 'haetae', 'bulgasari', 'baekho', 'talchum', 'sumun']
ims = []
for b in B: ims += frames('walk-' + b, 2, 2, 230)
sheet('bwalk', ims); print('bwalk', len(ims))

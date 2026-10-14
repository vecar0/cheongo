# cut the map prop sheets (one row of objects on white) into game sprite sheets: border-touching white goes, whites turn to hanji
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage
PAPER = np.array([234, 226, 210], np.float32)
def cut(name, maxh=240):
  a = np.asarray(Image.open(f'/home/user/akane/assets/raw/{name}.png').convert('RGB')).astype(np.float32)
  mn = a.min(2); sat = a.max(2) - mn
  bgish = (mn > 226) & (sat < 24)
  lab, _ = ndimage.label(bgish)
  edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
  fg = ~np.isin(lab, list(edge))
  fg = ndimage.binary_opening(fg, iterations=1)
  l2, n = ndimage.label(fg)
  if n:
    sizes = ndimage.sum(fg, l2, range(1, n + 1)); fg = np.isin(l2, [i + 1 for i, s in enumerate(sizes) if s > 300])
  l3, n3 = ndimage.label(bgish & fg)   # big enclosed white (gaps between legs, under rails) is see-through
  if n3:
    sizes = ndimage.sum(bgish & fg, l3, range(1, n3 + 1)); fg &= ~np.isin(l3, [i + 1 for i, s in enumerate(sizes) if s > 700])
  alpha = np.clip((ndimage.gaussian_filter(fg.astype(np.float32), .7) - .15) / .7, 0, 1)
  lum = a.mean(2, keepdims=True); col = a * .84 + lum * .16
  w = np.clip((lum - 150) / 105, 0, 1); col = col * (1 - w * .8) + (col / 255 * PAPER) * (w * .8); col = col * .96
  big = ndimage.binary_dilation(alpha > .05, iterations=5); lab, n = ndimage.label(big)
  objs = ndimage.find_objects(lab); areas = ndimage.sum(alpha > .05, lab, range(1, n + 1))
  keep = sorted([i for i in range(n) if areas[i] > 1500], key=lambda i: objs[i][1].start)
  merged = [[objs[i][1].start, objs[i][1].stop, i + 1] for i in keep]
  imgs = []
  for s, e, li in merged:
    m = (lab == li); al = alpha * m
    sub = al[:, s:e]; ys = np.where((sub > .05).any(1))[0]; y0, y1 = ys.min(), ys.max() + 1
    rgba = np.dstack([np.clip(col[y0:y1, s:e], 0, 255), al[y0:y1, s:e] * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA'); k = min(1, maxh / im.height)
    imgs.append(im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS))
  Wt = sum(i.width for i in imgs) + 2 * (len(imgs) - 1); Ht = max(i.height for i in imgs)
  sheet = Image.new('RGBA', (Wt, Ht), (0, 0, 0, 0)); fr = []; x = 0
  for im in imgs: sheet.paste(im, (x, 0)); fr.append({"x": x, "y": 0, "w": im.width, "h": im.height}); x += im.width + 2
  sheet.save(f'/home/user/akane/assets/sprites/{name}.webp', quality=88, method=6)
  json.dump({"f": fr} if False else fr, open(f'/home/user/akane/assets/sprites/{name}.json', 'w'), separators=(',', ':'))
  pap = Image.new('RGBA', sheet.size, (200, 190, 170, 255)); pap.alpha_composite(sheet); pap.convert('RGB').save(f'{sys.argv[1]}/c_{name}.jpg')
  print(name, len(fr), [(f['w'], f['h']) for f in fr])
for n in ['mapobj', 'md0', 'md1', 'md2', 'md3', 'md4']: cut(n)

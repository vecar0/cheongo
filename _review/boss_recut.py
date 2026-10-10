# recut every boss frame from its raw sheet: match each frame to a raw cell, cut the cell's white ground away
# (only white touching the cell border), keep enclosed whites, tone whites toward hanji, keep the old frame height
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage
ROOT = '/home/user/akane/assets/'
PAPER = np.array([228, 220, 204], np.float32)
def cells(raw, n):
  a = np.asarray(Image.open(raw).convert('RGB')).astype(np.float32); H, W, _ = a.shape; out = []
  for r in range(n):
    for c in range(n): out.append(a[int(r*H/n):int((r+1)*H/n), int(c*W/n):int((c+1)*W/n)])
  return out
def cut(cell, thr=242, tone=True, flat=False):
  mn = cell.min(2); sat = cell.max(2) - mn
  bgish = (mn > thr) & (sat < 14)
  lab, _ = ndimage.label(bgish); edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
  fg = ~np.isin(lab, list(edge)); fg = ndimage.binary_opening(fg, iterations=1)
  lab2, n = ndimage.label(fg)
  if n:
    sizes = ndimage.sum(fg, lab2, range(1, n + 1)); big = max(sizes); main = lab2 == (int(np.argmax(sizes)) + 1); near = ndimage.binary_dilation(main, iterations=14)
    edgeL = set(np.unique(np.concatenate([lab2[:3].ravel(), lab2[-3:].ravel(), lab2[:, :3].ravel(), lab2[:, -3:].ravel()]))) - {0}
    keep = [i + 1 for i, s in enumerate(sizes) if (s > big * .03 and not (i + 1 in edgeL and s < big * .2)) or (s > 120 and near[lab2 == i + 1].any() and i + 1 not in edgeL)]
    fg = np.isin(lab2, keep)
  fg = ndimage.binary_fill_holes(fg)
  # large enclosed pure-white pockets (between legs, under arms) are ground, not fur
  pockets = bgish & fg; lab3, n3 = ndimage.label(pockets)
  if n3: sizes = ndimage.sum(pockets, lab3, range(1, n3 + 1)); fg &= ~np.isin(lab3, [i + 1 for i, s in enumerate(sizes) if s > 1400])
  if flat:   # pure paper caught between the mist strokes is ground, however small the pocket
    pw = (mn > 246) & (sat < 8) & fg; l5, n5 = ndimage.label(pw)
    if n5: sz = ndimage.sum(pw, l5, range(1, n5 + 1)); fg &= ~np.isin(l5, [i + 1 for i, v in enumerate(sz) if v > 25])
  if flat:   # trapped ground: flat, untextured white anywhere inside goes too (scales and fur keep their strokes)
    g = cell.mean(2); sd = np.sqrt(np.maximum(ndimage.uniform_filter(g * g, 7) - ndimage.uniform_filter(g, 7) ** 2, 0))
    fw = (mn > 226) & (sat < 16) & (sd < 7); fw = ndimage.binary_opening(fw, iterations=1); l4, n4 = ndimage.label(fw)
    if n4: sz = ndimage.sum(fw, l4, range(1, n4 + 1)); fg &= ~ndimage.binary_dilation(np.isin(l4, [i + 1 for i, v in enumerate(sz) if v > 60]), iterations=1)
  alpha = np.clip((ndimage.gaussian_filter(fg.astype(np.float32), .8) - .2) / .6, 0, 1)
  if flat:   # white mist painted around it: unpainted paper, so it thins out to let the scene through; scales keep their ink
    g = cell.mean(2); wt = np.clip((g - 200) / 45, 0, 1) * np.clip(1 - (sat - 14) / 30, 0, 1)
    far = ndimage.distance_transform_edt(ndimage.minimum_filter(g, 3) > 140); wt *= np.clip((far - 3) / 6, 0, 1)
    alpha = alpha * (1 - .92 * ndimage.gaussian_filter(wt, 1.2))
  col = cell.copy()
  if tone:
    lum = cell.mean(2, keepdims=True); col = col * .86 + lum * .14
    w = np.clip((lum - 165) / 85, 0, 1) * np.clip(1 - (sat[..., None] - 20) / 50, 0, 1)
    col = col * (1 - w * .7) + (col / 255 * PAPER) * (w * .7)
    edge_band = (alpha > 0) & (alpha < .98); col[edge_band] *= .82   # no pale halo: the rim darkens into ink
  ys, xs = np.where(alpha > .05)
  return Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)[ys.min():ys.max()+1, xs.min():xs.max()+1], 'RGBA')
def sig(img):  # silhouette + luminance signature for matching
  g = img.convert('RGBA').resize((32, 32)); a = np.asarray(g).astype(np.float32); return np.concatenate([(a[..., 3] > 60).ravel() * 1.0, (a[..., :3].mean(2) * (a[..., 3] > 60)).ravel() / 255])
FLAT = {('bossA', 4), ('bossA', 5), ('bossC', 4), ('bossC', 5)}   # 이무기
def run(name, n):
  sheet = Image.open(f'{ROOT}sprites/{name}.webp').convert('RGBA'); fr = json.load(open(f'{ROOT}sprites/{name}.json'))
  cs = cells(f'{ROOT}raw/sheet-{name}.png', n); cuts = [cut(c) for c in cs]; csig = [sig(c) for c in cuts]
  out = []; used = []
  for i, f in enumerate(fr):
    s = sig(sheet.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))); d = [np.abs(s - c).mean() for c in csig]; j = i; used.append((i, j, round(min(d), 3)))
    im = cut(cs[j], flat=True) if (name, i) in FLAT else cuts[j]; k = f['h'] / im.height; im = im.resize((max(1, round(im.width * k)), f['h']), Image.LANCZOS); out.append(im)
  W = max(sheet.width, 1); rows = []; x = y = rowh = 0; frames = []
  for im in out:
    if x + im.width > 2000: x = 0; y += rowh + 2; rowh = 0
    frames.append({"x": x, "y": y, "w": im.width, "h": im.height}); x += im.width + 2; rowh = max(rowh, im.height)
  S = Image.new('RGBA', (max(f['x'] + f['w'] for f in frames), y + rowh), (0, 0, 0, 0))
  for im, f in zip(out, frames): S.paste(im, (f['x'], f['y']))
  S.save(f'/tmp/claude-0/bossre/{name}.webp', quality=90, method=6); json.dump(frames, open(f'/tmp/claude-0/bossre/{name}.json', 'w'), separators=(',', ':'))
  v = Image.new('RGBA', S.size, (214, 206, 190, 255)); v.alpha_composite(S); v.convert('RGB').resize((S.width // 2, S.height // 2)).save(f'/tmp/claude-0/bossre/{name}_view.png')
  print(name, used)
import sys
for name, n in [(a, 4 if a in ('bossE', 'bossF') else 3) for a in (sys.argv[1:] or ['bossA', 'bossB', 'bossC', 'bossD', 'bossE', 'bossF'])]: run(name, n)

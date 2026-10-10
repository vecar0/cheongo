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
def cut(cell, thr=242, tone=True):
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
  alpha = np.clip((ndimage.gaussian_filter(fg.astype(np.float32), .8) - .2) / .6, 0, 1)
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
def run(name, n):
  sheet = Image.open(f'{ROOT}sprites/{name}.webp').convert('RGBA'); fr = json.load(open(f'{ROOT}sprites/{name}.json'))
  cs = cells(f'{ROOT}raw/sheet-{name}.png', n); cuts = [cut(c) for c in cs]; csig = [sig(c) for c in cuts]
  out = []; used = []
  for i, f in enumerate(fr):
    s = sig(sheet.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))); d = [np.abs(s - c).mean() for c in csig]; j = i; used.append((i, j, round(min(d), 3)))
    im = cuts[j]; k = f['h'] / im.height; im = im.resize((max(1, round(im.width * k)), f['h']), Image.LANCZOS); out.append(im)
  W = max(sheet.width, 1); rows = []; x = y = rowh = 0; frames = []
  for im in out:
    if x + im.width > 2000: x = 0; y += rowh + 2; rowh = 0
    frames.append({"x": x, "y": y, "w": im.width, "h": im.height}); x += im.width + 2; rowh = max(rowh, im.height)
  S = Image.new('RGBA', (max(f['x'] + f['w'] for f in frames), y + rowh), (0, 0, 0, 0))
  for im, f in zip(out, frames): S.paste(im, (f['x'], f['y']))
  S.save(f'/tmp/claude-0/bossre/{name}.webp', quality=90, method=6); json.dump(frames, open(f'/tmp/claude-0/bossre/{name}.json', 'w'), separators=(',', ':'))
  v = Image.new('RGBA', S.size, (214, 206, 190, 255)); v.alpha_composite(S); v.convert('RGB').resize((S.width // 2, S.height // 2)).save(f'/tmp/claude-0/bossre/{name}_view.png')
  print(name, used)
for name, n in [('bossA', 3), ('bossB', 3), ('bossC', 3), ('bossD', 3), ('bossE', 4), ('bossF', 4)]: run(name, n)

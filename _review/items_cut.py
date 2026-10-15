# item icons: one sheet of ten on white (5 x 2) → assets/it/<id>.webp, white keyed to alpha, enclosed white (the coin's hole) cut out
import numpy as np
from PIL import Image
from scipy import ndimage
a = np.asarray(Image.open('assets/raw/icons-items.png').convert('RGB')).astype(np.float32)
H, W, _ = a.shape; ids = ["coin", "hon", "pill", "charm", "sp", "powder", "bok", "drumstick", "straw", "bell"]
for k, name in enumerate(ids):
  r, c = divmod(k, 5); cell = a[int(r * H / 2):int((r + 1) * H / 2), int(c * W / 5):int((c + 1) * W / 5)]
  mn = cell.min(2); sat = cell.max(2) - mn; bg = (mn > 232) & (sat < 18)
  lab, n = ndimage.label(bg); sizes = ndimage.sum(bg, lab, range(1, n + 1))
  edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
  holes = [i + 1 for i, s in enumerate(sizes) if s > 120]   # big white pockets (coin hole, gaps) go too
  clear = np.isin(lab, list(edge) + holes)
  fg = ~clear; l2, n2 = ndimage.label(fg); s2 = ndimage.sum(fg, l2, range(1, n2 + 1)); fg = np.isin(l2, [i + 1 for i, s in enumerate(s2) if s > 60])
  al = np.clip((ndimage.gaussian_filter(fg.astype(np.float32), .8) - .1) / .8, 0, 1)
  if name == "hon": al *= np.clip((255 - mn) / 60, .35, 1)   # the wisp is pale: let its light parts thin out instead of a white blob
  # ink-wash grade like the stage props: colour at 55%, values pressed toward the paper, a warm wash — they sit in the painting, not on it
  lum = cell.mean(2, keepdims=True); cell = np.clip((26 + lum * .74 + (cell - lum) * .55) * np.array([1.0, .96, .9]), 0, 255)
  ys, xs = np.where(al > .05); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
  im = Image.fromarray(np.dstack([cell, al * 255]).astype(np.uint8)[y0:y1, x0:x1], 'RGBA')
  s = 96 / max(im.size); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
  out = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); out.paste(im, ((96 - im.width) // 2, (96 - im.height) // 2)); out.save(f'assets/it/{name}.webp', quality=90, method=6)
print('ok')

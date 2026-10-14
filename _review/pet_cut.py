# pet sheet: kill the white fringe/splatter at the edges (color-to-alpha vs white in an edge band), tone interior whites to paper
import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd
src = sys.argv[1] if len(sys.argv) > 1 else 'assets/sprites/pet.webp'
a = np.array(Image.open(src).convert('RGBA')).astype(float)
rgb, al = a[..., :3], a[..., 3] / 255
solid = al > .5
dist = nd.distance_transform_edt(solid)            # px from the transparent outside
band = np.clip((14 - dist) / 10, 0, 1) ** .7         # 1 at the rim, fading out by 14px
# color-to-alpha against white: how much of this pixel is just white paper
wa = (255 - rgb.min(2)) / 255                       # 0 = pure white
wa = np.clip((wa - .04) / .6, 0, 1)
na = al * (1 - band * (1 - wa))
# small white specks (isolated splatter) go too
lab, n = nd.label(solid)
sizes = nd.sum(np.ones_like(al), lab, range(1, n + 1))
small = np.isin(lab, np.where(sizes < 60)[0] + 1)
bright = rgb.min(2) > 200
na[small & bright] = 0
# un-premultiply the rim so faded pixels keep their ink colour, not grey-white
k = np.where(na > 0.01, np.clip(wa, .15, 1), 1)[..., None]
col = np.where(band[..., None] > 0, 255 - (255 - rgb) / np.maximum(k, .15), rgb)
col = np.clip(col, 0, 255)
# interior whites → warm paper
lum = col.mean(2, keepdims=True)
paper = np.array([236, 226, 204.])
t = np.clip((lum - 200) / 55, 0, 1)
col = col * (1 - t) + (col * paper / 255) * t
# ink-wash grade like the stage: colour at 55%, blacks to soft ink, a warm paper wash, so the beast sits in the painting
lum = col.mean(2, keepdims=True)
col = np.clip((24 + lum * .86 + (col - lum) * .55) * np.array([1.0, .97, .92]), 0, 255)
out = np.dstack([col, np.clip(na, 0, 1) * 255]).astype(np.uint8)
Image.fromarray(out, 'RGBA').save('assets/sprites/pet.webp', 'WEBP', quality=92, method=6)

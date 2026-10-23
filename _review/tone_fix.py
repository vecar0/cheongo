# 부스판 tone pass: scenery that glared white on the paper is brought down to the cliff's grey, and the two loud colour accents
# (청사초롱 on its post, the kite) are washed toward ink so nothing outshines the swordsman and the guards.
#   python3 _review/tone_fix.py            (rewrites assets/sprites/{slabs,mapobj,objects}.webp in place; originals are in git)
import json, numpy as np
from PIL import Image
S = 'assets/sprites/'
def load(n): return np.asarray(Image.open(S + n + '.webp').convert('RGBA')).astype(np.float32), json.load(open(S + n + '.json'))
def save(n, a): Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA').save(S + n + '.webp', quality=90, method=6)
def frame(f, i): f = f.get('f', f) if isinstance(f, dict) else f; g = f[i]; return (g[:4] if isinstance(g, list) else (g['x'], g['y'], g['w'], g['h']))
def rolloff(a, knee, k):   # lights above the knee are compressed; hue kept
    L = a[..., 0] * .3 + a[..., 1] * .59 + a[..., 2] * .11; Ln = np.where(L > knee, knee + (L - knee) * k, L); r = np.where(L > 1, Ln / np.maximum(L, 1), 1)
    for c in range(3): a[..., c] *= r
def wash(a, sat, toward=(52, 48, 46), mix=0.0):   # take colour out (sat 0 = grey) and lean toward ink
    L = a[..., 0] * .3 + a[..., 1] * .59 + a[..., 2] * .11
    for c in range(3): a[..., c] = (L + (a[..., c] - L) * sat) * (1 - mix) + toward[c] * mix
a, f = load('slabs'); rolloff(a, 118, .45); a[..., :3] = a[..., :3] * .96 + np.array([4, 3, 2]); save('slabs', a)
a, f = load('mapobj'); x, y, w, h = frame(f, 6); sub = a[y:y+h, x:x+w]; wash(sub, .45, mix=.12); a[y:y+h, x:x+w] = sub; save('mapobj', a)   # 청사초롱 on its post
a, f = load('objects')
for i in (2,):   # the kite
    x, y, w, h = frame(f, i); sub = a[y:y+h, x:x+w]; wash(sub, .5, mix=.08); a[y:y+h, x:x+w] = sub
save('objects', a)
print('ok')

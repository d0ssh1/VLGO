"""«Сошлись» geometry: a big photo window (the place), four friend drops on necks
along the top, a pool under the end of the word. Writes match4 into shapes.json."""
import sys, json, math
import numpy as np
sys.path.insert(0, '/home/claude/render/v12'); sys.path.insert(0, '/home/claude/vlgo-app/scripts')
from vlgo import Shape, K, MX, MY
from gen_cards import contours
from scipy import ndimage
P = '/home/claude/vlgo-app/src/data/shapes.json'
S = json.load(open(P)); B = json.load(open('/tmp/shapes_backup.json'))
TA = math.tan(math.radians(12.3 * 0.65))
WORD_Y, WORD_S = 590, 124
wtop = lambda x: WORD_Y - 0.72 * WORD_S - (x - 8) * TA          # top of «СОШЛИСЬ!»
# window: a full, soft pebble (metaball of ellipses) in x 16..374, from y 140 down
# to just above the tilted word — the lighthouse photo gets ~2× the old area
win = Shape()
for (cx, cy, rx, ry, an) in [(195, 300, 176, 150, 0), (120, 250, 104, 108, -8), (276, 240, 98, 100, 8),
                            (140, 390, 120, 80, -6), (262, 372, 110, 74, 6)]:
    win.ellipse(cx, cy, rx, ry, an)
win.smooth(12)
clip = Shape(); clip.rect(24, 140, 342, 900)
win.m = np.minimum(win.m, clip.m)
cut = Shape().poly([(-80, wtop(-80) - 18), (470, wtop(470) - 18), (470, 1000), (-80, 1000)])
win.sub(cut); win.smooth(8)
DROPS = [(106, 84, 25), (172, 72, 25), (238, 84, 25), (304, 74, 25)]
pt = win.dilate(18)
for (x, y, r) in DROPS:
    pt.neck(x, y, x + (195 - x) * 0.06, y + 64, r * 0.62, w2=r * 1.3)
pt.ellipse(330, wtop(330) + 40, 84, 78, -8)        # pool under «СЬ!»
pt.smooth(4)
pt.add(win.dilate(14)).smooth(2)
for (x, y, r) in DROPS:
    pt.circle(x, y, r)
pt.smooth(2)
D = pt.path(csig=4, step=7); pd = win.path(csig=5, step=8, min_area=3000)
pc = contours(pd)
xs = [p[0] for c in pc for p in c]; ys = [p[1] for c in pc for p in c]
m = S['match4']
m['paint'] = [{'c': contours(D), 'photo': pc, 'soft': False}]
m['photos'] = [{'c': pc, 'img': 'mayak', 'box': [min(xs) - 4, min(ys) - 4, max(xs) - min(xs) + 8, max(ys) - min(ys) + 8], 'shade': False}]
json.dump(S, open(P, 'w'), separators=(',', ':'))
# drop centres = deepest point of each drop (labels sit exactly there)
dt = ndimage.distance_transform_edt(pt.m > 127) / K
out = []
for (x, y, r) in DROPS:
    u0, v0 = int((x + MX) * K), int((y + MY) * K); R = int(10 * K)
    sub = dt[v0 - R:v0 + R, u0 - R:u0 + R]; iy, ix = np.unravel_index(sub.argmax(), sub.shape)
    out.append((round((u0 - R + ix) / K - MX, 1), round((v0 - R + iy) / K - MY, 1), round(sub.max(), 1)))
import cv2
old = Shape().poly([tuple(q) for q in B['match4']['photos'][0]['c'][0]])
print('window px area ratio', round((win.m > 127).sum() / (old.m > 127).sum(), 2))
print('drops', out)

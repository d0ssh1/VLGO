"""Card bases, round 3 (designer concept): smooth blobmaker-style shapes, but
composed — the photo window is NOT a scaled copy centred in the paint:
  - window centroid ≥ 60 px from the paint's; the paint rim varies 0 … 150 px;
  - the window breaks out onto paper on one side and/or the paint bleeds off an edge;
  - most of the paint mass sits low, behind the word (letters turn paper-white);
  - window and paint differ in point count, randomness and rotation.
Safe zones: no paint over the top-left buttons (x<120, y<104) or the status bar
(y<48); paint ends by y 636; window 24 px from the screen sides, 22 px above the word.
Run: python3 scripts/gen_blobs.py → 'cards' in src/data/shapes.json + /tmp/sh/blobs.png
"""
import sys, json, math, random
import numpy as np
sys.path.insert(0, '/home/claude/render/v12')
from vlgo import Shape

OUT = '/home/claude/vlgo-app/src/data/shapes.json'
TA = math.tan(math.radians(9 * 0.65))
SIZE_REF = 160
def bl(x): return 618 - (x - 20) * TA
def wt(x): return bl(x) - 0.72 * SIZE_REF


def blob(x0, y0, x1, y1, n=6, jit=0.2, seed=1, rot=0.0, samples=160):
    """blobmaker shape filling the box: n points on an ellipse, radius jitter, rotated, CR spline"""
    r = random.Random(seed)
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    a0 = r.uniform(0, 2 * math.pi / n)
    P = []
    for i in range(n):
        a = a0 + 2 * math.pi * i / n + r.uniform(-0.15, 0.15)
        k = 1 - r.uniform(0, jit)
        P.append((math.cos(a) * rx * k, math.sin(a) * ry * k))
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    P = [(cx + x * c - y * s, cy + x * s + y * c) for x, y in P]
    out, per = [], samples // n
    for i in range(n):
        p0, p1, p2, p3 = P[i - 1], P[i], P[(i + 1) % n], P[(i + 2) % n]
        for st in range(per):
            t = st / per; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                                    + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)))
    return out


def contour(pts, step=6.0):
    A = np.array(list(pts) + [pts[0]])
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(A, axis=0).T))]
    t = np.arange(0, d[-1], step)
    return [[round(float(np.interp(v, d, A[:, 0])), 1), round(float(np.interp(v, d, A[:, 1])), 1)] for v in t]


def parse(d):
    import re
    out = []
    for sub in re.findall(r'M[^M]+', d or ''):
        nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', sub)]
        pts = [(nums[0], nums[1])] + [(nums[i + 4], nums[i + 5]) for i in range(2, len(nums) - 5, 6)]
        out.append([[round(x, 1), round(y, 1)] for x, y in pts[:-1]])
    return out


# name: paint blobs [(x0,y0,x1,y1,n,jit,seed,rot)], window (x0,y0,x1,y1,n,jit,seed,rot), drops [(x,y,d)]
B = {
    'serp':    ([(120, 170, 470, 560, 6, 0.2, 9, 20), (90, 400, 400, 640, 6, 0.2, 10, -6)], (28, 116, 330, 430, 7, 0.16, 11, -8), []),
    'dve':     ([(236, 150, 470, 320, 5, 0.18, 12, 0), (-80, 420, 260, 640, 6, 0.18, 13, 0), (170, 260, 300, 470, 5, 0.1, 14, 30)], (40, 140, 350, 460, 6, 0.16, 15, -6), []),
    'ugly':    ([(150, 40, 480, 420, 6, 0.18, 22, 10), (-80, 480, 160, 640, 5, 0.18, 23, 0)], (30, 150, 340, 470, 6, 0.16, 24, -6), []),
    'linza':   ([(-60, 360, 450, 640, 6, 0.16, 7, -4)], (40, 120, 350, 440, 5, 0.12, 8, 12), [(330, 96, 40)]),
    'bereg':   ([(-80, 100, 250, 620, 7, 0.18, 4, -8), (-40, 430, 250, 640, 6, 0.2, 5, 0)], (60, 128, 366, 448, 6, 0.18, 6, 10), [(356, 120, 26)]),
    'potok':   ([(200, 60, 470, 560, 7, 0.18, 1, 8), (150, 440, 410, 640, 6, 0.2, 2, 0)], (30, 140, 336, 462, 7, 0.16, 3, -10), [(56, 446, 30)]),
    'razliv':  ([(40, 96, 470, 636, 6, 0.22, 25, -18)], (24, 104, 324, 404, 6, 0.14, 26, 8), [(350, 96, 22)]),
}
# three more: mirror images of the strongest (the safe zones are re-applied after mirroring)
def mirror(spec):
    P, W, D = spec
    mb = lambda b: (390 - b[2], b[1], 390 - b[0], b[3], b[4], b[5], b[6] + 100, -b[7])
    return ([mb(b) for b in P], mb(W), [(390 - x, y, d) for x, y, d in D])
for k in ('serp', 'dve', 'ugly'):
    B[k + '-m'] = mirror(B[k])


def build(name):
    paints, W, drops = B[name]
    pt = Shape()
    for b in paints:
        pt.poly(blob(*b, samples=200))
    pt.smooth(9)
    # safe zones: top-left buttons, status bar, below the word
    pt.sub(Shape().rect(-80, -100, 200, 204).smooth(6))
    pt.sub(Shape().rect(-100, -100, 600, 148).smooth(6))
    pt.sub(Shape().rect(-100, 628, 600, 400).smooth(4))
    pt.smooth(3)
    for (x, y, d) in drops:
        pt.poly(blob(x - d / 2, y - d / 2 * 0.94, x + d / 2, y + d / 2 * 0.94, 6, 0.12, int(x + y)))
    win = blob(*W, samples=200)
    win = [(min(max(x, 24), 366), min(y, wt(x) - 22)) for x, y in win]
    ws = Shape().poly(win).smooth(4)
    pc = parse(ws.path(csig=4, step=6, min_area=3000))
    D = parse(pt.path(csig=4, step=6, min_area=60))
    xs = [p[0] for c in pc for p in c]; ys = [p[1] for c in pc for p in c]
    return {
        'kind': name,
        'paint': [{'c': D, 'photo': pc, 'soft': False}],
        'photos': [{'c': pc, 'img': 'crab', 'box': [round(min(xs) - 4), round(min(ys) - 4), round(max(xs) - min(xs) + 8), round(max(ys) - min(ys) + 8)], 'shade': False}],
        'stars': [], 'words': [{'text': '', 'x': 20, 'y': 618, 'ang': -9, 'size': 170, 'min': 60, 'rightPad': 14}],
    }


if __name__ == '__main__':
    cards = [build(n) for n in B]
    data = json.load(open(OUT))
    data['cards'] = cards
    data['cardsRef'] = {'top': round(wt(20), 1)}
    json.dump(data, open(OUT, 'w'), separators=(',', ':'))
    from PIL import Image, ImageDraw
    sheet = Image.new('RGB', (5 * 200 + 10, 2 * 430 + 10), (40, 40, 40))
    for k, c in enumerate(cards):
        im = Image.new('RGB', (390, 844), (244, 236, 226)); d = ImageDraw.Draw(im)
        for cc in c['paint'][0]['c']: d.polygon([tuple(p) for p in cc], fill=(15, 70, 230))
        for cc in c['photos'][0]['c']: d.polygon([tuple(p) for p in cc], fill=(150, 150, 150))
        d.polygon([(20, wt(20)), (372, wt(372)), (372, bl(372)), (20, bl(20))], outline=(0, 0, 0))
        d.text((8, 820), c['kind'], fill=(0, 0, 0))
        sheet.paste(im.resize((190, 411)), (10 + (k % 5) * 200, 10 + (k // 5) * 430))
    sheet.save('/tmp/sh/blobs.png')
    print('ok')

"""Card bases from the traced reference shapes (the ones that looked interesting:
feed hero, original swipe card, «Сошлись»), with every appendix removed by a
morphological opening (anything narrower than ~2·R px is cut off and the cut is
re-rounded). Variants: originals, mirrors and gentle fixed warps.
Also restores the feed hero from the reference — without its tail.
Run: python3 scripts/gen_traced.py
"""
import sys, json, math
import numpy as np, cv2
sys.path.insert(0, '/home/claude/render/v12'); sys.path.insert(0, '/home/claude/vlgo-app/scripts')
from vlgo import Shape, K
from gen_blobs import parse, wt, bl

OUT = '/home/claude/vlgo-app/src/data/shapes.json'
REF = json.load(open('/tmp/shapes_backup.json'))


def open_(sh, r):
    k = int(r * K); se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))
    sh.m = cv2.morphologyEx(sh.m, cv2.MORPH_OPEN, se); return sh


def src(key):
    sp = REF[key]
    paint = max(sp['paint'][0]['c'], key=len)
    win = sp['photos'][0]['c'][0]
    return paint, win


def transform(pts, wbox, tbox, mirror=False, warp=None):
    (ax0, ay0, ax1, ay1), (x0, y0, x1, y1) = wbox, tbox
    sx, sy = (x1 - x0) / (ax1 - ax0), (y1 - y0) / (ay1 - ay0)
    out = []
    for x, y in pts:
        u = (x - ax0) / (ax1 - ax0)
        if mirror: u = 1 - u
        X, Y = x0 + u * (x1 - x0), y0 + (y - ay0) * sy
        if warp:
            a, f, ph = warp
            X += a * math.sin(Y * f + ph); Y += a * 0.7 * math.sin(X * f * 1.3 + ph * 1.7)
        out.append((X, Y))
    return out


def card(name, key, mirror=False, warp=None, cut=30):
    paint, win = src(key)
    w = np.array(win); wbox = (*w.min(0), *w.max(0))
    tbox = (38, 120, 352, wt(195) - 34)
    P = transform(paint, wbox, tbox, mirror, warp)
    W = transform(win, wbox, tbox, mirror, warp)
    ws = Shape().poly(W).smooth(5)
    k = int(30 * K); ws.m = cv2.morphologyEx(ws.m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1)))  # fill bites in the picture
    ws.m = np.minimum(ws.m, Shape().rect(32, 0, 326, 900).m)
    ws.sub(Shape().poly([(-80, wt(-80) - 30), (470, wt(470) - 30), (470, 1000), (-80, 1000)])); ws.smooth(5)
    pt = Shape().poly(P)
    pt.add(ws.dilate(16)).smooth(4)
    pt.sub(Shape().rect(-100, -100, 600, 196).smooth(6))   # nothing poking up toward the status bar
    pt.sub(Shape().rect(-80, -100, 206, 216).smooth(8))
    pt.sub(Shape().poly([(-80, wt(-80) - 8), (470, wt(470) - 8), (470, 1000), (-80, 1000)]).smooth(4))
    open_(pt, cut).smooth(3)                      # appendices gone, cuts re-rounded
    pt.add(ws.dilate(14)).smooth(2)
    D = parse(pt.path(csig=4, step=6, min_area=400))
    pc = parse(ws.path(csig=4, step=6, min_area=3000))
    xs = [p[0] for c in pc for p in c]; ys = [p[1] for c in pc for p in c]
    return {'kind': name, 'paint': [{'c': D, 'photo': pc, 'soft': False}],
            'photos': [{'c': pc, 'img': 'crab', 'box': [round(min(xs) - 4), round(min(ys) - 4), round(max(xs) - min(xs) + 8), round(max(ys) - min(ys) + 8)], 'shade': False}],
            'stars': [], 'words': [{'text': '', 'x': 20, 'y': 618, 'ang': -9, 'size': 170, 'min': 60, 'rightPad': 14}]}


SPEC = [
    ('lenta', 'feed', False, None), ('lenta-m', 'feed', True, None),
    ('kartochka', 'swipe', False, None), ('kartochka-m', 'swipe', True, None),
    ('lenta-v1', 'feed', False, (10, 0.018, 1.0)), ('lenta-v2', 'feed', True, (12, 0.015, 2.6)),
    ('kartochka-v1', 'swipe', False, (10, 0.017, 4.1)), ('kartochka-v2', 'swipe', True, (11, 0.016, 5.3)),
    ('lenta-v3', 'feed', False, (13, 0.013, 3.7)), ('lenta-v4', 'feed', True, (9, 0.021, 0.3)),
]

if __name__ == '__main__':
    data = json.load(open(OUT))
    data['cards'] = [card(*s) for s in SPEC]
    data['cardsRef'] = {'top': round(wt(20), 1)}
    # feed hero: the reference shape again, tail removed
    f, fr = data['feed'], REF['feed']
    main = max(fr['paint'][0]['c'], key=len)
    pt = Shape().poly(main)
    ws = Shape().poly(fr['photos'][0]['c'][0])
    open_(pt, 22).smooth(3); pt.add(ws.dilate(12)).smooth(2)
    f['paint'][0] = {**fr['paint'][0], 'c': parse(pt.path(csig=4, step=6, min_area=400))}
    f['photos'][0] = fr['photos'][0] | {'img': f['photos'][0].get('img', 'rooftop')}
    json.dump(data, open(OUT, 'w'), separators=(',', ':'))
    print('ok')

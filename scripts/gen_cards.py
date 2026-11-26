"""Swipe-card blots.

The photo windows are the organic outlines traced from the client's reference
(swipe card, feed hero, «Сошлись»), re-fitted to the card area; around each a
liquid paint mass is drawn by hand: fat pours and pools, never thin tails.

All compositions are drawn for a reference giant word (1 line, 160 px). The
paint's lower edge runs ~12 px above the word, so there is no empty hole
between picture and name; pours cross the word to make letters paper-white.
In the app the drawing is fitted to the real name (lines / size) by a vertical
map along the word's tilt (fitToWord in src/screens/art.js).

Run: python3 scripts/gen_cards.py → 'cards' in src/data/shapes.json + /tmp/sh/cards.png
"""
import sys, math, json, re
import numpy as np, cv2
sys.path.insert(0, '/home/claude/render/v12')
from vlgo import Shape, K

OUT = '/home/claude/vlgo-app/src/data/shapes.json'
SRC = '/tmp/shapes_backup.json'        # the traced reference geometry
TA = math.tan(math.radians(9 * 0.65))  # the app draws the word at −5.85°
SIZE_REF = 160


def bl(x): return 618 - (x - 20) * TA            # baseline
def wt(x): return bl(x) - 0.72 * SIZE_REF        # top of the reference word


def contours(d):
    out = []
    for sub in re.findall(r'M[^M]+', d or ''):
        nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', sub)]
        pts = [(nums[0], nums[1])]
        rest = nums[2:]
        for i in range(0, len(rest) - 5, 6):
            pts.append((rest[i + 4], rest[i + 5]))
        if len(pts) > 3 and abs(pts[-1][0] - pts[0][0]) < 0.5 and abs(pts[-1][1] - pts[0][1]) < 0.5:
            pts = pts[:-1]
        out.append([[round(x, 1), round(y, 1)] for x, y in pts])
    return out


# ------------------------------------------------------------- metaball kit
# Shapes are unions of big soft ellipses, then a gaussian+threshold merge: the
# same physics as two drops of paint touching. That gives liquid silhouettes —
# soft lobes, flared necks — instead of drawn polygons.

def E(sh, cx, cy, rx, ry, ang=0):
    sh.ellipse(cx, cy, rx, ry, ang)
    return sh


# ten designed bases. No randomness here: the app only adds the living motion.
# Window rules: x within 38..352 (full rim + paper margin on both sides),
# bottom 30 px above the reference word; paint mass rim ≥ 16 px.
WIN = {
    'peb': [(195, 290, 150, 150, 0), (128, 240, 86, 108, -10), (262, 236, 88, 104, 10), (195, 372, 140, 84, 0)],
    'tilt': [(190, 270, 148, 140, -14), (282, 350, 64, 92, 15), (118, 376, 82, 72, 0), (210, 330, 120, 110, 0)],
    'soft': [(195, 286, 152, 146, 0), (195, 196, 120, 60, 0), (195, 380, 140, 74, 0)],
    'left': [(168, 270, 128, 140, -6), (178, 372, 132, 82, 4), (212, 210, 84, 74, 0)],
    'lobes': [(132, 236, 92, 106, -6), (260, 230, 94, 110, 8), (195, 344, 152, 110, 0), (195, 214, 90, 70, 0)],
    'right': [(222, 270, 128, 140, 6), (212, 372, 132, 82, -4), (178, 210, 84, 74, 0)],
}
def window(key):
    sh = Shape()
    for (cx, cy, rx, ry, a) in WIN[key]:
        E(sh, 195 + (cx - 195) * 0.93, cy, rx * 0.93, ry, a)
    sh.smooth(12)
    clip = Shape(); clip.rect(38, 0, 314, 900)          # never closer than 38 px to a side
    sh.m = np.minimum(sh.m, clip.m)
    return sh.smooth(6)

BAND = lambda pt, x0=40, x1=350: E(pt, (x0 + x1) / 2, 462, (x1 - x0) / 2, 26, -6)

def b_istok(pt):    # pour from the top centre, a pool under the last letters
    pt.neck(196, -60, 196, 140, 96, w2=64); E(pt, 196, -20, 90, 50)
    E(pt, 326, 528, 74, 84, -6); BAND(pt)
def b_volna(pt):    # a wave from the left edge, a curl and a drop top-right
    E(pt, -28, 300, 92, 220, 4); E(pt, 330, 120, 50, 30, 24); BAND(pt)
def b_lenta(pt):    # the name lies on a paint ribbon
    pt.poly([(-60, wt(-60) - 20), (460, wt(460) - 20), (460, bl(460) + 18), (-60, bl(-60) + 18)])
    pt.neck(196, 420, 196, wt(196) - 6, 130, w2=170)
def b_krylo(pt):    # a wing off the right edge reaching under the last letters
    E(pt, 396, 280, 80, 200); E(pt, 368, 520, 62, 90); BAND(pt, 40, 320)
def b_kapli(pt):    # splash drops top-right + a pool under the first letters
    E(pt, 36, 556, 100, 78, -6); BAND(pt)
def b_ruchey(pt):   # a stream pours from the top-right corner, a pool under the first letters
    pt.neck(420, -40, 320, 150, 80, bend=-20, w2=60); E(pt, 400, -10, 70, 60)
    E(pt, 50, 552, 92, 72, -6); BAND(pt)
def b_ostrov(pt):   # an island: one fat drop runs into the middle of the name
    pt.neck(200, 440, 206, 590, 74, w2=58); E(pt, 206, 600, 44, 34, -6); BAND(pt)
def b_dvoe(pt):     # a second small pool joined top-right on a neck
    pt.neck(312, 160, 338, 104, 40, w2=30); E(pt, 340, 96, 40, 34, 10)
    E(pt, 326, 528, 72, 82, -6); BAND(pt)
def b_priliv(pt):   # the tide rises from the bottom-left: the first half of the name on paint
    E(pt, 40, 520, 170, 104, -6); E(pt, -10, 360, 60, 160); BAND(pt)
def b_korona(pt):   # a crown of drops on necks along the top
    for x, y in ((120, 104), (196, 90), (272, 104)):
        pt.neck(x, y, x, 180, 30, w2=52); E(pt, x, y, 32, 32)
    BAND(pt)

COMPS = {
    'istok':  ('peb', b_istok, []),
    'volna':  ('tilt', b_volna, [(370, 168, 10, None)]),
    'lenta':  ('soft', b_lenta, [(338, 86, 12, None)]),
    'krylo':  ('left', b_krylo, [(150, 90, 11, None)]),
    'kapli':  ('lobes', b_kapli, [(318, 84, 15, None), (350, 112, 8, None)]),
    'ruchey': ('left', b_ruchey, []),
    'ostrov': ('soft', b_ostrov, [(330, 92, 14, None), (300, 70, 7, None)]),
    'dvoe':   ('left', b_dvoe, []),
    'priliv': ('right', b_priliv, [(330, 96, 12, None)]),
    'korona': ('soft', b_korona, []),
}


def build(name, mirror=False):
    wkey, comp, drops = COMPS[name]
    win = window(wkey)
    pt = win.dilate(18)
    comp(pt)
    pt.smooth(11)
    pt.add(win.dilate(12)).smooth(3)
    for (x, y, r, to) in (drops if not mirror else [d for d in drops if d[0] < 250]):
        if to:
            pt.neck(x, y, to[0], to[1], r * 0.55, bend=8, w2=r * 0.95)
        pt.circle(x, y, r)
    pt.smooth(3)
    if mirror:
        for sh in (pt, win):
            sh.m = cv2.flip(sh.m, 1)
        # nothing may land behind the back / undo buttons (top-left)
        btn = Shape(); btn.rect(0, 30, 140, 90)
        guard = pt.copy(); guard.sub(btn)
    # fill small enclosed paper holes (components of the background that touch no canvas edge)
    bg = (pt.m <= 127).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(bg, connectivity=4)
    H_, W_ = bg.shape
    for k in range(1, n):
        x, y, w, h, area = st[k]
        if x > 0 and y > 0 and x + w < W_ and y + h < H_ and area < 9000 * K * K:
            pt.m[lab == k] = 255
    D = pt.path(csig=5, step=7, min_area=120)
    pd = win.path(csig=6, step=8, min_area=3000)
    pc = contours(pd)
    xs = [p[0] for cc in pc for p in cc]; ys = [p[1] for cc in pc for p in cc]
    box = [round(min(xs) - 4), round(min(ys) - 4), round(max(xs) - min(xs) + 8), round(max(ys) - min(ys) + 8)]
    return {
        'kind': name + ('-m' if mirror else ''),
        'paint': [{'c': contours(D), 'photo': pc, 'soft': False}],
        'photos': [{'c': pc, 'img': 'crab', 'box': box, 'shade': False}],
        'stars': [], 'words': [{'text': '', 'x': 20, 'y': 618, 'ang': -9, 'size': 170, 'min': 60, 'rightPad': 14}],
    }


def preview(cards, path):
    from PIL import Image, ImageDraw
    cols = 5; rows = (len(cards) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 200 + 10, rows * 430 + 10), (40, 40, 40))
    for k, c in enumerate(cards):
        im = Image.new('RGB', (390, 844), (244, 236, 226)); d = ImageDraw.Draw(im)
        for cc in c['paint'][0]['c']: d.polygon([tuple(p) for p in cc], fill=(34, 70, 228))
        for cc in c['photos'][0]['c']: d.polygon([tuple(p) for p in cc], fill=(150, 150, 150))
        d.polygon([(20, wt(20)), (372, wt(372)), (372, bl(372)), (20, bl(20))], outline=(0, 0, 0))
        d.text((8, 820), c['kind'], fill=(0, 0, 0))
        sheet.paste(im.resize((190, 411)), (10 + (k % cols) * 200, 10 + (k // cols) * 430))
    sheet.save(path)


if __name__ == '__main__':
    # mirror only the compositions whose top-right features would not end up
    # behind the top-left buttons
    cards = [build(n) for n in COMPS]
    data = json.load(open(OUT))
    data['cards'] = cards
    data['cardsRef'] = {'top': round(wt(20), 1)}
    json.dump(data, open(OUT, 'w'), separators=(',', ':'))
    preview(cards, '/tmp/sh/cards.png')
    print('ok', [(c['kind'], sum(len(cc) for cc in c['paint'][0]['c'])) for c in cards])

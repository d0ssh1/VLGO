"""Blob with the picture inside (the feed-hero idea), done cleanly:
  paint  = one blobmaker shape (7–9 points, moderate jitter) — curious outline,
           soft dents, but no outgrowths;
  window = the paint eroded by a rim that varies around the shape
           (thin ~14 px on one side, a wide ~56 px pool on the other), so the
           picture follows the blob's outline without looking like a donut.
Writes swipe 'cards' (10 bases) and the feed hero into src/data/shapes.json.
"""
import sys, json, math, random
import numpy as np, cv2
sys.path.insert(0, '/home/claude/render/v12')
from vlgo import Shape, K, MX, MY
from gen_blobs import blob, parse, wt, bl
from scipy import ndimage

OUT = '/home/claude/vlgo-app/src/data/shapes.json'


def pebble(box, n, jit, seed, rot, thin=14, wide=56, phi=45, word=True):
    x0, y0, x1, y1 = box
    # blobmaker radii shrink by up to `jit`: grow the box so the blob really fills it
    g = 1 / (1 - jit * 0.55)
    cxb, cyb = (x0 + x1) / 2, (y0 + y1) / 2
    bx0, bx1 = cxb - (cxb - x0) * g, cxb + (x1 - cxb) * g
    by0, by1 = cyb - (cyb - y0) * g, cyb + (y1 - cyb) * g
    pt = Shape().poly(blob(bx0, by0, bx1, by1, n, jit, seed, rot, samples=240)).smooth(7)
    pt.sub(Shape().rect(-100, -100, 600, 140).smooth(4))       # status bar stays paper
    pt.sub(Shape().rect(-80, -100, 214, 224).smooth(8))        # 24 px clear of the back/undo buttons
    # make sure nothing pokes out: open (erode+dilate) removes any narrow lobe
    k = int(26 * K)
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))
    pt.m = cv2.morphologyEx(pt.m, cv2.MORPH_OPEN, se)
    pt.smooth(3)
    dt = ndimage.distance_transform_edt(pt.m > 127) / K
    H, W = dt.shape
    yy, xx = np.mgrid[0:H, 0:W]
    X, Y = xx / K - MX, yy / K - MY
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    ang = np.arctan2(Y - cy, X - cx)
    rim = thin + (wide - thin) * (0.5 + 0.5 * np.cos(ang - math.radians(phi))) ** 1.6
    win = Shape(); win.m = ((dt > rim) * 255).astype(np.uint8)
    if word:   # the blob ends just above the word (no letter tops clipped); picture inside it
        win.sub(Shape().poly([(-80, wt(-80) - 34), (470, wt(470) - 34), (470, 1000), (-80, 1000)]))
        pt.sub(Shape().poly([(-80, wt(-80) - 8), (470, wt(470) - 8), (470, 1000), (-80, 1000)]))
        pt.smooth(5)
    win.m = np.minimum(win.m, Shape().rect(32, 0, 326, 900).m)   # picture ≥ 32 px from the screen sides
    win.smooth(8)
    win.m = np.minimum(win.m, pt.m)
    D = parse(pt.path(csig=4, step=6, min_area=200))
    pc = parse(win.path(csig=5, step=6, min_area=3000))
    xs = [p[0] for c in pc for p in c]; ys = [p[1] for c in pc for p in c]
    return D, pc, [round(min(xs) - 4), round(min(ys) - 4), round(max(xs) - min(xs) + 8), round(max(ys) - min(ys) + 8)]


# name, paint box, n, jitter, seed, rotation, thin, wide, wide-side angle (0 = right, 90 = down)
CARDS = [
    ('galka', (14, 150, 376, 482), 8, 0.26, 101, 0, 18, 58, 90),
    ('rakushka', (40, 110, 350, 482), 7, 0.26, 102, 36, 18, 56, 0),
    ('gorka', (14, 150, 376, 482), 8, 0.24, 103, 72, 18, 60, 120),
    ('list', (40, 110, 350, 482), 7, 0.28, 104, 108, 18, 56, 180),
    ('ostrov', (14, 150, 376, 482), 8, 0.26, 105, 144, 18, 62, 100),
    ('kaplya', (40, 110, 350, 482), 7, 0.24, 106, 180, 18, 56, 0),
    ('oblako', (14, 150, 376, 482), 8, 0.22, 107, 216, 18, 52, 135),
    ('bukhta', (40, 110, 350, 482), 8, 0.25, 108, 252, 18, 60, 180),
    ('veter', (14, 150, 376, 482), 7, 0.26, 109, 288, 18, 58, 45),
    ('medusa', (40, 110, 350, 482), 8, 0.26, 110, 324, 18, 56, 110),
]

if __name__ == '__main__':
    data = json.load(open(OUT))
    cards = []
    for (name, box, n, jit, seed, rot, thin, wide, phi) in CARDS:
        D, pc, b = pebble(box, n, jit, seed, rot, thin, wide, phi)
        cards.append({'kind': name, 'paint': [{'c': D, 'photo': pc, 'soft': False}],
                      'photos': [{'c': pc, 'img': 'crab', 'box': b, 'shade': False}], 'stars': [],
                      'words': [{'text': '', 'x': 20, 'y': 618, 'ang': -9, 'size': 170, 'min': 60, 'rightPad': 14}]})
    data['cards'] = cards
    data['cardsRef'] = {'top': round(wt(20), 1)}
    # feed hero: same recipe in its own box (word above, two small cards below)
    f = data['feed']
    D, pc, b = pebble((-2, 192, 394, 520), 8, 0.2, 201, 8, 10, 30, 300, word=False)
    f['paint'][0] = {'c': D, 'photo': pc, 'soft': False}
    f['photos'][0] = {**f['photos'][0], 'c': pc, 'box': b}
    json.dump(data, open(OUT, 'w'), separators=(',', ':'))
    from PIL import Image, ImageDraw
    sheet = Image.new('RGB', (5 * 200 + 10, 2 * 430 + 10), (40, 40, 40))
    for k, c in enumerate(cards):
        im = Image.new('RGB', (390, 844), (244, 236, 226)); d = ImageDraw.Draw(im)
        for cc in c['paint'][0]['c']: d.polygon([tuple(p) for p in cc], fill=(15, 70, 230))
        for cc in c['photos'][0]['c']: d.polygon([tuple(p) for p in cc], fill=(150, 150, 150))
        d.polygon([(20, wt(20)), (372, wt(372)), (372, bl(372)), (20, bl(20))], outline=(0, 0, 0))
        sheet.paste(im.resize((190, 411)), (10 + (k % 5) * 200, 10 + (k // 5) * 430))
    sheet.save('/tmp/sh/blobs.png')
    print('ok')

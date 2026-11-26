"""Export design geometry (paint contours, photo windows, stars, giant words) from the
Python design generator into src/data/shapes.json for the prototype.

The generator (render/v12/screens.py) records every paint mass / photo / star / word it
draws (vlgo.REC). Bezier paths are converted back to their anchor points, which the
prototype re-splines and animates (living paint)."""
import sys, re, json, importlib
sys.path.insert(0, '/home/claude/render/v12')
import vlgo, screens, variants

OUT = '/home/claude/vlgo-app/src/data/shapes.json'
HREF = {'mayak': 'mayak', 'mys': 'mys', 'svet': 'svetlanskaya', 'zolotoy': 'zolotoy', 'panorama': 'panorama'}


def contours(d):
    """'M x y C .. .. x y ... Z M ...' -> list of anchor point lists"""
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


def grab(fn, *a, **k):
    vlgo.REC.clear()
    fn(*a, **k)
    spec = {'paint': [], 'photos': [], 'stars': [], 'words': [], 'drops': [], 'splash': None}
    for r in vlgo.REC:
        if r['t'] == 'paint':
            spec['paint'].append({'c': contours(r['d']), 'photo': contours(r['photo']) if r['photo'] else None, 'soft': r['soft']})
        elif r['t'] == 'photo':
            spec['photos'].append({'c': contours(r['d']), 'img': HREF.get(r['href'], r['href']), 'box': list(r['box']), 'shade': r['shade']})
        elif r['t'] == 'star':
            spec['stars'].append({k: r[k] for k in ('cx', 'cy', 'R', 'rot', 'vr')} | {'rays': r['rays']})
        elif r['t'] == 'drop':
            spec['drops'].append([r['cx'], r['cy'], r['r'], r['tilt']])
        elif r['t'] == 'splash':
            spec['splash'] = [round(v, 1) for v in r['land']]
        elif r['t'] == 'word':
            spec['words'].append({k: r[k] for k in ('text', 'x', 'y', 'ang', 'size', 'min')} | {'rightPad': r['right_pad']})
    return spec


if __name__ == '__main__':
    S = screens
    data = {
        'swipe': grab(S.swipe),
        'feed': grab(S.feed),
        'onboarding': grab(S.onboarding),
        'profile': grab(S.profile),
        'saved': grab(S.saved),
        'create': grab(S.create),
        'place': grab(S.place),
        'map': grab(S.map_),
        'match4': grab(S.match_ref),
        'match6': grab(S.match, ['АН', 'МД', 'ДШ', 'НС', 'КА', 'ПА'], 'VMatch6'),
        'match_ring': grab(variants.v1),
        'vote': grab(S.vote, [(291.4, 260.1, 51.2, 'НС'), (134.8, 375.0, 80.1, 'АН'), (291.7, 532.7, 44.5, 'ДШ'), (108.9, 545.3, 48.0, 'МД')],
                     [(1, 0, -48), (3, 1, 42)], waiting=[2], count='3 из 4', wait_text='Ждём Дашу'),
    }
    if hasattr(S, 'export_extra'):
        data.update(S.export_extra(grab))
    for k in ('feed', 'place'):
        for st in data[k]['stars']: st['knock'] = True
    json.dump(data, open(OUT, 'w'), separators=(',', ':'))
    print('wrote', OUT, {k: (len(v['paint']), sum(len(c) for p in v['paint'] for c in p['c'])) for k, v in data.items()})

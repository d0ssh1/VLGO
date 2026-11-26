// Swipe card v2: one of the approved compositions (фуникулёр / мыс — Bézier,
// маяк — traced) with any place name. The layout is computed per name:
//  - the giant word clears the photo window by ≥15px (taking its tilt into account),
//  - short single words lean −7°, long or two-line names −5°,
//  - spare height is shared between photo→word, word→caption and caption→buttons,
//  - the word shrinks only when the column does not fit.

import { svg } from '../core/dom.js';
import { onFrame, motion, PAINT_FPS } from '../core/loop.js';
import { bezPath, bezSample, cr, mv, warp, halo, paintDefs } from '../core/ink.js';
import { measure } from './giant.js';
import BASES from '../data/blobcards.json';

export const BLOB_BASES = BASES;
const W = 390;
const STAR = 'M0 -36 L5 -8 L30 -18 L9 2 L26 26 L2 10 L-2 38 L-6 9 L-30 22 L-10 0 L-28 -20 L-4 -8Z';

function splitLines(word) {
  const ws = word.split(/\s+/);
  if (ws.length < 2) return [word];
  let best = null;
  for (let i = 1; i < ws.length; i++) {
    const l = [ws.slice(0, i).join(' '), ws.slice(i).join(' ')];
    const m = Math.max(...l.map((s) => measure(s, 100).w));
    if (!best || m < best.m) best = { l, m };
  }
  return best.l;
}

/**
 * @param base   one of BLOB_BASES
 * @param word   place word (lowercase)
 * @param img    photo key in assets/img
 * @param opt    { H, bottom } — screen height and the top of the button row
 */
function shifted(base, dy, H) {
  const sh = (shape) => shape.map(([x, y, ...r]) => [x, y + dy, ...r]);
  const keep = (shape) => Math.max(...shape.map((p) => p[1])) >= H - 20; // pools that pour in from the bottom stay put
  return { ...base, paint: base.paint.map(sh), window: base.window.map(sh), drops: base.drops.map(sh), pools: base.pools.map((c) => (keep(c) ? c : sh(c))) };
}

export function buildBlobCard(base0, word, img, opt = {}) {
  const { H = 844, bottom = 704 } = opt;
  // first pass: how much spare height is there? part of it lowers the whole composition
  let base = base0, dy = 0;
  if (!opt.dy) {
    const probe = buildLayout(base0, word, H, bottom);
    dy = Math.round(Math.min(64, Math.max(0, probe.lay.spare * 0.55)));
    base = shifted(base0, dy, H);
  }
  const { lines, nL, ang, W0, wb, lay } = buildLayout(base, word, H, bottom);
  return draw(base, img, H, lines, nL, ang, wb, lay, dy);
}

function buildLayout(base, word, H, bottom) {
  const lines = splitLines(word);
  const nL = lines.length;
  const ang = nL > 1 || word.length > 6 ? -5 : -7;
  const ta = Math.tan((ang * Math.PI) / 180);
  const W0 = (base.bez ? base.window.map((w) => bezSample(w, 0, 0, 0)) : base.window).flat();
  const wb = W0.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);

  // ---- layout
  const CAP = 22 + 8 + 28; // caption line + gap + friends row
  let sz = nL > 1 ? 78 : 150;
  while (sz > 44 && Math.max(...lines.map((l) => measure(l, sz).w)) > (nL > 1 ? 326 : 350)) sz -= 2;
  let lay;
  for (;; sz -= 4) {
    const lh = sz * (nL > 1 ? 0.85 : 0.86);
    const met = lines.map((l) => measure(l, sz));
    let by = 0;
    for (const [wx, wy] of W0) met.forEach((m, k) => { if (wx >= 14 && wx <= 26 + m.w) by = Math.max(by, wy + 15 + (nL - 1 - k) * lh + m.asc - (wx - 20) * ta); });
    const tb = by + met[nL - 1].desc;
    const ex = bottom - (tb + 16 + CAP + 22);
    if (ex < 0 && sz > 48) continue;
    const e = Math.max(0, ex);
    const d0 = Math.min(e * 0.3, 34), d1 = Math.min(e * 0.15, 14);
    by += d0;
    lay = { sz, lh, by: Math.round(by), metaTop: Math.round(tb + d0 + 16 + d1), met, spare: e };
    break;
  }
  lay.friendsTop = lay.metaTop + 30;
  return { lines, nL, ang, W0, wb, lay };
}

function draw(base, img, H, lines, nL, ang, wb, lay, dy) {

  // ---- svg
  const root = svg('svg', { class: 'art', viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
  const defs = svg('defs');
  root.appendChild(defs);
  const P = paintDefs(defs);
  const clipId = `${P.id}w`;
  const clip = svg('clipPath', { id: clipId });
  const winPath = svg('path');
  clip.appendChild(winPath);
  defs.appendChild(clip);

  const blue = svg('g', { class: 'paint-v2' });
  root.appendChild(blue);
  const parts = [
    ...base.pools.map((c) => ({ c, k: 0.7 })),
    ...base.paint.map((c) => ({ c, k: 1 })),
    ...base.drops.map((c) => ({ c, k: base.bez ? 0.5 : 1, drop: true })),
  ];
  for (const p of parts) {
    p.el = svg('path', { fill: P.tex }); p.g = svg('path', { fill: P.glow });
    blue.appendChild(p.el); blue.appendChild(p.g);
  }
  const rim = svg('path', { fill: '#F5F1EA' });
  root.appendChild(rim);
  const win = svg('g', { class: 'photo-window', 'clip-path': `url(#${clipId})` });
  win.appendChild(svg('image', { href: `assets/img/${img}.jpg`, x: wb[0] - 14, y: wb[1] - 14, width: wb[2] - wb[0] + 28, height: wb[3] - wb[1] + 28, preserveAspectRatio: 'xMidYMid slice' }));
  root.appendChild(win);

  const star = svg('g', { transform: `translate(334 ${112 + dy}) scale(.74)` }, [svg('path', { d: STAR, fill: '#0E121D' })]);
  root.appendChild(star);

  const giant = svg('g', { class: 'giant', transform: `rotate(${ang} 20 ${lay.by})` });
  lines.forEach((l, k) => {
    const t = svg('text', { class: 'gw-line', x: 20, y: (lay.by - (nL - 1 - k) * lay.lh).toFixed(1), 'font-family': 'Inter Tight', 'font-weight': 900, 'font-size': lay.sz, 'letter-spacing': (-lay.sz * 0.03).toFixed(1), fill: '#0E121D', style: `--i:${k}` });
    t.textContent = l;
    giant.appendChild(t);
  });
  root.appendChild(giant);

  // ---- motion
  const seed = Math.random() * 10;
  const render = (T) => {
    parts.forEach((p, i) => {
      let c = p.c;
      if (p.drop) { const ox = Math.sin(T * 0.55 + i * 2 + seed) * 2.5, oy = Math.sin(T * 0.45 + i * 1.3 + seed) * 3; c = c.map(([x, y, ...r]) => [x + ox, y + oy, ...r]); }
      const d = base.bez ? bezPath(c, T, seed + i * 0.3, p.drop ? 0.5 : p.k) : cr(warp(mv(c, T, seed, p.k), W, H));
      p.el.setAttribute('d', d); p.g.setAttribute('d', d);
    });
    const ws = base.window.map((c) => (base.bez ? bezSample(c, T, seed + 3, 0.8) : mv(c, T, seed, 0.9)));
    winPath.setAttribute('d', base.window.map((c) => (base.bez ? bezPath(c, T, seed + 3, 0.8) : cr(mv(c, T, seed, 0.9)))).join(' '));
    rim.setAttribute('d', ws.map((w) => halo(w, T, seed)).join(' '));
    P.pat.setAttribute('patternTransform', `translate(${(Math.sin(T * 0.07 + seed) * 60).toFixed(1)} ${((T * 6) % 512).toFixed(1)})`);
  };
  render(0);
  const off = motion.reduced ? () => {} : onFrame((now) => render(now), { fps: PAINT_FPS });

  return {
    root, stop: off, layout: lay,
    box: [wb[0], wb[1], wb[2] - wb[0], wb[3] - wb[1]],
    paints: [],
  };
}

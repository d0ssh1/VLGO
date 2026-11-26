// Procedural living blots (metaballs).
//
// A blot = a set of moving "balls". Each frame a scalar field
//   F(x, y) = Σ r² / d²
// is sampled on a coarse grid (5 px), the iso-line F = 1 is traced with
// marching squares and turned into a smooth Catmull-Rom path. Because the balls
// orbit slowly with their own periods and breathe in size, the shape really
// flows: lobes swell, necks thin and snap, drops separate and merge again.
//
// The photo window is a second ball set (W). The paint field includes the same
// window balls a bit bigger, so paint always wraps the photo with a living rim.
//
// generate(seed, opts) builds a different, word-aware composition per card:
// the tail flows toward the end of the giant word and a lobe fills the empty
// space after a short word.

import { onFrame, motion } from './loop.js';
import { svg } from './dom.js';
import { crPath } from './paint.js';

// ---------------------------------------------------------------- random
export function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------- field + contour
const CELL = 5, X0 = -60, Y0 = -60, GW = Math.ceil((390 + 120) / CELL) + 1, GH = Math.ceil((844 + 120) / CELL) + 1;
const grid = new Float32Array(GW * GH);
const gridW = new Float32Array(GW * GH);

// compact (Wyvill) kernel: k = (1 - d²/R²)², R = 1.6 r. Balls only merge when they
// are close, so lobes stay distinct and necks form/snap instead of one big slab.
const ISO = 0.3;
function sample(balls, out = grid) {
  out.fill(0);
  for (const b of balls) {
    const r = b.cr;
    if (r <= 0.5) continue;
    const R = r * 1.6, R2 = R * R;
    const i0 = Math.max(0, Math.floor((b.cx - R - X0) / CELL)), i1 = Math.min(GW - 1, Math.ceil((b.cx + R - X0) / CELL));
    const j0 = Math.max(0, Math.floor((b.cy - R - Y0) / CELL)), j1 = Math.min(GH - 1, Math.ceil((b.cy + R - Y0) / CELL));
    for (let j = j0; j <= j1; j++) {
      const dy = Y0 + j * CELL - b.cy, dy2 = dy * dy, row = j * GW;
      for (let i = i0; i <= i1; i++) {
        const dx = X0 + i * CELL - b.cx;
        const q = 1 - (dx * dx + dy2) / R2;
        if (q > 0) out[row + i] += q * q;
      }
    }
  }
  return out;
}

/** marching squares → closed loops of points (screen px) */
function contours(f, iso = ISO) {
  // zero the border so every iso-line is closed (shapes that bleed off-screen close outside it)
  for (let i = 0; i < GW; i++) { f[i] = 0; f[(GH - 1) * GW + i] = 0; }
  for (let j = 0; j < GH; j++) { f[j * GW] = 0; f[j * GW + GW - 1] = 0; }
  const pts = new Map(); // edge key -> [x,y]
  const adj = new Map(); // edge key -> [neighbour keys] (undirected, every point has degree 2)
  const ek = (i, j, d) => (j * GW + i) * 2 + d; // d: 0 = horizontal edge (i,j)-(i+1,j), 1 = vertical (i,j)-(i,j+1)
  const interp = (i, j, d) => {
    const k = ek(i, j, d);
    if (!pts.has(k)) {
      const a = f[j * GW + i], b = d ? f[(j + 1) * GW + i] : f[j * GW + i + 1];
      const t = (iso - a) / (b - a);
      pts.set(k, d ? [X0 + i * CELL, Y0 + (j + t) * CELL] : [X0 + (i + t) * CELL, Y0 + j * CELL]);
    }
    return k;
  };
  for (let j = 0; j < GH - 1; j++) {
    for (let i = 0; i < GW - 1; i++) {
      const a = f[j * GW + i] > iso, b = f[j * GW + i + 1] > iso, c = f[(j + 1) * GW + i + 1] > iso, d = f[(j + 1) * GW + i] > iso;
      const code = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const T = () => interp(i, j, 0), R = () => interp(i + 1, j, 1), B = () => interp(i, j + 1, 0), L = () => interp(i, j, 1);
      // oriented segments (inside on the left)
      const seg = (p, q) => {
        (adj.get(p) || adj.set(p, []).get(p)).push(q);
        (adj.get(q) || adj.set(q, []).get(q)).push(p);
      };
      switch (code) {
        case 1: seg(L(), B()); break;
        case 2: seg(B(), R()); break;
        case 3: seg(L(), R()); break;
        case 4: seg(R(), T()); break;
        case 5: seg(L(), T()); seg(R(), B()); break;
        case 6: seg(B(), T()); break;
        case 7: seg(L(), T()); break;
        case 8: seg(T(), L()); break;
        case 9: seg(T(), B()); break;
        case 10: seg(T(), R()); seg(B(), L()); break;
        case 11: seg(T(), R()); break;
        case 12: seg(R(), L()); break;
        case 13: seg(R(), B()); break;
        case 14: seg(B(), L()); break;
        default: break;
      }
    }
  }
  const loops = [];
  const seen = new Set();
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = -1, k = start, guard = 0;
    while (k !== undefined && !seen.has(k) && guard++ < 20000) {
      seen.add(k);
      loop.push(pts.get(k));
      const nb = adj.get(k);
      const nxt = nb[0] !== prev ? nb[0] : nb[1];
      prev = k; k = nxt;
    }
    if (loop.length > 8) loops.push(loop);
  }
  return loops;
}

function toPath(loops) {
  return loops.map((L) => {
    // decimate + light smoothing → Catmull-Rom
    const P = [];
    const step = L.length > 120 ? 3 : 2;
    for (let i = 0; i < L.length; i += step) {
      const a = L[(i - 1 + L.length) % L.length], b = L[i], c = L[(i + 1) % L.length];
      P.push([(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4]);
    }
    return crPath(P);
  }).join(' ');
}

// ---------------------------------------------------------------- balls
function ball(x, y, r, R, amp = 1) {
  return {
    x, y, r,
    ax: (10 + R() * 16) * amp, ay: (10 + R() * 16) * amp,
    fx: 0.07 + R() * 0.09, fy: 0.06 + R() * 0.09,
    px: R() * 6.28, py: R() * 6.28,
    pr: 0.08 + R() * 0.12, pp: R() * 6.28, pa: 0.1 + R() * 0.1,
    delay: 0, grow: 1, cx: x, cy: y, cr: r,
  };
}

function step(balls, t, appear) {
  for (const b of balls) {
    const g = motion.reduced ? 1 : Math.min(Math.max((appear - b.delay) / 0.9, 0), 1);
    const e = 1 - Math.pow(1 - g, 3);
    b.cx = b.x + (motion.reduced ? 0 : Math.sin(t * b.fx * 6.28 + b.px) * b.ax + (b.dx || 0));
    b.cy = b.y + (motion.reduced ? 0 : Math.sin(t * b.fy * 6.28 + b.py) * b.ay + (b.dy || 0));
    b.cr = b.r * e * (1 + (motion.reduced ? 0 : Math.sin(t * b.pr * 6.28 + b.pp) * b.pa));
  }
}

/**
 * Build a composition.
 * opts: window {cx, cy, w, h}, word {x0, x1, y} (rotated word box: start/end x and baseline),
 *       style: 'card' | 'hero' | 'match', drops: [{label}] (match)
 */
export function generate(seed, { window: Wb, word, style = 'card', drops = [] }) {
  const R = rng(seed);
  const W = [], P = [], D = [];
  const { cx, cy, w, h } = Wb;
  // window: 4–6 balls inside an ellipse → organic photo shape
  const nW = 4 + Math.floor(R() * 3);
  const rw = Math.min(w, h) * 0.27;
  for (let i = 0; i < nW; i++) {
    const a = (i / nW) * Math.PI * 2 + R() * 0.6;
    const k = 0.42 + R() * 0.18;
    W.push(ball(cx + Math.cos(a) * w * k * 0.62, cy + Math.sin(a) * h * k * 0.62, rw * (0.8 + R() * 0.35), R, 0.55));
  }
  W.push(ball(cx, cy, rw * 1.1, R, 0.4));
  // paint rim: the same window balls, bigger
  // paint rim: twins of the window balls, bigger (they follow their twin's motion)
  W.forEach((b) => P.push({ ...ball(b.x, b.y, b.r * 1.5, R, 0.3), link: b }));
  // lobes around the window — uneven sizes, avoid the word band
  const nL = style === 'hero' ? 4 : style === 'match' ? 3 : 5 + Math.floor(R() * 3);
  for (let i = 0; i < nL; i++) {
    const a = R() * Math.PI * 2;
    const rr = 34 + R() * (style === 'hero' ? 18 : 28);
    const dist = 0.5 + R() * 0.08;
    const x = cx + Math.cos(a) * (w * dist + rr * 0.4), y = cy + Math.sin(a) * (h * dist + rr * 0.4);
    if (word && y > word.y - 90 && x < word.x1 - 30) continue; // keep the word readable on paper
    P.push(ball(x, y, rr, R, 1.1));
  }
  // bleed to an edge (top or side), like the reference
  if (style === 'card') {
    const side = R() < 0.5 ? -1 : 1;
    P.push(ball(side < 0 ? -10 : 400, cy - h * (0.2 + R() * 0.4), 40 + R() * 25, R, 0.8));
    if (R() < 0.5) P.push(ball(cx + (R() - 0.5) * w * 0.6, -18, 30 + R() * 20, R, 0.8));
  }
  // tail toward the end of the word; fill empty space after a short word
  if (word) {
    const tx = Math.min(word.x1 - 10, 360), ty = word.y - 80;
    const sx = cx + w * 0.32, sy = cy + h * 0.42;
    const n = 4;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      P.push(ball(sx + (tx - sx) * t + (R() - 0.5) * 14, sy + (ty - sy) * t + (R() - 0.5) * 10, 32 - t * 8 + R() * 6, R, 0.7));
    }
    if (word.x1 < 300) P.push(ball(word.x1 + 50, word.y - 70, 40 + R() * 10, R, 0.6));
  }
  // friends' drops (match): orbit in and out so necks form and snap
  drops.forEach((d, i) => {
    const a = d.angle ?? (-2.4 + (i / Math.max(drops.length - 1, 1)) * 2.9);
    const dist = Math.max(w, h) * 0.78;
    const bx = d.x ?? Math.min(Math.max(cx + Math.cos(a) * dist, 52), 338), by = d.y ?? Math.max(cy + Math.sin(a) * dist * 0.9, 96);
    const b = ball(bx, by, d.r ?? 34, R, 0.3);
    // neck ball halfway to the pool: breathes, so the bridge thickens and thins
    const nk = ball(bx + (cx - bx) * 0.42, by + (cy - by) * 0.42, (d.r ?? 34) * 0.55, R, 0.5);
    nk.pa = 0.35; nk.pr = 0.12 + R() * 0.08;
    P.push(nk);
    b.radial = { a: Math.atan2(by - cy, bx - cx), base: dist, amp: 14 + R() * 8, f: 0.06 + R() * 0.05, p: R() * 6.28 };
    b.label = d.label;
    D.push(b);
    P.push(b);
  });
  // entrance stagger: window first, then rim, lobes, drops
  W.forEach((b, i) => { b.delay = 0.15 + i * 0.05; });
  P.forEach((b, i) => { b.delay = 0.1 + i * 0.06; });
  return { W, P, D, rim: style === 'match' ? 1.5 : 2.6 };
}

// ---------------------------------------------------------------- renderer
/**
 * Mount a living blot into an <svg>. Returns { paintId, maskId, stop, appear(t0) }.
 * texId: from paintDefs(); photo: { href, box:[x,y,w,h], shade }
 */
export function mountBlob(root, defs, texId, comp, { photo, before } = {}) {
  const id = `b${Math.random().toString(36).slice(2, 8)}`;
  const shape = svg('path', { id: `${id}-p`, 'fill-rule': 'evenodd' });
  defs.appendChild(shape);
  const clip = svg('clipPath', { id: `${id}-c` });
  clip.appendChild(svg('use', { href: `#${id}-p` }));
  defs.appendChild(clip);
  const wpath = svg('path', { id: `${id}-w` });
  defs.appendChild(wpath);
  const wclip = svg('clipPath', { id: `${id}-wc` });
  wclip.appendChild(svg('use', { href: `#${id}-w` }));
  defs.appendChild(wclip);

  const g = svg('g', { class: 'live-paint' });
  g.appendChild(svg('use', { href: `#${id}-p`, fill: `url(#${texId}-tex)`, 'fill-rule': 'evenodd' }));
  g.appendChild(svg('use', { href: `#${id}-p`, fill: `url(#${texId}-caus)`, opacity: 0.34 }));
  g.appendChild(svg('use', { href: `#${id}-p`, fill: `url(#${texId}-caus2)`, opacity: 0.2 }));
  g.appendChild(svg('use', { href: `#${id}-p`, fill: `url(#${texId}-sheen)`, opacity: 0.2 }));
  const inner = svg('g', { 'clip-path': `url(#${id}-c)` });
  inner.appendChild(svg('use', { href: `#${id}-p`, fill: 'none', stroke: '#001B86', 'stroke-width': 11, opacity: 0.22 }));
  inner.appendChild(svg('use', { href: `#${id}-p`, fill: 'none', stroke: '#B4CAFF', 'stroke-width': 3, opacity: 0.6, transform: 'translate(2.5 3)' }));
  inner.appendChild(svg('use', { href: `#${id}-w`, fill: 'none', stroke: '#4C7BF5', 'stroke-width': 26, opacity: 0.25 }));
  g.appendChild(inner);
  before?.(g);
  root.appendChild(g);

  let photoG = null;
  if (photo) {
    photoG = svg('g', { 'clip-path': `url(#${id}-wc)`, class: 'live-photo' });
    const [x, y, w, h] = photo.box;
    photoG.appendChild(svg('image', { href: photo.href, x, y, width: w, height: h, preserveAspectRatio: 'xMidYMid slice', class: 'kenburns' }));
    if (photo.shade) {
      const gid = `${id}-sh`;
      const lg = svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0.3, y2: 1 });
      lg.appendChild(svg('stop', { offset: 0.35, 'stop-color': '#0A0F1E', 'stop-opacity': 0 }));
      lg.appendChild(svg('stop', { offset: 1, 'stop-color': '#0A0F1E', 'stop-opacity': 0.72 }));
      defs.appendChild(lg);
      photoG.appendChild(svg('rect', { x, y, width: w, height: h, fill: `url(#${gid})` }));
    }
    root.appendChild(photoG);
  }

  let tStart = null;
  const listeners = [];
  const tick = (t) => {
    if (tStart === null) tStart = t;
    const appear = t - tStart;
    // window balls drive their rim twins
    step(comp.W, t, appear);
    for (const b of comp.P) {
      if (b.link) { b.dx = b.link.cx - b.link.x; b.dy = b.link.cy - b.link.y; }
      if (b.radial) {
        const r = b.radial, s = Math.sin(t * r.f * 6.28 + r.p) * r.amp;
        b.dx = Math.cos(r.a) * s; b.dy = Math.sin(r.a) * s;
      }
    }
    step(comp.P, t, appear);
    // paint ⊇ window: paint field = 1.22·window field + lobes → a living rim that always wraps the photo
    const fw = sample(comp.W, gridW);
    wpath.setAttribute('d', toPath(contours(fw)));
    const fp = sample(comp.P, grid);
    for (let k = 0; k < fp.length; k++) fp[k] += fw[k] * (comp.rim ?? 2.6);
    shape.setAttribute('d', toPath(contours(fp)));
    listeners.forEach((f) => f(t, comp));
  };
  tick(performance.now() / 1000);
  const off = onFrame((t) => tick(t), { fps: 30 });
  return {
    paintId: `${id}-p`, windowId: `${id}-w`, group: g, photoG,
    onTick: (f) => listeners.push(f),
    stop: off,
  };
}

// Living paint.
// A paint mass is a set of closed contours (screen px, exported from the design
// generator). Every frame (30 fps) each contour point is pushed along its
// normal by two slow travelling waves, and the Catmull-Rom path is rebuilt.
// The fill is a tileable gouache texture whose pattern slowly drifts (SMIL,
// no JS), plus a moving sheen, so the paint "breathes" and shimmers.
// Cost: one path rebuild per mass per frame; no SVG filters on moving shapes.

import { onFrame, motion } from './loop.js';
import { svg } from './dom.js';

let uid = 0;
const TEX = 'assets/tex/paint_tex.jpg';
const TEX_SOFT = 'assets/tex/paint_tex_soft.jpg';

/** Catmull-Rom (uniform) closed spline through points → SVG path data. */
export function crPath(P) {
  const n = P.length;
  if (n < 3) return '';
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

function normals(P) {
  const n = P.length;
  return P.map((_, i) => {
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    return [dy / L, -dx / L];
  });
}

/** Contour morpher: returns a function t -> path data. */
// Shared "current": a slow, large-scale flow field that bends every paint mass
// and photo window on screen the same way, so whole regions swell, lean and
// roll like a living wave (not just a uniform breath).
export const flow = { gain: 1, seed: Math.random() * 100 };
/** Drops that bob on their necks: each point slowly orbits (Lissajous), paint
 *  within r px follows with a soft falloff, so necks stretch and swing.
 *  at(i, t) = total offset of drop i (flow + bob) — labels ride exactly with it. */
export function bobs(points, { amp = 11, r = 80 } = {}) {
  const ph = points.map((_, i) => [i * 2.1 + 0.7, i * 1.3 + 2.2, 0.33 + 0.06 * i, 0.26 + 0.05 * i]);
  const off = (i, t) => [amp * Math.sin(t * ph[i][2] + ph[i][0]), amp * 0.8 * Math.sin(t * ph[i][3] + ph[i][1])];
  return {
    extra: (x, y, t) => {
      let dx = 0, dy = 0;
      for (let i = 0; i < points.length; i++) {
        const d = Math.hypot(x - points[i][0], y - points[i][1]) / (points[i][2] || r);
        if (d < 1) { const w = (1 - d * d) * (1 - d * d); const [ox, oy] = off(i, t); dx += ox * w; dy += oy * w; }
      }
      return [dx, dy];
    },
    at: (i, t) => { const [fx, fy] = flowAt(points[i][0], points[i][1], t); const [ox, oy] = off(i, t); return [fx + ox, fy + oy]; },
  };
}

/** pin helper: calm (no edge ripples) within r px of the given points, so a
 *  label sitting on a drop rides exactly with it (the drop only flows). */
export function calmNear(points, r = 70) {
  return (x, y) => {
    let m = 1;
    for (const [px, py] of points) { const d = Math.hypot(x - px, y - py) / r; if (d < 1) m = Math.min(m, 0.15 + 0.85 * d * d); }
    return m;
  };
}

export function flowAt(x, y, t) {
  const s = flow.seed, g = flow.gain;
  const dx = Math.sin(y * 0.011 + t * 0.41 + s) * 9 + Math.sin((x + y) * 0.007 - t * 0.29 + s * 1.7) * 7 + Math.sin(y * 0.023 - t * 0.63 + s * 0.3) * 3;
  const dy = Math.sin(x * 0.012 - t * 0.37 + s * 2.1) * 8 + Math.sin((x - y) * 0.008 + t * 0.33 + s * 0.9) * 7 + Math.sin(x * 0.027 + t * 0.57 + s * 1.3) * 3;
  return [dx * g, dy * g];
}

// Taubin (λ|μ) smoothing: rounds sharp corners without shrinking the shape.
function taubin(P, it = 4, lam = 0.5, mu = -0.53) {
  let Q = P.map((p) => [p[0], p[1]]);
  const n = Q.length;
  for (let k = 0; k < it * 2; k++) {
    const f = k % 2 ? mu : lam;
    Q = Q.map((p, i) => {
      const a = Q[(i - 1 + n) % n], b = Q[(i + 1) % n];
      return [p[0] + f * ((a[0] + b[0]) / 2 - p[0]), p[1] + f * ((a[1] + b[1]) / 2 - p[1])];
    });
  }
  return Q;
}

// Local thickness: distance from each point to the nearest *other* edge (another
// contour, or a far-away part of its own outline). Thin drips and narrow paint
// bands get small ripples, so the two sides of a strand never cross (no sharp
// tips, no self-overlap); fat areas keep the full wave.
function dampOf(P, s, len, obstacles) {
  const n = P.length, GAP = 40;
  const f = P.map((p, i) => {
    let best = 1e9;
    for (const O of obstacles) {
      const self = O === P;
      for (let j = 0; j < O.length; j += 1) {
        if (self) { const du = Math.abs(s[i] - s[j]); if (Math.min(du, len - du) < GAP) continue; }
        const dx = O[j][0] - p[0], dy = O[j][1] - p[1], d = dx * dx + dy * dy;
        if (d < best) best = d;
      }
    }
    const x = Math.max(0, Math.min(1, (Math.sqrt(best) - 8) / 64));
    return 0.12 + 0.88 * x * x * (3 - 2 * x);
  });
  // spread the damping softly along the outline
  let g = f;
  for (let k = 0; k < 6; k++) g = g.map((v, i) => Math.min(v, (g[(i - 1 + n) % n] + v * 2 + g[(i + 1) % n]) / 4));
  return g;
}

export function morpher(contours, { amp = 6, speed = 0.2, seed = 0, pin = null, obstacles = null, smooth = 3, extra = null, calm = null } = {}) {
  // Edge ripples: four travelling waves along the contour (incommensurate, never repeat)
  // + rolling "swells": a bump that travels around the outline like a wave front,
  // + the shared flow field above (big slow deformation of the whole region).
  const C = contours.map((P0) => {
    let acc = 0;
    const s = P0.map((p, i) => {
      if (i) acc += Math.hypot(p[0] - P0[i - 1][0], p[1] - P0[i - 1][1]);
      return acc;
    });
    const D = dampOf(P0, s, acc || 1, obstacles || contours);
    const P = smooth ? taubin(P0, smooth) : P0;
    return { P, N: normals(P), L: P.length, s, D, len: acc || 1, C: calm ? P.map(([x, y]) => calm(x, y)) : null };
  });
  const W1 = (2 * Math.PI) / 340, W2 = (2 * Math.PI) / 190, W3 = (2 * Math.PI) / 117, W4 = (2 * Math.PI) / 71;
  return (t) => {
    if (motion.reduced || amp === 0) return C.map((c) => crPath(c.P)).join(' ');
    const g = flow.gain;
    return C.map((c, ci) => {
      const out = new Array(c.L);
      const sd = seed + ci * 1.7;
      // two swells travelling around the outline at different speeds
      const sw1 = ((t * 0.035 + sd * 0.13) % 1) * c.len, sw2 = ((1 - (t * 0.022 + sd * 0.29) % 1)) * c.len;
      const swW = Math.min(c.len * 0.12, 140);
      for (let i = 0; i < c.L; i++) {
        const u = c.s[i];
        const k = 0.42 * Math.sin(u * W1 - t * speed * 1.6 + sd)
                + 0.28 * Math.sin(u * W2 + t * speed * 1.13 + sd * 2.3)
                + 0.18 * Math.sin(u * W3 - t * speed * 2.41 + sd * 0.7)
                + 0.12 * Math.sin(u * W4 + t * speed * 3.07 + sd * 1.9);
        const d1 = Math.min(Math.abs(u - sw1), c.len - Math.abs(u - sw1)), d2 = Math.min(Math.abs(u - sw2), c.len - Math.abs(u - sw2));
        const swell = Math.exp(-(d1 * d1) / (2 * swW * swW)) * 1.6 - Math.exp(-(d2 * d2) / (2 * swW * swW)) * 1.0;
        const p = c.P[i];
        const cm = calm ? c.C[i] : 1;
        const a = amp * g * c.D[i] * cm * (pin ? pin(p[0], p[1]) : 1);
        let [fx, fy] = flowAt(p[0], p[1], t);
        fx *= cm; fy *= cm;
        const n = k * a + swell * a * 1.2;
        let ex = 0, ey = 0;
        if (extra) [ex, ey] = extra(p[0], p[1], t);
        out[i] = [p[0] + c.N[i][0] * n + fx + ex, p[1] + c.N[i][1] * n + fy + ey];
      }
      return crPath(out);
    }).join(' ');
  };
}

/** Shared <defs> for a screen svg: textures (drifting), sheen gradient. */
export function paintDefs(defs) {
  const id = `t${++uid}`;
  const mk = (pid, href, size, dur, dx, dy) => {
    const pat = svg('pattern', { id: pid, patternUnits: 'userSpaceOnUse', width: size, height: size });
    pat.appendChild(svg('image', { href, width: size, height: size, preserveAspectRatio: 'none' }));
    if (!motion.reduced) {
      pat.appendChild(svg('animateTransform', {
        attributeName: 'patternTransform', type: 'translate',
        values: `0 0; ${dx} ${dy}; ${dx * 0.3} ${dy * 1.4}; 0 0`, dur: `${dur}s`, repeatCount: 'indefinite',
      }));
    }
    defs.appendChild(pat);
  };
  mk(`${id}-tex`, TEX, 512, 30, 90, -60);
  mk(`${id}-soft`, TEX_SOFT, 768, 60, 80, 40);
  mk(`${id}-caus`, 'assets/tex/caustic.png', 300, 14, 60, 36);
  mk(`${id}-caus2`, 'assets/tex/caustic.png', 420, 21, -70, 50);
  // a slow travelling sheen ("переливание")
  const g = svg('linearGradient', { id: `${id}-sheen`, x1: 0, y1: 0, x2: 1, y2: 1, gradientUnits: 'objectBoundingBox' });
  [['0', 0], ['0.42', 0], ['0.5', 0.55], ['0.58', 0], ['1', 0]].forEach(([o, a]) =>
    g.appendChild(svg('stop', { offset: o, 'stop-color': '#7FA2FF', 'stop-opacity': a })));
  if (!motion.reduced) {
    g.appendChild(svg('animateTransform', {
      attributeName: 'gradientTransform', type: 'translate', values: '-1 -1; 1 1', dur: '9s', repeatCount: 'indefinite',
    }));
  }
  defs.appendChild(g);
  return id;
}

/**
 * Add a living paint mass to an <svg>.
 * opts: contours, photo (window contours, for the light glaze), soft (big areas), amp, speed, seed
 * Returns { pathId, clipId, d(), stop() }
 */
export function addPaint(root, defs, texId, opts) {
  const id = `p${++uid}`;
  const shape = svg('path', { id, 'fill-rule': 'evenodd' });
  defs.appendChild(shape);
  const clip = svg('clipPath', { id: `${id}-clip` });
  clip.appendChild(svg('use', { href: `#${id}`, 'clip-rule': 'evenodd' }));
  defs.appendChild(clip);

  const g = svg('g', { class: 'paint' });
  g.appendChild(svg('use', { href: `#${id}`, fill: `url(#${texId}-${opts.soft ? 'soft' : 'tex'})` }));
  if (!opts.soft) {
    // second texture layer drifting the other way = marbling that never repeats
    // water light: two caustic nets drifting against each other + a travelling sheen
    g.appendChild(svg('use', { href: `#${id}`, fill: `url(#${texId}-caus)`, opacity: 0.34 }));
    g.appendChild(svg('use', { href: `#${id}`, fill: `url(#${texId}-caus2)`, opacity: 0.2 }));
    g.appendChild(svg('use', { href: `#${id}`, fill: `url(#${texId}-sheen)`, opacity: 0.2 }));
  }
  const inner = svg('g', { 'clip-path': `url(#${id}-clip)` });
  // wet darker edge (inner half of a stroke), cheap replacement for an erode filter
  if (opts.edge !== false) {
    inner.appendChild(svg('use', { href: `#${id}`, fill: 'none', stroke: '#001B86', 'stroke-width': 11, opacity: 0.22 }));
    inner.appendChild(svg('use', { href: `#${id}`, fill: 'none', stroke: '#001B86', 'stroke-width': 4, opacity: 0.18 }));
    // meniscus: thin light line just inside the edge, offset toward the light
    inner.appendChild(svg('use', { href: `#${id}`, fill: 'none', stroke: '#B4CAFF', 'stroke-width': 3, opacity: 0.6, transform: 'translate(2.5 3)' }));
  }
  let glaze = null;
  if (opts.photo) {
    glaze = svg('path', { fill: 'none', stroke: '#4C7BF5', 'stroke-width': 30, opacity: 0.22 });
    const glaze2 = svg('path', { fill: 'none', stroke: '#6E95FF', 'stroke-width': 14, opacity: 0.22 });
    inner.appendChild(glaze);
    inner.appendChild(glaze2);
    glaze.twin = glaze2;
  }
  g.appendChild(inner);
  root.appendChild(g);

  const m = morpher(opts.contours, opts);
  const mp = opts.photo ? morpher(opts.photo, { ...opts, obstacles: null, pin: null, extra: null, calm: opts.calm, amp: (opts.photoAmp ?? opts.amp ?? 3) * 0.8, seed: (opts.seed || 0) + 9 }) : null;
  let current = m(0);
  shape.setAttribute('d', current);
  if (glaze) {
    const pd = mp(0);
    glaze.setAttribute('d', pd);
    glaze.twin.setAttribute('d', pd);
  }
  const listeners = [];
  const off = onFrame((t) => {
    current = m(t);
    shape.setAttribute('d', current);
    if (mp) {
      const pd = mp(t);
      glaze.setAttribute('d', pd);
      glaze.twin.setAttribute('d', pd);
      listeners.forEach((f) => f(pd));
    }
  }, { fps: 30 });
  return {
    id, clipId: `${id}-clip`, group: g,
    d: () => current,
    onPhoto: (f) => listeners.push(f),
    stop: off,
  };
}

/** Photo cut into a living window. Returns { el, stop } */
export function addPhotoWindow(root, defs, { contours, href, box, amp = 2.6, seed = 9, shade = false, obstacles = null, calm = null }) {
  const id = `w${++uid}`;
  const cp = svg('clipPath', { id });
  const p = svg('path', { id: `${id}-path` });
  cp.appendChild(p);
  defs.appendChild(cp);
  const g = svg('g', { 'clip-path': `url(#${id})`, class: 'photo-window' });
  const [x, y, w, h] = box;
  const img = svg('image', { href, x, y, width: w, height: h, preserveAspectRatio: 'xMidYMid slice', class: 'kenburns' });
  g.appendChild(img);
  if (shade) {
    const gid = `${id}-sh`;
    const lg = svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0.3, y2: 1 });
    lg.appendChild(svg('stop', { offset: 0.35, 'stop-color': '#0A0F1E', 'stop-opacity': 0 }));
    lg.appendChild(svg('stop', { offset: 1, 'stop-color': '#0A0F1E', 'stop-opacity': 0.72 }));
    defs.appendChild(lg);
    g.appendChild(svg('rect', { x, y, width: w, height: h, fill: `url(#${gid})` }));
  }
  root.appendChild(g);
  const m = morpher(contours, { amp, seed, speed: 0.3, obstacles, calm });
  p.setAttribute('d', m(0));
  const off = onFrame((t) => p.setAttribute('d', m(t)), { fps: 30 });
  return { el: g, img, pathId: `${id}-path`, stop: off };
}

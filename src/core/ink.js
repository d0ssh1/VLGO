// Living paint v2 — the approved blob language (see the «кляксы» board):
// hand-made Bézier anchors [x, y, tangent°, handleIn, handleOut] that breathe
// (anchors drift with a slow shared current, swell along their normal, tangents
// sway a little, handles stretch) — the outline stays G1-smooth at every moment.
// Traced shapes (dense point loops) breathe through the same current and are
// drawn as Catmull-Rom splines; near a screen edge they are pushed past it by a
// smooth field, so a blob outline never shows along the edge on any device.

import { svg } from './dom.js';

export const F = (x, y, t, s) => [
  Math.sin(y * 0.012 + t * 0.42 + s) * 3.6 + Math.sin((x + y) * 0.007 - t * 0.3 + s * 1.7) * 2.8,
  Math.sin(x * 0.013 - t * 0.36 + s * 2.1) * 3.6 + Math.sin((x - y) * 0.008 + t * 0.33 + s) * 2.8,
];

export function bezPts(an, t, s, amp) {
  return an.map(([x, y, a, hi, ho], i) => {
    const [fx, fy] = F(x, y, t, s);
    const r = (a * Math.PI) / 180;
    const loc = Math.min(1, Math.pow((hi + ho) / 34, 0.8));
    const nx = -Math.sin(r), ny = Math.cos(r);
    const sw = (Math.sin(t * 0.5 + i * 1.7 + s) * 1.8 + Math.sin(t * 0.31 - i * 0.9 + s * 2) * 1.1) * amp * loc;
    const X = x + fx * amp + nx * sw, Y = y + fy * amp + ny * sw;
    const ra = r + Math.sin(t * 0.4 + i * 2.3 + s) * 0.032 * amp * loc;
    const kh = 1 + Math.sin(t * 0.45 + i * 1.1 + s) * 0.06 * amp * loc;
    const c = Math.cos(ra), si = Math.sin(ra);
    return [X, Y, X - hi * kh * c, Y - hi * kh * si, X + ho * kh * c, Y + ho * kh * si];
  });
}

export function bezPath(an, t, s, amp) {
  const p = bezPts(an, t, s, amp), n = p.length;
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    d += `C${a[4].toFixed(1)} ${a[5].toFixed(1)} ${b[2].toFixed(1)} ${b[3].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d + 'Z';
}

export function bezSample(an, t, s, amp, k = 10) {
  const p = bezPts(an, t, s, amp), n = p.length, o = [];
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    for (let j = 0; j < k; j++) {
      const u = j / k, v = 1 - u;
      o.push([v * v * v * a[0] + 3 * v * v * u * a[4] + 3 * v * u * u * b[2] + u * u * u * b[0],
        v * v * v * a[1] + 3 * v * v * u * a[5] + 3 * v * u * u * b[3] + u * u * u * b[1]]);
    }
  }
  return o;
}

export const cr = (P) => {
  const n = P.length;
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], e = P[(i + 2) % n];
    d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return d + 'Z';
};
export const mv = (P, t, s, k = 1) => P.map(([x, y]) => { const [a, b] = F(x, y, t, s); return [x + a * k, y + b * k]; });
export const warp = (P, W, H) => P.map(([x, y]) => [
  x - 26 * Math.exp(-Math.max(x, 0) / 11) + 26 * Math.exp(-Math.max(W - x, 0) / 11),
  y + 26 * Math.exp(-Math.max(H - y, 0) / 11),
]);

/** paper rim around a photo: a crescent that shows only in a few places and tapers to nothing */
export function halo(P, t, s) {
  const n = P.length;
  let cx = 0, cy = 0;
  for (const [x, y] of P) { cx += x; cy += y; }
  cx /= n; cy /= n;
  let sg = 0;
  const N = P.map((p, i) => {
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const v = [dy / l, -dx / l];
    sg += v[0] * (p[0] - cx) + v[1] * (p[1] - cy);
    return v;
  });
  const f = sg > 0 ? 1 : -1;
  const o = P.map((p, i) => {
    const u = i / n;
    let v = Math.sin(6.2832 * 2 * u + s * 3 + t * 0.12) * 0.75 + Math.sin(6.2832 * 3 * u + s * 5 - t * 0.09) * 0.5 - 0.3;
    v = Math.max(0, Math.min(1, v));
    const w = 5.4 * v * v;
    return [p[0] + N[i][0] * w * f, p[1] + N[i][1] * w * f];
  });
  return 'M' + o.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
}

/** contour points → smooth anchors (tangent from neighbours, handles ∝ chord) */
export function autoAnchors(P, k = 0.37) {
  const n = P.length;
  return P.map((p, i) => {
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
    const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    return [p[0], p[1], ang, Math.hypot(p[0] - a[0], p[1] - a[1]) * k, Math.hypot(b[0] - p[0], b[1] - p[1]) * k];
  });
}
export function dropAnchors([x, y, r]) {
  const hh = r * 0.552, ry = r * 1.05, hy = ry * 0.552;
  return [[x + r, y, 90, hy, hy], [x, y + ry, 180, hh, hh], [x - r, y, -90, hy, hy], [x, y - ry, 0, hh, hh]];
}

let uid = 0;
/** watercolor fill defs: tileable texture + soft radial light. Returns ids + the pattern node (it drifts). */
export function paintDefs(defs) {
  const id = `wp${++uid}`;
  const pat = svg('pattern', { id: `${id}t`, patternUnits: 'userSpaceOnUse', width: 512, height: 512 });
  pat.appendChild(svg('image', { href: 'assets/img/water.jpg', width: 512, height: 512 }));
  const g = svg('radialGradient', { id: `${id}g`, cx: '.35', cy: '.3', r: '.9' });
  [['0', '#7EA2FF', '.2'], ['.65', '#1A3FE0', '0'], ['1', '#0B22A8', '.18']].forEach(([o, c, a]) => g.appendChild(svg('stop', { offset: o, 'stop-color': c, 'stop-opacity': a })));
  defs.appendChild(pat); defs.appendChild(g);
  return { id, pat, tex: `url(#${id}t)`, glow: `url(#${id}g)` };
}

// Builds the illustrated layer of a screen from exported design geometry:
// living paint masses → photo windows → giant word (with paper knockout) → stars.

import { svg } from '../core/dom.js';
import { paintDefs, addPaint, addPhotoWindow } from '../core/paint.js';
import { giantSVG } from '../ui/giant.js';
import { starSVG } from '../ui/star.js';
import { LOGO_DEFS } from '../ui/logo.js';
import { generate, mountBlob } from '../core/blob.js';
import { fitGiant } from '../ui/giant.js';


const IMG = (k) => `assets/img/${k}.jpg`;

const SESSION = 's' + Math.floor(Math.random() * 1e6); // new shapes on every launch
function warpFn(seed, k = 26) {
  if (!seed || seed === 'none') return null;
  let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const a = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28], f = [0.008 + r() * 0.006, 0.006 + r() * 0.006, 0.011 + r() * 0.006, 0.009 + r() * 0.006];
  return ([x, y]) => {
    // keep the word band (y > 520) and the screen edges calmer
    const m = Math.max(0, Math.min(1, (560 - y) / 120));
    return [x + k * m * (Math.sin(y * f[0] + a[0]) * 0.6 + Math.sin((x + y) * f[2] + a[2]) * 0.4),
            y + k * m * (Math.sin(x * f[1] + a[1]) * 0.6 + Math.sin((x - y) * f[3] + a[3]) * 0.4)];
  };
}

export function buildArt(spec, { amp = 6, rim = true, word = true, wordText, wordDy = 0, warp = null, warpK = 26, pin = null, extra = null, calm = null, extraDefs = '', before, after } = {}) {
  const W = warpFn(warp ?? SESSION, warpK);
  if (W) {
    spec = { ...spec,
      paint: spec.paint.map((p) => ({ ...p, c: p.c.map((c) => c.map(W)), photo: p.photo && p.photo.map((c) => c.map(W)) })),
      photos: (spec.photos || []).map((ph) => ({ ...ph, c: ph.c.map((c) => c.map(W)) })) };
  }
  const root = svg('svg', { class: 'art', width: 390, height: 844, viewBox: '0 0 390 844', 'aria-hidden': 'true' });
  const defs = svg('defs');
  defs.innerHTML = LOGO_DEFS + extraDefs;
  root.appendChild(defs);
  const texId = paintDefs(defs);
  const stops = [];
  before?.(root, defs);

  // every outline on screen: used to measure how thin each strand of paint is
  const ALL = [...(spec.paint || []).flatMap((p) => p.c), ...(spec.photos || []).flatMap((ph) => ph.c)];
  const paints = (spec.paint || []).map((p, i) => {
    const P = addPaint(root, defs, texId, {
      contours: p.c, photo: p.photo, soft: p.soft, obstacles: ALL, pin, extra, calm,
      amp: p.soft ? amp * 0.5 : amp, seed: i * 3.1, speed: 0.2 + i * 0.03,
    });
    P.group.classList.add('paint-in');
    P.group.style.setProperty('--i', i);
    stops.push(P.stop);
    return P;
  });

  const winIds = [], rims = [];
  for (const ph of spec.photos || []) {
    const W = addPhotoWindow(root, defs, { contours: ph.c, href: IMG(ph.img), box: ph.box, shade: ph.shade, amp: 2.4, obstacles: ALL, calm });
    W.el.classList.add('photo-in');
    winIds.push(W.pathId);
    // paint frame around the photo: the (moving) window outline stroked in paint,
    // drawn under the photo → the wave always stays outside the picture
    if (paints.length && rim) {
      const fr = svg('g', { class: 'paint-in', style: '--i:0' });
      fr.appendChild(svg('use', { href: `#${W.pathId}`, fill: 'none', stroke: `url(#${texId}-tex)`, 'stroke-width': 30, 'stroke-linejoin': 'round' }));
      fr.appendChild(svg('use', { href: `#${W.pathId}`, fill: 'none', stroke: `url(#${texId}-caus)`, 'stroke-width': 30, 'stroke-linejoin': 'round', opacity: 0.34 }));
      W.el.parentNode.insertBefore(fr, W.el);
      rims.push(W.pathId);
    }
    stops.push(W.stop);
  }

  // paper-coloured part of the word = where it lies on paint (paint shape only,
  // photo windows excluded): mask = paint paths white, photo window contours black
  let clipId = null;
  if (paints.length) {
    clipId = `u${Math.random().toString(36).slice(2, 7)}`;
    const mk = svg('mask', { id: clipId, maskUnits: 'userSpaceOnUse', x: -50, y: -50, width: 490, height: 944 });
    paints.forEach((p) => mk.appendChild(svg('use', { href: `#${p.id}`, fill: '#fff' })));
    rims.forEach((r) => mk.appendChild(svg('use', { href: `#${r}`, fill: 'none', stroke: '#fff', 'stroke-width': 30 })));
    winIds.forEach((wid) => mk.appendChild(svg('use', { href: `#${wid}`, fill: '#000' })));
    defs.appendChild(mk);
  }

  const top = svg('g', { class: 'art-top' });
  if (word) {
    for (const w of spec.words || []) {
      top.insertAdjacentHTML('beforeend', giantSVG(wordText ?? w.text, { x: w.x, y: w.y + wordDy, ang: w.ang * 0.65, size: w.size, min: w.min, rightPad: w.rightPad }, clipId));
    }
  }
  for (const s of spec.stars || []) {
    const o = { rays: s.rays || undefined, vr: s.vr };
    // ink star; the part lying on paint turns paper-coloured (same rule as the giant word)
    top.insertAdjacentHTML('beforeend', starSVG(s.cx, s.cy, s.R, s.rot, o)
      + (clipId && s.knock ? `<g mask="url(#${clipId})">${starSVG(s.cx, s.cy, s.R, s.rot, { ...o, fill: 'var(--paper)' })}</g>` : ''));
  }
  root.appendChild(top);
  after?.(root, defs, { texId, clipId });
  return { root, defs, texId, paints, clipId, top, warp: W || ((q) => q), stop: () => stops.forEach((f) => f()) };
}

// ---------------------------------------------------------------- live (procedural) art

/**
 * Procedural living blot + photo window + giant word + star.
 * opts: seed, word {text, x, y, ang, size}, window {cx,cy,w,h}, img, box, style, drops, star {cx,cy,R,rot}
 */
export function buildLive({ seed, word, window: win, img, box, style = 'card', drops = [], star, shade = false }) {
  const root = svg('svg', { class: 'art', width: 390, height: 844, viewBox: '0 0 390 844', 'aria-hidden': 'true' });
  const defs = svg('defs');
  defs.innerHTML = LOGO_DEFS;
  root.appendChild(defs);
  const texId = paintDefs(defs);
  let wb = null, fit = null;
  if (word) {
    fit = fitGiant(word.text, { x: word.x, y: word.y, ang: word.ang, size: word.size ?? 150, min: word.min ?? 64 });
    // rotated word end on the baseline
    const last = fit.lines[fit.lines.length - 1];
    const w = Math.max(...fit.lines.map((l) => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = `900 ${fit.size}px "Inter Tight"`;
      return c.measureText(l.l).width * fit.sx;
    }));
    const a = (fit.ang * Math.PI) / 180;
    wb = { x0: last.bx, x1: last.bx + w * Math.cos(a), y: last.by + w * Math.sin(a) * 0.5 };
  }
  const comp = generate(seed, { window: win, word: wb, style, drops });
  const live = mountBlob(root, defs, texId, comp, { photo: img ? { href: `assets/img/${img}.jpg`, box, shade } : null });
  // knockout mask = paint minus window
  const maskId = `${live.paintId}-m`;
  const mk = svg('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: -60, y: -60, width: 510, height: 964 });
  mk.appendChild(svg('use', { href: `#${live.paintId}`, fill: '#fff' }));
  mk.appendChild(svg('use', { href: `#${live.windowId}`, fill: '#000' }));
  defs.appendChild(mk);
  const top = svg('g', { class: 'art-top' });
  if (word) top.insertAdjacentHTML('beforeend', giantSVG(word.text, { x: word.x, y: word.y, ang: word.ang, size: word.size ?? 150, min: word.min ?? 64 }, maskId));
  if (star) top.insertAdjacentHTML('beforeend', starSVG(star.cx, star.cy, star.R, star.rot || 0));
  root.appendChild(top);
  return { root, defs, texId, top, comp, live, stop: live.stop };
}

// y-squeeze of a design spec: everything above y=560 is compressed toward the top
// (k), everything below moves up by the same amount — continuous, no seams.
const SQ = { 1: 1, 2: 0.85, 3: 0.76 };
export function squeeze(spec, lines, { T = 60, B = 560, ks = SQ, keepX = false } = {}) {
  const k = ks[lines] ?? 1;
  if (k === 1) return spec;
  const lift = (B - T) * (1 - k);
  const fy = (y) => (y <= B ? T + (y - T) * k : y - lift);
  const sxk = keepX ? 1 : 0.5 + 0.5 * k;
  const fx = (x) => 195 + (x - 195) * sxk; // keep a little of the proportion
  const P = (c) => c.map(([x, y]) => [fx(x), fy(y)]);
  return {
    ...spec,
    paint: spec.paint.map((p) => ({ ...p, c: p.c.map(P), photo: p.photo && p.photo.map(P) })),
    stars: (spec.stars || []).map((st) => ({ ...st, cx: fx(st.cx), cy: fy(st.cy) })),
    photos: spec.photos.map((ph) => {
      const [x, y, w, h] = ph.box;
      return { ...ph, c: ph.c.map(P), box: [fx(x), fy(y), w * sxk, fy(y + h) - fy(y)] };
    }),
  };
}


/**
 * Fit a card drawing (made for a reference word whose top is at `refTop`) to the
 * real name, whose block starts at `top`. Works in the word's tilted frame
 * (v = y + (x − 20)·tan a): everything above the reference top is scaled about
 * v = T, the band down to the baseline is re-spaced, below the baseline nothing
 * moves. So the picture always ends the same distance above the name — no holes,
 * no overlaps — for one short word or three lines.
 */
export function fitToWord(spec, top, refTop, { T = 60, BL = 618, ang = 9 * 0.65 } = {}) {
  const ta = Math.tan((ang * Math.PI) / 180);
  const k = (top - T) / (refTop - T);
  if (Math.abs(k - 1) < 0.01) return spec;
  const mv = (v) => (v <= refTop ? T + (v - T) * k : v >= BL ? v : top + ((v - refTop) * (BL - top)) / (BL - refTop));
  const M = ([x, y]) => { const d = (x - 20) * ta; return [x, mv(y + d) - d]; };
  const P = (c) => c.map(M);
  return {
    ...spec,
    paint: spec.paint.map((p) => ({ ...p, c: p.c.map(P), photo: p.photo && p.photo.map(P) })),
    stars: (spec.stars || []).map((st) => { const [cx, cy] = M([st.cx, st.cy]); return { ...st, cx, cy }; }),
    photos: spec.photos.map((ph) => {
      const [x, y, w, h] = ph.box, cx = x + w / 2;
      const y0 = M([cx, y])[1], y1 = M([cx, y + h])[1];
      return { ...ph, c: ph.c.map(P), box: [x, y0 - 12, w, y1 - y0 + 24] };
    }),
  };
}

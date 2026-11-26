// «Растекание»: a region appears the way spilled water spreads — an expanding
// mask whose edge has slow liquid fingers (3–9 lobes that drift and soften as
// it grows), plus a bright wet meniscus line riding the edge on the paint.
// Runs only for the reveal (~0.7 s), then the mask is removed.
import { svg } from './dom.js';
import { tween, motion } from './loop.js';
import { crPath } from './paint.js';

let uid = 0;
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

function blob(cx, cy, R, e, ph) {
  const N = 44, P = [];
  const A = 1 - 0.75 * e; // fingers are strongest at the start, melt into a round front
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const r = R * (1 + A * (0.2 * Math.sin(3 * a + ph[0] + e * 1.6) + 0.11 * Math.sin(5 * a + ph[1] - e * 2.4) + 0.06 * Math.sin(9 * a + ph[2] + e * 3.1)));
    P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.08]);
  }
  return crPath(P);
}

/**
 * root: the <svg>; target: element to reveal; opts: { cx, cy, maxR, dur, delay, edgeClip }
 * edgeClip: clipPath id — if set, a wet highlight line follows the front, clipped to it.
 */
export function liquidReveal(root, target, { cx, cy, maxR = 760, dur = 0.75, delay = 0, edgeClip = null, seed = Math.random() * 10, ease = 'quart', r0 = 0 } = {}) {
  if (motion.reduced) return Promise.resolve();
  const defs = root.querySelector('defs');
  const id = `lq${++uid}`;
  const mask = svg('mask', { id, maskUnits: 'userSpaceOnUse', x: -60, y: -60, width: 510, height: 964 });
  const shape = svg('path', { fill: '#fff', d: '' });
  mask.appendChild(shape);
  defs.appendChild(mask);
  target.setAttribute('mask', `url(#${id})`);
  let edge = null;
  if (edgeClip) {
    edge = svg('path', { fill: 'none', stroke: '#9DB6FF', 'stroke-width': 7, 'stroke-linejoin': 'round', 'clip-path': `url(#${edgeClip})`, opacity: 0 });
    root.appendChild(edge);
  }
  const ph = [seed, seed * 1.7, seed * 2.3];
  return new Promise((done) => setTimeout(() => {
    tween(dur, (e) => {
      const d = blob(cx, cy, Math.max(0.5, r0 + (maxR - r0) * e), e, ph);
      shape.setAttribute('d', d);
      if (edge) { edge.setAttribute('d', d); edge.setAttribute('opacity', (0.55 * Math.min(1, e * 6) * (1 - e)).toFixed(3)); }
    }, ease === 'flow' ? (t) => 0.7 * t + 0.3 * (1 - (1 - t) * (1 - t)) : ease === 'quad' ? (t) => 1 - (1 - t) * (1 - t) : ease === 'cubic' ? (t) => 1 - Math.pow(1 - t, 3) : easeOutQuart).then(() => {
      target.removeAttribute('mask'); mask.remove(); edge?.remove();
      done();
    });
  }, delay * 1000));
}

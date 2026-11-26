// 06 · Сошлись — the word opens the screen on clean paper (it never changes colour),
// a twinkling star cluster fills the top, the friends sit in a tidy avatar row,
// and one living ultramarine blob holds the place photo and bleeds off the right edge.

import { h, svg } from '../core/dom.js';
import { onFrame, motion, PAINT_FPS } from '../core/loop.js';
import { bezPath, bezSample, halo, autoAnchors, dropAnchors, paintDefs } from '../core/ink.js';
import { measure } from '../ui/giant.js';
import { limeBtn, backBtn } from '../ui/kit.js';
import { originOf } from '../core/util.js';

const STAR = 'M0 -36 L5 -8 L30 -18 L9 2 L26 26 L2 10 L-2 38 L-6 9 L-30 22 L-10 0 L-28 -20 L-4 -8Z';
// hand-placed contour points → smooth Bézier anchors
const WIN = [[80, 306], [140, 284], [205, 296], [262, 318], [318, 300], [358, 324], [366, 384], [340, 432], [354, 490], [322, 540], [262, 548], [200, 536], [140, 556], [84, 546], [54, 500], [66, 446], [48, 388], [56, 334]];
const PAINT = [[42, 302], [100, 268], [170, 266], [232, 288], [290, 276], [334, 264], [396, 258], [446, 272], [446, 400], [440, 520], [446, 610], [418, 646], [366, 648], [330, 620], [300, 584], [240, 574], [176, 590], [120, 600], [60, 592], [24, 556], [26, 500], [40, 450], [24, 396], [28, 340]];
const DROPS = [[300, 642, 8], [20, 280, 5.5]];
const POOLS = [[[-50, 786], [30, 774], [110, 786], [170, 814], [200, 856], [180, 900], [-50, 900]]];
const STARS = [[206, 96, 0.42, 0], [272, 68, 0.2, 1.9], [148, 112, 0.16, 3.1], [350, 84, 0.46, 0.8]];
const WORD = { base: 194, ang: -3.5, maxW: 346 };

export function match(ctx) {
  const el = h('section', { class: 'screen scr-match v2' });
  const S = { paint: autoAnchors(PAINT), window: autoAnchors(WIN), drops: DROPS.map(dropAnchors), pools: POOLS.map((p) => autoAnchors(p)) };

  const root = svg('svg', { class: 'art', viewBox: '0 0 390 844', width: 390, height: 844, 'aria-hidden': 'true' });
  const defs = svg('defs'); root.appendChild(defs);
  const P = paintDefs(defs);
  const clip = svg('clipPath', { id: `${P.id}w` }); const winPath = svg('path'); clip.appendChild(winPath); defs.appendChild(clip);
  const blue = svg('g', { class: 'paint-in' }); root.appendChild(blue);
  const parts = [...S.pools.map((c) => ({ c, k: 0.7 })), { c: S.paint, k: 1 }, ...S.drops.map((c) => ({ c, k: 0.5, drop: true }))];
  for (const p of parts) { p.el = svg('path', { fill: P.tex }); p.g = svg('path', { fill: P.glow }); blue.appendChild(p.el); blue.appendChild(p.g); }
  const rim = svg('path', { fill: '#F5F1EA' }); root.appendChild(rim);
  const wb = WIN.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
  const win = svg('g', { class: 'photo-window photo-in', 'clip-path': `url(#${P.id}w)` });
  win.appendChild(svg('image', { href: 'assets/img/mayak.jpg', x: wb[0] - 14, y: wb[1] - 14, width: wb[2] - wb[0] + 28, height: wb[3] - wb[1] + 28, preserveAspectRatio: 'xMidYMid slice' }));
  root.appendChild(win);
  const stars = STARS.map(([x, y, k, p]) => { const g = svg('g', {}, [svg('path', { d: STAR, fill: '#0E121D' })]); root.appendChild(g); return { g, x, y, k, p }; });
  const dot = svg('circle', { cx: 296, cy: 108, r: 4.5, fill: '#1E4BFF' }); root.appendChild(dot);
  let sz = 110; while (sz > 50 && measure('сошлись!', sz, -0.035).w > WORD.maxW) sz -= 1;
  const word = svg('text', { class: 'gw-line', x: 20, y: WORD.base, 'font-family': 'Inter Tight', 'font-weight': 900, 'font-size': sz, 'letter-spacing': (-sz * 0.035).toFixed(1), fill: '#0E121D' });
  word.textContent = 'сошлись!';
  root.appendChild(svg('g', { class: 'giant', transform: `rotate(${WORD.ang} 20 ${WORD.base})` }, [word]));
  el.appendChild(root);

  const seed = 1.3;
  const render = (T) => {
    parts.forEach((p, i) => {
      let c = p.c;
      if (p.drop) { const ox = Math.sin(T * 0.55 + i * 2 + seed) * 2, oy = Math.sin(T * 0.45 + i * 1.3 + seed) * 2.6; c = c.map(([x, y, ...r]) => [x + ox, y + oy, ...r]); }
      const d = bezPath(c, T, seed + i * 0.3, p.k); p.el.setAttribute('d', d); p.g.setAttribute('d', d);
    });
    winPath.setAttribute('d', bezPath(S.window, T, seed + 3, 0.8));
    rim.setAttribute('d', halo(bezSample(S.window, T, seed + 3, 0.8), T, seed));
    stars.forEach(({ g, x, y, k, p }) => g.setAttribute('transform', `translate(${x} ${y}) rotate(${(Math.sin(T * 0.35 + p) * 8).toFixed(2)}) scale(${(k * (1 + Math.sin(T * 1.1 + p) * 0.08)).toFixed(3)})`));
    P.pat.setAttribute('patternTransform', `translate(${(Math.sin(T * 0.07 + seed) * 60).toFixed(1)} ${((T * 6) % 512).toFixed(1)})`);
  };
  render(0);
  const off = motion.reduced ? () => {} : onFrame((now) => render(now), { fps: PAINT_FPS });

  el.insertAdjacentHTML('beforeend', `
    ${backBtn()}
    <div class="m-who rise" style="--d:2"><span class="m-av"><i>АН</i><i>ДШ</i><i>МД</i><i>НС</i></span><span>вы вчетвером хотите сюда</span></div>
    <h1 class="m-name rise" style="--d:3">Токаревский маяк
      <svg width="18" height="22" viewBox="0 0 20 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10 22s-7.5-6.6-7.5-12.4a7.5 7.5 0 0 1 15 0C17.5 15.4 10 22 10 22z"/><circle cx="10" cy="9.6" r="2.7"/></svg></h1>
    <div class="label rise" style="left:24px;top:648px;--d:4">Запасные варианты:</div>
    ${['zolotoy', 'panorama', 'mys'].map((k, i) => `<button class="alt pop" data-place="${['gnezdo', 'millionka', 'tobizina'][i]}" style="left:${24 + i * 117}px;--d:${5 + i}"><img src="assets/img/${k}.jpg" alt=""></button>`).join('')}
    ${limeBtn('Построить маршрут', { action: 'route', y: 760 })}`);

  el.addEventListener('click', (e) => {
    if (e.target.closest('[aria-label="Назад"]')) return ctx.router.back();
    const a = e.target.closest('[data-place]');
    if (a) return ctx.router.go('place', { id: a.dataset.place }, { transition: 'flood', origin: originOf(ctx, a) });
    const r = e.target.closest('[data-action="route"]');
    if (r) ctx.router.go('map', { focus: 'mayak' }, { transition: 'flood', origin: originOf(ctx, r) });
  });
  return { el, crop: 10, destroy: () => off() };
}

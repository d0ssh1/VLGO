// 06 · Сошлись — the big blot traced from the client's reference; it breathes
// and flows (living paint), friend labels ride the motion, «СОШЛИСЬ!» slams in.

import { h } from '../core/dom.js';
import { onFrame, motion } from '../core/loop.js';
import { buildArt } from './art.js';
import { calmNear, bobs } from '../core/paint.js';
import { rideLabels } from '../ui/ride.js';
import { limeBtn, backBtn } from '../ui/kit.js';
import { originOf } from '../core/util.js';
import SHAPES from '../data/shapes.json';

// label centres = the deepest point of each paint lobe (distance transform of the shape)
const DROPS = [[106, 84, 'АН'], [172, 72, 'ДШ'], [238, 84, 'МД'], [304, 74, 'НС']];

export function match(ctx) {
  const B = bobs(DROPS, { amp: 5, r: 46 });
  const el = h('section', { class: 'screen scr-match' });
  const art = buildArt({ ...SHAPES.match4, stars: [{ cx: 358, cy: 92, R: 20, rot: 0 }], words: SHAPES.match4.words.map((w) => ({ ...w, ang: -12.3, y: 590, size: 124 })) }, { amp: 8, warp: 'none', pin: calmNear(DROPS, 80), extra: B.extra });
  el.appendChild(art.root);
  // drops bob on their necks; the initials are HTML so they glide sub-pixel smooth
  const rl = rideLabels(el, DROPS.map(([x, y, text]) => ({ x, y, text, size: 16 })), B.at);
  const off = rl.stop;

  el.insertAdjacentHTML('beforeend', `
    ${backBtn()}
    <h1 class="m-name rise" style="--d:2">Токаревский маяк
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M10 22s-7.5-6.6-7.5-12.4a7.5 7.5 0 0 1 15 0C17.5 15.4 10 22 10 22z"/><circle cx="10" cy="9.6" r="2.7"/></svg></h1>
    <div class="label rise" style="left:24px;top:650px;--d:3">Запасные варианты:</div>
    ${['zolotoy', 'panorama', 'mys'].map((k, i) => `<button class="alt pop" data-place="${['gnezdo', 'millionka', 'tobizina'][i]}" style="left:${24 + i * 118}px;--d:${4 + i}"><img src="assets/img/${k}.jpg" alt=""></button>`).join('')}
    ${limeBtn('Построить маршрут', { action: 'route' })}`);

  el.addEventListener('click', (e) => {
    if (e.target.closest('[aria-label="Назад"]')) return ctx.router.back();
    const a = e.target.closest('[data-place]');
    if (a) return ctx.router.go('place', { id: a.dataset.place }, { transition: 'flood', origin: originOf(ctx, a) });
    const r = e.target.closest('[data-action="route"]');
    if (r) ctx.router.go('map', { focus: 'mayak' }, { transition: 'flood', origin: originOf(ctx, r) });
  });
  return { el, crop: 10, destroy: () => { off(); art.stop(); } };
}

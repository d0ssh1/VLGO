// 09 · Избранное — template T3 «лужа»: paint pool in the corner, collections as photo pebbles.

import { h } from '../core/dom.js';
import { buildArt } from './art.js';
import { tabbar } from '../ui/kit.js';
import { originOf } from '../core/util.js';
import SHAPES from '../data/shapes.json';

const COLS = [
  { t: 'На закат', n: 8, place: 'tobizina', x: 24, y: 300 },
  { t: 'Маяки и мысы', n: 5, place: 'mayak', x: 203, y: 300 },
  { t: 'Дождливый вечер', n: 6, place: 'millionka', x: 24, y: 520 },
  { t: 'С Катей', n: 4, place: 'gnezdo', x: 203, y: 520 },
];

export function saved(ctx) {
  const el = h('section', { class: 'screen scr-saved' });
  const SP = SHAPES.saved, mv = (c) => c.map(([x, y]) => [x, y > 480 ? y + 14 : y]);
  const art = buildArt({ ...SP, photos: SP.photos.map((ph) => (ph.box[1] > 480 ? { ...ph, c: ph.c.map(mv), box: [ph.box[0], ph.box[1] + 14, ph.box[2], ph.box[3]] } : ph)), stars: [...SP.stars, { cx: 74, cy: 112, R: 24, rot: 14, vr: 0.21 }] }, { amp: 6, rim: false });
  el.appendChild(art.root);
  el.insertAdjacentHTML('beforeend', `
    <div class="chips" style="left:24px;top:244px">${['Все · 23', 'Подборки', 'Были'].map((t, i) => `<button class="chip pop${i === 0 ? ' on' : ''}" style="--d:${i}">${t}</button>`).join('')}</div>
    ${COLS.map((c, i) => `<button class="hit col-hit" data-place="${c.place}" style="left:${c.x}px;top:${c.y}px;width:163px;height:150px" aria-label="${c.t}"></button>
      <div class="col-text rise" style="left:${c.x + 4}px;top:${c.y + 164}px;--d:${i + 2}"><b>${c.t}</b><span>${c.n} ${[2, 3, 4].includes(c.n) ? 'места' : 'мест'}</span></div>`).join('')}
    ${tabbar('saved')}`);
  el.addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (c) { el.querySelectorAll('.chip').forEach((b) => b.classList.toggle('on', b === c)); return; }
    const t = e.target.closest('[data-place]');
    if (t) ctx.router.go('place', { id: t.dataset.place }, { transition: 'flood', origin: originOf(ctx, t) });
  });
  return { el, crop: 40, destroy: art.stop, sbPaint: true };
}

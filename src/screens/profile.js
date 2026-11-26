// 10 · Профиль — T3 pool, avatar as a free paint drop, count-up stats, companies.

import { h } from '../core/dom.js';
import { buildArt } from './art.js';
import { tabbar } from '../ui/kit.js';
import { countUp } from '../core/util.js';
import { onFrame } from '../core/loop.js';
import { calmNear, bobs } from '../core/paint.js';
import { rideLabels } from '../ui/ride.js';
import SHAPES from '../data/shapes.json';

export function profile(ctx) {
  const el = h('section', { class: 'screen scr-profile' });
  const B = bobs([[96, 149]], { amp: 9, r: 95 });
  const art = buildArt(SHAPES.profile, { amp: 6, warpK: 16, pin: calmNear([[96, 149]], 90), extra: B.extra });
  const [ax, ay] = art.warp([96, 149]); // the avatar drop's centre after this launch's warp
  el.appendChild(art.root);
  // the avatar drop is part of the exported paint; its label sits on top
  const offL = rideLabels(el, [{ x: ax, y: ay, text: 'НС', size: 30 }], (i, t) => B.at(0, t)).stop;
  el.insertAdjacentHTML('beforeend', `
    <button class="icon-btn" aria-label="Меню" style="right:22px;top:52px"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg></button>
    <div class="pf-city rise" style="--d:0">Владивосток · в VLGO с 2024</div>
    <div class="stats">
      <div class="stat rise" style="left:24px;--d:1"><b data-n="17">0</b><span>сходили</span></div>
      <div class="stat rise" style="left:136px;--d:2"><b data-n="42">0</b><span>находки</span></div>
      <div class="stat rise" style="left:248px;--d:3"><b data-n="5">0</b><span>компаний</span></div></div>
    <div class="label" style="left:24px;top:446px">Мои интересы</div>
    <div class="chips" style="left:24px;top:470px">${['Море', 'Сопки', 'Кофейни'].map((t, i) => `<span class="chip on pop" style="--d:${i}">${t}</span>`).join('')}<button class="chip pop" style="--d:3" data-go="onboarding">Изменить</button></div>
    <div class="label" style="left:24px;top:532px">Мои компании</div>
    ${[['Пятничные', '4 человека · сошлись на маяке', 4], ['Мы с Дашей', '2 человека · вчера', 2]].map(([t, s, n], i) => `
      <button class="company card rise" style="top:${556 + i * 80}px;--d:${4 + i}"><span class="cnum">${n}</span><span class="ctext"><b>${t}</b><span>${s}</span></span>
      <svg width="9" height="16" viewBox="0 0 9 16"><path d="M1.5 1.5L7.5 8l-6 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>`).join('')}
    ${tabbar('profile')}`);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-go="onboarding"]')) ctx.router.go('onboarding', {}, { transition: 'push' });
    if (e.target.closest('.company')) ctx.router.go('match', {}, { transition: 'push' });
  });
  return {
    el, crop: 30,
    enter() { setTimeout(() => el.querySelectorAll('[data-n]').forEach((b) => countUp(b, +b.dataset.n)), 450); },
    destroy: () => { offL(); art.stop(); },
    sbPaint: true,
  };
}

// 02 · Лента — «находка» of the day in a paint window + two smaller finds.

import { h } from '../core/dom.js';
import { buildArt, buildLive } from './art.js';
import { logoSVG, LOGO_DEFS } from '../ui/logo.js';
import { tabbar } from '../ui/kit.js';
import { originOf } from '../core/util.js';
import SHAPES from '../data/shapes.json';

export function feed(ctx) {
  const spec = SHAPES.feed;
  const el = h('section', { class: 'screen scr-feed' });
  const art = buildArt({ ...spec, paint: spec.paint.filter((p) => Math.min(...p.c.flat().map((q) => q[1])) < 480).map((p) => ({ ...p, c: p.c.filter((c) => { const xs = c.map((q) => q[0]), ys = c.map((q) => q[1]); return Math.max(...xs) - Math.min(...xs) > 60 && Math.max(...ys) - Math.min(...ys) > 60; }) })),
    photos: spec.photos.slice(0, 1).map((ph) => ({ ...ph, img: 'rooftop' })) }, { amp: 8, wordText: 'сегодня', wordDy: -28, warp: 'none' });
  // logo + bell sit in the art svg so they share its coordinate system
  art.top.insertAdjacentHTML('afterbegin', logoSVG(24, 66, 83));
  el.appendChild(art.root);

  el.insertAdjacentHTML('beforeend', `
    <button class="icon-btn bell" aria-label="Уведомления" style="right:22px;top:58px;background:transparent;box-shadow:none">
      <svg width="22" height="25" viewBox="0 0 22 25" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 18.5h16l-2.2-3V10a5.8 5.8 0 0 0-11.6 0v5.5z"/><path d="M8.6 21.2a2.4 2.4 0 0 0 4.8 0"/></svg>
      <span class="dot"></span></button>
    <button class="hit hero-hit" data-place="krysha" aria-label="Крыша на Алеутской"></button>
    <div class="hero-text rise" style="--d:2"><b>Крыша<br>на Алеутской</b><span>Закат над Золотым Рогом<br>и весь город внизу</span></div>
    <img class="card-img pop" src="assets/img/coffee.jpg" alt="" style="left:24px;top:540px;--d:3"><img class="card-img pop" src="assets/img/gallery.jpg" alt="" style="left:203px;top:540px;--d:4">
    <button class="hit card-hit" data-place="svet" style="left:24px;top:540px;width:163px;height:112px" aria-label="Кофейня Тёплый свет"></button>
    <button class="hit card-hit" data-place="zarya" style="left:203px;top:540px;width:163px;height:112px" aria-label="Заря"></button>
    <div class="card-text rise" style="left:26px;top:658px;--d:4"><b>Кофейня<br>«Тёплый свет»</b><span>Раф на халве<br>и окна во двор</span></div>
    <div class="card-text rise" style="left:205px;top:658px;--d:5"><b>«Заря»</b><span>Выставки и маркет<br>в старом цеху</span></div>
    ${tabbar('feed')}`);

  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-place]');
    if (t) ctx.router.go('place', { id: t.dataset.place }, { transition: 'flood', origin: originOf(ctx, t) });
  });
  return { el, destroy: art.stop };
}

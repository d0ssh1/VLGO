// 07 · Место — template T2 «берег»: full-bleed photo whose edge rises parallel
// to the giant short name; the word's tail lies on the paint mass.

import { h } from '../core/dom.js';
import { buildArt, squeeze } from './art.js';
import { layoutName } from '../ui/giant.js';
import { backBtn, limeBtn } from '../ui/kit.js';
import { originOf, toast } from '../core/util.js';
import SHAPES from '../data/shapes.json';
import { REVIEWS, PLACES } from '../data/content.js';

const STARS = (n) => '★★★★★'.slice(0, n) + '<i>' + '★★★★★'.slice(n) + '</i>';
function reviewsStrip(r) {
  if (!r) return '';
  const [rate, count, list] = r;
  const nf = (v) => String(v).replace('.', ',');
  const cnt = `${count} ${count % 10 === 1 && count % 100 !== 11 ? 'отзыв' : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? 'отзыва' : 'отзывов'}`;
  return `<div class="rv-strip rise" style="--d:3">
    <div class="rv-rate"><b>${nf(rate.toFixed(1))}</b><span class="st">${STARS(Math.round(rate))}</span><small>${cnt}<br>на картах</small></div>
    ${list.map(([n, s, t]) => `<div class="rv card"><div class="rv-h"><span class="st">${STARS(s)}</span>${n}</div><p>${t}</p></div>`).join('')}
  </div>`;
}

export function place(ctx, { id = 'tobizina' } = {}) {
  const p = PLACES.find((x) => x.id === id) || PLACES[1];
  const spec = SHAPES.place;
  const el = h('section', { class: 'screen scr-place' });
  // a 2–3 line name pushes the photo + paint up, so no line sits on the picture
  const L = layoutName(p.word, { x: 20, y: 492, ang: -8 * 0.65, rightPad: 14 });
  const base = squeeze(spec, L.lines, { T: 0, B: 440, ks: { 2: 0.72, 3: 0.58 }, keepX: true });
  const art = buildArt({ ...base, photos: base.photos.map((ph) => ({ ...ph, img: p.img })) }, { amp: 6, wordText: p.word });
  el.appendChild(art.root);
  const saved = ctx.store.saved.has(p.id);
  el.insertAdjacentHTML('beforeend', `
    ${backBtn()}
    <button class="icon-btn save-btn${saved ? ' on' : ''}" aria-label="В избранное" style="right:22px;top:52px">
      <svg width="16" height="20" viewBox="0 0 18 21"><path d="M2 1.5h14v18l-7-5-7 5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>
    <div class="pl-name rise" style="--d:0"><b>${p.name}</b> · ${p.area}</div>
    <div class="chips" style="left:24px;top:546px;width:342px">${p.tags.map((t, i) => `<span class="chip sm pop" style="--d:${i + 1}">${t}</span>`).join('')}</div>
    <div class="pl-meta rise" style="--d:2">${p.meta}</div>
    ${reviewsStrip(REVIEWS[p.id])}
    ${limeBtn('В компанию', { w: 230, action: 'company' })}
    <button class="btn btn-outline rise" data-action="route" style="left:266px;top:744px;width:100px;--d:6">Маршрут</button>`);

  el.addEventListener('click', (e) => {
    if (e.target.closest('[aria-label="Назад"]')) return ctx.router.back();
    const sb = e.target.closest('.save-btn');
    if (sb) {
      sb.classList.toggle('on');
      sb.classList.contains('on') ? ctx.store.saved.add(p.id) : ctx.store.saved.delete(p.id);
      return toast(ctx, sb.classList.contains('on') ? 'Сохранили в избранное' : 'Убрали из избранного');
    }
    const a = e.target.closest('[data-action]');
    if (a?.dataset.action === 'company') ctx.router.go('create', { place: p.id }, { transition: 'flood', origin: originOf(ctx, a) });
    if (a?.dataset.action === 'route') ctx.router.go('map', { focus: p.id }, { transition: 'push' });
  });
  return { el, destroy: art.stop };
}

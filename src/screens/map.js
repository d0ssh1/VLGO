// 08 · Карта — real Vladivostok coastline (OSM) as living soft paint, streets on paper,
// ink pins that drop in; tapping a pin slides up its card.

import { h } from '../core/dom.js';
import { buildArt } from './art.js';
import { tabbar, arrow, backBtn } from '../ui/kit.js';
import { icon } from '../ui/icons.js';
import { originOf } from '../core/util.js';
import SHAPES from '../data/shapes.json';
import { PLACES } from '../data/content.js';

const PINS = [
  { x: 200, y: 300, ic: 'house', place: 'millionka' },
  { x: 168, y: 236, ic: 'cup', title: 'Кофейня «Капля»', sub: 'Центр · 6 мин пешком', img: 'panorama' },
  { x: 286, y: 208, ic: 'glass', title: 'Крафт на Пограничной', sub: 'Центр · 9 мин пешком', img: 'crowd' },
  { x: 150, y: 312, ic: 'bun', title: 'Стрит-фуд на Миллионке', sub: 'Центр · 5 мин пешком', img: 'svetlanskaya' },
  { x: 332, y: 296, ic: 'music', title: 'Концерт во дворе', sub: 'Суббота, 19:00', img: 'crowd' },
  { x: 256, y: 252, ic: 'art', title: 'Выставка в «Заре»', sub: 'До 15 декабря', img: 'panorama' },
  { x: 330, y: 470, ic: 'hills', place: 'gnezdo' },
  { x: 214, y: 520, ic: 'sun', title: 'Закат на Чуркине', sub: 'Мыс Чуркин · 18 мин', img: 'mys' },
  { x: 52, y: 498, ic: 'waves', place: 'mayak' },
];

const pinSVG = (p, i) => {
  const r = 16;
  const d = `M0 ${r * 1.75} C${-r * 0.45} ${r * 1.2} ${-r} ${r * 0.6} ${-r} 0 A${r} ${r} 0 1 1 ${r} 0 C${r} ${r * 0.6} ${r * 0.45} ${r * 1.2} 0 ${r * 1.75}Z`;
  return `<button class="pin" data-i="${i}" style="left:${p.x - 22}px;top:${p.y - 22}px;--d:${i}" aria-label="Место на карте">
    <svg width="44" height="54" viewBox="-22 -22 44 54"><path class="pin-body" d="${d}"/></svg>
    <span class="pin-ic">${icon(p.ic, 'currentColor', 19)}</span></button>`;
};

export function map(ctx, { focus } = {}) {
  const spec = SHAPES.map;
  const el = h('section', { class: 'screen scr-map' });
  const art = buildArt(spec, {
    amp: 0, word: false,
    before: (root) => root.insertAdjacentHTML('beforeend', '<image href="assets/img/map_roads.png" x="0" y="0" width="390" height="844" opacity="0.85"/>'),
  });
  el.appendChild(art.root);
  art.root.insertAdjacentHTML('beforeend', `
    <g class="water-labels" fill="#fff" fill-opacity=".75" font-family="Inter" font-weight="700" font-size="10" letter-spacing="1.8">
      <text x="28" y="250" transform="rotate(-62 28 250)">АМУРСКИЙ ЗАЛИВ</text>
      <text x="236" y="394" transform="rotate(3 236 394)">ЗОЛОТОЙ РОГ</text>
      <text x="150" y="690" transform="rotate(-4 150 690)">БОСФОР ВОСТОЧНЫЙ</text></g>
    <g font-family="Inter" font-weight="600" font-size="11" fill="#0E121D" fill-opacity=".55"><text x="232" y="176">Центр</text><text x="232" y="560">Чуркин</text></g>`);

  let sel = focus ? Math.max(0, PINS.findIndex((p) => p.place === focus)) : 0;
  el.insertAdjacentHTML('beforeend', `
    <div class="pins">${PINS.map(pinSVG).join('')}</div>
    <div class="map-scrim" aria-hidden="true"></div>
    <div class="search rise"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="8.6" cy="8.6" r="6.6"/><path d="M13.5 13.5l5 5"/></svg>
      Найти место<span class="filter"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M3 5h14M6 10h8M8.5 15h3"/></svg></span></div>
    <div class="map-chips">${['Все', 'Еда', 'Посмотреть', 'На воздухе'].map((t, i) => `<button class="mchip pop${i === 0 ? ' on' : ''}" style="--d:${i}">${t}</button>`).join('')}</div>
    <div class="osm">© OpenStreetMap</div>
    <div class="map-card"></div>
    ${tabbar('map')}`);

  const card = el.querySelector('.map-card');
  const fill = () => {
    const p = PINS[sel];
    const pl = p.place ? PLACES.find((x) => x.id === p.place) : null;
    const title = pl ? pl.name : p.title, sub = pl ? `${pl.area} · ${pl.meta.split(' · ')[0]}` : p.sub, img = pl ? pl.img : p.img;
    card.innerHTML = `<img src="assets/img/${img}.jpg" alt=""><div class="mc-body"><b>${title}</b><span>${sub}</span>
      <div class="mc-row"><span class="want">3 из 4 хотят</span><button class="more" data-place="${p.place || ''}">Подробнее${arrow('currentColor', 16)}</button></div></div>`;
    el.querySelectorAll('.pin').forEach((b, i) => b.classList.toggle('sel', i === sel));
    card.classList.remove('up'); void card.offsetWidth; card.classList.add('up');
  };
  fill();

  el.addEventListener('click', (e) => {
    const pin = e.target.closest('.pin');
    if (pin) { sel = +pin.dataset.i; fill(); return; }
    const mc = e.target.closest('.mchip');
    if (mc) { el.querySelectorAll('.mchip').forEach((b) => b.classList.toggle('on', b === mc)); return; }
    const more = e.target.closest('.more');
    if (more) ctx.router.go('place', { id: more.dataset.place || 'millionka' }, { transition: 'flood', origin: originOf(ctx, more) });
  });
  return { el, destroy: art.stop, flow: 0 };
}

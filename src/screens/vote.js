// 05 · Голосование — dark screen. Friends who voted are paint spheres joined by
// liquid strands (one living paint mass); the one we wait for is a dashed ghost
// that pulses. «Напомнить» → she votes: the ghost fills, then → Сошлись.

import { h } from '../core/dom.js';
import { buildArt } from './art.js';
import { bobs } from '../core/paint.js';
import { rideLabels } from '../ui/ride.js';
import { toast } from '../core/util.js';
import { backBtn } from '../ui/kit.js';
import SHAPES from '../data/shapes.json';

const SPH = [[291.4, 260.1, 51.2, 'НС'], [134.8, 375.0, 80.1, 'АН'], [108.9, 545.3, 48.0, 'МД']];
const GHOST = [291.7, 532.7, 44.5, 'ДШ'];

export function vote(ctx) {
  const el = h('section', { class: 'screen dark scr-vote' });
  // spheres bob on their liquid strands; positions follow this launch's warp
  let B = null;
  const art = buildArt(SHAPES.vote, {
    amp: 4, warp: 'none',
    extra: (x, y, t) => (B ? B.extra(x, y, t) : [0, 0]),
    extraDefs: `<radialGradient id="sphShade" cx="0.38" cy="0.30" r="0.78"><stop offset="0.45" stop-color="#06104F" stop-opacity="0"/><stop offset="1" stop-color="#06104F" stop-opacity="0.5"/></radialGradient>
      <radialGradient id="hl" cx="0.34" cy="0.28" r="0.42"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="vign" cx="0.55" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#050C18" stop-opacity="0"/><stop offset="1" stop-color="#050C18" stop-opacity="0.5"/></radialGradient>`,
    before: (root) => root.insertAdjacentHTML('beforeend', '<rect x="-80" y="-80" width="550" height="1004" fill="url(#vign)"/>'),
  });
  el.appendChild(art.root);
  const fs = (r) => (r >= 60 ? 30 : r >= 30 ? 20 : 16);
  const C = SPH.map(([x, y, r]) => [...art.warp([x, y]), r * 1.6]);
  B = bobs(C, { amp: 10, r: 70 });
  const rl = rideLabels(el, SPH.map(([, , r, text], i) => ({ x: C[i][0], y: C[i][1], text, size: fs(r), cls: 'dark-ink' })), B.at);
  art.top.insertAdjacentHTML('beforeend', `<g class="ghost"><circle class="g-ring" cx="${GHOST[0]}" cy="${GHOST[1]}" r="${GHOST[2]}" fill="#0535D3" fill-opacity="0.16" stroke="#6B8DFF" stroke-opacity="0.6" stroke-width="1.6" stroke-dasharray="4 6"/>
      <circle class="g-fill" cx="${GHOST[0]}" cy="${GHOST[1]}" r="${GHOST[2]}" fill="url(#${art.texId}-tex)"/>
      <text x="${GHOST[0]}" y="${(GHOST[1] + 0.3635 * 20).toFixed(1)}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="20" fill="#F4F0EA">ДШ</text></g>`);

  el.insertAdjacentHTML('beforeend', `
    ${backBtn()}
    <h1 class="v-title rise" style="--d:0">Голосование<br>в компании</h1>
    <p class="v-sub rise" style="--d:1">Решаем, куда пойти!</p>
    <div class="v-count rise" style="--d:3"><span class="num">3</span> из 4</div>
    <svg class="v-squiggle" width="170" height="14" viewBox="24 709 170 14"><path d="M26 716 C40 709 54 721 69 715 S98 709 112 715 S140 721 154 714 S174 710 186 714" fill="none" stroke="var(--lime)" stroke-width="4.5" stroke-linecap="round" pathLength="1"/></svg>
    <p class="v-wait rise" style="--d:4">Ждём Дашу</p>
    <button class="remind rise" style="--d:5">Напомнить</button>`);

  el.querySelector('[aria-label="Назад"]').addEventListener('click', () => ctx.router.back());
  el.querySelector('.remind').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    toast(ctx, 'Напомнили Даше');
    await new Promise((r) => setTimeout(r, 250));
    el.classList.add('voted');
    e.currentTarget?.remove?.();
    el.querySelector('.remind')?.classList.add('gone');
    el.querySelector('.num').textContent = '4';
    el.querySelector('.v-wait').textContent = 'Все проголосовали!';
    await new Promise((r) => setTimeout(r, 650));
    ctx.router.go('match', {}, { transition: 'flood', origin: { x: GHOST[0], y: GHOST[1] } });
  });
  return { el, destroy: () => { rl.stop(); art.stop(); }, dark: true, flow: 0.25 };
}

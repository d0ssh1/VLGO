// 01 · Интересы (+ intro motion «Капля → разлив → отлив»):
//  1. a drop of ultramarine falls and hits the paper — ink rings run out;
//  2. it bursts into a living pool; inside the wet paint the wordmark is wiped
//     out stroke by stroke in paper colour (a finger drawn through paint);
//  3. the pool recedes like a wave going back — wherever the water leaves, the
//     letters stay behind as blue paint (two masks share one moving outline);
//  4. the ink star bursts in with splatter, the tagline types up, then the logo
//     glides to its place while the screen's paint floods in and the grid builds.

import { h, svg } from '../core/dom.js';
import { tween, wait, easeInCubic, easeOutBack, easeInOutCubic, motion } from '../core/loop.js';
import { buildArt } from './art.js';
import { onFrame } from '../core/loop.js';
import { liquidReveal } from '../core/reveal.js';
import { logoSVG } from '../ui/logo.js';
import { starSVG } from '../ui/star.js';
import { icon } from '../ui/icons.js';
import { darkBtn } from '../ui/kit.js';
import SHAPES from '../data/shapes.json';
import { INTERESTS } from '../data/content.js';

export function onboarding(ctx, { intro = false } = {}) {
  const spec = SHAPES.onboarding;
  const el = h('section', { class: 'screen scr-onboard' + (intro ? ' intro' : '') });
  const art = buildArt({ ...spec, stars: [] }, { amp: 6 });
  el.appendChild(art.root);

  // logo + star live in their own svg so they can glide during the intro
  const brand = svg('svg', { class: 'art brand', width: 390, height: 844, viewBox: '0 0 390 844' });
  brand.innerHTML = `<defs><pattern id="logo-tex" patternUnits="userSpaceOnUse" width="160" height="160"><image href="assets/tex/paint_tex.jpg" width="160" height="160"/></pattern>
      <pattern id="intro-caus" patternUnits="userSpaceOnUse" width="150" height="150"><image href="assets/tex/caustic.png" width="150" height="150"/></pattern>
      <path id="pool-path" d=""/>
      <mask id="pool-in" maskUnits="userSpaceOnUse" x="-300" y="-300" width="900" height="900"><use href="#pool-path" fill="#fff"/></mask>
      <mask id="pool-out" maskUnits="userSpaceOnUse" x="-300" y="-300" width="900" height="900"><rect x="-300" y="-300" width="900" height="900" fill="#fff"/><use href="#pool-path" fill="#000"/></mask></defs>
    <g class="brand-move">
      <g class="rings" fill="none" stroke="#0E121D"><circle r="0" stroke-width="1.1"/><circle r="0" stroke-width="0.8"/><circle r="0" stroke-width="0.6"/></g>
      <g class="pool-g"><use href="#pool-path" fill="url(#logo-tex)"/><use href="#pool-path" fill="url(#intro-caus)" opacity="0.4"/>
        <use href="#pool-path" fill="none" stroke="#A9C2FF" stroke-width="1.6" opacity="0.6"/></g>
      <g class="logo-blue" mask="url(#pool-out)">${logoSVG(26, 62, 136, { draw: true })}</g>
      <g class="logo-paper" mask="url(#pool-in)">${logoSVG(26, 62, 136, { draw: true, fill: '#F4ECE2' })}</g>
      ${starSVG(196, 84, 32, 12, { cls: 'star brand-star' })}
      <g class="splat" fill="#0E121D"></g>
    </g>
    <path class="drop" d="" fill="url(#logo-tex)"/>`;
  el.appendChild(brand);

  const state = Object.fromEntries(INTERESTS.flatMap((g) => g.items.map((it) => [it.id, it.state])));
  const tw = (342 - 16) / 3;
  const grid = INTERESTS.map((g, ci) => {
    const x = 24 + ci * (tw + 8);
    const head = `<div class="col-head rise" style="left:${(x + 4).toFixed(1)}px;--d:${ci}">${g.title}</div>`;
    const tiles = g.items.map((it, ri) =>
      `<button class="tile pop" data-id="${it.id}" style="left:${x.toFixed(1)}px;top:${302 + ri * 88}px;width:${tw.toFixed(1)}px;--d:${ci + ri * 3}">
        <span class="ic">${icon(it.icon, 'currentColor', 24)}</span><span class="tl">${it.label}</span><span class="x" aria-hidden="true">
        <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 1l6 6M7 1L1 7" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg></span></button>`).join('');
    return head + tiles;
  }).join('');

  el.insertAdjacentHTML('beforeend', `
    <h1 class="ob-title rise" style="--d:0">Что тебе<br>нравится?</h1>
    <button class="ob-help rise" style="--d:1" aria-label="Как выбирать"><span>?</span>Как выбирать</button>
    ${grid}
    <div class="ob-count rise" style="--d:6"></div>
    ${darkBtn('Дальше', { action: 'next' })}
    <div class="intro-tag" aria-hidden="true">${[...'места от своих'].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</div>
    <button class="skip" aria-label="Пропустить заставку"></button>
    <div class="ob-sheet" role="dialog" aria-label="Как выбирать интересы" hidden>
      <div class="ob-dim"></div>
      <div class="ob-card">
        <h2>Как выбирать</h2>
        <div class="demo">
          <div class="demo-tile"><span class="ic">${icon('cup', 'currentColor', 26)}</span><span class="tl">Кофейни</span>
            <span class="x" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 1l6 6M7 1L1 7" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg></span></div>
          <i class="finger"></i>
        </div>
        <ol class="steps">
          <li data-s="1"><span class="sw on"></span><b>1 тап</b>нравится — покажем чаще</li>
          <li data-s="2"><span class="sw no"></span><b>2 тапа</b>не интересно — скроем</li>
          <li data-s="0"><span class="sw"></span><b>3 тапа</b>вернуть как было</li>
        </ol>
        <button class="btn btn-dark ok">Понятно</button>
      </div>
    </div>`);

  // how-to sheet: a demo tile cycles neutral → like → not interested, the matching
  // step lights up; opens once after the intro and from the «Как выбирать» chip
  const sheet = el.querySelector('.ob-sheet');
  let demoT = null;
  const openHelp = () => {
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('open'));
    const tile = sheet.querySelector('.demo-tile'), fin = sheet.querySelector('.finger');
    const steps = [...sheet.querySelectorAll('.steps li')];
    let st = 0;
    const tick = () => {
      st = st === 0 ? 1 : st === 1 ? 2 : 0;
      fin.classList.remove('tap'); void fin.offsetWidth; fin.classList.add('tap');
      setTimeout(() => {
        tile.classList.toggle('on', st === 1); tile.classList.toggle('no', st === 2);
        tile.classList.remove('bump'); void tile.offsetWidth; tile.classList.add('bump');
        steps.forEach((li) => li.classList.toggle('cur', +li.dataset.s === st));
      }, 180);
    };
    clearInterval(demoT); tick(); demoT = setInterval(tick, 1500);
  };
  const closeHelp = () => {
    sheet.classList.remove('open'); clearInterval(demoT);
    setTimeout(() => { sheet.hidden = true; }, 380);
    ctx.store.helpSeen = true;
  };
  el.querySelector('.ob-help').addEventListener('click', openHelp);
  sheet.querySelector('.ok').addEventListener('click', closeHelp);
  sheet.querySelector('.ob-dim').addEventListener('click', closeHelp);
  const autoHelp = () => { if (!ctx.store.helpSeen) setTimeout(() => { if (!ctx.store.helpSeen && el.isConnected) openHelp(); }, 1300); };

  const countEl = el.querySelector('.ob-count');
  const btn = el.querySelector('[data-action="next"]');
  const render = () => {
    el.querySelectorAll('.tile').forEach((t) => {
      const s = state[t.dataset.id];
      t.classList.toggle('on', s === 1);
      t.classList.toggle('no', s === -1);
      t.setAttribute('aria-pressed', s === 1);
    });
    const n = Object.values(state).filter((v) => v === 1).length;
    countEl.innerHTML = n >= 3 ? `Выбрано ${n} <span>· можно продолжать</span>` : `Выбрано ${n} <span>· выбери ещё ${3 - n}</span>`;
    btn.disabled = n < 3;
  };
  render();

  el.addEventListener('click', (e) => {
    const t = e.target.closest('.tile');
    if (t) {
      const id = t.dataset.id;
      state[id] = state[id] === 0 ? 1 : state[id] === 1 ? -1 : 0;
      t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
      render();
      ctx.store.interests = { ...state };
      return;
    }
    if (e.target.closest('[data-action="next"]') && !btn.disabled) {
      const r = btn.getBoundingClientRect(), pr = ctx.phone.getBoundingClientRect();
      const s = pr.width / 390;
      ctx.router.go('feed', {}, { transition: 'flood', origin: { x: (r.left - pr.left + r.width / 2) / s, y: (r.top - pr.top + r.height / 2) / s } });
    }
  });

  let aborted = false;
  async function playIntro() {
    const move = brand.querySelector('.brand-move');
    const drop = brand.querySelector('.drop');
    const poolPath = brand.querySelector('#pool-path');
    const rings = [...brand.querySelectorAll('.rings circle')];
    // intro layout: logo + star centred and big (scale about the group origin)
    const S = 1.65, CX = 127, CY = 84;
    const ix = 195 - CX * S, iy = 380 - CY * S;
    move.style.transformOrigin = '0 0';
    move.style.transform = `translate(${ix}px, ${iy}px) scale(${S})`;
    const PX = 100, PY = 86; // pool centre (local units of the logo group)
    const landX = ix + PX * S, landY = iy + PY * S;
    const tear = (cx, cy, r, stretch) => {
      const top = cy - r * stretch;
      return `M${cx} ${top} C${cx + r * 0.35} ${cy - r * 0.9} ${cx + r} ${cy - r * 0.35} ${cx + r} ${cy} A${r} ${r * (1 / Math.max(stretch * 0.6, 0.7))} 0 1 1 ${cx - r} ${cy} C${cx - r} ${cy - r * 0.35} ${cx - r * 0.35} ${cy - r * 0.9} ${cx} ${top}Z`;
    };
    // the pool: a living outline (lobes drift with time, fingers when it moves fast)
    const pool = { R: 0, f: 1 };
    const ph = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
    const offPool = onFrame((t) => {
      if (pool.R < 0.5) { poolPath.setAttribute('d', ''); return; }
      const N = 48, P = [];
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        const r = pool.R * (1 + pool.f * (0.16 * Math.sin(3 * a + ph[0] + t * 0.9) + 0.09 * Math.sin(5 * a + ph[1] - t * 1.3) + 0.05 * Math.sin(8 * a + ph[2] + t * 1.7)));
        P.push([PX + Math.cos(a) * r * 1.18, PY + Math.sin(a) * r * 0.86]);
      }
      let d = `M${P[0][0].toFixed(2)} ${P[0][1].toFixed(2)}`;
      for (let i = 0; i < N; i++) {
        const p0 = P[(i - 1 + N) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
        d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
      }
      poolPath.setAttribute('d', d + 'Z');
    });
    stopIntro = offPool;

    await wait(200);
    // 1 · the drop falls
    await tween(0.55, (e) => drop.setAttribute('d', tear(landX, -60 + (landY + 60) * e, 27, 2.1 - e * 0.6)), easeInCubic);
    // impact: the drop squashes flat before it bursts
    await tween(0.1, (e) => drop.setAttribute('d', tear(landX, landY + 6 * e, 27 + 8 * e, 1.5 - 0.7 * e)), (t) => t);
    if (aborted) return;
    drop.style.opacity = '0';
    // ink rings run out over the paper
    rings.forEach((c, i) => { c.setAttribute('cx', PX); c.setAttribute('cy', PY); });
    tween(1.3, (e) => rings.forEach((c, i) => {
      const q = Math.max(0, Math.min(1, e * 1.25 - i * 0.12));
      c.setAttribute('r', (8 + q * (150 + i * 30)).toFixed(1));
      c.setAttribute('opacity', (q > 0 ? 0.5 * (1 - q) : 0).toFixed(3));
    }), (t) => t);
    // 2 · it bursts into a pool; fingers melt as it settles
    tween(0.75, (e) => { pool.R = 6 + 98 * e; pool.f = 1 - 0.55 * e; }, (t) => 1 - Math.pow(1 - t, 3));
    await wait(230);
    el.classList.add('paper-draw'); // the wordmark is wiped through the wet paint
    const tag = el.querySelector('.intro-tag');
    await wait(720);
    if (aborted) return;
    // 3 · the water recedes; the letters stay behind in blue
    el.classList.add('solid');
    setTimeout(() => tag.classList.add('on'), 520);
    await tween(0.8, (e) => { pool.R = 104 * (1 - e); pool.f = 0.45 + 0.6 * e; }, (t) => t * t * (3 - 2 * t));
    if (aborted) return;
    // 4 · star + splatter
    el.classList.add('star-go');
    const splat = brand.querySelector('.splat');
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + Math.random() * 0.5, d = 26 + Math.random() * 16, r = 1.2 + Math.random() * 1.8;
      const c = svg('circle', { cx: 196, cy: 84, r });
      splat.appendChild(c);
      tween(0.6, (e) => { c.setAttribute('cx', (196 + Math.cos(a) * d * e).toFixed(2)); c.setAttribute('cy', (84 + Math.sin(a) * d * e).toFixed(2)); c.setAttribute('opacity', (1 - e * e).toFixed(3)); }, (t) => 1 - Math.pow(1 - t, 3));
    }
    await wait(850);
    if (aborted) return;
    // glide to the final place; the screen's paint floods in behind
    tag.classList.add('off');
    const R0 = art.root, body = svg('g');
    [...R0.childNodes].forEach((n) => { if (n.nodeName !== 'defs') body.appendChild(n); });
    R0.appendChild(body);
    el.classList.add('flooding');
    liquidReveal(R0, body, { cx: 360, cy: 40, maxR: 980, dur: 1.2, ease: 'flow', r0: 30 });
    await tween(0.75, (e) => {
      const s = S + (1 - S) * e;
      move.style.transform = `translate(${ix * (1 - e)}px, ${iy * (1 - e)}px) scale(${s})`;
    }, easeInOutCubic);
    move.style.transform = '';
    completed = true;
  }
  let stopIntro = null, completed = false;

  return {
    el,
    enter() {
      if (intro && !motion.reduced) {
        ctx.statusbar?.(false, false);
        el.classList.remove('screen-in');
        const skip = el.querySelector('.skip');
        const move = brand.querySelector('.brand-move');
        let done = false;
        const finish = () => {
          if (done) return; done = true; aborted = true; stopIntro?.(); brand.querySelector('#pool-path').setAttribute('d', '');
          move.style.transform = ''; skip.remove();
          el.classList.remove('intro');
          // a skipped intro still draws the logo on; a finished one is already solid
          el.classList.add(completed ? 'star-go' : 'logo-draw', 'screen-in');
          ctx.statusbar?.(false, true);
          autoHelp();
        };
        skip.addEventListener('click', finish);
        playIntro().then(finish);
      } else {
        el.classList.remove('intro');
        el.classList.add('logo-draw');
        el.querySelector('.skip')?.remove();
        autoHelp();
      }
    },
    leave() { clearInterval(demoT); },
    destroy: art.stop,
    sbPaint: true,
  };
}

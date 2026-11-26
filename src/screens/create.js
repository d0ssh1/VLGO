// 04 · Новая компания — friends as separate paint drops, today's intent,
// when / budget / distance as segmented controls, CTA → swipe together.

import { h } from '../core/dom.js';
import { buildArt } from './art.js';
import { limeBtn } from '../ui/kit.js';
import { originOf, toast } from '../core/util.js';
import SHAPES from '../data/shapes.json';
import { FRIENDS, INTENTS } from '../data/content.js';

const seg = (name, items, on) => `<div class="seg rise" data-seg="${name}">
  <span class="thumb"></span>${items.map((t, i) => `<button class="${i === on ? 'on' : ''}" data-i="${i}">${t}</button>`).join('')}</div>`;

export function create(ctx) {
  const spec = SHAPES.create;
  const el = h('section', { class: 'screen scr-create' });
  const art = buildArt({ ...spec, words: spec.words.map((w) => ({ ...w, min: 50 })) }, { amp: 6, wordText: 'куда пойдём?', wordDy: 30 });
  el.appendChild(art.root);
  const friends = [...FRIENDS];
  el.insertAdjacentHTML('beforeend', `
    <button class="icon-btn close" aria-label="Закрыть" style="left:22px;top:52px">
      <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
    <div class="friends"></div>
    <div class="link-row card rise" style="--d:1"><span class="muted">Ссылка</span><b>vlgo.ru/k/7fq2</b><button class="copy">Копировать</button></div>
    <div class="label" style="left:26px;top:368px">Что хотим сегодня</div>
    <div class="intents">${INTENTS.map((t, i) => `<button class="intent pop${i < 2 ? ' on' : ''}" style="--d:${i}">${t}</button>`).join('')}</div>
    <div class="label" style="left:26px;top:496px">Когда</div>
    <div style="position:absolute;top:518px">${seg('when', ['Сейчас', 'Вечером', 'В выходные'], 1)}</div>
    <div class="label" style="left:26px;top:580px">Бюджет и дорога</div>
    <div style="position:absolute;top:602px">${seg('budget', ['Бесплатно', 'До 1500 ₽', 'Любой'], 1)}</div>
    <div style="position:absolute;top:654px">${seg('dist', ['Пешком', 'До 30 мин', 'Неважно'], 1)}</div>
    ${limeBtn('Выбирать вместе', { action: 'go' })}`);

  const fr = el.querySelector('.friends');
  // up to 4 drops in the row; with more people the 4th slot becomes «+N»;
  // the «+» to invite is always the last slot. Only the newcomer animates.
  let first = true;
  const drawFriends = (popLast = false) => {
    const MAX = 4;
    const shown = friends.length > MAX ? friends.slice(0, MAX - 1) : friends;
    const extra = friends.length - shown.length;
    const anim = (i, last) => (first ? ' pop' : popLast && last ? ' new' : '');
    let html = shown.map((f, i) => `<span class="fdrop${anim(i, !extra && i === shown.length - 1)}" style="left:${24 + i * 66}px;--d:${i}">${f.ini}</span>`).join('');
    if (extra) html += `<span class="fdrop more${anim(0, true)}" style="left:${24 + shown.length * 66}px;--d:${shown.length}" title="${friends.slice(MAX - 1).map((f) => f.name).join(', ')}">+${extra}</span>`;
    const n = shown.length + (extra ? 1 : 0);
    html += `<button class="fdrop add${first ? ' pop' : ''}" style="left:${24 + n * 66}px;--d:${n}" aria-label="Позвать друга">+</button>`;
    fr.innerHTML = html;
    first = false;
  };
  drawFriends();

  const placeThumb = (segEl) => {
    const b = segEl.querySelector('button.on');
    const t = segEl.querySelector('.thumb');
    t.style.left = `${b.offsetLeft}px`;
    t.style.width = `${b.offsetWidth}px`;
  };

  el.addEventListener('click', (e) => {
    if (e.target.closest('.close')) return ctx.router.back();
    if (e.target.closest('.add')) {
      const NEW = [['КА', 'Катя'], ['ЛЁ', 'Лёша'], ['АР', 'Аня'], ['МИ', 'Миша'], ['ТИ', 'Тимур'], ['ВЕ', 'Вера']];
      const [ini, name] = NEW[(friends.length - FRIENDS.length) % NEW.length];
      friends.push({ ini, name });
      drawFriends(true);
      return toast(ctx, `${name} ${name.endsWith('а') || name.endsWith('я') ? 'присоединилась' : 'присоединился'}`);
    }
    if (e.target.closest('.copy')) return toast(ctx, 'Ссылка скопирована');
    const it = e.target.closest('.intent');
    if (it) { it.classList.toggle('on'); return; }
    const sb = e.target.closest('.seg button');
    if (sb) {
      const s = sb.parentElement;
      s.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === sb));
      placeThumb(s);
      return;
    }
    const go = e.target.closest('[data-action="go"]');
    if (go) ctx.router.go('swipe', {}, { transition: 'flood', origin: originOf(ctx, go) });
  });

  return {
    el,
    enter() { requestAnimationFrame(() => el.querySelectorAll('.seg').forEach(placeThumb)); },
    destroy: art.stop,
    sbPaint: true,
  };
}

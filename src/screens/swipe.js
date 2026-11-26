// 03 · Свайп — the whole paint composition is the card: drag it, it tilts and
// flies away; the next place pours in. ★ = хочу, ✕ = мимо, закладка = в избранное.

import { h, svg } from '../core/dom.js';
import { liquidReveal } from '../core/reveal.js';
import { tween, easeOutCubic, easeOutBack, motion } from '../core/loop.js';
import { flow } from '../core/paint.js';
import { buildBlobCard, BLOB_BASES } from '../ui/blobcard.js';
import { originOf, toast } from '../core/util.js';
import { backBtn } from '../ui/kit.js';
import { PLACES } from '../data/content.js';

const DECK = ['svet', 'pena', 'krab', 'holodilnik', 'zarya', 'nochgorod', 'zvuk', 'mayak', 'kvartira'];

export function swipe(ctx) {
  const el = h('section', { class: 'screen scr-swipe' });
  const stack = h('div', { class: 'deck' });
  el.appendChild(stack);
  el.insertAdjacentHTML('beforeend', `
    ${backBtn()}
    <div class="sw-meta rise" style="--d:1"></div>
    <div class="sw-friends rise" style="--d:2">Катя и Лёша уже за
      <span class="mini-drops"><i>КА</i><i>ЛЁ</i></span></div>
    <button class="sw-btn no pop" style="--d:3" aria-label="Мимо"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M3.5 3.5l17 17M20.5 3.5l-17 17" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg></button>
    <button class="sw-btn yes pop" style="--d:4" aria-label="Хочу пойти"><svg width="32" height="29" viewBox="0 0 24 22"><path d="M12 21s-9.5-5.8-9.5-12.3A5.4 5.4 0 0 1 12 5.3a5.4 5.4 0 0 1 9.5 3.4C21.5 15.2 12 21 12 21z" fill="currentColor"/></svg></button>
    <div class="sw-caps"><span class="c-no">Мимо</span><span class="c-save">Сохранить</span><span class="c-yes">Хочу</span></div>
    <button class="icon-btn undo" aria-label="Вернуть предыдущую" style="left:74px;top:52px" disabled><svg width="20" height="18" viewBox="0 0 20 18" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 1.5L1.5 6 6 10.5"/><path d="M1.5 6h10a6.5 6.5 0 0 1 0 13H8"/></svg></button>
    <button class="sw-btn save pop" style="--d:5" aria-label="В избранное"><svg width="16" height="20" viewBox="0 0 21 26"><path d="M2 2h17v22l-8.5-6-8.5 6z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/></svg></button>
    <div class="stamp" aria-hidden="true"></div>`);

  let idx = 0, card = null, likes = 0;
  const past = [];
  const meta = el.querySelector('.sw-meta');
  const stamp = el.querySelector('.stamp');
  const friends = el.querySelector('.sw-friends');

  // all card photos are decoded up-front, so a photo never "loads" on screen
  const cache = {};
  const preload = (img) => (cache[img] ??= new Promise((res) => {
    const im = new Image(); im.src = `assets/img/${img}.jpg`;
    (im.decode ? im.decode() : Promise.resolve()).then(res, res);
  }));
  DECK.forEach((id) => preload(PLACES.find((p) => p.id === id).img));

  // Transition «растекание»:
  //  1. the old card's word vanishes, its photo closes, the card flies off with the swipe;
  //  2. underneath, the next card's paint floods out from the photo centre with
  //     liquid fingers and a wet meniscus line, then the picture itself spreads
  //     inside it like water soaking into paper (settling from a slight zoom);
  //  3. the giant word slides in last, the caption swaps once the old card has gone.
  // The next card is built ahead of time (hidden), so a swipe never stalls on DOM work.
  let next = null, lastKind = null;
  function makeCard(i) {
    const place = PLACES.find((p) => p.id === DECK[i % DECK.length]);
    // one of the approved compositions (never the same twice in a row), laid out for this name
    const pool = BLOB_BASES.map((c, j) => j).filter((j) => BLOB_BASES[j].kind !== lastKind);
    const forced = new URLSearchParams(location.search).get('base');
    const bi = forced != null ? +forced % BLOB_BASES.length : pool[Math.floor(Math.random() * pool.length)];
    lastKind = BLOB_BASES[bi].kind;
    const art = buildBlobCard(BLOB_BASES[bi], place.word, place.img);
    const wrap = h('div', { class: 'card-art quick tide' });
    wrap.style.visibility = 'hidden';
    wrap.appendChild(art.root);
    const R = art.root, body = svg('g');
    [...R.childNodes].forEach((n) => { if (n.nodeName !== 'defs') body.appendChild(n); });
    R.appendChild(body);
    body.setAttribute('opacity', '0');
    stack.insertBefore(wrap, stack.firstChild);
    return { i, wrap, art, place, R, body, box: art.box, lay: art.layout };
  }
  function showCard({ under = false } = {}) {
    if (next && next.i !== idx) { next.art.stop(); next.wrap.remove(); next = null; }
    const c = next || makeCard(idx);
    next = null;
    const { wrap, art, place, R, body, box, lay } = c;
    if (!under) stack.appendChild(wrap); // on top (first card / undo)
    wrap.style.visibility = '';
    body.removeAttribute('opacity');
    const [bx, by, bw, bh] = box, pcx = bx + bw / 2, pcy = by + bh / 2;
    const d0 = idx || under ? 0 : 0.3;
    if (motion.lite) {
      // phones: the card rises out of the water as one GPU layer (no per-frame masks)
      wrap.animate([{ opacity: 0, transform: 'translateY(26px) scale(0.94)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay: d0 * 1000, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    } else {
      liquidReveal(R, body, { cx: pcx, cy: pcy, maxR: 640, dur: 1.0, delay: d0, edgeClip: art.paints[0]?.clipId, ease: 'flow', r0: 40 });
      const win = R.querySelector('.photo-window');
      if (win) liquidReveal(R, win, { cx: pcx + 10, cy: pcy - 6, maxR: Math.max(bw, bh) * 0.85, dur: 0.9, delay: d0 + 0.38, ease: 'quad' });
    }
    requestAnimationFrame(() => wrap.classList.add('screen-in'));
    if (idx) tween(1.4, (e) => { flow.gain = 1 + 1.4 * (1 - e); }, easeOutCubic);
    const setMeta = () => {
      meta.innerHTML = `<b>${place.name}</b> · ${place.area}`;
      meta.style.top = `${lay.metaTop}px`; friends.style.top = `${lay.friendsTop}px`;
      meta.classList.remove('swap'); void meta.offsetWidth; meta.classList.add('swap');
    };
    if (under) { meta.classList.add('out'); setTimeout(() => { meta.classList.remove('out'); setMeta(); }, 300); } else setMeta();
    card = c;
    // prepare the following card while the user looks at this one
    const want = idx + 1;
    setTimeout(() => { if (!next && card === c) { preload(PLACES.find((p) => p.id === DECK[want % DECK.length]).img); next = makeCard(want); } }, 1400);
    return card;
  }

  // Button feedback. «Хочу»: the heart beats and splashes paint + lime drops;
  // «Мимо»: the cross spins away, the button flinches; «Сохранить»: the mark drops in.
  const BTN = { '-1': [96, 748, '.sw-btn.no'], '1': [294, 748, '.sw-btn.yes'], save: [195, 748, '.sw-btn.save'] };
  function react(kind) {
    const [x, y, sel] = BTN[kind];
    const b = el.querySelector(sel);
    b.classList.remove('boom'); void b.offsetWidth; b.classList.add('boom');
    const ring = h('i', { class: `sw-ring ${kind === '1' ? 'lime' : ''}`, style: `left:${x}px;top:${y}px` });
    el.appendChild(ring); setTimeout(() => ring.remove(), 700);
    if (kind !== '1') return;
    // a handful of irregular paint blots thrown up-and-right, mixed sizes
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + 0.35 + (Math.random() - 0.5) * 1.5, d = 50 + Math.random() * 46, r = 2 + Math.random() * 5;
      const dot = h('i', { class: `sw-drop ${k % 3 === 0 ? 'lime' : ''}`, style: `left:${x}px;top:${y}px;width:${2 * r * (1 + Math.random() * 0.5)}px;height:${2 * r}px;border-radius:${50 + Math.random() * 20}% ${40 + Math.random() * 30}% ${50 + Math.random() * 20}% ${45 + Math.random() * 25}%` });
      el.appendChild(dot);
      dot.animate([
        { transform: `translate(-50%,-50%) rotate(${a}rad) scale(0.4)`, opacity: 0 },
        { transform: `translate(-50%,-50%) translate(${Math.cos(a) * 26}px, ${Math.sin(a) * 26}px) rotate(${a}rad) scale(1.2, 0.8)`, opacity: 1, offset: 0.2 },
        { transform: `translate(-50%,-50%) translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 22}px) rotate(${a + 1}rad) scale(0.35)`, opacity: 0 },
      ], { duration: 760, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => dot.remove();
    }
  }
  const pull = (dx) => {
    el.querySelector('.sw-btn.no').style.setProperty('--pull', Math.max(0, Math.min(1, -dx / 120)).toFixed(3));
    el.querySelector('.sw-btn.yes').style.setProperty('--pull', Math.max(0, Math.min(1, dx / 120)).toFixed(3));
  };

  async function fling(dir) {
    if (!card) return;
    const c = card; card = null;
    react(String(dir)); pull(0);
    stamp.textContent = dir > 0 ? 'ХОЧУ' : 'МИМО';
    stamp.className = `stamp show ${dir > 0 ? 'yes' : 'no'}`;
    const x0 = c.dx || 0;
    past.push({ idx, dir, id: c.place.id });
    if (dir > 0) { likes++; ctx.store.liked.add(c.place.id); }
    const last = likes >= 2 && dir > 0;
    undoBtn.disabled = false;
    if (last) { ctx.router.go('vote', {}, { transition: 'flood', origin: { x: 195, y: 760 } }); return; }
    idx++;
    await preload(PLACES.find((p) => p.id === DECK[idx % DECK.length]).img);
    showCard({ under: true });
    // old card: iris closes over the photo, then the card leans away
    c.wrap.classList.add('tide-out');
    setTimeout(() => { if (stamp.classList.contains('show')) stamp.className = 'stamp'; }, 260);
    c.wrap.style.zIndex = 2;
    await tween(0.34, (e) => {
      const x = x0 + (dir * 460 - x0) * e * e;
      c.wrap.style.transform = `translate(${x}px, ${-24 * e}px) rotate(${dir * 12 * e * e}deg)`;
      c.wrap.style.opacity = String(1 - Math.max(0, e - 0.5) * 2);
    }, easeOutCubic);
    c.art.stop(); c.wrap.remove();
  }

  // drag
  let start = null;
  stack.addEventListener('pointerdown', (e) => {
    if (!card) return;
    start = { x: e.clientX, y: e.clientY, s: ctx.phone.getBoundingClientRect().width / 390 };
    card.dx = 0;
    stack.setPointerCapture(e.pointerId);
  });
  stack.addEventListener('pointermove', (e) => {
    if (!start || !card) return;
    const dx = (e.clientX - start.x) / start.s, dy = (e.clientY - start.y) / start.s;
    card.dx = dx;
    card.wrap.style.transform = `translate(${dx}px, ${dy * 0.3}px) rotate(${dx * 0.05}deg)`;
    stamp.textContent = dx > 0 ? 'ХОЧУ' : 'МИМО';
    stamp.className = `stamp ${dx > 0 ? 'yes' : 'no'}`;
    stamp.style.opacity = Math.min(Math.abs(dx) / 120, 1);
    pull(dx);
  });
  const end = () => {
    if (!start || !card) return;
    start = null;
    stamp.style.opacity = '';
    pull(0);
    if (Math.abs(card.dx || 0) < 6) { const id = card.place.id; card.wrap.style.transform = ''; ctx.router.go('place', { id }, { transition: 'push' }); return; }
    if (Math.abs(card.dx || 0) > 110) fling(Math.sign(card.dx));
    else {
      const c = card, x0 = c.dx || 0;
      c.dx = 0;
      tween(0.35, (e) => { c.wrap.style.transform = `translate(${x0 * (1 - e)}px,0) rotate(${x0 * 0.05 * (1 - e)}deg)`; }, easeOutCubic);
      stamp.className = 'stamp';
    }
  };
  stack.addEventListener('pointerup', end);
  stack.addEventListener('pointercancel', end);

  el.querySelector('[aria-label="Назад"]').addEventListener('click', () => ctx.router.back());
  const undoBtn = el.querySelector('.undo');
  undoBtn.addEventListener('click', async () => {
    const last = past.pop();
    if (!last || !card) return;
    if (last.dir > 0) { likes--; ctx.store.liked.delete(last.id); }
    // current card slides away to the opposite side, the previous one flies back in
    const c = card; card = null;
    await tween(0.3, (e) => { c.wrap.style.transform = `translate(${-last.dir * 300 * e}px, 0) scale(${1 - 0.1 * e})`; c.wrap.style.opacity = String(1 - e); }, easeOutCubic);
    c.art.stop(); c.wrap.remove();
    idx = last.idx; showCard();
    const w = card.wrap;
    await tween(0.45, (e) => { w.style.transform = `translate(${last.dir * 420 * (1 - e)}px, ${-30 * (1 - e)}px) rotate(${last.dir * 16 * (1 - e)}deg)`; }, easeOutCubic);
    undoBtn.disabled = past.length === 0;
  });
  el.querySelector('.no').addEventListener('click', () => fling(-1));
  el.querySelector('.yes').addEventListener('click', () => fling(1));
  el.querySelector('.save').addEventListener('click', (e) => {
    if (!card) return;
    ctx.store.saved.add(card.place.id);
    e.currentTarget.classList.add('saved');
    react('save');
    toast(ctx, 'Сохранили в избранное');
  });

  showCard();
  return { el, crop: 56, destroy: () => { card?.art.stop(); next?.art.stop(); } };
}

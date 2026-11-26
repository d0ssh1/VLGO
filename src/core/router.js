// Screen router with motion transitions.
// Routes are screen factories: (ctx, params) => { el, enter?(), leave?(), destroy?() }.
// Transitions:
//   'flood' — a living paint drop grows from the tap point, covers the phone,
//             the screen swaps underneath, then the paint drains away (signature move)
//   'push' / 'pop' — iOS-like slide with parallax for drill-down and back
//   'tab'  — quick cross-fade + content stagger for the tab bar

import { tween, easeInOutCubic, easeOutCubic, easeInCubic, motion } from './loop.js';
import { svg } from './dom.js';
import { morpher, crPath, flow } from './paint.js';

export function createRouter(phone, routes, ctx) {
  let current = null; // { name, params, screen }
  let busy = false;
  const history = [];

  const layer = document.createElement('div');
  layer.className = 'screens';
  phone.appendChild(layer);

  // overlay for the paint transition: three water waves roll down the screen,
  // each with its own wavy front, shade and speed; the screen swaps under them,
  // then they keep rolling down and out like a wave leaving the shore.
  const over = svg('svg', { class: 'flood', width: 390, height: 844, viewBox: '0 0 390 844' });
  over.innerHTML = `<defs>
    <pattern id="fl-tex" patternUnits="userSpaceOnUse" width="512" height="512"><image href="assets/tex/paint_tex.jpg" width="512" height="512"/></pattern>
    <pattern id="fl-caus" patternUnits="userSpaceOnUse" width="300" height="300"><image href="assets/tex/caustic.png" width="300" height="300"/></pattern></defs>`;
  const WAVES = [
    { fill: '#7FA0FF', op: 0.9, lag: 0.0, amp: 38, k: 2.6, sp: 3.3 },
    { fill: '#2F5BEA', op: 0.95, lag: 0.12, amp: 30, k: 3.4, sp: 4.3 },
    { fill: 'url(#fl-tex)', op: 1, lag: 0.24, amp: 26, k: 2.9, sp: 5.4, caus: true },
  ];
  WAVES.forEach((w) => {
    w.el = svg('path', { fill: w.fill, opacity: w.op });
    over.appendChild(w.el);
    if (w.caus) { w.c = svg('path', { fill: 'url(#fl-caus)', opacity: 0.35 }); over.appendChild(w.c); }
    w.rim = svg('path', { fill: 'none', stroke: '#fff', 'stroke-width': 2, opacity: 0.5 });
    over.appendChild(w.rim);
  });
  phone.appendChild(over);
  // the water's texture travels with the wave (rolls down with the front, the light
  // net drifts across) instead of standing still behind a moving outline
  const texP = over.querySelector('#fl-tex'), causP = over.querySelector('#fl-caus');
  const texMove = (dy, t) => {
    const sc = 1 + 0.06 * Math.sin(t * 2.1);
    texP.setAttribute('patternTransform', `translate(${(Math.sin(t * 1.3) * 26 - t * 30).toFixed(1)} ${(dy * 0.85).toFixed(1)}) rotate(${(Math.sin(t * 0.9) * 4).toFixed(2)}) scale(${sc.toFixed(3)})`);
    causP.setAttribute('patternTransform', `translate(${(-t * 90).toFixed(1)} ${(dy * 1.15 + t * 60).toFixed(1)}) rotate(${(t * 6).toFixed(1)}) scale(${(1 + 0.12 * Math.sin(t * 2.7)).toFixed(3)})`);
    WAVES.forEach((w, i) => { if (w.c) w.c.setAttribute('opacity', (0.3 + 0.18 * Math.sin(t * 3.1 + i)).toFixed(3)); });
  };

  // a band whose top edge is a travelling wave at height `top`, bottom edge at `bot`
  const band = (top, bot, w, t) => {
    let d = '', rim = '';
    for (let x = -40; x <= 430; x += 10) {
      const y = top + Math.sin(x / 390 * Math.PI * w.k + t * w.sp) * w.amp + Math.sin(x / 390 * Math.PI * w.k * 2.3 - t * w.sp * 1.4) * w.amp * 0.35;
      d += `${x === -40 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
    }
    rim = d;
    d += `L430 ${bot}L-40 ${bot}Z`;
    return [d, rim];
  };

  async function flood(origin, swap) {
    over.style.display = 'block';
    const t0 = performance.now() / 1000;
    const draw = (prog, phase) => {
      const t = performance.now() / 1000 - t0;
      WAVES.forEach((w) => {
        const p = Math.min(Math.max((prog - w.lag) / (1 - w.lag), 0), 1);
        // phase 0: fronts fall from above the screen to below it (cover);
        // phase 1: the whole band slides down and off (reveal)
        const front = phase === 0 ? -80 + p * 1000 : 920;
        const tail = phase === 0 ? -900 : -900 + p * 1900;
        const [d, rim] = band(phase === 0 ? Math.min(front, 920) - 900 : tail + 0, 0, w, t);
        // draw as band from tail(top) to front(bottom): flip: we want the wavy edge at the bottom when covering
        const top = phase === 0 ? -900 : tail;
        const bottom = phase === 0 ? front : 2000;
        const [db, rb] = band(bottom, top, w, t);
        w.el.setAttribute('d', db);
        if (w.c) w.c.setAttribute('d', db);
        w.rim.setAttribute('d', rb);
      });
      texMove(phase === 0 ? prog * 1000 : 1000, t);
    };
    await tween(0.7, (e) => draw(e, 0), (t) => t * t * (3 - 2 * t));
    await swap();
    // leaving: the band's upper edge (also wavy) rolls down and out
    const t1 = performance.now() / 1000;
    await tween(0.75, (e) => {
      const t = performance.now() / 1000 - t0;
      WAVES.slice().reverse().forEach((w, i) => {
        const p = Math.min(Math.max((e - i * 0.1) / (1 - 0.2), 0), 1);
        const top = -60 + p * 980;
        let d = '';
        for (let x = -40; x <= 430; x += 10) {
          const y = top + Math.sin(x / 390 * Math.PI * w.k - t * w.sp) * w.amp + Math.sin(x / 390 * Math.PI * w.k * 2.1 + t * w.sp) * w.amp * 0.3;
          d += `${x === -40 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
        }
        const rim = d;
        d += 'L430 1000L-40 1000Z';
        w.el.setAttribute('d', d);
        if (w.c) w.c.setAttribute('d', d);
        w.rim.setAttribute('d', rim);
      });
      texMove(1000 + e * 980, t);
    }, easeInOutCubic);
    over.style.display = 'none';
  }

  async function slide(dir, swap, from, to) {
    to.el.style.transform = `translateX(${dir > 0 ? 390 : -110}px)`;
    if (dir < 0) to.el.style.zIndex = 0;
    await swap(false);
    const fromEl = from?.el;
    await tween(0.46, (e) => {
      if (dir > 0) {
        to.el.style.transform = `translateX(${390 * (1 - e)}px)`;
        if (fromEl) { fromEl.style.transform = `translateX(${-110 * e}px)`; fromEl.style.filter = `brightness(${1 - 0.12 * e})`; }
      } else {
        to.el.style.transform = `translateX(${-110 * (1 - e)}px)`;
        if (fromEl) fromEl.style.transform = `translateX(${390 * e}px)`;
      }
    }, easeOutCubic);
    to.el.style.transform = '';
    to.el.style.zIndex = '';
  }

  async function go(name, params = {}, opts = {}) {
    if (busy || !routes[name]) return;
    busy = true;
    const transition = motion.reduced ? 'cut' : (opts.transition || 'tab');
    const prev = current;
    if (prev && !opts.replace && transition !== 'pop') history.push({ name: prev.name, params: prev.params });
    const screen = routes[name](ctx, params);
    const next = { name, params, screen };

    const mount = async (enter = true) => {
      screen.el.classList.add('screen-in');
      layer.appendChild(screen.el);
      ctx.statusbar?.(screen.dark, screen.sbPaint);
      flow.gain = screen.flow ?? 1;
      if (enter) screen.enter?.();
    };
    const unmount = () => {
      if (!prev) return;
      prev.screen.leave?.();
      prev.screen.destroy?.();
      prev.screen.el.remove();
    };

    if (!prev || transition === 'cut') {
      await mount(); unmount();
    } else if (transition === 'flood') {
      await flood(opts.origin, async () => { unmount(); await mount(); });
    } else if (transition === 'push' || transition === 'pop') {
      await slide(transition === 'push' ? 1 : -1, async () => { await mount(false); }, prev.screen, screen);
      unmount();
      screen.enter?.();
    } else {
      // tab: old fades out quickly, new staggers in
      prev.screen.el.style.transition = 'opacity 180ms ease';
      prev.screen.el.style.opacity = '0';
      await new Promise((r) => setTimeout(r, 160));
      unmount(); await mount();
    }
    current = next;
    location.hash = `#/${name}`;
    busy = false;
  }

  function back(opts = {}) {
    const prev = history.pop() || { name: 'feed', params: {} };
    go(prev.name, prev.params, { transition: 'pop', ...opts });
  }

  return { go, back, get current() { return current; } };
}

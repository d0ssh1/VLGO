// Small shared helpers.

/** Convert an element's centre into design coordinates (390×844) for transitions. */
export function originOf(ctx, el) {
  const r = el.getBoundingClientRect();
  const pr = ctx.phone.getBoundingClientRect();
  const s = pr.width / 390;
  return { x: (r.left - pr.left + r.width / 2) / s, y: (r.top - pr.top + r.height / 2) / s };
}

/** Animated number count-up for stats. */
export function countUp(el, to, ms = 900) {
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min((now - t0) / ms, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Toast at the bottom of the phone. */
export function toast(ctx, text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  ctx.phone.appendChild(t);
  setTimeout(() => t.classList.add('out'), 1600);
  setTimeout(() => t.remove(), 2100);
}

export const placeById = (PLACES, id) => PLACES.find((p) => p.id === id) || PLACES[0];

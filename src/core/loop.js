// One shared requestAnimationFrame loop for the whole app.
// - every subscriber gets (timeSeconds, dtSeconds)
// - heavy work (paint morphing) can ask for a lower rate via `fps`
// - the loop sleeps when nothing is subscribed or the tab is hidden
// - prefers-reduced-motion is exposed so components can freeze themselves

const subs = new Set();
let rafId = 0;
let last = 0;
let running = false;

export const motion = {
  reduced: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  // phones / weak devices: same design and motion, but every animated SVG layer is
  // redrawn at a shared lower rate and the most expensive overlays are skipped
  lite: (window.matchMedia?.('(pointer: coarse)').matches ?? false) || (navigator.hardwareConcurrency || 8) <= 4 || /[?&]lite/.test(location.search),
};
/** frame rate for the living paint */
export const PAINT_FPS = motion.lite ? 20 : 30;
window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
  motion.reduced = e.matches;
});

function frame(nowMs) {
  const now = nowMs / 1000;
  const dt = last ? Math.min(now - last, 0.1) : 0;
  last = now;
  for (const s of subs) {
    if (s.fps) {
      s.acc += dt;
      if (s.acc < 1 / s.fps) continue;
      s.cb(now, s.acc);
      s.acc = 0;
    } else {
      s.cb(now, dt);
    }
  }
  rafId = subs.size ? requestAnimationFrame(frame) : 0;
  running = !!rafId;
}

function wake() {
  if (!running && subs.size && !document.hidden) {
    last = 0;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(rafId);
    running = false;
  } else wake();
});

/** Subscribe to the loop. Returns an unsubscribe function. */
export function onFrame(cb, { fps = 0 } = {}) {
  const s = { cb, fps, acc: 0 };
  subs.add(s);
  wake();
  return () => subs.delete(s);
}

/** Promise-based tween helper with easing; resolves when done. */
export function tween(duration, update, ease = easeInOutCubic) {
  return new Promise((resolve) => {
    if (motion.reduced) duration = Math.min(duration, 0.12);
    let t0 = null;
    const off = onFrame((now) => {
      if (t0 === null) t0 = now;
      const p = Math.min((now - t0) / duration, 1);
      update(ease(p), p);
      if (p >= 1) {
        off();
        resolve();
      }
    });
  });
}

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutBack = (t) => {
  const c1 = 1.5, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const wait = (ms) => new Promise((r) => setTimeout(r, motion.reduced ? 0 : ms));

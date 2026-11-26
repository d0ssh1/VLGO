// Giant word: Inter Tight 900, rotated −8…−10°, always fully inside the screen.
// Fitting uses real glyph metrics (canvas measureText) on the rotated box.
// Rules (see design board VType):
//  - size 150 → 64; letters may be condensed to 94% at most
//  - multi-word short names use '\n' → stepped lines
//  - CAPS only for «СОШЛИСЬ!»
//  - where the word lies on paint it turns paper-coloured (knockout)

const ctx2d = document.createElement('canvas').getContext('2d');

export function measure(text, size, ls = -0.03) {
  ctx2d.font = `900 ${size}px "Inter Tight"`;
  const m = ctx2d.measureText(text);
  return { w: m.width + ls * size * (text.length - 1), asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}

export function fitGiant(text, { x: x0 = 20, y, ang = -9, size = 150, min = 64, sx = 1, ls = -0.03, lh = 0.84, rightPad = 14, W = 390, step = 0 }) {
  const lines = text.split('\n');
  const n = lines.length;
  const A = (ang * Math.PI) / 180, ca = Math.cos(A), sa = Math.sin(A);
  let x = x0;
  const place = (sz) => lines.map((l, i) => {
    const dy = -(n - 1 - i) * sz * lh;
    const st = i * step * sz; // stepped lines: each next line starts further right
    return { l, bx: x - dy * sa + st * ca, by: y + dy * ca + st * sa };
  });
  const fits = (sz, s) => place(sz).every(({ l, bx }) => {
    const m = measure(l, sz, ls);
    const wd = m.w * s;
    return [[wd, -m.asc], [wd, m.desc]].every(([u, v]) => bx + u * ca - v * sa <= W - rightPad);
  });
  let sz = size;
  while (sz > min && !fits(sz, sx)) sz -= 1;
  while (!fits(sz, sx) && sx > 0.94) sx = +(sx - 0.01).toFixed(2);
  // stepped lines lean left: keep every line's top-left corner >= 12px from the edge
  const minX = Math.min(...place(sz).map(({ l, bx }) => bx + measure(l, sz, ls).asc * sa));
  if (minX < 12) {
    x += 12 - minX;
    while (sz > min && !fits(sz, sx)) sz -= 1;
  }
  return { size: sz, sx, ang, ls, lines: place(sz), ok: fits(sz, sx) };
}

/**
 * Multi-word names, laid out like a poster:
 *  - short function words stick to the next word («в старом», «над бухтой»);
 *  - try 1, 2 and 3 lines with balanced length; each extra line costs ~10% of the
 *    score, so a name only breaks when that makes the letters clearly bigger;
 *  - 2+ lines are stepped (a staircase to the right), the last line sits on the baseline.
 * Returns { text: lines joined by \n, lines, size, step }.
 */
const SIZE_FOR = { 1: 170, 2: 124, 3: 98 };
const STEP_FOR = { 1: 0, 2: 0.32, 3: 0.2 };
export function layoutName(text, opts = {}) {
  const glued = text.trim().replace(/(^|\s)(в|во|на|над|у|и|до|за|по|с|со|к|о|от|под|из)\s+/gi, (m, a, b) => `${a}${b}\u00a0`);
  const words = glued.split(/ +/); // (\s would also split the glued no-break spaces)
  const parts = (k) => { // balanced split of words into k lines
    if (k === 1) return [words.join(' ')];
    let best = null;
    const rec = (start, left, acc) => {
      if (left === 1) { const lines = [...acc, words.slice(start).join(' ')]; const m = Math.max(...lines.map((l) => l.length)); if (!best || m < best.m) best = { m, lines }; return; }
      for (let e = start + 1; e <= words.length - left + 1; e++) rec(e, left - 1, [...acc, words.slice(start, e).join(' ')]);
    };
    rec(0, k, []);
    return best.lines;
  };
  let best = null;
  for (let k = 1; k <= Math.min(3, words.length); k++) {
    const lines = parts(k);
    const f = fitGiant(lines.join('\n'), { ...opts, size: SIZE_FOR[k], step: STEP_FOR[k], min: k === 1 ? 60 : 50 });
    const score = (f.ok ? 0 : -1000) + f.size * (1 - 0.1 * (k - 1));
    if (!best || score > best.score) best = { score, text: lines.join('\n'), lines: k, size: SIZE_FOR[k], step: STEP_FOR[k] };
  }
  return best;
}

/** SVG markup of the fitted word (ink) + its paper knockout clipped by a paint clipPath id. */
// tilt can be switched off for comparison: add ?flat to the URL
const TILT = /[?&]flat/.test(location.search) ? 0 : 1;
/** the same preprocessing giantSVG applies (multi-word layout) */
function prep(text, opts) {
  if (/\s/.test(text) && !text.includes('\n')) {
    const L = layoutName(text, { ...opts, ang: (opts.ang ?? -9) * TILT });
    return { text: L.text, opts: { ...opts, size: Math.min(opts.size ?? 170, L.size), step: L.step, min: Math.min(opts.min ?? 64, L.lines > 1 ? 50 : 60) } };
  }
  return { text, opts };
}

/** where the word block will start: top of its first line, measured on real glyphs
 *  (in the word's own tilted frame at its left edge, i.e. comparable to opts.y) */
export function wordTop(text, opts) {
  const p = prep(text, opts);
  const f = fitGiant(p.text, { ...p.opts, ang: (p.opts.ang ?? -9) * TILT });
  const n = f.lines.length;
  const asc = measure(f.lines[0].l, f.size, f.ls).asc;
  return { top: opts.y - (n - 1) * (p.opts.lh ?? 0.84) * f.size - asc, size: f.size, lines: n };
}

export function giantSVG(text, opts, clipId) {
  ({ text, opts } = prep(text, opts));
  const f = fitGiant(text, { ...opts, ang: (opts.ang ?? -9) * TILT });
  const t = (fill) => f.lines.map(({ l, bx, by }, i) =>
    `<g class="gw-line" style="--i:${i}"><text transform="translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${f.ang}) scale(${f.sx} 1)"
      font-family="Inter Tight, Inter, Arial Black, sans-serif" font-weight="900" font-size="${f.size}" letter-spacing="${(f.ls * f.size).toFixed(2)}" fill="${fill}">${l.endsWith('?') ? `${l.slice(0, -1)}<tspan dx="12">?</tspan>` : l}</text></g>`).join('');
  return `<g class="giant">${t('var(--ink)')}${clipId ? `<g class="knock" mask="url(#${clipId})">${t('var(--paper)')}</g>` : ''}</g>`;
}

// "vlgo" — brush-stroke wordmark (round-capped strokes + a filled "o"),
// painted with the gouache texture. `draw` animates the strokes on like a brush.

const STROKES = [
  'M4.4 8.2L12.6 23.6Q13.5 25 14.4 23.6L22.6 8.2',               // v (pointed, so it never reads as «u»)
  'M35.6 5.6C35.4 12 35.2 17.5 34.7 22.9',                         // l
  'M47.2 16.2a5.4 5.4 0 1 0 10.8 0a5.4 5.4 0 1 0 -10.8 0',          // g bowl
  'M62.6 10.8C62.9 18 62.9 24.5 62 28.6C60.6 33.8 54.4 35 50.2 32', // g tail
];
const O = 'M70.2 15.6C70 7.6 76.4 1.6 84.6 1.7C93.4 1.8 99.8 7.4 99.7 15C99.6 23.2 93 28.8 84.9 28.7C76.6 28.6 70.4 23.4 70.2 15.6Z';

/**
 * @param {number} x,y top-left in screen px; w width in px
 * @param {string} fill paint fill (pattern url) — defaults to the shared texture
 */
export function logoSVG(x, y, w = 83, { fill = 'url(#logo-tex)', draw = false } = {}) {
  const k = w / 100;
  const cls = draw ? 'logo draw' : 'logo';
  const strokes = STROKES.map((d, i) =>
    `<path class="ls" style="--i:${i}" d="${d}" pathLength="1" stroke-width="${i === 1 ? 8.6 : i === 2 ? 11 : 9.2}"/>`).join('');
  return `<g class="${cls}" transform="translate(${x} ${y}) scale(${k})">
    <g fill="none" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round">${strokes}</g>
    <path class="lo" d="${O}" fill="${fill}"/>
  </g>`;
}

/** pattern def used by the logo (call once per svg) */
export const LOGO_DEFS = `<pattern id="logo-tex" patternUnits="userSpaceOnUse" width="160" height="160">
  <image href="assets/tex/paint_tex.jpg" width="160" height="160"/></pattern>`;

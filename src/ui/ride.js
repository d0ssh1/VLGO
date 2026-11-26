// Labels that ride on moving paint. SVG text snaps glyphs to the pixel grid
// when it moves (visible stepping); an HTML label moved with translate3d is
// composited on the GPU and glides smoothly at display rate.
import { onFrame, motion } from '../core/loop.js';

export function rideLabels(host, items, at) {
  // items: [{ x, y, text, size, cls }] in stage px; at(i, t) -> [dx, dy]
  const els = items.map((it, i) => {
    const e = document.createElement('div');
    e.className = 'ride-lbl ' + (it.cls || '');
    const sp = document.createElement('span'); sp.textContent = it.text; e.appendChild(sp);
    e.style.cssText = `left:${it.x}px;top:${it.y}px;font-size:${it.size || 21}px;--d:${i}`;
    host.appendChild(e);
    return e;
  });
  const off = onFrame((t) => {
    if (motion.reduced) return;
    els.forEach((e, i) => { const [dx, dy] = at(i, t); e.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`; });
  });
  return { els, stop: off };
}

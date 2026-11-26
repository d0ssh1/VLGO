// VLGO six-ray ink star (measured from the reference art): irregular angles,
// needle tips, slightly concave edges, solid centre.

export const RAYS = [[357, 0.84], [47, 1.0], [101, 0.84], [180, 0.88], [227, 0.78], [288, 0.76]];
export const FEED_RAYS = [[12, 0.96], [87, 0.96], [158, 0.79], [210, 0.88], [260, 1.0], [321, 0.72]];

export function starPath(cx, cy, R, rot = 0, rays = RAYS, vr = 0.21, cc = 0.3) {
  const P = (ang, rr) => [cx + R * rr * Math.sin(((ang + rot) * Math.PI) / 180), cy - R * rr * Math.cos(((ang + rot) * Math.PI) / 180)];
  const n = rays.length;
  const vals = rays.map(([a], i) => {
    let a2 = rays[(i + 1) % n][0];
    if (a2 < a) a2 += 360;
    return (a + a2) / 2;
  });
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = '';
  rays.forEach(([a, l], i) => {
    const v0 = vals[(i - 1 + n) % n], v1 = vals[i];
    const tip = P(a, l), V0 = P(v0, vr), V1 = P(v1, vr);
    const ctrl = (V) => {
      const mx = (V[0] + tip[0]) / 2, my = (V[1] + tip[1]) / 2;
      const ax = P(a, Math.hypot(mx - cx, my - cy) / R);
      return [mx + (ax[0] - mx) * cc, my + (ax[1] - my) * cc];
    };
    d += `${i ? ' L' : 'M'}${f(V0)} Q${f(ctrl(V0))} ${f(tip)} Q${f(ctrl(V1))} ${f(V1)}`;
  });
  return d + 'Z';
}

/** SVG markup for a star; `spin` adds the slow idle rotation class. */
export function starSVG(cx, cy, R, rot = 0, { rays = RAYS, vr = 0.21, cls = 'star idle', fill = 'var(--ink)' } = {}) {
  return `<g class="${cls}" style="transform-origin:${cx}px ${cy}px"><path d="${starPath(cx, cy, R, rot, rays, vr)}" fill="${fill}"/></g>`;
}

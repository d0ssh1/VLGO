// Line icons (28×28 grid), shared by tiles, pins and chips.
export const ICONS = {
 "waves": "<path d=\"M3 10.5c2.6-2.6 5.2-2.6 7.8 0s5.2 2.6 7.8 0 5.2-2.6 7.8 0M3 17.5c2.6-2.6 5.2-2.6 7.8 0s5.2 2.6 7.8 0 5.2-2.6 7.8 0\" fill=\"none\" stroke-width=\"2.4\" stroke-linecap=\"round\"/>",
 "hills": "<path d=\"M2.5 21L11 7.5l4.6 7 2.4-3.4L25.5 21z\" fill=\"none\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/>",
 "fort": "<path d=\"M4 23V9h3v3h3V9h3v3h3V9h3v3h3V9h3v14z\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/><path d=\"M12 23v-5a2 2 0 0 1 4 0v5\" fill=\"none\" stroke-width=\"2.3\"/>",
 "cup": "<path d=\"M4 11h15v4.5a6.5 6.5 0 0 1-6.5 6.5h-2A6.5 6.5 0 0 1 4 15.5z\" fill=\"none\" stroke-width=\"2.3\"/><path d=\"M19 12.5h1.8a3 3 0 0 1 0 6H18.5\" fill=\"none\" stroke-width=\"2.3\"/><path d=\"M9 4c-1 1.5 1 2.5 0 4M13.5 4c-1 1.5 1 2.5 0 4\" fill=\"none\" stroke-width=\"2\" stroke-linecap=\"round\"/>",
 "bun": "<path d=\"M3.5 19.5c0-6.5 4.6-10.5 10.5-10.5s10.5 4 10.5 10.5c0 2-1.5 3-3.5 3h-14c-2 0-3.5-1-3.5-3z\" fill=\"none\" stroke-width=\"2.3\"/><path d=\"M8 15h.1M14 13h.1M20 15h.1\" stroke-width=\"2.8\" stroke-linecap=\"round\"/>",
 "glass": "<path d=\"M4 4.5h20l-10 10.5z\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/><path d=\"M14 15v8M9 24h10\" stroke-width=\"2.3\" stroke-linecap=\"round\"/>",
 "art": "<path d=\"M14 3.5a10.5 10.5 0 1 0 0 21c1.6 0 2.2-1 2.2-2.1 0-1.9-1.6-2.1-1.6-3.7 0-1.3 1-2.2 2.4-2.2h2.8A4.7 4.7 0 0 0 24.5 12 9.6 9.6 0 0 0 14 3.5z\" fill=\"none\" stroke-width=\"2.3\"/><circle cx=\"9\" cy=\"12\" r=\"1.5\" stroke=\"none\"/><circle cx=\"13\" cy=\"8.5\" r=\"1.5\" stroke=\"none\"/><circle cx=\"18\" cy=\"9.5\" r=\"1.5\" stroke=\"none\"/>",
 "music": "<path d=\"M10 20.5V6l12-2.5v14\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/><circle cx=\"7\" cy=\"20.5\" r=\"3\" fill=\"none\" stroke-width=\"2.3\"/><circle cx=\"19\" cy=\"17.5\" r=\"3\" fill=\"none\" stroke-width=\"2.3\"/>",
 "bolt": "<path d=\"M15.5 3L6 15.5h7L11.5 25 22 11.5h-7z\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/>",
 "hanger": "<path d=\"M14 9.5V8.2a2.8 2.8 0 1 1 2.8-2.8\" fill=\"none\" stroke-width=\"2.3\" stroke-linecap=\"round\"/><path d=\"M14 9.5L3.5 17.5a1.6 1.6 0 0 0 1 2.9h19a1.6 1.6 0 0 0 1-2.9z\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/>",
 "dice": "<rect x=\"4\" y=\"4\" width=\"20\" height=\"20\" rx=\"5\" fill=\"none\" stroke-width=\"2.3\"/><circle cx=\"10\" cy=\"10\" r=\"1.7\" stroke=\"none\"/><circle cx=\"18\" cy=\"18\" r=\"1.7\" stroke=\"none\"/><circle cx=\"14\" cy=\"14\" r=\"1.7\" stroke=\"none\"/>",
 "sun": "<path d=\"M7 18a7 7 0 0 1 14 0\" fill=\"none\" stroke-width=\"2.3\"/><path d=\"M3 22h22M14 4v3M5 9.5l2 2M23 9.5l-2 2\" stroke-width=\"2.3\" stroke-linecap=\"round\"/>",
 "fish": "<path d=\"M3 14c4-6 10-7.5 16-3.5l5-4v15l-5-4C13 21.5 7 20 3 14z\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/><circle cx=\"9\" cy=\"13\" r=\"1.4\" stroke=\"none\"/>",
 "bowl": "<path d=\"M3 13h22a11 11 0 0 1-22 0z\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/><path d=\"M9 24h10M16 9l8-6M12 9l9-7\" stroke-width=\"2.3\" stroke-linecap=\"round\"/>",
 "ticket": "<path d=\"M3 8h22v4a2.5 2.5 0 0 0 0 5v4H3v-4a2.5 2.5 0 0 0 0-5z\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/><path d=\"M17 9v2M17 14v2M17 19v1\" stroke-width=\"2\" stroke-linecap=\"round\"/>",
 "island": "<path d=\"M2 21c3-2 6-2 9 0s6 2 9 0 4-1.5 6-.5\" fill=\"none\" stroke-width=\"2.3\" stroke-linecap=\"round\"/><path d=\"M6 18c2-6 7-8.5 12-8.5S24 13 25 18\" fill=\"none\" stroke-width=\"2.3\"/>",
 "house": "<path d=\"M4 24V11l10-7 10 7v13z\" fill=\"none\" stroke-width=\"2.3\" stroke-linejoin=\"round\"/><path d=\"M11 24v-7h6v7M9 13h2M17 13h2\" stroke-width=\"2.3\"/>"
};

export function icon(name, color = "currentColor", size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" fill="${color}" stroke="${color}" aria-hidden="true">${ICONS[name]}</svg>`;
}

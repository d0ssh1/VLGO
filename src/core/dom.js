// Tiny DOM helpers (no framework: the prototype must stay light on old phones).

const NS = 'http://www.w3.org/2000/svg';

export function svg(tag, attrs = {}, children = []) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) el.setAttribute(k, v);
  for (const c of children) el.appendChild(c);
  return el;
}

export function h(tag, attrs = {}, html = '') {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  if (html) el.innerHTML = html;
  return el;
}

/** Parse an HTML string into a DocumentFragment-like element list. */
export function frag(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

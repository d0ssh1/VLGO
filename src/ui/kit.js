// Reusable UI pieces as HTML strings (buttons, chips, tab bar, top buttons).

const arrow = (c = 'currentColor', w = 20) =>
  `<svg width="${w}" height="14" viewBox="0 0 20 14" aria-hidden="true"><path d="M1 7h17M12 1.5L18 7l-6 5.5" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export { arrow };

export const limeBtn = (label, { x = 24, y = 744, w = 342, action = '' } = {}) =>
  `<button class="btn btn-lime rise" data-action="${action}" style="left:${x}px;top:${y}px;width:${w}px">${label}${arrow()}</button>`;

export const darkBtn = (label, { x = 24, y = 744, w = 342, action = '' } = {}) =>
  `<button class="btn btn-dark rise" data-action="${action}" style="left:${x}px;top:${y}px;width:${w}px">${label}${arrow('#fff')}</button>`;

export const chip = (label, on = false, extra = '') =>
  `<button class="chip${on ? ' on' : ''}" aria-pressed="${on}" ${extra}>${label}</button>`;

export const iconBtn = (side, label, svgInner, { x = 22, y = 52 } = {}) =>
  `<button class="icon-btn" aria-label="${label}" style="${side}:${x}px;top:${y}px">${svgInner}</button>`;

export const backBtn = () => iconBtn('left', 'Назад',
  '<svg width="20" height="16" viewBox="0 0 20 16"><path d="M19 8H2M8 1.5L1.5 8 8 14.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>') ;

const TAB_ICONS = {
  feed: ['<path d="M1.5 9L10 1.8 18.5 9v9.2h-5.6v-5.5H7.1v5.5H1.5z"/>', 20],
  map: ['<path d="M1.5 4.5l5.5-2.5 7 2.5 5.5-2.5v14l-5.5 2.5-7-2.5-5.5 2.5z"/><path d="M7 2v14M14 4.5v14"/>', 21],
  saved: ['<path d="M2 1.5h14v18l-7-5-7 5z"/>', 18],
  profile: ['<circle cx="10" cy="6" r="4.4"/><path d="M1.8 19c0-4.4 3.7-6.8 8.2-6.8s8.2 2.4 8.2 6.8z"/>', 20],
};
const TAB_LABEL = { feed: 'Лента', map: 'Карта', saved: 'Избранное', profile: 'Профиль' };

export function tabbar(active) {
  const it = (k) => {
    const [p, s] = TAB_ICONS[k];
    return `<button class="tab${k === active ? ' on' : ''}" data-tab="${k}" aria-label="${TAB_LABEL[k]}" aria-current="${k === active}">
      <svg width="${s}" height="21" viewBox="0 0 ${s} 21" fill="${k === active ? '#1A2233' : 'none'}" stroke="#0E121D" stroke-width="${k === active ? 0 : 2.1}" stroke-linecap="round" stroke-linejoin="round">${p}</svg></button>`;
  };
  return `<nav class="tabbar" aria-label="Основная навигация">${it('feed')}${it('map')}
    <button class="tab-plus" data-tab="create" aria-label="Собрать компанию"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 2v18M2 11h18" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg></button>
    ${it('saved')}${it('profile')}</nav>`;
}

export const statusbar = () => `<div class="statusbar"><span>9:41</span><span class="sb-icons">
  <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
  <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.4c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .6 10.6 10.6 0 0 0 .5 3.6l1.3 1.3A8.8 8.8 0 0 1 8 2.4zm0 3.6c1.4 0 2.7.5 3.7 1.5L13 6.2A7 7 0 0 0 8 4.2a7 7 0 0 0-5 2l1.3 1.3C5.3 6.5 6.6 6 8 6zm0 3.6c.5 0 1 .2 1.3.5L8 11.4 6.7 10.1c.3-.3.8-.5 1.3-.5z"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" opacity=".45"/></svg></span></div>`;

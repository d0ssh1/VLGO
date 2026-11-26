import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/cyrillic-500.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/cyrillic-600.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/cyrillic-700.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/cyrillic-800.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter-tight/cyrillic-900.css';
import '@fontsource/inter-tight/latin-900.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/motion.css';
import './styles/screens.css';

import { createStage } from './core/stage.js';
import { createRouter } from './core/router.js';
import { statusbar } from './ui/kit.js';
import { ROUTES } from './screens/index.js';

async function boot() {
  // giant words are fitted with real glyph metrics → wait for fonts first
  try {
    await Promise.all([
      document.fonts.load('900 100px "Inter Tight"', 'маяк'),
      document.fonts.load('800 20px "Inter"', 'Ая'),
      document.fonts.load('400 20px "Inter"', 'Ая'),
    ]);
  } catch { /* fonts still usable via fallback */ }

  const phone = createStage(document.getElementById('app'));
  phone.insertAdjacentHTML('beforeend', statusbar());
  const sb = phone.querySelector('.statusbar');

  const ctx = {
    phone,
    store: { interests: null, liked: new Set(), saved: new Set(['tobizina', 'mayak']) },
    statusbar: (dark, paint) => { sb.classList.toggle('on-dark', !!dark); sb.classList.toggle('on-paint', paint === true); sb.classList.toggle('on-paint-left', paint === 'left'); phone.parentElement.classList.toggle('dark-bg', !!dark); document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0B1C30' : '#F4ECE2'); },
  };
  const router = createRouter(phone, ROUTES, ctx);
  ctx.router = router;

  // global tab bar navigation (delegated)
  phone.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (!t) return;
    const name = t.dataset.tab;
    if (router.current?.name === name) return;
    if (name === 'create') {
      const r = t.getBoundingClientRect(), pr = phone.getBoundingClientRect(), s = pr.width / 390;
      router.go('create', {}, { transition: 'flood', origin: { x: (r.left - pr.left + r.width / 2) / s, y: (r.top - pr.top + r.height / 2) / s } });
    } else router.go(name, {}, { transition: 'tab' });
  });

  const [start, arg] = (location.hash.replace('#/', '') || 'onboarding').split('/');
  const params = start === 'onboarding' || !location.hash ? { intro: true } : arg ? { id: arg } : {};
  router.go(ROUTES[start] ? start : 'onboarding', params, { transition: 'cut' });
}

boot();

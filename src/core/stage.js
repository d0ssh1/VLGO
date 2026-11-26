// The design is authored on a 390×844 canvas (iPhone 13/14/15 logical size).
// The stage keeps those exact coordinates and scales the whole phone to fit
// any viewport: full-bleed on phones, a centred phone on desktop.

export const W = 390;
export const H = 844;

export function createStage(host) {
  const stage = document.createElement('div');
  stage.className = 'stage';
  const phone = document.createElement('div');
  phone.className = 'phone';
  stage.appendChild(phone);
  host.appendChild(stage);

  // On a real phone: no device frame, no side fields. The design's fake status
  // bar is dropped (the phone has its own), the rest fills the screen width; if the
  // screen is shorter than the design, it fits the height and the screen's own
  // background continues to the edges (seamless, no visible margins).
  const touch = window.matchMedia('(pointer: coarse)').matches;
  function fit() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isPhone = vw <= 600 || (touch && vw <= 900);
    const CUT = isPhone ? 44 : 0; // design status bar height, hidden on phones
    let s, mt = 0;
    if (isPhone) {
      // always the full width (no side fields); on a short screen (in-app browsers
      // like Telegram) the page scrolls the remaining few dozen px
      // shrink at most 7 % to fit a short screen (thin side margins in the screen's own
      // colour, the paint keeps bleeding into them); anything still missing scrolls
      s = Math.max(vw / W * 0.93, Math.min(vw / W, vh / (H - CUT)));
      mt = -CUT * s;
      const need = (H - CUT) * s;
      phone.style.marginLeft = `${(vw - W * s) / 2}px`;
      stage.style.height = `${Math.max(need, vh)}px`;
    } else {
      stage.style.height = ''; phone.style.marginLeft = '';
      s = Math.min((vh - 48) / H, (vw - 48) / W, 1.15);
    }
    phone.style.setProperty('--s', s.toFixed(4));
    stage.classList.toggle('is-phone', isPhone);
    document.documentElement.classList.toggle('on-phone', isPhone);
    phone.style.marginTop = isPhone ? `${mt}px` : '';
  }
  fit();
  window.addEventListener('resize', fit);
  return phone;
}

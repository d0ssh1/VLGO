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
      s = Math.min(vw / W, vh / (H - CUT));
      mt = Math.max(0, (vh - (H - CUT) * s) / 2) - CUT * s;
    } else {
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

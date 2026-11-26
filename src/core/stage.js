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

  // On a real phone the app fills the screen like a native one:
  //  - no device frame; the design's fake status bar (44 px) and the empty strip
  //    under the last button (~30 px) are not shown;
  //  - full width; when the screen is shorter than the design, each screen first
  //    gives up some of its top (photo / map / paint, never text: `crop`, set per
  //    screen; the top buttons stay where they are), and only what is still missing
  //    is made up by scaling down a little (side margins in the screen's own colour);
  //  - the visible area excludes the browser's bottom bar / home indicator.
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden';
  document.body.appendChild(probe);
  let maxCrop = 0, crop = 0;
  function fit() {
    const vw = window.innerWidth;
    const vh = (window.visualViewport?.height || window.innerHeight) - (probe.offsetHeight || 0);
    const isPhone = vw <= 600 || (touch && vw <= 900);
    const TOP = isPhone ? 44 : 0, BOT = isPhone ? 30 : 0;
    let s, mt = 0;
    if (isPhone) {
      const sw = vw / W;
      const deficit = Math.max(0, H - TOP - BOT - vh / sw);
      crop = Math.min(deficit, maxCrop);
      s = Math.min(sw, vh / (H - TOP - BOT - crop));
      mt = -TOP * s;
      phone.style.marginLeft = `${(vw - W * s) / 2}px`;
      stage.style.height = `${window.innerHeight}px`;
    } else {
      crop = 0;
      stage.style.height = ''; phone.style.marginLeft = '';
      s = Math.min((vh - 48) / H, (vw - 48) / W, 1.15);
    }
    phone.style.setProperty('--s', s.toFixed(4));
    phone.style.setProperty('--crop', crop.toFixed(1));
    stage.classList.toggle('is-phone', isPhone);
    document.documentElement.classList.toggle('on-phone', isPhone);
    phone.style.marginTop = isPhone ? `${mt}px` : '';
  }
  /** called by the router for every screen: how much of its top it may give up */
  phone.fitFor = (c = 0) => { maxCrop = c; fit(); };
  fit();
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  return phone;
}

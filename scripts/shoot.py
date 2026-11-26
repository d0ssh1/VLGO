"""Dev helper: screenshot the built prototype (dist/) at moments in time.
usage: python3 scripts/shoot.py OUT_PREFIX HASH t1 t2 ... [--clicks sel@t ...]"""
import sys, subprocess, time, os, http.server, threading, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(__file__), '..', 'dist')

def serve(port=8765):
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def shoot(out, hash_, times, actions=(), w=390, h=844, scale=1):
    srv = serve()
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=scale)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and 'favicon' not in m.text and errs.append(m.text))
        pg.goto(f'http://127.0.0.1:8765/index.html{hash_}')
        t0 = time.time(); shots = []
        events = sorted([(t, 'shot', None) for t in times] + [(t, 'act', a) for t, a in actions], key=lambda e: e[0])
        for t, kind, a in events:
            dt = t - (time.time() - t0)
            if dt > 0: time.sleep(dt)
            if kind == 'shot':
                p = f'{out}_{int(t*1000):05d}.png'; pg.screenshot(path=p); shots.append(p)
            else:
                a(pg)
        b.close()
    srv.shutdown()
    if errs: print('ERRORS:', *errs, sep='\n  ')
    return shots

if __name__ == '__main__':
    out, hash_ = sys.argv[1], sys.argv[2]
    print(shoot(out, hash_, [float(x) for x in sys.argv[3:]]))

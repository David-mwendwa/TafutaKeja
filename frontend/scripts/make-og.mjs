/**
 * Renders the default social card, `public/og-default.jpg`.
 *
 * A script rather than a hand-made binary, because the card carries the brand
 * colours and the wordmark: change the palette and a checked-in PNG silently
 * keeps showing the old one everywhere the site is shared, which is the one
 * place nobody ever looks. Re-run it whenever the palette or the logo changes.
 *
 * Drawn in a real browser rather than composited with sharp, because the card
 * is mostly type and the type is Manrope — a webfont librsvg cannot resolve.
 *
 *   node scripts/make-og.mjs
 *   CHROME=/path/to/chrome node scripts/make-og.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const WIDTH = 1200;
const HEIGHT = 630;

/* Kept in step with `theme.extend.colors` by hand — this is the only place
   outside Tailwind that names a brand colour, and the card is regenerated
   rarely enough that importing the config to read three hexes costs more than
   it saves. If these drift, the card is the thing that looks wrong. */
const NAVY_FROM = '#2c4267';
const NAVY_TO = '#172032';
const BRASS = '#c9862c';

const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const manrope = readFileSync(join(root, 'public/fonts/Manrope.woff2')).toString('base64');
const logo = readFileSync(join(root, 'public/logo.svg'))
  .toString()
  .replace(/<!--[\s\S]*?-->/g, '')
  .trim();

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Manrope;font-weight:200 800;font-display:block;
  src:url(data:font/woff2;base64,${manrope}) format('woff2');}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${WIDTH}px;height:${HEIGHT}px}
body{font-family:Manrope,sans-serif;color:#fff;
  background:linear-gradient(to right bottom,${NAVY_FROM},${NAVY_TO});
  display:flex;flex-direction:column;justify-content:center;padding:0 96px}
.mark{width:96px;height:96px;margin-bottom:40px}
h1{font-size:92px;font-weight:800;letter-spacing:-3px;line-height:1}
p.tag{font-size:38px;font-weight:500;margin-top:20px;color:#c9dbf1}
p.sub{font-size:25px;font-weight:400;margin-top:34px;color:#a2c0e4}
.rule{width:132px;height:7px;border-radius:4px;background:${BRASS};margin-top:44px}
</style></head><body>
<div class="mark">${logo}</div>
<h1>TafutaKeja</h1>
<p class="tag">Find your next place in Kenya</p>
<p class="sub">Houses, apartments and plots to rent and for sale</p>
<div class="rule"></div>
</body></html>`;

if (!existsSync(CHROME)) {
  console.error(`make-og: no Chrome at ${CHROME} — set CHROME to its path`);
  process.exit(1);
}

/* Served over HTTP rather than handed to the browser as a `file://` URL or
   pushed in with `Page.setDocumentContent`. Both of those leave this Chrome
   without a load event, and the compositor then never produces the frame
   `Page.captureScreenshot` waits for — the call just hangs. */
const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}/`;

const profile = mkdtempSync(join(tmpdir(), 'tafutakeja-og-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: 'ignore' });

/* Chrome writes the port it actually took into `DevToolsActivePort`. Asking
   for a fixed one collides with anything already debugging on this machine,
   and the banner it prints on stderr is not a stable interface. */
const port = await (async () => {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100; i += 1) {
    if (existsSync(portFile)) {
      const line = readFileSync(portFile, 'utf8').split('\n')[0].trim();
      if (line) return Number(line);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Chrome never reported a debugging port');
})();

const cleanUp = async () => {
  server.close();
  const ended = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  await Promise.race([ended, new Promise((r) => setTimeout(r, 3000))]);
  // Chrome is still flushing its profile for a moment after the kill.
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
};

try {
  /* Pick the page target explicitly. `/json/list` also returns service-worker
     and "other" targets, and the first entry is not reliably the tab — attach
     to one of those and `Emulation` is rejected as unsupported while
     `Page.captureScreenshot` simply never answers. */
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('Chrome exposed no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  let onLoad = () => {};
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Page.loadEventFired') onLoad();
  };

  /* Every call carries a deadline, and protocol errors are surfaced rather
     than resolved as undefined — a silent undefined turns a mistake into a
     destructuring crash three lines later with nothing naming the real call. */
  const send = (method, params = {}, ms = 20000) =>
    new Promise((res, rej) => {
      const n = ++id;
      const timer = setTimeout(() => { pending.delete(n); rej(new Error(`${method} timed out`)); }, ms);
      pending.set(n, (m) => {
        clearTimeout(timer);
        if (m.error) rej(new Error(`${method}: ${m.error.message}`));
        else res(m.result);
      });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  /* Headless has no OS window, so the viewport is 0x0 until this is set and
     `Browser.getWindowBounds` is unavailable to correct it afterwards. */
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false,
  });

  const loaded = new Promise((r) => { onLoad = r; });
  await send('Page.navigate', { url: origin });
  await Promise.race([loaded, new Promise((r) => setTimeout(r, 15000))]);

  /*
   * Wait for the face by polling `document.fonts.check`, not by awaiting
   * `document.fonts.load`: that promise never settles if the browser cannot
   * parse the face, which hangs the run instead of reporting it. A card
   * silently drawn in Helvetica is worse than no card — it looks deliberate —
   * so this fails rather than writing the file.
   */
  let ready = false;
  for (let i = 0; i < 80 && !ready; i += 1) {
    const r = await send('Runtime.evaluate', {
      expression: `document.fonts.check('800 92px Manrope') && document.fonts.status === 'loaded'`,
      returnByValue: true,
    });
    ready = r.result?.value === true;
    if (!ready) await new Promise((res) => setTimeout(res, 100));
  }
  if (!ready) throw new Error('Manrope never became available — the card would use a fallback face');

  const seen = await send('Runtime.evaluate', {
    expression: '[innerWidth, innerHeight].join("x")', returnByValue: true,
  });
  if (seen.result.value !== `${WIDTH}x${HEIGHT}`)
    throw new Error(`viewport is ${seen.result.value}, needed ${WIDTH}x${HEIGHT}`);

  /* JPEG, not PNG. The card is a smooth gradient behind a little type, which
     is the worst case for PNG — the same image costs about five times as much
     to ship. Every social crawler reads JPEG; WebP is the one they disagree
     about. */
  const { data } = await send('Page.captureScreenshot', {
    format: 'jpeg', quality: 90, captureBeyondViewport: true,
  }, 30000);

  const jpeg = Buffer.from(data, 'base64');
  /* SOF0/SOF2 marker: two bytes of height then two of width. Cheap, and it
     catches the failure that matters — a card cropped to the window because
     the metrics override did not take. */
  const sof = jpeg.indexOf(Buffer.from([0xff, 0xc0])) >= 0
    ? jpeg.indexOf(Buffer.from([0xff, 0xc0]))
    : jpeg.indexOf(Buffer.from([0xff, 0xc2]));
  const height = jpeg.readUInt16BE(sof + 5);
  const width = jpeg.readUInt16BE(sof + 7);
  if (width !== WIDTH || height !== HEIGHT)
    throw new Error(`captured ${width}x${height}, needed ${WIDTH}x${HEIGHT}`);

  const out = join(root, 'public/og-default.jpg');
  writeFileSync(out, jpeg);
  console.log(`make-og: wrote ${out} (${width}x${height}, ${Math.round(jpeg.length / 1024)}KB)`);
} finally {
  await cleanUp();
}
process.exit(0);

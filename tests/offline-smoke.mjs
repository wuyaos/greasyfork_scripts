import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { scripts } from '../script/scripts-registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseline = JSON.parse(readFileSync(join(root, 'tests/contracts/migration-baseline.json'), 'utf8'));
const capture = process.argv.includes('--capture');
const goldenPath = join(root, 'tests/contracts/offline-baseline.json');
const golden = capture ? {} : JSON.parse(readFileSync(goldenPath, 'utf8'));
const urls = {
  'ai-web-summary': 'https://fixture.invalid/article',
  'bangumi-enhanced': 'https://bgm.tv/calendar',
  'github-releases': 'https://github.com/fixture/project/releases',
  'iyuu-reseed-checker': 'https://fixture.invalid/details.php?id=1',
  'local-debug-loader': 'https://fixture.invalid/details.php?id=1',
  'lounge-irc-translator': 'http://fixture.invalid/',
  'moviepilot-auto-login': 'https://fixture.invalid/',
  'moviepilot-name-test': 'https://fixture.invalid/details.php?id=1',
  'nicept-replace-icon': 'https://www.nicept.net/torrents.php',
  'picix-card-actions': 'https://picix.us/',
  'pt-audit-assistant': 'https://fixture.invalid/details.php?id=1',
  'pt-batch-download': 'https://fixture.invalid/torrents.php',
  'pt-one-click-claim': 'https://pterclub.com/getusertorrentlist.php?userid=1',
  'zhuque-batch-download': 'https://zhuque.in/torrent/search/1'
};
const html = `<!doctype html><html><head><title>Offline Fixture</title></head><body>
<div id="app"></div><div id="content"><div id="columnSubjectBrowser"><h1>Calendar</h1></div></div>
<main class="repository-content"><div class="markdown-body"></div></main>
<img class="c_doc" alt="动漫" title="Anime" width="30" height="40"><img class="c_movies" alt="unmatched">
<table><tbody><tr><th>标题</th><th>体积</th><th>客户端</th><th>操作</th></tr><tr><td><a title="Fixture S01E01 1080p" href="details.php?id=7">Fixture</a></td><td>2 GiB</td><td>qBittorrent 127.0.0.2</td><td><a class="claim-confirm" data-url="/viewclaims.php?add_torrent_id=7">Claim</a><a href="download.php?id=7">Download</a></td></tr></tbody></table>
<form id="form"><textarea id="input"></textarea><button type="submit">Send</button></form>
<div id="chat"><div class="chat active"><div class="messages"></div></div></div>
<div class="ant-table-wrapper"><table class="ant-table"><tbody class="ant-table-tbody"></tbody></table></div>
</body></html>`;

const digest = text => createHash('sha256').update(text).digest('hex');
async function runtime(code, script) {
  const errors = [];
  const events = [];
  const styles = [];
  const consoleErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => { if (!error.message.includes('Could not parse CSS')) errors.push(error.message); });
  const dom = new JSDOM(html, { url: urls[script.id], runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const win = dom.window;
  const values = new Map();
  let timerId = 0;
  const timers = [];
  const requests = [];
  const denyRequest = (...args) => { requests.push(String(args[0]?.url || args[0])); throw new Error('External request blocked by offline fixture'); };
  // bangumi-enhanced embeds the current weekday into its stylesheet
  // (translateX(-weekday * 330px)); pin Date so captures stay comparable
  // across day boundaries. 2026-09-21 is the Monday the baseline was taken.
  const PINNED_NOW = Date.parse('2026-09-21T12:00:00Z');
  win.Date = class PinnedDate extends Date {
    constructor(...args) { super(args.length ? args[0] : PINNED_NOW); }
    static now() { return PINNED_NOW; }
  };
  win.fetch = denyRequest;
  win.XMLHttpRequest = class { open(...args) { denyRequest(args[1]); } };
  win.WebSocket = class { constructor(url) { denyRequest(url); } };
  win.open = () => null;
  win.close = () => {};
  win.scrollTo = () => {};
  win.prompt = () => null;
  win.confirm = () => false;
  win.alert = text => events.push(['alert', String(text)]);
  win.matchMedia = query => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  win.ResizeObserver = class { observe() {} disconnect() {} };
  win.IntersectionObserver = class { observe() {} disconnect() {} };
  win.MutationObserver = class { constructor(callback) { this.callback = callback; } observe() { events.push(['observe']); } disconnect() {} };
  win.BroadcastChannel = class { postMessage() {} close() {} };
  win.setTimeout = (callback, delay) => { timers.push([callback, delay]); return ++timerId; };
  win.setInterval = (callback, delay) => { timers.push([callback, delay]); return ++timerId; };
  win.clearTimeout = win.clearInterval = () => {};
  win.requestAnimationFrame = callback => { timers.push([callback, 0]); return ++timerId; };
  win.cancelAnimationFrame = () => {};
  win.HTMLElement.prototype.scrollIntoView = () => {};
  Object.defineProperty(win.HTMLElement.prototype, 'innerText', { get() { return this.textContent; }, set(value) { this.textContent = value; } });
  win.GM_getValue = (key, fallback) => values.has(key) ? values.get(key) : fallback;
  win.GM_setValue = (key, value) => values.set(key, value);
  win.GM_deleteValue = key => values.delete(key);
  win.GM_addStyle = css => { styles.push(css); const node = win.document.createElement('style'); node.textContent = css; win.document.head.append(node); return node; };
  win.GM_registerMenuCommand = name => { events.push(['menu', name]); return 1; };
  win.GM_log = () => {};
  win.GM_setClipboard = text => events.push(['clipboard', text]);
  win.GM_openInTab = () => {};
  win.GM_info = { script: { name: script.id } };
  win.GM_xmlhttpRequest = options => {
    if (script.id !== 'local-debug-loader') return denyRequest(options);
    assert.match(options.url, /^http:\/\/127\.0\.0\.1:8787\/(?:dist\/)?(?:IYUU_Reseed_Checker|Moviepilot_NameTest)\.user\.js\?/);
    events.push(['loader', options.url.replace('/dist/', '/').split('?')[0]]);
    options.onload({ status: 200, responseText: 'window.__loaderCount = (window.__loaderCount || 0) + 1;' });
  };
  win.GM = { xmlHttpRequest: win.GM_xmlhttpRequest };
  win.unsafeWindow = win;
  win.console.error = (...args) => consoleErrors.push(String(args[0]));
  win.addEventListener('error', event => errors.push(event.message));
  win.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));
  try { win.eval(code); } catch (error) { errors.push(`${error.name}: ${error.message}`); }
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const query = selector => win.document.querySelector(selector);
  const signatures = [...win.document.querySelectorAll('style')].map(node => node.textContent);
  const summary = {
    errors,
    consoleErrors,
    events,
    requests,
    styles: signatures.map(digest),
    timers: timers.map(([, delay]) => delay),
    bodyIds: [...win.document.querySelectorAll('[id]')].map(node => node.id).sort(),
    text: win.document.body.textContent.replace(/\s+/g, ' ').trim(),
    shadow: [...win.document.querySelectorAll('*')].filter(node => node.shadowRoot).map(node => digest(node.shadowRoot.textContent.replace(/\s+/g, ' ').trim())),
    nicept: { remaining: win.document.querySelectorAll('img.c_doc, img.c_movies').length, replacement: [...win.document.querySelectorAll('div')].find(node => node.title === 'Anime')?.getAttribute('style') },
    loaderCount: win.__loaderCount || 0,
    claimMounted: !!query('#pt-claim-plus')
  };
  dom.window.close();
  return JSON.parse(JSON.stringify(summary));
}

for (const script of scripts) {
  if (capture) {
    const original = execFileSync('git', ['show', `${baseline.baseline}:${script.output}`], { cwd: root, encoding: 'utf8' });
    const result = await runtime(original, script);
    assert.equal(result.requests.length, 0, `${script.id}: baseline attempted an external request`);
    golden[script.id] = result;
  } else {
    const artifact = readFileSync(join(root, 'dist', script.output), 'utf8');
    const result = await runtime(artifact, script);
    assert.deepEqual(result, golden[script.id], `${script.id}: initialization differs from original offline fixture`);
    console.log(`offline ${script.id}: initialization, DOM, styles, timers and network boundary match baseline`);
  }
}
if (capture) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(goldenPath, JSON.stringify(golden, null, 2) + '\n');
  console.log('Captured immutable original offline initialization contracts');
} else console.log(`PASS: ${scripts.length} scripts; offline baseline parity; no external requests`);

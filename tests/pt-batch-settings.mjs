import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { state, DOWNLOADERS_KEY, PUSH_CONFIGS_KEY } from '../src/scripts/pt-batch-download/config.js';
import { buildPanel } from '../src/scripts/pt-batch-download/panel.js';

const dom = new JSDOM('<body style="background:rgb(255,255,255)"></body>', { url: 'https://fixture.invalid/torrents.php' });
for (const key of ['document', 'Node', 'location', 'sessionStorage']) globalThis[key] = dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.confirm = () => true;
const store = new Map([
  [DOWNLOADERS_KEY, [{ id: 'a', name: '下载器A', type: 'qb', host: 'http://fixture.invalid' }, { id: 'b', name: '下载器B', type: 'tr', host: 'http://fixture.invalid' }]],
  [PUSH_CONFIGS_KEY, [{ id: 'pa', downloaderId: 'a', name: '电影', qbCategory: 'movies', qbAutoTMM: true }, { id: 'pb', downloaderId: 'b', name: '剧集', trDownloadDir: '/tv' }]]
]);
globalThis.GM_getValue = (key, fallback) => structuredClone(store.get(key) ?? fallback);
globalThis.GM_setValue = (key, value) => store.set(key, structuredClone(value));
globalThis.GM_addStyle = css => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
};
// Connection tests must never make real requests in this fixture.
globalThis.GM_xmlhttpRequest = () => { throw new Error('Unexpected network request'); };
const click = (root, text) => {
  const node = [...root.querySelectorAll('button')].find(button => button.textContent === text);
  assert.ok(node, `Missing button: ${text}`);
  node.click();
};
buildPanel();
const panel = document.querySelector('#ptbd-panel');
assert.equal(panel.querySelectorAll('.ptbd-dl-select').length, 1);
const target = state.ui.downloaderSelect;
assert.deepEqual([...target.options].map(o => o.textContent), ['浏览器下载', '下载器A - 默认推送', '下载器A - 电影', '下载器B - 默认推送', '下载器B - 剧集']);
const choose = (dl, push) => {
  target.value = dl ? JSON.stringify([dl, push]) : '';
  target.dispatchEvent(new dom.window.Event('change'));
  assert.equal(state.selectedDownloaderId, dl);
  assert.equal(state.selectedPushId, push);
};
choose('a', 'pa');
assert.equal(state.ui.batchButton.textContent, '推送已选');
choose('b', '');
choose('', '');
assert.equal(state.ui.batchButton.textContent, '下载已选');
assert.ok(panel.querySelector('.ptbd-head-actions .ptbd-settings'));
click(panel, '⚙');
let settings = document.querySelector('#ptbd-dl-modal');
assert.ok(settings.classList.contains('ptbd-theme-light'));
let cards = settings.querySelectorAll('.ptbd-config-card');
assert.equal(cards.length, 2);
assert.match(cards[0].textContent, /电影/);
assert.doesNotMatch(cards[0].textContent, /剧集/);
assert.match(cards[0].textContent, /分类 movies.*自动管理 开/);
assert.match(cards[1].textContent, /目录 \/tv/);
click(cards[1], '添加推送配置');
let editor = document.querySelector('#ptbd-push-modal');
assert.match(editor.querySelector('.ptbd-owner').textContent, /下载器B.*Transmission/);
assert.equal(editor.querySelectorAll('input[type=checkbox]').length, 0);
editor.querySelector('input').value = '动漫';
click(editor, '保存');
assert.equal(state.selectedDownloaderId, 'b');
assert.equal(target.selectedOptions[0].textContent, '下载器B - 动漫');
assert.equal(store.get(PUSH_CONFIGS_KEY).at(-1).downloaderId, 'b');
cards = settings.querySelectorAll('.ptbd-config-card');
click(cards[1].querySelectorAll('.ptbd-push-row')[1], '删除');
assert.equal(state.selectedPushId, '');
assert.equal(target.selectedOptions[0].textContent, '下载器B - 默认推送');
choose('a', 'pa');
click(settings.querySelector('.ptbd-config-card .ptbd-card-head'), '删除');
assert.equal(state.selectedDownloaderId, '');
assert.equal(state.selectedPushId, '');
assert.equal(target.value, '');
assert.ok(!store.get(PUSH_CONFIGS_KEY).some(push => push.downloaderId === 'a'));
click(settings, '×');
document.body.style.background = 'rgb(16,16,16)';
click(panel, '⚙');
settings = document.querySelector('#ptbd-dl-modal');
assert.ok(settings.classList.contains('ptbd-theme-dark'));
assert.equal(settings.querySelector('[role=dialog]').getAttribute('aria-label'), '下载器与推送设置');
console.log('PASS: combined target selection, grouped ownership, create/delete refresh, gear entry, light/dark modal');
dom.window.close();

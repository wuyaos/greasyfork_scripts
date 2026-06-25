// ==UserScript==
// @name         PT一键认领 Plus
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.2.2
// @description  根据标题表达式、体积、IP、客户端筛选当前做种列表，预览后批量认领 PT 种子。
// @author       ngtrio & AI
// @match        *://*/userdetails.php?id=*
// @match        *://*/getusertorrentlist.php?userid=*
// @run-at       document-idle
// @grant        none
// @noframes
// @license      MIT
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/pt-oneclickclaim.svg
// @downloadURL  https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_OneClickClaim.user.js
// @updateURL    https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_OneClickClaim.user.js
// ==/UserScript==

// input: PT 站用户详情页或当前做种列表页，页面内当前做种表格、认领按钮、IP 与客户端文本
// output: 页面内增强筛选栏，按标题表达式/体积/IP/客户端预览并批量认领当前做种种子
// pos: 独立 PT 一键认领增强脚本，只做认领筛选与显式确认执行，不处理账号领种移除

(function () {
  'use strict';

  const DELAY_MS = 900;
  const EMPTY_VALUE = '__PT_CLAIM_EMPTY__';
  const EMPTY_LABEL = '未检测到';
  const CLIENT_RE = /qBittorrent[^\s\n]*|Transmission[^\s\n]*|Deluge[^\s\n]*|uTorrent[^\s\n]*|µTorrent[^\s\n]*|BitComet[^\s\n]*|libtorrent[^\s\n]*|rTorrent[^\s\n]*|rtorrent[^\s\n]*|ruTorrent[^\s\n]*|BiglyBT[^\s\n]*|Azureus[^\s\n]*|Aria2[^\s\n]*|SeedBox/i;
  const IPV4_RE = /(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}/g;
  const IPV6_CANDIDATE_SEP = /[\s,，、;；()<>[\]{}"'|]+/;
  const state = { adapter: null, block: null, items: [], ui: {} };

  const adapters = [
    { id: 'pter', name: 'PterClub', match: () => /(^|\.)pterclub\.(com|net)$/i.test(location.hostname), claim(row) { const a = row.querySelector('.claim-confirm[data-url],a[data-url*="add_torrent_id"],a[href*="add_torrent_id"]'); const raw = a?.getAttribute('data-url') || a?.getAttribute('href') || ''; const id = raw.match(/add_torrent_id=(\d+)/)?.[1]; return id ? { id, cell: closestCell(a) } : null; }, request(item) { return { url: `/viewclaims.php?in_modal=yes&do_ajax=1&add_torrent_id=${encodeURIComponent(item.id)}`, method: 'GET' }; }, async validate(resp) { assertOk(resp); try { await resp.json(); } catch (_) { throw new Error('认领失败，可能认领人数已满'); } } },
    { id: 'spring', name: 'SpringSunday', match: () => /(^|\.)springsunday\.net$/i.test(location.hostname), claim(row) { const btn = [...row.querySelectorAll('button[id^="btn"],.btn[id^="btn"]')].find(isVisible); const id = btn?.id?.replace(/^btn/, ''); return id ? { id, cell: closestCell(btn) } : null; }, request(item) { return formRequest('/adopt.php', { action: 'add', id: item.id }); }, async validate(resp) { assertOk(resp); } },
    { id: 'audiences', name: 'Audiences', match: () => /(^|\.)audiences\.me$/i.test(location.hostname), claim(row) { const a = [...row.querySelectorAll('a[href]')].find(el => /认领种子|領種|claim/i.test(el.textContent)); const href = a?.getAttribute('href') || ''; const id = href.match(/claim_block(\d+)/)?.[1] || href.match(/[?&]tid=(\d+)/)?.[1]; return id ? { id, cell: closestCell(a) } : null; }, request(item) { return { url: `/claim.php?act=add&tid=${encodeURIComponent(item.id)}`, method: 'GET' }; }, async validate(resp) { assertOk(resp); const data = await safeJson(resp); if (data && data.res === false) throw new Error(data.message || '认领失败'); } },
    { id: 'generic', name: '通用 NPHP', match: () => true, claim(row) { const btn = [...row.querySelectorAll('button[data-torrent_id]')].find(el => isVisible(el) && /领|領|claim/i.test(el.textContent)); const id = btn?.getAttribute('data-torrent_id'); return id ? { id, cell: closestCell(btn) } : null; }, request(item) { return formRequest('/ajax.php', { action: 'addClaim', 'params[torrent_id]': item.id }); }, async validate(resp) { assertOk(resp); const data = await safeJson(resp); if (data && data.ret !== undefined && Number(data.ret) !== 0) throw new Error(data.msg || '认领失败'); } }
  ];

  window.addEventListener('load', init);

  function init() {
    state.adapter = adapters.find(a => a.match());
    state.block = getSeedingBlock();
    if (!state.block || document.querySelector('#pt-claim-plus')) return console.log('当前做种未找到');
    state.block.prepend(buildPanel());
    refreshItemsAndOptions();
  }

  function buildPanel() {
    const box = el('div', { id: 'pt-claim-plus' });
    Object.assign(box.style, { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', margin: '6px 0', padding: '6px', border: '1px solid #ddd', background: '#fffbe6' });
    state.ui.keyword = input('claim-keyword', '关键词: 2160p H265|HEVC -REMUX S01E*', '260px');
    state.ui.size = input('claim-size', '最低大小(GB)', '110px');
    state.ui.ip = multiFilter('IP');
    state.ui.client = multiFilter('客户端');
    state.ui.status = el('span');
    append(box, text('PT一键认领 Plus'), state.ui.keyword, state.ui.size, state.ui.ip.root, state.ui.client.root, button('刷新筛选', refreshItemsAndOptions), button('检测认领', preview), button('确认认领', doClaim), state.ui.status);
    return box;
  }

  function refreshItemsAndOptions() {
    state.items = parseItems();
    fillMulti(state.ui.ip, state.items.flatMap(x => x.ips), state.items.filter(x => !x.ips.length).length);
    fillMulti(state.ui.client, state.items.flatMap(x => x.clients), state.items.filter(x => !x.clients.length).length);
    setStatus(`已启用 ${state.adapter.name}，可认领 ${state.items.length} 个`);
  }

  function parseItems() { return candidateRows().map(parseRow).filter(Boolean); }
  function candidateRows() {
    const ownRows = [...(state.block?.querySelectorAll('tr') || [])].filter(r => !r.querySelector('#pt-claim-plus'));
    if (ownRows.length > 1) return ownRows;
    return [...document.querySelectorAll('table')].filter(t => /标题/.test(t.innerText) && /客户端|IP|操作/.test(t.innerText)).flatMap(t => [...t.rows]);
  }

  function parseRow(row) {
    if (!row.cells?.length) return null;
    const claim = state.adapter.claim(row);
    if (!claim) return null;
    const cells = [...row.cells];
    const titleCell = findTitleCell(cells);
    const title = clean(titleCell?.querySelector('a[title]')?.getAttribute('title') || titleCell?.querySelector('a')?.textContent || titleCell?.textContent);
    if (!title) return null;
    const network = extractNetworkInfo(row);
    const sizeText = findSizeText(cells);
    return { row, cell: claim.cell || row.lastElementChild, id: claim.id, title, sizeText, sizeBytes: parseSize(sizeText), ips: network.ips, clients: network.clients };
  }

  function preview() {
    const targets = getTargets(true);
    targets.forEach(t => t.cell.style.backgroundColor = 'orange');
    setStatus(targets.length ? `检测到 ${targets.length} 个可认领种子；${filterSummary('；')}` : '没有符合筛选条件的可认领种子');
  }

  async function doClaim() {
    const targets = getTargets(true);
    if (!targets.length) return setStatus('没有符合筛选条件的可认领种子');
    if (!confirm(`确定要认领筛选出的 ${targets.length} 个种子吗？\n${filterSummary('\n')}`)) return;
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      setStatus(`认领中 ${i + 1}/${targets.length}: ${item.title}`);
      try { await claimOne(item); item.cell.style.backgroundColor = 'lightgreen'; ok++; }
      catch (e) { console.log(`认领失败: ${item.title}`, e); item.cell.style.backgroundColor = 'pink'; fail++; }
      await sleep(DELAY_MS);
    }
    setStatus(`认领完成：成功 ${ok}，失败 ${fail}`);
  }

  function getTargets(clearColor) {
    state.items = parseItems();
    if (clearColor) state.items.forEach(t => t.cell.style.backgroundColor = '');
    const f = filters();
    return state.items.filter(item => matchFilter(item, f));
  }

  function matchFilter(item, f) {
    if (!matchKeyword(item.title, f.keyword)) return false;
    if (f.minBytes && (!item.sizeBytes || item.sizeBytes < f.minBytes)) return false;
    if (f.ips.size && !matchesSelected(item.ips, f.ips)) return false;
    if (f.clients.size && !matchesSelected(item.clients, f.clients)) return false;
    return true;
  }

  function matchesSelected(values, selected) { return values.length ? values.some(v => selected.has(v)) : selected.has(EMPTY_VALUE); }

  async function claimOne(item) {
    const req = state.adapter.request(item);
    const resp = await fetch(req.url, { method: req.method, headers: req.headers || {}, body: req.body || null, credentials: 'same-origin' });
    await state.adapter.validate(resp);
  }

  function extractNetworkInfo(row) {
    const ips = new Set(), clients = new Set();
    const cellTexts = [...row.cells].map(readableText);
    cellTexts.forEach(t => extractIps(t).forEach(ip => ips.add(ip)));
    row.querySelectorAll('img[title]').forEach(img => { if (CLIENT_RE.test(img.title)) clients.add(clean(img.title)); });
    cellTexts.forEach(t => t.split(/[\n\r]+/).map(clean).filter(Boolean).forEach(line => {
      const match = line.match(CLIENT_RE);
      if (match) clients.add(match[0]);
      const withoutIps = stripIps(line).replace(/\b\d{2,5}\b/g, ' ').trim();
      if (CLIENT_RE.test(withoutIps)) clients.add(withoutIps.match(CLIENT_RE)[0]);
    }));
    return { ips: [...ips], clients: [...clients] };
  }

  function extractIps(textValue) { const text = String(textValue || ''); const ips = text.match(IPV4_RE) || []; text.split(IPV6_CANDIDATE_SEP).forEach(part => { const token = part.trim(); if (token.includes(':') && isIPv6(token)) ips.push(token); }); return [...new Set(ips)]; }
  function isIPv6(value) { try { return new URL(`http://[${value}]/`).hostname.toLowerCase() === `[${value.toLowerCase()}]`; } catch (_) { return false; } }
  function stripIps(textValue) { return String(textValue || '').replace(IPV4_RE, ' ').split(IPV6_CANDIDATE_SEP).map(part => isIPv6(part) ? ' ' : part).join(' '); }
  function parseKeywordQuery(raw) {
    const query = String(raw || '').trim();
    const parsed = { all: [], any: [], not: [] };
    if (!query) return parsed;
    for (const token of tokens(query)) {
      const neg = token.startsWith('-');
      const body = (neg ? token.slice(1) : token).trim();
      if (!body) continue;
      const parts = body.split('|').map(x => x.trim()).filter(Boolean);
      if (neg) parsed.not.push(...parts); else if (parts.length > 1) parsed.any.push(...parts); else parsed.all.push(body);
    }
    return parsed;
  }
  function matchKeyword(title, query) {
    const parsed = typeof query === 'string' ? parseKeywordQuery(query) : query;
    const textValue = String(title || '').toLowerCase();
    return parsed.all.every(t => termMatch(textValue, t)) && (!parsed.any.length || parsed.any.some(t => termMatch(textValue, t))) && !parsed.not.some(t => termMatch(textValue, t));
  }
  function termMatch(textValue, term) { const raw = String(term || '').toLowerCase(); return raw.includes('*') ? wildcard(raw).test(textValue) : textValue.includes(raw); }
  function wildcard(term) { return new RegExp(escapeRegExp(term).replace(/\\\*/g, '.*'), 'i'); }
  function tokens(query) { const out = []; query.replace(/"([^"]+)"|'([^']+)'|(\S+)/g, (_, a, b, c) => out.push(a || b || c)); return out; }

  function filters() { return { keyword: parseKeywordQuery(state.ui.keyword.value), minBytes: Number(state.ui.size.value || 0) * 1024 ** 3, ips: selectedMulti(state.ui.ip), clients: selectedMulti(state.ui.client) }; }
  function filterSummary(sep) { const f = filters(); return [`关键词: ${state.ui.keyword.value || '全部'}`, `最低体积: ${state.ui.size.value || '不限'} GB`, `IP: ${summarySet(f.ips)}`, `客户端: ${summarySet(f.clients)}`].join(sep); }
  function summarySet(set) { return set.size ? [...set].map(v => v === EMPTY_VALUE ? EMPTY_LABEL : v).join(', ') : '全部'; }
  function findTitleCell(cells) { return cells.find(c => c.querySelector('a[title]')) || cells.find(c => c.querySelector('a[href*="details"],a[href*="torrent"],a[href*="/t/"]')) || cells[1] || cells[0]; }
  function findSizeText(cells) { return readableText(cells.find(c => /\d+(?:\.\d+)?\s*(?:TiB|GiB|MiB|KiB|TB|GB|MB|KB)/i.test(readableText(c))) || null); }
  function parseSize(text) { const m = String(text).replace(/iB/gi, 'B').match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB|B)/i); return m ? Number(m[1]) * ({ TB: 1024 ** 4, GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024, B: 1 }[m[2].toUpperCase()] || 1) : 0; }
  function getSeedingBlock() { if (/\/getusertorrentlist\.php/i.test(location.pathname)) { const bodies = document.querySelectorAll('tbody'); return bodies[bodies.length - 1]; } return [...document.querySelectorAll('tr')].find(row => row.childElementCount === 2 && clean(row.cells[0]?.textContent) === '当前做种')?.cells[1]; }
  function readableText(node) { if (!node) return ''; const clone = node.cloneNode(true); clone.querySelectorAll('br').forEach(br => br.replaceWith('\n')); clone.querySelectorAll('img[title]').forEach(img => img.replaceWith(` ${img.title} `)); return clone.textContent || ''; }
  function multiFilter(titleText) { const root = el('details'); const summary = el('summary'); const box = el('div'); Object.assign(box.style, { maxHeight: '180px', overflow: 'auto', minWidth: '190px', padding: '4px', border: '1px solid #ddd', background: '#fff' }); root.append(summary, box); const control = { root, summary, box, title: titleText }; root.addEventListener('change', () => updateMultiSummary(control)); updateMultiSummary(control); return control; }
  function fillMulti(control, values, emptyCount = 0) { const old = selectedMulti(control); const counts = new Map(); values.filter(Boolean).forEach(v => counts.set(v, (counts.get(v) || 0) + 1)); if (emptyCount) counts.set(EMPTY_VALUE, emptyCount); control.box.textContent = ''; [...counts.keys()].sort((a, b) => labelValue(a).localeCompare(labelValue(b))).forEach(value => { const cb = el('input', { type: 'checkbox' }); cb.value = value; cb.checked = old.has(value); const line = el('label'); line.style.display = 'block'; line.append(cb, text(` ${labelValue(value)} (${counts.get(value)})`)); control.box.append(line); }); updateMultiSummary(control); }
  function labelValue(value) { return value === EMPTY_VALUE ? EMPTY_LABEL : value; }
  function selectedMulti(control) { return new Set([...control.box.querySelectorAll('input:checked')].map(x => x.value)); }
  function updateMultiSummary(control) { const count = selectedMulti(control).size; control.summary.textContent = `${control.title}: ${count ? `已选 ${count}` : '全部'}`; }
  function formRequest(url, data) { return { url, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() }; }
  function assertOk(resp) { if (!resp.ok) throw new Error(`HTTP ${resp.status}`); }
  async function safeJson(resp) { try { return await resp.json(); } catch (_) { return null; } }
  function closestCell(node) { return node?.closest?.('td,th') || null; }
  function isVisible(node) { return node && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden'; }
  function clean(textValue) { return String(textValue || '').replace(/\s+/g, ' ').trim(); }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function setStatus(msg) { if (state.ui.status) state.ui.status.textContent = msg; }
  function input(id, placeholder, width) { const n = el('input', { id, placeholder }); n.style.width = width; return n; }
  function button(labelText, fn) { const n = el('button'); n.textContent = labelText; n.addEventListener('click', fn); return n; }
  function text(value) { return document.createTextNode(value); }
  function append(parent, ...children) { children.forEach(child => parent.appendChild(child)); return parent; }
  function el(tag, attrs = {}) { const n = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; }
  function escapeRegExp(value) { return String(value).replace(/[.+?^${}()|[\]\\]/g, '\\$&'); }
})();

// ==UserScript==
// @name         朱雀批量下载种子
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.2.1
// @description  在朱雀(ZHUQUE)种子搜索页注入批量下载面板，支持按体积区间、做种数、下载数、上传/下载倍率多选筛选当前页种子并批量下载。
// @author       wuyaos & AI
// @match        https://zhuque.in/torrent/search/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      zhuque.in
// @noframes
// @license      MIT
// @icon         https://zhuque.in/assets/images/512.png
// @downloadURL  https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Zhuque_BatchDownload.user.js
// @updateURL    https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Zhuque_BatchDownload.user.js
// ==/UserScript==

// input: 朱雀种子搜索/列表页，Ant Design Table 行，每行含体积、做种数、下载数、完成数、上传/下载倍率、下载链接
// output: 页面顶部注入批量下载面板，按多选条件筛选当前页种子并批量下载，可预览、全选/反选
// pos: 独立朱雀批量下载脚本，只读取页面表格并触发显式用户下载，不改写站点逻辑

(function () {
  'use strict';

  const ID = 'zhuque-batch-dl';
  const STORAGE_KEY = 'zhuque_batch_dl_cfg';
  const DELAY_KEY = 'zhuque_batch_dl_delay';
  const UNIT_BYTES = { kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, pib: 1024 ** 5 };
  const state = { rows: [], filtered: [], panel: null, ui: {}, mountTimer: null, lastSig: '' };

  function parseSize(text) {
    if (!text) return null;
    const m = String(text).trim().match(/([\d.]+)\s*([KMGTP]iB)/i);
    if (!m) return null;
    const val = parseFloat(m[1]);
    const factor = UNIT_BYTES[m[2].toLowerCase()];
    return isFinite(val) && factor ? val * factor : null;
  }
  function formatBytes(bytes) {
    if (bytes == null || !isFinite(bytes)) return '-';
    const units = [['PiB', 1024 ** 5], ['TiB', 1024 ** 4], ['GiB', 1024 ** 3], ['MiB', 1024 ** 2], ['KiB', 1024]];
    for (const [name, f] of units) if (bytes >= f) return (bytes / f).toFixed(2) + ' ' + name;
    return bytes + ' B';
  }
  function readRow(row) {
    const cells = row.cells ? [...row.cells] : [];
    const titleCell = cells[2];
    const dl = titleCell?.querySelector('a[href*="/api/torrent/download/"]') || row.querySelector('a[href*="/api/torrent/download/"]');
    const href = dl?.getAttribute('href') || '';
    const id = href.match(/\/api\/torrent\/download\/(\d+)/)?.[1] || '';
    if (!href || !id) return null;
    const titleLink = titleCell?.querySelector('.link-deco') || [...(titleCell?.querySelectorAll('a') || [])].find(a => !/\/api\/torrent\/download\//.test(a.getAttribute('href') || ''));
    const uploadCell = cells[7];
    const uploadRaw = uploadCell?.querySelector('.text-upload')?.textContent || uploadCell?.textContent || '';
    const downloadRaw = uploadCell?.querySelector('.text-download')?.textContent || uploadCell?.textContent || '';
    const uploadMult = parseMult(uploadRaw, uploadCell?.textContent, '↑');
    const downloadMult = parseMult(downloadRaw, uploadCell?.textContent, '↓');
    const title = clean(titleLink?.textContent || titleCell?.textContent || id).replace(/\s*\[下载\]\s*$/, '').trim() || id;
    const uploadText = `${uploadMult}x`, downloadText = `${downloadMult}x`;
    return { row, cells, id, href, title, sizeText: clean(cells[3]?.textContent), size: parseSize(cells[3]?.textContent), seeders: toInt(cells[4]?.textContent), leechers: toInt(cells[5]?.textContent), completed: toInt(cells[6]?.textContent), uploadMult, downloadMult, uploadText, downloadText, ratioText: `↑${uploadText} / ↓${downloadText}` };
  }
  function applyFilter(cfg) {
    const keyword = clean(cfg.keyword).toLowerCase();
    const minBytes = sizeValue(cfg.sizeMin, cfg.sizeMinUnit), maxBytes = sizeValue(cfg.sizeMax, cfg.sizeMaxUnit);
    const seedMin = num(cfg.seedMin), seedMax = num(cfg.seedMax), leechMin = num(cfg.leechMin), leechMax = num(cfg.leechMax);
    const ratioSet = new Set(cfg.ratioMult || []);
    return state.rows.filter(r => {
      if (keyword && !r.title.toLowerCase().includes(keyword)) return false;
      if (minBytes != null && (r.size == null || r.size < minBytes)) return false;
      if (maxBytes != null && (r.size == null || r.size > maxBytes)) return false;
      if (seedMin != null && r.seeders < seedMin) return false;
      if (seedMax != null && r.seeders > seedMax) return false;
      if (leechMin != null && r.leechers < leechMin) return false;
      if (leechMax != null && r.leechers > leechMax) return false;
      if (ratioSet.size && !ratioSet.has(r.ratioText)) return false;
      return true;
    });
  }
  async function downloadOne(r, done) {
    const url = new URL(r.href, location.origin).href;
    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      if (!blob.size) throw new Error('空文件');
      const name = fileNameFromDisposition(resp.headers.get('content-disposition')) || `zhuque_${r.id}_${sanitize(r.title)}.torrent`;
      const objectUrl = URL.createObjectURL(blob);
      const a = el('a', { href: objectUrl, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      done && done(true);
    } catch (e) {
      console.warn('[朱雀批量] 下载失败', r.id, e);
      done && done(false);
    }
  }
  function batchDownload(items, btn) {
    if (!items.length) return setStatus('没有可下载的种子');
    const delay = Math.max(100, parseInt(safeGet(DELAY_KEY, 800), 10) || 800);
    let i = 0, ok = 0, fail = 0;
    if (btn) btn.disabled = true;
    const next = () => {
      if (i >= items.length) { if (btn) btn.disabled = false; return setStatus(`完成：成功 ${ok} / 失败 ${fail} / 共 ${items.length}`); }
      const item = items[i++];
      setStatus(`下载中 ${i}/${items.length}`);
      downloadOne(item, success => { if (success) ok++; else fail++; setTimeout(next, delay); });
    };
    next();
  }
  function buildPanel() {
    ensureStyle();
    state.rows = getRows();
    state.filtered = [];
    const cfg = loadCfg();
    const box = el('div', { id: ID, class: pageIsDark() ? 'zq-theme-dark' : 'zq-theme-light' });
    const head = el('div', { class: 'zq-head' }, el('div', { class: 'zq-title' }, el('img', { src: 'https://zhuque.in/assets/images/512.png', alt: '' }), '朱雀批量下载'), el('span', { class: 'zq-collapse' }, '收起 ▲'));
    const body = el('div', { class: 'zq-body' });
    state.ui.keyword = input('text', '关键字', 'zq-keyword', cfg.keyword, '按标题关键字筛选，大小写不敏感');
    state.ui.sizeMin = input('number', '最小', 'zq-size-num', cfg.sizeMin);
    state.ui.sizeMinUnit = unitSelect(cfg.sizeMinUnit || defaultSizeUnit(cfg.sizeMin));
    state.ui.sizeMax = input('number', '最大', 'zq-size-num', cfg.sizeMax);
    state.ui.sizeMaxUnit = unitSelect(cfg.sizeMaxUnit || defaultSizeUnit(cfg.sizeMax));
    state.ui.seedMin = input('number', '最小', 'zq-size', cfg.seedMin); state.ui.seedMax = input('number', '最大', 'zq-size', cfg.seedMax);
    state.ui.leechMin = input('number', '最小', 'zq-size', cfg.leechMin); state.ui.leechMax = input('number', '最大', 'zq-size', cfg.leechMax);
    state.ui.ratioMult = multiFilter('优惠', cfg.ratioMult || []);
    state.ui.status = el('span', { id: 'zq-batch-status' }, `当前页 ${state.rows.length} 条，待筛选`);
    append(body,
      el('div', { class: 'zq-filter-line' },
        el('div', { class: 'zq-field zq-keyword-field' }, el('label', {}, '关键字'), state.ui.keyword),
        sizeRangeField('体积', state.ui.sizeMin, state.ui.sizeMinUnit, state.ui.sizeMax, state.ui.sizeMaxUnit),
        rangeField('做种', state.ui.seedMin, state.ui.seedMax),
        rangeField('下载', state.ui.leechMin, state.ui.leechMax),
        selectField('优惠', state.ui.ratioMult.root)
      ),
      actionsRow(),
      el('div', { class: 'zq-hint' }, '筛选会同步勾选当前页匹配行；下载延迟可在油猴菜单调节。')
    );
    append(box, head, body);
    head.lastChild.addEventListener('click', () => { const open = body.style.display !== 'none'; body.style.display = open ? 'none' : ''; head.lastChild.textContent = open ? '展开 ▼' : '收起 ▲'; });
    state.panel = box;
    refreshOptions(cfg);
    return box;
  }
  function mount() {
    if (document.querySelector('#' + ID)) { refreshRowsAndOptions(); return; }
    if (!document.querySelector('.ant-table-row')) return;
    const panel = buildPanel();
    const table = document.querySelector('.ant-table-wrapper') || document.querySelector('.ant-table') || document.querySelector('.ant-table-row')?.closest('div') || document.body;
    table.parentElement?.insertBefore(panel, table) || document.body.prepend(panel);
    injectRowChecks();
  }
  function observe() {
    mount();
    const mo = new MutationObserver(() => {
      if (document.querySelector('.ant-table-row') && !document.querySelector('#' + ID)) mount();
      else refreshRowsAndOptions();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    if (state.mountTimer) clearInterval(state.mountTimer);
    state.mountTimer = setInterval(() => { if (document.querySelector('.ant-table-row') && !document.querySelector('#' + ID)) mount(); }, 1500);
  }
  function start() {
    const ready = () => { observe(); registerMenu(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  }

  function actionsRow() {
    const btnApply = button('按条件重新勾选', preview, 'zq-btn-check');
    const btnSelect = button('全选结果', selectFiltered);
    const btnInvert = button('反选', invertChecks);
    const btnChecked = button('下载当前勾选', () => batchDownload(getChecked(), btnChecked), 'zq-btn-primary');
    return el('div', { class: 'zq-row zq-actions' }, btnApply, btnSelect, btnInvert, btnChecked, state.ui.status);
  }
  function preview() {
    const cfg = collectCfg();
    saveCfg(cfg);
    state.filtered = applyFilter(cfg);
    highlight(state.filtered);
    syncChecks(state.filtered);
    setStatus(`筛选命中并勾选 ${state.filtered.length} / ${state.rows.length} 条`);
  }
  function selectFiltered() {
    const cfg = collectCfg();
    saveCfg(cfg);
    const items = applyFilter(cfg);
    state.filtered = items;
    highlight(items);
    syncChecks(items);
    setStatus(`已勾选 ${items.length} 条`);
  }
  function invertChecks() {
    document.querySelectorAll('.zq-row-check input[data-id]').forEach(cb => { cb.checked = !cb.checked; });
    setStatus(`已勾选 ${getChecked().length} 条`);
  }
  function getChecked() {
    const ids = new Set([...document.querySelectorAll('.zq-row-check input[data-id]:checked')].map(cb => cb.getAttribute('data-id')));
    return state.rows.filter(r => ids.has(r.id));
  }
  function collectCfg() {
    return { keyword: clean(state.ui.keyword?.value), sizeMin: clean(state.ui.sizeMin?.value), sizeMinUnit: state.ui.sizeMinUnit?.value || 'MiB', sizeMax: clean(state.ui.sizeMax?.value), sizeMaxUnit: state.ui.sizeMaxUnit?.value || 'MiB', seedMin: clean(state.ui.seedMin?.value), seedMax: clean(state.ui.seedMax?.value), leechMin: clean(state.ui.leechMin?.value), leechMax: clean(state.ui.leechMax?.value), ratioMult: selectedMulti(state.ui.ratioMult) };
  }
  function refreshRowsAndOptions() {
    const panel = document.querySelector('#' + ID);
    if (!panel) return;
    const rows = getRows();
    const sig = rows.map(r => [r.id, r.sizeText, r.seeders, r.leechers, r.ratioText].join(':')).join('|');
    if (sig === state.lastSig) { state.rows = rows; injectRowChecks(); return; }
    state.lastSig = sig;
    state.rows = rows;
    state.filtered = [];
    injectRowChecks();
    refreshOptions(collectCfg());
    setStatus(`当前页 ${state.rows.length} 条，待筛选`);
  }
  function refreshOptions(cfg) {
    fillMulti(state.ui.ratioMult, state.rows.map(r => r.ratioText), cfg.ratioMult || []);
  }
  function injectRowChecks() {
    state.rows.forEach(r => {
      const cell = r.cells[0];
      if (!cell) return;
      let wrap = cell.querySelector('.zq-row-check');
      if (!wrap) {
        wrap = el('label', { class: 'zq-row-check' }, el('input', { type: 'checkbox' }));
        cell.prepend(wrap);
      }
      const cb = wrap.querySelector('input[type=checkbox]');
      if (cb.getAttribute('data-id') !== r.id) {
        cb.checked = false;
        cb.setAttribute('data-id', r.id);
      }
    });
  }
  function syncChecks(items) {
    const ids = new Set(items.map(r => r.id));
    document.querySelectorAll('.zq-row-check input[data-id]').forEach(cb => { cb.checked = ids.has(cb.getAttribute('data-id')); });
  }
  function highlight(items) {
    const ids = new Set(items.map(r => r.id));
    state.rows.forEach(r => { r.row.style.background = ids.has(r.id) ? 'rgba(48,126,255,.10)' : ''; });
  }
  function getRows() { return [...document.querySelectorAll('.ant-table-row')].map(readRow).filter(Boolean); }
  function loadCfg() { const v = safeGet(STORAGE_KEY, {}); return v && typeof v === 'object' ? v : {}; }
  function saveCfg(c) { try { GM_setValue(STORAGE_KEY, c); } catch (_) {} }
  function safeGet(key, def) { try { return GM_getValue(key, def); } catch (_) { return def; } }
  function registerMenu() {
    try { GM_registerMenuCommand('设置下载延迟(ms)', () => { const cur = safeGet(DELAY_KEY, 800); const v = prompt('每个种子下载间隔毫秒数（最小 100）：', cur); if (v != null && /^\d+$/.test(String(v).trim())) GM_setValue(DELAY_KEY, Math.max(100, parseInt(v, 10))); }); } catch (_) {}
  }
  function multiFilter(title, selected) { const root = el('details'); const summary = el('summary'); const box = el('div', { class: 'zq-menu' }); root.append(summary, box); const control = { root, summary, box, title, selected: new Set(selected || []) }; root.addEventListener('change', () => updateMultiSummary(control)); updateMultiSummary(control); return control; }
  function fillMulti(control, values, selected) { if (!control) return; const old = new Set(selected || selectedMulti(control)); const counts = new Map(); values.filter(Boolean).forEach(v => counts.set(v, (counts.get(v) || 0) + 1)); control.box.textContent = ''; [...counts.keys()].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b)).forEach(value => { const cb = el('input', { type: 'checkbox', value }); cb.checked = old.has(value); control.box.append(el('label', {}, cb, ` ${value} (${counts.get(value)})`)); }); updateMultiSummary(control); }
  function selectedMulti(control) { return control ? [...control.box.querySelectorAll('input:checked')].map(x => x.value) : []; }
  function updateMultiSummary(control) { const count = selectedMulti(control).length; control.summary.textContent = count ? `已选 ${count}` : '全部'; }
  function sizeRangeField(label, min, minUnit, max, maxUnit) { return el('div', { class: 'zq-field zq-range-field zq-size-field' }, el('label', {}, label), el('div', { class: 'zq-range' }, el('div', { class: 'zq-range-box zq-size-box' }, min, minUnit), el('span', { class: 'zq-range-sep' }, '~'), el('div', { class: 'zq-range-box zq-size-box' }, max, maxUnit))); }
  function rangeField(label, min, max) { return el('div', { class: 'zq-field zq-range-field' }, el('label', {}, label), el('div', { class: 'zq-range' }, el('div', { class: 'zq-range-box zq-num-box' }, min), el('span', { class: 'zq-range-sep' }, '~'), el('div', { class: 'zq-range-box zq-num-box' }, max))); }
  function selectField(label, control) { return el('div', { class: 'zq-field zq-select-field' }, el('label', {}, label), control); }
  function input(type, placeholder, className, value, title) { return el('input', { type, class: className, placeholder, value: normalizeInputValue(value), title }); }
  function unitSelect(value) { const sel = el('select', { class: 'zq-unit' }); ['KiB', 'MiB', 'GiB', 'TiB', 'PiB'].forEach(u => { const opt = el('option', { value: u }, u); if (u === value) opt.selected = true; sel.append(opt); }); return sel; }
  function button(label, fn, cls = '') { const b = el('button', { class: `zq-btn ${cls}`.trim(), type: 'button' }, label); b.addEventListener('click', fn); return b; }
  function ensureStyle() {
    if (document.querySelector('#zq-batch-dl-style')) return;
    GM_addStyle(`
#${ID}.zq-theme-dark{--zq-panel-bg:linear-gradient(180deg,#162234,#101928);--zq-head-bg:rgba(21,35,55,.86);--zq-text:#c9d7ea;--zq-title:#e8f1ff;--zq-label:#dbeafe;--zq-muted:#a9bdd5;--zq-border:#2b4565;--zq-border-strong:#385a82;--zq-input-bg:#0f1b2b;--zq-input-text:#e5eefb;--zq-menu-hover:#17304d;--zq-btn-bg:#17263a;--zq-btn-text:#dbeafe;--zq-primary-bg:#173f35;--zq-primary-border:#2f7d5d;--zq-primary-text:#b9f6d3;--zq-check-bg:#15304c;--zq-status-bg:#101b2b;--zq-shadow:0 8px 24px rgba(0,0,0,.28)}
#${ID}.zq-theme-light{--zq-panel-bg:linear-gradient(180deg,#fbfcfe,#f4f7fb);--zq-head-bg:rgba(238,243,248,.72);--zq-text:#2f3742;--zq-title:#253044;--zq-label:#3a4757;--zq-muted:#536071;--zq-border:#d8dee8;--zq-border-strong:#c8d1dd;--zq-input-bg:#fff;--zq-input-text:#243044;--zq-menu-hover:#f2f6fb;--zq-btn-bg:#f3f5f8;--zq-btn-text:#2f3b4d;--zq-primary-bg:#e6f3ed;--zq-primary-border:#a8d0bc;--zq-primary-text:#1f6041;--zq-check-bg:#e8f1fb;--zq-status-bg:#eef3f8;--zq-shadow:0 2px 8px rgba(20,35,60,.08)}
#${ID}{font:12px/1.5 Arial,Helvetica,sans-serif;color:var(--zq-text);background:var(--zq-panel-bg);border:1px solid var(--zq-border);border-radius:8px;box-shadow:var(--zq-shadow);padding:0;margin:10px 12px;box-sizing:border-box}
#${ID} .zq-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border-bottom:1px solid var(--zq-border);background:var(--zq-head-bg);border-radius:8px 8px 0 0}
#${ID} .zq-title{font-weight:700;color:var(--zq-title);display:flex;align-items:center;gap:6px;white-space:nowrap}
#${ID} .zq-title img{width:18px;height:18px;border-radius:4px;display:block}
#${ID} .zq-body{padding:10px 12px;display:flex;flex-direction:column;gap:8px}
#${ID} .zq-filter-line{--zq-gap:8px;display:grid;grid-template-columns:repeat(4,minmax(282px,1fr));gap:var(--zq-gap);align-items:center}
#${ID} .zq-card{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;padding:8px 9px;background:var(--zq-input-bg);border:1px solid var(--zq-border);border-radius:6px}
#${ID} .zq-card-size{align-items:flex-start;flex-direction:column;gap:6px}
#${ID} .zq-card-title{font-weight:700;color:var(--zq-label);margin-right:2px;white-space:nowrap}
#${ID} .zq-row{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center}
#${ID} .zq-field{display:grid;grid-template-columns:36px minmax(0,1fr);align-items:center;gap:var(--zq-gap);color:var(--zq-muted);white-space:nowrap;min-width:0}
#${ID} .zq-keyword-field{grid-column:1/-1}
#${ID} .zq-size-field,#${ID} .zq-range-field,#${ID} .zq-select-field{grid-column:span 1}
#${ID} .zq-select-field details{width:100%;min-width:0}
#${ID} .zq-field>label{color:var(--zq-label);font-weight:600;flex:0 0 auto}
#${ID} input[type=text],#${ID} input[type=number],#${ID} select{height:26px;border:1px solid var(--zq-border-strong);border-radius:4px;background:var(--zq-input-bg);color:var(--zq-input-text);padding:2px 6px;box-sizing:border-box}
#${ID} input::placeholder{color:var(--zq-muted)}
#${ID} .zq-keyword{width:100%;min-width:0}
#${ID} .zq-size{width:100%;min-width:0}
#${ID} .zq-range{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:var(--zq-gap);width:100%;min-width:0}
#${ID} .zq-range-box{display:grid;align-items:center;min-width:0;width:100%}
#${ID} .zq-num-box{grid-template-columns:1fr}
#${ID} .zq-size-box{grid-template-columns:minmax(0,1fr) 46px;gap:var(--zq-gap)}
#${ID} .zq-size-num{width:100%;min-width:0}
#${ID} .zq-unit{width:46px;padding:2px 0 2px 2px}
#${ID} .zq-range-sep{color:var(--zq-muted);text-align:center}
#${ID} details{position:relative}
#${ID} summary{list-style:none;cursor:pointer;border:1px solid var(--zq-border-strong);background:var(--zq-input-bg);border-radius:4px;padding:4px 10px;color:var(--zq-input-text);min-width:110px;text-align:center}
#${ID} summary::-webkit-details-marker{display:none}
#${ID} details[open] summary{background:var(--zq-check-bg);border-color:var(--zq-border-strong)}
#${ID} .zq-menu{position:absolute;z-index:99999;top:30px;left:0;max-height:200px;overflow:auto;min-width:170px;padding:5px;border:1px solid var(--zq-border-strong);background:var(--zq-input-bg);color:var(--zq-input-text);border-radius:6px;box-shadow:var(--zq-shadow)}
#${ID} .zq-menu label{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;white-space:nowrap;cursor:pointer}
#${ID} .zq-menu label:hover{background:var(--zq-menu-hover)}
#${ID} .zq-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#${ID} .zq-btn{height:28px;border:1px solid var(--zq-border-strong);border-radius:4px;background:var(--zq-btn-bg);color:var(--zq-btn-text);padding:0 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
#${ID} .zq-btn:hover{filter:brightness(1.08)}
#${ID} .zq-btn:disabled{opacity:.55;cursor:not-allowed}
#${ID} .zq-btn-primary{background:var(--zq-primary-bg);border-color:var(--zq-primary-border);color:var(--zq-primary-text);font-weight:700}
#${ID} .zq-btn-check{background:var(--zq-check-bg);border-color:var(--zq-border-strong)}
#${ID} #zq-batch-status{margin-left:auto;color:var(--zq-muted);background:var(--zq-status-bg);border:1px solid var(--zq-border);border-radius:5px;padding:4px 8px;min-width:200px;text-align:right}
#${ID} .zq-hint{color:var(--zq-muted);font-size:11px}
#${ID} .zq-collapse{cursor:pointer;color:var(--zq-muted);border:1px solid var(--zq-border);border-radius:4px;padding:2px 8px;background:var(--zq-input-bg)}
.zq-row-check{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin:0 4px}.zq-row-check input{cursor:pointer}
@media(max-width:1280px){#${ID} .zq-filter-line{grid-template-columns:repeat(2,minmax(282px,1fr));align-items:stretch}}
@media(max-width:760px){#${ID} .zq-filter-line{grid-template-columns:1fr}#${ID} #zq-batch-status{margin-left:0;text-align:left;flex-basis:100%}}
    `);
  }
  function el(tag, attrs, ...kids) { const n = document.createElement(tag); if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (v == null) return; if (k === 'class') n.className = v; else if (k === 'style') n.style.cssText = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }); kids.forEach(k => { if (k == null) return; n.append(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k); }); return n; }
  function append(parent, ...kids) { kids.forEach(k => parent.append(k)); return parent; }
  function text(value) { return document.createTextNode(value); }
  function setStatus(msg) { if (state.ui.status) state.ui.status.textContent = msg; }
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function pageIsDark() { const color = firstPaintedBg(document.querySelector('.ant-layout-content') || document.body); return color ? colorBrightness(color) < 128 : false; }
  function firstPaintedBg(node) { for (let el = node; el && el !== document.documentElement; el = el.parentElement) { const bg = getComputedStyle(el).backgroundColor; if (bg && !/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(bg) && bg !== 'transparent') return bg; } return getComputedStyle(document.body).backgroundColor; }
  function colorBrightness(color) { const m = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); if (!m) return 255; return (Number(m[1]) * 299 + Number(m[2]) * 587 + Number(m[3]) * 114) / 1000; }
  function parseMult(primary, fallback, arrow) { const re = new RegExp(`${arrow}\\s*([\\d.]+)x`); const raw = String(primary || '').match(re)?.[1] ?? String(fallback || '').match(re)?.[1]; const n = parseFloat(raw); return Number.isFinite(n) ? n : 1; }
  function sizeValue(value, unit) { const text = clean(value); if (!text) return null; return /[KMGTP]iB/i.test(text) ? parseSize(text) : parseSize(`${text} ${unit || 'MiB'}`); }
  function defaultSizeUnit(value) { return clean(value).match(/([KMGTP]iB)$/i)?.[1] || 'MiB'; }
  function normalizeInputValue(value) { const text = clean(value); const m = text.match(/^([\d.]+)\s*[KMGTP]iB$/i); return m ? m[1] : text; }
  function toInt(value) { return parseInt(String(value || '').replace(/,/g, ''), 10) || 0; }
  function num(value) { const n = parseInt(value, 10); return Number.isFinite(n) ? n : null; }
  function sanitize(value) { const s = clean(value).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120); return s || 'torrent'; }
  function fileNameFromDisposition(value) {
    const text = String(value || '');
    const utf8 = text.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = text.match(/filename=("?)([^";]+)\1/i)?.[2];
    const raw = utf8 || plain;
    if (!raw) return '';
    try { return decodeURIComponent(raw).replace(/[\\/:*?"<>|]+/g, '_'); } catch (_) { return raw.replace(/[\\/:*?"<>|]+/g, '_'); }
  }

  start();
})();

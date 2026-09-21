import { ID, state } from './config.js';

import { applyFilter } from './filters.js';

import { batchDownload } from './download.js';

import { getRows, saveCfg } from './settings.js';

import { button, fillMulti, selectedMulti } from './controls.js';

import { clean, el, setStatus } from './elements.js';



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



export { actionsRow, injectRowChecks, refreshOptions, refreshRowsAndOptions };

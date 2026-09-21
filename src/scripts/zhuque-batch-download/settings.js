import { DELAY_KEY, STORAGE_KEY } from './config.js';

import { readRow } from './filters.js';



function getRows() { return [...document.querySelectorAll('.ant-table-row')].map(readRow).filter(Boolean); }

function loadCfg() { const v = safeGet(STORAGE_KEY, {}); return v && typeof v === 'object' ? v : {}; }

function saveCfg(c) { try { GM_setValue(STORAGE_KEY, c); } catch (_) {} }

function safeGet(key, def) { try { return GM_getValue(key, def); } catch (_) { return def; } }

function registerMenu() {
    try { GM_registerMenuCommand('设置下载延迟(ms)', () => { const cur = safeGet(DELAY_KEY, 800); const v = prompt('每个种子下载间隔毫秒数（最小 100）：', cur); if (v != null && /^\d+$/.test(String(v).trim())) GM_setValue(DELAY_KEY, Math.max(100, parseInt(v, 10))); }); } catch (_) {}
  }



export { getRows, loadCfg, registerMenu, safeGet, saveCfg };

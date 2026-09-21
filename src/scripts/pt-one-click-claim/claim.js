import { DELAY_MS, EMPTY_VALUE, state } from './config.js';

import { parseItems } from './torrents.js';

import { matchKeyword } from './parsing.js';

import { filterSummary, filters } from './filters.js';

import { setStatus, sleep } from './elements.js';



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
    if (f.maxBytes && (!item.sizeBytes || item.sizeBytes > f.maxBytes)) return false;
    if (f.clients.size && !matchesSelected(item.clients, f.clients)) return false;
    if (f.ips.size && !matchesSelected(item.ips, f.ips)) return false;
    return true;
  }

function matchesSelected(values, selected) { return values.length ? values.some(v => selected.has(v)) : selected.has(EMPTY_VALUE); }

async function claimOne(item) {
    const req = state.adapter.request(item);
    const resp = await fetch(req.url, { method: req.method, headers: req.headers || {}, body: req.body || null, credentials: 'same-origin' });
    await state.adapter.validate(resp);
  }



export { doClaim, preview };

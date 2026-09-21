import { EMPTY_LABEL, EMPTY_VALUE, state } from './config.js';

import { parseKeywordQuery } from './parsing.js';

import { readableText } from './page.js';

import { selectedMulti } from './multiselect.js';

import { clean } from './elements.js';



function filters() { return { keyword: parseKeywordQuery(state.ui.keyword.value), minBytes: Number(state.ui.sizeMin.value || 0) * 1024 ** 3, maxBytes: Number(state.ui.sizeMax.value || 0) * 1024 ** 3, ips: selectedMulti(state.ui.ip), clients: selectedMulti(state.ui.client) }; }

function filterSummary(sep) { const f = filters(); return [`关键词: ${state.ui.keyword.value || '全部'}`, `体积: ${sizeSummary()}`, `客户端: ${summarySet(f.clients)}`, `IP: ${summarySet(f.ips)}`].join(sep); }

function sizeSummary() { const min = clean(state.ui.sizeMin.value), max = clean(state.ui.sizeMax.value); if (min && max) return `${min}-${max} GB`; if (min) return `≥${min} GB`; if (max) return `≤${max} GB`; return '不限'; }

function summarySet(set) { return set.size ? [...set].map(v => v === EMPTY_VALUE ? EMPTY_LABEL : v).join(', ') : '全部'; }

function findTitleCell(cells) { return cells.find(c => c.querySelector('a[title]')) || cells.find(c => c.querySelector('a[href*="details"],a[href*="torrent"],a[href*="/t/"]')) || cells[1] || cells[0]; }

function findSizeText(cells) { return readableText(cells.find(c => /\d+(?:\.\d+)?\s*(?:TiB|GiB|MiB|KiB|TB|GB|MB|KB)/i.test(readableText(c))) || null); }

function parseSize(text) { const m = String(text).replace(/iB/gi, 'B').match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB|B)/i); return m ? Number(m[1]) * ({ TB: 1024 ** 4, GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024, B: 1 }[m[2].toUpperCase()] || 1) : 0; }



export { filterSummary, filters, findSizeText, findTitleCell, parseSize };

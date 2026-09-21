import { EMPTY_LABEL, EMPTY_VALUE } from './config.js';

import { el, text } from './elements.js';



function multiFilter(titleText) { const root = el('details'); const summary = el('summary'); const box = el('div', { class: 'ptc-menu' }); root.append(summary, box); const control = { root, summary, box, title: titleText }; root.addEventListener('change', () => updateMultiSummary(control)); updateMultiSummary(control); return control; }

function fillMulti(control, values, emptyCount = 0) { const old = selectedMulti(control); const counts = new Map(); values.filter(Boolean).forEach(v => counts.set(v, (counts.get(v) || 0) + 1)); if (emptyCount) counts.set(EMPTY_VALUE, emptyCount); control.box.textContent = ''; [...counts.keys()].sort((a, b) => labelValue(a).localeCompare(labelValue(b))).forEach(value => { const cb = el('input', { type: 'checkbox' }); cb.value = value; cb.checked = old.has(value); const line = el('label'); line.style.display = 'block'; line.append(cb, text(` ${labelValue(value)} (${counts.get(value)})`)); control.box.append(line); }); updateMultiSummary(control); }

function labelValue(value) { return value === EMPTY_VALUE ? EMPTY_LABEL : value; }

function selectedMulti(control) { return new Set([...control.box.querySelectorAll('input:checked')].map(x => x.value)); }

function updateMultiSummary(control) { const count = selectedMulti(control).size; control.summary.textContent = `${control.title}: ${count ? `已选 ${count}` : '全部'}`; }



export { fillMulti, multiFilter, selectedMulti };

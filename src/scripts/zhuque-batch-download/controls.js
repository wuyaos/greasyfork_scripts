import { el, normalizeInputValue } from './elements.js';



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



export { button, fillMulti, input, multiFilter, rangeField, selectField, selectedMulti, sizeRangeField, unitSelect };

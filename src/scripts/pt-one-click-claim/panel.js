import { state } from './config.js';

import { ensureStyle } from './styles.js';

import { parseItems } from './torrents.js';

import { doClaim, preview } from './claim.js';

import { fillMulti, multiFilter } from './multiselect.js';

import { append, button, el, input, setStatus, text } from './elements.js';



function buildPanel() {
    ensureStyle();
    const box = el('div', { id: 'pt-claim-plus' });
    const head = el('div', { class: 'ptc-head' });
    const body = el('div', { class: 'ptc-body' });
    const filterRow = el('div', { class: 'ptc-row ptc-filter-row' });
    const actionRow = el('div', { class: 'ptc-row' });
    state.ui.keyword = input('claim-keyword', '2160p H265|HEVC -REMUX S01E*', '');
    state.ui.keyword.className = 'ptc-keyword';
    state.ui.sizeMin = input('claim-size-min', '最小', '');
    state.ui.sizeMin.className = 'ptc-size';
    state.ui.sizeMax = input('claim-size-max', '最大', '');
    state.ui.sizeMax.className = 'ptc-size';
    state.ui.client = multiFilter('客户端');
    state.ui.ip = multiFilter('IP');
    state.ui.status = el('span', { class: 'ptc-status' });
    append(head, el('div', { class: 'ptc-title' }), el('div', { class: 'ptc-head-status' }));
    head.firstChild.textContent = 'PT一键认领 Plus';
    head.lastChild.textContent = `已启用 ${state.adapter.name}`;
    append(filterRow, field('关键词', state.ui.keyword), field('体积', state.ui.sizeMin), text('-'), field('', state.ui.sizeMax), text('GB'), state.ui.client.root, state.ui.ip.root);
    append(actionRow, el('div', { class: 'ptc-actions' }), state.ui.status);
    append(actionRow.firstChild, button('刷新筛选', refreshItemsAndOptions), button('检测认领', preview, 'ptc-btn-check'), button('确认认领', doClaim, 'ptc-btn-primary'));
    append(body, filterRow, actionRow);
    append(box, head, body);
    return box;
  }

function field(labelText, control) {
    const wrap = el('label', { class: 'ptc-field' });
    if (labelText) wrap.append(text(labelText));
    wrap.append(control);
    return wrap;
  }

function refreshItemsAndOptions() {
    state.items = parseItems();
    fillMulti(state.ui.ip, state.items.flatMap(x => x.ips), state.items.filter(x => !x.ips.length).length);
    fillMulti(state.ui.client, state.items.flatMap(x => x.clients), state.items.filter(x => !x.clients.length).length);
    setStatus(`已启用 ${state.adapter.name}，可认领 ${state.items.length} 个`);
  }



export { buildPanel, refreshItemsAndOptions };

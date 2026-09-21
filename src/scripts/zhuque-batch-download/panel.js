import { ID, state } from './config.js';

import { actionsRow, refreshOptions } from './selection.js';

import { getRows, loadCfg } from './settings.js';

import { input, multiFilter, rangeField, selectField, sizeRangeField, unitSelect } from './controls.js';

import { ensureStyle } from './styles.js';

import { append, defaultSizeUnit, el, pageIsDark } from './elements.js';



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



export { buildPanel };

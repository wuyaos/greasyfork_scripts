import { ID, TOGGLE_ID, state } from './config.js';

import { refreshTorrents } from './torrents.js';

import { applyFilters, selectVisible } from './filters.js';

import { batchDownload } from './download.js';

import { downloaderSelect, downloaderStatusText, getDownloaders } from './downloader-settings.js';

import { append, button, el, field, input, multiFilter, rangeField, select, selectField, sizeRangeField, unitSelect } from './controls.js';

import { pageIsDark } from './formatting.js';



function buildPanel() {
    if (document.querySelector('#' + ID)) return
    const downloaders = getDownloaders()
    const toggle = el('button', { id: TOGGLE_ID, type: 'button' }, 'PT批量')
    const panel = el('div', { id: ID, class: `ptbd-hidden ${pageIsDark() ? 'ptbd-theme-dark' : 'ptbd-theme-light'}` })
    const body = el('div', { class: 'ptbd-body' })
    const collapse = button('收起 ▲', () => toggleCollapse(body, collapse), 'ptbd-collapse')
    const close = button('×', closePanel, 'ptbd-close')

    state.ui.keyword = input('text', '关键字')
    state.ui.sizeMin = input('number', '最小')
    state.ui.sizeMinUnit = unitSelect('GiB')
    state.ui.sizeMax = input('number', '最大')
    state.ui.sizeMaxUnit = unitSelect('GiB')
    state.ui.seedMin = input('number', '最小')
    state.ui.seedMax = input('number', '最大')
    state.ui.promotion = multiFilter('优惠', [])
    state.ui.seedingStatus = select([['all', '全部'], ['seeding', '做种中'], ['not-seeding', '未做种']], 'all')
    state.ui.delay = input('number', '延迟(ms)', '1200')
    state.ui.status = el('span', { id: 'ptbd-status', class: 'ptbd-status' }, '待扫描')
    state.ui.selectedSize = el('span', { class: 'ptbd-dl-status' }, '未选择')
    state.ui.downloaderSelect = downloaderSelect(downloaders)
    state.ui.downloaderStatus = el('span', { class: 'ptbd-dl-status' }, downloaderStatusText(downloaders.length))
    state.ui.tbody = el('tbody')

    append(body,
      el('div', { class: 'ptbd-filter-groups' },
        el('div', { class: 'ptbd-filter-row ptbd-filter-row-main' },
          field('关键字', state.ui.keyword, 'ptbd-keyword-field'),
          sizeRangeField('体积', state.ui.sizeMin, state.ui.sizeMinUnit, state.ui.sizeMax, state.ui.sizeMaxUnit),
          field('延迟', state.ui.delay)
        ),
        el('div', { class: 'ptbd-filter-row ptbd-filter-row-extra' },
          field('是否做种', state.ui.seedingStatus),
          rangeField('做种数', state.ui.seedMin, state.ui.seedMax),
          selectField('优惠', state.ui.promotion.root)
        )
      ),
      actionsRow(),
      table()
    )

    append(panel,
      el('div', { class: 'ptbd-head' }, el('div', { class: 'ptbd-title' }, 'PT 批量下载种子'), el('div', { class: 'ptbd-head-actions' }, collapse, close)),
      body
    )
    document.body.append(panel, toggle)
    state.ui.panel = panel
    state.ui.toggle = toggle
    toggle.addEventListener('click', () => {
      const hidden = panel.classList.toggle('ptbd-hidden')
      toggle.textContent = hidden ? 'PT批量' : '关闭PT'
      if (!hidden) refreshTorrents()
    })
  }

function actionsRow() {
    state.ui.batchButton = button('下载已选', batchDownload, 'ptbd-btn ptbd-btn-primary')
    return el('div', { class: 'ptbd-actions' },
      button('筛选', () => applyFilters(), 'ptbd-btn ptbd-btn-check'),
      button('全选', () => selectVisible(true), 'ptbd-btn'),
      button('取消全选', () => selectVisible(false), 'ptbd-btn'),
      state.ui.batchButton,
      state.ui.downloaderStatus,
      state.ui.downloaderSelect,
      state.ui.selectedSize,
      state.ui.status
    )
  }

function table() {
    return el('div', { class: 'ptbd-table-wrap' },
      el('table', { class: 'ptbd-table' },
        el('thead', {}, el('tr', {},
          el('th', {}, ''),
          el('th', {}, '标题'),
          el('th', {}, '体积'),
          el('th', {}, '做种'),
          el('th', {}, '优惠'),
          el('th', {}, '已下载'),
          el('th', {}, '下载')
        )),
        state.ui.tbody
      )
    )
  }

function closePanel() {
    state.ui.panel.classList.add('ptbd-hidden')
    state.ui.toggle.textContent = 'PT批量'
  }

function toggleCollapse(body, btn) {
    const closed = body.classList.toggle('ptbd-collapsed')
    btn.textContent = closed ? '展开 ▼' : '收起 ▲'
  }



export { buildPanel };

import { state } from './config.js';

import { downloadTorrent } from './download.js';

import { button, el, fillMulti, selectedMulti } from './controls.js';

import { clean, formatBytes, numberOrNull, setStatus, sizeInputToBytes } from './formatting.js';

// 筛选条件存 sessionStorage：同站翻页/整页刷新保留，关标签页自动清空
const FILTERS_KEY = 'ptbd_filters'


function applyFilters(autoSelect = false) {
    const cfg = readFilters()
    saveFilterState(cfg)
    state.filtered = state.torrents.filter(item => matchFilters(item, cfg))
    const visibleIds = new Set(state.filtered.map(item => item.tid))
    if (autoSelect || !state.selected.size) {
      state.selected = visibleIds
    } else {
      // 保留用户已勾选状态：仅在当前筛选结果内保留命中项，不覆盖手动取消
      state.selected = new Set([...state.selected].filter(tid => visibleIds.has(tid)))
    }
    renderTable()
    setStatus(`当前页 ${state.torrents.length} 个，筛选 ${state.filtered.length} 个`)
  }

function readFilters() {
    return {
      keyword: clean(state.ui.keyword.value).toLowerCase(),
      sizeMin: sizeInputToBytes(state.ui.sizeMin.value, state.ui.sizeMinUnit.value),
      sizeMax: sizeInputToBytes(state.ui.sizeMax.value, state.ui.sizeMaxUnit.value),
      seedMin: numberOrNull(state.ui.seedMin.value),
      seedMax: numberOrNull(state.ui.seedMax.value),
      promotions: selectedMulti(state.ui.promotion),
      seedingStatus: state.ui.seedingStatus.value
    }
  }

// 保存原始输入值（体积带单位），恢复时直接回填控件
function saveFilterState(cfg) {
    try {
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify({
        keyword: cfg.keyword,
        sizeMin: state.ui.sizeMin.value,
        sizeMinUnit: state.ui.sizeMinUnit.value,
        sizeMax: state.ui.sizeMax.value,
        sizeMaxUnit: state.ui.sizeMaxUnit.value,
        seedMin: state.ui.seedMin.value,
        seedMax: state.ui.seedMax.value,
        promotions: cfg.promotions,
        seedingStatus: cfg.seedingStatus
      }))
    } catch (error) {}
  }

// 面板构建后回填上次筛选输入；优惠多选在 refreshTorrents 时按 state.savedPromotions 恢复一次
function restoreFilters() {
    let saved = null
    try { saved = JSON.parse(sessionStorage.getItem(FILTERS_KEY) || 'null') } catch (error) {}
    if (!saved || typeof saved !== 'object') return false
    state.ui.keyword.value = saved.keyword || ''
    state.ui.sizeMin.value = saved.sizeMin || ''
    state.ui.sizeMinUnit.value = saved.sizeMinUnit || 'GiB'
    state.ui.sizeMax.value = saved.sizeMax || ''
    state.ui.sizeMaxUnit.value = saved.sizeMaxUnit || 'GiB'
    state.ui.seedMin.value = saved.seedMin == null ? '' : saved.seedMin
    state.ui.seedMax.value = saved.seedMax == null ? '' : saved.seedMax
    state.ui.seedingStatus.value = saved.seedingStatus || 'all'
    if (Array.isArray(saved.promotions) && saved.promotions.length) state.savedPromotions = saved.promotions
    return true
  }

function resetFilters() {
    try { sessionStorage.removeItem(FILTERS_KEY) } catch (error) {}
    state.savedPromotions = null
    state.ui.keyword.value = ''
    state.ui.sizeMin.value = ''
    state.ui.sizeMinUnit.value = 'GiB'
    state.ui.sizeMax.value = ''
    state.ui.sizeMaxUnit.value = 'GiB'
    state.ui.seedMin.value = ''
    state.ui.seedMax.value = ''
    state.ui.seedingStatus.value = 'all'
    fillMulti(state.ui.promotion, [], [])
    applyFilters(true)
    setStatus('筛选已重置')
  }

function matchFilters(item, cfg) {
    if (cfg.keyword && !item.title.toLowerCase().includes(cfg.keyword)) return false
    if (cfg.sizeMin != null && (item.sizeBytes == null || item.sizeBytes < cfg.sizeMin)) return false
    if (cfg.sizeMax != null && (item.sizeBytes == null || item.sizeBytes > cfg.sizeMax)) return false
    if (cfg.seedMin != null && (item.seeders == null || item.seeders < cfg.seedMin)) return false
    if (cfg.seedMax != null && (item.seeders == null || item.seeders > cfg.seedMax)) return false
    if (cfg.promotions.length && !item.promotion.some(tag => cfg.promotions.includes(tag))) return false
    if (cfg.seedingStatus === 'seeding' && item.downloaded !== true) return false
    if (cfg.seedingStatus === 'not-seeding' && item.downloaded !== false) return false
    return true
  }

function renderTable() {
    state.ui.tbody.textContent = ''
    updateSelectedSize()
    if (!state.filtered.length) {
      state.ui.tbody.append(el('tr', {}, el('td', { colspan: '7', class: 'ptbd-empty' }, '无匹配种子')))
      return
    }
    state.filtered.forEach(item => {
      const checkbox = el('input', { type: 'checkbox' })
      checkbox.checked = state.selected.has(item.tid)
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.selected.add(item.tid)
        else state.selected.delete(item.tid)
        updateSelectedSize()
      })
      const download = button('下载', () => downloadTorrent(item), 'ptbd-mini')
      state.ui.tbody.append(el('tr', {},
        el('td', {}, checkbox),
        el('td', {}, item.detailUrl ? el('a', { href: item.detailUrl, target: '_blank', rel: 'noopener' }, item.title) : item.title),
        el('td', {}, item.sizeBytes ? formatBytes(item.sizeBytes) : item.size),
        el('td', {}, item.seeders == null ? '-' : String(item.seeders)),
        el('td', {}, item.promotion.length ? item.promotion.join(' + ') : '普通'),
        el('td', {}, item.downloaded ? '是' : '否'),
        el('td', {}, download)
      ))
    })
  }

function selectVisible(checked) {
    state.selected = checked ? new Set(state.filtered.map(item => item.tid)) : new Set()
    renderTable()
    setStatus(checked ? `已全选 ${state.selected.size} 个` : '已取消全选')
  }

function updateSelectedSize() {
    if (!state.ui.selectedSize) return
    const selected = state.filtered.filter(item => state.selected.has(item.tid))
    const totalBytes = selected.reduce((sum, item) => sum + (item.sizeBytes || 0), 0)
    state.ui.selectedSize.textContent = selected.length
      ? `已选 ${selected.length} 个 · ${formatBytes(totalBytes)}`
      : '未选择'
  }



export { applyFilters, resetFilters, restoreFilters, selectVisible };

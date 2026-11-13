import { DEFAULT_PUSH, PUSH_CONFIGS_KEY, state } from './config.js';

import { button, el, field, input } from './controls.js';

import { clean, setStatus, uniqueId } from './formatting.js';

import { ensureStyle } from './styles.js';



// 推送配置与下载器(连接)配置分离存储：一份推送配置绑定一个下载器，携带分类/标签/保存路径/autoTMM 等推送参数。
// 入口在「下载器设置」弹窗内：选中下载器后新增/编辑其推送配置。
function openPushEditor(downloader, cfg, onDone) {
    ensureStyle()
    const item = { ...DEFAULT_PUSH, ...(cfg || {}), id: cfg?.id || '', downloaderId: downloader.id }
    document.querySelector('#ptbd-push-modal')?.remove()
    const overlay = el('div', { id: 'ptbd-push-modal', class: 'ptbd-modal' })
    const close = button('×', () => overlay.remove(), 'ptbd-close')
    const body = el('div', { class: 'ptbd-dl-modal-body' })
    const box = el('div', { class: 'ptbd-modal-box' },
      el('div', { class: 'ptbd-modal-head' }, el('strong', {}, `推送配置 - ${downloader.name || downloader.host}`), close),
      body
    )
    const pushName = input('text', '显示名称', item.name)
    const qbCategory = input('text', 'Category', item.qbCategory)
    const qbTags = input('text', 'Tags, comma separated', item.qbTags)
    const qbSavePath = input('text', 'Save path', item.qbSavePath)
    const qbAutoTMM = el('input', { type: 'checkbox' })
    qbAutoTMM.checked = !!item.qbAutoTMM
    const trDownloadDir = input('text', 'Download dir', item.trDownloadDir)
    const trLabels = input('text', 'Labels, comma separated', item.trLabels)
    const errorBox = el('div', { class: 'ptbd-form-errors' })
    const isQb = downloader.type === 'qb'
    const qbRows = [el('div', { class: 'ptbd-section-title' }, 'qBittorrent'), field('分类', qbCategory), field('标签', qbTags), field('保存路径', qbSavePath),
      el('div', { class: 'ptbd-field' }, el('label', {}, '自动管理'), el('label', { style: 'display:flex;align-items:center;gap:6px;text-align:left' }, qbAutoTMM, el('span', {}, 'autoTMM（交给 qB 自动管理种子，勾选后保存路径仅作初始值）')))]
    const trRows = [el('div', { class: 'ptbd-section-title' }, 'Transmission'), field('下载目录', trDownloadDir), field('标签', trLabels)]
    const save = button('保存', () => {
      if (!clean(pushName.value)) {
        errorBox.textContent = ''
        errorBox.append(el('div', {}, '名称不能为空'))
        return
      }
      const saved = {
        id: item.id || uniqueId(),
        name: clean(pushName.value),
        downloaderId: downloader.id,
        qbCategory: clean(qbCategory.value),
        qbTags: clean(qbTags.value),
        qbSavePath: clean(qbSavePath.value),
        qbAutoTMM: qbAutoTMM.checked,
        trDownloadDir: clean(trDownloadDir.value),
        trLabels: clean(trLabels.value)
      }
      const list = getPushConfigs()
      const index = list.findIndex(old => String(old.id) === String(saved.id))
      if (index >= 0) list[index] = saved
      else list.push(saved)
      savePushConfigs(list)
      state.selectedPushId = saved.id
      updatePushStatus()
      setStatus('推送配置已保存')
      overlay.remove()
      onDone?.()
    }, 'ptbd-btn ptbd-btn-check')
    const cancel = button('取消', () => overlay.remove(), 'ptbd-btn')
    body.append(
      el('div', { class: 'ptbd-dl-form' },
        field('名称', pushName),
        ...(isQb ? qbRows : trRows),
        errorBox,
        el('div', { class: 'ptbd-actions' }, cancel, save)
      )
    )
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove() })
    overlay.append(box)
    document.body.append(overlay)
  }

function getPushConfigs() {
    let list = []
    try { list = GM_getValue(PUSH_CONFIGS_KEY, []) } catch (error) {}
    if (!Array.isArray(list)) return []
    let changed = false
    const normalized = list.map(item => {
      const cfg = { ...DEFAULT_PUSH, ...(item && typeof item === 'object' ? item : {}) }
      if (!cfg.id) {
        cfg.id = uniqueId()
        changed = true
      }
      return cfg
    }).filter(item => item.id)
    if (changed) GM_setValue(PUSH_CONFIGS_KEY, normalized)
    return normalized
  }

function savePushConfigs(list) {
    GM_setValue(PUSH_CONFIGS_KEY, Array.isArray(list) ? list : [])
  }

function getPushById(id) {
    if (!id) return null
    return getPushConfigs().find(item => String(item.id) === String(id)) || null
  }

function pushStatusText(count) {
    return count ? '推送:' : '推送: 无'
  }

// 面板推送下拉：只显示当前选中下载器的推送配置
function pushSelect() {
    const sel = select([['', '无(默认推送)'], ...pushOptions(state.selectedDownloaderId)], state.selectedPushId)
    sel.className = 'ptbd-dl-select'
    sel.addEventListener('change', () => {
      state.selectedPushId = sel.value
      updatePushStatus()
    })
    return sel
  }

function pushOptions(downloaderId) {
    return getPushConfigs()
      .filter(item => String(item.downloaderId) === String(downloaderId))
      .map(item => [item.id, item.name || '(未命名)'])
  }

function updatePushStatus() {
    const pushConfigs = getPushConfigs()
    if (state.selectedPushId) {
      const current = pushConfigs.find(item => String(item.id) === String(state.selectedPushId))
      if (!current || String(current.downloaderId) !== String(state.selectedDownloaderId)) state.selectedPushId = ''
    }
    if (state.ui.pushStatus) state.ui.pushStatus.textContent = pushStatusText(pushConfigs.filter(item => String(item.downloaderId) === String(state.selectedDownloaderId)).length)
    if (state.ui.pushSelect) {
      const value = state.selectedPushId
      state.ui.pushSelect.textContent = ''
      state.ui.pushSelect.append(el('option', { value: '' }, '无(默认推送)'))
      pushOptions(state.selectedDownloaderId).forEach(([id, text]) => state.ui.pushSelect.append(el('option', { value: id }, text)))
      state.ui.pushSelect.value = value
    }
  }

function select(options, value) {
    const node = el('select')
    options.forEach(([val, text]) => {
      const opt = el('option', { value: val }, text)
      if (val === value) opt.selected = true
      node.append(opt)
    })
    return node
  }

export { getPushById, getPushConfigs, openPushEditor, pushSelect, pushStatusText, savePushConfigs, updatePushStatus };

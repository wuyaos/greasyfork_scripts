import { DEFAULT_PUSH, PUSH_CONFIGS_KEY, state } from './config.js';

import { getDownloaders } from './downloader-settings.js';

import { button, el, field, input, select } from './controls.js';

import { clean, setStatus, uniqueId } from './formatting.js';

import { ensureStyle } from './styles.js';



// 推送配置与下载器(连接)配置分离存储：一份推送配置绑定一个下载器，携带分类/标签/保存路径/autoTMM 等推送参数。
function configPush() {
    ensureStyle()
    document.querySelector('#ptbd-push-modal')?.remove()
    const overlay = el('div', { id: 'ptbd-push-modal', class: 'ptbd-modal' })
    const close = button('×', () => overlay.remove(), 'ptbd-close')
    const body = el('div', { class: 'ptbd-dl-modal-body' })
    const box = el('div', { class: 'ptbd-modal-box' },
      el('div', { class: 'ptbd-modal-head' }, el('strong', {}, '推送配置'), close),
      body
    )
    const renderList = () => {
      body.textContent = ''
      const list = getPushConfigs()
      if (!list.length) body.append(el('div', { class: 'ptbd-empty' }, '暂无推送配置'))
      list.forEach(cfg => {
        const downloader = getDownloaders().find(item => String(item.id) === String(cfg.downloaderId))
        const edit = button('编辑', () => renderEditor(cfg), 'ptbd-btn')
        const del = button('删除', () => {
          if (!confirm(`删除推送配置：${cfg.name || '(未命名)'}？`)) return
          savePushConfigs(getPushConfigs().filter(item => item.id !== cfg.id))
          if (state.selectedPushId === cfg.id) state.selectedPushId = ''
          updatePushStatus()
          renderList()
        }, 'ptbd-btn ptbd-danger')
        body.append(el('div', { class: 'ptbd-site-item' },
          el('span', {}, `${cfg.name || '(未命名)'} / ${downloader?.name || downloader?.host || '未绑定下载器'}${cfg.qbAutoTMM ? ' / autoTMM' : ''}`),
          el('div', { class: 'ptbd-actions' }, edit, del)
        ))
      })
      body.append(el('div', { class: 'ptbd-actions' }, button('添加推送配置', () => renderEditor(), 'ptbd-btn ptbd-btn-check')))
    }
    const renderEditor = cfg => {
      const item = { ...DEFAULT_PUSH, ...(cfg || {}), id: cfg?.id || '' }
      const pushName = input('text', '显示名称', item.name)
      const dlSelect = select([['', '未绑定'], ...getDownloaders().map(d => [d.id, d.name || d.host || (d.type === 'tr' ? 'Transmission' : 'qBittorrent')])], item.downloaderId)
      const qbCategory = input('text', 'Category', item.qbCategory)
      const qbTags = input('text', 'Tags, comma separated', item.qbTags)
      const qbSavePath = input('text', 'Save path', item.qbSavePath)
      const qbAutoTMM = el('input', { type: 'checkbox' })
      qbAutoTMM.checked = !!item.qbAutoTMM
      const trDownloadDir = input('text', 'Download dir', item.trDownloadDir)
      const trLabels = input('text', 'Labels, comma separated', item.trLabels)
      const errorBox = el('div', { class: 'ptbd-form-errors' })
      const qbRows = [el('div', { class: 'ptbd-section-title' }, 'qBittorrent'), field('分类', qbCategory), field('标签', qbTags), field('保存路径', qbSavePath),
        el('div', { class: 'ptbd-field' }, el('label', {}, '自动管理'), el('label', { style: 'display:flex;align-items:center;gap:6px;text-align:left' }, qbAutoTMM, el('span', {}, 'autoTMM（交给 qB 自动管理种子，勾选后保存路径仅作初始值）')))]
      const trRows = [el('div', { class: 'ptbd-section-title' }, 'Transmission'), field('下载目录', trDownloadDir), field('标签', trLabels)]
      const setTypeFields = () => {
        const downloader = getDownloaders().find(d => String(d.id) === String(dlSelect.value))
        const type = downloader?.type
        qbRows.forEach(row => { row.style.display = type === 'qb' ? '' : 'none' })
        trRows.forEach(row => { row.style.display = type === 'tr' ? '' : 'none' })
      }
      const validate = () => {
        const errors = []
        if (!clean(pushName.value)) errors.push('名称不能为空')
        if (!clean(dlSelect.value)) errors.push('请绑定下载器（可在「下载器设置」中创建）')
        errorBox.textContent = ''
        errors.forEach(message => errorBox.append(el('div', {}, message)))
        return !errors.length
      }
      const currentConfig = () => ({
        id: item.id,
        name: clean(pushName.value),
        downloaderId: clean(dlSelect.value),
        qbCategory: clean(qbCategory.value),
        qbTags: clean(qbTags.value),
        qbSavePath: clean(qbSavePath.value),
        qbAutoTMM: qbAutoTMM.checked,
        trDownloadDir: clean(trDownloadDir.value),
        trLabels: clean(trLabels.value)
      })
      const save = button('保存', () => {
        if (!validate()) return
        const saved = currentConfig()
        if (!saved.id) saved.id = uniqueId()
        item.id = saved.id
        const list = getPushConfigs()
        const index = list.findIndex(old => String(old.id) === String(saved.id))
        if (index >= 0) list[index] = saved
        else list.push(saved)
        savePushConfigs(list)
        state.selectedPushId = saved.id
        updatePushStatus()
        setStatus('推送配置已保存')
        renderList()
      }, 'ptbd-btn ptbd-btn-check')
      const cancel = button('取消', renderList, 'ptbd-btn')
      dlSelect.addEventListener('change', setTypeFields)
      body.textContent = ''
      body.append(
        el('div', { class: 'ptbd-dl-form' },
          field('名称', pushName),
          field('下载器', dlSelect),
          qbRows,
          trRows,
          errorBox,
          el('div', { class: 'ptbd-actions' }, cancel, save)
        )
      )
      setTypeFields()
    }
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove() })
    overlay.append(box)
    document.body.append(overlay)
    renderList()
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

function pushSelect(pushConfigs) {
    const sel = select([['', '无(默认推送)'], ...pushConfigs.map(item => [item.id, item.name || '(未命名)'])], state.selectedPushId)
    sel.className = 'ptbd-dl-select'
    sel.addEventListener('change', () => {
      state.selectedPushId = sel.value
      updatePushStatus()
    })
    return sel
  }

function updatePushStatus() {
    const pushConfigs = getPushConfigs()
    if (state.selectedPushId && !pushConfigs.some(item => String(item.id) === String(state.selectedPushId))) state.selectedPushId = ''
    if (state.ui.pushStatus) state.ui.pushStatus.textContent = pushStatusText(pushConfigs.length)
    if (state.ui.pushSelect) {
      const value = state.selectedPushId
      state.ui.pushSelect.textContent = ''
      state.ui.pushSelect.append(el('option', { value: '' }, '无(默认推送)'))
      pushConfigs.forEach(item => state.ui.pushSelect.append(el('option', { value: item.id }, item.name || '(未命名)')))
      state.ui.pushSelect.value = value
    }
  }



export { configPush, getPushById, getPushConfigs, pushSelect, pushStatusText, savePushConfigs, updatePushStatus };

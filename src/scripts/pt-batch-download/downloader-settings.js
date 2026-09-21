import { DEFAULT_DL, DOWNLOADERS_KEY, state } from './config.js';

import { testDownloaderConnection } from './downloaders.js';

import { button, el, field, input, select } from './controls.js';

import { clean, setStatus, uniqueId } from './formatting.js';

import { ensureStyle } from './styles.js';



function configDownloader() {
    ensureStyle()
    document.querySelector('#ptbd-dl-modal')?.remove()
    const overlay = el('div', { id: 'ptbd-dl-modal', class: 'ptbd-modal' })
    const close = button('×', () => overlay.remove(), 'ptbd-close')
    const body = el('div', { class: 'ptbd-dl-modal-body' })
    const box = el('div', { class: 'ptbd-modal-box' },
      el('div', { class: 'ptbd-modal-head' }, el('strong', {}, '下载器设置'), close),
      body
    )
    const renderList = () => {
      body.textContent = ''
      const list = getDownloaders()
      if (!list.length) body.append(el('div', { class: 'ptbd-empty' }, '暂无下载器'))
      list.forEach(cfg => {
        const edit = button('编辑', () => renderEditor(cfg), 'ptbd-btn')
        const del = button('删除', () => {
          if (!confirm(`删除下载器：${cfg.name || cfg.host || (cfg.type === 'tr' ? 'Transmission' : 'qBittorrent')}？`)) return
          saveDownloaders(getDownloaders().filter(item => item.id !== cfg.id))
          if (state.selectedDownloaderId === cfg.id) state.selectedDownloaderId = ''
          updateDownloaderStatus()
          renderList()
        }, 'ptbd-btn ptbd-danger')
        body.append(el('div', { class: 'ptbd-site-item' },
          el('span', {}, `${cfg.name || '(未命名)'} / ${cfg.type === 'tr' ? 'Transmission' : 'qBittorrent'} / ${cfg.host || '-'}`),
          el('div', { class: 'ptbd-actions' }, edit, del)
        ))
      })
      body.append(el('div', { class: 'ptbd-actions' }, button('添加下载器', () => renderEditor(), 'ptbd-btn ptbd-btn-check')))
    }
    const renderEditor = cfg => {
      const item = { ...DEFAULT_DL, ...(cfg || {}), id: cfg?.id || '', type: cfg?.type || 'qb' }
      const dlName = input('text', '显示名称', item.name)
      const dlType = select([['qb', 'qBittorrent'], ['tr', 'Transmission']], item.type)
      const dlHost = input('text', 'http://127.0.0.1:8080', item.host)
      const dlUsername = input('text', 'Username', item.username)
      const dlPassword = input('password', 'Password', item.password)
      const qbCategory = input('text', 'Category', item.qbCategory)
      const qbTags = input('text', 'Tags, comma separated', item.qbTags)
      const qbSavePath = input('text', 'Save path', item.qbSavePath)
      const trDownloadDir = input('text', 'Download dir', item.trDownloadDir)
      const trLabels = input('text', 'Labels, comma separated', item.trLabels)
      const errorBox = el('div', { class: 'ptbd-form-errors' })
      const testStatus = el('span', { class: 'ptbd-test-status' })
      const qbRows = [el('div', { class: 'ptbd-section-title' }, 'qBittorrent'), field('分类', qbCategory), field('标签', qbTags), field('保存路径', qbSavePath)]
      const trRows = [el('div', { class: 'ptbd-section-title' }, 'Transmission'), field('下载目录', trDownloadDir), field('标签', trLabels)]
      const fillName = () => {
        if (clean(dlName.value) || !clean(dlHost.value)) return
        dlName.value = `${dlType.value === 'qb' ? 'qBittorrent' : 'Transmission'} ${clean(dlHost.value)}`
      }
      const setTypeFields = () => {
        qbRows.forEach(row => { row.style.display = dlType.value === 'qb' ? '' : 'none' })
        trRows.forEach(row => { row.style.display = dlType.value === 'tr' ? '' : 'none' })
        fillName()
      }
      const validate = () => {
        const errors = []
        fillName()
        if (!clean(dlName.value)) errors.push('名称不能为空')
        if (!clean(dlHost.value)) errors.push('Host 不能为空')
        else if (!/^https?:\/\//i.test(clean(dlHost.value))) errors.push('Host 必须以 http:// 或 https:// 开头')
        errorBox.textContent = ''
        errors.forEach(message => errorBox.append(el('div', {}, message)))
        return !errors.length
      }
      const currentConfig = () => ({
        id: item.id,
        name: clean(dlName.value),
        type: dlType.value,
        host: clean(dlHost.value),
        username: clean(dlUsername.value),
        password: dlPassword.value,
        qbCategory: clean(qbCategory.value),
        qbTags: clean(qbTags.value),
        qbSavePath: clean(qbSavePath.value),
        trDownloadDir: clean(trDownloadDir.value),
        trLabels: clean(trLabels.value)
      })
      const test = button('测试连接', async () => {
        testStatus.textContent = '测试中...'
        if (!validate()) {
          testStatus.textContent = '请先修正配置'
          return
        }
        try {
          await testDownloaderConnection(currentConfig())
          testStatus.textContent = '连接成功'
        } catch (error) {
          testStatus.textContent = `连接失败：${error.message || error}`
        }
      }, 'ptbd-btn')
      const save = button('保存', () => {
        if (!validate()) return
        const saved = currentConfig()
        if (!saved.id) saved.id = uniqueId()
        item.id = saved.id
        const list = getDownloaders()
        const index = list.findIndex(old => String(old.id) === String(saved.id))
        if (index >= 0) list[index] = saved
        else list.push(saved)
        saveDownloaders(list)
        state.selectedDownloaderId = saved.id
        updateDownloaderStatus()
        setStatus('下载器设置已保存')
        renderList()
      }, 'ptbd-btn ptbd-btn-check')
      const cancel = button('取消', renderList, 'ptbd-btn')
      dlType.addEventListener('change', setTypeFields)
      dlHost.addEventListener('blur', fillName)
      body.textContent = ''
      body.append(
        el('div', { class: 'ptbd-dl-form' },
          field('名称', dlName),
          field('类型', dlType),
          field('Host', dlHost),
          field('用户名', dlUsername),
          field('密码', dlPassword),
          qbRows,
          trRows,
          errorBox,
          el('div', { class: 'ptbd-actions' }, cancel, test, testStatus, save)
        )
      )
      setTypeFields()
    }
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove() })
    overlay.append(box)
    document.body.append(overlay)
    renderList()
  }

function getDownloaders() {
    let list = []
    try { list = GM_getValue(DOWNLOADERS_KEY, []) } catch (error) {}
    if (!Array.isArray(list)) return []
    let changed = false
    const normalized = list.map(item => {
      const cfg = { ...DEFAULT_DL, ...(item && typeof item === 'object' ? item : {}) }
      if (!cfg.id) {
        cfg.id = uniqueId()
        changed = true
      }
      return cfg
    }).filter(item => item.id && (item.type === 'qb' || item.type === 'tr'))
    if (changed) GM_setValue(DOWNLOADERS_KEY, normalized)
    return normalized
  }

function saveDownloaders(list) {
    GM_setValue(DOWNLOADERS_KEY, Array.isArray(list) ? list : [])
  }

function getDownloaderById(id) {
    if (!id) return null
    return getDownloaders().find(item => String(item.id) === String(id)) || null
  }

function downloaderStatusText(count) {
    return count ? '下载器:' : '下载器: 无'
  }

function downloaderSelect(downloaders) {
    const sel = select([['', '无(浏览器下载)'], ...downloaders.map(item => [item.id, item.name || item.host || (item.type === 'tr' ? 'Transmission' : 'qBittorrent')])], state.selectedDownloaderId)
    sel.className = 'ptbd-dl-select'
    sel.addEventListener('change', () => {
      state.selectedDownloaderId = sel.value
      updateDownloaderStatus()
    })
    return sel
  }

function updateDownloaderStatus() {
    const downloaders = getDownloaders()
    if (state.selectedDownloaderId && !downloaders.some(item => String(item.id) === String(state.selectedDownloaderId))) state.selectedDownloaderId = ''
    if (state.ui.downloaderStatus) state.ui.downloaderStatus.textContent = downloaderStatusText(downloaders.length)
    if (state.ui.downloaderSelect) {
      const value = state.selectedDownloaderId
      state.ui.downloaderSelect.textContent = ''
      state.ui.downloaderSelect.append(el('option', { value: '' }, '无(浏览器下载)'))
      downloaders.forEach(item => state.ui.downloaderSelect.append(el('option', { value: item.id }, item.name || item.host || (item.type === 'tr' ? 'Transmission' : 'qBittorrent'))))
      state.ui.downloaderSelect.value = value
    }
    if (state.ui.batchButton) state.ui.batchButton.textContent = state.selectedDownloaderId ? '推送已选' : '下载已选'
  }



export { configDownloader, downloaderSelect, downloaderStatusText, getDownloaderById, getDownloaders };

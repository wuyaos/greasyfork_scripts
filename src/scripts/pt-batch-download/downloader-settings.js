import { DEFAULT_DL, DOWNLOADERS_KEY, state } from './config.js';

import { testDownloaderConnection } from './downloaders.js';

import { button, el, field, input, modal, select } from './controls.js';

import { getPushConfigs, openPushEditor, savePushConfigs, updatePushStatus } from './push-settings.js';

import { clean, setStatus, uniqueId } from './formatting.js';

import { ensureStyle } from './styles.js';



function pushSummary(dl, push) {
    return (dl.type === 'tr'
      ? [push.trDownloadDir && `目录 ${push.trDownloadDir}`, push.trLabels && `标签 ${push.trLabels}`]
      : [push.qbCategory && `分类 ${push.qbCategory}`, push.qbTags && `标签 ${push.qbTags}`, push.qbSavePath && `路径 ${push.qbSavePath}`, `自动管理 ${push.qbAutoTMM ? '开' : '关'}`])
      .filter(Boolean).join(' · ') || '使用下载器默认参数'
  }
function configDownloader() {
    ensureStyle()
    const { body } = modal('ptbd-dl-modal', '下载器与推送设置')
    const renderList = () => {
      body.textContent = ''
      updateDownloaderStatus()
      body.append(el('div', { class: 'ptbd-card-head' }, el('span', { class: 'ptbd-muted' }, '推送配置归属于下载器；面板一次选择完整下载目标。'), button('＋ 添加下载器', () => renderEditor(), 'ptbd-btn ptbd-btn-check')))
      const list = getDownloaders()
      if (!list.length) body.append(el('div', { class: 'ptbd-empty' }, '暂无下载器'))
      list.forEach(cfg => {
        const pushConfigs = getPushConfigs().filter(item => String(item.downloaderId) === String(cfg.id))
        const edit = button('编辑连接', () => renderEditor(cfg), 'ptbd-btn')
        const testStatus = el('span', { class: 'ptbd-test-status', role: 'status' })
        const test = button('测试连接', async () => {
          test.disabled = true
          testStatus.textContent = '测试中…'
          try {
            await testDownloaderConnection(cfg)
            testStatus.textContent = '连接成功'
          } catch (error) { testStatus.textContent = `连接失败：${error.message || error}` }
          finally { test.disabled = false }
        })
        const addPush = button('添加推送配置', () => openPushEditor(cfg, null, renderList), 'ptbd-btn ptbd-btn-check')
        const del = button('删除', () => {
          if (!confirm(`删除下载器及其 ${pushConfigs.length} 份推送配置：${cfg.name || cfg.host}？`)) return
          saveDownloaders(getDownloaders().filter(item => item.id !== cfg.id))
          savePushConfigs(getPushConfigs().filter(item => String(item.downloaderId) !== String(cfg.id)))
          if (state.selectedDownloaderId === cfg.id) state.selectedDownloaderId = ''
          updateDownloaderStatus()
          renderList()
        }, 'ptbd-btn ptbd-danger')
        const pushRows = pushConfigs.length
          ? pushConfigs.map(push => {
            const editPush = button('编辑', () => openPushEditor(cfg, push, renderList), 'ptbd-btn')
            const deletePush = button('删除', () => {
              if (!confirm(`删除推送配置：${push.name || '(未命名)'}？`)) return
              savePushConfigs(getPushConfigs().filter(item => String(item.id) !== String(push.id)))
              if (String(state.selectedPushId) === String(push.id)) state.selectedPushId = ''
              renderList()
            }, 'ptbd-btn ptbd-danger')
            return el('div', { class: 'ptbd-push-row' },
              el('div', { class: 'ptbd-config-info' }, el('strong', {}, push.name || '(未命名)'), el('div', { class: 'ptbd-muted' }, pushSummary(cfg, push))),
              el('div', { class: 'ptbd-actions' }, editPush, deletePush))
          })
          : [el('span', { class: 'ptbd-muted' }, '暂无推送配置')]
        body.append(el('section', { class: 'ptbd-config-card' },
          el('div', { class: 'ptbd-card-head' }, el('div', { class: 'ptbd-config-info' },
            el('strong', {}, cfg.name || '(未命名)'), el('span', { class: 'ptbd-badge' }, cfg.type === 'tr' ? 'Transmission' : 'qBittorrent'),
            el('div', { class: 'ptbd-muted' }, cfg.host || '-')),
            el('div', { class: 'ptbd-actions' }, edit, test, del)),
          testStatus,
          el('div', { class: 'ptbd-push-group' },
            el('div', { class: 'ptbd-card-head' }, el('strong', {}, `推送配置 · ${pushConfigs.length}`), addPush), ...pushRows)
        ))
      })
    }
    const renderEditor = cfg => {
      const item = { ...DEFAULT_DL, ...(cfg || {}), id: cfg?.id || '', type: cfg?.type || 'qb' }
      const dlName = input('text', '显示名称', item.name)
      const dlType = select([['qb', 'qBittorrent'], ['tr', 'Transmission']], item.type)
      const dlHost = input('text', 'http://127.0.0.1:8080', item.host)
      const dlUsername = input('text', 'Username', item.username)
      const dlPassword = input('password', 'Password', item.password)
      const errorBox = el('div', { class: 'ptbd-form-errors' })
      const testStatus = el('span', { class: 'ptbd-test-status' })
      const fillName = () => {
        if (clean(dlName.value) || !clean(dlHost.value)) return
        dlName.value = `${dlType.value === 'qb' ? 'qBittorrent' : 'Transmission'} ${clean(dlHost.value)}`
      }
      const setTypeFields = () => {
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
        password: dlPassword.value
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
          errorBox,
          el('div', { class: 'ptbd-actions' }, cancel, test, testStatus, save)
        )
      )
      setTypeFields()
    }
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

function targetOptions(downloaders) {
    const pushes = getPushConfigs()
    return [['', '浏览器下载'], ...downloaders.flatMap(dl => {
      const name = dl.name || dl.host || (dl.type === 'tr' ? 'Transmission' : 'qBittorrent')
      return [[JSON.stringify([String(dl.id), '']), name + ' - 默认推送'],
        ...pushes.filter(push => String(push.downloaderId) === String(dl.id))
          .map(push => [JSON.stringify([String(dl.id), String(push.id)]), name + ' - ' + (push.name || '(未命名)')])]
    })]
  }

function downloaderSelect(downloaders) {
    const value = state.selectedDownloaderId ? JSON.stringify([String(state.selectedDownloaderId), String(state.selectedPushId || '')]) : ''
    const sel = select(targetOptions(downloaders), value)
    sel.className = 'ptbd-dl-select'
    sel.setAttribute('aria-label', '下载目标（下载器 - 推送配置）')
    sel.addEventListener('change', () => {
      const [downloaderId, pushId] = sel.value ? JSON.parse(sel.value) : ['', '']
      state.selectedDownloaderId = downloaderId
      state.selectedPushId = pushId
      updateDownloaderStatus()
    })
    return sel
  }

function updateDownloaderStatus() {
    const downloaders = getDownloaders()
    if (!downloaders.some(item => String(item.id) === String(state.selectedDownloaderId))) state.selectedDownloaderId = ''
    updatePushStatus()
    if (state.ui.downloaderSelect) {
      const sel = state.ui.downloaderSelect
      sel.textContent = ''
      targetOptions(downloaders).forEach(([value, text]) => sel.append(el('option', { value }, text)))
      sel.value = state.selectedDownloaderId ? JSON.stringify([String(state.selectedDownloaderId), String(state.selectedPushId || '')]) : ''
    }
    if (state.ui.batchButton) state.ui.batchButton.textContent = state.selectedDownloaderId ? '推送已选' : '下载已选'
  }



export { configDownloader, downloaderSelect, downloaderStatusText, getDownloaderById, getDownloaders };

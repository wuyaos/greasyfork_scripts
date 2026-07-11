// ==UserScript==
// @name         PT 批量下载种子
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.2.0
// @description  通用 PT 当前页批量下载工具，支持关键字/体积/做种数/优惠多选筛选、浏览器直下(zip打包)、qBittorrent/Transmission 推送。
// @author       wuyaos & AI
// @match        https://*/*.php*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
// @noframes
// @license      MIT
// @downloadURL  https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_BatchDownload.user.js
// @updateURL    https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_BatchDownload.user.js
// ==/UserScript==

(function () {
  'use strict'

  const ID = 'ptbd-panel'
  const TOGGLE_ID = 'ptbd-toggle'
  const CUSTOM_SITES_KEY = 'ptbd_custom_sites'
  const DOWNLOADER_KEY = 'ptbd_downloader'
  const DOWNLOADERS_KEY = 'ptbd_downloaders'
  const DEFAULT_PATHS = ['/userdetails.php', '/torrents.php', '/special.php']
  const DEFAULT_DL = { id: '', name: '', type: 'qb', host: '', username: '', password: '', qbCategory: '', qbTags: '', qbSavePath: '', trDownloadDir: '', trLabels: '' }
  const UNIT_BYTES = { kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 }
  const SIZE_UNITS = ['GiB', 'MiB', 'KiB', 'TiB']
  const PROMOTIONS = [
    ['all', '全部'],
    ['normal', '普通'],
    ['free', '免费'],
    ['2up', '2X'],
    ['free2up', '2X免费'],
    ['50down', '50%'],
    ['50down2up', '2X 50%'],
    ['30down', '30%']
  ]
  const state = { torrents: [], filtered: [], selected: new Set(), selectedDownloaderId: '', isDownloading: false, ui: {}, filter: { delay: 1200 } }

  registerMenus()
  if (!shouldRun()) return
  start()

  function registerMenus() {
    GM_registerMenuCommand('添加站点', addSite)
    GM_registerMenuCommand('页面管理', manageSites)
    GM_registerMenuCommand('下载器设置', configDownloader)
  }

  function shouldRun() {
    return isDefaultPath() || getCustomSites().some(pattern => matchPattern(pattern, location.href))
  }

  function isDefaultPath() {
    return DEFAULT_PATHS.includes(location.pathname)
  }

  function matchPattern(pattern, url) {
    const match = String(pattern || '').match(/^([^:]+):\/\/([^/]*)(.*)$/)
    if (!match) return false
    const scheme = match[1] === '*' ? 'https?' : escapeRegExp(match[1])
    const host = match[2].split('*').map(escapeRegExp).join('[^/]*')
    const path = patternPathToRegex(match[3] || '/')
    return new RegExp(`^${scheme}:\\/\\/${host}${path}$`).test(url)
  }

  function patternPathToRegex(path) {
    let out = ''
    for (let i = 0; i < path.length; i++) {
      if (path[i] === '*' && path[i + 1] === '*') {
        out += '.*'
        i++
      } else if (path[i] === '*') {
        out += '[^/]*'
      } else {
        out += escapeRegExp(path[i])
      }
    }
    return out
  }

  function addSite() {
    const pattern = prompt('请输入 Tampermonkey match pattern', `${location.origin}${location.pathname}**`)
    if (!pattern) return
    const sites = getCustomSites()
    sites.push(pattern)
    setCustomSites(sites)
    alert(`已添加站点：${pattern}`)
  }

  function manageSites() {
    ensureStyle()
    document.querySelector('#ptbd-site-modal')?.remove()
    const list = el('div', { class: 'ptbd-site-list' })
    const overlay = el('div', { id: 'ptbd-site-modal', class: 'ptbd-modal' })
    const close = button('×', () => overlay.remove(), 'ptbd-close')
    const box = el('div', { class: 'ptbd-modal-box' },
      el('div', { class: 'ptbd-modal-head' }, el('strong', {}, '页面管理'), close),
      list
    )
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove() })
    overlay.append(box)
    document.body.append(overlay)
    renderSites(list)
  }

  function renderSites(list) {
    list.textContent = ''
    const sites = getCustomSites()
    if (!sites.length) {
      list.append(el('div', { class: 'ptbd-empty' }, '暂无自定义页面'))
      return
    }
    sites.forEach(pattern => {
      const del = button('删除', () => {
        setCustomSites(getCustomSites().filter(item => item !== pattern))
        renderSites(list)
      }, 'ptbd-btn ptbd-danger')
      list.append(el('div', { class: 'ptbd-site-item' }, el('span', {}, pattern), del))
    })
  }

  function getCustomSites() {
    const value = safeGet(CUSTOM_SITES_KEY, [])
    return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : []
  }

  function setCustomSites(sites) {
    GM_setValue(CUSTOM_SITES_KEY, [...new Set(sites.map(item => clean(item)).filter(Boolean))])
  }

  function start() {
    const ready = () => {
      ensureStyle()
      buildPanel()
      refreshTorrents()
      setTimeout(refreshTorrents, 1000)
      setTimeout(refreshTorrents, 3000)
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready)
    else ready()
  }

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

  function actionsRow() {
    state.ui.batchButton = button('下载已选', batchDownload, 'ptbd-btn ptbd-btn-primary')
    return el('div', { class: 'ptbd-actions' },
      button('筛选', applyFilters, 'ptbd-btn ptbd-btn-check'),
      button('全选', () => selectVisible(true), 'ptbd-btn'),
      button('取消全选', () => selectVisible(false), 'ptbd-btn'),
      state.ui.batchButton,
      state.ui.downloaderStatus,
      state.ui.downloaderSelect,
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
          el('th', {}, '做种'),
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

  function refreshTorrents() {
    state.torrents = extractTorrents()
    fillMulti(state.ui.promotion, PROMOTIONS, selectedMulti(state.ui.promotion))
    applyFilters()
  }

  function extractTorrents() {
    const items = []
    const seen = new Set()
    document.querySelectorAll('a[href*="download.php?id="]').forEach(link => {
      const downloadUrl = absoluteUrl(link.getAttribute('href'))
      const tid = new URL(downloadUrl).searchParams.get('id')
      if (!tid || seen.has(tid)) return
      seen.add(tid)
      const row = findSeedRow(link) || link.closest('tr') || link.parentElement || link
      const detailLink = row.querySelector(`a[href*="details.php?id=${cssEscape(tid)}"]`) || row.querySelector('a[href*="details.php?id="]') || document.querySelector(`a[href*="details.php?id=${cssEscape(tid)}"]`)
      const rowText = clean(row.textContent)
      const size = (rowText.match(/\d+(?:\.\d+)?\s*[TGMK]i?B/i) || [''])[0]
      const title = clean(detailLink?.textContent || link.getAttribute('title') || link.textContent) || `Torrent ${tid}`
      items.push({
        tid,
        title,
        downloadUrl,
        detailUrl: detailLink ? absoluteUrl(detailLink.getAttribute('href')) : '',
        size: size || '-',
        sizeBytes: parseSize(size),
        seeders: detectSeeders(row),
        promotion: detectPromotion(row),
        downloaded: detectDownloaded(row)
      })
    })
    return items
  }

  function findSeedRow(link) {
    let node = link
    while ((node = node.parentElement)) {
      if (node.tagName === 'TR' && /\d+(?:\.\d+)?\s*[TGMK]i?B/i.test(node.textContent)) return node
    }
    return link.closest('tr')
  }

  function detectSeeders(row) {
    const seeder = row.querySelector('a[href*="#seeders"], a[href*="seeders"]')
    if (seeder) return toNumber(seeder.textContent)
    const cells = row.cells ? [...row.cells] : []
    const sizeIndex = cells.findIndex(cell => /\d+(?:\.\d+)?\s*[TGMK]i?B/i.test(cell.textContent))
    if (sizeIndex >= 0 && cells[sizeIndex + 1]) return toNumber(cells[sizeIndex + 1].textContent)
    const nums = clean(row.textContent).match(/\b\d+\b/g) || []
    return nums.length ? parseInt(nums[0], 10) : null
  }

  function detectPromotion(row) {
    const imgs = [...row.querySelectorAll('img')]
    const imgText = imgs.map(img => `${img.className || ''} ${img.getAttribute('src') || ''} ${img.getAttribute('alt') || ''} ${img.getAttribute('title') || ''}`).join(' ')
    const text = `${imgText} ${clean(row.textContent)}`
    if (/free2up|2upfree|2\s*x\s*free|free\s*2\s*x|2x\s*免费|免费\s*2x/i.test(text)) return 'free2up'
    if (/50down2up|2up50down|2\s*x.*50%|50%.*2\s*x/i.test(text)) return '50down2up'
    if (/\bfree\b|免费|pro_free/i.test(text)) return 'free'
    if (/2up|2\s*x|2x|双倍上传/i.test(text)) return '2up'
    if (/50down|50%|半价/i.test(text)) return '50down'
    if (/30down|30%|三折/i.test(text)) return '30down'
    return 'normal'
  }

  function detectDownloaded(row) {
    const statusRe = /seeding|leeching|做种中?|正在做种|已下载|下载中|正在下载|吸血中?/i
    const className = row.className || ''
    const text = clean(row.textContent)
    if (statusRe.test(className)) return true
    if (statusRe.test(text)) return true
    if ([...row.querySelectorAll('[title],[alt]')].some(elm => statusRe.test(`${elm.getAttribute('title') || ''} ${elm.getAttribute('alt') || ''}`))) return true
    if ([...row.querySelectorAll('font[color]')].some(f => statusRe.test(f.textContent))) return true
    if ([...row.querySelectorAll('img[class],img[src],a[class]')].some(elm => /seeding|leeching/i.test(`${elm.className || ''} ${elm.getAttribute('src') || ''}`))) return true
    return false
  }

  function applyFilters() {
    const cfg = readFilters()
    state.filter = cfg
    state.filtered = state.torrents.filter(item => matchFilters(item, cfg))
    state.selected = new Set(state.filtered.map(item => item.tid))
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
      seedingStatus: state.ui.seedingStatus.value,
      delay: Math.max(300, parseInt(state.ui.delay.value, 10) || 1200)
    }
  }

  function matchFilters(item, cfg) {
    if (cfg.keyword && !item.title.toLowerCase().includes(cfg.keyword)) return false
    if (cfg.sizeMin != null && (item.sizeBytes == null || item.sizeBytes < cfg.sizeMin)) return false
    if (cfg.sizeMax != null && (item.sizeBytes == null || item.sizeBytes > cfg.sizeMax)) return false
    if (cfg.seedMin != null && (item.seeders == null || item.seeders < cfg.seedMin)) return false
    if (cfg.seedMax != null && (item.seeders == null || item.seeders > cfg.seedMax)) return false
    if (cfg.promotions.length && !cfg.promotions.includes(item.promotion)) return false
    if (cfg.seedingStatus === 'seeding' && item.downloaded !== true) return false
    if (cfg.seedingStatus === 'not-seeding' && item.downloaded !== false) return false
    return true
  }

  function renderTable() {
    state.ui.tbody.textContent = ''
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
      })
      const download = button('下载', () => downloadTorrent(item), 'ptbd-mini')
      state.ui.tbody.append(el('tr', {},
        el('td', {}, checkbox),
        el('td', {}, item.detailUrl ? el('a', { href: item.detailUrl, target: '_blank', rel: 'noopener' }, item.title) : item.title),
        el('td', {}, item.sizeBytes ? formatBytes(item.sizeBytes) : item.size),
        el('td', {}, item.seeders == null ? '-' : String(item.seeders)),
        el('td', {}, promotionName(item.promotion)),
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

  async function batchDownload() {
    if (state.isDownloading) return
    const items = uniqueByTid(state.filtered.filter(item => state.selected.has(item.tid)))
    if (!items.length) {
      setStatus('没有勾选种子')
      return
    }
    const cfg = getDownloaderById(state.selectedDownloaderId)
    const delay = Math.max(300, parseInt(state.ui.delay.value, 10) || 1200)
    let success = 0
    let failed = 0
    state.isDownloading = true
    try {
      if (!cfg && items.length > 1) {
        const result = await downloadZip(items, delay)
        success = result.success
        failed = result.failed
      } else {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          setStatus(`${cfg ? '推送中' : '下载中'} ${i + 1}/${items.length}: ${item.title}`)
          try {
            await downloadTorrent(item)
            success++
          } catch (error) {
            failed++
          }
          if (i < items.length - 1) await sleep(delay)
        }
      }
    } finally {
      state.isDownloading = false
    }
    setStatus(`完成：${items.length} 个，成功 ${success}，失败 ${failed}`)
  }

  async function downloadTorrent(item) {
    const cfg = getDownloaderById(state.selectedDownloaderId)
    if (cfg?.type === 'qb') return pushToQBittorrent(item, cfg)
    if (cfg?.type === 'tr') return pushToTransmission(item, cfg)
    return downloadBlob(item)
  }

  async function downloadBlob(item) {
    try {
      const file = await fetchTorrentBlob(item)
      clickDownload(file.blob, file.name)
    } catch (error) {
      fallbackDownload(item.downloadUrl)
      throw error
    }
  }

  async function downloadZip(items, delay) {
    const zip = new JSZip()
    let success = 0
    let failed = 0
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      setStatus(`下载中 ${i + 1}/${items.length}: ${item.title}`)
      try {
        const file = await fetchTorrentBlob(item)
        zip.file(file.name, file.blob)
        success++
      } catch (error) {
        fallbackDownload(item.downloadUrl)
        failed++
      }
      if (i < items.length - 1) await sleep(delay)
    }
    if (success) {
      const blob = await zip.generateAsync({ type: 'blob' })
      clickDownload(blob, `pt_batch_${new Date().toISOString().slice(0, 10)}.zip`)
    }
    return { success, failed }
  }

  async function fetchTorrentBlob(item) {
    const response = await fetch(item.downloadUrl, { credentials: 'include' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    if (!blob.size) throw new Error('空文件')
    const name = fileNameFromDisposition(response.headers.get('content-disposition')) || `${item.tid}_${sanitize(item.title)}.torrent`
    return { blob, name }
  }

  function clickDownload(blob, name) {
    const url = URL.createObjectURL(blob)
    const a = el('a', { href: url, download: name, style: 'display:none' })
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  function fallbackDownload(url) {
    const a = el('a', { href: url, style: 'display:none' })
    document.body.append(a)
    a.click()
    a.remove()
  }

  function gmRequest({ method = 'GET', url, headers = {}, data, responseType = '' }) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers,
        data,
        responseType,
        timeout: 20000,
        onload: res => resolve({ status: res.status, responseText: res.responseText, responseHeaders: res.responseHeaders || '', response: res.response, finalUrl: res.finalUrl }),
        onerror: () => reject(new Error('网络错误')),
        ontimeout: () => reject(new Error('超时'))
      })
    })
  }

  function gmUploadFile({ url, headers = {}, fieldName, fileName, blob, extraFields = {} }) {
    return new Promise((resolve, reject) => {
      const boundary = '----ptbd' + Math.random().toString(36).slice(2)
      const reader = new FileReader()
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result)
        let body = ''
        for (const [key, value] of Object.entries(extraFields)) {
          if (!value) continue
          body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        }
        const headerStr = `${body}--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: application/x-bittorrent\r\n\r\n`
        const headerBytes = new TextEncoder().encode(headerStr)
        const footerStr = `\r\n--${boundary}--\r\n`
        const footerBytes = new TextEncoder().encode(footerStr)
        const combined = new Uint8Array(headerBytes.length + bytes.length + footerBytes.length)
        combined.set(headerBytes, 0)
        combined.set(bytes, headerBytes.length)
        combined.set(footerBytes, headerBytes.length + bytes.length)
        GM_xmlhttpRequest({
          method: 'POST',
          url,
          headers: { ...headers, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
          data: combined.buffer,
          timeout: 30000,
          onload: res => resolve({ status: res.status, responseText: res.responseText, responseHeaders: res.responseHeaders || '' }),
          onerror: () => reject(new Error('上传网络错误')),
          ontimeout: () => reject(new Error('上传超时'))
        })
      }
      reader.onerror = () => reject(new Error('读取种子文件失败'))
      reader.readAsArrayBuffer(blob)
    })
  }

  async function pushToQBittorrent(item, cfg) {
    try {
      const base = clean(cfg.host).replace(/\/$/, '')
      if (!base) throw new Error('qBittorrent Host 为空')
      const loginHeaders = { 'Content-Type': 'application/x-www-form-urlencoded', Referer: base }
      const login = await gmRequest({
        method: 'POST',
        url: `${base}/api/v2/auth/login`,
        headers: loginHeaders,
        data: `username=${encodeURIComponent(cfg.username)}&password=${encodeURIComponent(cfg.password)}`
      })
      if (login.status !== 200) throw new Error(`qBittorrent 登录失败 HTTP ${login.status}: ${login.responseText?.slice(0, 100) || ''}`)
      const sid = login.responseHeaders.match(/Set-Cookie:\s*SID=([^;]+)/i)?.[1]
      const torrentRes = await fetch(item.downloadUrl, { credentials: 'include' })
      if (!torrentRes.ok) throw new Error(`下载种子失败 HTTP ${torrentRes.status}`)
      const torrentBlob = await torrentRes.blob()
      if (!torrentBlob.size) throw new Error('种子文件为空')
      const addHeaders = { Referer: base }
      if (sid) addHeaders.Cookie = `SID=${sid}`
      const add = await gmUploadFile({
        url: `${base}/api/v2/torrents/add`,
        headers: addHeaders,
        fieldName: 'torrents',
        fileName: `${item.tid || 'torrent'}.torrent`,
        blob: torrentBlob,
        extraFields: { category: cfg.qbCategory, tags: cfg.qbTags, savepath: cfg.qbSavePath }
      })
      if (add.status !== 200) throw new Error(`qBittorrent 添加失败 HTTP ${add.status}: ${add.responseText?.slice(0, 100) || ''}`)
    } catch (error) {
      console.warn('[PTBD] qBittorrent 推送失败', { item, cfg: { ...cfg, password: cfg.password ? '***' : '' }, error })
      throw error
    }
  }

  async function testDownloaderConnection(cfg) {
    if (cfg.type === 'qb') {
      const base = clean(cfg.host).replace(/\/$/, '')
      const login = await gmRequest({
        method: 'POST',
        url: `${base}/api/v2/auth/login`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: base },
        data: `username=${encodeURIComponent(cfg.username)}&password=${encodeURIComponent(cfg.password)}`
      })
      if (login.status !== 200) throw new Error(`HTTP ${login.status}: ${login.responseText?.slice(0, 100) || ''}`)
      return
    }
    const base = clean(cfg.host).replace(/\/$/, '')
    const headers = { 'Content-Type': 'application/json' }
    if (cfg.username) headers.Authorization = 'Basic ' + btoa(`${cfg.username}:${cfg.password}`)
    let res = await gmRequest({ method: 'POST', url: `${base}/transmission/rpc`, headers, data: JSON.stringify({ method: 'session-get' }) })
    if (res.status === 409) {
      const sid = res.responseHeaders.match(/X-Transmission-Session-Id:\s*(\S+)/i)?.[1]
      if (sid) {
        headers['X-Transmission-Session-Id'] = sid
        res = await gmRequest({ method: 'POST', url: `${base}/transmission/rpc`, headers, data: JSON.stringify({ method: 'session-get' }) })
      }
    }
    if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${res.responseText?.slice(0, 100) || ''}`)
    const json = JSON.parse(res.responseText || '{}')
    if (json.result && json.result !== 'success') throw new Error(json.result)
  }

  async function pushToTransmission(item, cfg) {
    const base = clean(cfg.host).replace(/\/$/, '')
    if (!base) throw new Error('Transmission Host 为空')
    const rpcUrl = `${base}/transmission/rpc`
    const torrentRes = await fetch(item.downloadUrl, { credentials: 'include' })
    if (!torrentRes.ok) throw new Error(`下载种子失败 HTTP ${torrentRes.status}`)
    const torrentBuf = await torrentRes.arrayBuffer()
    if (!torrentBuf.byteLength) throw new Error('种子文件为空')
    const bytes = new Uint8Array(torrentBuf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const args = { metainfo: btoa(binary) }
    if (cfg.trDownloadDir) args['download-dir'] = cfg.trDownloadDir
    const labels = String(cfg.trLabels || '').split(',').map(s => s.trim()).filter(Boolean)
    if (labels.length) args.labels = labels
    const headers = { 'Content-Type': 'application/json' }
    if (cfg.username) headers.Authorization = 'Basic ' + btoa(`${cfg.username}:${cfg.password}`)
    const body = JSON.stringify({ method: 'torrent-add', arguments: args })
    let res = await gmRequest({ method: 'POST', url: rpcUrl, headers, data: body })
    if (res.status === 409) {
      const sid = res.responseHeaders.match(/X-Transmission-Session-Id:\s*(\S+)/i)?.[1]
      if (sid) {
        headers['X-Transmission-Session-Id'] = sid
        res = await gmRequest({ method: 'POST', url: rpcUrl, headers, data: body })
      }
    }
    if (res.status !== 200) throw new Error(`tr 添加失败 HTTP ${res.status}`)
    const json = JSON.parse(res.responseText || '{}')
    if (json.result && json.result !== 'success' && !String(json.result).includes('duplicate')) throw new Error(`tr: ${json.result}`)
  }

  function getDownloaders() {
    let list = []
    try { list = GM_getValue(DOWNLOADERS_KEY, []) } catch (error) {}
    if (!Array.isArray(list) || !list.length) {
      let old = {}
      try { old = GM_getValue(DOWNLOADER_KEY, {}) } catch (error) {}
      if (old && old.type && old.type !== 'none') {
        list = [{ ...DEFAULT_DL, ...old, id: 'migrated-1', name: old.type === 'qb' ? 'qBittorrent' : 'Transmission' }]
        GM_setValue(DOWNLOADERS_KEY, list)
      }
    }
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

  function multiFilter(title, selected) {
    const root = el('details')
    const summary = el('summary')
    const box = el('div', { class: 'ptbd-menu' })
    root.append(summary, box)
    const control = { root, summary, box, title, selected: new Set(selected || []) }
    root.addEventListener('change', () => updateMultiSummary(control))
    updateMultiSummary(control)
    return control
  }

  function fillMulti(control, values, selected) {
    if (!control) return
    const old = new Set(selected || selectedMulti(control))
    control.box.textContent = ''
    values.forEach(([value, text]) => {
      const cb = el('input', { type: 'checkbox', value })
      cb.checked = old.has(value)
      control.box.append(el('label', {}, cb, ` ${text}`))
    })
    updateMultiSummary(control)
  }

  function selectedMulti(control) {
    if (!control) return []
    return [...control.box.querySelectorAll('input:checked')].map(input => input.value).filter(value => value !== 'all')
  }

  function updateMultiSummary(control) {
    const selected = selectedMulti(control)
    const all = control.box.querySelector('input[value="all"]')
    if (all && all.checked) {
      control.box.querySelectorAll('input:not([value="all"])').forEach(input => { input.checked = false })
    }
    control.summary.textContent = selected.length ? `已选 ${selected.length}` : '全部'
  }

  function input(type, placeholder, value = '') {
    return el('input', { type, placeholder, value })
  }

  function unitSelect(value) {
    const sel = select(SIZE_UNITS.map(unit => [unit, unit]), value)
    sel.className = 'ptbd-unit'
    return sel
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

  function field(labelText, child, cls = '') {
    return el('div', { class: `ptbd-field ${cls}`.trim() }, el('label', {}, labelText), child)
  }

  function sizeRangeField(labelText, min, minUnit, max, maxUnit) {
    return el('div', { class: 'ptbd-field ptbd-range-field ptbd-size-range-field' },
      el('label', {}, labelText),
      el('div', { class: 'ptbd-range' }, el('div', { class: 'ptbd-size-box' }, min, minUnit), el('span', {}, '~'), el('div', { class: 'ptbd-size-box' }, max, maxUnit))
    )
  }

  function rangeField(labelText, min, max) {
    return el('div', { class: 'ptbd-field ptbd-range-field' },
      el('label', {}, labelText),
      el('div', { class: 'ptbd-range' }, min, el('span', {}, '~'), max)
    )
  }

  function selectField(labelText, control) {
    return el('div', { class: 'ptbd-field ptbd-select-field' }, el('label', {}, labelText), control)
  }

  function button(labelText, fn, cls = 'ptbd-btn') {
    const btn = el('button', { type: 'button', class: cls }, labelText)
    btn.addEventListener('click', fn)
    return btn
  }

  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag)
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value == null) return
      if (key === 'class') node.className = value
      else if (key === 'style') node.style.cssText = value
      else if (key === 'text') node.textContent = value
      else node.setAttribute(key, value)
    })
    kids.flat().forEach(kid => {
      if (kid == null) return
      node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)))
    })
    return node
  }

  function append(parent, ...kids) {
    kids.forEach(kid => parent.append(kid))
    return parent
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim()
  }

  function sanitize(value) {
    const text = clean(value).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120)
    return text || 'torrent'
  }

  function fileNameFromDisposition(value) {
    const text = String(value || '')
    const utf8 = text.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const plain = text.match(/filename=("?)([^";]+)\1/i)?.[2]
    const raw = utf8 || plain
    if (!raw) return ''
    try {
      return decodeURIComponent(raw).replace(/[\\/:*?"<>|]+/g, '_')
    } catch (error) {
      return raw.replace(/[\\/:*?"<>|]+/g, '_')
    }
  }

  function pageIsDark() {
    const color = firstPaintedBg(document.body)
    return color ? colorBrightness(color) < 128 : false
  }

  function firstPaintedBg(node) {
    for (let item = node; item && item !== document.documentElement; item = item.parentElement) {
      const bg = getComputedStyle(item).backgroundColor
      if (bg && bg !== 'transparent' && !/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(bg)) return bg
    }
    return getComputedStyle(document.body).backgroundColor
  }

  function colorBrightness(color) {
    const match = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    if (!match) return 255
    return (Number(match[1]) * 299 + Number(match[2]) * 587 + Number(match[3]) * 114) / 1000
  }

  function parseSize(text) {
    const match = String(text || '').match(/(\d+(?:\.\d+)?)\s*([TGMK]i?B)/i)
    if (!match) return null
    const value = parseFloat(match[1])
    const factor = UNIT_BYTES[match[2].toLowerCase()]
    return isFinite(value) && factor ? value * factor : null
  }

  function formatBytes(bytes) {
    if (bytes == null || !isFinite(bytes)) return '-'
    const units = [['TiB', 1024 ** 4], ['GiB', 1024 ** 3], ['MiB', 1024 ** 2], ['KiB', 1024]]
    for (const [name, factor] of units) if (bytes >= factor) return (bytes / factor).toFixed(2) + ' ' + name
    return bytes + ' B'
  }

  function sizeInputToBytes(value, unit) {
    const num = parseFloat(value)
    if (!isFinite(num)) return null
    return num * (UNIT_BYTES[String(unit || 'GiB').toLowerCase()] || UNIT_BYTES.gib)
  }

  function numberOrNull(value) {
    const num = parseInt(value, 10)
    return Number.isFinite(num) ? num : null
  }

  function toNumber(text) {
    const match = String(text || '').replace(/,/g, '').match(/\d+/)
    return match ? parseInt(match[0], 10) : null
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function uniqueId() {
    return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function uniqueByTid(items) {
    const seen = new Set()
    return items.filter(item => {
      if (!item.tid || seen.has(item.tid)) return false
      seen.add(item.tid)
      return true
    })
  }

  function promotionName(value) {
    return PROMOTIONS.find(item => item[0] === value)?.[1] || '-'
  }

  function absoluteUrl(url) {
    return new URL(url, location.href).href
  }

  function safeGet(key, fallback) {
    try {
      return GM_getValue(key, fallback)
    } catch (error) {
      return fallback
    }
  }

  function cssEscape(text) {
    if (window.CSS && CSS.escape) return CSS.escape(text)
    return String(text).replace(/[^a-zA-Z0-9_-]/g, '\\$&')
  }

  function escapeRegExp(text) {
    return String(text).replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
  }

  function setStatus(text) {
    if (state.ui.status) state.ui.status.textContent = text
  }

  function ensureStyle() {
    if (document.querySelector('#ptbd-style')) return
    GM_addStyle(`
#${ID}.ptbd-theme-dark{--ptbd-panel-bg:linear-gradient(180deg,#162234,#101928);--ptbd-head-bg:rgba(21,35,55,.92);--ptbd-text:#c9d7ea;--ptbd-title:#e8f1ff;--ptbd-label:#dbeafe;--ptbd-muted:#a9bdd5;--ptbd-border:#2b4565;--ptbd-border-strong:#385a82;--ptbd-input-bg:#0f1b2b;--ptbd-input-text:#e5eefb;--ptbd-menu-hover:#17304d;--ptbd-btn-bg:#17263a;--ptbd-btn-text:#dbeafe;--ptbd-primary-bg:#173f35;--ptbd-primary-border:#2f7d5d;--ptbd-primary-text:#b9f6d3;--ptbd-check-bg:#15304c;--ptbd-status-bg:#101b2b;--ptbd-shadow:0 8px 24px rgba(0,0,0,.28)}
#${ID}.ptbd-theme-light{--ptbd-panel-bg:linear-gradient(180deg,#fbfcfe,#f4f7fb);--ptbd-head-bg:rgba(238,243,248,.92);--ptbd-text:#2f3742;--ptbd-title:#253044;--ptbd-label:#3a4757;--ptbd-muted:#536071;--ptbd-border:#d8dee8;--ptbd-border-strong:#c8d1dd;--ptbd-input-bg:#fff;--ptbd-input-text:#243044;--ptbd-menu-hover:#f2f6fb;--ptbd-btn-bg:#f3f5f8;--ptbd-btn-text:#2f3b4d;--ptbd-primary-bg:#e6f3ed;--ptbd-primary-border:#a8d0bc;--ptbd-primary-text:#1f6041;--ptbd-check-bg:#e8f1fb;--ptbd-status-bg:#eef3f8;--ptbd-shadow:0 2px 8px rgba(20,35,60,.12)}
#${TOGGLE_ID}{position:fixed;right:18px;bottom:18px;z-index:999999;border:0;border-radius:999px;padding:10px 16px;background:#2563eb;color:#fff;font:700 13px/1 Arial,Helvetica,sans-serif;cursor:pointer;box-shadow:0 10px 28px rgba(37,99,235,.35),0 4px 14px rgba(0,0,0,.25)}
#${TOGGLE_ID}:hover{filter:brightness(1.08)}
#${ID}{position:fixed;right:18px;bottom:66px;z-index:999998;width:min(1180px,calc(100vw - 36px));max-height:82vh;overflow:auto;box-sizing:border-box;color:var(--ptbd-text);background:var(--ptbd-panel-bg);border:1px solid var(--ptbd-border);border-radius:10px;box-shadow:var(--ptbd-shadow);font:12px/1.5 Arial,Helvetica,'Microsoft YaHei',sans-serif}
#${ID}.ptbd-hidden{display:none}
#${ID} .ptbd-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid var(--ptbd-border);background:var(--ptbd-head-bg);border-radius:10px 10px 0 0}
#${ID} .ptbd-title{font-weight:700;color:var(--ptbd-title);white-space:nowrap}
#${ID} .ptbd-head-actions{display:flex;align-items:center;gap:8px}
#${ID} .ptbd-body{padding:10px 12px;display:flex;flex-direction:column;gap:10px}
#${ID} .ptbd-body.ptbd-collapsed{display:none}
#${ID} .ptbd-filter-groups{display:flex;flex-direction:column;gap:10px}
#${ID} .ptbd-filter-row{display:grid;gap:10px;align-items:center}
#${ID} .ptbd-filter-row-main{grid-template-columns:minmax(260px,1.2fr) minmax(420px,1.8fr) minmax(180px,.7fr)}
#${ID} .ptbd-filter-row-extra{grid-template-columns:minmax(220px,.8fr) minmax(320px,1.3fr) minmax(260px,1fr)}
#${ID} .ptbd-field{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:8px;color:var(--ptbd-muted);min-width:0}
#${ID} .ptbd-field>label{color:var(--ptbd-label);font-weight:600;white-space:nowrap;text-align:right;min-width:72px}
#${ID} input,#${ID} select{height:28px;width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--ptbd-border-strong);border-radius:5px;background:var(--ptbd-input-bg);color:var(--ptbd-input-text);padding:2px 7px}
#${ID} input::placeholder{color:var(--ptbd-muted)}
#${ID} .ptbd-range{display:grid;grid-template-columns:minmax(96px,1fr) auto minmax(96px,1fr);align-items:center;gap:8px;min-width:0}
#${ID} .ptbd-size-range-field .ptbd-range{grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr)}
#${ID} .ptbd-size-box{display:grid;grid-template-columns:minmax(92px,1fr) 54px;gap:6px;min-width:0}
#${ID} .ptbd-unit{width:50px;padding-left:2px;padding-right:0}
#${ID} details{position:relative;min-width:0}
#${ID} summary{list-style:none;cursor:pointer;height:28px;box-sizing:border-box;border:1px solid var(--ptbd-border-strong);background:var(--ptbd-input-bg);border-radius:5px;padding:2px 7px;color:var(--ptbd-input-text);min-width:110px;text-align:center;line-height:22px}
#${ID} .ptbd-select-field summary{text-align:left;padding:2px 28px 2px 10px;position:relative}
#${ID} .ptbd-select-field summary::after{content:'▾';position:absolute;right:10px;top:50%;transform:translateY(-50%)}
#${ID} summary::-webkit-details-marker{display:none}
#${ID} details[open] summary{background:var(--ptbd-input-bg)}
#${ID} .ptbd-menu{position:absolute;z-index:999999;top:32px;left:0;max-height:220px;overflow:auto;min-width:170px;padding:5px;border:1px solid var(--ptbd-border-strong);background:var(--ptbd-input-bg);color:var(--ptbd-input-text);border-radius:6px;box-shadow:var(--ptbd-shadow)}
#${ID} .ptbd-menu label{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;white-space:nowrap;cursor:pointer}
#${ID} .ptbd-menu label:hover{background:var(--ptbd-menu-hover)}
#${ID} .ptbd-menu input{width:auto;height:auto}
#${ID} .ptbd-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
#${ID} .ptbd-btn,#${ID} .ptbd-mini,#${ID} .ptbd-collapse{height:28px;border:1px solid var(--ptbd-border-strong);border-radius:5px;background:var(--ptbd-btn-bg);color:var(--ptbd-btn-text);padding:0 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
#${ID} .ptbd-close{height:28px;min-width:28px;border:1px solid var(--ptbd-border);border-radius:5px;background:var(--ptbd-input-bg);color:var(--ptbd-muted);font-size:18px;line-height:1;cursor:pointer}
#${ID} .ptbd-btn:hover,#${ID} .ptbd-mini:hover,#${ID} .ptbd-collapse:hover,#${ID} .ptbd-close:hover{filter:brightness(1.08)}
#${ID} .ptbd-btn-primary{background:var(--ptbd-primary-bg);border-color:var(--ptbd-primary-border);color:var(--ptbd-primary-text);font-weight:700}
#${ID} .ptbd-btn-check{background:var(--ptbd-check-bg)}
#${ID} .ptbd-status{margin-left:auto;color:var(--ptbd-muted);background:var(--ptbd-status-bg);border:1px solid var(--ptbd-border);border-radius:5px;padding:4px 8px;min-width:220px;text-align:right}
#${ID} .ptbd-dl-status{color:var(--ptbd-label);background:var(--ptbd-status-bg);border:1px solid var(--ptbd-border);border-radius:999px;padding:4px 9px;white-space:nowrap}
#${ID} .ptbd-dl-select{width:auto;min-width:150px}
#${ID} .ptbd-section-title{font-weight:700;color:var(--ptbd-label);margin:8px 0}
#${ID} .ptbd-table-wrap{overflow:auto;border:1px solid var(--ptbd-border);border-radius:8px}
#${ID} .ptbd-table{width:100%;border-collapse:collapse;background:var(--ptbd-input-bg);color:var(--ptbd-text)}
#${ID} .ptbd-table th,#${ID} .ptbd-table td{border-top:1px solid var(--ptbd-border);padding:7px 8px;text-align:left;vertical-align:top}
#${ID} .ptbd-table th:nth-child(3),#${ID} .ptbd-table td:nth-child(3){min-width:86px;white-space:nowrap}
#${ID} .ptbd-table th:nth-child(4),#${ID} .ptbd-table td:nth-child(4){min-width:58px;white-space:nowrap}
#${ID} .ptbd-table th{position:sticky;top:0;background:var(--ptbd-head-bg);z-index:1;color:var(--ptbd-label)}
#${ID} .ptbd-table a{color:#60a5fa;text-decoration:none}
#${ID} .ptbd-table tbody tr:hover{background:var(--ptbd-menu-hover)}
.ptbd-modal{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#f5f7fa;font:13px/1.5 Arial,Helvetica,'Microsoft YaHei',sans-serif}
.ptbd-modal-box{width:min(720px,calc(100vw - 36px));max-height:80vh;overflow:auto;background:#1f2933;border:1px solid #374151;border-radius:10px;box-shadow:0 18px 54px rgba(0,0,0,.45)}
.ptbd-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #374151;background:#243041}
.ptbd-site-list,.ptbd-dl-modal-body{padding:12px}.ptbd-site-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #374151}.ptbd-site-item span{word-break:break-all}.ptbd-dl-modal-body,.ptbd-dl-form{display:grid;grid-template-columns:1fr;gap:8px}.ptbd-modal .ptbd-field{display:grid;grid-template-columns:minmax(96px,auto) minmax(0,1fr);align-items:center;gap:8px;color:#cbd5e1}.ptbd-modal .ptbd-field>label{font-weight:600;white-space:nowrap;text-align:right}.ptbd-modal input,.ptbd-modal select{height:30px;width:100%;min-width:0;box-sizing:border-box;border:1px solid #475569;border-radius:5px;background:#111827;color:#f8fafc;padding:2px 8px}.ptbd-modal .ptbd-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.ptbd-modal .ptbd-btn,.ptbd-modal .ptbd-close{height:28px;border:1px solid #475569;border-radius:5px;background:#334155;color:#f8fafc;padding:0 12px;cursor:pointer}.ptbd-modal .ptbd-close{min-width:28px;font-size:18px;line-height:1}.ptbd-form-errors{color:#fecaca;min-height:18px}.ptbd-test-status{color:#bbf7d0;margin-right:auto}.ptbd-empty{text-align:center;color:#94a3b8;padding:14px!important}.ptbd-danger{background:#7f1d1d!important;border-color:#991b1b!important;color:#fff!important}
@media(max-width:1100px){#${ID} .ptbd-filter-row-main,#${ID} .ptbd-filter-row-extra{grid-template-columns:1fr}}
@media(max-width:680px){#${ID} .ptbd-status{margin-left:0;text-align:left;flex-basis:100%}#${ID} .ptbd-field{grid-template-columns:minmax(70px,auto) minmax(0,1fr)}}
    `)
    const style = document.createElement('style')
    style.id = 'ptbd-style'
    style.textContent = ''
    document.documentElement.append(style)
  }
})()

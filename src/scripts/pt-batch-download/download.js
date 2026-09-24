import { state } from './config.js';

import { pushToQBittorrent, pushToTransmission } from './downloaders.js';

import { getDownloaderById } from './downloader-settings.js';

import { el } from './controls.js';

import { fileNameFromDisposition, sanitize, setStatus, sleep, uniqueByTid } from './formatting.js';

import { generateZipBlob } from './zip.js';

const DIRECT_FETCH_TIMEOUT_MS = 20000;
const DIRECT_FETCH_CONCURRENCY = 4;

// 推送和浏览器逐个下载共用的串行循环。
async function runSerialDownload(items, delay, label, worker) {
  let success = 0
  let failed = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    setStatus(`${label} ${i + 1}/${items.length}: ${item.title}`)
    try {
      await worker(item)
      success++
    } catch (error) {
      failed++
    }
    if (i < items.length - 1) await sleep(delay)
  }
  return { success, failed }
}

// 一个调度器统一控制启动间隔；慢请求可重叠，但全局最多 4 路，避免同时突发请求。
async function runConcurrentDownload(items, delay, worker) {
  const active = new Set()
  let nextStart = 0
  let success = 0
  let failed = 0
  const progress = () => setStatus(`获取种子：完成 ${success + failed}/${items.length}，成功 ${success}，失败 ${failed}，进行中 ${active.size}`)
  for (const item of items) {
    if (active.size >= DIRECT_FETCH_CONCURRENCY) await Promise.race(active)
    const wait = nextStart - Date.now()
    if (wait > 0) await sleep(wait)
    nextStart = Date.now() + delay
    const task = Promise.resolve().then(() => worker(item)).then(
      () => { success++ },
      () => { failed++ }
    ).then(() => {
      active.delete(task)
      progress()
    })
    active.add(task)
    progress()
  }
  await Promise.all(active)
  return { success, failed }
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
    state.isDownloading = true
    try {
      const result = !cfg && items.length > 1
        ? await downloadZip(items, delay)
        : await runSerialDownload(items, delay, cfg ? '推送中' : '下载中', item => downloadTorrent(item, cfg))
      setStatus(`完成：${items.length} 个，成功 ${result.success}，失败 ${result.failed}${result.notice ? `；${result.notice}` : ''}`)
    } catch (error) {
      setStatus(`批量${cfg ? '推送' : '下载/打包'}失败，请重试`)
    } finally {
      state.isDownloading = false
    }
  }

async function downloadTorrent(item, cfg = getDownloaderById(state.selectedDownloaderId)) {
    if (cfg?.type === 'qb') return pushToQBittorrent(item, cfg)
    if (cfg?.type === 'tr') return pushToTransmission(item, cfg)
    return downloadBlob(item)
  }

async function downloadBlob(item) {
    try {
      const file = await fetchTorrentFile(item)
      saveTorrentFile(file)
    } catch (error) {
      fallbackDownload(item.downloadUrl)
      throw error
    }
  }

function saveTorrentFile(file) {
    clickDownload(new Blob([file.bytes], { type: file.type }), file.name)
  }

async function downloadZip(items, delay) {
    // 降级仍遵守用户设置的间隔，并固定为浏览器下载，避免中途切换目标导致推送。
    if (typeof JSZip === 'undefined') {
      const result = await runSerialDownload(items, delay, 'JSZip 未加载，逐个下载', downloadBlob)
      return { ...result, notice: 'JSZip 未加载，已改为逐个浏览器下载' }
    }
    const files = []
    const result = await runConcurrentDownload(items, delay, async item => {
      // 完整读取也受网络超时约束；JSZip 不再接收需要异步 FileReader 转换的 Blob。
      const file = await fetchTorrentFile(item)
      files.push({ ...file, title: item.title })
    })
    if (result.success) {
      try {
        const zip = new JSZip()
        for (const file of files) {
          // 同名种子不能覆盖已入包文件。
          let name = file.name
          let suffix = 1
          while (zip.file(name)) name = `${suffix++}_${file.name}`
          zip.file(name, file.bytes, { binary: true })
        }
        setStatus(`正在打包 ${result.success} 个种子：0%（失败 ${result.failed} 个）`)
        const blob = await generateZipBlob(zip, metadata => {
          setStatus(`正在打包 ${result.success} 个种子：${Math.floor(metadata.percent)}%（失败 ${result.failed} 个）`)
        })
        clickDownload(blob, `pt_batch_${new Date().toISOString().slice(0, 10)}.zip`)
      } catch (error) {
        // 不重新 fetch 或导航到下载链接；直接使用已获取的数据，避免重复计数或离开页面。
        const saved = await runSerialDownload(files, delay, 'ZIP 打包失败，逐个下载已获取文件', saveTorrentFile)
        return {
          success: saved.success,
          failed: result.failed + saved.failed,
          notice: 'ZIP 打包失败或无进度超时，已逐个触发浏览器下载；若未出现文件，请允许本页多文件下载'
        }
      }
    }
    return { ...result, notice: result.failed ? '失败项未入 ZIP，请重新选择重试' : '' }
  }

async function fetchTorrentFile(item) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DIRECT_FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(item.downloadUrl, { credentials: 'include', signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (!bytes.byteLength) throw new Error('空文件')
      const name = fileNameFromDisposition(response.headers.get('content-disposition')) || `${item.tid}_${sanitize(item.title)}.torrent`
      const type = response.headers.get('content-type') || 'application/x-bittorrent'
      return { bytes, name, type }
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error(`下载超时（${DIRECT_FETCH_TIMEOUT_MS / 1000} 秒）`)
      throw error
    } finally {
      clearTimeout(timeout)
    }
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

export { batchDownload, downloadTorrent, gmRequest };

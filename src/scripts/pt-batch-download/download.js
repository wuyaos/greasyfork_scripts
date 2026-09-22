import { state } from './config.js';

import { pushToQBittorrent, pushToTransmission } from './downloaders.js';

import { getDownloaderById } from './downloader-settings.js';

import { el } from './controls.js';

import { fileNameFromDisposition, sanitize, setStatus, sleep, uniqueByTid } from './formatting.js';


// 推送/浏览器直下/打包三处共用的串行下载循环：统一进度提示、计数与间隔
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
        const result = await runSerialDownload(items, delay, cfg ? '推送中' : '下载中', downloadTorrent)
        success = result.success
        failed = result.failed
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
    // JSZip 依赖未加载（CDN 被墙/超时）时降级为逐个浏览器下载，避免静默失败
    if (typeof JSZip === 'undefined') {
      return runSerialDownload(items, delay, '下载中', downloadTorrent)
    }
    const zip = new JSZip()
    const result = await runSerialDownload(items, delay, '下载中', async item => {
      try {
        const file = await fetchTorrentBlob(item)
        zip.file(file.name, file.blob)
      } catch (error) {
        fallbackDownload(item.downloadUrl)
        throw error
      }
    })
    if (result.success) {
      const blob = await zip.generateAsync({ type: 'blob' })
      clickDownload(blob, `pt_batch_${new Date().toISOString().slice(0, 10)}.zip`)
    }
    return result
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



export { batchDownload, downloadTorrent, gmRequest };

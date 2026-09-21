import { gmRequest } from './download.js';

import { gmUploadFile } from './upload.js';

import { clean } from './formatting.js';



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



export { pushToQBittorrent, pushToTransmission, testDownloaderConnection };

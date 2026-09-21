import { UNIT_BYTES, state } from './config.js';



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
    const match = String(text || '').match(/(\d+(?:\.\d+)?)\s*([TGMK]i?B|B)\b/i)
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



export { absoluteUrl, clean, cssEscape, escapeRegExp, fileNameFromDisposition, formatBytes, numberOrNull, pageIsDark, parseSize, safeGet, sanitize, setStatus, sizeInputToBytes, sleep, toNumber, uniqueByTid, uniqueId };

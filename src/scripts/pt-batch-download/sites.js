import { CUSTOM_SITES_KEY, DEFAULT_PATHS } from './config.js';

import { adapters, gazelleAdapter, mamAdapter } from './adapters.js';

import { configDownloader } from './downloader-settings.js';

import { button, el } from './controls.js';

import { clean, escapeRegExp, safeGet } from './formatting.js';

import { ensureStyle } from './styles.js';



const SITE_ARCH_MAP = {
    'anthelion.me': gazelleAdapter,
    'gazellegames.net': gazelleAdapter,
    'myanonamouse.net': mamAdapter
  }

function getAdapter() {
    const mapped = SITE_ARCH_MAP[location.hostname.replace(/^www\./, '').toLowerCase()]
    if (mapped && mapped.isListPage()) return mapped
    return adapters.find(a => a.isListPage())
  }

function registerMenus() {
    GM_registerMenuCommand('添加站点', addSite)
    GM_registerMenuCommand('页面管理', manageSites)
    GM_registerMenuCommand('下载器设置', configDownloader)
  }

function shouldRun() {
    return !!getAdapter()
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



export { getAdapter, getCustomSites, isDefaultPath, matchPattern, registerMenus, shouldRun };

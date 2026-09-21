import { state } from './config.js';

import { getAdapter } from './sites.js';

import { applyFilters } from './filters.js';

import { fillMulti, selectedMulti } from './controls.js';

import { clean, toNumber } from './formatting.js';



function refreshTorrents() {
    state.torrents = extractTorrents()
    // 筛选选项来自当前页扫描到的唯一促销标记（去重排序）
    const tags = [...new Set(state.torrents.flatMap(item => item.promotion))].sort()
    fillMulti(state.ui.promotion, tags.map(tag => [tag, tag]), selectedMulti(state.ui.promotion))
    applyFilters(true)
  }

function extractTorrents() {
    return getAdapter()?.extractTorrents() || []
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



export { detectDownloaded, detectSeeders, findSeedRow, refreshTorrents };

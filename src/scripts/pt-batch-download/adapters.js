import { UNIT3D_DL_SELECTOR, UNIT3D_LIST_PATH } from './config.js';

import { getCustomSites, isDefaultPath, matchPattern } from './sites.js';

import { detectDownloaded, detectSeeders, findSeedRow } from './torrents.js';

import { absoluteUrl, clean, cssEscape, parseSize, toNumber } from './formatting.js';



class SiteAdapter {
    constructor(name) { this.name = name }
    isListPage() { return false }
    listRoot() { return document.body }
    extractTorrents() { return [] }
    // 提取行的原始促销标记数组（空数组=普通），子类覆盖以读取架构特有标记
    detectPromoTags(row) { return [] }
    // 通用做种数检测
    detectSeeders(row) { return detectSeeders(row) }
    // 通用已下载状态检测
    detectDownloaded(row) { return detectDownloaded(row) }
  }

class NexusPHPAdapter extends SiteAdapter {
    isListPage() { return isDefaultPath() || getCustomSites().some(pattern => matchPattern(pattern, location.href)) }
    listRoot() { return document.querySelector('table.torrents, table.torrenttable, #torrenttable') || document.body }
    extractTorrents() {
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
          tid, title, downloadUrl,
          detailUrl: detailLink ? absoluteUrl(detailLink.getAttribute('href')) : '',
          size: size || '-',
          sizeBytes: parseSize(size),
          seeders: this.detectSeeders(row),
          promotion: this.detectPromoTags(row),
          downloaded: this.detectDownloaded(row)
        })
      })
      return items
    }
    // NexusPHP 促销标记多为单个 img：优先读 alt/title/文本，无文本时按 class 归一化兜底
    detectPromoTags(row) {
      const tags = []
      const imgs = [...row.querySelectorAll('img[class], img[alt], img[title]')]
      for (const img of imgs) {
        const cls = img.className || ''
        const alt = img.getAttribute('alt') || ''
        const title = img.getAttribute('title') || ''
        const src = img.getAttribute('src') || ''
        const raw = `${cls} ${alt} ${title} ${src}`
        if (/free2up|2upfree|2\s*x\s*free|free\s*2\s*x|2x\s*免费|免费\s*2x|2x\s*免費|免費\s*2x/i.test(raw)) tags.push('2X免费')
        else if (/50down2up|2up50down|2\s*x.*50%|50%.*2\s*x/i.test(raw)) tags.push('2X 50%')
        else if (/\bfree\b|免费|免費|pro_free/i.test(raw)) tags.push('免费')
        else if (/2up|2\s*x|2x|双倍上传|雙倍上傳|doubleup|double\s*upload/i.test(raw)) tags.push('2X')
        else if (/50down|50%|半价/i.test(raw)) tags.push('50%')
        else if (/30down|30%|三折/i.test(raw)) tags.push('30%')
      }
      // 党 img 未覆盖时，扫描行文本兼底（含繁简体），避免遗漏纯文本型促销标记
      if (!tags.length) {
        const text = clean(row.textContent)
        if (/free2up|2upfree|2\s*x\s*free|free\s*2\s*x|2x\s*免费|免费\s*2x|2x\s*免費|免費\s*2x/i.test(text)) tags.push('2X免费')
        else if (/\bfree\b|免费|免費|pro_free/i.test(text)) tags.push('免费')
        else if (/2up|2\s*x|2x|双倍上传|雙倍上傳|doubleup|double\s*upload/i.test(text)) tags.push('2X')
        else if (/50down|50%|半价/i.test(text)) tags.push('50%')
        else if (/30down|30%|三折/i.test(text)) tags.push('30%')
      }
      return [...new Set(tags)]
    }
  }

class Unit3DAdapter extends SiteAdapter {
    isListPage() { return location.pathname === UNIT3D_LIST_PATH && !!document.querySelector(UNIT3D_DL_SELECTOR) }
    listRoot() { return document.querySelector('table.data-table, [class*=torrent-search--list]') || document.body }
    extractTorrents() {
      const items = []
      const seen = new Set()
      document.querySelectorAll(UNIT3D_DL_SELECTOR).forEach(link => {
        const href = link.getAttribute('href') || ''
        const tid = (href.match(/\/torrents\/download\/(\d+)/) || [])[1]
        if (!tid || seen.has(tid)) return
        seen.add(tid)
        const row = link.closest('tr') || link
        const nameLink = row.querySelector(`a[href$="/torrents/${cssEscape(tid)}"]`) || row.querySelector('a[class*="__name"]')
        const sizeCell = row.querySelector('[class*="__size"]')
        const seederCell = row.querySelector('[class*="__seeders"]')
        const sizeText = clean(sizeCell?.textContent) || clean(row.textContent)
        const size = (sizeText.match(/\d+(?:\.\d+)?\s*[TGMK]i?B/i) || [''])[0]
        const title = clean(nameLink?.textContent) || link.getAttribute('title') || `Torrent ${tid}`
        items.push({
          tid, title,
          downloadUrl: absoluteUrl(href),
          detailUrl: nameLink ? absoluteUrl(nameLink.getAttribute('href')) : '',
          size: size || '-',
          sizeBytes: parseSize(size),
          seeders: seederCell ? toNumber(seederCell.textContent) : this.detectSeeders(row),
          promotion: this.detectPromoTags(row),
          downloaded: this.detectDownloaded(row)
        })
      })
      return items
    }
    // Unit3D/darkland 促销为 FontAwesome <i> 图标：直接读取 title 原文作为标记，多标记自然组合
    detectPromoTags(row) {
      const tags = []
      row.querySelectorAll('i.torrent-icons__freeleech, i[title*="免费"], i[title*="免費"]').forEach(icon => {
        const title = clean(icon.getAttribute('title'))
        if (title) tags.push(title)
      })
      row.querySelectorAll('i.torrent-icons__double-upload, i[title*="双倍上传"], i[title*="雙倍上傳"]').forEach(icon => {
        const title = clean(icon.getAttribute('title'))
        if (title) tags.push(title)
      })
      return [...new Set(tags)]
    }
  }

const GAZELLE_TGMK_RE = /\d+(?:\.\d+)?\s*[TGMK]i?B/i

const GAZELLE_SIZE_RE = /\d+(?:\.\d+)?\s*(?:[TGMK]i?B|B)\b/i

class GazelleAdapter extends SiteAdapter {
    isListPage() {
      // Gazelle 架构（GGn/Anthelion 等）列表页与单组详情页结构统一，按 DOM 特征识别而非 hostname
      if (location.pathname !== '/torrents.php') return false
      // action=download 是 .torrent 二进制响应页，非列表
      if (new URLSearchParams(location.search).get('action') === 'download') return false
      return !!document.querySelector('table.torrent_table tr.group_torrent')
    }
    listRoot() {
      return document.querySelector('table.torrent_table') || document.body
    }
    extractTorrents() {
      const items = []
      const seen = new Set()
      const groupId = new URLSearchParams(location.search).get('id') || ''
      document.querySelectorAll('table.torrent_table tr.group_torrent').forEach(row => {
        const dl = [...row.querySelectorAll('a')].find(a => /(?:^|[?&])action=download(?:&|$|#)/.test(a.getAttribute('href') || ''))
        if (!dl) return
        const tid = new URL(dl.getAttribute('href'), location.href).searchParams.get('id')
        if (!tid || seen.has(tid)) return
        seen.add(tid)
        // 首格菜单链接（DL/FL/RP/ED/PL）后紧跟长文本标题锚点；单组页标题锚点无 href，回退构造详情页
        const cellLinks = [...(row.cells[0]?.querySelectorAll('a') || [])]
        const nameLink = cellLinks.find(a => clean(a.textContent).length > 4)
        const nameHref = nameLink ? absoluteUrl(nameLink.getAttribute('href') || '') : ''
        const detailUrl = nameLink && /torrents\.php\?id=\d+&(?:[^#]*&)?torrentid=\d+/.test(nameLink.getAttribute('href') || '')
          ? nameHref
          : groupId ? absoluteUrl(`torrents.php?id=${groupId}&torrentid=${tid}`) : ''
        const cells = [...row.cells]
        // 体积列：跳过头格（菜单链接+标题，含版本串易误匹配），先找 TGMK 单位，未命中再找整格裸 B
        let sizeIndex = cells.findIndex((cell, idx) => idx > 0 && GAZELLE_TGMK_RE.test(cell.textContent))
        if (sizeIndex < 0) sizeIndex = cells.findIndex((cell, idx) => idx > 0 && /^\s*\d+(?:\.\d+)?\s*B\b/i.test(cell.textContent))
        const size = sizeIndex >= 0 ? (clean(cells[sizeIndex].textContent).match(GAZELLE_SIZE_RE) || ['-'])[0] : '-'
        items.push({
          tid, title: clean(nameLink?.textContent) || `Torrent ${tid}`,
          downloadUrl: absoluteUrl(dl.getAttribute('href')),
          detailUrl,
          size: size || '-',
          sizeBytes: parseSize(size),
          seeders: this.detectSeeders(row),
          promotion: this.detectPromoTags(row),
          downloaded: this.detectDownloaded(row)
        })
      })
      return items
    }
    // GGn 做种数列紧跟体积列（单组页无 username 列时仍然成立）；体积列限定在标题格之后查找，避免版本串（如 "1.5.1B"）误当体积导致做种数回退到标题内数字
    detectSeeders(row) {
      const cells = row.cells ? [...row.cells] : []
      let sizeIndex = cells.findIndex((cell, idx) => idx > 0 && GAZELLE_TGMK_RE.test(cell.textContent))
      if (sizeIndex < 0) sizeIndex = cells.findIndex((cell, idx) => idx > 0 && /^\s*\d+(?:\.\d+)?\s*B\b/i.test(cell.textContent))
      if (sizeIndex >= 0 && cells[sizeIndex + 1]) return toNumber(cells[sizeIndex + 1].textContent)
      const nums = clean(row.textContent).match(/\b\d+\b/g) || []
      return nums.length ? parseInt(nums[0], 10) : null
    }
    // Gazelle 促销：strong.torrent_label 的 class tl_free/tl_2x_free 等（GGn/Anthelion 通用）
    detectPromoTags(row) {
      const tags = []
      row.querySelectorAll('strong.torrent_label, .torrent_label').forEach(label => {
        const raw = `${label.className || ''} ${clean(label.textContent)}`
        if (/tl_2x_free|2x\s*free|2x\s*免费/i.test(raw)) tags.push('2X免费')
        else if (/tl_free|freeleech|免费/i.test(raw)) tags.push('免费')
        else if (/tl_2x|double/i.test(raw)) tags.push('2X')
        else if (/tl_50|50%/.test(raw)) tags.push('50%')
      })
      return [...new Set(tags)]
    }
  }

class MamAdapter extends SiteAdapter {
    isListPage() {
      if (!['/tor/search.php', '/freeleech.php'].includes(location.pathname)) return false;
      return !!document.querySelector('a[href*="/tor/download.php/"]');
    }
    listRoot() { return document.querySelector('table') || document.body; }
    extractTorrents() {
      const items = [];
      const seen = new Set();
      document.querySelectorAll('a[href*="/tor/download.php/"]').forEach(link => {
        const href = link.getAttribute('href') || '';
        const row = link.closest('tr') || link.parentElement;
        const detailLink = row?.querySelector('a[href^="/t/"]');
        const tid = row?.dataset.tid
          || (href.match(/[?&]tid=(\d+)/) || [])[1]
          || (detailLink?.getAttribute('href') || '').match(/\/t\/(\d+)/)?.[1] || '';
        if (!tid || seen.has(tid)) return;
        seen.add(tid);
        const rowText = clean(row.textContent);
        const size = (rowText.match(/\d+(?:\.\d+)?\s*[TGMK]i?B/i) || [''])[0];
        const title = clean(detailLink?.textContent) || `Torrent ${tid}`;
        items.push({
          tid, title,
          downloadUrl: absoluteUrl(href),
          detailUrl: detailLink ? absoluteUrl(detailLink.getAttribute('href')) : '',
          size: size || '-',
          sizeBytes: parseSize(size),
          seeders: this.detectSeeders(row),
          promotion: this.detectPromoTags(row),
          downloaded: this.detectDownloaded(row)
        });
      });
      return items;
    }
    // MAM: 体积(sizeIndex) 后是时间 cell，做种在 sizeIndex+2
    detectSeeders(row) {
      const cells = row.cells ? [...row.cells] : [];
      const sizeIndex = cells.findIndex(c => /\d+(?:\.\d+)?\s*[TGMK]i?B/i.test(c.textContent));
      const cell = sizeIndex >= 0 ? cells[sizeIndex + 2] : null;
      if (!cell) return null;
      // MAM 做种/下种/完成在一个 cell 的多个 <p>：取第一个 p（seeder）
      const p = cell.querySelector('p');
      return toNumber(p ? p.textContent : cell.textContent);
    }
    // MAM 促销: img alt/title/src 含 freeleech→免费, 2x→2X 等
    detectPromoTags(row) {
      const tags = [];
      row.querySelectorAll('img[src], img[alt], img[title]').forEach(img => {
        const raw = `${img.className || ''} ${img.alt || ''} ${img.title || ''} ${img.src || ''}`;
        if (/free2up|2upfree/i.test(raw)) tags.push('2X免费');
        else if (/\bfree\b|freeleech|免费/i.test(raw)) tags.push('免费');
        else if (/2up|\b2x\b|double/i.test(raw)) tags.push('2X');
      });
      return [...new Set(tags)];
    }
  }

const unit3dAdapter = new Unit3DAdapter()

const gazelleAdapter = new GazelleAdapter()

const mamAdapter = new MamAdapter()

const nexusAdapter = new NexusPHPAdapter()

const adapters = [unit3dAdapter, gazelleAdapter, mamAdapter, nexusAdapter]



export { adapters, gazelleAdapter, mamAdapter };

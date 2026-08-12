// ==UserScript==
// @name         PT_AuditAssistant
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.1.0
// @description  聚合 PT 审种助手，基于注册表驱动的站点采集、解析、规则检查与审批拦截。
// @author       wuyaos & AI
// @match        *://*.pandapt.net/details.php*
// @match        *://pandapt.net/details.php*
// @match        *://*.qingwapt.com/details.php*
// @match        *://qingwapt.com/details.php*
// @match        *://*.new.qingwa.pro/details.php*
// @match        *://new.qingwa.pro/details.php*
// @match        *://*.qingwapt.org/details.php*
// @match        *://qingwapt.org/details.php*
// @match        *://*.hdkyl.in/details.php*
// @match        *://hdkyl.in/details.php*
// @match        *://*.hdkyl.in/web/torrent-approval-page*
// @match        *://hdkyl.in/web/torrent-approval-page*
// @match        *://*.cspt.top/details.php*
// @match        *://cspt.top/details.php*
// @match        *://*.cspt.cc/details.php*
// @match        *://cspt.cc/details.php*
// @match        *://*.cspt.date/details.php*
// @match        *://cspt.date/details.php*
// @match        *://*.longpt.org/details.php*
// @match        *://longpt.org/details.php*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @license      MIT
// @downloadURL  https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_AuditAssistant.user.js
// @updateURL    https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_AuditAssistant.user.js
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/pt-audit.png
// @noframes
// ==/UserScript==

// Derived from Panda-Torrent-Assistant / qingwa-torrent-assistant / HDKylin-Torrent-Assistant / CS-Torrent-Assistant (SpringSunday 系)。
// 非各站官方工具，检测结果仅作辅助参考，最终以站点规则与人工审核为准。

(function () {
  'use strict';

  // Utilities
  const ID = 'pt-audit-assistant';
  const AUTO_APPROVAL_KEY = 'pt_audit_assistant_auto_approval';
  const AUTO_CLOSE_KEY = 'pt_audit_assistant_auto_close';
  const DEBUG_KEY = 'pt_audit_assistant_debug';
  const ONE_TIB = 1024 ** 4;
  const DEFAULT_COLLECTORS = ['title', 'desc', 'siteMeta', 'tags', 'mediainfo', 'screenshots', 'size', 'approvalLink'];
  const DEFAULT_PARSERS = ['title', 'mediainfo', 'dbLinks', 'doubanScore', 'derived'];

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
  function clean(text) { return String(text || '').replace(/ /g, ' ').replace(/[ \t\r\n]+/g, ' ').trim(); }
  function lower(text) { return String(text || '').toLowerCase(); }
  function hasChinese(text) { return /[一-鿿]/.test(String(text || '')); }
  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'style') node.style.cssText = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value === true ? '' : String(value));
    });
    kids.flat().forEach(kid => {
      if (kid == null) return;
      node.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    });
    return node;
  }
  function getValue(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback; }
    catch (err) { return fallback; }
  }
  function setValue(key, value) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, value); }
    catch (err) { /* ignored */ }
  }
  function addStyle(css) {
    if (typeof GM_addStyle === 'function') GM_addStyle(css);
    else document.head.appendChild(el('style', { text: css }));
  }
  function toBytes(text) {
    const m = String(text || '').replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)\s*(B|KB|KiB|MB|MiB|GB|GiB|TB|TiB|PB|PiB)/i);
    if (!m) return null;
    const n = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    const map = { b: 1, kb: 1000, kib: 1024, mb: 1000 ** 2, mib: 1024 ** 2, gb: 1000 ** 3, gib: 1024 ** 3, tb: 1000 ** 4, tib: 1024 ** 4, pb: 1000 ** 5, pib: 1024 ** 5 };
    return isFinite(n) && map[u] ? n * map[u] : null;
  }
  function selectedText(selector) {
    const node = $(selector);
    if (!node) return '';
    if (node.tagName === 'SELECT') return clean(node.options[node.selectedIndex]?.textContent || node.value);
    return clean(node.value || node.textContent);
  }
  function selectedValue(selector) {
    const node = $(selector);
    if (!node) return '';
    return clean(node.value || node.getAttribute('value') || '');
  }
  function firstMatch(text, patterns) {
    for (const item of patterns || []) {
      const re = item.re || item;
      const match = String(text || '').match(re);
      if (match) return item.value || match[1] || match[0];
    }
    return '';
  }
  function normalizeResolution(text) {
    const m = String(text || '').match(/\b(2160|1440|1080|720|576|480)[pi]\b|\b(4K|UHD)\b/i);
    if (!m) return { resolution: '', height: null };
    if (m[2]) return { resolution: '2160p', height: 2160 };
    return { resolution: `${m[1]}p`, height: Number(m[1]) };
  }
  function isTagSet(ctx, tag) { return Boolean(ctx.tags.normalized && ctx.tags.normalized.has(tag)); }
  function getTorrentId() {
    const p = new URLSearchParams(location.search);
    return p.get('id') || p.get('torrent_id') || (location.href.match(/[?&]id=(\d+)/) || [])[1] || '';
  }
  function gmRequest(opts) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest unavailable'));
        return;
      }
      GM_xmlhttpRequest(Object.assign({}, opts, { onload: resolve, onerror: reject, ontimeout: reject }));
    });
  }

  // Registries
  function createRegistry(name) {
    const items = new Map();
    return {
      register(id, value) {
        if (!id || !value) throw new Error(`${name} register requires id and value`);
        items.set(id, value);
        return value;
      },
      get(id) { return items.get(id); },
      list() { return Array.from(items.keys()); },
      run(ids, ctx, site) {
        const results = [];
        (ids || this.list()).forEach(id => {
          const item = items.get(id);
          if (!item) return;
          const out = item.run(ctx, site);
          if (Array.isArray(out)) results.push(...out);
        });
        return results;
      }
    };
  }
  const SiteRegistry = createRegistry('SiteRegistry');
  SiteRegistry.detect = function detect() {
    const host = location.hostname.toLowerCase();
    const path = location.pathname.toLowerCase();
    return this.list().map(id => this.get(id)).find(site => site.hosts.some(h => host === h || host.endsWith(`.${h}`)) && site.paths.some(p => p.test(path)));
  };
  const CollectorRegistry = createRegistry('CollectorRegistry');
  CollectorRegistry.run = async function runCollectors(ids, ctx, site) {
    const results = [];
    for (const id of (ids || this.list())) {
      const item = this.get(id);
      if (!item) continue;
      const out = await (item.run ? item.run(ctx, site) : item(ctx, site));
      if (Array.isArray(out)) results.push(...out);
    }
    return results;
  };
  const ParserRegistry = createRegistry('ParserRegistry');
  const ApprovalRegistry = createRegistry('ApprovalRegistry');
  const RuleRegistry = createRegistry('RuleRegistry');
  RuleRegistry.run = function runRules(bindings, ctx, site) {
    const findings = [];
    const suppressed = new Set();
    (site.suppressions || []).forEach(s => {
      const ids = s.when?.categoryIds || [];
      const texts = s.when?.categoryTexts || [];
      const categoryId = ctx.siteMeta.categoryId;
      const categoryText = ctx.siteMeta.categorySelected;
      if ((ids.length && categoryId && ids.includes(categoryId)) || (texts.length && categoryText && texts.some(v => lower(categoryText).includes(lower(v))))) {
        (bindings || []).forEach(b => { if (!(s.exceptRules || []).includes(b.id)) suppressed.add(b.id); });
      }
    });
    (bindings || []).forEach(binding => {
      if (!binding || binding.enabled === false || suppressed.has(binding.id)) return;
      const rule = this.get(binding.id);
      if (!rule) {
        findings.push({ severity: 'warning', code: 'RULE_UNKNOWN', message: `未知规则：${binding.id}` });
        return;
      }
      const out = rule.run(ctx, site, binding.params || {}, binding) || [];
      findings.push(...out.map(f => Object.assign({}, f, { severity: binding.severity || f.severity || 'error' })));
    });
    return findings;
  };

  function createContext() {
    return {
      title: { raw: '', clean: '', lower: '', hasChinese: false, hasComplete: false, isEpisode: false, isSeasonPack: false, positions: {}, audioToken: '', hasAudioChannel: false },
      desc: { text: '', lower: '', html: '', containsMediainfo: false, containsForbidReseed: false },
      mediainfo: { raw: '', compact: '', kind: 'empty', empty: true, containsBBCode: false, unparsed: false },
      screenshots: { urls: [], count: 0, images: [] },
      siteMeta: { subtitle: '', categoryId: '', categorySelected: '', typeId: '', encodeId: '', audioId: '', resolutionId: '', groupId: '', groupSelected: '' },
      tags: { raw: '', normalized: new Set(), flags: {} },
      size: { raw: '', bytes: null, isBiggerThan1T: false },
      parsed: { source: '', medium: '', codec: '', audio: '', resolution: '', resolutionHeight: null, hdr: '', isHdr: false, isHdr10: false, isHdr10Plus: false, isDolbyVision: false, fps: null, bitrateMbps: null, audioLanguages: [], textLanguages: [], hasMandarinAudio: false, hasCantoneseAudio: false, hasChineseSubtitle: false, hasEnglishSubtitle: false },
      dbLinks: { hasAny: false, hasImdb: false, hasDouban: false, hasTmdb: false, hasBangumi: false, urls: [] },
      doubanScore: null,
      derived: { officialSeed: false, officialMusicSeed: false, godDramaSeed: false, vcbStudioSeed: false, haresSeed: false, isDIY: false },
      approval: { actionContainer: null, nativeReviewLink: null },
      findings: [],
      debug: {}
    };
  }

  // Collectors
  CollectorRegistry.register('title', {
    run(ctx) {
      const raw = clean($('#top')?.textContent || $('h1')?.textContent || document.title);
      const stripped = raw.replace(/\s*(禁转|禁傳|禁止转载|禁止轉載|\((?:已审|已審|冻结|凍結|待定)\)|\[(?:免费|免費|50%|2X免费|2X免費|30%|VIP|置顶|置頂|热门|熱門)\]|剩(?:余|餘)时(?:间|間)[：:]\s*[\d\s天時时分秒]+)\s*/gi, ' ').trim();
      ctx.title.raw = raw;
      ctx.title.clean = clean(stripped);
      ctx.title.lower = lower(ctx.title.clean);
      ctx.title.hasChinese = hasChinese(ctx.title.clean);
      ctx.title.hasComplete = /\bcomplete\b|完结|完結/i.test(ctx.title.clean);
      ctx.title.isEpisode = /\bS\d{1,2}\s*E\d{1,3}\b|\bEP?\d{1,3}\b/i.test(ctx.title.clean);
      ctx.title.isSeasonPack = /\bS\d{1,2}\b(?!\s*E\d)|\bS\d{1,2}\s*-\s*S?\d{1,2}\b/i.test(ctx.title.clean);
    }
  });
  CollectorRegistry.register('desc', {
    run(ctx) {
      const node = $('#kdescr') || $('#descr') || $('[id*=descr]');
      ctx.desc.text = clean(node?.textContent || '');
      ctx.desc.lower = lower(ctx.desc.text);
      ctx.desc.html = node?.innerHTML || '';
      ctx.desc.containsMediainfo = /mediainfo|general\s*(unique id|complete name|format)|video\s*\n|视频\s*[:：]?/i.test(ctx.desc.text);
      ctx.desc.containsForbidReseed = /禁转|禁止转载|禁止轉載|do not re-?upload|no re-?seed/i.test(ctx.desc.text);
    }
  });
  CollectorRegistry.register('siteMeta', {
    run(ctx, site) {
      const labels = site.fieldLabels || {};
      const labelMap = {};
      $$('#outer tr').forEach(tr => {
        const cells = $$('td', tr);
        if (cells.length < 2) return;
        const label = clean(cells[0].textContent).replace(/[：:]$/, '');
        if (!label) return;
        labelMap[label] = cells[cells.length - 1];
      });
      function readBy(names) {
        for (const name of names || []) {
          const node = labelMap[name];
          if (node) return { node, text: clean(node.textContent), html: node.innerHTML };
        }
        return { node: null, text: '', html: '' };
      }
      ctx.debug.labelMapKeys = Object.keys(labelMap);
      ctx.siteMeta.subtitle = readBy(labels.subtitle || ['副标题', '副標題']).text;
      const basic = readBy(labels.basic || ['基本信息', '基本資料', '基本信息:']);
      const action = readBy(labels.action || ['行为', '行為']);
      ctx.debug.basicText = basic.text;
      ctx.debug.actionText = action.text;
      ctx.siteMeta.categoryId = selectedValue('select[name="type"], select[name="cat"], select[name="category"], input[name="type"], input[name="cat"]');
      ctx.siteMeta.categorySelected = selectedText('select[name="type"], select[name="cat"], select[name="category"], input[name="type"], input[name="cat"]');
      ctx.siteMeta.typeId = selectedValue('select[name="medium_sel"], select[name="medium"], select[name="type_sel"]');
      ctx.siteMeta.encodeId = selectedValue('select[name="codec_sel"], select[name="codec"], select[name="encode"]');
      ctx.siteMeta.audioId = selectedValue('select[name="audiocodec_sel"], select[name="audio"], select[name="standard"]');
      ctx.siteMeta.resolutionId = selectedValue('select[name="resolution_sel"], select[name="resolution"]');
      ctx.siteMeta.groupId = selectedValue('select[name="team_sel"], select[name="team"], select[name="team_id"]');
      ctx.siteMeta.groupSelected = selectedText('select[name="team_sel"], select[name="team"], select[name="team_id"]') || firstMatch(basic.text, [{ re: /制作组\s*[:：]\s*([^\s]+)/i }, { re: /製作組\s*[:：]\s*([^\s]+)/i }, { re: /小组\s*[:：]\s*([^\s]+)/i }]);
      ctx.debug.metaSelections = {
        medium: selectedText('select[name="medium_sel"], select[name="medium"], select[name="type_sel"]'),
        codec: selectedText('select[name="codec_sel"], select[name="codec"], select[name="encode"]'),
        audio: selectedText('select[name="audiocodec_sel"], select[name="audio"], select[name="standard"]'),
        resolution: selectedText('select[name="resolution_sel"], select[name="resolution"]')
      };
      if (action.node) ctx.approval.actionContainer = action.node;
    }
  });
  CollectorRegistry.register('tags', {
    run(ctx, site) {
      const labelNames = site.fieldLabels?.tags || ['标签', '標籤'];
      let tagCell = null;
      $$('#outer tr').some(tr => {
        const cells = $$('td', tr);
        if (cells.length < 2) return false;
        const label = clean(cells[0].textContent).replace(/[：:]$/, '');
        if (labelNames.includes(label)) { tagCell = cells[cells.length - 1]; return true; }
        return false;
      });
      // 自适应标签 DOM：span/a/div/li 叶子优先，回退整段文本；兼容各站彩色标签 chip 与纯文本写法。
      let tagTexts = [];
      if (tagCell) {
        const leaves = tagCell.querySelectorAll('span, a, div, li');
        if (leaves.length) tagTexts = Array.from(leaves).map(n => clean(n.textContent)).filter(Boolean);
        else { const t = clean(tagCell.textContent); if (t) tagTexts = [t]; }
      }
      ctx.tags.raw = tagTexts.join(' ');
      ctx.tags.tagTexts = tagTexts;
      const normalized = new Set();
      const map = Object.assign({}, defaultTagTextMap(), site.tagTextMap || {});
      // 归一化（去空白+小写）后逐个标签匹配，精确优先避免「HDR」子串误命中「HDR10」。
      const norm = s => String(s || '').replace(/\s+/g, '').toLowerCase();
      const entries = Object.keys(map).map(k => ({ nkey: norm(k), id: map[k] })).sort((a, b) => b.nkey.length - a.nkey.length);
      for (const text of tagTexts) {
        const nt = norm(text);
        if (!nt) continue;
        const hit = entries.find(e => e.nkey === nt) || entries.find(e => nt.includes(e.nkey));
        if (hit) normalized.add(hit.id);
      }
      ctx.tags.normalized = normalized;
      const flags = {};
      normalized.forEach(tag => { flags[tag] = true; });
      ctx.tags.flags = flags;
    }
  });
  CollectorRegistry.register('mediainfo', {
    run(ctx, site) {
      const labelNames = site.fieldLabels?.mediainfo || ['MediaInfo', 'Mediainfo', '媒体信息', '媒體信息', 'BDInfo'];
      let raw = '';
      $$('#outer tr').some(tr => {
        const cells = $$('td', tr);
        if (cells.length < 2) return false;
        const label = clean(cells[0].textContent).replace(/[：:]$/, '');
        if (labelNames.some(n => label.toLowerCase().includes(n.toLowerCase()))) {
          raw = (cells[cells.length - 1].innerText || cells[cells.length - 1].textContent || '').trim();
          return true;
        }
        return false;
      });
      if (!raw && ctx.desc.containsMediainfo) raw = ($('#kdescr')?.innerText || ctx.desc.text || '').trim();
      ctx.mediainfo.raw = raw;
      ctx.mediainfo.compact = raw.replace(/\s+/g, '');
      ctx.mediainfo.empty = !clean(raw);
      ctx.mediainfo.kind = ctx.mediainfo.empty ? 'empty' : (/bdinfo/i.test(raw) ? 'bdinfo' : (/mediainfo|general|video|audio|text|视频|音频|文本/i.test(raw) ? 'mediainfo' : 'unknown'));
      ctx.mediainfo.containsBBCode = /\[(?:b|i|u|color|size|font|quote|code|img|url)(?:=|\])/i.test(raw);
    }
  });
  CollectorRegistry.register('screenshots', {
    async run(ctx, site) {
      const kdescr = $('#kdescr');
      const scopeFound = Boolean(kdescr);
      ctx.screenshots.scopeFound = scopeFound;
      const scope = kdescr || document;
      const images = scopeFound ? $$('img', scope).filter(img => {
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        return src && !/smilies|avatar|logo|icon/i.test(src);
      }) : [];
      const timeout = (site.rules || []).find(r => r.id === 'screenshotValid')?.params?.timeout || 30000;
      const states = await Promise.all(images.map(img => new Promise(resolve => {
        const url = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        const done = broken => resolve({ url, naturalWidth: img.naturalWidth || 0, naturalHeight: img.naturalHeight || 0, complete: Boolean(img.complete), broken: Boolean(broken) });
        if (img.complete) {
          done(!img.naturalWidth || !img.naturalHeight);
          return;
        }
        const timer = setTimeout(() => done(true), timeout);
        img.addEventListener('load', () => { clearTimeout(timer); done(false); }, { once: true });
        img.addEventListener('error', () => { clearTimeout(timer); done(true); }, { once: true });
      })));
      const urls = states.map(img => img.url).filter(Boolean);
      ctx.screenshots.images = states;
      ctx.screenshots.urls = Array.from(new Set(urls));
      ctx.screenshots.count = ctx.screenshots.urls.length;
    }
  });
  CollectorRegistry.register('size', {
    run(ctx) {
      let raw = '';
      $$('#outer tr').some(tr => {
        const cells = $$('td', tr);
        if (cells.length < 2) return false;
        const label = clean(cells[0].textContent).replace(/[：:]$/, '');
        if (/大小|尺寸|体积|體積|Size/i.test(label)) {
          raw = clean(cells[cells.length - 1].textContent);
          return true;
        }
        return false;
      });
      if (!raw) raw = firstMatch(document.body.textContent, [{ re: /(?:大小|Size)\s*[:：]?\s*([0-9.,]+\s*(?:KiB|MiB|GiB|TiB|KB|MB|GB|TB))/i }]);
      const bytes = toBytes(raw);
      ctx.size.raw = raw;
      ctx.size.bytes = bytes;
      ctx.size.isBiggerThan1T = bytes != null && bytes >= ONE_TIB;
    }
  });
  CollectorRegistry.register('approvalLink', {
    run(ctx) {
      const link = $$('a').find(a => /审核|審核|通过|通過|approval|review/i.test(a.textContent + ' ' + (a.href || '')) && /approval|review|audit|modtask|action/i.test(a.href || a.textContent));
      ctx.approval.nativeReviewLink = link || null;
    }
  });

  // Parsers
  ParserRegistry.register('title', {
    run(ctx) {
      const t = ctx.title.clean;
      const tl = ctx.title.lower;
      ctx.parsed.source = firstMatch(t, [{ re: /\b(BluRay|UHD\s*BluRay|WEB[- ]?DL|WEBRip|HDTV|DVDRip|CD|DVD)\b/i }]);
      ctx.parsed.medium = firstMatch(t, [{ re: /\b(REMUX|BDRip|BluRay|WEB[- ]?DL|WEBRip|HDTV|Encode|DVD|CD)\b/i }]);
      ctx.parsed.codec = firstMatch(t, [{ re: /\b(x264|x265|H\.264|H\.265|HEVC|AVC|AV1|VC-1|MPEG-2)\b/i }]);
      ctx.parsed.audio = firstMatch(t, [{ re: /\b(Atmos|TrueHD|DTS[- ]?HD(?: MA)?|DTS:X|DTS|DDP?\+?|AAC|FLAC|LPCM|AC3|EAC3)\b/i }]);
      const res = normalizeResolution(t);
      ctx.parsed.resolution = res.resolution;
      ctx.parsed.resolutionHeight = res.height;
      ctx.parsed.isHdr10Plus = /HDR10\+|HDR10Plus/i.test(t);
      ctx.parsed.isHdr10 = !ctx.parsed.isHdr10Plus && /\bHDR10\b/i.test(t);
      ctx.parsed.isDolbyVision = /\bDV\b|Dolby\s*Vision/i.test(t);
      ctx.parsed.isHdr = ctx.parsed.isHdr10 || ctx.parsed.isHdr10Plus || ctx.parsed.isDolbyVision || /\bHDR\b/i.test(tl);
      ctx.title.positions = {
        resolution: t.search(/\b(?:2160|1440|1080|720|576|480)[pi]\b|\b(?:4K|UHD)\b/i),
        source: t.search(/\b(?:BluRay|WEB[- ]?DL|WEBRip|HDTV|DVDRip|DVD)\b/i),
        video: t.search(/\b(?:x264|x265|H\.264|H\.265|HEVC|AVC|AV1)\b/i),
        audio: t.search(/\b(?:Atmos|TrueHD|DTS|DDP?\+?|AAC|FLAC|LPCM|AC3|EAC3)\b/i),
        hdr: t.search(/HDR10\+|HDR10|Dolby\s*Vision|\bDV\b|\bHDR\b/i)
      };
      // 标题音频 token 与声道数（X.Y），用于声道数标示检查
      const audioMatch = t.match(/\b(DD[P\+]?|FLAC|LPCM|AC3|AV3A|OPUS|TrueHD|DTS([: -]?X|-?HD ?(M|HR)A)?) ?(\d[ \.]?\d)?/);
      if (audioMatch) {
        ctx.title.audioToken = audioMatch[0];
        ctx.title.hasAudioChannel = /\d[ \.]\d/.test(audioMatch[0]);
      }
    }
  });
  ParserRegistry.register('mediainfo', {
    run(ctx) {
      const raw = ctx.mediainfo.raw || '';
      const video = videoSection(raw);
      const br = parseBitrate(video);
      const fps = parseFps(video || raw);
      if (br != null) ctx.parsed.bitrateMbps = br;
      if (fps != null) ctx.parsed.fps = fps;
      const videoClean = video.replace(/^Encoding settings\s*:.*$/gmi, '');
      const hasHdr10Plus = /SMPTE\s*ST\s*2094|HDR10\+/i.test(videoClean);
      const hasDolbyVision = /Dolby\s*Vision|dvhe\.|dvh1\./i.test(videoClean);
      if (hasHdr10Plus) ctx.parsed.isHdr10Plus = true;
      if (hasDolbyVision) ctx.parsed.isDolbyVision = true;
      if (/\bHDR10\b|HDR\s*10|ST\s*2086|\bHLG\b|Transfer characteristics\s*[:：]\s*PQ/i.test(videoClean) || hasHdr10Plus || hasDolbyVision) ctx.parsed.isHdr = true;
      const all = `${raw}\n${ctx.desc.text}`;
      ctx.parsed.hasMandarinAudio = /Audio[\s\S]{0,500}(?:Language\s*[:：]\s*(?:Chinese|Mandarin|国语|普通话|中文)|Title\s*[:：].*(?:Mandarin|国语|普通话))/i.test(all);
      ctx.parsed.hasCantoneseAudio = /Audio[\s\S]{0,500}(?:Language\s*[:：]\s*(?:Cantonese|粤语|粵語)|Title\s*[:：].*(?:Cantonese|粤语|粵語))/i.test(all);
      ctx.parsed.hasChineseSubtitle = /Text[\s\S]{0,400}(?:Language\s*[:：]\s*(?:Chinese|中文|简体|繁體|繁体)|Title\s*[:：].*(?:Chinese|中文|简体|繁體|繁体|中字))/i.test(all);
      ctx.parsed.hasEnglishSubtitle = /Text[\s\S]{0,400}(?:Language\s*[:：]\s*English|Title\s*[:：].*(?:English|英字))/i.test(all);
      ctx.parsed.audioLanguages = languageMatches(all, 'Audio');
      ctx.parsed.textLanguages = languageMatches(all, 'Text');
    }
  });
  ParserRegistry.register('dbLinks', {
    run(ctx) {
      const urls = $$('a', $('#kdescr') || document).map(a => a.href || '').filter(Boolean);
      const text = `${ctx.desc.text}\n${urls.join('\n')}`;
      ctx.dbLinks.urls = urls.filter(u => /imdb|douban|themoviedb|tmdb|bangumi/i.test(u));
      ctx.dbLinks.hasImdb = /imdb\.com\/title\/tt\d+/i.test(text);
      ctx.dbLinks.hasDouban = /douban\.com\/subject\/\d+/i.test(text);
      ctx.dbLinks.hasTmdb = /themoviedb\.org|tmdb/i.test(text);
      ctx.dbLinks.hasBangumi = /bangumi\.tv|bgm\.tv/i.test(text);
      ctx.dbLinks.hasAny = ctx.dbLinks.hasImdb || ctx.dbLinks.hasDouban || ctx.dbLinks.hasTmdb || ctx.dbLinks.hasBangumi;
    }
  });
  ParserRegistry.register('doubanScore', {
    run(ctx) {
      if (!/豆瓣/.test(ctx.desc.text)) return;
      const m = ctx.desc.text.match(/豆瓣(?:评分|分|評分)\s*[:：]?\s*(10(?:\.0)?|[0-9](?:\.[0-9])?)/);
      if (!m) return;
      const score = parseFloat(m[1]);
      if (isFinite(score) && score >= 0 && score <= 10) ctx.doubanScore = score;
    }
  });
  ParserRegistry.register('derived', {
    run(ctx, site) {
      const group = `${ctx.siteMeta.groupSelected} ${ctx.title.clean}`;
      ctx.derived.officialSeed = (site.officialGroups || []).some(g => new RegExp(`(^|[-@\\s])${escapeRegExp(g)}($|[-@\\s])`, 'i').test(group)) || isTagSet(ctx, 'official');
      ctx.derived.officialMusicSeed = ctx.derived.officialSeed && /music|mv|flac|album|音乐|音樂/i.test(group);
      ctx.derived.godDramaSeed = /GodDramas/i.test(group);
      ctx.derived.vcbStudioSeed = /VCB[- ]?Studio/i.test(group) || isTagSet(ctx, 'vcbStudio');
      ctx.derived.haresSeed = /Hares/i.test(group) || isTagSet(ctx, 'hares');
      // DIY 资源：标题命中 DIY 制作组或副标题含 DIY
      ctx.derived.isDIY = /[-@](BHYS|sGnb|SPM|HDSky|HDHome|D[Ii]Y|UBits)\b/i.test(ctx.title.clean) || /DIY/.test(ctx.siteMeta.subtitle);
    }
  });

  function videoSection(raw) {
    const lines = String(raw || '').split(/\r?\n/);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(Video|视频|視訊)\s*(?:#\d+)?\s*$/i.test(lines[i]) || /^\s*(Video|视频|視訊)\s*[:：]/i.test(lines[i])) { start = i; break; }
    }
    if (start < 0) return '';
    const out = [];
    for (let i = start; i < lines.length; i++) {
      if (i > start && /^\s*(Audio|Text|Menu|General|音频|音頻|文本|菜单|菜單|概要)\s*(?:#\d+)?\s*(?:[:：].*)?$/i.test(lines[i])) break;
      out.push(lines[i]);
    }
    return out.join('\n');
  }
  function parseBitrate(text) {
    const normalized = String(text || '').replace(/(?<=\d)[,\s](?=\d{3}\b)/g, '');
    const re = /(?:^|\n)\s*(?:Bit rate|Nominal bit rate|Video bitrate|视频码率|視頻碼率|码率|碼率|比特率)\s*[:：]\s*([0-9]+(?:[.,]\d+)?)\s*(kb\/s|kbit\/s|mb\/s|mbit\/s|gb\/s|bps|Kbps|Mbps|Gbps)/i;
    const m = normalized.match(re);
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    const u = m[2].toLowerCase();
    if (!isFinite(n)) return null;
    if (u === 'kb/s' || u === 'kbit/s' || u === 'kbps') return n / 1000;
    if (u === 'mb/s' || u === 'mbit/s' || u === 'mbps') return n;
    if (u === 'gb/s' || u === 'gbps') return n * 1000;
    if (u === 'bps') return n / 1e6;
    return null;
  }
  function parseFps(text) {
    const m = String(text || '').match(/(?:Frame rate|帧率|幀率)\s*[:：]\s*([0-9]+(?:[.,]\d+)?)\s*(FPS|fps)?/i);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }
  function languageMatches(text, section) {
    const re = new RegExp(`${section}[\\s\\S]{0,600}?Language\\s*[:：]\\s*([^\\n\\r]+)`, 'ig');
    const out = [];
    let m;
    while ((m = re.exec(text))) out.push(clean(m[1]));
    return out;
  }
  function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Rules
  function finding(severity, code, message, meta) { return [{ severity, code, message, meta }]; }
  RuleRegistry.register('requiredSubtitle', { run: ctx => ctx.siteMeta.subtitle ? [] : finding('error', 'SUBTITLE_REQUIRED', '副标题必填') });
  RuleRegistry.register('requiredMedium', { run: ctx => ctx.parsed.medium || ctx.debug.metaSelections?.medium ? [] : finding('error', 'MEDIUM_REQUIRED', '媒介信息缺失或无法解析') });
  RuleRegistry.register('requiredVideoCodec', { run: ctx => ctx.parsed.codec || ctx.debug.metaSelections?.codec ? [] : finding('error', 'VIDEO_CODEC_REQUIRED', '视频编码缺失或无法解析') });
  RuleRegistry.register('requiredResolution', { run: ctx => ctx.parsed.resolution || ctx.debug.metaSelections?.resolution ? [] : finding('error', 'RESOLUTION_REQUIRED', '分辨率缺失或无法解析') });
  RuleRegistry.register('titleMediaMatches', {
    run(ctx) {
      const errors = [];
      const selected = ctx.debug.metaSelections || {};
      if (selected.resolution && ctx.parsed.resolution && !lower(selected.resolution).includes(lower(ctx.parsed.resolution).replace('p', ''))) errors.push({ severity: 'error', code: 'TITLE_RESOLUTION_MISMATCH', message: `标题分辨率 ${ctx.parsed.resolution} 与站点选择 ${selected.resolution} 不一致` });
      if (selected.codec && ctx.parsed.codec && !lower(selected.codec).replace(/[^a-z0-9]/g, '').includes(lower(ctx.parsed.codec).replace(/[^a-z0-9]/g, ''))) errors.push({ severity: 'error', code: 'TITLE_CODEC_MISMATCH', message: `标题编码 ${ctx.parsed.codec} 与站点选择 ${selected.codec} 不一致` });
      if (selected.medium && ctx.parsed.medium && !lower(selected.medium).includes(lower(ctx.parsed.medium).replace('-', ''))) errors.push({ severity: 'warning', code: 'TITLE_MEDIUM_MISMATCH', message: `标题媒介 ${ctx.parsed.medium} 与站点选择 ${selected.medium} 可能不一致` });
      return errors;
    }
  });
  RuleRegistry.register('screenshotMinCount', { run: (ctx, site, params) => ctx.screenshots.count >= (params.min || 1) ? [] : finding(params.severity || 'error', 'SCREENSHOT_MIN_COUNT', `截图数量不足，要求至少 ${params.min || 1} 张，当前 ${ctx.screenshots.count} 张`) });
  // DOM-only image validation; no HEAD probing to avoid extra cross-origin request volume.
  RuleRegistry.register('screenshotValid', {
    run(ctx, site, params) {
      if (ctx.screenshots.scopeFound === false) return [];
      const minHeight = params.minHeight || 24;
      const severity = params.severity || 'warning';
      const out = [];
      (ctx.screenshots.images || []).forEach((img, idx) => {
        const url = img.url || img.src || img.currentSrc || `#${idx + 1}`;
        const height = img.naturalHeight || 0;
        const width = img.naturalWidth || 0;
        const broken = img.broken || (img.complete && (!width || !height));
        if (broken) out.push({ severity, code: 'SCREENSHOT_BROKEN', message: `截图链接加载失败：${url}`, meta: { url, index: idx, naturalWidth: width, naturalHeight: height, complete: Boolean(img.complete) } });
        else if (height && height <= minHeight) out.push({ severity, code: 'SCREENSHOT_INVALID_SIZE', message: `截图高度异常（${height}px），疑似无效占位图：${url}`, meta: { url, index: idx, naturalWidth: width, naturalHeight: height, complete: Boolean(img.complete) } });
      });
      return out;
    }
  });
  RuleRegistry.register('mediainfoRequired', { run: ctx => !ctx.mediainfo.empty ? [] : finding('error', 'MEDIAINFO_REQUIRED', 'MediaInfo 必填或采集失败') });
  RuleRegistry.register('dbLinkRequired', { run: (ctx, site, params) => ctx.dbLinks.hasAny ? [] : finding(params.severity || 'error', 'DB_LINK_REQUIRED', '简介中未检测到 IMDb / 豆瓣 / TMDB / Bangumi 链接或信息') });
  RuleRegistry.register('officialLabelConsistency', {
    run(ctx) {
      const out = [];
      if (ctx.derived.officialSeed && !isTagSet(ctx, 'official')) out.push({ severity: 'warning', code: 'OFFICIAL_LABEL_MISSING', message: '疑似官组资源但未选择官方标签' });
      if (!ctx.derived.officialSeed && isTagSet(ctx, 'official')) out.push({ severity: 'warning', code: 'OFFICIAL_LABEL_EXTRA', message: '选择了官方标签，但标题/制作组未识别为本站官组' });
      if (ctx.derived.officialSeed && !ctx.siteMeta.groupSelected) out.push({ severity: 'error', code: 'OFFICIAL_GROUP_MISSING', message: '官组资源未选择制作组' });
      return out;
    }
  });
  RuleRegistry.register('hdrTagsMatchMediainfo', {
    run(ctx) {
      const out = [];
      const isHdr10Plus = ctx.parsed.isHdr10Plus, isHdr10 = ctx.parsed.isHdr10, isDV = ctx.parsed.isDolbyVision, isHdrAny = ctx.parsed.isHdr;
      const hasHdrTag = isTagSet(ctx, 'hdr') || isTagSet(ctx, 'hdr10') || isTagSet(ctx, 'hdr10Plus') || isTagSet(ctx, 'dolbyVision') || isTagSet(ctx, 'hdrVivid');
      // HDR 整体双向：检测到 HDR 但无任何 HDR 系列标签 / 有 HDR 标签但未检测到
      if (isHdrAny && !hasHdrTag) out.push({ severity: 'error', code: 'HDR_TAG_MISSING', message: 'MediaInfo/标题检测到 HDR，但未选择任何 HDR 系列标签' });
      if (!isHdrAny && hasHdrTag) out.push({ severity: 'warning', code: 'HDR_TAG_EXTRA', message: '选择了 HDR 系列标签，但未识别到 HDR 信息' });
      // HDR10+ 双向
      if (isHdr10Plus && !isTagSet(ctx, 'hdr10Plus')) out.push({ severity: 'error', code: 'HDR10PLUS_TAG_MISSING', message: '检测到 HDR10+，但未选择 HDR10+ 标签' });
      if (!isHdr10Plus && isTagSet(ctx, 'hdr10Plus')) out.push({ severity: 'error', code: 'HDR10PLUS_TAG_EXTRA', message: '选择了 HDR10+ 标签，但未识别到 HDR10+' });
      // 杜比视界双向
      if (isDV && !isTagSet(ctx, 'dolbyVision')) out.push({ severity: 'error', code: 'DV_TAG_MISSING', message: '检测到 Dolby Vision/DV，但未选择杜比视界标签' });
      if (!isDV && isTagSet(ctx, 'dolbyVision')) out.push({ severity: 'error', code: 'DV_TAG_EXTRA', message: '选择了杜比视界标签，但未识别到 Dolby Vision' });
      return out;
    }
  });
  RuleRegistry.register('highBitrate', {
    run(ctx, site, params) {
      const height = ctx.parsed.resolutionHeight;
      const bitrate = ctx.parsed.bitrateMbps;
      const thresholds = params.thresholdsMbps || {};
      const threshold = thresholds[height];
      if (!threshold || bitrate == null) return [];
      const hit = params.inclusive ? bitrate >= threshold : bitrate > threshold;
      return hit && !isTagSet(ctx, params.tag || 'highBitrate') ? finding('error', 'HIGH_BITRATE_TAG_MISSING', `视频码率 ${bitrate.toFixed(2)} Mbps 超过 ${height}p 高码阈值 ${threshold} Mbps，未选择高码标签`) : [];
    }
  });
  RuleRegistry.register('highFps', { run: (ctx, site, params) => ctx.parsed.fps != null && ctx.parsed.fps >= (params.thresholdFps || 60) && !isTagSet(ctx, params.tag || 'highFps') ? finding('error', 'HIGH_FPS_TAG_MISSING', `帧率 ${ctx.parsed.fps} fps 达到高帧阈值，未选择高帧标签`) : [] });
  RuleRegistry.register('highScore', { run: (ctx, site, params) => ctx.doubanScore != null && (params.inclusive ? ctx.doubanScore >= (params.threshold || 8) : ctx.doubanScore > (params.threshold || 8)) && !isTagSet(ctx, params.tag || 'highScore') ? finding('error', 'HIGH_SCORE_TAG_MISSING', `豆瓣评分 ${ctx.doubanScore} 超过高分阈值，未选择高分标签`) : [] });
  RuleRegistry.register('titleChineseForbidden', { run: ctx => ctx.title.hasChinese ? finding('error', 'TITLE_CHINESE_FORBIDDEN', '标题含中文字符') : [] });
  RuleRegistry.register('titleChineseWarning', { run: ctx => ctx.title.hasChinese ? finding('warning', 'TITLE_CHINESE_WARNING', '标题含中文字符，请确认是否符合站点规范') : [] });
  RuleRegistry.register('titleCompleteRequiredForSeason', { run: ctx => ctx.title.isSeasonPack && !ctx.title.hasComplete ? finding('error', 'TITLE_COMPLETE_REQUIRED', '季包标题应包含 Complete') : [] });
  RuleRegistry.register('titleHdr10PlusSpelling', { run: ctx => /HDR10Plus/i.test(ctx.title.clean) ? finding('error', 'HDR10PLUS_SPELLING', 'HDR10+ 建议使用 HDR10+ 写法，不使用 HDR10Plus') : [] });
  RuleRegistry.register('forbidGroups', { run: (ctx, site, params) => (params.groups || []).some(g => new RegExp(`[-@]${escapeRegExp(g)}$`, 'i').test(ctx.title.clean)) ? finding('error', 'FORBID_GROUP', '标题命中禁发组，请人工核对') : [] });
  RuleRegistry.register('bigTorrentWarning', { run: ctx => ctx.size.isBiggerThan1T && !isTagSet(ctx, 'bigTorrent') ? finding('warning', 'BIG_TORRENT_TAG_MISSING', '种子大于等于 1 TiB，建议确认大包标签') : [] });
  RuleRegistry.register('childrenComedyConsistency', {
    run(ctx) {
      const out = [];
      if (/儿童|Children/i.test(ctx.desc.text + ctx.title.clean) && !isTagSet(ctx, 'children')) out.push({ severity: 'warning', code: 'CHILDREN_TAG_MISSING', message: '疑似儿童内容，未选择儿童标签' });
      if (/喜剧|Comedy/i.test(ctx.desc.text + ctx.title.clean) && !isTagSet(ctx, 'comedy')) out.push({ severity: 'warning', code: 'COMEDY_TAG_MISSING', message: '疑似喜剧内容，未选择喜剧标签' });
      return out;
    }
  });
  RuleRegistry.register('arcHaresConsistency', {
    run(ctx) {
      const out = [];
      if (/\bArc\b|方舟/i.test(ctx.title.clean + ctx.siteMeta.groupSelected) && !isTagSet(ctx, 'arcProject')) out.push({ severity: 'warning', code: 'ARC_TAG_MISSING', message: '疑似方舟资源，未选择方舟标签' });
      if (ctx.derived.haresSeed && !isTagSet(ctx, 'hares')) out.push({ severity: 'warning', code: 'HARES_TAG_MISSING', message: '疑似 Hares 资源，未选择 Hares 标签' });
      return out;
    }
  });
  // 完结/分集/合集标签一致性（基于标题季集状态）
  RuleRegistry.register('completeTagRequired', { run: ctx => ctx.title.isSeasonPack && ctx.title.hasComplete && !isTagSet(ctx, 'complete') ? finding('warning', 'COMPLETE_TAG_MISSING', '季包已标注 Complete，建议选择完结标签') : [] });
  RuleRegistry.register('incompleteTagRequired', { run: ctx => ctx.title.isEpisode && !isTagSet(ctx, 'incomplete') && !isTagSet(ctx, 'complete') ? finding('warning', 'INCOMPLETE_TAG_MISSING', '分集剧集未选择分集标签') : [] });
  RuleRegistry.register('collectionTagForbidden', { run: ctx => !ctx.title.isSeasonPack && isTagSet(ctx, 'collection') ? finding('warning', 'COLLECTION_TAG_EXTRA', '非季包资源选择了合集标签，请确认') : [] });
  // 音轨/字幕语言 → 标签
  RuleRegistry.register('audioLanguageTagConsistency', {
    run(ctx) {
      const out = [];
      if (ctx.parsed.hasMandarinAudio && !isTagSet(ctx, 'mandarin')) out.push({ severity: 'warning', code: 'MANDARIN_TAG_MISSING', message: '检测到国语音轨，未选择国语标签' });
      if (ctx.parsed.hasCantoneseAudio && !isTagSet(ctx, 'cantonese')) out.push({ severity: 'warning', code: 'CANTONESE_TAG_MISSING', message: '检测到粤语音轨，未选择粤语标签' });
      if (ctx.parsed.hasChineseSubtitle && !isTagSet(ctx, 'chineseSubtitle')) out.push({ severity: 'warning', code: 'CHINESE_SUBTITLE_TAG_MISSING', message: '检测到中文字幕，未选择中字标签' });
      return out;
    }
  });
  // 制作组专属标签
  RuleRegistry.register('vcbStudioTagRequired', { run: ctx => ctx.derived.vcbStudioSeed && !isTagSet(ctx, 'vcbStudio') ? finding('warning', 'VCB_STUDIO_TAG_MISSING', 'VCB-Studio 资源未选择 VCB-Studio 标签') : [] });
  RuleRegistry.register('remuxTagRequired', { run: ctx => /remux/i.test(ctx.parsed.medium) && !isTagSet(ctx, 'remux') ? finding('warning', 'REMUX_TAG_MISSING', 'Remux 媒介未选择 Remux 标签') : [] });
  // 标题命名写法规范（P→p / 4K→2160p / AC3→DD / 噪声词 / WEB·HDTV 编码大小写 / Atmos 位置）
  RuleRegistry.register('titleNamingSpec', {
    run(ctx) {
      const t = ctx.title.clean, tl = ctx.title.lower;
      const out = [];
      if (/(480|720|1080|2160|4320)P\b/.test(t)) out.push({ severity: 'warning', code: 'TITLE_RES_P_CASE', message: '标题分辨率后缀 P 应改为小写 p' });
      if (/\b4K\b/i.test(t) && !/2160p/i.test(t)) out.push({ severity: 'warning', code: 'TITLE_4K_SPELLING', message: '标题 4K 建议改为 2160p' });
      if (/\bAC3\b/.test(t) && !/\bDD[P+]?\b/.test(t)) out.push({ severity: 'warning', code: 'TITLE_AC3_SPELLING', message: '标题 AC3 建议改为 DD' });
      const noise = [];
      if (/\bHQ\b/.test(t)) noise.push('HQ');
      if (/\bFPS\b/i.test(t)) noise.push('FPS');
      if (/\bEDR\b/.test(t)) noise.push('EDR');
      if (/\bSDR\b/.test(t)) noise.push('SDR');
      if (noise.length) out.push({ severity: 'warning', code: 'TITLE_NOISE_WORDS', message: `标题含多余规格词：${noise.join('、')}，建议删除` });
      if (/WEB/i.test(t)) {
        if (/\bHEVC\b|\bH265\b/.test(t) && !/H\.265/i.test(t)) out.push({ severity: 'warning', code: 'TITLE_WEB_CODEC_CASE', message: 'WEB 资源编码 HEVC/H265 应写为 H.265' });
        if (/\bAVC\b|\bH264\b/.test(t) && !/H\.264/i.test(t)) out.push({ severity: 'warning', code: 'TITLE_WEB_CODEC_CASE', message: 'WEB 资源编码 AVC/H264 应写为 H.264' });
      }
      if (/HDTV/i.test(t)) {
        if (/\bHEVC\b|H\.265/i.test(t) && !/\bH265\b/.test(t)) out.push({ severity: 'warning', code: 'TITLE_HDTV_CODEC_CASE', message: 'HDTV 资源编码 HEVC/H.265 应写为 H265' });
        if (/\bAVC\b|H\.264/i.test(t) && !/\bH264\b/.test(t)) out.push({ severity: 'warning', code: 'TITLE_HDTV_CODEC_CASE', message: 'HDTV 资源编码 AVC/H.264 应写为 H264' });
      }
      if (/atmos.*truehd/.test(tl)) out.push({ severity: 'warning', code: 'TITLE_ATMOS_ORDER', message: '标题 Atmos 应置于 TrueHD/声道之后' });
      return out;
    }
  });
  // 标题 token 顺序：片源→分辨率→HDR→视频编码→音频编码
  RuleRegistry.register('titleTokenOrder', {
    run(ctx) {
      const p = ctx.title.positions;
      const out = [];
      if (p.video >= 0 && p.source >= 0 && p.video < p.source) out.push({ severity: 'warning', code: 'TITLE_SOURCE_ORDER', message: '标题片源类型应置于视频编码之前' });
      if (p.resolution >= 0 && p.source >= 0 && p.resolution > p.source) out.push({ severity: 'warning', code: 'TITLE_RESOLUTION_BEFORE_SOURCE', message: '标题分辨率应置于来源/媒介之前' });
      if (p.video >= 0 && p.audio >= 0 && p.video > p.audio) out.push({ severity: 'warning', code: 'TITLE_VIDEO_BEFORE_AUDIO', message: '标题视频编码应置于音频编码之前' });
      if (p.hdr >= 0 && p.video >= 0 && p.hdr > p.video) out.push({ severity: 'warning', code: 'TITLE_HDR_BEFORE_VIDEO', message: '标题 HDR 类型应置于视频编码之前' });
      return out;
    }
  });
  // 标题完整性：缺少分辨率/来源/视频编码/音频编码
  RuleRegistry.register('titleCompleteness', {
    run(ctx) {
      const p = ctx.title.positions;
      const out = [];
      if (p.resolution < 0) out.push({ severity: 'warning', code: 'TITLE_MISSING_RESOLUTION', message: '标题缺少分辨率' });
      if (p.source < 0) out.push({ severity: 'warning', code: 'TITLE_MISSING_SOURCE', message: '标题缺少来源/媒介' });
      if (p.video < 0) out.push({ severity: 'warning', code: 'TITLE_MISSING_VIDEO_CODEC', message: '标题缺少视频编码' });
      if (p.audio < 0) out.push({ severity: 'warning', code: 'TITLE_MISSING_AUDIO_CODEC', message: '标题缺少音频编码' });
      return out;
    }
  });
  // 音频编码必填
  RuleRegistry.register('requiredAudioCodec', { run: ctx => ctx.parsed.audio || ctx.debug.metaSelections?.audio ? [] : finding('error', 'AUDIO_CODEC_REQUIRED', '音频编码缺失或无法解析') });
  // MediaInfo 含 BBCode
  RuleRegistry.register('mediainfoBbcodeError', { run: ctx => ctx.mediainfo.containsBBCode ? finding('error', 'MEDIAINFO_BBCODE', 'MediaInfo 含 BBCode 标签，应为纯文本') : [] });
  // MediaInfo 类型与媒介一致性：蓝光原盘类应填 BDinfo，非蓝光应填 mediainfo
  RuleRegistry.register('mediainfoTypeConsistency', {
    run(ctx) {
      if (ctx.mediainfo.empty) return [];
      const isBD = /bluray|原盘|untouched/i.test(ctx.parsed.medium);
      if (isBD && ctx.mediainfo.kind !== 'bdinfo') return finding('warning', 'MEDIAINFO_SHOULD_BE_BDINFO', '蓝光原盘类资源 MediaInfo 栏建议填写 BDinfo');
      if (!isBD && ctx.mediainfo.kind === 'bdinfo') return finding('warning', 'MEDIAINFO_SHOULD_BE_MEDIAINFO', '非蓝光原盘资源 MediaInfo 栏建议填写 mediainfo');
      return [];
    }
  });
  // DIY/原生原盘标签互斥（蓝光原盘类）
  RuleRegistry.register('diyUntouchedTagConsistency', {
    run(ctx) {
      if (ctx.mediainfo.kind !== 'bdinfo') return []; // 仅 BDinfo（蓝光原盘）适用
      const isDIY = ctx.derived.isDIY, hasDIY = isTagSet(ctx, 'diy'), hasUntouched = isTagSet(ctx, 'untouched');
      const out = [];
      if (isDIY && !hasDIY) out.push({ severity: 'error', code: 'DIY_TAG_MISSING', message: 'DIY 资源未选择 DIY 标签' });
      if (isDIY && hasUntouched) out.push({ severity: 'error', code: 'UNTOUCHED_TAG_EXTRA', message: 'DIY 资源不应选择原生原盘标签' });
      if (!isDIY && !hasDIY && !hasUntouched) out.push({ severity: 'warning', code: 'BLURAY_TAG_MISSING', message: '蓝光原盘未选择原生或 DIY 标签' });
      if (hasDIY && hasUntouched) out.push({ severity: 'error', code: 'DIY_UNTOUCHED_CONFLICT', message: '原生原盘与 DIY 标签只能选一个' });
      return out;
    }
  });
  // HLG 需添加 HDR 标签
  RuleRegistry.register('hlgNeedsHdrTag', { run: ctx => /^(?!Encoding).*HLG/im.test(ctx.mediainfo.raw) && !isTagSet(ctx, 'hdr') && !isTagSet(ctx, 'hdrVivid') ? finding('warning', 'HLG_HDR_TAG_MISSING', 'MediaInfo 检测到 HLG，未选择 HDR 标签') : [] });
  // 标题声道数标示（音频 token 后应有 X.Y 声道数）
  RuleRegistry.register('titleAudioChannelRequired', { run: ctx => ctx.title.audioToken && !ctx.title.hasAudioChannel ? finding('warning', 'TITLE_AUDIO_CHANNEL_MISSING', '标题音频编码后未标示声道数（如 5.1）') : [] });
  // 音乐类（音频分类）标题字段：采样频率 khz + 比特率 bit
  RuleRegistry.register('musicTitleFields', {
    run(ctx) {
      const isMusic = ctx.siteMeta.categoryId === '408' || /音频|音頻/.test(ctx.siteMeta.categorySelected || '');
      if (!isMusic) return [];
      const out = [], tl = ctx.title.lower;
      if (!/khz/.test(tl)) out.push({ severity: 'warning', code: 'MUSIC_SAMPLE_RATE_MISSING', message: '音频类资源主标题缺少采样频率（如 44.1kHz）' });
      if (!/bit/.test(tl)) out.push({ severity: 'warning', code: 'MUSIC_BITRATE_MISSING', message: '音频类资源主标题缺少比特率（如 320kbps）' });
      return out;
    }
  });
  // DVD 来源分辨率错标检查（DVD 不应为 720p）
  RuleRegistry.register('dvdResolutionCheck', { run: ctx => /\bDVD\b/i.test(ctx.title.clean) && ctx.parsed.resolutionHeight === 720 ? finding('warning', 'DVD_RESOLUTION_CHECK', 'DVD 来源资源标为 720p，请检查分辨率是否错标') : [] });
  RuleRegistry.register('longptDomDegraded', { run: ctx => (!ctx.title.clean || (!$('#outer') && !$('#kdescr'))) ? finding('info', 'DOM_DEGRADED', '页面 DOM 与默认 NexusPHP 选择器不完全匹配，部分检查已降级') : [] });

  function defaultTagTextMap() {
    return {
      'HDR10+': 'hdr10Plus', 'HDR10 Plus': 'hdr10Plus', 'HDR 10+': 'hdr10Plus', 'HDR10Plus': 'hdr10Plus', 'HDR10': 'hdr10', 'Dolby Vision': 'dolbyVision', '杜比视界': 'dolbyVision', '杜比視界': 'dolbyVision', 'HDR Vivid': 'hdrVivid', '菁彩HDR': 'hdrVivid', 'HDR': 'hdr',
      '官方': 'official', '官种': 'official', '官種': 'official', '禁转': 'reseedProhibited', '禁傳': 'reseedProhibited', '驻站': 'resident', '駐站': 'resident', '完结': 'complete', '完結': 'complete', '分集': 'incomplete', '合集': 'collection',
      '国语': 'mandarin', '國語': 'mandarin', '粤语': 'cantonese', '粵語': 'cantonese', '中字': 'chineseSubtitle', '英字': 'englishSubtitle', 'VCB-Studio': 'vcbStudio', 'DIY': 'diy', '原盘': 'untouched', '原盤': 'untouched', '原生': 'untouched', 'Untouched': 'untouched', 'Remux': 'remux', 'REMUX': 'remux',
      '大包': 'bigTorrent', '麒麟火': 'iceSeed', '方舟': 'arcProject', '高码': 'highBitrate', '高碼': 'highBitrate', '高帧': 'highFps', '高幀': 'highFps', '高分': 'highScore', '儿童': 'children', '兒童': 'children', '喜剧': 'comedy', '喜劇': 'comedy', 'Hares': 'hares'
    };
  }

  // Renderer
  const Renderer = {
    init() {
      addStyle(`
#${ID}-panel{font-size:13px;line-height:1.55;border-radius:6px;box-shadow:0 0 10px rgba(0,0,0,.35);padding:10px 14px;margin:8px 0;border:1px solid rgba(0,0,0,.18);background:#f6fff6;color:#1b5e20;z-index:9999;max-width:980px}
#${ID}-panel.ptaa-error{background:#ffebee;color:#8a1111;border-color:#f44336}#${ID}-panel.ptaa-warning{background:#fff8db;color:#5f4300;border-color:#ffca28}#${ID}-panel .ptaa-title{font-weight:700;margin-bottom:6px}#${ID}-panel ul{margin:6px 0 6px 20px;padding:0}#${ID}-panel li{margin:2px 0}#${ID}-panel .ptaa-disclaimer{font-size:12px;opacity:.78;margin-top:6px}.ptaa-debug{white-space:pre-wrap;max-height:280px;overflow:auto;background:rgba(0,0,0,.06);padding:8px;border-radius:4px;margin-top:8px}`);
    },
    render(ctx, site) {
      const errors = ctx.findings.filter(f => f.severity === 'error');
      const warnings = ctx.findings.filter(f => f.severity === 'warning');
      const cls = errors.length ? 'ptaa-error' : (warnings.length ? 'ptaa-warning' : 'ptaa-ok');
      const title = errors.length ? `检测到 ${errors.length} 个错误` : (warnings.length ? `检测到 ${warnings.length} 个警告` : '此种子未检测到错误');
      const panel = el('div', { id: `${ID}-panel`, class: cls }, el('div', { class: 'ptaa-title', text: `PT_AuditAssistant：${title}` }));
      if (ctx.findings.length) {
        const ul = el('ul');
        ctx.findings.forEach(f => ul.appendChild(el('li', { text: `[${f.severity}] ${f.code}：${f.message}` })));
        panel.appendChild(ul);
      }
      panel.appendChild(el('div', { class: 'ptaa-disclaimer', text: '非站点官方工具，检测结果仅作辅助参考，请以站点规则与人工判断为准。' }));
      if (getValue(DEBUG_KEY, false)) panel.appendChild(el('pre', { class: 'ptaa-debug', text: JSON.stringify(snapshotContext(ctx), null, 2) }));
      const old = $(`#${ID}-panel`);
      if (old) old.remove();
      const top = $('#top');
      const outer = $('#outer');
      if (site.reviewInfoPosition === 1 && outer) outer.prepend(panel);
      else if (site.reviewInfoPosition === 2 && top) top.insertAdjacentElement('afterend', panel);
      else if (site.reviewInfoPosition === 3 && top) top.insertAdjacentElement('beforebegin', panel);
      else (outer || document.body).prepend(panel);
    },
    injectApprovalButtons(ctx, site) {
      // 不主动注入「一键通过」按钮，只对原生审核链接绑定拦截门（若存在）。
      if (ctx.approval.nativeReviewLink) {
        ctx.approval.nativeReviewLink.addEventListener('click', ev => {
          ev.preventDefault();
          ApprovalGate.handle(ctx, site).then(ok => {
            if (ok && !site.approval?.enabled && ctx.approval.nativeReviewLink.href) location.href = ctx.approval.nativeReviewLink.href;
          });
        }, true);
      }
    }
  };
  function snapshotContext(ctx) {
    const copy = JSON.parse(JSON.stringify(ctx, (key, value) => key === 'actionContainer' || key === 'nativeReviewLink' || key === 'images' ? undefined : value));
    copy.tags.normalized = Array.from(ctx.tags.normalized || []);
    return copy;
  }

  // ApprovalGate and adapters
  const ApprovalGate = {
    async handle(ctx, site) {
      const errors = ctx.findings.filter(f => f.severity === 'error');
      const warnings = ctx.findings.filter(f => f.severity === 'warning');
      if (errors.length) {
        alert(`本地检查发现 ${errors.length} 个错误，已阻止一键通过。`);
        return false;
      }
      if (warnings.length && !confirm(`本地检查发现 ${warnings.length} 个警告，是否继续放行？`)) return false;
      if (!site.approval?.enabled || !getValue(site.approval.modeStorageKey || AUTO_APPROVAL_KEY, false)) {
        alert('本地检查通过，请人工在审核页确认');
        return true;
      }
      const adapter = ApprovalRegistry.get(site.approval.adapter || 'nexusPhpTokenPost');
      if (!adapter) {
        alert('本地检查通过，但未找到自动审批适配器，请人工在审核页确认');
        return false;
      }
      try {
        const result = await adapter.run(ctx, site);
        const ok = result === true || result?.ok === true;
        alert(ok ? '自动审批已提交' : `自动审批失败：${result?.message || '请人工在审核页确认'}`);
        if (ok && getValue(AUTO_CLOSE_KEY, false)) window.close();
        return ok;
      } catch (err) {
        console.warn('PT_AuditAssistant approval failed', err);
        alert(`自动审批失败：${err && err.message ? err.message : '请人工在审核页确认'}`);
        return false;
      }
    }
  };
  // 预留：自动审批 CSRF/POST 适配器，当前所有站点 approval.enabled=false，需站点开启并确认接口后才会调用。
  ApprovalRegistry.register('nexusPhpTokenPost', {
    async run(ctx, site) {
      const id = getTorrentId();
      if (!id) return { ok: false, message: '无法获取种子 ID' };
      const origin = location.origin;
      const pageUrl = site.approval.pageUrl ? site.approval.pageUrl(id, origin) : `${origin}/web/torrent-approval-page?torrent_id=${encodeURIComponent(id)}`;
      const submitUrl = site.approval.submitUrl ? site.approval.submitUrl(id, origin) : `${origin}/web/torrent-approval`;
      const page = await gmRequest({ method: 'GET', url: pageUrl, timeout: 15000 });
      if (page.status < 200 || page.status >= 300) return { ok: false, message: `审批页请求失败（HTTP ${page.status}）` };
      const doc = new DOMParser().parseFromString(page.responseText || '', 'text/html');
      const token = doc.querySelector('input[name="_token"]')?.getAttribute('value') || '';
      if (!token) return { ok: false, message: '审批页未找到 CSRF token' };
      const body = `_token=${encodeURIComponent(token)}&torrent_id=${encodeURIComponent(id)}&approval_status=1&comment=${encodeURIComponent('PT_AuditAssistant local check passed')}`;
      const res = await gmRequest({ method: 'POST', url: submitUrl, data: body, headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Accept': 'application/json, text/plain, */*' }, timeout: 15000 });
      if (res.status < 200 || res.status >= 300) return { ok: false, message: `审批提交失败（HTTP ${res.status}）` };
      try {
        const data = JSON.parse(res.responseText || '{}');
        if (data && (data.success === true || data.status === true || data.code === 0 || data.ret === 0)) return true;
        return { ok: false, message: data?.message || data?.msg || data?.error || '审批接口未返回成功状态' };
      } catch (err) {
        return { ok: false, message: '审批接口返回非 JSON 响应' };
      }
    }
  });

  // SiteConfigs
  function override(rules, id, patch) { return rules.map(r => r.id === id ? Object.assign({}, r, patch) : r); }
  function baseRules() {
    return [
      { id: 'mediainfoRequired' }, { id: 'screenshotMinCount', params: { min: 1 } }, { id: 'screenshotValid', params: { severity: 'warning', minHeight: 24, timeout: 30000 } }, { id: 'dbLinkRequired', severity: 'warning', params: { severity: 'warning' } }, { id: 'officialLabelConsistency' }, { id: 'hdrTagsMatchMediainfo' }, { id: 'titleMediaMatches' }, { id: 'completeTagRequired' }, { id: 'incompleteTagRequired' }, { id: 'collectionTagForbidden' }, { id: 'audioLanguageTagConsistency' }, { id: 'vcbStudioTagRequired' }, { id: 'remuxTagRequired' }, { id: 'mediainfoBbcodeError' }, { id: 'mediainfoTypeConsistency' }, { id: 'musicTitleFields' }
    ];
  }
  function registerAllSites() {
    const common = { paths: [/^\/details\.php/i], collectors: DEFAULT_COLLECTORS, parsers: DEFAULT_PARSERS, approval: { enabled: false, adapter: 'nexusPhpTokenPost', modeStorageKey: AUTO_APPROVAL_KEY }, fieldLabels: { subtitle: ['副标题', '副標題'], tags: ['标签', '標籤'], basic: ['基本信息', '基本資料'], mediainfo: ['MediaInfo', 'Mediainfo', '媒体信息', '媒體信息', 'BDInfo'], action: ['行为', '行為'] } };
    SiteRegistry.register('pandapt', Object.assign({}, common, { id: 'pandapt', name: 'PandaPT', hosts: ['pandapt.net'], reviewInfoPosition: 3, officialGroups: ['Panda', 'AilMWeb', 'AilMTV', 'AilMUpscale'], suppressions: [{ when: { categoryIds: ['408'], categoryTexts: ['音频', '音頻'] }, exceptRules: ['musicTitleFields'] }, { when: { categoryIds: ['409'], categoryTexts: ['其他'] }, exceptRules: [] }], rules: baseRules().concat([{ id: 'titleNamingSpec' }, { id: 'titleTokenOrder' }, { id: 'titleCompleteness' }, { id: 'diyUntouchedTagConsistency' }, { id: 'hlgNeedsHdrTag' }, { id: 'titleAudioChannelRequired' }, { id: 'dvdResolutionCheck' }]) }));
    SiteRegistry.register('qingwa', Object.assign({}, common, { id: 'qingwa', name: 'QingWaPT', hosts: ['qingwapt.com', 'new.qingwa.pro', 'qingwapt.org'], reviewInfoPosition: 3, officialGroups: ['frog', 'froge', 'frogweb', 'Loong@QingWa'], rules: baseRules().concat([{ id: 'titleChineseWarning' }, { id: 'titleCompleteRequiredForSeason' }, { id: 'titleHdr10PlusSpelling' }, { id: 'requiredMedium' }, { id: 'requiredVideoCodec' }, { id: 'requiredResolution' }, { id: 'requiredAudioCodec' }, { id: 'forbidGroups', params: { groups: ['CMCT', 'WiKi', 'beAst'] } }, { id: 'titleNamingSpec' }, { id: 'titleTokenOrder' }, { id: 'diyUntouchedTagConsistency' }, { id: 'hlgNeedsHdrTag' }, { id: 'titleAudioChannelRequired' }, { id: 'dvdResolutionCheck' }]) }));
    SiteRegistry.register('hdkylin', Object.assign({}, common, { id: 'hdkylin', name: 'HDKylin', hosts: ['hdkyl.in'], paths: [/^\/details\.php/i, /^\/web\/torrent-approval-page/i], reviewInfoPosition: 2, officialGroups: ['HDK', 'HDKMV', 'GodDramas'], tagTextMap: { '麒麟火': 'iceSeed' }, rules: override(baseRules().filter(r => r.id !== 'dbLinkRequired'), 'screenshotMinCount', { params: { min: 2 } }).concat([{ id: 'requiredSubtitle' }, { id: 'bigTorrentWarning' }]) }));
    SiteRegistry.register('cspt', Object.assign({}, common, { id: 'cspt', name: 'CSPT', hosts: ['cspt.top', 'cspt.cc', 'cspt.date'], reviewInfoPosition: 2, officialGroups: ['csweb', 'cspt', 'Hares', 'GodDramas'], tagTextMap: { '方舟': 'arcProject', 'Hares': 'hares', '儿童': 'children', '喜剧': 'comedy' }, suppressions: [{ when: { categoryIds: ['410', '419'], categoryTexts: ['短剧', 'Playlet', 'short', 'shortdrama'] }, exceptRules: ['requiredSubtitle', 'screenshotMinCount', 'screenshotValid', 'mediainfoRequired'] }], rules: override(baseRules().map(r => r.id === 'dbLinkRequired' ? Object.assign({}, r, { severity: 'error', params: { severity: 'error' } }) : r), 'screenshotMinCount', { params: { min: 2 } }).concat([{ id: 'titleChineseForbidden' }, { id: 'requiredSubtitle' }, { id: 'childrenComedyConsistency' }, { id: 'arcHaresConsistency' }, { id: 'bigTorrentWarning' }]) }));
    SiteRegistry.register('longpt', Object.assign({}, common, { id: 'longpt', name: 'LongPT', hosts: ['longpt.org'], reviewInfoPosition: 2, tagTextMap: { '高码': 'highBitrate', '高碼': 'highBitrate', '高帧': 'highFps', '高幀': 'highFps', '高分': 'highScore' }, rules: [{ id: 'longptDomDegraded' }, { id: 'screenshotValid', params: { severity: 'warning', minHeight: 24, timeout: 30000 } }, { id: 'highBitrate', params: { tag: 'highBitrate', thresholdsMbps: { 2160: 15, 1080: 9, 1440: 9 }, inclusive: false } }, { id: 'highFps', params: { thresholdFps: 60, tag: 'highFps' } }, { id: 'highScore', params: { threshold: 8, inclusive: false, tag: 'highScore' } }] }));
  }

  // Core
  function registerMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    GM_registerMenuCommand(`${getValue(AUTO_APPROVAL_KEY, false) ? '关闭' : '开启'}自动审批（默认关）`, () => { setValue(AUTO_APPROVAL_KEY, !getValue(AUTO_APPROVAL_KEY, false)); location.reload(); });
    GM_registerMenuCommand(`${getValue(AUTO_CLOSE_KEY, false) ? '关闭' : '开启'}自动关闭页面`, () => { setValue(AUTO_CLOSE_KEY, !getValue(AUTO_CLOSE_KEY, false)); location.reload(); });
    GM_registerMenuCommand(`${getValue(DEBUG_KEY, false) ? '关闭' : '开启'}显示调试信息(ctx 快照)`, () => { setValue(DEBUG_KEY, !getValue(DEBUG_KEY, false)); location.reload(); });
  }
  async function boot() {
    registerAllSites();
    registerMenu();
    const site = SiteRegistry.detect();
    if (!site) return;
    Renderer.init();
    const ctx = createContext();
    try {
      await CollectorRegistry.run(site.collectors || DEFAULT_COLLECTORS, ctx, site);
      ParserRegistry.run(site.parsers || DEFAULT_PARSERS, ctx, site);
      ctx.findings = RuleRegistry.run(site.rules || [], ctx, site);
      Renderer.render(ctx, site);
      Renderer.injectApprovalButtons(ctx, site);
    } catch (err) {
      console.warn('PT_AuditAssistant boot failed', err);
      ctx.findings = [{ severity: 'warning', code: 'BOOT_FAILED', message: `脚本执行失败：${err && err.message ? err.message : err}` }];
      Renderer.render(ctx, site);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

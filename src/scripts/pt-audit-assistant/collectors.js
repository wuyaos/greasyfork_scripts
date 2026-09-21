import { ONE_TIB } from './config.js';

import { $, $$, clean, firstMatch, hasChinese, lower, selectedText, selectedValue, toBytes } from './page.js';

import { CollectorRegistry } from './registries.js';

import { defaultTagTextMap } from './rules.js';



function registerCollectors() {
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
}



export { registerCollectors };

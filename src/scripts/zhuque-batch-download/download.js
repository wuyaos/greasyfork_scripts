import { DELAY_KEY } from './config.js';

import { safeGet } from './settings.js';

import { el, fileNameFromDisposition, sanitize, setStatus } from './elements.js';



async function downloadOne(r, done) {
    const url = new URL(r.href, location.origin).href;
    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      if (!blob.size) throw new Error('空文件');
      const name = fileNameFromDisposition(resp.headers.get('content-disposition')) || `zhuque_${r.id}_${sanitize(r.title)}.torrent`;
      const objectUrl = URL.createObjectURL(blob);
      const a = el('a', { href: objectUrl, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
      done && done(true);
    } catch (e) {
      console.warn('[朱雀批量] 下载失败', r.id, e);
      done && done(false);
    }
  }

function batchDownload(items, btn) {
    if (!items.length) return setStatus('没有可下载的种子');
    const delay = Math.max(100, parseInt(safeGet(DELAY_KEY, 800), 10) || 800);
    let i = 0, ok = 0, fail = 0;
    if (btn) btn.disabled = true;
    const next = () => {
      if (i >= items.length) { if (btn) btn.disabled = false; return setStatus(`完成：成功 ${ok} / 失败 ${fail} / 共 ${items.length}`); }
      const item = items[i++];
      setStatus(`下载中 ${i}/${items.length}`);
      downloadOne(item, success => { if (success) ok++; else fail++; setTimeout(next, delay); });
    };
    next();
  }



export { batchDownload };

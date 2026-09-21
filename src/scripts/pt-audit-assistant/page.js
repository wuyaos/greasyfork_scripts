

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



export { $, $$, addStyle, clean, el, firstMatch, getTorrentId, getValue, gmRequest, hasChinese, isTagSet, lower, normalizeResolution, selectedText, selectedValue, setValue, toBytes };

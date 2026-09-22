import { state } from './config.js';

import { parseSize } from './filters.js';



function el(tag, attrs, ...kids) { const n = document.createElement(tag); if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (v == null) return; if (k === 'class') n.className = v; else if (k === 'style') n.style.cssText = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); }); kids.forEach(k => { if (k == null) return; n.append(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k); }); return n; }

function append(parent, ...kids) { kids.forEach(k => parent.append(k)); return parent; }



function setStatus(msg) { if (state.ui.status) state.ui.status.textContent = msg; }

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }

function pageIsDark() { const color = firstPaintedBg(document.querySelector('.ant-layout-content') || document.body); return color ? colorBrightness(color) < 128 : false; }

function firstPaintedBg(node) { for (let el = node; el && el !== document.documentElement; el = el.parentElement) { const bg = getComputedStyle(el).backgroundColor; if (bg && !/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(bg) && bg !== 'transparent') return bg; } return getComputedStyle(document.body).backgroundColor; }

function colorBrightness(color) { const m = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); if (!m) return 255; return (Number(m[1]) * 299 + Number(m[2]) * 587 + Number(m[3]) * 114) / 1000; }

function parseMult(primary, fallback, arrow) { const re = new RegExp(`${arrow}\\s*([\\d.]+)x`); const raw = String(primary || '').match(re)?.[1] ?? String(fallback || '').match(re)?.[1]; const n = parseFloat(raw); return Number.isFinite(n) ? n : 1; }

function sizeValue(value, unit) { const text = clean(value); if (!text) return null; return /[KMGTP]iB/i.test(text) ? parseSize(text) : parseSize(`${text} ${unit || 'MiB'}`); }

function defaultSizeUnit(value) { return clean(value).match(/([KMGTP]iB)$/i)?.[1] || 'MiB'; }

function normalizeInputValue(value) { const text = clean(value); const m = text.match(/^([\d.]+)\s*[KMGTP]iB$/i); return m ? m[1] : text; }

function toInt(value) { return parseInt(String(value || '').replace(/,/g, ''), 10) || 0; }

function num(value) { const n = parseInt(value, 10); return Number.isFinite(n) ? n : null; }

function sanitize(value) { const s = clean(value).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120); return s || 'torrent'; }

function fileNameFromDisposition(value) {
    const text = String(value || '');
    const utf8 = text.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = text.match(/filename=("?)([^";]+)\1/i)?.[2];
    const raw = utf8 || plain;
    if (!raw) return '';
    try { return decodeURIComponent(raw).replace(/[\\/:*?"<>|]+/g, '_'); } catch (_) { return raw.replace(/[\\/:*?"<>|]+/g, '_'); }
  }



export { append, clean, defaultSizeUnit, el, fileNameFromDisposition, normalizeInputValue, num, pageIsDark, parseMult, sanitize, setStatus, sizeValue, toInt };

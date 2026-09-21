import { state } from './config.js';



function formRequest(url, data) { return { url, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() }; }

function assertOk(resp) { if (!resp.ok) throw new Error(`HTTP ${resp.status}`); }

async function safeJson(resp) { try { return await resp.json(); } catch (_) { return null; } }

function closestCell(node) { return node?.closest?.('td,th') || null; }

function isVisible(node) { return node && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden'; }

function clean(textValue) { return String(textValue || '').replace(/\s+/g, ' ').trim(); }

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function setStatus(msg) { if (state.ui.status) state.ui.status.textContent = msg; }

function input(id, placeholder, width) { const n = el('input', { id, placeholder }); n.style.width = width; return n; }

function button(labelText, fn, className = '') { const n = el('button', { class: `ptc-btn ${className}`.trim() }); n.textContent = labelText; n.addEventListener('click', fn); return n; }

function text(value) { return document.createTextNode(value); }

function append(parent, ...children) { children.forEach(child => parent.appendChild(child)); return parent; }

function el(tag, attrs = {}) { const n = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; }

function escapeRegExp(value) { return String(value).replace(/[.+?^${}()|[\]\\]/g, '\\$&'); }



export { append, assertOk, button, clean, closestCell, el, escapeRegExp, formRequest, input, isVisible, safeJson, setStatus, sleep, text };

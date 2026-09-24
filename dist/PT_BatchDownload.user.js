// ==UserScript==
// @name         PT 批量下载种子
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.6.9
// @description  通用 PT 当前页批量下载工具，支持关键字/体积/做种数/优惠多选筛选、浏览器直下(zip打包)、qBittorrent/Transmission 推送。适配 NexusPHP、Unit3D(/torrents)、Gazelle(GGn) 列表页。
// @author       wuyaos & AI
// @match        https://*/*.php*
// @match        *://*/torrents*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @require      https://unpkg.com/jszip@3.10.1/dist/jszip.min.js
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/pt-batch.png
// @noframes
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/PT_BatchDownload.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/PT_BatchDownload.user.js
// ==/UserScript==

// Generated from src/scripts/pt-batch-download/index.js; do not edit dist files.
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/scripts/pt-batch-download/config.js
  var ID = "ptbd-panel";
  var TOGGLE_ID = "ptbd-toggle";
  var CUSTOM_SITES_KEY = "ptbd_custom_sites";
  var DOWNLOADERS_KEY = "ptbd_downloaders";
  var DEFAULT_PATHS = ["/userdetails.php", "/torrents.php", "/special.php", "/browse.php"];
  var UNIT3D_LIST_PATH = "/torrents";
  var UNIT3D_DL_SELECTOR = 'a[href*="/torrents/download/"]';
  var DEFAULT_DL = { id: "", name: "", type: "qb", host: "", username: "", password: "", qbCategory: "", qbTags: "", qbSavePath: "", trDownloadDir: "", trLabels: "" };
  var UNIT_BYTES = { kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4, b: 1 };
  var SIZE_UNITS = ["GiB", "MiB", "KiB", "TiB"];
  var state = { torrents: [], filtered: [], selected: /* @__PURE__ */ new Set(), selectedDownloaderId: "", isDownloading: false, ui: {} };

  // src/scripts/pt-batch-download/upload.js
  function gmUploadFile({ url, headers = {}, fieldName, fileName, blob, extraFields = {} }) {
    return new Promise((resolve, reject) => {
      const boundary = "----ptbd" + Math.random().toString(36).slice(2);
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result);
        let body = "";
        for (const [key, value] of Object.entries(extraFields)) {
          if (!value) continue;
          body += `--${boundary}\r
Content-Disposition: form-data; name="${key}"\r
\r
${value}\r
`;
        }
        const headerStr = `${body}--${boundary}\r
Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r
Content-Type: application/x-bittorrent\r
\r
`;
        const headerBytes = new TextEncoder().encode(headerStr);
        const footerStr = `\r
--${boundary}--\r
`;
        const footerBytes = new TextEncoder().encode(footerStr);
        const combined = new Uint8Array(headerBytes.length + bytes.length + footerBytes.length);
        combined.set(headerBytes, 0);
        combined.set(bytes, headerBytes.length);
        combined.set(footerBytes, headerBytes.length + bytes.length);
        GM_xmlhttpRequest({
          method: "POST",
          url,
          headers: { ...headers, "Content-Type": `multipart/form-data; boundary=${boundary}` },
          data: combined.buffer,
          timeout: 3e4,
          onload: /* @__PURE__ */ __name((res) => resolve({ status: res.status, responseText: res.responseText, responseHeaders: res.responseHeaders || "" }), "onload"),
          onerror: /* @__PURE__ */ __name(() => reject(new Error("上传网络错误")), "onerror"),
          ontimeout: /* @__PURE__ */ __name(() => reject(new Error("上传超时")), "ontimeout")
        });
      };
      reader.onerror = () => reject(new Error("读取种子文件失败"));
      reader.readAsArrayBuffer(blob);
    });
  }
  __name(gmUploadFile, "gmUploadFile");

  // src/scripts/pt-batch-download/formatting.js
  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  __name(clean, "clean");
  function sanitize(value) {
    const text = clean(value).replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120);
    return text || "torrent";
  }
  __name(sanitize, "sanitize");
  function fileNameFromDisposition(value) {
    const text = String(value || "");
    const utf8 = text.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = text.match(/filename=("?)([^";]+)\1/i)?.[2];
    const raw = utf8 || plain;
    if (!raw) return "";
    try {
      return decodeURIComponent(raw).replace(/[\\/:*?"<>|]+/g, "_");
    } catch (error) {
      return raw.replace(/[\\/:*?"<>|]+/g, "_");
    }
  }
  __name(fileNameFromDisposition, "fileNameFromDisposition");
  function pageIsDark() {
    const color = firstPaintedBg(document.body);
    return color ? colorBrightness(color) < 128 : false;
  }
  __name(pageIsDark, "pageIsDark");
  function firstPaintedBg(node) {
    for (let item = node; item && item !== document.documentElement; item = item.parentElement) {
      const bg = getComputedStyle(item).backgroundColor;
      if (bg && bg !== "transparent" && !/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(bg)) return bg;
    }
    return getComputedStyle(document.body).backgroundColor;
  }
  __name(firstPaintedBg, "firstPaintedBg");
  function colorBrightness(color) {
    const match = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return 255;
    return (Number(match[1]) * 299 + Number(match[2]) * 587 + Number(match[3]) * 114) / 1e3;
  }
  __name(colorBrightness, "colorBrightness");
  function parseSize(text) {
    const match = String(text || "").match(/(\d+(?:\.\d+)?)\s*([TGMK]i?B|B)\b/i);
    if (!match) return null;
    const value = parseFloat(match[1]);
    const factor = UNIT_BYTES[match[2].toLowerCase()];
    return isFinite(value) && factor ? value * factor : null;
  }
  __name(parseSize, "parseSize");
  function formatBytes(bytes) {
    if (bytes == null || !isFinite(bytes)) return "-";
    const units = [["TiB", 1024 ** 4], ["GiB", 1024 ** 3], ["MiB", 1024 ** 2], ["KiB", 1024]];
    for (const [name, factor] of units) if (bytes >= factor) return (bytes / factor).toFixed(2) + " " + name;
    return bytes + " B";
  }
  __name(formatBytes, "formatBytes");
  function sizeInputToBytes(value, unit) {
    const num = parseFloat(value);
    if (!isFinite(num)) return null;
    return num * (UNIT_BYTES[String(unit || "GiB").toLowerCase()] || UNIT_BYTES.gib);
  }
  __name(sizeInputToBytes, "sizeInputToBytes");
  function numberOrNull(value) {
    const num = parseInt(value, 10);
    return Number.isFinite(num) ? num : null;
  }
  __name(numberOrNull, "numberOrNull");
  function toNumber(text) {
    const match = String(text || "").replace(/,/g, "").match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }
  __name(toNumber, "toNumber");
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  __name(sleep, "sleep");
  function uniqueId() {
    return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  __name(uniqueId, "uniqueId");
  function uniqueByTid(items) {
    const seen = /* @__PURE__ */ new Set();
    return items.filter((item) => {
      if (!item.tid || seen.has(item.tid)) return false;
      seen.add(item.tid);
      return true;
    });
  }
  __name(uniqueByTid, "uniqueByTid");
  function absoluteUrl(url) {
    return new URL(url, location.href).href;
  }
  __name(absoluteUrl, "absoluteUrl");
  function safeGet(key, fallback) {
    try {
      return GM_getValue(key, fallback);
    } catch (error) {
      return fallback;
    }
  }
  __name(safeGet, "safeGet");
  function cssEscape(text) {
    if (window.CSS && CSS.escape) return CSS.escape(text);
    return String(text).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
  __name(cssEscape, "cssEscape");
  function escapeRegExp(text) {
    return String(text).replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }
  __name(escapeRegExp, "escapeRegExp");
  function setStatus(text) {
    if (state.ui.status) state.ui.status.textContent = text;
  }
  __name(setStatus, "setStatus");

  // src/scripts/pt-batch-download/downloaders.js
  async function pushToQBittorrent(item, cfg) {
    try {
      const base = clean(cfg.host).replace(/\/$/, "");
      if (!base) throw new Error("qBittorrent Host 为空");
      const loginHeaders = { "Content-Type": "application/x-www-form-urlencoded", Referer: base };
      const login = await gmRequest({
        method: "POST",
        url: `${base}/api/v2/auth/login`,
        headers: loginHeaders,
        data: `username=${encodeURIComponent(cfg.username)}&password=${encodeURIComponent(cfg.password)}`
      });
      if (login.status !== 200) throw new Error(`qBittorrent 登录失败 HTTP ${login.status}: ${login.responseText?.slice(0, 100) || ""}`);
      const sid = login.responseHeaders.match(/Set-Cookie:\s*SID=([^;]+)/i)?.[1];
      const torrentRes = await fetch(item.downloadUrl, { credentials: "include" });
      if (!torrentRes.ok) throw new Error(`下载种子失败 HTTP ${torrentRes.status}`);
      const torrentBlob = await torrentRes.blob();
      if (!torrentBlob.size) throw new Error("种子文件为空");
      const addHeaders = { Referer: base };
      if (sid) addHeaders.Cookie = `SID=${sid}`;
      const add = await gmUploadFile({
        url: `${base}/api/v2/torrents/add`,
        headers: addHeaders,
        fieldName: "torrents",
        fileName: `${item.tid || "torrent"}.torrent`,
        blob: torrentBlob,
        extraFields: { category: cfg.qbCategory, tags: cfg.qbTags, savepath: cfg.qbSavePath }
      });
      if (add.status !== 200) throw new Error(`qBittorrent 添加失败 HTTP ${add.status}: ${add.responseText?.slice(0, 100) || ""}`);
    } catch (error) {
      console.warn("[PTBD] qBittorrent 推送失败", { item, cfg: { ...cfg, password: cfg.password ? "***" : "" }, error });
      throw error;
    }
  }
  __name(pushToQBittorrent, "pushToQBittorrent");
  async function testDownloaderConnection(cfg) {
    if (cfg.type === "qb") {
      const base2 = clean(cfg.host).replace(/\/$/, "");
      const login = await gmRequest({
        method: "POST",
        url: `${base2}/api/v2/auth/login`,
        headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: base2 },
        data: `username=${encodeURIComponent(cfg.username)}&password=${encodeURIComponent(cfg.password)}`
      });
      if (login.status !== 200) throw new Error(`HTTP ${login.status}: ${login.responseText?.slice(0, 100) || ""}`);
      return;
    }
    const base = clean(cfg.host).replace(/\/$/, "");
    const headers = { "Content-Type": "application/json" };
    if (cfg.username) headers.Authorization = "Basic " + btoa(`${cfg.username}:${cfg.password}`);
    let res = await gmRequest({ method: "POST", url: `${base}/transmission/rpc`, headers, data: JSON.stringify({ method: "session-get" }) });
    if (res.status === 409) {
      const sid = res.responseHeaders.match(/X-Transmission-Session-Id:\s*(\S+)/i)?.[1];
      if (sid) {
        headers["X-Transmission-Session-Id"] = sid;
        res = await gmRequest({ method: "POST", url: `${base}/transmission/rpc`, headers, data: JSON.stringify({ method: "session-get" }) });
      }
    }
    if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${res.responseText?.slice(0, 100) || ""}`);
    const json = JSON.parse(res.responseText || "{}");
    if (json.result && json.result !== "success") throw new Error(json.result);
  }
  __name(testDownloaderConnection, "testDownloaderConnection");
  async function pushToTransmission(item, cfg) {
    const base = clean(cfg.host).replace(/\/$/, "");
    if (!base) throw new Error("Transmission Host 为空");
    const rpcUrl = `${base}/transmission/rpc`;
    const torrentRes = await fetch(item.downloadUrl, { credentials: "include" });
    if (!torrentRes.ok) throw new Error(`下载种子失败 HTTP ${torrentRes.status}`);
    const torrentBuf = await torrentRes.arrayBuffer();
    if (!torrentBuf.byteLength) throw new Error("种子文件为空");
    const bytes = new Uint8Array(torrentBuf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const args = { metainfo: btoa(binary) };
    if (cfg.trDownloadDir) args["download-dir"] = cfg.trDownloadDir;
    const labels = String(cfg.trLabels || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (labels.length) args.labels = labels;
    const headers = { "Content-Type": "application/json" };
    if (cfg.username) headers.Authorization = "Basic " + btoa(`${cfg.username}:${cfg.password}`);
    const body = JSON.stringify({ method: "torrent-add", arguments: args });
    let res = await gmRequest({ method: "POST", url: rpcUrl, headers, data: body });
    if (res.status === 409) {
      const sid = res.responseHeaders.match(/X-Transmission-Session-Id:\s*(\S+)/i)?.[1];
      if (sid) {
        headers["X-Transmission-Session-Id"] = sid;
        res = await gmRequest({ method: "POST", url: rpcUrl, headers, data: body });
      }
    }
    if (res.status !== 200) throw new Error(`tr 添加失败 HTTP ${res.status}`);
    const json = JSON.parse(res.responseText || "{}");
    if (json.result && json.result !== "success" && !String(json.result).includes("duplicate")) throw new Error(`tr: ${json.result}`);
  }
  __name(pushToTransmission, "pushToTransmission");

  // src/scripts/pt-batch-download/controls.js
  function multiFilter(title, selected) {
    const root = el("details");
    const summary = el("summary");
    const box = el("div", { class: "ptbd-menu" });
    root.append(summary, box);
    const control = { root, summary, box, title, selected: new Set(selected || []) };
    root.addEventListener("change", () => updateMultiSummary(control));
    updateMultiSummary(control);
    return control;
  }
  __name(multiFilter, "multiFilter");
  function fillMulti(control, values, selected) {
    if (!control) return;
    const old = new Set(selected || selectedMulti(control));
    control.box.textContent = "";
    values.forEach(([value, text]) => {
      const cb = el("input", { type: "checkbox", value });
      cb.checked = old.has(value);
      control.box.append(el("label", {}, cb, ` ${text}`));
    });
    updateMultiSummary(control);
  }
  __name(fillMulti, "fillMulti");
  function selectedMulti(control) {
    if (!control) return [];
    return [...control.box.querySelectorAll("input:checked")].map((input2) => input2.value).filter((value) => value !== "all");
  }
  __name(selectedMulti, "selectedMulti");
  function updateMultiSummary(control) {
    const selected = selectedMulti(control);
    const all = control.box.querySelector('input[value="all"]');
    if (all && all.checked) {
      control.box.querySelectorAll('input:not([value="all"])').forEach((input2) => {
        input2.checked = false;
      });
    }
    control.summary.textContent = selected.length ? `已选 ${selected.length}` : "全部";
  }
  __name(updateMultiSummary, "updateMultiSummary");
  function input(type, placeholder, value = "") {
    return el("input", { type, placeholder, value });
  }
  __name(input, "input");
  function unitSelect(value) {
    const sel = select(SIZE_UNITS.map((unit) => [unit, unit]), value);
    sel.className = "ptbd-unit";
    return sel;
  }
  __name(unitSelect, "unitSelect");
  function select(options, value) {
    const node = el("select");
    options.forEach(([val, text]) => {
      const opt = el("option", { value: val }, text);
      if (val === value) opt.selected = true;
      node.append(opt);
    });
    return node;
  }
  __name(select, "select");
  function field(labelText, child, cls = "") {
    return el("div", { class: `ptbd-field ${cls}`.trim() }, el("label", {}, labelText), child);
  }
  __name(field, "field");
  function sizeRangeField(labelText, min, minUnit, max, maxUnit) {
    return el(
      "div",
      { class: "ptbd-field ptbd-range-field ptbd-size-range-field" },
      el("label", {}, labelText),
      el("div", { class: "ptbd-range" }, el("div", { class: "ptbd-size-box" }, min, minUnit), el("span", {}, "~"), el("div", { class: "ptbd-size-box" }, max, maxUnit))
    );
  }
  __name(sizeRangeField, "sizeRangeField");
  function rangeField(labelText, min, max) {
    return el(
      "div",
      { class: "ptbd-field ptbd-range-field" },
      el("label", {}, labelText),
      el("div", { class: "ptbd-range" }, min, el("span", {}, "~"), max)
    );
  }
  __name(rangeField, "rangeField");
  function selectField(labelText, control) {
    return el("div", { class: "ptbd-field ptbd-select-field" }, el("label", {}, labelText), control);
  }
  __name(selectField, "selectField");
  function button(labelText, fn, cls = "ptbd-btn") {
    const btn = el("button", { type: "button", class: cls }, labelText);
    btn.addEventListener("click", fn);
    return btn;
  }
  __name(button, "button");
  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value == null) return;
      if (key === "class") node.className = value;
      else if (key === "style") node.style.cssText = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    });
    kids.flat().forEach((kid) => {
      if (kid == null) return;
      node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    });
    return node;
  }
  __name(el, "el");
  function append(parent, ...kids) {
    kids.forEach((kid) => parent.append(kid));
    return parent;
  }
  __name(append, "append");

  // src/scripts/pt-batch-download/styles.js
  function ensureStyle() {
    if (document.querySelector("#ptbd-style")) return;
    GM_addStyle(`
#${ID}.ptbd-theme-dark{--ptbd-panel-bg:linear-gradient(180deg,#162234,#101928);--ptbd-head-bg:rgba(21,35,55,.92);--ptbd-text:#c9d7ea;--ptbd-title:#e8f1ff;--ptbd-label:#dbeafe;--ptbd-muted:#a9bdd5;--ptbd-border:#2b4565;--ptbd-border-strong:#385a82;--ptbd-input-bg:#0f1b2b;--ptbd-input-text:#e5eefb;--ptbd-menu-hover:#17304d;--ptbd-btn-bg:#17263a;--ptbd-btn-text:#dbeafe;--ptbd-primary-bg:#173f35;--ptbd-primary-border:#2f7d5d;--ptbd-primary-text:#b9f6d3;--ptbd-check-bg:#15304c;--ptbd-status-bg:#101b2b;--ptbd-shadow:0 8px 24px rgba(0,0,0,.28)}
#${ID}.ptbd-theme-light{--ptbd-panel-bg:linear-gradient(180deg,#fbfcfe,#f4f7fb);--ptbd-head-bg:rgba(238,243,248,.92);--ptbd-text:#2f3742;--ptbd-title:#253044;--ptbd-label:#3a4757;--ptbd-muted:#536071;--ptbd-border:#d8dee8;--ptbd-border-strong:#c8d1dd;--ptbd-input-bg:#fff;--ptbd-input-text:#243044;--ptbd-menu-hover:#f2f6fb;--ptbd-btn-bg:#f3f5f8;--ptbd-btn-text:#2f3b4d;--ptbd-primary-bg:#e6f3ed;--ptbd-primary-border:#a8d0bc;--ptbd-primary-text:#1f6041;--ptbd-check-bg:#e8f1fb;--ptbd-status-bg:#eef3f8;--ptbd-shadow:0 2px 8px rgba(20,35,60,.12)}
#${TOGGLE_ID}{position:fixed;right:18px;bottom:18px;z-index:999999;border:0;border-radius:999px;padding:10px 16px;background:#2563eb;color:#fff;font:700 13px/1 Arial,Helvetica,sans-serif;cursor:pointer;box-shadow:0 10px 28px rgba(37,99,235,.35),0 4px 14px rgba(0,0,0,.25)}
#${TOGGLE_ID}:hover{filter:brightness(1.08)}
#${ID}{position:fixed;right:18px;bottom:66px;z-index:999998;width:min(1180px,calc(100vw - 36px));max-height:82vh;overflow:auto;box-sizing:border-box;color:var(--ptbd-text);background:var(--ptbd-panel-bg);border:1px solid var(--ptbd-border);border-radius:10px;box-shadow:var(--ptbd-shadow);font:12px/1.5 Arial,Helvetica,'Microsoft YaHei',sans-serif}
#${ID}.ptbd-hidden{display:none}
#${ID} .ptbd-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid var(--ptbd-border);background:var(--ptbd-head-bg);border-radius:10px 10px 0 0}
#${ID} .ptbd-title{font-weight:700;color:var(--ptbd-title);white-space:nowrap}
#${ID} .ptbd-head-actions{display:flex;align-items:center;gap:8px}
#${ID} .ptbd-body{padding:10px 12px;display:flex;flex-direction:column;gap:10px}
#${ID} .ptbd-body.ptbd-collapsed{display:none}
#${ID} .ptbd-filter-groups{display:flex;flex-direction:column;gap:10px}
#${ID} .ptbd-filter-row{display:grid;gap:10px;align-items:center}
#${ID} .ptbd-filter-row-main{grid-template-columns:minmax(260px,1.2fr) minmax(420px,1.8fr) minmax(180px,.7fr)}
#${ID} .ptbd-filter-row-extra{grid-template-columns:minmax(220px,.8fr) minmax(320px,1.3fr) minmax(260px,1fr)}
#${ID} .ptbd-field{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:8px;color:var(--ptbd-muted);min-width:0}
#${ID} .ptbd-field>label{color:var(--ptbd-label);font-weight:600;white-space:nowrap;text-align:right;min-width:72px}
#${ID} input,#${ID} select{height:28px;width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--ptbd-border-strong);border-radius:5px;background:var(--ptbd-input-bg);color:var(--ptbd-input-text);padding:2px 7px}
#${ID} input::placeholder{color:var(--ptbd-muted)}
#${ID} .ptbd-range{display:grid;grid-template-columns:minmax(96px,1fr) auto minmax(96px,1fr);align-items:center;gap:8px;min-width:0}
#${ID} .ptbd-size-range-field .ptbd-range{grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr)}
#${ID} .ptbd-size-box{display:grid;grid-template-columns:minmax(92px,1fr) 54px;gap:6px;min-width:0}
#${ID} .ptbd-unit{width:50px;padding-left:2px;padding-right:0}
#${ID} details{position:relative;min-width:0}
#${ID} summary{list-style:none;cursor:pointer;height:28px;box-sizing:border-box;border:1px solid var(--ptbd-border-strong);background:var(--ptbd-input-bg);border-radius:5px;padding:2px 7px;color:var(--ptbd-input-text);min-width:110px;text-align:center;line-height:22px}
#${ID} .ptbd-select-field summary{text-align:left;padding:2px 28px 2px 10px;position:relative}
#${ID} .ptbd-select-field summary::after{content:'▾';position:absolute;right:10px;top:50%;transform:translateY(-50%)}
#${ID} summary::-webkit-details-marker{display:none}
#${ID} details[open] summary{background:var(--ptbd-input-bg)}
#${ID} .ptbd-menu{position:absolute;z-index:999999;top:32px;left:0;max-height:220px;overflow:auto;min-width:170px;padding:5px;border:1px solid var(--ptbd-border-strong);background:var(--ptbd-input-bg);color:var(--ptbd-input-text);border-radius:6px;box-shadow:var(--ptbd-shadow)}
#${ID} .ptbd-menu label{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;white-space:nowrap;cursor:pointer}
#${ID} .ptbd-menu label:hover{background:var(--ptbd-menu-hover)}
#${ID} .ptbd-menu input{width:auto;height:auto}
#${ID} .ptbd-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
#${ID} .ptbd-btn,#${ID} .ptbd-mini,#${ID} .ptbd-collapse{height:28px;border:1px solid var(--ptbd-border-strong);border-radius:5px;background:var(--ptbd-btn-bg);color:var(--ptbd-btn-text);padding:0 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
#${ID} .ptbd-close{height:28px;min-width:28px;border:1px solid var(--ptbd-border);border-radius:5px;background:var(--ptbd-input-bg);color:var(--ptbd-muted);font-size:18px;line-height:1;cursor:pointer}
#${ID} .ptbd-btn:hover,#${ID} .ptbd-mini:hover,#${ID} .ptbd-collapse:hover,#${ID} .ptbd-close:hover{filter:brightness(1.08)}
#${ID} .ptbd-btn-primary{background:var(--ptbd-primary-bg);border-color:var(--ptbd-primary-border);color:var(--ptbd-primary-text);font-weight:700}
#${ID} .ptbd-btn-check{background:var(--ptbd-check-bg)}
#${ID} .ptbd-status{margin-left:auto;color:var(--ptbd-muted);background:var(--ptbd-status-bg);border:1px solid var(--ptbd-border);border-radius:5px;padding:4px 8px;min-width:220px;text-align:right}
#${ID} .ptbd-dl-status{color:var(--ptbd-label);background:var(--ptbd-status-bg);border:1px solid var(--ptbd-border);border-radius:999px;padding:4px 9px;white-space:nowrap}
#${ID} .ptbd-dl-select{width:auto;min-width:150px}
#${ID} .ptbd-section-title{font-weight:700;color:var(--ptbd-label);margin:8px 0}
#${ID} .ptbd-table-wrap{overflow:auto;border:1px solid var(--ptbd-border);border-radius:8px}
#${ID} .ptbd-table{width:100%;border-collapse:collapse;background:var(--ptbd-input-bg);color:var(--ptbd-text)}
#${ID} .ptbd-table th,#${ID} .ptbd-table td{border-top:1px solid var(--ptbd-border);padding:7px 8px;text-align:left;vertical-align:top}
#${ID} .ptbd-table th:nth-child(3),#${ID} .ptbd-table td:nth-child(3){min-width:86px;white-space:nowrap}
#${ID} .ptbd-table th:nth-child(4),#${ID} .ptbd-table td:nth-child(4){min-width:58px;white-space:nowrap}
#${ID} .ptbd-table th{position:sticky;top:0;background:var(--ptbd-head-bg);z-index:1;color:var(--ptbd-label)}
#${ID} .ptbd-table a{color:#60a5fa;text-decoration:none}
#${ID} .ptbd-table tbody tr:hover{background:var(--ptbd-menu-hover)}
.ptbd-modal{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#f5f7fa;font:13px/1.5 Arial,Helvetica,'Microsoft YaHei',sans-serif}
.ptbd-modal-box{width:min(720px,calc(100vw - 36px));max-height:80vh;overflow:auto;background:#1f2933;border:1px solid #374151;border-radius:10px;box-shadow:0 18px 54px rgba(0,0,0,.45)}
.ptbd-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #374151;background:#243041}
.ptbd-site-list,.ptbd-dl-modal-body{padding:12px}.ptbd-site-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #374151}.ptbd-site-item span{word-break:break-all}.ptbd-dl-modal-body,.ptbd-dl-form{display:grid;grid-template-columns:1fr;gap:8px}.ptbd-modal .ptbd-field{display:grid;grid-template-columns:minmax(96px,auto) minmax(0,1fr);align-items:center;gap:8px;color:#cbd5e1}.ptbd-modal .ptbd-field>label{font-weight:600;white-space:nowrap;text-align:right}.ptbd-modal input,.ptbd-modal select{height:30px;width:100%;min-width:0;box-sizing:border-box;border:1px solid #475569;border-radius:5px;background:#111827;color:#f8fafc;padding:2px 8px}.ptbd-modal .ptbd-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.ptbd-modal .ptbd-btn,.ptbd-modal .ptbd-close{height:28px;border:1px solid #475569;border-radius:5px;background:#334155;color:#f8fafc;padding:0 12px;cursor:pointer}.ptbd-modal .ptbd-close{min-width:28px;font-size:18px;line-height:1}.ptbd-form-errors{color:#fecaca;min-height:18px}.ptbd-test-status{color:#bbf7d0;margin-right:auto}.ptbd-empty{text-align:center;color:#94a3b8;padding:14px!important}.ptbd-danger{background:#7f1d1d!important;border-color:#991b1b!important;color:#fff!important}
@media(max-width:1100px){#${ID} .ptbd-filter-row-main,#${ID} .ptbd-filter-row-extra{grid-template-columns:1fr}}
@media(max-width:680px){#${ID} .ptbd-status{margin-left:0;text-align:left;flex-basis:100%}#${ID} .ptbd-field{grid-template-columns:minmax(70px,auto) minmax(0,1fr)}}
    `);
    const style = document.createElement("style");
    style.id = "ptbd-style";
    style.textContent = "";
    document.documentElement.append(style);
  }
  __name(ensureStyle, "ensureStyle");

  // src/scripts/pt-batch-download/downloader-settings.js
  function configDownloader() {
    ensureStyle();
    document.querySelector("#ptbd-dl-modal")?.remove();
    const overlay = el("div", { id: "ptbd-dl-modal", class: "ptbd-modal" });
    const close = button("×", () => overlay.remove(), "ptbd-close");
    const body = el("div", { class: "ptbd-dl-modal-body" });
    const box = el(
      "div",
      { class: "ptbd-modal-box" },
      el("div", { class: "ptbd-modal-head" }, el("strong", {}, "下载器设置"), close),
      body
    );
    const renderList = /* @__PURE__ */ __name(() => {
      body.textContent = "";
      const list = getDownloaders();
      if (!list.length) body.append(el("div", { class: "ptbd-empty" }, "暂无下载器"));
      list.forEach((cfg) => {
        const edit = button("编辑", () => renderEditor(cfg), "ptbd-btn");
        const del = button("删除", () => {
          if (!confirm(`删除下载器：${cfg.name || cfg.host || (cfg.type === "tr" ? "Transmission" : "qBittorrent")}？`)) return;
          saveDownloaders(getDownloaders().filter((item) => item.id !== cfg.id));
          if (state.selectedDownloaderId === cfg.id) state.selectedDownloaderId = "";
          updateDownloaderStatus();
          renderList();
        }, "ptbd-btn ptbd-danger");
        body.append(el(
          "div",
          { class: "ptbd-site-item" },
          el("span", {}, `${cfg.name || "(未命名)"} / ${cfg.type === "tr" ? "Transmission" : "qBittorrent"} / ${cfg.host || "-"}`),
          el("div", { class: "ptbd-actions" }, edit, del)
        ));
      });
      body.append(el("div", { class: "ptbd-actions" }, button("添加下载器", () => renderEditor(), "ptbd-btn ptbd-btn-check")));
    }, "renderList");
    const renderEditor = /* @__PURE__ */ __name((cfg) => {
      const item = { ...DEFAULT_DL, ...cfg || {}, id: cfg?.id || "", type: cfg?.type || "qb" };
      const dlName = input("text", "显示名称", item.name);
      const dlType = select([["qb", "qBittorrent"], ["tr", "Transmission"]], item.type);
      const dlHost = input("text", "http://127.0.0.1:8080", item.host);
      const dlUsername = input("text", "Username", item.username);
      const dlPassword = input("password", "Password", item.password);
      const qbCategory = input("text", "Category", item.qbCategory);
      const qbTags = input("text", "Tags, comma separated", item.qbTags);
      const qbSavePath = input("text", "Save path", item.qbSavePath);
      const trDownloadDir = input("text", "Download dir", item.trDownloadDir);
      const trLabels = input("text", "Labels, comma separated", item.trLabels);
      const errorBox = el("div", { class: "ptbd-form-errors" });
      const testStatus = el("span", { class: "ptbd-test-status" });
      const qbRows = [el("div", { class: "ptbd-section-title" }, "qBittorrent"), field("分类", qbCategory), field("标签", qbTags), field("保存路径", qbSavePath)];
      const trRows = [el("div", { class: "ptbd-section-title" }, "Transmission"), field("下载目录", trDownloadDir), field("标签", trLabels)];
      const fillName = /* @__PURE__ */ __name(() => {
        if (clean(dlName.value) || !clean(dlHost.value)) return;
        dlName.value = `${dlType.value === "qb" ? "qBittorrent" : "Transmission"} ${clean(dlHost.value)}`;
      }, "fillName");
      const setTypeFields = /* @__PURE__ */ __name(() => {
        qbRows.forEach((row) => {
          row.style.display = dlType.value === "qb" ? "" : "none";
        });
        trRows.forEach((row) => {
          row.style.display = dlType.value === "tr" ? "" : "none";
        });
        fillName();
      }, "setTypeFields");
      const validate = /* @__PURE__ */ __name(() => {
        const errors = [];
        fillName();
        if (!clean(dlName.value)) errors.push("名称不能为空");
        if (!clean(dlHost.value)) errors.push("Host 不能为空");
        else if (!/^https?:\/\//i.test(clean(dlHost.value))) errors.push("Host 必须以 http:// 或 https:// 开头");
        errorBox.textContent = "";
        errors.forEach((message) => errorBox.append(el("div", {}, message)));
        return !errors.length;
      }, "validate");
      const currentConfig = /* @__PURE__ */ __name(() => ({
        id: item.id,
        name: clean(dlName.value),
        type: dlType.value,
        host: clean(dlHost.value),
        username: clean(dlUsername.value),
        password: dlPassword.value,
        qbCategory: clean(qbCategory.value),
        qbTags: clean(qbTags.value),
        qbSavePath: clean(qbSavePath.value),
        trDownloadDir: clean(trDownloadDir.value),
        trLabels: clean(trLabels.value)
      }), "currentConfig");
      const test = button("测试连接", async () => {
        testStatus.textContent = "测试中...";
        if (!validate()) {
          testStatus.textContent = "请先修正配置";
          return;
        }
        try {
          await testDownloaderConnection(currentConfig());
          testStatus.textContent = "连接成功";
        } catch (error) {
          testStatus.textContent = `连接失败：${error.message || error}`;
        }
      }, "ptbd-btn");
      const save = button("保存", () => {
        if (!validate()) return;
        const saved = currentConfig();
        if (!saved.id) saved.id = uniqueId();
        item.id = saved.id;
        const list = getDownloaders();
        const index = list.findIndex((old) => String(old.id) === String(saved.id));
        if (index >= 0) list[index] = saved;
        else list.push(saved);
        saveDownloaders(list);
        state.selectedDownloaderId = saved.id;
        updateDownloaderStatus();
        setStatus("下载器设置已保存");
        renderList();
      }, "ptbd-btn ptbd-btn-check");
      const cancel = button("取消", renderList, "ptbd-btn");
      dlType.addEventListener("change", setTypeFields);
      dlHost.addEventListener("blur", fillName);
      body.textContent = "";
      body.append(
        el(
          "div",
          { class: "ptbd-dl-form" },
          field("名称", dlName),
          field("类型", dlType),
          field("Host", dlHost),
          field("用户名", dlUsername),
          field("密码", dlPassword),
          qbRows,
          trRows,
          errorBox,
          el("div", { class: "ptbd-actions" }, cancel, test, testStatus, save)
        )
      );
      setTypeFields();
    }, "renderEditor");
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.append(box);
    document.body.append(overlay);
    renderList();
  }
  __name(configDownloader, "configDownloader");
  function getDownloaders() {
    let list = [];
    try {
      list = GM_getValue(DOWNLOADERS_KEY, []);
    } catch (error) {
    }
    if (!Array.isArray(list)) return [];
    let changed = false;
    const normalized = list.map((item) => {
      const cfg = { ...DEFAULT_DL, ...item && typeof item === "object" ? item : {} };
      if (!cfg.id) {
        cfg.id = uniqueId();
        changed = true;
      }
      return cfg;
    }).filter((item) => item.id && (item.type === "qb" || item.type === "tr"));
    if (changed) GM_setValue(DOWNLOADERS_KEY, normalized);
    return normalized;
  }
  __name(getDownloaders, "getDownloaders");
  function saveDownloaders(list) {
    GM_setValue(DOWNLOADERS_KEY, Array.isArray(list) ? list : []);
  }
  __name(saveDownloaders, "saveDownloaders");
  function getDownloaderById(id) {
    if (!id) return null;
    return getDownloaders().find((item) => String(item.id) === String(id)) || null;
  }
  __name(getDownloaderById, "getDownloaderById");
  function downloaderStatusText(count) {
    return count ? "下载器:" : "下载器: 无";
  }
  __name(downloaderStatusText, "downloaderStatusText");
  function downloaderSelect(downloaders) {
    const sel = select([["", "无(浏览器下载)"], ...downloaders.map((item) => [item.id, item.name || item.host || (item.type === "tr" ? "Transmission" : "qBittorrent")])], state.selectedDownloaderId);
    sel.className = "ptbd-dl-select";
    sel.addEventListener("change", () => {
      state.selectedDownloaderId = sel.value;
      updateDownloaderStatus();
    });
    return sel;
  }
  __name(downloaderSelect, "downloaderSelect");
  function updateDownloaderStatus() {
    const downloaders = getDownloaders();
    if (state.selectedDownloaderId && !downloaders.some((item) => String(item.id) === String(state.selectedDownloaderId))) state.selectedDownloaderId = "";
    if (state.ui.downloaderStatus) state.ui.downloaderStatus.textContent = downloaderStatusText(downloaders.length);
    if (state.ui.downloaderSelect) {
      const value = state.selectedDownloaderId;
      state.ui.downloaderSelect.textContent = "";
      state.ui.downloaderSelect.append(el("option", { value: "" }, "无(浏览器下载)"));
      downloaders.forEach((item) => state.ui.downloaderSelect.append(el("option", { value: item.id }, item.name || item.host || (item.type === "tr" ? "Transmission" : "qBittorrent"))));
      state.ui.downloaderSelect.value = value;
    }
    if (state.ui.batchButton) state.ui.batchButton.textContent = state.selectedDownloaderId ? "推送已选" : "下载已选";
  }
  __name(updateDownloaderStatus, "updateDownloaderStatus");

  // src/scripts/pt-batch-download/download.js
  var DIRECT_FETCH_TIMEOUT_MS = 2e4;
  var DIRECT_FETCH_CONCURRENCY = 4;
  async function runSerialDownload(items, delay, label, worker) {
    let success = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setStatus(`${label} ${i + 1}/${items.length}: ${item.title}`);
      try {
        await worker(item);
        success++;
      } catch (error) {
        failed++;
      }
      if (i < items.length - 1) await sleep(delay);
    }
    return { success, failed };
  }
  __name(runSerialDownload, "runSerialDownload");
  async function runConcurrentDownload(items, delay, worker) {
    const active = /* @__PURE__ */ new Set();
    let nextStart = 0;
    let success = 0;
    let failed = 0;
    const progress = /* @__PURE__ */ __name(() => setStatus(`获取种子：完成 ${success + failed}/${items.length}，成功 ${success}，失败 ${failed}，进行中 ${active.size}`), "progress");
    for (const item of items) {
      if (active.size >= DIRECT_FETCH_CONCURRENCY) await Promise.race(active);
      const wait = nextStart - Date.now();
      if (wait > 0) await sleep(wait);
      nextStart = Date.now() + delay;
      const task = Promise.resolve().then(() => worker(item)).then(
        () => {
          success++;
        },
        () => {
          failed++;
        }
      ).then(() => {
        active.delete(task);
        progress();
      });
      active.add(task);
      progress();
    }
    await Promise.all(active);
    return { success, failed };
  }
  __name(runConcurrentDownload, "runConcurrentDownload");
  async function batchDownload() {
    if (state.isDownloading) return;
    const items = uniqueByTid(state.filtered.filter((item) => state.selected.has(item.tid)));
    if (!items.length) {
      setStatus("没有勾选种子");
      return;
    }
    const cfg = getDownloaderById(state.selectedDownloaderId);
    const delay = Math.max(300, parseInt(state.ui.delay.value, 10) || 1200);
    state.isDownloading = true;
    try {
      const result = !cfg && items.length > 1 ? await downloadZip(items, delay) : await runSerialDownload(items, delay, cfg ? "推送中" : "下载中", (item) => downloadTorrent(item, cfg));
      setStatus(`完成：${items.length} 个，成功 ${result.success}，失败 ${result.failed}${result.notice ? `；${result.notice}` : ""}`);
    } catch (error) {
      setStatus(`批量${cfg ? "推送" : "下载/打包"}失败，请重试`);
    } finally {
      state.isDownloading = false;
    }
  }
  __name(batchDownload, "batchDownload");
  async function downloadTorrent(item, cfg = getDownloaderById(state.selectedDownloaderId)) {
    if (cfg?.type === "qb") return pushToQBittorrent(item, cfg);
    if (cfg?.type === "tr") return pushToTransmission(item, cfg);
    return downloadBlob(item);
  }
  __name(downloadTorrent, "downloadTorrent");
  async function downloadBlob(item) {
    try {
      const file = await fetchTorrentBlob(item);
      clickDownload(file.blob, file.name);
    } catch (error) {
      fallbackDownload(item.downloadUrl);
      throw error;
    }
  }
  __name(downloadBlob, "downloadBlob");
  async function downloadZip(items, delay) {
    if (typeof JSZip === "undefined") {
      const result2 = await runSerialDownload(items, delay, "JSZip 未加载，逐个下载", downloadBlob);
      return { ...result2, notice: "JSZip 未加载，已改为逐个浏览器下载" };
    }
    const zip = new JSZip();
    const result = await runConcurrentDownload(items, delay, async (item) => {
      const file = await fetchTorrentBlob(item);
      let name = file.name;
      let suffix = 1;
      while (zip.file(name)) name = `${suffix++}_${file.name}`;
      zip.file(name, file.blob);
    });
    if (result.success) {
      setStatus(`正在打包 ${result.success} 个种子：0%（失败 ${result.failed} 个）`);
      const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setStatus(`正在打包 ${result.success} 个种子：${Math.floor(metadata.percent)}%（失败 ${result.failed} 个）`);
      });
      clickDownload(blob, `pt_batch_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.zip`);
    }
    return { ...result, notice: result.failed ? "失败项未入 ZIP，请重新选择重试" : "" };
  }
  __name(downloadZip, "downloadZip");
  async function fetchTorrentBlob(item) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DIRECT_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(item.downloadUrl, { credentials: "include", signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (!blob.size) throw new Error("空文件");
      const name = fileNameFromDisposition(response.headers.get("content-disposition")) || `${item.tid}_${sanitize(item.title)}.torrent`;
      return { blob, name };
    } catch (error) {
      if (error?.name === "AbortError") throw new Error(`下载超时（${DIRECT_FETCH_TIMEOUT_MS / 1e3} 秒）`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  __name(fetchTorrentBlob, "fetchTorrentBlob");
  function clickDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: name, style: "display:none" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
  }
  __name(clickDownload, "clickDownload");
  function fallbackDownload(url) {
    const a = el("a", { href: url, style: "display:none" });
    document.body.append(a);
    a.click();
    a.remove();
  }
  __name(fallbackDownload, "fallbackDownload");
  function gmRequest({ method = "GET", url, headers = {}, data, responseType = "" }) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers,
        data,
        responseType,
        timeout: 2e4,
        onload: /* @__PURE__ */ __name((res) => resolve({ status: res.status, responseText: res.responseText, responseHeaders: res.responseHeaders || "", response: res.response, finalUrl: res.finalUrl }), "onload"),
        onerror: /* @__PURE__ */ __name(() => reject(new Error("网络错误")), "onerror"),
        ontimeout: /* @__PURE__ */ __name(() => reject(new Error("超时")), "ontimeout")
      });
    });
  }
  __name(gmRequest, "gmRequest");

  // src/scripts/pt-batch-download/filters.js
  function applyFilters(autoSelect = false) {
    const cfg = readFilters();
    state.filtered = state.torrents.filter((item) => matchFilters(item, cfg));
    const visibleIds = new Set(state.filtered.map((item) => item.tid));
    if (autoSelect || !state.selected.size) {
      state.selected = visibleIds;
    } else {
      state.selected = new Set([...state.selected].filter((tid) => visibleIds.has(tid)));
    }
    renderTable();
    setStatus(`当前页 ${state.torrents.length} 个，筛选 ${state.filtered.length} 个`);
  }
  __name(applyFilters, "applyFilters");
  function readFilters() {
    return {
      keyword: clean(state.ui.keyword.value).toLowerCase(),
      sizeMin: sizeInputToBytes(state.ui.sizeMin.value, state.ui.sizeMinUnit.value),
      sizeMax: sizeInputToBytes(state.ui.sizeMax.value, state.ui.sizeMaxUnit.value),
      seedMin: numberOrNull(state.ui.seedMin.value),
      seedMax: numberOrNull(state.ui.seedMax.value),
      promotions: selectedMulti(state.ui.promotion),
      seedingStatus: state.ui.seedingStatus.value
    };
  }
  __name(readFilters, "readFilters");
  function matchFilters(item, cfg) {
    if (cfg.keyword && !item.title.toLowerCase().includes(cfg.keyword)) return false;
    if (cfg.sizeMin != null && (item.sizeBytes == null || item.sizeBytes < cfg.sizeMin)) return false;
    if (cfg.sizeMax != null && (item.sizeBytes == null || item.sizeBytes > cfg.sizeMax)) return false;
    if (cfg.seedMin != null && (item.seeders == null || item.seeders < cfg.seedMin)) return false;
    if (cfg.seedMax != null && (item.seeders == null || item.seeders > cfg.seedMax)) return false;
    if (cfg.promotions.length && !item.promotion.some((tag) => cfg.promotions.includes(tag))) return false;
    if (cfg.seedingStatus === "seeding" && item.downloaded !== true) return false;
    if (cfg.seedingStatus === "not-seeding" && item.downloaded !== false) return false;
    return true;
  }
  __name(matchFilters, "matchFilters");
  function renderTable() {
    state.ui.tbody.textContent = "";
    updateSelectedSize();
    if (!state.filtered.length) {
      state.ui.tbody.append(el("tr", {}, el("td", { colspan: "7", class: "ptbd-empty" }, "无匹配种子")));
      return;
    }
    state.filtered.forEach((item) => {
      const checkbox = el("input", { type: "checkbox" });
      checkbox.checked = state.selected.has(item.tid);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selected.add(item.tid);
        else state.selected.delete(item.tid);
        updateSelectedSize();
      });
      const download = button("下载", () => downloadTorrent(item), "ptbd-mini");
      state.ui.tbody.append(el(
        "tr",
        {},
        el("td", {}, checkbox),
        el("td", {}, item.detailUrl ? el("a", { href: item.detailUrl, target: "_blank", rel: "noopener" }, item.title) : item.title),
        el("td", {}, item.sizeBytes ? formatBytes(item.sizeBytes) : item.size),
        el("td", {}, item.seeders == null ? "-" : String(item.seeders)),
        el("td", {}, item.promotion.length ? item.promotion.join(" + ") : "普通"),
        el("td", {}, item.downloaded ? "是" : "否"),
        el("td", {}, download)
      ));
    });
  }
  __name(renderTable, "renderTable");
  function selectVisible(checked) {
    state.selected = checked ? new Set(state.filtered.map((item) => item.tid)) : /* @__PURE__ */ new Set();
    renderTable();
    setStatus(checked ? `已全选 ${state.selected.size} 个` : "已取消全选");
  }
  __name(selectVisible, "selectVisible");
  function updateSelectedSize() {
    if (!state.ui.selectedSize) return;
    const selected = state.filtered.filter((item) => state.selected.has(item.tid));
    const totalBytes = selected.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    state.ui.selectedSize.textContent = selected.length ? `已选 ${selected.length} 个 · ${formatBytes(totalBytes)}` : "未选择";
  }
  __name(updateSelectedSize, "updateSelectedSize");

  // src/scripts/pt-batch-download/torrents.js
  function refreshTorrents() {
    state.torrents = extractTorrents();
    const tags = [...new Set(state.torrents.flatMap((item) => item.promotion))].sort();
    fillMulti(state.ui.promotion, tags.map((tag) => [tag, tag]), selectedMulti(state.ui.promotion));
    applyFilters(true);
  }
  __name(refreshTorrents, "refreshTorrents");
  function extractTorrents() {
    return getAdapter()?.extractTorrents() || [];
  }
  __name(extractTorrents, "extractTorrents");
  function findSeedRow(link) {
    let node = link;
    while (node = node.parentElement) {
      if (node.tagName === "TR" && /\d+(?:\.\d+)?\s*[TGMK]i?B/i.test(node.textContent)) return node;
    }
    return link.closest("tr");
  }
  __name(findSeedRow, "findSeedRow");
  function detectSeeders(row) {
    const seeder = row.querySelector('a[href*="#seeders"], a[href*="seeders"]');
    if (seeder) return toNumber(seeder.textContent);
    const cells = row.cells ? [...row.cells] : [];
    const sizeIndex = cells.findIndex((cell) => /\d+(?:\.\d+)?\s*[TGMK]i?B/i.test(cell.textContent));
    if (sizeIndex >= 0 && cells[sizeIndex + 1]) return toNumber(cells[sizeIndex + 1].textContent);
    const nums = clean(row.textContent).match(/\b\d+\b/g) || [];
    return nums.length ? parseInt(nums[0], 10) : null;
  }
  __name(detectSeeders, "detectSeeders");
  function detectDownloaded(row) {
    const statusRe = /seeding|leeching|做种中?|正在做种|已下载|下载中|正在下载|吸血中?/i;
    const className = row.className || "";
    const text = clean(row.textContent);
    if (statusRe.test(className)) return true;
    if (statusRe.test(text)) return true;
    if ([...row.querySelectorAll("[title],[alt]")].some((elm) => statusRe.test(`${elm.getAttribute("title") || ""} ${elm.getAttribute("alt") || ""}`))) return true;
    if ([...row.querySelectorAll("font[color]")].some((f) => statusRe.test(f.textContent))) return true;
    if ([...row.querySelectorAll("img[class],img[src],a[class]")].some((elm) => /seeding|leeching/i.test(`${elm.className || ""} ${elm.getAttribute("src") || ""}`))) return true;
    return false;
  }
  __name(detectDownloaded, "detectDownloaded");

  // src/scripts/pt-batch-download/adapters.js
  var SiteAdapter = class {
    static {
      __name(this, "SiteAdapter");
    }
    constructor(name) {
      this.name = name;
    }
    isListPage() {
      return false;
    }
    listRoot() {
      return document.body;
    }
    extractTorrents() {
      return [];
    }
    // 提取行的原始促销标记数组（空数组=普通），子类覆盖以读取架构特有标记
    detectPromoTags(row) {
      return [];
    }
    // 通用做种数检测
    detectSeeders(row) {
      return detectSeeders(row);
    }
    // 通用已下载状态检测
    detectDownloaded(row) {
      return detectDownloaded(row);
    }
  };
  var NexusPHPAdapter = class extends SiteAdapter {
    static {
      __name(this, "NexusPHPAdapter");
    }
    isListPage() {
      return isDefaultPath() || getCustomSites().some((pattern) => matchPattern(pattern, location.href));
    }
    listRoot() {
      return document.querySelector("table.torrents, table.torrenttable, #torrenttable") || document.body;
    }
    extractTorrents() {
      const items = [];
      const seen = /* @__PURE__ */ new Set();
      document.querySelectorAll('a[href*="download.php?id="]').forEach((link) => {
        const downloadUrl = absoluteUrl(link.getAttribute("href"));
        const tid = new URL(downloadUrl).searchParams.get("id");
        if (!tid || seen.has(tid)) return;
        seen.add(tid);
        const row = findSeedRow(link) || link.closest("tr") || link.parentElement || link;
        const detailLink = row.querySelector(`a[href*="details.php?id=${cssEscape(tid)}"]`) || row.querySelector('a[href*="details.php?id="]') || document.querySelector(`a[href*="details.php?id=${cssEscape(tid)}"]`);
        const rowText = clean(row.textContent);
        const size = (rowText.match(/\d+(?:\.\d+)?\s*[TGMK]i?B/i) || [""])[0];
        const title = clean(detailLink?.textContent || link.getAttribute("title") || link.textContent) || `Torrent ${tid}`;
        items.push({
          tid,
          title,
          downloadUrl,
          detailUrl: detailLink ? absoluteUrl(detailLink.getAttribute("href")) : "",
          size: size || "-",
          sizeBytes: parseSize(size),
          seeders: this.detectSeeders(row),
          promotion: this.detectPromoTags(row),
          downloaded: this.detectDownloaded(row)
        });
      });
      return items;
    }
    // NexusPHP 促销标记多为单个 img：优先读 alt/title/文本，无文本时按 class 归一化兜底
    detectPromoTags(row) {
      const tags = [];
      const imgs = [...row.querySelectorAll("img[class], img[alt], img[title]")];
      for (const img of imgs) {
        const cls = img.className || "";
        const alt = img.getAttribute("alt") || "";
        const title = img.getAttribute("title") || "";
        const src = img.getAttribute("src") || "";
        const raw = `${cls} ${alt} ${title} ${src}`;
        if (/free2up|2upfree|2\s*x\s*free|free\s*2\s*x|2x\s*免费|免费\s*2x|2x\s*免費|免費\s*2x/i.test(raw)) tags.push("2X免费");
        else if (/50down2up|2up50down|2\s*x.*50%|50%.*2\s*x/i.test(raw)) tags.push("2X 50%");
        else if (/\bfree\b|免费|免費|pro_free/i.test(raw)) tags.push("免费");
        else if (/2up|2\s*x|2x|双倍上传|雙倍上傳|doubleup|double\s*upload/i.test(raw)) tags.push("2X");
        else if (/50down|50%|半价/i.test(raw)) tags.push("50%");
        else if (/30down|30%|三折/i.test(raw)) tags.push("30%");
      }
      if (!tags.length) {
        const text = clean(row.textContent);
        if (/free2up|2upfree|2\s*x\s*free|free\s*2\s*x|2x\s*免费|免费\s*2x|2x\s*免費|免費\s*2x/i.test(text)) tags.push("2X免费");
        else if (/\bfree\b|免费|免費|pro_free/i.test(text)) tags.push("免费");
        else if (/2up|2\s*x|2x|双倍上传|雙倍上傳|doubleup|double\s*upload/i.test(text)) tags.push("2X");
        else if (/50down|50%|半价/i.test(text)) tags.push("50%");
        else if (/30down|30%|三折/i.test(text)) tags.push("30%");
      }
      return [...new Set(tags)];
    }
  };
  var Unit3DAdapter = class extends SiteAdapter {
    static {
      __name(this, "Unit3DAdapter");
    }
    isListPage() {
      return location.pathname === UNIT3D_LIST_PATH && !!document.querySelector(UNIT3D_DL_SELECTOR);
    }
    listRoot() {
      return document.querySelector("table.data-table, [class*=torrent-search--list]") || document.body;
    }
    extractTorrents() {
      const items = [];
      const seen = /* @__PURE__ */ new Set();
      document.querySelectorAll(UNIT3D_DL_SELECTOR).forEach((link) => {
        const href = link.getAttribute("href") || "";
        const tid = (href.match(/\/torrents\/download\/(\d+)/) || [])[1];
        if (!tid || seen.has(tid)) return;
        seen.add(tid);
        const row = link.closest("tr") || link;
        const nameLink = row.querySelector(`a[href$="/torrents/${cssEscape(tid)}"]`) || row.querySelector('a[class*="__name"]');
        const sizeCell = row.querySelector('[class*="__size"]');
        const seederCell = row.querySelector('[class*="__seeders"]');
        const sizeText = clean(sizeCell?.textContent) || clean(row.textContent);
        const size = (sizeText.match(/\d+(?:\.\d+)?\s*[TGMK]i?B/i) || [""])[0];
        const title = clean(nameLink?.textContent) || link.getAttribute("title") || `Torrent ${tid}`;
        items.push({
          tid,
          title,
          downloadUrl: absoluteUrl(href),
          detailUrl: nameLink ? absoluteUrl(nameLink.getAttribute("href")) : "",
          size: size || "-",
          sizeBytes: parseSize(size),
          seeders: seederCell ? toNumber(seederCell.textContent) : this.detectSeeders(row),
          promotion: this.detectPromoTags(row),
          downloaded: this.detectDownloaded(row)
        });
      });
      return items;
    }
    // Unit3D/darkland 促销为 FontAwesome <i> 图标：直接读取 title 原文作为标记，多标记自然组合
    detectPromoTags(row) {
      const tags = [];
      row.querySelectorAll('i.torrent-icons__freeleech, i[title*="免费"], i[title*="免費"]').forEach((icon) => {
        const title = clean(icon.getAttribute("title"));
        if (title) tags.push(title);
      });
      row.querySelectorAll('i.torrent-icons__double-upload, i[title*="双倍上传"], i[title*="雙倍上傳"]').forEach((icon) => {
        const title = clean(icon.getAttribute("title"));
        if (title) tags.push(title);
      });
      return [...new Set(tags)];
    }
  };
  var GAZELLE_TGMK_RE = /\d+(?:\.\d+)?\s*[TGMK]i?B/i;
  var GAZELLE_SIZE_RE = /\d+(?:\.\d+)?\s*(?:[TGMK]i?B|B)\b/i;
  var GazelleAdapter = class extends SiteAdapter {
    static {
      __name(this, "GazelleAdapter");
    }
    isListPage() {
      if (location.pathname !== "/torrents.php") return false;
      if (new URLSearchParams(location.search).get("action") === "download") return false;
      return !!document.querySelector("table.torrent_table tr.group_torrent");
    }
    listRoot() {
      return document.querySelector("table.torrent_table") || document.body;
    }
    extractTorrents() {
      const items = [];
      const seen = /* @__PURE__ */ new Set();
      const groupId = new URLSearchParams(location.search).get("id") || "";
      document.querySelectorAll("table.torrent_table tr.group_torrent").forEach((row) => {
        const dl = [...row.querySelectorAll("a")].find((a) => /(?:^|[?&])action=download(?:&|$|#)/.test(a.getAttribute("href") || ""));
        if (!dl) return;
        const tid = new URL(dl.getAttribute("href"), location.href).searchParams.get("id");
        if (!tid || seen.has(tid)) return;
        seen.add(tid);
        const cellLinks = [...row.cells[0]?.querySelectorAll("a") || []];
        const nameLink = cellLinks.find((a) => clean(a.textContent).length > 4);
        const nameHref = nameLink ? absoluteUrl(nameLink.getAttribute("href") || "") : "";
        const detailUrl = nameLink && /torrents\.php\?id=\d+&(?:[^#]*&)?torrentid=\d+/.test(nameLink.getAttribute("href") || "") ? nameHref : groupId ? absoluteUrl(`torrents.php?id=${groupId}&torrentid=${tid}`) : "";
        const cells = [...row.cells];
        let sizeIndex = cells.findIndex((cell, idx) => idx > 0 && GAZELLE_TGMK_RE.test(cell.textContent));
        if (sizeIndex < 0) sizeIndex = cells.findIndex((cell, idx) => idx > 0 && /^\s*\d+(?:\.\d+)?\s*B\b/i.test(cell.textContent));
        const size = sizeIndex >= 0 ? (clean(cells[sizeIndex].textContent).match(GAZELLE_SIZE_RE) || ["-"])[0] : "-";
        items.push({
          tid,
          title: clean(nameLink?.textContent) || `Torrent ${tid}`,
          downloadUrl: absoluteUrl(dl.getAttribute("href")),
          detailUrl,
          size: size || "-",
          sizeBytes: parseSize(size),
          seeders: this.detectSeeders(row),
          promotion: this.detectPromoTags(row),
          downloaded: this.detectDownloaded(row)
        });
      });
      return items;
    }
    // GGn 做种数列紧跟体积列（单组页无 username 列时仍然成立）；体积列限定在标题格之后查找，避免版本串（如 "1.5.1B"）误当体积导致做种数回退到标题内数字
    detectSeeders(row) {
      const cells = row.cells ? [...row.cells] : [];
      let sizeIndex = cells.findIndex((cell, idx) => idx > 0 && GAZELLE_TGMK_RE.test(cell.textContent));
      if (sizeIndex < 0) sizeIndex = cells.findIndex((cell, idx) => idx > 0 && /^\s*\d+(?:\.\d+)?\s*B\b/i.test(cell.textContent));
      if (sizeIndex >= 0 && cells[sizeIndex + 1]) return toNumber(cells[sizeIndex + 1].textContent);
      const nums = clean(row.textContent).match(/\b\d+\b/g) || [];
      return nums.length ? parseInt(nums[0], 10) : null;
    }
    // Gazelle 促销：strong.torrent_label 的 class tl_free/tl_2x_free 等（GGn/Anthelion 通用）
    detectPromoTags(row) {
      const tags = [];
      row.querySelectorAll("strong.torrent_label, .torrent_label").forEach((label) => {
        const raw = `${label.className || ""} ${clean(label.textContent)}`;
        if (/tl_2x_free|2x\s*free|2x\s*免费/i.test(raw)) tags.push("2X免费");
        else if (/tl_free|freeleech|免费/i.test(raw)) tags.push("免费");
        else if (/tl_2x|double/i.test(raw)) tags.push("2X");
        else if (/tl_50|50%/.test(raw)) tags.push("50%");
      });
      return [...new Set(tags)];
    }
  };
  var MamAdapter = class extends SiteAdapter {
    static {
      __name(this, "MamAdapter");
    }
    isListPage() {
      if (!["/tor/search.php", "/freeleech.php"].includes(location.pathname)) return false;
      return !!document.querySelector('a[href*="/tor/download.php/"]');
    }
    listRoot() {
      return document.querySelector("table") || document.body;
    }
    extractTorrents() {
      const items = [];
      const seen = /* @__PURE__ */ new Set();
      document.querySelectorAll('a[href*="/tor/download.php/"]').forEach((link) => {
        const href = link.getAttribute("href") || "";
        const row = link.closest("tr") || link.parentElement;
        const detailLink = row?.querySelector('a[href^="/t/"]');
        const tid = row?.dataset.tid || (href.match(/[?&]tid=(\d+)/) || [])[1] || (detailLink?.getAttribute("href") || "").match(/\/t\/(\d+)/)?.[1] || "";
        if (!tid || seen.has(tid)) return;
        seen.add(tid);
        const rowText = clean(row.textContent);
        const size = (rowText.match(/\d+(?:\.\d+)?\s*[TGMK]i?B/i) || [""])[0];
        const title = clean(detailLink?.textContent) || `Torrent ${tid}`;
        items.push({
          tid,
          title,
          downloadUrl: absoluteUrl(href),
          detailUrl: detailLink ? absoluteUrl(detailLink.getAttribute("href")) : "",
          size: size || "-",
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
      const sizeIndex = cells.findIndex((c) => /\d+(?:\.\d+)?\s*[TGMK]i?B/i.test(c.textContent));
      const cell = sizeIndex >= 0 ? cells[sizeIndex + 2] : null;
      if (!cell) return null;
      const p = cell.querySelector("p");
      return toNumber(p ? p.textContent : cell.textContent);
    }
    // MAM 促销: img alt/title/src 含 freeleech→免费, 2x→2X 等
    detectPromoTags(row) {
      const tags = [];
      row.querySelectorAll("img[src], img[alt], img[title]").forEach((img) => {
        const raw = `${img.className || ""} ${img.alt || ""} ${img.title || ""} ${img.src || ""}`;
        if (/free2up|2upfree/i.test(raw)) tags.push("2X免费");
        else if (/\bfree\b|freeleech|免费/i.test(raw)) tags.push("免费");
        else if (/2up|\b2x\b|double/i.test(raw)) tags.push("2X");
      });
      return [...new Set(tags)];
    }
  };
  var unit3dAdapter = new Unit3DAdapter();
  var gazelleAdapter = new GazelleAdapter();
  var mamAdapter = new MamAdapter();
  var nexusAdapter = new NexusPHPAdapter();
  var adapters = [unit3dAdapter, gazelleAdapter, mamAdapter, nexusAdapter];

  // src/scripts/pt-batch-download/sites.js
  var SITE_ARCH_MAP = {
    "anthelion.me": gazelleAdapter,
    "gazellegames.net": gazelleAdapter,
    "myanonamouse.net": mamAdapter
  };
  function getAdapter() {
    const mapped = SITE_ARCH_MAP[location.hostname.replace(/^www\./, "").toLowerCase()];
    if (mapped && mapped.isListPage()) return mapped;
    return adapters.find((a) => a.isListPage());
  }
  __name(getAdapter, "getAdapter");
  function registerMenus() {
    GM_registerMenuCommand("添加站点", addSite);
    GM_registerMenuCommand("页面管理", manageSites);
    GM_registerMenuCommand("下载器设置", configDownloader);
  }
  __name(registerMenus, "registerMenus");
  function shouldRun() {
    return !!getAdapter();
  }
  __name(shouldRun, "shouldRun");
  function isDefaultPath() {
    return DEFAULT_PATHS.includes(location.pathname);
  }
  __name(isDefaultPath, "isDefaultPath");
  function matchPattern(pattern, url) {
    const match = String(pattern || "").match(/^([^:]+):\/\/([^/]*)(.*)$/);
    if (!match) return false;
    const scheme = match[1] === "*" ? "https?" : escapeRegExp(match[1]);
    const host = match[2].split("*").map(escapeRegExp).join("[^/]*");
    const path = patternPathToRegex(match[3] || "/");
    return new RegExp(`^${scheme}:\\/\\/${host}${path}$`).test(url);
  }
  __name(matchPattern, "matchPattern");
  function patternPathToRegex(path) {
    let out = "";
    for (let i = 0; i < path.length; i++) {
      if (path[i] === "*" && path[i + 1] === "*") {
        out += ".*";
        i++;
      } else if (path[i] === "*") {
        out += "[^/]*";
      } else {
        out += escapeRegExp(path[i]);
      }
    }
    return out;
  }
  __name(patternPathToRegex, "patternPathToRegex");
  function addSite() {
    const pattern = prompt("请输入 Tampermonkey match pattern", `${location.origin}${location.pathname}**`);
    if (!pattern) return;
    const sites = getCustomSites();
    sites.push(pattern);
    setCustomSites(sites);
    alert(`已添加站点：${pattern}`);
  }
  __name(addSite, "addSite");
  function manageSites() {
    ensureStyle();
    document.querySelector("#ptbd-site-modal")?.remove();
    const list = el("div", { class: "ptbd-site-list" });
    const overlay = el("div", { id: "ptbd-site-modal", class: "ptbd-modal" });
    const close = button("×", () => overlay.remove(), "ptbd-close");
    const box = el(
      "div",
      { class: "ptbd-modal-box" },
      el("div", { class: "ptbd-modal-head" }, el("strong", {}, "页面管理"), close),
      list
    );
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.append(box);
    document.body.append(overlay);
    renderSites(list);
  }
  __name(manageSites, "manageSites");
  function renderSites(list) {
    list.textContent = "";
    const sites = getCustomSites();
    if (!sites.length) {
      list.append(el("div", { class: "ptbd-empty" }, "暂无自定义页面"));
      return;
    }
    sites.forEach((pattern) => {
      const del = button("删除", () => {
        setCustomSites(getCustomSites().filter((item) => item !== pattern));
        renderSites(list);
      }, "ptbd-btn ptbd-danger");
      list.append(el("div", { class: "ptbd-site-item" }, el("span", {}, pattern), del));
    });
  }
  __name(renderSites, "renderSites");
  function getCustomSites() {
    const value = safeGet(CUSTOM_SITES_KEY, []);
    return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
  }
  __name(getCustomSites, "getCustomSites");
  function setCustomSites(sites) {
    GM_setValue(CUSTOM_SITES_KEY, [...new Set(sites.map((item) => clean(item)).filter(Boolean))]);
  }
  __name(setCustomSites, "setCustomSites");

  // src/scripts/pt-batch-download/panel.js
  function buildPanel() {
    if (document.querySelector("#" + ID)) return;
    const downloaders = getDownloaders();
    const toggle = el("button", { id: TOGGLE_ID, type: "button" }, "PT批量");
    const panel = el("div", { id: ID, class: `ptbd-hidden ${pageIsDark() ? "ptbd-theme-dark" : "ptbd-theme-light"}` });
    const body = el("div", { class: "ptbd-body" });
    const collapse = button("收起 ▲", () => toggleCollapse(body, collapse), "ptbd-collapse");
    const close = button("×", closePanel, "ptbd-close");
    state.ui.keyword = input("text", "关键字");
    state.ui.sizeMin = input("number", "最小");
    state.ui.sizeMinUnit = unitSelect("GiB");
    state.ui.sizeMax = input("number", "最大");
    state.ui.sizeMaxUnit = unitSelect("GiB");
    state.ui.seedMin = input("number", "最小");
    state.ui.seedMax = input("number", "最大");
    state.ui.promotion = multiFilter("优惠", []);
    state.ui.seedingStatus = select([["all", "全部"], ["seeding", "做种中"], ["not-seeding", "未做种"]], "all");
    state.ui.delay = input("number", "延迟(ms)", "1200");
    state.ui.status = el("span", { id: "ptbd-status", class: "ptbd-status" }, "待扫描");
    state.ui.selectedSize = el("span", { class: "ptbd-dl-status" }, "未选择");
    state.ui.downloaderSelect = downloaderSelect(downloaders);
    state.ui.downloaderStatus = el("span", { class: "ptbd-dl-status" }, downloaderStatusText(downloaders.length));
    state.ui.tbody = el("tbody");
    append(
      body,
      el(
        "div",
        { class: "ptbd-filter-groups" },
        el(
          "div",
          { class: "ptbd-filter-row ptbd-filter-row-main" },
          field("关键字", state.ui.keyword, "ptbd-keyword-field"),
          sizeRangeField("体积", state.ui.sizeMin, state.ui.sizeMinUnit, state.ui.sizeMax, state.ui.sizeMaxUnit),
          field("延迟", state.ui.delay)
        ),
        el(
          "div",
          { class: "ptbd-filter-row ptbd-filter-row-extra" },
          field("是否做种", state.ui.seedingStatus),
          rangeField("做种数", state.ui.seedMin, state.ui.seedMax),
          selectField("优惠", state.ui.promotion.root)
        )
      ),
      actionsRow(),
      table()
    );
    append(
      panel,
      el("div", { class: "ptbd-head" }, el("div", { class: "ptbd-title" }, "PT 批量下载种子"), el("div", { class: "ptbd-head-actions" }, collapse, close)),
      body
    );
    document.body.append(panel, toggle);
    state.ui.panel = panel;
    state.ui.toggle = toggle;
    toggle.addEventListener("click", () => {
      const hidden = panel.classList.toggle("ptbd-hidden");
      toggle.textContent = hidden ? "PT批量" : "关闭PT";
      if (!hidden) refreshTorrents();
    });
  }
  __name(buildPanel, "buildPanel");
  function actionsRow() {
    state.ui.batchButton = button("下载已选", batchDownload, "ptbd-btn ptbd-btn-primary");
    return el(
      "div",
      { class: "ptbd-actions" },
      button("筛选", () => applyFilters(), "ptbd-btn ptbd-btn-check"),
      button("全选", () => selectVisible(true), "ptbd-btn"),
      button("取消全选", () => selectVisible(false), "ptbd-btn"),
      state.ui.batchButton,
      state.ui.downloaderStatus,
      state.ui.downloaderSelect,
      state.ui.selectedSize,
      state.ui.status
    );
  }
  __name(actionsRow, "actionsRow");
  function table() {
    return el(
      "div",
      { class: "ptbd-table-wrap" },
      el(
        "table",
        { class: "ptbd-table" },
        el("thead", {}, el(
          "tr",
          {},
          el("th", {}, ""),
          el("th", {}, "标题"),
          el("th", {}, "体积"),
          el("th", {}, "做种"),
          el("th", {}, "优惠"),
          el("th", {}, "已下载"),
          el("th", {}, "下载")
        )),
        state.ui.tbody
      )
    );
  }
  __name(table, "table");
  function closePanel() {
    state.ui.panel.classList.add("ptbd-hidden");
    state.ui.toggle.textContent = "PT批量";
  }
  __name(closePanel, "closePanel");
  function toggleCollapse(body, btn) {
    const closed = body.classList.toggle("ptbd-collapsed");
    btn.textContent = closed ? "展开 ▼" : "收起 ▲";
  }
  __name(toggleCollapse, "toggleCollapse");

  // src/scripts/pt-batch-download/mount.js
  function start() {
    const ready = /* @__PURE__ */ __name(() => {
      ensureStyle();
      buildPanel();
      refreshTorrents();
      watchListChanges();
    }, "ready");
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
    else ready();
  }
  __name(start, "start");
  function watchListChanges() {
    const adapter = getAdapter();
    const root = adapter?.listRoot?.() || document.body;
    let timer = null;
    const observer = new MutationObserver((records) => {
      const panel = document.getElementById(ID);
      const listChanged = records.some((record) => {
        if (panel?.contains(record.target)) return false;
        const nodes = [...record.addedNodes, ...record.removedNodes];
        return nodes.some((node) => !(node === panel || panel?.contains(node)));
      });
      if (!listChanged) return;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refreshTorrents();
      }, 600);
    });
    observer.observe(root, { childList: true, subtree: true });
  }
  __name(watchListChanges, "watchListChanges");

  // src/scripts/pt-batch-download/startup.js
  function bootstrap() {
    registerMenus();
    if (!shouldRun()) {
      const obs = new MutationObserver(() => {
        if (shouldRun()) {
          obs.disconnect();
          start();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => obs.disconnect(), 3e4);
      return;
    }
    start();
  }
  __name(bootstrap, "bootstrap");

  // src/scripts/pt-batch-download/index.js
  bootstrap();
})();

// ==UserScript==
// @name         Cola 剪贴板图片解析填入
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.4.6
// @description  在 Cola PT (colapt.com) 发布页注入「解析剪贴板图片」按钮：从剪贴板解析任意域名的图片地址（每行裸 URL、[img]URL[/img]、[url=..][img]URL[/img][/url] 可混合出现），按顺序填入截图地址列表，自动点「添加截图地址」补足输入框。
// @author       wuyaos & AI
// @match        https://www.colapt.com/upload*
// @match        https://colapt.com/upload*
// @icon         https://www.colapt.com/brand/cola/favicon-black-red.ico
// @run-at       document-idle
// @noframes
// @license      MIT
// ==/UserScript==

// Generated from src/scripts/clipboard-image-filler/index.js; do not edit dist files.
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/scripts/clipboard-image-filler/index.js
  var ADD_BTN_WAIT_MS = 80;
  var MAX_ADD_CLICKS = 50;
  var PANEL_ID = "cbif-panel";
  function parseImageUrls(text) {
    if (!text) return [];
    const found = [];
    const seen = /* @__PURE__ */ new Set();
    const push = /* @__PURE__ */ __name((url) => {
      const u = url.trim();
      if (!/^https?:\/\//i.test(u)) return;
      const key = u.replace(/\/$/, "");
      if (seen.has(key)) return;
      seen.add(key);
      found.push(u);
    }, "push");
    const bbcode = /(?:\[url=([^\]]+)\]\s*)?\[img(?:=[^\]]*)?\]([^\[\]]+?)\[\/img\](?:\s*\[\/url\])?/gi;
    let m;
    while ((m = bbcode.exec(text)) !== null) {
      const inner = (m[2] || "").trim();
      if (inner) push(inner);
    }
    const withoutBbcode = text.replace(bbcode, " ");
    const bare = /https?:\/\/[^\s"'<>\[\]()]+/gi;
    while ((m = bare.exec(withoutBbcode)) !== null) {
      const url = m[0].replace(/[.,;:）]+$/, "");
      if (/\.(png|jpe?g|webp|gif|bmp|avif)(\?|#|$)/i.test(url)) push(url);
    }
    return found;
  }
  __name(parseImageUrls, "parseImageUrls");
  function setVueInputValue(el, val) {
    if (!el) return false;
    const proto = window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (setter) setter.call(el, String(val));
    else el.value = String(val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  __name(setVueInputValue, "setVueInputValue");
  var sleep = /* @__PURE__ */ __name((ms) => new Promise((r) => setTimeout(r, ms)), "sleep");
  async function getClipboardText() {
    if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
      return await navigator.clipboard.readText() || "";
    }
    throw new Error("当前浏览器/环境不支持读取剪贴板");
  }
  __name(getClipboardText, "getClipboardText");
  async function getAddrContainer() {
    for (let i = 0; i < 20; i++) {
      const c = document.querySelector(".screenshot-addresses");
      if (c) return c;
      await sleep(200);
    }
    return null;
  }
  __name(getAddrContainer, "getAddrContainer");
  function findAddBtn(addrContainer) {
    return Array.from(addrContainer.querySelectorAll('button[type="button"]')).find(
      (b) => b.textContent.includes("添加截图地址")
    );
  }
  __name(findAddBtn, "findAddBtn");
  function getAllInputs(addrContainer) {
    return Array.from(addrContainer.querySelectorAll('input[type="url"]'));
  }
  __name(getAllInputs, "getAllInputs");
  async function fillScreenshots(urls) {
    const addrContainer = await getAddrContainer();
    if (!addrContainer) throw new Error("未找到截图地址区域 (.screenshot-addresses)");
    getAllInputs(addrContainer).forEach((inp) => setVueInputValue(inp, ""));
    let addClicks = 0;
    while (getAllInputs(addrContainer).length < urls.length && addClicks < MAX_ADD_CLICKS) {
      const addBtn = findAddBtn(addrContainer);
      if (!addBtn) break;
      addBtn.click();
      addClicks++;
      await sleep(ADD_BTN_WAIT_MS);
    }
    const inputs = getAllInputs(addrContainer);
    urls.forEach((url, i) => {
      if (inputs[i]) setVueInputValue(inputs[i], url);
    });
    return inputs.length;
  }
  __name(fillScreenshots, "fillScreenshots");
  function toast(msg, ok = true) {
    const id = "cbif-toast";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = ok ? "rgba(30,160,90,.95)" : "rgba(200,60,60,.95)";
    el.style.opacity = "1";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.style.opacity = "0", 3e3);
  }
  __name(toast, "toast");
  async function runFill(text, sourceLabel) {
    const urls = parseImageUrls(text);
    if (!urls.length) {
      toast(`${sourceLabel}中未解析到图片地址`, false);
      return;
    }
    const total = await fillScreenshots(urls);
    toast(`已覆盖填入 ${urls.length} 张截图（截图输入框共 ${total} 个）`);
  }
  __name(runFill, "runFill");
  function pickPageButtonClass() {
    const addrContainer = document.querySelector(".screenshot-addresses");
    const addBtn = addrContainer ? findAddBtn(addrContainer) : null;
    if (addBtn && addBtn.className && !/cola-af/.test(addBtn.className)) return addBtn.className;
    const mini = document.querySelector(".cola-af-mini-btn");
    if (mini) return mini.className;
    return "";
  }
  __name(pickPageButtonClass, "pickPageButtonClass");
  function pickPageInputClass() {
    const input = document.querySelector('.screenshot-addresses input[type="url"]');
    return input ? input.className || "" : "";
  }
  __name(pickPageInputClass, "pickPageInputClass");
  function pickPageColors() {
    const cs = getComputedStyle(document.body);
    const addrContainer = document.querySelector(".screenshot-addresses");
    const addBtn = addrContainer ? addrContainer.querySelector('button[type="button"]') : null;
    const input = addrContainer ? addrContainer.querySelector('input[type="url"]') : null;
    const btnCs = addBtn ? getComputedStyle(addBtn) : null;
    const inputCs = input ? getComputedStyle(input) : null;
    const solid = /* @__PURE__ */ __name((c) => c && c !== "rgba(0, 0, 0, 0)", "solid");
    return {
      accent: btnCs ? btnCs.color || "" : "",
      text: solid(inputCs && inputCs.color) ? inputCs.color : cs.color || "",
      border: inputCs ? `${inputCs.borderWidth || "1px"} ${inputCs.borderStyle || "solid"} ${inputCs.borderColor || "rgba(0,0,0,.15)"}` : "1px solid rgba(0,0,0,.15)",
      radius: btnCs ? btnCs.borderRadius || "6px" : "6px",
      btnBg: btnCs && solid(btnCs.backgroundColor) ? btnCs.backgroundColor : "",
      btnText: btnCs ? btnCs.color || "" : "",
      pageBg: inputCs && solid(inputCs.backgroundColor) ? inputCs.backgroundColor : solid(cs.backgroundColor) ? cs.backgroundColor : "#fff"
    };
  }
  __name(pickPageColors, "pickPageColors");
  function applyStyles(panel) {
    if (!panel) return;
    const colors = pickPageColors();
    const ta = panel.querySelector("#cbif-text");
    if (ta) {
      ta.style.border = colors.border;
      ta.style.borderRadius = colors.radius;
      ta.style.background = colors.pageBg;
      ta.style.color = colors.text;
    }
    panel.querySelectorAll('button[id^="cbif-btn-"]').forEach((btn) => {
      btn.style.border = colors.btnBg ? "none" : colors.border;
      btn.style.borderRadius = colors.radius;
      btn.style.background = colors.btnBg || colors.pageBg;
      btn.style.color = colors.btnText || colors.accent || colors.text;
    });
    const frame = panel.querySelector(".cbif-frame");
    if (frame) {
      const dz = document.querySelector(".screenshot-upload-panel .drop-zone");
      if (dz) {
        const d = getComputedStyle(dz);
        frame.style.border = d.borderStyle !== "none" ? d.border : `1px dashed ${colors.text === "rgb(240, 242, 246)" ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.25)"}`;
        frame.style.borderRadius = d.borderRadius || colors.radius;
        frame.style.background = d.backgroundColor && d.backgroundColor !== "rgba(0, 0, 0, 0)" ? d.backgroundColor : "transparent";
      } else {
        frame.style.border = colors.border;
        frame.style.borderRadius = colors.radius;
        frame.style.background = "transparent";
      }
    }
  }
  __name(applyStyles, "applyStyles");
  function watchTheme() {
    if (watchTheme._observer) return;
    let raf = 0;
    const reapply = /* @__PURE__ */ __name(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyStyles(document.getElementById(PANEL_ID)));
    }, "reapply");
    const observer = new MutationObserver(reapply);
    const opts = { attributes: true, attributeFilter: ["class", "style", "data-theme", "data-mode"] };
    observer.observe(document.documentElement, opts);
    if (document.body) observer.observe(document.body, opts);
    watchTheme._observer = observer;
  }
  __name(watchTheme, "watchTheme");
  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);
    const addrContainer = document.querySelector(".screenshot-addresses");
    const leftPanel = document.querySelector(".screenshot-upload-panel");
    const section = leftPanel || (addrContainer ? addrContainer.closest("section.panel") || addrContainer.parentElement : null);
    if (!section) return null;
    const btnClass = pickPageButtonClass();
    const inputClass = pickPageInputClass();
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = "margin-top:8px;display:flex;flex-direction:column;gap:6px;";
    const frame = document.createElement("div");
    frame.className = "cbif-frame";
    frame.style.cssText = "display:flex;flex-direction:column;gap:8px;padding:10px;";
    const frameTitle = document.createElement("div");
    frameTitle.className = "cbif-frame-title";
    frameTitle.textContent = "粘贴图片地址";
    frameTitle.style.cssText = "font-weight:600;";
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;align-items:stretch;";
    const textarea = document.createElement("textarea");
    textarea.id = "cbif-text";
    textarea.rows = 3;
    textarea.placeholder = "粘贴图片地址（任意域名）：每行一个裸 URL，或 [img]URL[/img]、[url=..][img]URL[/img][/url]，可混合";
    if (inputClass) textarea.className = inputClass;
    if (inputClass) textarea.className = inputClass;
    textarea.style.cssText = "flex:1;resize:vertical;min-height:56px;font-size:12px;line-height:1.5;padding:6px 8px;";
    const btnWrap = document.createElement("div");
    btnWrap.style.cssText = "display:flex;flex-direction:column;gap:6px;justify-content:center;";
    const makeBtn = /* @__PURE__ */ __name((id, label, title, onClick) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = id;
      btn.textContent = label;
      btn.title = title;
      if (btnClass) {
        btn.className = btnClass;
      } else {
        btn.style.cssText = "padding:4px 10px;font-size:12px;cursor:pointer;";
      }
      btn.addEventListener("click", async () => {
        try {
          btn.disabled = true;
          await onClick();
        } catch (e) {
          toast(`解析失败：${e && e.message ? e.message : e}`, false);
        } finally {
          btn.disabled = false;
        }
      });
      return btn;
    }, "makeBtn");
    btnWrap.appendChild(
      makeBtn("cbif-btn-text", "📋 解析填写框", "解析左侧填写框内容并覆盖填入截图（清空已填地址后按数量填入）", async () => {
        const text = textarea.value || "";
        if (!text.trim()) {
          toast("填写框为空，请先粘贴图片地址", false);
          return;
        }
        await runFill(text, "填写框");
      })
    );
    btnWrap.appendChild(
      makeBtn("cbif-btn-clip", "📎 解析剪贴板", "读取剪贴板内容并覆盖填入截图（清空已填地址后按数量填入）", async () => {
        await runFill(await getClipboardText(), "剪贴板");
      })
    );
    btnWrap.appendChild(
      makeBtn("cbif-btn-reset", "↺ 重置", "清空填写框内容和所有已填的截图地址", async () => {
        textarea.value = "";
        const addrContainer2 = await getAddrContainer();
        if (!addrContainer2) throw new Error("未找到截图地址区域 (.screenshot-addresses)");
        getAllInputs(addrContainer2).forEach((inp) => setVueInputValue(inp, ""));
        toast("已重置填写框和截图地址");
      })
    );
    frame.appendChild(frameTitle);
    row.appendChild(textarea);
    row.appendChild(btnWrap);
    frame.appendChild(row);
    panel.appendChild(frame);
    section.appendChild(panel);
    applyStyles(panel);
  }
  __name(buildPanel, "buildPanel");
  function inject() {
    const ok = !!buildPanel();
    if (ok) {
      const fab = document.getElementById("cbif-fab");
      if (fab) fab.remove();
      return;
    }
    if (!document.getElementById("cbif-fab")) {
      const fab = document.createElement("button");
      fab.type = "button";
      fab.id = "cbif-fab";
      fab.textContent = "📋 解析剪贴板图片";
      fab.addEventListener("click", async () => {
        try {
          fab.disabled = true;
          await runFill(await getClipboardText(), "剪贴板");
        } catch (e) {
          toast(`解析失败：${e && e.message ? e.message : e}`, false);
        } finally {
          fab.disabled = false;
        }
      });
      document.body.appendChild(fab);
    }
  }
  __name(inject, "inject");
  function main() {
    console.info("[Cola 剪贴板图片解析] v0.4.6 loaded, readyState=" + document.readyState);
    const style = document.createElement("style");
    style.textContent = [
      "#cbif-fab { position: fixed; right: 16px; bottom: 72px; z-index: 9999;",
      "  border: 1px solid rgba(0,0,0,.15); border-radius: 8px; background: #fff; color: #b3261e;",
      "  box-shadow: 0 2px 8px rgba(0,0,0,.18); padding: 8px 14px; font-size: 13px; cursor: pointer; }",
      "#cbif-fab:disabled { opacity: .5; cursor: wait; }",
      "#cbif-toast { position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);",
      "  z-index: 10000; color: #fff; padding: 8px 16px; border-radius: 8px;",
      "  font-size: 13px; opacity: 0; transition: opacity .3s; pointer-events: none; }",
      "#cbif-panel textarea:focus { outline: 2px solid rgba(179,38,30,.35); outline-offset: 0; }"
    ].join("\n");
    document.head.appendChild(style);
    watchTheme();
    let ticks = 0;
    const timer = setInterval(() => {
      if (++ticks > 120) {
        clearInterval(timer);
        return;
      }
      const fab = document.getElementById("cbif-fab");
      if (document.getElementById(PANEL_ID)) {
        if (fab) fab.remove();
        if (ticks >= 10) {
          clearInterval(timer);
        }
        return;
      }
      if (document.querySelector(".screenshot-upload-panel")) {
        try {
          inject();
        } catch (e) {
          console.error("[Cola 剪贴板图片解析] inject failed:", e);
        }
      }
    }, 1e3);
    try {
      inject();
    } catch (e) {
      console.error("[Cola 剪贴板图片解析] inject failed:", e);
    }
  }
  __name(main, "main");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();

// ==UserScript==
// @name         Playlet 顶部菜单悬停展开（自用）
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  playlet.cc 顶部导航子菜单需要点击两次父项才能展开，本脚本改为悬停父项直接展开子菜单
// @match        https://playlet.cc/*
// @match        https://www.playlet.cc/*
// @grant        none
// @icon         https://playlet.cc/favicon.ico
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Playlet_MenuFix.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Playlet_MenuFix.user.js
// ==/UserScript==

// Generated from src/scripts/playlet-menu-fix/index.js; do not edit dist files.
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/scripts/playlet-menu-fix/menu-style.js
  var STYLE_ID = "playlet-menu-fix-style";
  var OPEN_CLS = "pmenu-open";
  var CSS = `
/* 点击父项后固定展开子菜单（不依赖 hover），hover 仍可用 */
#ddtopmenubar li.has-children.${OPEN_CLS} > ul.sub-menu {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
/* 兜底：hover 展开（站点已有，重复声明防站点改版回退） */
#ddtopmenubar li.has-children:hover > ul.sub-menu {
  display: block !important;
}
`;
  function isOpen(li) {
    return li.classList.contains(OPEN_CLS);
  }
  __name(isOpen, "isOpen");
  function closeAll(bar) {
    bar.querySelectorAll("li.has-children." + OPEN_CLS).forEach((li) => {
      li.classList.remove(OPEN_CLS);
    });
  }
  __name(closeAll, "closeAll");
  function bindClickToggle() {
    const bar = document.getElementById("ddtopmenubar");
    if (!bar || bar.dataset.pmenuFix) return;
    bar.dataset.pmenuFix = "1";
    bar.addEventListener("click", (e) => {
      const a = e.target.closest("#ddtopmenubar > li.has-children > a");
      if (!a) return;
      const li = a.parentElement;
      const href = a.getAttribute("href") || "";
      const isVoid = href === "javascript:void(0);" || href === "javascript:;" || href === "#";
      if (e.target.closest("#ddtopmenubar .sub-menu")) {
        closeAll(bar);
        return;
      }
      if (isOpen(li)) {
        li.classList.remove(OPEN_CLS);
        if (isVoid) e.preventDefault();
        return;
      }
      closeAll(bar);
      li.classList.add(OPEN_CLS);
      if (isVoid) e.preventDefault();
    }, false);
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#ddtopmenubar")) closeAll(bar);
    }, true);
  }
  __name(bindClickToggle, "bindClickToggle");
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }
  __name(injectStyle, "injectStyle");

  // src/scripts/playlet-menu-fix/index.js
  function init() {
    if (!document.getElementById("ddtopmenubar")) return;
    injectStyle();
    bindClickToggle();
  }
  __name(init, "init");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

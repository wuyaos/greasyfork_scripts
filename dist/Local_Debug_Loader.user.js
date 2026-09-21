// ==UserScript==
// @name         Local Debug Loader
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.2.4
// @description  通过本地 HTTP 文件服务器动态加载仓库里的 IYUU 与 MoviePilot 脚本，方便外部编辑器实时调试。
// @author       wuya
// @include      /^https?:\/\/[^/]+\/details\.php\?[^#]*\bid=/
// @match        https://totheglory.im/t/*
// @match        https://bangumi.moe/torrent/*
// @match        https://mikanani.me/Home/Episode/*
// @match        https://*.m-team.cc/detail/*
// @match        https://*.m-team.io/detail/*
// @match        https://*.m-team.vip/detail/*
// @match        https://hdcity.city/t-*
// @include      /^https:\/\/greatposterwall\.com\/torrents\.php\?(?=[^#]*\bid=)(?=[^#]*\btorrentid=)[^#]*(?:#.*)?$/
// @match        https://iptorrents.com/torrent.php?id=*
// @match        https://eiga.moi/torrents/*
// @include      /^https:\/\/hd-space\.org\/index\.php\?(?=[^#]*\bpage=torrent-details\b)(?=[^#]*\bid=)[^#]*(?:#.*)?$/
// @match        https://beyond-hd.me/torrents/*
// @include      /^https:\/\/monikadesign\.uk\/torrents\/[0-9]+\/?$/
// @match        https://acg.rip/t/*
// @match        https://nyaa.si/view/*
// @include      /^https?:\/\/([^/]+\.)?(comicat|kisssub)\.org\/show-[a-f0-9]{40}\.html(?:[?#].*)?$/
// @grant        GM_log
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @grant        GM_info
// @connect      self
// @connect      127.0.0.1
// @connect      localhost
// @connect      2025.iyuu.cn
// @connect      zmpt.cc
// @connect      bangumi.moe
// @connect      api.m-team.cc
// @connect      api.m-team.io
// @connect      api.m-team.vip
// @connect      *.m-team.cc
// @connect      *.m-team.io
// @connect      *.m-team.vip
// @connect      halomt.com
// @connect      *
// @run-at       document-idle
// ==/UserScript==

// input: 本地调试 HTTP 服务 http://127.0.0.1:8787 与当前 PT/BT 详情页。
// output: 动态拉取并执行仓库内 IYUU / MoviePilot 用户脚本，避免 Tampermonkey @require 缓存。
// pos: 本地调试入口，仅用于开发期加载最新脚本，不作为 Greasy Fork 发布脚本。
// changelog:
// - 0.2.3: 同步 IYUU/MP 详情页匹配收敛，减少公共 BT 首页/列表页误加载，IPT 匹配收紧到详情页。
// - 0.2.2: 同步 Monika 数字种子详情页匹配，避免本地调试加载到 grouped 列表页。

// Generated from src/scripts/local-debug-loader/index.js; do not edit dist files.
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/scripts/local-debug-loader/config.js
  var IYUU_SCRIPT_URL = "http://127.0.0.1:8787/dist/IYUU_Reseed_Checker.user.js";
  var MP_SCRIPT_URL = "http://127.0.0.1:8787/dist/Moviepilot_NameTest.user.js";
  var log = /* @__PURE__ */ __name((message, extra = "") => {
    const text = `[Local Debug Loader] ${message}`;
    if (typeof GM_log === "function") GM_log(text, extra);
    else console.log(text, extra);
  }, "log");

  // src/scripts/local-debug-loader/request.js
  function requestText(url2) {
    const fullUrl = `${url2}?_local_debug_ts=${Date.now()}`;
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: fullUrl,
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        responseType: "text",
        onload: /* @__PURE__ */ __name((response) => {
          if (response.status >= 200 && response.status < 300) resolve(String(response.responseText || response.response || ""));
          else reject(new Error(`HTTP ${response.status}`));
        }, "onload"),
        onerror: reject,
        ontimeout: /* @__PURE__ */ __name(() => reject(new Error("timeout")), "ontimeout")
      });
    });
  }
  __name(requestText, "requestText");

  // src/scripts/local-debug-loader/routing.js
  function shouldLoadIyuu() {
    return !/^(bangumi\.moe|mikanani\.me|nyaa\.si|acg\.rip)$/i.test(location.hostname) && !/(^|\.)(comicat|kisssub)\.org$/i.test(location.hostname);
  }
  __name(shouldLoadIyuu, "shouldLoadIyuu");

  // src/scripts/local-debug-loader/load-scripts.js
  async function loadScripts() {
    const urls = shouldLoadIyuu() ? [IYUU_SCRIPT_URL, MP_SCRIPT_URL] : [MP_SCRIPT_URL];
    for (const url of urls) {
      try {
        const code = await requestText(url);
        if (!code.trim()) throw new Error(`${url} is empty`);
        log(`加载 ${url}`);
        eval(`${code}
//# sourceURL=${url}`);
      } catch (error) {
        log(`加载失败 ${url}`, error?.stack || error?.message || error);
      }
    }
  }
  __name(loadScripts, "loadScripts");

  // src/scripts/local-debug-loader/startup.js
  var boot = /* @__PURE__ */ __name(() => loadScripts().then(() => log("全部本地脚本已加载")).catch((error) => log("加载失败", error?.message || error)), "boot");
  function bootstrap() {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
    else boot();
  }
  __name(bootstrap, "bootstrap");

  // src/scripts/local-debug-loader/index.js
  bootstrap();
})();

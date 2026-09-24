// ==UserScript==
// @name         PT 批量下载种子
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.6.10
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

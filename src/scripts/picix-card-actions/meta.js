// ==UserScript==
// @name         Picix 卡片快捷操作
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.4.7
// @description  在 picix.us 影片卡片上直接解锁/收藏，无需进入详情页。复用页面 Vue $api（带签名），支持 Movies/Search、Movies/Rank、MovieList/Detail、Dashs 等含 a.movie-card 的页面。
// @author       wuyaos & AI
// @match        https://picix.us/*
// @icon         https://picix.us/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @connect      *
// @noframes
// @license      MIT
// @downloadURL  https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/dist/Picix_CardQuickActions.user.js
// @updateURL    https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/dist/Picix_CardQuickActions.user.js
// ==/UserScript==

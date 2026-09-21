// ==UserScript==
// @name         IYUU 辅种检测助手(自用)
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      1.1.18
// @description  在PT/BT种子页面手动查询 IYUU 辅种信息，并用小图标展示可辅种站点。
// @author       ffwu & AI
// @include      /^https?:\/\/[^/]+\/details\.php\?[^#]*\bid=/
// @match        https://totheglory.im/t/*
// @match        https://*.m-team.cc/detail/*
// @match        https://*.m-team.io/detail/*
// @match        https://*.m-team.vip/detail/*
// @match        https://hdcity.city/t-*
// @include      /^https:\/\/greatposterwall\.com\/torrents\.php\?(?=[^#]*\bid=)[^#]*(?:#.*)?$/
// @exclude      /^https?:\/\/([^/]+\.)?orpheus\.network\//
// @include      /^https?:\/\/([^/]+\.)?haidan\.(cc|video)\/details\.php\?(?=[^#]*\bgroup_id=)[^#]*(?:#.*)?$/
// @match        https://iptorrents.com/torrent.php?id=*
// @match        https://eiga.moi/torrents/*
// @include      /^https:\/\/hd-space\.org\/index\.php\?(?=[^#]*\bpage=torrent-details\b)(?=[^#]*\bid=)[^#]*(?:#.*)?$/
// @match        https://beyond-hd.me/torrents/*
// @include      /^https:\/\/monikadesign\.uk\/torrents\/[0-9]+\/?$/
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_log
// @connect      self
// @connect      2025.iyuu.cn
// @connect      zmpt.cc
// @connect      bangumi.moe
// @connect      api.m-team.cc
// @connect      *.m-team.cc
// @connect      *
// @license      MIT
// @icon         https://doc.iyuu.cn/logo_28.png
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/IYUU_Reseed_Checker.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/IYUU_Reseed_Checker.user.js
// ==/UserScript==

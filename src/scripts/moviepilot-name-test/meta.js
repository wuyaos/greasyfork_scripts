// ==UserScript==
// @name         moviepilotNameTest(自用)
// @namespace    http://tampermonkey.net/
// @version      3.5.17
// @description  moviepilots名称测试 - 多候选识别+TMDB兜底+API Key+M-Team API Key+识别缓存24h+BT站点适配
// @author       yubanmeiqin9048, benz1 (Refactored by ffwu & AI)
// @include      /^https?:\/\/[^/]+\/details\.php\?[^#]*\bid=/
// @match        https://totheglory.im/t/*
// @match        https://bangumi.moe/torrent/*
// @match        https://mikanani.me/Home/Episode/*
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
// @match        https://acg.rip/t/*
// @match        https://nyaa.si/view/*
// @include      /^https?:\/\/([^/]+\.)?(comicat|kisssub)\.org\/show-[a-f0-9]{40}\.html(?:[?#].*)?$/
// @grant        GM_log
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_setClipboard
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @connect      *
// @license      MIT
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/moviepilot.png
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Moviepilot_NameTest.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Moviepilot_NameTest.user.js
// ==/UserScript==

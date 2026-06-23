// ==UserScript==
// @name         Local Debug Loader
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.2.1
// @description  通过本地 HTTP 文件服务器动态加载仓库里的 IYUU 与 MoviePilot 脚本，方便外部编辑器实时调试。
// @author       wuya
// @match        https://*/details.php?id=*
// @match        http://*/details.php?id=*
// @match        https://*/details_movie.php?id=*
// @match        https://*/details_tv.php?id=*
// @match        https://*/details_animate.php?id=*
// @match        https://totheglory.im/t/*
// @match        https://hdsky.me/details.php?id=*
// @match        https://pt.sjtu.edu.cn/details.php?id=*
// @match        https://bangumi.moe/*
// @match        https://mikanani.me/Home/*
// @match        https://*.comicat.org/*
// @match        https://comicat.org/*
// @match        http://*.comicat.org/*
// @match        http://comicat.org/*
// @match        https://*.m-team.cc/detail/*
// @match        https://*.m-team.io/detail/*
// @match        https://*.m-team.vip/detail/*
// @match        https://hdcity.city/t-*
// @match        https://greatposterwall.com/torrents.php*
// @match        https://iptorrents.com/torrent.php*
// @match        https://eiga.moi/torrents/*
// @match        https://hd-space.org/index.php?page=torrent-details*
// @match        https://beyond-hd.me/torrents/*
// @match        https://filelist.io/details.php?id=*
// @match        https://monikadesign.uk/torrents/*
// @match        https://acg.rip/*
// @match        https://nyaa.si/*
// @match        https://*.kisssub.org/*
// @match        https://kisssub.org/*
// @match        http://*.kisssub.org/*
// @match        http://kisssub.org/*
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
(function () {
    'use strict';

    const SCRIPT_URLS = [
        'http://127.0.0.1:8787/IYUU_Reseed_Checker.user.js',
        'http://127.0.0.1:8787/Moviepilot_NameTest.user.js'
    ];

    const log = (message, extra = '') => {
        const text = `[Local Debug Loader] ${message}`;
        if (typeof GM_log === 'function') GM_log(text, extra);
        else console.log(text, extra);
    };

    function requestText(url) {
        const fullUrl = `${url}?_local_debug_ts=${Date.now()}`;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: fullUrl,
                headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
                responseType: 'text',
                onload: response => {
                    if (response.status >= 200 && response.status < 300) resolve(String(response.responseText || response.response || ''));
                    else reject(new Error(`HTTP ${response.status}`));
                },
                onerror: reject,
                ontimeout: () => reject(new Error('timeout'))
            });
        });
    }

    async function loadScripts() {
        for (const url of SCRIPT_URLS) {
            try {
                const code = await requestText(url);
                if (!code.trim()) throw new Error(`${url} is empty`);
                log(`加载 ${url}`);
                eval(`${code}\n//# sourceURL=${url}`);
            } catch (error) {
                log(`加载失败 ${url}`, error?.stack || error?.message || error);
            }
        }
    }

    const boot = () => loadScripts().then(() => log('全部本地脚本已加载')).catch(error => log('加载失败', error?.message || error));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
})();

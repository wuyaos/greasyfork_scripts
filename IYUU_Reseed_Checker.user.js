// ==UserScript==
// @name         IYUU 辅种检测助手(自用)
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      1.1.5
// @description  在PT/BT种子页面手动查询 IYUU 辅种信息，并用小图标展示可辅种站点。
// @author       ffwu & AI
// @include      /^https?:\/\/[^/]+\/details\.php\?[^#]*\bid=/
// @match        https://totheglory.im/t/*
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
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @connect      self
// @connect      2025.iyuu.cn
// @connect      zmpt.cc
// @connect      bangumi.moe
// @connect      api.m-team.cc
// @connect      *.m-team.cc
// @connect      *
// @license      MIT
// @icon         https://doc.iyuu.cn/logo_28.png
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/IYUU_Reseed_Checker.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/IYUU_Reseed_Checker.user.js
// ==/UserScript==

// input: PT/BT 种子页面、IYUU Token、站点索引、可选 M-Team API Key
// output: 手动查询 IYUU 辅种结果，展示站点详情链接、多选跳转、下载入口，并从 MoviePilot 辅助选择拥有站点
// pos: 独立 IYUU 辅种检测脚本，可复用 MoviePilot 配置选择站点，首次使用自动引导配置
// changelog:
// - 1.1.5: 补齐 IYUU 私有站特殊详情页匹配，避免在公共 BT 站点注入，并收紧 IPT 匹配到详情页。
// - 1.1.4: 使用 IYUU 文档站图标作为脚本图标。
// - 1.1.3: 增强 lazy 详情页注入，恢复缓存/自动查询并限制 Monika 只匹配数字种子详情页。
// - 1.1.1: 修复 HHClub grid 布局下 UI 插入到底部的问题，并加强查询结果同站去重。
// - 1.0.9: 补充 HHClub、GPW、HDCity、IPT、BHD、FileList 详情页适配，并修正 M-Team 体积提取。
// - 1.0.8: 为每个辅种站点详情页写入跨站页面缓存别名；馒头下载改为带 API Key 换取真实下载链接。
// - 1.0.7: 保留配置保存后的查询结果缓存，新增当前页面快速缓存。
// - 1.0.6: 增加默认关闭的自动查询开关，缓存命中时不重复请求。

(function () {
    'use strict';

    const SCRIPT_NAME = 'IYUU 辅种检测助手';
    const API_BASE = 'https://2025.iyuu.cn';
    const ZMPT_API = 'https://zmpt.cc/nodeapi/iyuu/getIyuuByInfoHash';
    const MTEAM_API_BASE = 'https://api.m-team.cc/api';
    const KEYS = {
        token: 'iyuu_reseed_token', owned: 'iyuu_reseed_owned_sites', zmpt: 'iyuu_reseed_zmpt_enabled',
        sites: 'iyuu_reseed_sites_index', sitesTime: 'iyuu_reseed_sites_index_time', sid: 'iyuu_reseed_sid_sha1',
        sidTime: 'iyuu_reseed_sid_sha1_time', sidKey: 'iyuu_reseed_sid_sha1_key', result: 'iyuu_reseed_result_cache',
        mteamKey: 'iyuu_reseed_mteam_api_key', configured: 'iyuu_reseed_configured_once', autoQuery: 'iyuu_reseed_auto_query',
        debug: 'iyuu_debug',
        mpUrl: 'moviepilotUrl', mpUser: 'moviepilotUser', mpPass: 'moviepilotPassword', mpAuthMode: 'moviepilotAuthMode', mpApiKey: 'moviepilotApiKey'
    };
    const COLORS = { primary: '#2775b6', secondary: '#e6702e', success: '#5bb053', warn: '#c54640', info: '#677489' };
    const DEBUG = false;
    const safeJson = v => { try { return JSON.stringify(v, (k, val) => val instanceof ArrayBuffer ? `ArrayBuffer(${val.byteLength})` : val, 2); } catch (_) { return String(v); } };
    const debugEnabled = () => { try { return Boolean(GM_getValue(KEYS.debug, DEBUG)); } catch (_) { return DEBUG; } };
    const log = (label, value = '') => { if (debugEnabled()) console.log(`[${SCRIPT_NAME}] ${label}`, value && typeof value === 'object' ? safeJson(value) : value); };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    let iyuuLastRequest = 0;
    const normalizeSiteKey = value => String(value || '').toLowerCase().replace(/[\s._-]+/g, '');
    const AUTO_FEED_SITE_DEFS = [
        { url: 'https://1ptba.com/', aliases: ['1ptba'] },
        { url: 'https://audiences.me/', aliases: ['audiences'] },
        { url: 'https://beyond-hd.me/', aliases: ['bhd', 'beyondhd'] },
        { url: 'https://broadcasthe.net/', aliases: ['btn'] },
        { url: 'https://byr.pt/', aliases: ['byr'] },
        { url: 'https://pt.btschool.club/', aliases: ['btschool'] },
        { url: 'https://carpt.net/', aliases: ['carpt'] },
        { url: 'https://springsunday.net/', aliases: ['cmct'] },
        { url: 'https://ptchdbits.co/', aliases: ['chdbits'] },
        { url: 'https://cspt.top/', aliases: ['cspt', '财神'] },
        { url: 'https://discfan.net/', aliases: ['discfan'] },
        { url: 'https://eiga.moi/', aliases: ['eiga', 'acm'] },
        { url: 'https://filelist.io/', aliases: ['filelist'] },
        { url: 'https://pt.0ff.cc/', aliases: ['freefarm'] },
        { url: 'https://greatposterwall.com/', aliases: ['gpw', 'greatposterwall'] },
        { url: 'https://www.haidan.video/', aliases: ['haidan'] },
        { url: 'https://hdarea.club/', aliases: ['hdarea'] },
        { url: 'https://hdbits.org/', aliases: ['hdb', 'hdbits'] },
        { url: 'https://hdcity.city/', aliases: ['hdcity'] },
        { url: 'https://www.hddolby.com/', aliases: ['hddolby'] },
        { url: 'http://hdfans.org/', aliases: ['hdfans'] },
        { url: 'https://hdhome.org/', aliases: ['hdhome'] },
        { url: 'https://hdsky.me/', aliases: ['hdsky'] },
        { url: 'https://hd-space.org/', aliases: ['hdspace', 'hd-space'] },
        { url: 'https://hdtime.org/', aliases: ['hdtime'] },
        { url: 'https://pt.upxin.net/', aliases: ['hdu'] },
        { url: 'https://hudbt.hust.edu.cn/', aliases: ['hudbt'] },
        { url: 'https://iptorrents.com/', aliases: ['ipt', 'iptorrents'] },
        { url: 'https://monikadesign.uk/', aliases: ['monika', 'monikadesign'] },
        { url: 'https://kp.m-team.cc/', aliases: ['mteam', 'm-team', '馒头', 'mt'], hosts: ['m-team.cc', 'm-team.io', 'm-team.vip'] },
        { url: 'https://nanyangpt.com/', aliases: ['nanyang'] },
        { url: 'https://ourbits.club/', aliases: ['ourbits'] },
        { url: 'https://pterclub.net/', aliases: ['pter', 'pterclub'] },
        { url: 'https://www.pthome.net/', aliases: ['pthome'] },
        { url: 'https://ptsbao.club/', aliases: ['ptsbao'] },
        { url: 'https://www.pttime.org/', aliases: ['ptt'] },
        { url: 'https://pt.sjtu.edu.cn/', aliases: ['putao'] },
        { url: 'https://www.qingwapt.org/', aliases: ['qingwa', 'qingwapt', '青蛙'], hosts: ['qingwapt.com', 'qingwapt.org'] },
        { url: 'https://rousi.pro/', aliases: ['rousi'] },
        { url: 'https://et8.org/', aliases: ['tccf'] },
        { url: 'https://www.tjupt.org/', aliases: ['tjupt'] },
        { url: 'http://pt.eastgame.org/', aliases: ['tlfbits'] },
        { url: 'https://totheglory.im/', aliases: ['ttg'] },
        { url: 'https://ubits.club/', aliases: ['ubits'] },
        { url: 'https://www.yemapt.org/', aliases: ['yemapt'] },
        { url: 'https://zmpt.cc/', aliases: ['zmpt'] },
        { url: 'https://zhuque.in/', aliases: ['zhuque', '朱雀'] }
    ];
    const normalizedHost = raw => {
        try {
            const text = String(raw || '');
            const url = /^https?:\/\//i.test(text) ? new URL(text) : new URL(`https://${text}`);
            return url.hostname.replace(/^www\./, '').toLowerCase();
        } catch (_) {
            return String(raw || '').replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0].toLowerCase();
        }
    };
    const AUTO_FEED_SITE_URLS = Object.fromEntries(AUTO_FEED_SITE_DEFS.flatMap(def => (def.aliases || []).flatMap(alias => [
        [String(alias || '').toLowerCase(), def.url],
        [normalizeSiteKey(alias), def.url]
    ]).filter(([key]) => key)));
    const AUTO_FEED_HOST_URLS = Object.fromEntries(AUTO_FEED_SITE_DEFS.flatMap(def => [def.url, ...(def.hosts || [])].map(raw => [normalizedHost(raw), def.url]).filter(([host]) => host)));
    const AUTO_FEED_CANONICAL_HOSTS = Object.fromEntries(AUTO_FEED_SITE_DEFS.flatMap(def => {
        const canonical = normalizeSiteKey((def.aliases || [])[0]) || normalizedHost(def.url);
        return [def.url, ...(def.hosts || [])].map(raw => [normalizedHost(raw), canonical]).filter(([host]) => host);
    }));
    const firstOf = (items, predicate) => {
        for (const item of items || []) {
            if (predicate(item)) return item;
        }
        return undefined;
    };

    const Store = {
        get(k, d = '') { try { return GM_getValue(k, d); } catch (_) { return d; } },
        set(k, v) { try { GM_setValue(k, v); } catch (_) {} },
        del(k) { try { GM_deleteValue(k); } catch (_) {} },
        json(k, d) { try { const v = this.get(k, ''); return v ? JSON.parse(v) : d; } catch (_) { return d; } }
    };

    const Config = {
        token: '', owned: [], zmpt: true, mteamKey: '', autoQuery: false, debug: false,
        load() {
            this.token = Store.get(KEYS.token, '');
            this.owned = Store.json(KEYS.owned, []);
            this.zmpt = true;
            Store.set(KEYS.zmpt, true);
            this.mteamKey = Store.get(KEYS.mteamKey, '');
            this.autoQuery = Boolean(Store.get(KEYS.autoQuery, false));
            this.debug = debugEnabled();
        },
        save({ token, owned, mteamKey, autoQuery, debug }) {
            Store.set(KEYS.token, String(token || '').trim());
            Store.set(KEYS.owned, JSON.stringify((owned || []).map(String)));
            Store.set(KEYS.zmpt, true);
            Store.set(KEYS.mteamKey, String(mteamKey || '').trim());
            Store.set(KEYS.autoQuery, Boolean(autoQuery));
            Store.set(KEYS.debug, Boolean(debug));
            Store.set(KEYS.configured, true);
            Store.del(KEYS.sid); Store.del(KEYS.sidTime); Store.del(KEYS.sidKey);
            this.load();
        },
        reset() {
            if (!confirm(`${SCRIPT_NAME}\n\n确定重置所有配置和缓存吗？`)) return;
            Object.values(KEYS).forEach(k => Store.del(k));
            location.reload();
        }
    };

    const UI = {
        initStyle() {
            GM_addStyle(`
                .iyuu-row-box{display:inline-flex;align-items:center;gap:.45em;flex-wrap:wrap;font:inherit;line-height:inherit;vertical-align:middle}
                .iyuu-btn,.iyuu-body button{border:0;border-radius:4px;color:#fff;cursor:pointer;font:inherit;font-weight:600;padding:.12em .6em;background:${COLORS.secondary};line-height:1.45;min-height:1.8em}
                .iyuu-btn.primary,.iyuu-save{background:${COLORS.success}}
                .iyuu-btn.danger,.iyuu-cancel,#iyuuResetConfig{background:${COLORS.warn}}
                .iyuu-btn:not(:disabled):hover,.iyuu-body button:not(:disabled):hover{filter:brightness(.96)}
                .iyuu-btn:disabled,.iyuu-body button:disabled{opacity:.7;cursor:not-allowed}
                .iyuu-chip{display:inline-flex;align-items:center;gap:.35em;border-radius:4px;padding:.12em .5em;background:#eef3f8;color:#263238;text-decoration:none;border:1px solid #d6dde5;font:inherit;line-height:1.45;vertical-align:middle}
                .iyuu-chip.source{color:#fff;background:${COLORS.primary};border-color:${COLORS.primary}}
                .iyuu-chip.error{background:${COLORS.warn};border-color:${COLORS.warn};color:#fff}
                .iyuu-site-choice{display:inline-flex;align-items:center;gap:.35em}
                .iyuu-site-choice input{margin:0}
                .iyuu-site-link{display:inline-flex;align-items:center;gap:.35em;color:inherit;text-decoration:none}
                .iyuu-icon{width:16px;height:16px;border-radius:3px;object-fit:contain;background:#fff;flex:0 0 auto;display:block}
                .iyuu-avatar{width:16px;height:16px;border-radius:4px;background:${COLORS.info};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}
                .iyuu-toast{position:fixed;top:20px;right:20px;z-index:2147483647;background:${COLORS.success};color:#fff;padding:12px 16px;border-radius:5px;box-shadow:0 4px 12px rgba(0,0,0,.15)}
                .iyuu-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483646;display:flex;align-items:center;justify-content:center}
                .iyuu-modal{width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 32px);border-radius:8px;background:#f6f7f9;color:#333;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.28);font-family:Segoe UI,system-ui,sans-serif}
                .iyuu-modal h2{position:sticky;top:0;z-index:1;margin:0;padding:12px 18px;color:#fff;font-size:15px;letter-spacing:0;background:${COLORS.primary}}
                .iyuu-body{display:grid;gap:12px;padding:14px 16px 0;max-height:calc(100vh - 88px);overflow:auto}
                .iyuu-section,.iyuu-more{border:1px solid #dfe4ea;border-radius:6px;background:#fff;padding:12px}
                .iyuu-section-title{margin:0 0 10px;color:#1f2933;font-size:13px;font-weight:700}
                .iyuu-field{display:grid;gap:4px;margin-bottom:10px}
                .iyuu-field:last-child{margin-bottom:0}
                .iyuu-body label{margin:0;color:#4b5563;font-size:12px}
                .iyuu-check-line{display:flex!important;align-items:center;gap:6px;font-weight:600}
                .iyuu-check-line input{margin:0}
                .iyuu-body input[type=text],.iyuu-body input[type=password],.iyuu-body select{box-sizing:border-box;width:100%;height:32px;margin:0;padding:6px 8px;border:1px solid #cfd6df;border-radius:4px;background:#fff;color:#222;font-size:13px}
                .iyuu-body input:focus,.iyuu-body select:focus{border-color:${COLORS.primary};outline:none;box-shadow:0 0 0 2px rgba(39,117,182,.14)}
                .iyuu-secret-field{position:relative;width:100%;min-width:0}
                .iyuu-secret-field input{padding-right:34px!important}
                .iyuu-secret-toggle{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:24px!important;height:24px!important;min-height:24px!important;padding:0!important;border:0!important;background:transparent!important;color:#677489!important;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px}
                .iyuu-secret-toggle:hover{background:rgba(39,117,182,.10)!important;color:${COLORS.primary}!important;filter:none!important}
                .iyuu-secret-toggle svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
                .iyuu-inline{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
                .iyuu-body button{height:32px;padding:0 10px;font-size:12px}
                .iyuu-more{margin:0}
                .iyuu-more summary{list-style:none;margin:-12px;padding:12px;cursor:pointer;font-weight:700;color:${COLORS.primary}}
                .iyuu-more summary::-webkit-details-marker{display:none}
                .iyuu-more[open] summary{margin-bottom:10px;border-bottom:1px solid #edf0f3}
                .iyuu-site-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0}
                .iyuu-site-toolbar input{flex:1 1 180px;min-width:160px}
                .iyuu-site-toolbar button{flex:0 0 auto}
                .iyuu-site-grid{display:flex;gap:7px;flex-wrap:wrap;max-height:240px;overflow:auto;border:1px solid #dfe4ea;border-radius:6px;background:#fff;padding:8px}
                .iyuu-site-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid #d6dde5;border-radius:4px;background:#fff;color:#8a94a3;cursor:pointer;font-size:12px;opacity:.75}
                .iyuu-site-chip:hover{border-color:${COLORS.primary}}
                .iyuu-site-chip.selected{border-color:${COLORS.success};background:${COLORS.success};color:#fff;opacity:1;font-weight:600}
                .iyuu-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:8px;margin:0 -16px;padding:10px 16px;background:#f6f7f9;border-top:1px solid #dfe4ea}
                .iyuu-actions button{margin:0}
                @media(max-width:720px){.iyuu-site-toolbar button{flex:1 1 calc(50% - 8px)}.iyuu-site-toolbar input{flex-basis:100%}.iyuu-inline{grid-template-columns:1fr}.iyuu-body{padding:12px 12px 0}.iyuu-actions{margin:0 -12px;padding:10px 12px}}
            `);
        },
        actionText(action, status) { return `${action}（${status}）`; },
        tag(text, color = COLORS.info) {
            const el = document.createElement('span'); el.className = 'iyuu-chip source'; el.style.background = color; el.style.borderColor = color; el.textContent = text; return el;
        },
        siteChip(site, selected, multi = false) {
            const wrap = document.createElement(multi ? 'label' : (site.url ? 'a' : 'span')); wrap.className = 'iyuu-chip iyuu-site-choice';
            if (multi && selected) { const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = selected.has(site); cb.onchange = () => cb.checked ? selected.add(site) : selected.delete(site); wrap.appendChild(cb); }
            else if (site.url) { wrap.href = site.url; wrap.target = '_blank'; wrap.rel = 'noopener noreferrer'; }
            const inner = document.createElement('span'); inner.className = 'iyuu-site-link'; inner.append(this.icon(site.name, site.icon), document.createTextNode(site.name)); wrap.appendChild(inner); return wrap;
        },
        icon(name, src) {
            const candidates = Array.isArray(src) ? src : [src];
            const urls = [];
            candidates.forEach(item => {
                try {
                    const u = new URL(item || '', location.origin);
                    if ((u.protocol === 'https:' || u.protocol === 'http:') && !urls.includes(u.href)) urls.push(u.href);
                } catch (_) {}
            });
            if (!urls.length) return this.avatar(name);
            const img = document.createElement('img'); img.className = 'iyuu-icon'; img.alt = '';
            let idx = 0;
            img.onerror = () => {
                idx++;
                if (idx < urls.length) img.src = urls[idx];
                else img.replaceWith(this.avatar(name));
            };
            img.src = urls[idx];
            return img;
        },
        avatar(name) { const s = document.createElement('span'); s.className = 'iyuu-avatar'; s.textContent = String(name || '?').trim().slice(0, 1).toUpperCase(); return s; },
        toast(msg) { const t = document.createElement('div'); t.className = 'iyuu-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); },
        eyeIcon(hidden = true) {
            return hidden
                ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.2-5.5 9.2-5.5S21.2 12 21.2 12s-3.2 5.5-9.2 5.5S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.4"/></svg>'
                : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.2-5.5 9.2-5.5c1.7 0 3.2.45 4.45 1.1M21.2 12s-3.2 5.5-9.2 5.5c-1.65 0-3.1-.4-4.3-1.05M4.5 4.5l15 15"/><path d="M9.9 9.9a2.4 2.4 0 0 0 3.2 3.2"/></svg>';
        },
        secretInput(id, attrs = '') {
            return `<div class="iyuu-secret-field"><input id="${id}" type="password" autocomplete="off"${attrs}><button type="button" class="iyuu-secret-toggle" data-target="${id}" aria-label="显示密钥" title="显示密钥">${this.eyeIcon(true)}</button></div>`;
        },
        bindSecretToggles(modal) {
            modal.querySelectorAll('.iyuu-secret-toggle').forEach(btn => {
                const input = document.getElementById(btn.dataset.target || '');
                if (!input) return;
                btn.onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const visible = input.type === 'text';
                    input.type = visible ? 'password' : 'text';
                    btn.dataset.visible = visible ? '0' : '1';
                    btn.setAttribute('aria-label', visible ? '显示密钥' : '隐藏密钥');
                    btn.title = visible ? '显示密钥' : '隐藏密钥';
                    btn.innerHTML = this.eyeIcon(visible);
                };
            });
        },
        async safeRun(label, fn) { try { return await fn(); } catch (e) { log(`${label} 失败`, e?.message || e); this.toast(`${label}失败：${e?.message || '未知错误'}`); } },
        async showConfig() {
            let sites = await SiteIndex.get(false).catch(() => []);
            const bg = document.createElement('div'); bg.className = 'iyuu-modal-bg';
            const modal = document.createElement('div'); modal.className = 'iyuu-modal';
            modal.innerHTML = `<h2>IYUU 配置</h2><div class="iyuu-body"><section class="iyuu-section"><h3 class="iyuu-section-title">基础设置</h3><div class="iyuu-field"><label for="iyuuToken">IYUU Token</label>${this.secretInput('iyuuToken')}</div><div class="iyuu-field"><label for="iyuuMteamKey">M-Team API Key（可选）</label>${this.secretInput('iyuuMteamKey')}</div><label class="iyuu-check-line"><input id="iyuuAutoQuery" type="checkbox"> 自动查询（默认关闭，命中缓存时不会重复请求）</label><label class="iyuu-check-line"><input id="iyuuDebugLog" type="checkbox"> 调试日志</label></section><section class="iyuu-section"><h3 class="iyuu-section-title">MoviePilot 联动</h3><div class="iyuu-field"><label for="iyuuMpUrl">MoviePilot 地址</label><input id="iyuuMpUrl" type="text"></div><div class="iyuu-field"><label for="iyuuMpAuth">认证方式</label><select id="iyuuMpAuth"><option value="password">用户名密码</option><option value="apikey">API Key</option></select></div><div id="iyuuMpPasswordFields"><div class="iyuu-field"><label for="iyuuMpUser">用户名</label><input id="iyuuMpUser" type="text"></div><div class="iyuu-field"><label for="iyuuMpPass">密码</label>${this.secretInput('iyuuMpPass')}</div></div><div id="iyuuMpApiKeyFields"><div class="iyuu-field"><label for="iyuuMpApiKey">API Key</label>${this.secretInput('iyuuMpApiKey')}</div></div></section><section class="iyuu-section"><h3 class="iyuu-section-title">索引站点</h3><div class="iyuu-site-toolbar"><input id="iyuuSiteSearch" type="text" placeholder="搜索名称 / 域名 / 别名"><button id="iyuuRefreshSites">刷新索引</button><button id="iyuuDetectSites">从 MP 选择</button><button id="iyuuDetectLogin">选择已登录</button><button id="iyuuAllSites">全选</button><button id="iyuuClearSites">清空</button><button id="iyuuClearCache">清缓存</button><button id="iyuuResetConfig">重置</button></div><div id="iyuuSiteGrid" class="iyuu-site-grid"></div></section><div class="iyuu-actions"><button class="iyuu-cancel">关闭</button><button class="iyuu-save">保存</button></div></div>`;
            bg.appendChild(modal); document.body.appendChild(bg);
            this.bindSecretToggles(modal);
            modal.querySelector('#iyuuToken').value = Config.token;
            modal.querySelector('#iyuuMteamKey').value = Config.mteamKey;
            modal.querySelector('#iyuuAutoQuery').checked = Config.autoQuery;
            modal.querySelector('#iyuuDebugLog').checked = Config.debug;
            modal.querySelector('#iyuuMpUrl').value = Store.get(KEYS.mpUrl, 'http://127.0.0.1:3000');
            modal.querySelector('#iyuuMpAuth').value = Store.get(KEYS.mpAuthMode, 'password');
            modal.querySelector('#iyuuMpUser').value = Store.get(KEYS.mpUser, 'admin');
            modal.querySelector('#iyuuMpPass').value = Store.get(KEYS.mpPass, '');
            modal.querySelector('#iyuuMpApiKey').value = Store.get(KEYS.mpApiKey, '');
            const updateMpAuthFields = () => {
                const mode = modal.querySelector('#iyuuMpAuth').value;
                modal.querySelector('#iyuuMpPasswordFields').style.display = mode === 'password' ? '' : 'none';
                modal.querySelector('#iyuuMpApiKeyFields').style.display = mode === 'apikey' ? '' : 'none';
            };
            modal.querySelector('#iyuuMpAuth').addEventListener('change', updateMpAuthFields);
            updateMpAuthFields();
            const selected = new Set(Config.owned.map(String));
            if (!Store.get(KEYS.configured, false) && !selected.size && sites.length) sites.forEach(s => selected.add(String(s.id || s.sid)));
            const grid = modal.querySelector('#iyuuSiteGrid');
            const renderSites = (kw = '') => { const query = normalizeSiteKey(kw); grid.textContent = ''; sites.filter(s => !query || SiteIndex.searchText(s).includes(query)).forEach(s => { const sid = String(s.id || s.sid); if (!sid) return; const b = document.createElement('button'); b.type = 'button'; b.className = `iyuu-site-chip${selected.has(sid) ? ' selected' : ''}`; b.dataset.sid = sid; b.title = SiteIndex.searchTitle(s); b.append(this.icon(SiteIndex.name(s), SiteIndex.icon(s)), document.createTextNode(SiteIndex.name(s))); b.onclick = () => { selected.has(sid) ? selected.delete(sid) : selected.add(sid); b.classList.toggle('selected'); }; grid.appendChild(b); }); };
            const tokenInput = modal.querySelector('#iyuuToken');
            renderSites(); modal.querySelector('#iyuuSiteSearch').oninput = e => renderSites(e.target.value);
            modal.querySelector('#iyuuAllSites').onclick = () => { sites.forEach(s => selected.add(String(s.id || s.sid))); renderSites(modal.querySelector('#iyuuSiteSearch').value); this.toast(`已全选 ${selected.size} 个站点`); };
            modal.querySelector('#iyuuClearSites').onclick = () => { selected.clear(); renderSites(modal.querySelector('#iyuuSiteSearch').value); this.toast('已清空站点选择'); };
            modal.querySelector('#iyuuRefreshSites').onclick = async () => { const token = tokenInput.value.trim(); if (!token) { this.toast('请先填写 IYUU Token'); return; } try { const first = !Store.get(KEYS.configured, false); sites = await SiteIndex.get(true, token); if (first) { selected.clear(); sites.forEach(s => selected.add(String(s.id || s.sid))); } renderSites(modal.querySelector('#iyuuSiteSearch').value); this.toast(`站点索引已刷新：${sites.length} 个`); } catch (e) { this.toast(`刷新失败：${e.message}`); } };
            const saveConfig = () => Config.save({
                token: tokenInput.value,
                mteamKey: modal.querySelector('#iyuuMteamKey').value,
                autoQuery: modal.querySelector('#iyuuAutoQuery').checked,
                debug: modal.querySelector('#iyuuDebugLog').checked,
                owned: [...selected]
            });
            modal.querySelector('#iyuuDetectSites').onclick = async () => { try { MoviePilot.save(modal); const detected = SiteIndex.matchMoviePilot(await MoviePilot.sites(), sites); detected.forEach(sid => selected.add(sid)); renderSites(modal.querySelector('#iyuuSiteSearch').value); this.toast(`已按 MoviePilot 选择站点：${detected.length} 个`); } catch (e) { this.toast(`MoviePilot 获取失败：${e.message}`); } };
            modal.querySelector('#iyuuDetectLogin').onclick = async ev => { const b = ev.currentTarget; if (b.disabled) return; if (!confirm('该方式会逐站访问首页检测登录，较慢且较重，确定继续？')) return; b.disabled = true; const detected = await SiteIndex.detectLoggedIn(sites, (done, total) => { b.textContent = `检测中 ${done}/${total}`; }); detected.forEach(sid => selected.add(sid)); renderSites(modal.querySelector('#iyuuSiteSearch').value); b.disabled = false; b.textContent = '选择已登录'; this.toast(`已选择疑似登录站点：${detected.length} 个`); };
            modal.querySelector('#iyuuClearCache').onclick = () => ResultCache.clear();
            modal.querySelector('#iyuuResetConfig').onclick = () => Config.reset();
            modal.querySelector('.iyuu-cancel').onclick = () => bg.remove(); bg.onclick = e => { if (e.target === bg) bg.remove(); };
            modal.querySelector('.iyuu-save').onclick = () => { saveConfig(); MoviePilot.save(modal); this.toast('配置已保存'); };
        }
    };

    // <pt-common:start>
    const createPTCommon = ({
        defaultLabel,
        productId,
        gridLabelClass,
        gridContentClass
    }) => {
        const NS = 'pt-helper';
        const Native = {
            querySelector: Document.prototype.querySelector,
            querySelectorAll: Document.prototype.querySelectorAll,
            closest: Element.prototype.closest
        };
        const DOM = {
            ns: NS,
            productId,
            qs(selector, root = document) {
                try { return Native.querySelector.call(root, selector); } catch (_) { return null; }
            },
            qsa(selector, root = document) {
                try { return Array.from(Native.querySelectorAll.call(root, selector)); } catch (_) { return []; }
            },
            closest(node, selector) {
                try { return node ? Native.closest.call(node, selector) : null; } catch (_) { return null; }
            },
            productRootSelector(siteId = '') {
                const site = siteId ? `[data-${NS}-site="${siteId}"]` : '';
                return `[data-${NS}-root="1"][data-${NS}-product="${productId}"]${site}`;
            },
            markRoot(node, { siteId = '', family = '', anchorLevel = '', anchorReason = '', anchorKey = '' } = {}) {
                if (!node?.setAttribute) return node;
                node.setAttribute(`data-${NS}-root`, '1');
                node.setAttribute(`data-${NS}-product`, productId);
                if (siteId) node.setAttribute(`data-${NS}-site`, siteId);
                if (family) node.setAttribute(`data-${NS}-family`, family);
                if (anchorLevel) node.setAttribute(`data-${NS}-anchor-level`, String(anchorLevel));
                if (anchorReason) node.setAttribute(`data-${NS}-anchor-reason`, anchorReason);
                if (anchorKey) node.setAttribute(`data-${NS}-anchor-key`, anchorKey);
                return node;
            }
        };

        const labelOf = mount => mount?.label || defaultLabel;
        const rootSelector = siteId => DOM.productRootSelector(siteId);
        const stableNodeKey = node => {
            if (!node) return '';
            if (node.id) return `#${node.id}`;
            const dataKey = node.getAttribute?.(`data-${NS}-anchor`) || node.getAttribute?.(`data-${NS}-key`);
            if (dataKey) return `[data:${dataKey}]`;
            const text = String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
            const tag = String(node.tagName || 'node').toLowerCase();
            return text ? `${tag}:${text}` : tag;
        };
        const mountAnchorKey = mount => {
            if (!mount?.target) return '';
            const target = mount.target;
            if (mount.type === 'append' || mount.type === 'prepend') return `${mount.type}:${stableNodeKey(target)}`;
            if (mount.type === 'table-row-after' || mount.type === 'table-colspan-after' || mount.type === 'table-colspan-before' || mount.type === 'ant-row-after') {
                const ref = DOM.closest(target, 'tr') || target;
                const firstCell = ref?.cells?.[0] || ref;
                return `${mount.type}:${stableNodeKey(ref)}:${stableNodeKey(firstCell)}`;
            }
            if (mount.type === 'definition-after') {
                const ref = DOM.closest(target, 'dd') || target;
                return `${mount.type}:${stableNodeKey(ref.previousElementSibling)}:${stableNodeKey(ref)}`;
            }
            if (mount.type === 'grid-pair-after') {
                return `${mount.type}:${stableNodeKey(target.previousElementSibling)}:${stableNodeKey(target)}`;
            }
            return `${mount.type}:${stableNodeKey(target)}`;
        };
        const mountHost = mount => {
            if (!mount?.target) return null;
            if (mount.type === 'append' || mount.type === 'prepend') return mount.target || document.body;
            if (mount.type === 'table-row-after' || mount.type === 'table-colspan-after' || mount.type === 'table-colspan-before' || mount.type === 'ant-row-after') {
                return mount.target?.closest?.('table') || mount.target?.parentElement || mount.target;
            }
            if (mount.type === 'definition-after') return mount.target?.closest?.('dl') || mount.target?.parentElement || mount.target;
            if (mount.type === 'grid-pair-after') return mount.target?.parentElement || mount.target;
            return mount.target?.parentElement || mount.target;
        };
        const isEmptyElement = node => node?.nodeType === 1 && !String(node.textContent || '').trim() && !node.querySelector?.('img,button,a,input,select,textarea,svg,canvas,video,audio');
        const cleanupEmptyMountShell = node => {
            let current = node;
            for (let depth = 0; depth < 3; depth += 1) {
                if (!isEmptyElement(current)) return;
                const next = current.parentElement;
                current.remove();
                current = next;
            }
        };

        const Mount = {
            afterNode(target) { return { type: 'div-after', target }; },
            tableRowAfter(target, label = defaultLabel) { return { type: 'table-row-after', target, label }; },
            tableColspanAfter(target, label = defaultLabel, colspan = 0) { return { type: 'table-colspan-after', target, label, colspan }; },
            tableColspanBefore(target, label = defaultLabel, colspan = 0) { return { type: 'table-colspan-before', target, label, colspan }; },
            blockAfter(target, label = defaultLabel) { return { type: 'block-after', target, label }; },
            antRowAfter(target, label = defaultLabel) { return { type: 'ant-row-after', target, label }; },
            gridPairAfter(target, label = defaultLabel) { return { type: 'grid-pair-after', target, label }; },
            prepend(target = document.body) { return { type: 'prepend', target }; },
            append(target) { return { type: 'append', target }; },
            definitionAfter(target, label = defaultLabel) { return { type: 'definition-after', target, label }; },
            mountRoot(mount, contentNode, meta = {}) {
                const siteId = meta.siteId || '';
                const existing = DOM.qs(rootSelector(siteId)) || DOM.qs(rootSelector(''));
                const anchorKey = meta.anchorKey || mountAnchorKey(mount);
                const targetHost = mountHost(mount);
                if (existing && existing !== contentNode) {
                    const sameHost = targetHost && targetHost.contains?.(existing);
                    const sameAnchor = anchorKey && existing.getAttribute?.(`data-${NS}-anchor-key`) === anchorKey;
                    const oldParent = existing.parentElement;
                    DOM.markRoot(existing, { ...meta, anchorReason: meta.anchorReason || mount?.type || '', anchorKey });
                    if ((!sameHost || !sameAnchor) && mount?.target) {
                        this.render(mount, existing);
                        cleanupEmptyMountShell(oldParent);
                    }
                    return existing;
                }
                DOM.markRoot(contentNode, { ...meta, anchorReason: meta.anchorReason || mount?.type || '', anchorKey });
                this.render(mount, contentNode);
                return contentNode;
            },
            render(mount, contentNode) {
                const m = mount?.target ? mount : this.prepend();
                if (m.type === 'table-row-after') return this.tableRow(m, contentNode);
                if (m.type === 'table-colspan-after') return this.tableColspan(m, contentNode);
                if (m.type === 'table-colspan-before') return this.tableColspan(m, contentNode, true);
                if (m.type === 'block-after') return this.block(m, contentNode);
                if (m.type === 'ant-row-after') return this.antRow(m, contentNode);
                if (m.type === 'grid-pair-after') return this.gridPair(m, contentNode);
                if (m.type === 'definition-after') return this.definition(m, contentNode);
                if (m.type === 'append') return m.target.appendChild(contentNode);
                if (m.type === 'prepend') return (m.target || document.body).prepend(contentNode);
                return m.target.after(contentNode);
            },
            tableRow(m, contentNode) {
                const ref = m.target?.closest?.('tr') || m.target;
                const tr = document.createElement('tr');
                const h = document.createElement('td');
                const d = document.createElement('td');
                const refHead = ref?.cells?.[0], refBody = ref?.cells?.[1];
                if (ref?.className) tr.className = ref.className;
                if (ref?.getAttribute?.('style')) tr.setAttribute('style', ref.getAttribute('style'));
                h.className = refHead ? refHead.className : 'rowhead nowrap';
                d.className = refBody ? refBody.className : 'rowfollow';
                if (refHead?.getAttribute?.('style')) h.setAttribute('style', refHead.getAttribute('style'));
                if (refBody?.getAttribute?.('style')) d.setAttribute('style', refBody.getAttribute('style'));
                ['align', 'valign'].forEach(attr => { if (refHead?.getAttribute?.(attr)) h.setAttribute(attr, refHead.getAttribute(attr)); if (refBody?.getAttribute?.(attr)) d.setAttribute(attr, refBody.getAttribute(attr)); });
                const refText = refHead?.querySelector?.('.td-text');
                if (refText) {
                    const span = document.createElement('span');
                    span.className = refText.className;
                    span.textContent = labelOf(m);
                    h.appendChild(span);
                } else if (refHead?.firstElementChild && refHead.firstElementChild.children.length === 0) {
                    const wrapper = refHead.firstElementChild.cloneNode(false);
                    wrapper.textContent = labelOf(m);
                    h.appendChild(wrapper);
                } else {
                    h.textContent = labelOf(m);
                }
                d.appendChild(contentNode);
                tr.append(h, d);
                ref?.after ? ref.after(tr) : m.target.after(tr);
                return tr;
            },
            tableColspan(m, contentNode, before = false) {
                const ref = m.target?.closest?.('tr') || m.target;
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                const table = ref?.closest?.('table');
                const label = document.createElement('span');
                label.style.cssText = 'display:inline-block;min-width:72px;font-weight:700;margin-right:8px;vertical-align:middle;';
                label.textContent = `${labelOf(m)}：`;
                contentNode.style.display = 'inline-flex';
                contentNode.style.alignItems = 'center';
                contentNode.style.flexWrap = 'wrap';
                contentNode.style.gap = contentNode.style.gap || '6px';
                contentNode.style.verticalAlign = 'middle';
                td.colSpan = m.colspan || Math.max(1, ...[...(table?.rows || [])].map(r => r.cells.length));
                td.style.paddingLeft = '12px';
                td.style.paddingTop = '10px';
                td.style.paddingBottom = '10px';
                td.append(label, contentNode);
                tr.appendChild(td);
                if (before && ref?.before) ref.before(tr);
                else if (ref?.after) ref.after(tr);
                else (m.target || document.body).after(tr);
                return tr;
            },
            block(m, contentNode) {
                const block = document.createElement('div');
                block.className = 'block';
                const title = document.createElement('div');
                title.className = 'blocktitle';
                title.textContent = labelOf(m);
                const body = document.createElement('div');
                body.className = 'blockcontent';
                body.appendChild(contentNode);
                block.append(title, body);
                m.target.after(block);
                return block;
            },
            antRow(m, contentNode) {
                const tr = document.createElement('tr');
                tr.className = 'ant-descriptions-row';
                const th = document.createElement('th');
                th.className = 'ant-descriptions-item-label';
                th.style.cssText = 'width:135px;text-align:right';
                th.textContent = labelOf(m);
                const td = document.createElement('td');
                td.className = 'ant-descriptions-item-content';
                td.appendChild(contentNode);
                tr.append(th, td);
                (m.target?.closest?.('tr') || m.target).after(tr);
                return tr;
            },
            definition(m, contentNode) {
                const dt = document.createElement('dt');
                dt.textContent = labelOf(m);
                const dd = document.createElement('dd');
                dd.appendChild(contentNode);
                const ref = m.target?.closest?.('dd') || m.target;
                ref.after(dt, dd);
                return dd;
            },
            gridPair(m, contentNode) {
                const refValue = m.target;
                const refLabel = refValue?.previousElementSibling;
                const label = document.createElement('div');
                label.className = refLabel?.className || refValue?.className || gridLabelClass;
                label.textContent = labelOf(m);
                const value = document.createElement('div');
                value.className = refValue?.className || refLabel?.className || gridContentClass;
                value.appendChild(contentNode);
                m.target.after(label, value);
                return value;
            }
        };

        const SITE_FAMILIES = Object.freeze({
            'totheglory': 'custom-ttg',
            'hdsky': 'nexusphp',
            'sjtu': 'nexusphp',
            'm-team': 'custom-mteam',
            'hdcity': 'tbsource',
            'monikadesign': 'unit3d',
            'beyond-hd': 'custom-bhd',
            'eiga': 'unit3d',
            'hd-space': 'tbsource',
            'iptorrents': 'custom-ipt',
            'filelist': 'tbsource',
            'hudbt': 'custom-hudbt',
            'greatposterwall': 'custom-gpw',
            'hhclub': 'custom-hhclub',
            'bangumi': 'public-bt',
            'bangumi-moe': 'public-bt',
            'mikanani': 'public-bt',
            'nyaa': 'public-bt',
            'acg-rip': 'public-bt',
            'comicat-kisssub': 'public-bt',
            'generic': 'unknown',
            'generic-nexusphp': 'nexusphp'
        });

        function tableMount(siteId, row, label) {
            if (!row) return null;
            return Mount.tableRowAfter(row, label);
        }

        const AdapterRuntime = {
            withMount(findMount, getInfo) {
                return {
                    findMount,
                    getInfo: mount => getInfo(mount || findMount())
                };
            },
            siteId(adapter = {}) {
                return adapter.id || '';
            },
            family(adapter = {}) {
                const siteId = this.siteId(adapter);
                return adapter.family || SITE_FAMILIES[siteId] || '';
            },
            mountRoot(adapter, mount, contentNode, anchorReason = 'lazy-button') {
                const siteId = this.siteId(adapter);
                return Mount.mountRoot(mount, contentNode, {
                    siteId,
                    family: this.family(adapter),
                    anchorReason
                });
            }
        };

        const AutoFeedAnchors = {
            actionLabels: new Set(['行为', '小货车', '行為', '种子认领', '簡介', '简介', '操作', 'Action', 'Tagline', 'Tools:', '设备']),
            nameLabels: new Set(['Name', 'Nombre', '名称', '标题']),
            cellText(cell) { return String(cell?.textContent || '').replace(/\s+/g, ' ').trim(); },
            rowByFirstCell(root, labels) {
                for (const tr of (root || document).querySelectorAll('tr')) {
                    if (labels.has(this.cellText(tr.cells?.[0]))) return tr;
                }
                return null;
            },
            domesticActionRow() {
                const descr = document.getElementById('kdescr') || document.getElementById('kdescription');
                const tbody = descr?.closest('tbody') || document.querySelector('#outer table tbody, table tbody');
                return this.rowByFirstCell(tbody, this.actionLabels) || descr?.closest('tr') || null;
            },
            rowAfterName(root) { return this.rowByFirstCell(root, this.nameLabels); },
            bhdNameRow() { return this.rowAfterName(document.querySelector('.table-details tbody')); },
            monikaNameRow() {
                const h4 = document.getElementsByTagName('h4')[0];
                const box = h4?.parentNode?.parentNode?.getElementsByClassName?.('table-responsive')?.[1];
                return this.rowAfterName(box?.getElementsByTagName('table')?.[0]) || null;
            },
            gpwTorrentRow() {
                const tid = new URLSearchParams(location.search).get('torrentid');
                if (!tid) return null;
                return document.querySelector(`#torrent${tid}, #torrent_${tid}, #torrent_detail_${tid}`)
                    || document.querySelector(`#torrent_details a[href*="id=${tid}"]`)?.closest('tr');
            },
            hhclubSubtitleValue() {
                let label = null;
                for (const el of document.querySelectorAll('div.font-bold.leading-6')) {
                    if (this.cellText(el) === '副标题') {
                        label = el;
                        break;
                    }
                }
                return label?.nextElementSibling || null;
            },
            fileListAnchor(id, labelText) {
                const descr = document.getElementById('descr');
                const parent = descr?.parentNode || document.querySelector('.cblock-innercontent,.cblock-content,#maincolumn');
                if (!parent) return null;
                const tableId = 'userscript-filelist-actions';
                let table = document.getElementById(tableId);
                if (!table) {
                    const wrap = document.createElement('div');
                    wrap.id = `${tableId}-wrap`;
                    wrap.style.cssText = 'margin:10px 0;';
                    table = document.createElement('table');
                    table.id = tableId;
                    table.style.cssText = 'width:100%;border-collapse:collapse;';
                    table.appendChild(document.createElement('tbody'));
                    wrap.appendChild(table);
                    const hr = document.createElement('hr');
                    hr.className = 'separator';
                    hr.style.marginTop = '15px';
                    hr.style.marginBottom = '15px';
                    wrap.appendChild(hr);
                    const before = descr ? (descr.previousElementSibling || descr) : parent.firstChild;
                    parent.insertBefore(wrap, before || null);
                }
                const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                const rowId = `${id}-filelist-action-row`;
                let row = document.getElementById(rowId);
                if (!row) {
                    row = document.createElement('tr');
                    row.id = rowId;
                    const label = document.createElement('td');
                    label.textContent = labelText || id;
                    label.align = 'right';
                    label.style.cssText = 'width:80px;font-weight:bold;border:0px solid #0D8ED9;vertical-align:top;';
                    const holder = document.createElement('td');
                    holder.id = `${id}-filelist-action-holder`;
                    holder.align = 'left';
                    holder.style.cssText = 'padding-top:10px;padding-bottom:10px;padding-left:12px;border:0px solid #0D8ED9;vertical-align:top;';
                    row.append(label, holder);
                    tbody.appendChild(row);
                }
                return document.getElementById(`${id}-filelist-action-holder`) || row.cells[1];
            },
            actionTableHolder(tableId, id, labelText, anchor, mode = 'after', padding = '55px') {
                if (!anchor?.parentNode) return null;
                const wrapStyle = `display:block;text-align:left;width:auto;margin:0;padding-left:${padding};padding-right:${padding};`;
                let table = document.getElementById(tableId);
                if (!table) {
                    const wrap = document.createElement('div');
                    wrap.id = `${tableId}-wrap`;
                    wrap.style.cssText = wrapStyle;
                    table = document.createElement('table');
                    table.id = tableId;
                    table.style.cssText = 'margin:0;text-align:left;width:auto;';
                    table.appendChild(document.createElement('tbody'));
                    wrap.appendChild(table);
                    if (mode === 'prepend') anchor.prepend(wrap);
                    else if (mode === 'before') anchor.parentNode.insertBefore(wrap, anchor);
                    else anchor.after(wrap);
                } else {
                    const wrap = document.getElementById(`${tableId}-wrap`);
                    if (wrap) wrap.style.cssText = wrapStyle;
                    table.style.cssText = 'margin:0;text-align:left;width:auto;';
                }
                const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                const rowId = `${id}-${tableId}-row`;
                let row = document.getElementById(rowId);
                if (!row) {
                    row = document.createElement('tr');
                    row.id = rowId;
                    const label = row.insertCell(0);
                    label.textContent = labelText || id;
                    label.align = 'left';
                    label.style.fontWeight = 'bold';
                    const holder = row.insertCell(1);
                    holder.id = `${id}-${tableId}-holder`;
                    holder.align = 'left';
                    tbody.appendChild(row);
                }
                return document.getElementById(`${id}-${tableId}-holder`) || row.cells[1];
            },
            unit3dActionHolder(id, labelText, anchor) {
                const tableId = 'userscript-unit3d-actions';
                const ref = firstOf(Array.from(document.querySelectorAll('tr')).reverse(), tr => ['转发种子', '豆瓣信息'].includes(this.cellText(tr.cells?.[0])));
                let table = ref?.closest('table');
                if (!table) {
                    const holder = this.actionTableHolder(tableId, id, labelText, anchor, 'after', '0');
                    const label = holder?.previousElementSibling;
                    if (label) {
                        label.align = 'left';
                        label.style.cssText = 'font-weight: bold;';
                    }
                    return holder;
                }
                if (!table.id) table.id = `${tableId}-table`;
                const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                const rowId = `${id}-${tableId}-row`;
                let row = document.getElementById(rowId);
                if (!row) {
                    row = document.createElement('tr');
                    row.id = rowId;
                    const label = (ref?.cells?.[0] || document.createElement('td')).cloneNode(false);
                    label.textContent = labelText || id;
                    const holder = (ref?.cells?.[1] || document.createElement('td')).cloneNode(false);
                    holder.id = `${id}-${tableId}-holder`;
                    row.append(label, holder);
                    const rows = Array.from(tbody.querySelectorAll(`tr[id$="-${tableId}-row"]`));
                    (rows.at(-1) || ref || tbody.lastElementChild)?.after(row);
                    if (!row.parentNode) tbody.appendChild(row);
                }
                return document.getElementById(`${id}-${tableId}-holder`) || row.cells[1];
            },
            mTeamActionHolder(id, labelText) {
                const subtitleLabel = firstOf(document.querySelectorAll('label'), el => this.cellText(el) === '字幕');
                const anchorRow = subtitleLabel?.parentElement?.parentElement;
                if (!anchorRow?.parentNode) return null;
                const tableId = 'userscript-mteam-actions';
                let table = document.getElementById(tableId);
                if (!table) {
                    const wrap = document.createElement('div');
                    wrap.id = `${tableId}-wrap`;
                    wrap.style.cssText = 'padding-right:55px;';
                    table = document.createElement('table');
                    table.id = tableId;
                    table.appendChild(document.createElement('tbody'));
                    wrap.appendChild(table);
                    anchorRow.before(wrap);
                }
                const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                const rowId = `${id}-${tableId}-row`;
                let row = document.getElementById(rowId);
                if (!row) {
                    row = tbody.insertRow(-1);
                    row.id = rowId;
                    row.className = 'ant-descriptions-row';
                    const label = row.insertCell(0);
                    label.className = 'ant-descriptions-item-label';
                    label.style.cssText = 'width:135px;text-align:right;';
                    label.textContent = labelText || id;
                    const holder = row.insertCell(1);
                    holder.id = `${id}-${tableId}-holder`;
                    holder.className = 'ant-descriptions-item-content';
                    holder.style.cssText = 'text-align:left;';
                }
                return document.getElementById(`${id}-${tableId}-holder`) || row.cells[1];
            },
            hdSpaceMediaInfoRow() {
                const detailLabels = new Set(['豆瓣 (NaN)', '评分', '类型', '国家/地区', '导演', '语言', '上映日期', '片长', '演员', 'Year', 'Runtime', 'Country', 'Genre', 'Rating', 'Votes', 'Tagline', 'Plot', 'Cast']);
                const scopes = ['#douban_info table', '#imdb table', '#douban_info', '#imdb'];
                for (const selector of scopes) {
                    const root = document.querySelector(selector);
                    if (!root) continue;
                    let lastDetail = null;
                    for (const tr of root.querySelectorAll('tr')) {
                        const label = this.cellText(tr.cells?.[0]).replace(/[：:]$/, '');
                        if (detailLabels.has(label)) lastDetail = tr;
                    }
                    if (lastDetail) return root.closest('#mcol tr') || lastDetail;
                }
                return null;
            },
            hdSpaceTorrentRow() {
                for (const tr of document.querySelectorAll('#mcol tr')) {
                    if (this.cellText(tr.cells?.[0]) === 'Torrent') return tr;
                }
                return null;
            },
            hdSpaceInfoHashRow() {
                const rows = Array.from(document.querySelectorAll('#mcol tr'));
                let infoHash = null;
                let torrent = null;
                for (const tr of rows) {
                    const label = this.cellText(tr.cells?.[0]);
                    if (!infoHash && label === 'Info Hash') infoHash = tr;
                    if (!torrent && label === 'Torrent') torrent = tr;
                }
                return infoHash || torrent || this.rowAfterName(document.querySelector('#mcol'));
            },
            iptMovieInfoRow() {
                const rows = Array.from(document.querySelectorAll('tr'));
                let plot = null;
                let genre = null;
                for (const tr of rows) {
                    const label = this.cellText(tr.cells?.[0]);
                    if (!plot && label === 'Plot') plot = tr;
                    if (!genre && label === 'Genre') genre = tr;
                }
                const table = plot?.closest('table');
                let existing = null;
                if (table) {
                    for (const tr of table.querySelectorAll('tr')) {
                        if (['IYUU', 'MoviePilot'].includes(this.cellText(tr.cells?.[0]))) existing = tr;
                    }
                }
                return existing || plot || genre;
            }
        };

        return { DOM, Mount, SITE_FAMILIES, tableMount, AutoFeedAnchors, AdapterRuntime };
    };
    // <pt-common:end>

    const { DOM: PTDOM, Mount, SITE_FAMILIES, tableMount, AutoFeedAnchors, AdapterRuntime } = createPTCommon({
        defaultLabel: 'IYUU',
        productId: 'iyuu',
        gridLabelClass: 'iyuu-grid-label',
        gridContentClass: 'iyuu-grid-content'
    });

    const HTTP = {
        allowed(raw) { try { const u = new URL(raw, location.origin); const h = u.hostname; if (h === '2025.iyuu.cn' || h === 'zmpt.cc' || h === 'api.m-team.cc' || h === location.hostname || /(^|\.)m-team\.(cc|io|vip)$/.test(h) || h === 'bangumi.moe' || h === 'totheglory.im') return true; const mp = MoviePilot.cfg().url; if (mp && h === new URL(mp).hostname.toLowerCase()) return true; return Store.json(KEYS.sites, []).some(s => { const host = SiteIndex.host(s); return host && (h === host || h.endsWith(`.${host}`) || host.endsWith(`.${h}`)); }); } catch (_) { return false; } },
        request({ method = 'GET', url, data, headers = {}, responseType = 'json', allowStatuses = [] }) {
            const full = new URL(url, location.origin).href;
            if (!this.allowed(full)) return Promise.reject(new Error('请求被白名单拦截'));
            const run = async () => {
                if (new URL(full).hostname === '2025.iyuu.cn') { const gap = Date.now() - iyuuLastRequest; if (gap < 800) await wait(800 - gap); iyuuLastRequest = Date.now(); }
                log('HTTP request', { method, url: full, responseType, allowStatuses });
                return new Promise((resolve, reject) => GM_xmlhttpRequest({ method, url: full, data, headers, responseType, timeout: 15000, onload: r => { log('HTTP response', { url: full, status: r.status, response: r.response }); return (r.status >= 200 && r.status < 300) || allowStatuses.includes(r.status) ? resolve(r.response) : reject(new Error(`HTTP ${r.status}`)); }, onerror: reject, ontimeout: () => reject(new Error('请求超时')) }));
            };
            return run();
        }
    };

    const MoviePilot = {
        cfg() { return { url: String(Store.get(KEYS.mpUrl, '') || '').replace(/\/$/, ''), user: Store.get(KEYS.mpUser, ''), pass: Store.get(KEYS.mpPass, ''), auth: Store.get(KEYS.mpAuthMode, 'password'), key: Store.get(KEYS.mpApiKey, '') }; },
        save(modal) { Store.set(KEYS.mpUrl, modal.querySelector('#iyuuMpUrl').value.trim().replace(/\/$/, '')); Store.set(KEYS.mpAuthMode, modal.querySelector('#iyuuMpAuth').value); Store.set(KEYS.mpUser, modal.querySelector('#iyuuMpUser').value.trim()); Store.set(KEYS.mpPass, modal.querySelector('#iyuuMpPass').value); Store.set(KEYS.mpApiKey, modal.querySelector('#iyuuMpApiKey').value.trim()); },
        async headers() { const c = this.cfg(); if (!c.url) throw new Error('请先配置 MoviePilot 地址'); if (c.auth === 'apikey') return { 'X-API-KEY': c.key, Accept: 'application/json' }; const res = await HTTP.request({ method: 'POST', url: `${c.url}/api/v1/login/access-token`, data: `username=${encodeURIComponent(c.user)}&password=${encodeURIComponent(c.pass)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (!res?.access_token) throw new Error('MoviePilot 登录失败'); return { Authorization: `bearer ${res.access_token}`, Accept: 'application/json' }; },
        async sites() { const c = this.cfg(); const headers = await this.headers(); const res = await HTTP.request({ url: `${c.url}/api/v1/site`, headers }); log('MoviePilot sites response', res); const raw = res?.data || res?.items || res?.list || res; return Array.isArray(raw) ? raw : Object.values(raw || {}); }
    };

    const SiteIndex = {
        async get(force, tokenOverride = '') {
            const ts = Number(Store.get(KEYS.sitesTime, 0)); const cached = Store.json(KEYS.sites, []);
            if (!force && cached.length && Date.now() - ts < 7 * 864e5) return cached;
            const token = tokenOverride || Config.token; if (!token) return cached;
            let last = null;
            for (let i = 0; i < 3; i++) {
                const res = await HTTP.request({ url: `${API_BASE}/reseed/sites/index`, headers: { Token: token, Accept: 'application/json' } });
                log('sites index response', res); last = this.parse(res);
                if (last.length) { Store.set(KEYS.sites, JSON.stringify(last)); Store.set(KEYS.sitesTime, Date.now()); return last; }
                await wait(1000 + i * 700);
            }
            if (cached.length) return cached;
            throw new Error('站点索引为空，请稍后重试或检查 Token');
        },
        parse(res) {
            const raw = res?.data?.sites || res?.data?.site_list || res?.data?.siteList || res?.data?.list || res?.data || res?.sites || res?.list || res;
            if (Array.isArray(raw)) return raw;
            if (raw && typeof raw === 'object') return Object.keys(raw).map(id => Object.assign({ id }, raw[id]));
            return [];
        },
        name(s) { return s?.nickname || s?.name_cn || s?.name || s?.site || s?.domain || `站点${s?.id || s?.sid || ''}`; },
        aliases(s) {
            const autoFeed = this.autoFeedMeta(s);
            return [
                ...(Array.isArray(s?.aliases) ? s.aliases : []),
                ...(Array.isArray(s?.alias) ? s.alias : [s?.alias]),
                ...(autoFeed?.aliases || [])
            ].filter(Boolean);
        },
        autoFeedMeta(s) {
            const url = this.autoFeedUrl(s);
            if (!url) return null;
            return firstOf(AUTO_FEED_SITE_DEFS, def => def.url === url);
        },
        searchText(s) {
            const fields = [
                this.name(s), s?.nickname, s?.name_cn, s?.name, s?.site, s?.domain, s?.host, s?.base_url, s?.url,
                this.host(s), this.host({ url: this.autoFeedUrl(s) }), ...this.aliases(s)
            ];
            return fields.map(normalizeSiteKey).filter(Boolean).join(' ');
        },
        searchTitle(s) {
            const parts = [this.name(s), this.host(s), ...this.aliases(s)].filter(Boolean);
            return [...new Set(parts)].join(' / ');
        },
        autoFeedUrl(s) {
            const host = this.host(s);
            if (host) {
                const hit = firstOf(Object.entries(AUTO_FEED_HOST_URLS), ([known]) => host === known || host.endsWith(`.${known}`) || known.endsWith(`.${host}`));
                if (hit) return hit[1];
            }
            const fields = [this.name(s), s?.site, s?.name, s?.nickname, s?.name_cn, s?.domain, s?.host];
            for (const field of fields) {
                const direct = AUTO_FEED_SITE_URLS[String(field || '').toLowerCase()] || AUTO_FEED_SITE_URLS[normalizeSiteKey(field)];
                if (direct) return direct;
            }
            return '';
        },
        icon(s) {
            const candidates = [];
            const seen = new Set();
            const origin = firstOf([s?.base_url, s?.url, s?.domain, s?.host, this.autoFeedUrl(s)], raw => {
                try {
                    const u = /^https?:\/\//i.test(String(raw || '')) ? new URL(raw) : new URL(`https://${raw}`);
                    return u.hostname.includes('.');
                } catch (_) {
                    return false;
                }
            });
            const siteOrigin = origin ? (/^https?:\/\//i.test(String(origin)) ? new URL(origin).origin : new URL(`https://${origin}`).origin) : '';
            const addCandidate = raw => {
                if (!raw) return false;
                try {
                    const text = String(raw);
                    const url = /^https?:\/\//i.test(text) ? new URL(text) : (siteOrigin ? new URL(text, siteOrigin) : null);
                    if (!url || seen.has(url.href)) return false;
                    seen.add(url.href);
                    candidates.push(url.href);
                    return true;
                } catch (_) {
                    return false;
                }
            };
            for (const raw of [s?.icon, s?.logo, s?.favicon]) {
                addCandidate(raw);
                if (candidates.length >= 2) break;
            }
            if (siteOrigin) {
                const u = new URL(siteOrigin);
                addCandidate(`${u.origin}/favicon.ico`);
                if (candidates.length === 1) addCandidate(`${u.origin}/apple-touch-icon.png`);
            }
            return candidates;
        },
        host(s) {
            const raws = [s?.domain, s?.base_url, s?.url, s?.site, s?.host, s?.details_page, s?.download_page];
            for (const raw of raws) {
                if (!raw) continue;
                try {
                    const text = String(raw);
                    const normalized = /^https?:\/\//i.test(text) ? text : `https://${text}`;
                    const host = new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
                    if (host && !host.includes('{')) return host;
                } catch (_) {
                    const host = String(raw).replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0].toLowerCase();
                    if (host && host.includes('.') && !host.includes('{')) return host;
                }
            }
            return '';
        },
        homepage(s) { const raw = s?.base_url || s?.url || s?.domain || s?.site || ''; if (!raw) return ''; try { return (raw.startsWith('http') ? new URL(raw) : new URL(`https://${raw}`)).origin; } catch (_) { const host = this.host(s); return host ? `https://${host}` : ''; } },
        webOrigin(s) { const origin = this.homepage(s); return /(^|\.)m-team\.(cc|io|vip)$/i.test(this.host(s)) ? 'https://kp.m-team.cc' : origin; },
        webUrl(url) { try { const u = new URL(url, location.origin); if (/(^|\.)m-team\.(cc|io|vip)$/i.test(u.hostname.replace(/^api\./, ''))) { u.protocol = 'https:'; u.host = 'kp.m-team.cc'; } return u.href; } catch (_) { return url || ''; } },
        isHomepageUrl(url) { try { const u = new URL(url, location.origin); return (!u.pathname || u.pathname === '/') && !u.search && !u.hash; } catch (_) { return false; } },
        pageUrl(s, pageField, torrentId, rawUrl = '', web = false) { const origin = web ? this.webOrigin(s) : this.homepage(s); const direct = rawUrl || ''; if (!origin) return web ? this.webUrl(direct) : direct; if (!torrentId) return web ? this.webUrl(direct || origin) : (direct || origin); const tpl = pageField || 'details.php?id={}'; const path = String(tpl).replace('{}', String(torrentId)).replace(/\{[^}]*\}/g, ''); const built = path.startsWith('http') ? path : `${origin}/${path.replace(/^\//, '')}`; const out = direct && !this.isHomepageUrl(direct) ? direct : built; return web ? this.webUrl(out) : out; },
        detailUrl(s, torrentId, rawUrl = '') { return this.pageUrl(s, s?.details_page || 'details.php?id={}', torrentId, rawUrl, true); },
        downloadUrl(s, torrentId, rawUrl = '') { const direct = rawUrl || ''; if (direct && !this.isHomepageUrl(direct)) return direct; return torrentId ? this.pageUrl(s, s?.download_page || 'download.php?id={}', torrentId, '') : ''; },
        isMTeam(s) { const text = [s?.host, s?.url, s?.downloadUrl, s?.domain, s?.base_url, s?.site, s?.name, s?.nickname, s?.name_cn].filter(Boolean).join(' '); return /m-team\.(cc|io|vip)|馒头|饅頭|\bM[-_ ]?Team\b|\bMT\b/i.test(text); },
        mTeamApi() { return `${MTEAM_API_BASE}/torrent/genDlToken`; },
        canonicalHost(host) {
            const h = String(host || '').replace(/^www\./, '').toLowerCase();
            return AUTO_FEED_CANONICAL_HOSTS[h] || h;
        },
        sameHost(a, b) {
            const left = this.canonicalHost(a);
            const right = this.canonicalHost(b);
            return Boolean(left && right && (left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)));
        },
        currentSid(list) {
            const current = location.hostname.replace(/^www\./, '').toLowerCase();
            const currentIsMTeam = /(^|\.)m-team\.(cc|io|vip)$/.test(current);
            const match = firstOf(list || [], s => {
                const hosts = [this.host(s), this.host({ url: this.autoFeedUrl(s) })].filter(Boolean);
                const text = [s?.domain, s?.base_url, s?.url, s?.site, s?.host, s?.name, s?.nickname, s?.name_cn].filter(Boolean).join(' ').toLowerCase();
                return hosts.some(host => this.sameHost(current, host)) || (currentIsMTeam && this.isMTeam(s)) || text.includes(current);
            });
            return match ? String(match.id || match.sid || '') : '';
        },
        hasCurrent(list) { return Boolean(this.currentSid(list)); },
        bySid(list) { const m = new Map(); (list || []).forEach(s => m.set(String(s.id || s.sid), s)); return m; },
        matchMoviePilot(mpSites, iyuuSites) { const hosts = new Set((mpSites || []).map(s => this.host(s)).filter(Boolean)); return (iyuuSites || []).filter(s => { const host = this.host(s); return host && [...hosts].some(h => h === host || h.endsWith(`.${host}`) || host.endsWith(`.${h}`)); }).map(s => String(s.id || s.sid)).filter(Boolean); },
        async detectLoggedIn(list, onProgress) {
            const targets = (list || []).filter(s => this.host(s) && (s.id || s.sid)); const hits = []; let done = 0; const concurrency = 3; const gap = 400;
            const probe = async s => { const sid = String(s.id || s.sid); const host = this.host(s); try { const html = await HTTP.request({ url: `https://${host}/`, responseType: 'text', allowStatuses: [301, 302, 403] }); if (!/login|登录|sign\s*in|忘记密码|忘記密碼|验证码|captcha|two[-_ ]?step/i.test(String(html || ''))) hits.push(sid); } catch (_) {} done++; onProgress?.(done, targets.length); await wait(gap); };
            for (let i = 0; i < targets.length; i += concurrency) await Promise.all(targets.slice(i, i + concurrency).map(probe));
            return hits;
        }
    };

    const Crypto = { async sha1Hex(input) { const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input; const buf = await crypto.subtle.digest('SHA-1', bytes); return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); } };

    const ReseedSite = {
        sid(raw = {}, fallback = '') {
            return String(raw.sid || raw.site_id || raw.site || raw.site_id_str || fallback || '');
        },
        torrentId(raw = {}) {
            return raw.torrent_id || raw.tid || raw.id;
        },
        name(raw = {}, meta = {}, sid = '', source = 'iyuu') {
            return raw.site_name || raw.site_alias || raw.name || raw.site || raw.nickname || raw.name_cn
                || SiteIndex.name(meta) || (source === 'iyuu' ? `站点${sid}` : 'IYUU');
        },
        count(raw = {}, source = 'iyuu') {
            return source === 'iyuu' ? 1 : Number(raw.count || raw.num || 1);
        },
        build({ source, raw = {}, index, fallbackSid = '' }) {
            const sid = this.sid(raw, fallbackSid);
            if (!sid) return null;
            const meta = index.get(sid) || {};
            const torrentId = this.torrentId(raw);
            return {
                source,
                sid,
                name: this.name(raw, meta, sid, source),
                host: SiteIndex.host(meta),
                torrentId,
                icon: raw.icon || raw.logo || raw.favicon || SiteIndex.icon(meta),
                count: this.count(raw, source),
                url: SiteIndex.detailUrl(meta, torrentId, raw.url || raw.page_url || raw.link || raw.zmpt_data?.url || ''),
                downloadUrl: SiteIndex.downloadUrl(meta, torrentId, raw.download_url || raw.downloadUrl || raw.down_url || raw.zmpt_data?.download_url || '')
            };
        },
        mergeBySid(target, next) {
            target.count = Number(target.count || 0) + Number(next.count || 1);
            if (!target.url) target.url = next.url;
            if (!target.downloadUrl) target.downloadUrl = next.downloadUrl;
            if (!target.torrentId) target.torrentId = next.torrentId;
            if (!target.icon && next.icon) target.icon = next.icon;
        }
    };

    const InfoHash = {
        async extract(info) {
            const magnetHash = this.fromMagnet(info.downloadLink);
            if (magnetHash) { log('hash from magnet', magnetHash); return magnetHash; }
            const specialHash = await this.fromSpecial(info);
            if (specialHash) { log('hash from special site/torrent', specialHash); return specialHash; }
            const torrentUrl = info.downloadLink || this.findTorrentUrl();
            log('torrent url candidate', torrentUrl);
            const torrentHash = await this.fromTorrent(torrentUrl).catch(e => { log('torrent hash failed', e.message); return ''; });
            if (torrentHash) { log('hash from torrent', torrentHash); return torrentHash; }
            const pageHash = this.fromPage();
            log('hash from page fallback', pageHash);
            return pageHash;
        },
        fromMagnet(v) { const m = String(v || '').match(/xt=urn:btih:([a-z2-7]{32}|[a-f0-9]{40})/i); if (!m) return ''; return m[1].length === 40 ? m[1].toLowerCase() : this.base32ToHex(m[1]); },
        fromPage() { const text = `${location.href}\n${document.body?.innerText || ''}`; const all = text.match(/\b[a-fA-F0-9]{40}\b/g) || []; return firstOf(all, this.valid) || ''; },
        valid(h) { return /^[a-f0-9]{40}$/i.test(h) && !/^(.)\1{39}$/.test(h) && !/^\d{40}$/.test(h); },
        base32ToHex(s) { const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; String(s).toUpperCase().replace(/=+$/, '').split('').forEach(c => { const v = alpha.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, '0'); }); let out = ''; for (let i = 0; i + 4 < bits.length; i += 4) out += parseInt(bits.slice(i, i + 4), 2).toString(16); return out.slice(0, 40).toLowerCase(); },
        async fromSpecial(info) { if (info._bangumiId) { const r = await HTTP.request({ url: `https://bangumi.moe/api/v2/torrent/${info._bangumiId}` }); if (r?.magnet) { info.downloadLink = r.magnet; return this.fromMagnet(r.magnet); } } if (/m-team\.(cc|io|vip)/.test(location.hostname)) { const link = await this.mteamLink(); if (link) { info.downloadLink = link; return await this.fromTorrent(link); } } return ''; },
        async mteamLink() { const id = location.pathname.match(/\/detail\/(\d+)/)?.[1]; if (!id || !Config.mteamKey) return ''; const res = await HTTP.request({ method: 'POST', url: `${MTEAM_API_BASE}/torrent/genDlToken`, data: `id=${encodeURIComponent(id)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-key': Config.mteamKey }, responseType: 'json' }); return res?.data || ''; },
        async fromTorrent(url) { if (!url || url.startsWith('magnet:')) return ''; const buf = await HTTP.request({ url, responseType: 'arraybuffer' }); const bytes = new Uint8Array(buf); const head = new TextDecoder('utf-8').decode(bytes.slice(0, 160)); if (/^\s*\{/.test(head)) { try { const json = JSON.parse(new TextDecoder().decode(bytes)); throw new Error(json?.message || json?.msg || '下载链接未返回种子文件'); } catch (e) { if (e?.message) throw e; throw new Error('下载链接未返回种子文件'); } } const range = this.infoRange(bytes); return range ? await Crypto.sha1Hex(bytes.slice(range[0], range[1])) : ''; },
        findTorrentUrl() {
            const selectors = [
                'a[href*="download.php"]',
                'a[href*="download"]',
                'a[href$=".torrent"]',
                'a[href*="/dl/"]',
                'a[href*="download?id="]'
            ];
            for (const sel of selectors) {
                const link = firstOf(document.querySelectorAll(sel), a => !String(a.href || '').startsWith('magnet:'));
                if (link?.href) return link.href;
            }
            const byText = firstOf(document.querySelectorAll('a[href]'), a => /下载|torrent|种子|download/i.test(a.textContent || ''));
            return byText?.href || '';
        },
        infoRange(bytes) { const dec = new TextDecoder('latin1'); const str = dec.decode(bytes); const key = str.indexOf('4:info'); if (key < 0) return null; const start = key + 6; let i = start; const walk = () => { const begin = i; const c = str[i]; if (c === 'i') { i = str.indexOf('e', i) + 1; return [begin, i]; } if (c === 'l' || c === 'd') { i++; while (str[i] !== 'e' && i < str.length) walk(); i++; return [begin, i]; } if (/\d/.test(c)) { const colon = str.indexOf(':', i); const len = Number(str.slice(i, colon)); i = colon + 1 + len; return [begin, i]; } throw new Error('bad bencode'); }; try { return walk(); } catch (_) { return null; } }
    };

    const IYUU = {
        async sidSha1(retries = 3) {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const sitesIndex = await SiteIndex.get(false);
                    const currentSid = SiteIndex.currentSid(sitesIndex);
                    const sortedSites = Array.from(new Set([...Config.owned, currentSid].map(Number).filter(Boolean))).sort((a, b) => a - b);
                    log(`sid list for reportExisting (attempt ${attempt}/${retries})`, { currentSid, owned: Config.owned, sortedSites });
                    const key = sortedSites.join(',');
                    const oldKey = Store.get(KEYS.sidKey, '');
                    const old = Store.get(KEYS.sid, '');
                    const ts = Number(Store.get(KEYS.sidTime, 0));
                    if (old && key === oldKey && Date.now() - ts < 7 * 864e5) {
                        log('reuse cached sid_sha1', { key });
                        return old;
                    }
                    if (!sortedSites.length) throw new Error('请先在菜单配置已拥有站点，或刷新站点索引以识别当前站');
                    const res = await HTTP.request({ method: 'POST', url: `${API_BASE}/reseed/sites/reportExisting`, headers: { Token: Config.token, 'Content-Type': 'application/json' }, data: JSON.stringify({ sid_list: sortedSites }) });
                    log(`reportExisting response (attempt ${attempt})`, res);
                    if (res?.code === 400 && String(res?.msg || '').includes('Server internal error') && attempt < retries) {
                        log(`reportExisting Server internal error, waiting ${attempt * 1000}ms before retry...`);
                        await new Promise(r => setTimeout(r, attempt * 1000));
                        continue;
                    }
                    const val = res?.data?.sid_sha1 || '';
                    if (!val) throw new Error(res?.msg || '获取 sid_sha1 失败');
                    Store.set(KEYS.sid, val);
                    Store.set(KEYS.sidKey, key);
                    Store.set(KEYS.sidTime, Date.now());
                    return val;
                } catch (e) {
                    if (attempt < retries) {
                        log(`reportExisting error, waiting ${attempt * 1000}ms before retry...`, e);
                        await new Promise(r => setTimeout(r, attempt * 1000));
                        continue;
                    }
                    throw e;
                }
            }
        },
        async query(hash, retried = false) {
            if (!Config.token) return { ok: false, source: 'iyuu', error: '未配置 IYUU Token', sites: [] };
            let sid_sha1 = '';
            try {
                sid_sha1 = await this.sidSha1();
            } catch (e) {
                const msg = String(e?.message || '');
                if (!retried && /Server internal error|sid_sha1|获取 sid_sha1 失败|站点缓存/i.test(msg)) {
                    Store.del(KEYS.sid);
                    Store.del(KEYS.sidTime);
                    Store.del(KEYS.sidKey);
                    log('sid cache reset before retry', { reason: msg });
                    return this.query(hash, true);
                }
                throw e;
            }
            const hashes = Array.from(new Set([hash.toLowerCase()])).sort();
            const sha1 = await Crypto.sha1Hex(JSON.stringify(hashes));
            const params = new URLSearchParams({ hash: JSON.stringify(hashes), sha1, sid_sha1, timestamp: String(Math.floor(Date.now() / 1000)), version: '8.2.0' });
            log('IYUU query params', { hashes, sha1, sid_sha1: `${String(sid_sha1).slice(0, 8)}...` });
            const raw = await HTTP.request({ method: 'POST', url: `${API_BASE}/reseed/index/index`, headers: { Token: Config.token, 'Content-Type': 'application/x-www-form-urlencoded' }, data: params.toString(), allowStatuses: [400, 404] });
            log('IYUU query response', raw);
            if (raw?.msg === '未查询到可辅种数据') return { ok: true, source: 'iyuu', sites: [] };
            const retriableServerError = raw?.code === 400 && /站点缓存哈希值无效|Server internal error/i.test(String(raw?.msg || ''));
            if (retriableServerError && !retried) {
                Store.del(KEYS.sid);
                Store.del(KEYS.sidTime);
                Store.del(KEYS.sidKey);
                log('sid cache reset and retry query', { reason: raw?.msg || '' });
                return this.query(hash, true);
            }
            if (raw && raw.code !== undefined && raw.code !== 0) throw new Error(raw.msg || 'IYUU 查询失败');
            return await this.normalize(raw);
        },
        rawTorrents(raw) {
            const dataObj = raw?.data || {};
            const groups = Array.isArray(dataObj) ? dataObj : Object.values(dataObj);
            return groups.flatMap(group => {
                if (Array.isArray(group?.torrent)) return group.torrent;
                return Array.isArray(group) ? group : [];
            });
        },
        async normalize(raw) {
            const index = SiteIndex.bySid(await SiteIndex.get(false));
            const sites = new Map();
            this.rawTorrents(raw).forEach(rawItem => {
                const next = ReseedSite.build({ source: 'iyuu', raw: rawItem, index });
                if (!next) return;
                const old = sites.get(next.sid);
                if (!old) {
                    sites.set(next.sid, next);
                    return;
                }
                ReseedSite.mergeBySid(old, next);
            });
            return { ok: true, source: 'iyuu', sites: [...sites.values()] };
        }
    };

    const Fallback = {
        items(raw) {
            const data = raw?.data ?? raw?.result ?? raw;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            if (Array.isArray(data?.list)) return data.list;
            if (Array.isArray(data?.sites)) return data.sites;
            if (Array.isArray(raw?.list)) return raw.list;
            return Object.values(data || {}).flatMap(v => Array.isArray(v) ? v : (Array.isArray(v?.torrent) ? v.torrent : []));
        },
        async query(hash) {
            if (!Config.zmpt) return { ok: false, source: 'fallback', sites: [] };
            const raw = await HTTP.request({ url: `${ZMPT_API}?hash=${encodeURIComponent(hash)}` });
            log('IYUU fallback query response', raw);
            const data = this.items(raw);
            log('IYUU fallback parsed items', data);
            const index = SiteIndex.bySid(await SiteIndex.get(false));
            return { ok: true, source: 'fallback', sites: data.map((item, idx) => ReseedSite.build({ source: 'fallback', raw: item, index, fallbackSid: `fallback-${idx}` })).filter(Boolean) };
        }
    };

    const ResultCache = {
        _data: null, version: 'site-dedupe-v2', okTtl: 6 * 3600e3, emptyTtl: 3600e3, max: 500,
        _load() { if (this._data) return this._data; try { const raw = Store.get(KEYS.result, '{}'); this._data = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch (_) { this._data = {}; } return this._data; },
        _persist() { try { Store.set(KEYS.result, JSON.stringify(this._data || {})); } catch (e) { log('result cache write failed', e.message); } },
        sidKey() { return Config.owned.map(Number).filter(Boolean).sort((a, b) => a - b).join(','); },
        key(hash) { return `hash:${hash}|${this.sidKey()}`; },
        normalizeUrl(url) { try { const u = new URL(url || location.href, location.origin); u.hash = ''; return u.href; } catch (_) { return String(url || ''); } },
        pageKey(input = '') { return `page:${this.normalizeUrl(typeof input === 'string' ? input : '')}|${this.sidKey()}`; },
        siteKeys(payload) { return (payload?.sites || []).map(s => s.url).filter(Boolean).map(url => this.pageKey(url)); },
        getKey(key) { const data = this._load(); const item = data[key]; if (!item || item.version !== this.version) return null; const ttl = item.empty ? this.emptyTtl : this.okTtl; if (Date.now() - (item.ts || 0) > ttl) { delete data[key]; this._persist(); return null; } return item.payload || null; },
        get(hash) { return this.getKey(this.key(hash)); },
        getPage(url = '') { return this.getKey(this.pageKey(url)); },
        set(hash, payload) { if (!hash || !payload) return; const data = this._load(); const item = { payload, ts: Date.now(), version: this.version, empty: !(payload.sites || []).length }; data[this.key(hash)] = item; data[this.pageKey()] = item; this.siteKeys(payload).forEach(k => { data[k] = item; }); this._prune(); this._persist(); },
        _prune() { const data = this._data || {}; const now = Date.now(); Object.keys(data).forEach(k => { const item = data[k] || {}; const ttl = item.empty ? this.emptyTtl : this.okTtl; if (now - (item.ts || 0) > ttl) delete data[k]; }); const keys = Object.keys(data); if (keys.length > this.max) keys.map(k => ({ k, ts: data[k]?.ts || 0 })).sort((a, b) => a.ts - b.ts).slice(0, keys.length - this.max).forEach(({ k }) => delete data[k]); },
        clear() { this._data = {}; Store.del(KEYS.result); UI.toast('辅种查询缓存已清空'); },
        size() { return Object.keys(this._load()).length; }
    };

    const Helpers = {
        text(sel, root = document) { return root.querySelector(sel)?.textContent?.trim() || ''; },
        abs(raw) { try { return raw ? new URL(raw, location.origin).href : ''; } catch (_) { return ''; } },
        size(t) { const m = String(t || '').replace(/iB/gi, 'B').toUpperCase().match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)/); if (!m) return 0; return Number(m[1]) * ({ TB: 1024 ** 4, GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024 }[m[2]] || 1); },
        findDownload(selectors) { for (const sel of selectors) { const el = document.querySelector(sel); if (el?.href || el?.value) return el.href || el.value; } return ''; },
        titleFromDownload(link) { return String(link?.textContent || link?.href?.split('/').pop() || '').replace(/\.torrent$/i, '').trim(); },
        info({ id, name, description = '', downloadLink = '', sizeText = '', size = 0, mount, extra = {} }) { return name && mount?.target ? { id, name: String(name).trim(), description, downloadLink, size: Number(size) || this.size(sizeText), mount, extra } : null; }
    };

    const isCurrentHostInCachedIndex = () => {
        const indexedSites = Store.json(KEYS.sites, []);
        if (!indexedSites.length) return true;
        const matched = SiteIndex.hasCurrent(indexedSites);
        if (!matched) log('当前站点不在 IYUU 站点索引缓存中，跳过 IYUU 入口', location.hostname);
        return matched;
    };
    const isMTeamHost = () => /(^|\.)m-team\.(cc|io|vip)$/.test(location.hostname);
    const isMTeamDetail = () => isMTeamHost() && location.pathname.startsWith('/detail/');

    const ADAPTERS = [
        {
            id: 'totheglory',
            matches: () => location.hostname === 'totheglory.im' && location.pathname.startsWith('/t/'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[0];
                    const row = rows[1]?.parentElement || nameRow?.parentElement;
                    return row ? tableMount('totheglory', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[0];
                    const nameLink = nameRow?.nextElementSibling?.querySelector('a');
                    const sizeRow = firstOf(rows, r => /尺寸|大小/.test(r.textContent));
                    return Helpers.info({ id: 'totheglory', name: nameLink?.textContent?.replace(/^\[TTG\]\s*|\s*\.torrent$/g, '') || document.title, description: Helpers.text('h1'), downloadLink: nameLink?.href || '', sizeText: sizeRow?.nextElementSibling?.innerText || '', mount });
                }
            )
        },
        {
            id: 'hdsky',
            matches: () => location.hostname === 'hdsky.me' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const rows = [...document.querySelectorAll('.rowhead')];
                    const row = rows[1]?.parentElement || rows[0]?.parentElement;
                    return row ? tableMount('hdsky', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const rows = [...document.querySelectorAll('.rowhead')];
                    const nameRow = rows[0], dlRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                    return Helpers.info({ id: 'hdsky', name: nameRow?.parentElement?.querySelector('.rowfollow input[type="submit"]')?.value?.replace(/^\[HDSky\]\s*|\s*\.torrent$/g, '') || '', description: descRow?.parentElement?.querySelector('.rowfollow')?.textContent || '', downloadLink: dlRow?.parentElement?.querySelector('.rowfollow a')?.href || '', sizeText: sizeRow?.parentElement?.querySelector('.rowfollow')?.textContent || '', mount });
                }
            )
        },
        {
            id: 'sjtu',
            matches: () => location.hostname === 'pt.sjtu.edu.cn' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const row = rows[1]?.parentElement;
                    return row ? tableMount('sjtu', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                    const nameLink = nameRow?.nextElementSibling?.querySelector('a');
                    return Helpers.info({ id: 'sjtu', name: nameLink?.textContent?.replace(/^\[PT\]\.\s*|\s*\.torrent$/g, '') || '', description: descRow?.nextElementSibling?.textContent || '', downloadLink: nameLink?.href || '', sizeText: sizeRow?.nextElementSibling?.textContent || '', mount });
                }
            )
        },
        {
            id: 'bangumi',
            matches: () => location.hostname === 'bangumi.moe',
            ...AdapterRuntime.withMount(
                () => {
                    const modal = document.querySelector('.torrent-details-content');
                    const root = modal || document;
                    const isDetail = /^\/torrent\/[a-f0-9]+$/i.test(location.pathname) || modal;
                    if (!isDetail) return null;
                    return Mount.afterNode(root.querySelector('.torrent-info,.torrent-title') || document.body);
                },
                mount => {
                    const modal = document.querySelector('.torrent-details-content');
                    const root = modal || document;
                    const title = root.querySelector('a.title-link b, a[href*="/torrent/"]')?.textContent?.trim() || document.title.split(/[-|_]/)[0].trim();
                    const link = root.querySelector('a[href^="magnet:"]')?.href || '';
                    const bangumiId = root.querySelector('a[href*="/torrent/"]')?.href?.match(/\/torrent\/([a-f0-9]+)/i)?.[1] || location.pathname.match(/\/torrent\/([a-f0-9]+)/i)?.[1];
                    const info = Helpers.info({ id: 'bangumi', name: title, description: title, downloadLink: link, sizeText: root.textContent, mount, extra: { bangumiId } });
                    if (info) info._bangumiId = bangumiId;
                    return info;
                }
            )
        },
        {
            id: 'mikanani',
            matches: () => location.hostname === 'mikanani.me' && location.pathname.includes('/Home/Episode/'),
            ...AdapterRuntime.withMount(
                () => Mount.afterNode(document.querySelector('.episode-title, h1, h2, .an-text') || document.body),
                mount => {
                    const raw = Helpers.text('.episode-title, h1, h2, .an-text') || document.title;
                    const name = raw.replace(/\s*\[\d+(?:\.\d+)?\s*(?:GB|MB|GiB|MiB)\]\s*$/i, '').trim();
                    return Helpers.info({ id: 'mikanani', name, description: Helpers.text('.episode-desc,.bangumi-desc,.content,.panel-body') || name, downloadLink: Helpers.findDownload(['a[href^="magnet:"]', 'a[href*="/Download/"]', 'a[href*="/download/"]', 'a[href*=".torrent"]']), sizeText: document.body.innerText, mount });
                }
            )
        },
        {
            id: 'm-team',
            matches: () => /m-team\.(cc|io|vip)\/detail\//.test(location.href),
            findMount: () => {
                const holder = AutoFeedAnchors.mTeamActionHolder('iyuu', 'IYUU');
                return holder ? Mount.append(holder) : null;
            },
            getInfo: async () => {
                const tid = location.pathname.match(/\/detail\/(\d+)/)?.[1] || '';
                const name = tid ? `M-Team ${tid}` : 'M-Team';
                return { id: 'm-team', name, description: name, downloadLink: '', size: 0, extra: { mteamTid: tid } };
            }
        },
        {
            id: 'hdcity',
            matches: () => location.hostname === 'hdcity.city' && /^\/t-/.test(location.pathname),
            ...AdapterRuntime.withMount(
                () => {
                    const blocks = [...document.querySelectorAll('.blocktitle')];
                    const info = firstOf(blocks, b => b.textContent.includes('基本信息'));
                    const op = firstOf(blocks, b => b.textContent.includes('种子操作'));
                    return Mount.blockAfter(document.querySelector('div.block') || op?.parentElement || info?.parentElement || document.body);
                },
                mount => {
                    const blocks = [...document.querySelectorAll('.blocktitle')];
                    const info = firstOf(blocks, b => b.textContent.includes('基本信息'));
                    const op = firstOf(blocks, b => b.textContent.includes('种子操作'));
                    return Helpers.info({ id: 'hdcity', name: Helpers.text('.blocktitle') || document.title, description: op?.parentElement?.querySelector('.blockcontent')?.textContent || '', downloadLink: document.querySelector('input[title="DirectLink"]')?.value || document.querySelector('a[href*="download?id="]')?.href || '', sizeText: info?.nextElementSibling?.textContent || '', mount });
                }
            )
        },
        {
            id: 'monikadesign',
            matches: () => location.hostname === 'monikadesign.uk' && /^\/torrents\/\d+\/?$/.test(location.pathname),
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.monikaNameRow();
                    return row ? tableMount('monikadesign', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const title = document.querySelector('h1.text-center');
                    const sub = document.querySelector('h2.text-center');
                    const dl = document.querySelector('a.down[href*="/download/"]');
                    return Helpers.info({ id: 'monikadesign', name: title?.textContent || document.title, description: sub?.textContent || '', downloadLink: dl?.href || '', sizeText: document.querySelector('.torrent-size td:nth-child(2)')?.textContent || '', mount });
                }
            )
        },
        {
            id: 'beyond-hd',
            matches: () => location.hostname === 'beyond-hd.me' && location.pathname.startsWith('/torrents/'),
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.bhd-fl-button[href*="/download/"]');
                    const row = AutoFeedAnchors.bhdNameRow();
                    const target = row || document.querySelector('table.table-details') || dl?.closest('.text-center') || dl?.parentElement || document.querySelector('.panel-title')?.closest('.panel') || document.querySelector('h1') || document.body;
                    return row ? tableMount('beyond-hd', row, 'IYUU') : Mount.afterNode(target);
                },
                mount => {
                    const dl = document.querySelector('a.bhd-fl-button[href*="/download/"]');
                    return Helpers.info({ id: 'beyond-hd', name: document.title.replace(/\s*\|\s*Torrents\s*\|\s*BeyondHD.*/i, '').trim(), description: Helpers.text('.panel-body'), downloadLink: dl?.href || '', sizeText: Helpers.text('.panel-body'), mount });
                }
            )
        },
        {
            id: 'eiga',
            matches: () => location.hostname === 'eiga.moi' && location.pathname.startsWith('/torrents/'),
            ...AdapterRuntime.withMount(
                () => {
                    const holder = AutoFeedAnchors.unit3dActionHolder('iyuu', 'IYUU', document.querySelector('menu.torrent__buttons') || document.querySelector('article'));
                    return holder ? Mount.append(holder) : Mount.afterNode(document.querySelector('menu.torrent__buttons') || document.querySelector('article') || document.body);
                },
                mount => {
                    const dl = document.querySelector('a[href*="/torrents/download/"]');
                    return Helpers.info({ id: 'eiga', name: Helpers.text('h1.meta__title') || document.title.replace(/\s+-\s+Torrents.*/i, '').trim(), description: Helpers.text('.meta__description,.bbcode-rendered'), downloadLink: dl?.href || '', sizeText: document.body.innerText, mount });
                }
            )
        },
        {
            id: 'hd-space',
            matches: () => location.hostname === 'hd-space.org' && location.search.includes('page=torrent-details'),
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.hdSpaceTorrentRow() || AutoFeedAnchors.hdSpaceInfoHashRow();
                    return row ? tableMount('hd-space', row, 'IYUU') : Mount.afterNode(document.querySelector('#mcol') || document.body);
                },
                mount => {
                    const dl = document.querySelector('a[href*="download.php"]');
                    const nameRow = AutoFeedAnchors.rowAfterName(document.querySelector('#mcol'));
                    return Helpers.info({ id: 'hd-space', name: nameRow?.cells?.[1]?.textContent?.trim() || document.title, description: document.body.innerText, downloadLink: dl?.href || '', sizeText: document.body.innerText, mount });
                }
            )
        },
        {
            id: 'iptorrents',
            matches: () => location.hostname === 'iptorrents.com' && location.pathname === '/torrent.php',
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.iptMovieInfoRow();
                    return row ? tableMount('iptorrents', row, 'IYUU') : Mount.afterNode(document.querySelector('h2') || document.body);
                },
                mount => {
                    const id = new URLSearchParams(location.search).get('id') || '';
                    const dl = firstOf(document.querySelectorAll('a[href*="download.php"]'), a => a.href.includes(`/${id}/`) || a.href.includes(`id=${id}`)) || document.querySelector('a[href*="download.php"][href$=".torrent"]');
                    const row = AutoFeedAnchors.iptMovieInfoRow();
                    const target = row || dl?.closest('.info,.dBox') || dl?.parentElement || dl || document.querySelector('h2') || document.body;
                    return Helpers.info({ id: 'iptorrents', name: Helpers.text('h2') || document.title.replace(/\s*-\s*IPTorrents.*/i, '').trim(), downloadLink: dl?.href || '', sizeText: target?.textContent || '', mount });
                }
            )
        },
        {
            id: 'filelist',
            matches: () => location.hostname === 'filelist.io' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const row = dl?.closest('tr');
                    const target = AutoFeedAnchors.fileListAnchor('iyuu', 'IYUU') || row || dl?.closest('.cblock-innercontent') || dl?.parentElement || dl || document.querySelector('.cblock-content,.cblock,#maincolumn,#container,table') || document.body;
                    return Mount.append(target);
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    return Helpers.info({ id: 'filelist', name: Helpers.titleFromDownload(dl) || document.title.split(' :: ')[0].trim(), description: document.title.split(' :: ')[0].trim(), downloadLink: dl?.href || '', sizeText: mount?.target?.textContent || '', mount });
                }
            )
        },
        {
            id: 'hudbt',
            matches: () => location.hostname === 'hudbt.hust.edu.cn' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const table = document.querySelector('#outer dl.table');
                    const dts = [...document.querySelectorAll('#outer dl.table > dt')];
                    const byLabel = label => firstOf(dts, dt => dt.textContent.includes(label))?.nextElementSibling;
                    const target = byLabel('下载') || dl?.parentElement || table;
                    return target ? Mount.definitionAfter(target) : Mount.prepend();
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const dts = [...document.querySelectorAll('#outer dl.table > dt')];
                    const byLabel = label => firstOf(dts, dt => dt.textContent.includes(label))?.nextElementSibling;
                    const title = Helpers.text('#page-title') || Helpers.titleFromDownload(dl) || document.title.match(/"([^"]+)"/)?.[1] || document.title;
                    const sub = byLabel('副标题')?.textContent || '';
                    const info = byLabel('基本信息')?.textContent || '';
                    const intro = byLabel('简介')?.textContent || '';
                    return Helpers.info({ id: 'hudbt', name: title, description: sub || intro || title, downloadLink: dl?.href || '', sizeText: info || document.body.innerText, mount });
                }
            )
        },
        {
            id: 'greatposterwall',
            matches: () => location.hostname === 'greatposterwall.com' && location.pathname === '/torrents.php' && new URLSearchParams(location.search).get('torrentid'),
            ...AdapterRuntime.withMount(
                () => {
                    const tid = new URLSearchParams(location.search).get('torrentid');
                    const dl = document.querySelector(`a[href*="action=download"][href*="id=${tid}"]`);
                    const row = AutoFeedAnchors.gpwTorrentRow() || dl?.closest('tr');
                    return row ? Mount.tableColspanAfter(row, 'IYUU') : Mount.afterNode(document.querySelector(`#torrent${tid}`) || document.body);
                },
                mount => {
                    const tid = new URLSearchParams(location.search).get('torrentid');
                    const dl = document.querySelector(`a[href*="action=download"][href*="id=${tid}"]`);
                    const row = AutoFeedAnchors.gpwTorrentRow() || dl?.closest('tr');
                    return Helpers.info({ id: 'greatposterwall', name: document.title.replace(/\s*::\s*Great Poster Wall.*/i, '').trim(), description: document.title, downloadLink: dl?.href || '', sizeText: row?.textContent || '', mount });
                }
            )
        },
        {
            id: 'hhclub',
            matches: () => location.hostname === 'hhanclub.net' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const row = dl?.closest('tr');
                    const grid = dl?.closest('.grid');
                    const gridCell = AutoFeedAnchors.hhclubSubtitleValue() || (grid ? firstOf(grid.children, el => el.contains(dl)) : null);
                    const target = row || gridCell || dl?.parentElement || dl || document.body;
                    return row ? tableMount('hhclub', row, 'IYUU') : (gridCell ? Mount.gridPairAfter(gridCell) : Mount.afterNode(target));
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    return Helpers.info({ id: 'hhclub', name: Helpers.titleFromDownload(dl) || document.title.match(/"([^"]+)"/)?.[1] || document.title, description: document.title, downloadLink: dl?.href || '', sizeText: mount?.target?.textContent || '', mount });
                }
            )
        },
        {
            id: 'nyaa',
            matches: () => location.hostname === 'nyaa.si',
            ...AdapterRuntime.withMount(
                () => /^\/view\/\d+$/.test(location.pathname) ? Mount.afterNode(document.querySelector('.panel-heading') || document.body) : null,
                mount => Helpers.info({ id: 'nyaa', name: Helpers.text('h3.panel-title') || document.title.replace(/::.*$/, '').trim(), description: Helpers.text('#torrent-description') || document.title, downloadLink: document.querySelector('a[href^="magnet:"],a[href*="/download/"]')?.href || '', sizeText: document.body.innerText, mount })
            )
        },
        {
            id: 'acg-rip',
            matches: () => location.hostname === 'acg.rip',
            ...AdapterRuntime.withMount(
                () => /^\/t\/\d+$/.test(location.pathname) ? Mount.afterNode(document.querySelector('.panel-heading') || document.body) : null,
                mount => Helpers.info({ id: 'acg-rip', name: Helpers.text('.panel-heading') || document.title.replace(/-\s*ACG\.RIP.*/i, '').trim(), description: Helpers.text('.panel-body.post-content') || document.title, downloadLink: document.querySelector('a[href^="magnet:"],a[href*=".torrent"]')?.href || '', sizeText: document.body.innerText, mount })
            )
        },
        {
            id: 'comicat-kisssub',
            matches: () => /(^|\.)(comicat|kisssub)\.org$/i.test(location.hostname),
            ...AdapterRuntime.withMount(
                () => /\/show-[a-f0-9]{40}\.html$/i.test(location.pathname) ? Mount.afterNode(document.querySelector('.intro,.basic_info') || document.body) : null,
                mount => {
                    const hash = location.pathname.match(/show-([a-f0-9]{40})\.html/i)?.[1] || '';
                    const title = document.title.replace(/\s*-\s*.*/, '').trim();
                    return Helpers.info({ id: 'comicat-kisssub', name: title, description: Helpers.text('.intro,.entry-content,.content,.description,.panel-body,article') || title, downloadLink: document.querySelector('a[href^="magnet:"]')?.href || (hash ? `magnet:?xt=urn:btih:${hash}` : ''), sizeText: document.body.innerText, mount });
                }
            )
        },
        {
            id: 'generic',
            matches: () => true,
            ...AdapterRuntime.withMount(
                () => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[0];
                    const row = AutoFeedAnchors.domesticActionRow() || nameRow?.parentElement;
                    return row ? tableMount('generic', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[0];
                    const nameLink = nameRow?.nextElementSibling?.querySelector('a') || document.querySelector('a[href^="magnet:"],a[href*="download"],a[href*=".torrent"]');
                    return Helpers.info({ id: 'generic', name: nameLink?.textContent?.replace(/\.torrent$/i, '').trim() || document.title, downloadLink: nameLink?.href || '', sizeText: document.body.innerText, mount });
                }
            )
        }
    ];

    const Core = {
        adapter: null,
        async init() {
            this.adapter = firstOf(ADAPTERS, a => a.matches());
            if (this.adapter?.findMount) return this.injectLazy(this.adapter);
            const info = await this.adapter?.getInfo();
            if (info?.name) return this.inject(info);
            return false;
        },
        setQueryButton(btn, status, title = '') {
            btn.textContent = UI.actionText('查询', status);
            if (title) btn.title = title;
        },
        injectLazy(adapter) {
            const mount = adapter?.findMount?.();
            if (!mount?.target) return false;
            const siteId = AdapterRuntime.siteId(adapter);
            const existing = PTDOM.qs(PTDOM.productRootSelector(siteId)) || PTDOM.qs(PTDOM.productRootSelector(''));
            const box = existing || document.createElement('div');
            box.className = box.className || 'iyuu-row-box pt-helper-root pt-helper-root-iyuu';
            if (!box.classList.contains('pt-helper-root')) box.classList.add('pt-helper-root', 'pt-helper-root-iyuu');
            AdapterRuntime.mountRoot(adapter, mount, box, 'lazy-button');
            let btn = box.querySelector('.iyuu-check-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'iyuu-btn iyuu-check-btn';
                box.replaceChildren(btn);
            }
            if (!box.querySelector('.iyuu-multi-toggle')) {
                const multi = document.createElement('label');
                multi.className = 'iyuu-chip iyuu-site-choice';
                const multiInput = document.createElement('input');
                multiInput.type = 'checkbox';
                multiInput.className = 'iyuu-multi-toggle';
                multi.append(multiInput, document.createTextNode('多选'));
                multiInput.onchange = e => {
                    e.stopPropagation();
                    box.querySelectorAll('.iyuu-result').forEach(n => n.remove());
                    if (box._iyuuResult && box._iyuuLastInfo) this.render(box, btn, box._iyuuResult, box._iyuuLastInfo, box._iyuuCached);
                };
                box.appendChild(multi);
            }
            this.setQueryButton(btn, '未查询', '配置请从 Tampermonkey 菜单打开「配置 IYUU」');
            btn.onclick = async e => {
                e.preventDefault();
                e.stopPropagation();
                if (adapter.id === 'm-team' && !Config.mteamKey) {
                    this.setQueryButton(btn, '需配置 M-Team API Key', '请在 IYUU 配置中填写 M-Team API Key');
                    UI.toast('请先配置 M-Team API Key');
                    UI.showConfig();
                    return;
                }
                try {
                    const info = await adapter.getInfo(mount);
                    if (!info?.name) {
                        this.setQueryButton(btn, '失败', '未能获取种子信息');
                        UI.toast('未能获取种子信息');
                        return;
                    }
                    box._iyuuLastInfo = { ...info, mount };
                    await this.check(box, btn, box._iyuuLastInfo);
                } catch (e) {
                    const message = e?.message || '查询失败';
                    this.setQueryButton(btn, '失败', message);
                    UI.toast(`查询失败：${message}`);
                }
            };
            this.restoreLazy(box, btn, adapter, mount);
            return true;
        },
        async restoreLazy(box, btn, adapter, mount) {
            try {
                const info = await adapter.getInfo(mount);
                if (!info?.name) return;
                box._iyuuLastInfo = { ...info, mount };
                await this.restore(box, btn, box._iyuuLastInfo, adapter.id === 'm-team' ? false : Config.autoQuery);
            } catch (e) {
                log('lazy restore skipped', e?.message || e);
            }
        },
        inject(info) {
            const existing = PTDOM.qs(PTDOM.productRootSelector(info.id || '')) || PTDOM.qs(PTDOM.productRootSelector(''));
            if (existing) {
                AdapterRuntime.mountRoot({ id: info.id || '' }, info.mount, existing, info.mount?.type || '');
                return true;
            }
            const box = document.createElement('div'); box.className = 'iyuu-row-box pt-helper-root pt-helper-root-iyuu';
            const btn = document.createElement('button'); btn.className = 'iyuu-btn iyuu-check-btn'; this.setQueryButton(btn, '未查询', '配置请从 Tampermonkey 菜单打开「配置 IYUU」'); btn.onclick = e => { e.preventDefault(); e.stopPropagation(); this.check(box, btn, info); };
            const multi = document.createElement('label'); multi.className = 'iyuu-chip iyuu-site-choice'; const multiInput = document.createElement('input'); multiInput.type = 'checkbox'; multiInput.className = 'iyuu-multi-toggle'; multi.append(multiInput, document.createTextNode('多选'));
            multiInput.onchange = e => { e.stopPropagation(); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); if (box._iyuuResult) this.render(box, btn, box._iyuuResult, info, box._iyuuCached); };
            box.append(btn, multi); AdapterRuntime.mountRoot({ id: info.id || '' }, info.mount, box, info.mount?.type || '');
            this.restore(box, btn, info, Config.autoQuery);
            return true;
        },
        async restore(box, btn, info, auto = false) { try { const pageCached = ResultCache.getPage(info); if (pageCached) { btn.dataset.done = '1'; this.render(box, btn, pageCached, info, true); return; } if (auto) { const hash = await InfoHash.extract(info); if (!hash) return; const cached = ResultCache.get(hash); if (cached) { btn.dataset.done = '1'; this.render(box, btn, cached, info, true); ResultCache.set(hash, cached); return; } if (!btn.disabled) this.check(box, btn, info); } } catch (e) { log('restore skipped', e?.message || e); } },
        openTab(url) { if (!url) { UI.toast('未找到链接'); return; } if (typeof GM_openInTab === 'function') GM_openInTab(url, { active: false, insert: true }); else window.open(url, '_blank', 'noopener'); },
        download(url) {
            if (!url) { UI.toast('未找到下载链接'); return; }
            if (url.startsWith('magnet:')) { UI.toast('磁力链接，已在新标签打开'); this.openTab(url); return; }
            try { const a = document.createElement('a'); a.href = url; a.download = (url.split('/').pop() || 'download').split('?')[0] || 'download.torrent'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { UI.toast(`下载失败：${e.message}，改为打开链接`); this.openTab(url); }
        },
        async resolveDownloadUrl(site) {
            if (!SiteIndex.isMTeam(site)) return site.downloadUrl;
            if (!Config.mteamKey) throw new Error('未配置 M-Team API Key，无法下载馒头种子');
            const id = site.torrentId || String(site.url || '').match(/\/detail\/(\d+)/)?.[1] || String(site.downloadUrl || '').match(/[?&](?:id|tid)=(\d+)/)?.[1];
            if (!id) throw new Error(`${site.name || '馒头'} 缺少种子 ID`);
            const res = await HTTP.request({ method: 'POST', url: SiteIndex.mTeamApi(), data: `id=${encodeURIComponent(id)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-key': Config.mteamKey }, responseType: 'json' });
            const link = res?.data || res?.url || res?.download_url || '';
            if (!link) throw new Error(res?.message || res?.msg || '获取馒头下载链接失败');
            return link;
        },
        async downloadSelected(selected) {
            const sites = [...selected];
            if (!sites.length) { UI.toast('未勾选可下载站点'); return; }
            try {
                const urls = [];
                for (const site of sites) { const url = await this.resolveDownloadUrl(site); if (url) urls.push(url); }
                if (!urls.length) { UI.toast('选中站点缺少下载链接'); return; }
                if (urls.length === 1) { this.download(urls[0]); UI.toast('已触发下载 1 个站点种子'); return; }
                urls.forEach((url, i) => setTimeout(() => this.openTab(url), i * 500)); UI.toast(`已分批打开 ${urls.length} 个站点下载链接`);
            } catch (e) { UI.toast(e?.message || '下载失败'); }
        },
        async check(box, btn, info) { const force = btn.dataset.done === '1'; btn.disabled = true; this.setQueryButton(btn, '查询中'); btn.dataset.done = ''; box.querySelectorAll('.iyuu-result,.iyuu-error').forEach(n => n.remove()); try { const pageCached = force ? null : ResultCache.getPage(info); if (pageCached) { btn.dataset.done = '1'; this.render(box, btn, pageCached, info, true); return; } const hash = await InfoHash.extract(info); if (!hash) throw new Error('未找到 Hash'); const cached = force ? null : ResultCache.get(hash); const result = cached || await this.fetch(hash); if (result?.sites?.length || !result?.sources?.some?.(s => s?.source === 'iyuu' && s?.ok === false)) ResultCache.set(hash, result); btn.dataset.done = '1'; this.render(box, btn, result, info, Boolean(cached)); } catch (e) { this.setQueryButton(btn, '失败', e.message || '查询失败'); const err = UI.tag(e.message || '查询失败', COLORS.warn); err.classList.add('iyuu-error'); box.appendChild(err); UI.toast(`查询失败：${e.message || '未知错误'}`); } finally { btn.disabled = false; } },
        siteKeys(s) {
            const keys = new Set();
            const add = (type, value) => { const v = String(value || '').trim().toLowerCase(); if (v) keys.add(`${type}:${v}`); };
            const sid = String(s.sid || '').trim();
            if (sid && !sid.startsWith('fallback-')) add('sid', sid);
            const hosts = [
                s.host,
                SiteIndex.host(s),
                SiteIndex.host({ url: s.url }),
                SiteIndex.host({ url: s.downloadUrl }),
                SiteIndex.host({ url: SiteIndex.autoFeedUrl(s) })
            ].filter(Boolean);
            hosts.forEach(host => add('host', host));
            const nameKey = normalizeSiteKey(s.name);
            if (nameKey) add('name', nameKey);
            if (!keys.size) add('url', s.url || s.downloadUrl);
            return [...keys];
        },
        mergeSites(list) {
            const items = [];
            const keyToIndex = new Map();
            (list || []).forEach(s => {
                const keys = this.siteKeys(s);
                if (!keys.length) return;
                const index = firstOf(keys.map(k => keyToIndex.get(k)), i => i !== undefined);
                if (index === undefined) {
                    const nextIndex = items.length;
                    items.push(s);
                    keys.forEach(k => keyToIndex.set(k, nextIndex));
                    return;
                }
                const old = items[index];
                old.count = Math.max(Number(old.count || 1), Number(s.count || 1));
                if (!old.host && s.host) old.host = s.host;
                if ((!old.url || SiteIndex.isHomepageUrl(old.url)) && s.url && !SiteIndex.isHomepageUrl(s.url)) old.url = s.url;
                if (!old.downloadUrl && s.downloadUrl) old.downloadUrl = s.downloadUrl;
                if (!old.torrentId && s.torrentId) old.torrentId = s.torrentId;
                if (!old.icon && s.icon) old.icon = s.icon;
                keys.forEach(k => keyToIndex.set(k, index));
            });
            return items;
        },
        async fetch(hash) { log('fetch sources', { hash, iyuu: Boolean(Config.token), fallback: Config.zmpt }); const tasks = [Config.token ? IYUU.query(hash) : Promise.resolve({ ok: false, source: 'iyuu', error: '未配置 IYUU Token', sites: [] })]; if (Config.zmpt) tasks.push(Fallback.query(hash)); const settled = await Promise.allSettled(tasks); const sources = settled.map((r, i) => r.status === 'fulfilled' ? r.value : { ok: false, source: i ? 'fallback' : 'iyuu', error: r.reason?.message || '查询失败', sites: [] }); log('fetch result sources', sources); return { hash, sources, sites: this.mergeSites(sources.flatMap(s => s.sites || [])) }; },
        render(box, btn, result, info, cached = false) {
            if (box._iyuuResult !== result) box._iyuuSelected = new Set(result.sites);
            box._iyuuResult = result; box._iyuuCached = cached;
            const wrap = document.createElement('span'); wrap.className = 'iyuu-result iyuu-row-box';
            const selected = box._iyuuSelected || new Set(result.sites); const multi = Boolean(box.querySelector('.iyuu-multi-toggle')?.checked); const primary = firstOf(result.sources, s => s.source === 'iyuu'); const hasSites = Boolean(result.sites.length); const error = !hasSites && primary?.ok === false && primary.error ? primary.error : '';
            this.setQueryButton(btn, error ? '失败' : `${result.sites.length}站${cached ? ' 缓存' : ''}`, error || '重新查询');
            if (!result.sites.length) wrap.append(UI.tag('暂无辅种', COLORS.info));
            result.sites.forEach(s => wrap.append(UI.siteChip(s, selected, multi)));
            if (multi && result.sites.length) { const all = document.createElement('button'); all.className = 'iyuu-btn'; all.textContent = '全选'; all.onclick = e => { e.preventDefault(); e.stopPropagation(); result.sites.forEach(s => selected.add(s)); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); this.render(box, btn, result, info, cached); }; const none = document.createElement('button'); none.className = 'iyuu-btn'; none.textContent = '清空'; none.onclick = e => { e.preventDefault(); e.stopPropagation(); selected.clear(); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); this.render(box, btn, result, info, cached); }; const dl = document.createElement('button'); dl.className = 'iyuu-btn'; dl.textContent = '下载种子'; dl.onclick = e => { e.preventDefault(); e.stopPropagation(); this.downloadSelected(selected); }; const open = document.createElement('button'); open.className = 'iyuu-btn'; open.textContent = '打开选中'; open.onclick = e => { e.preventDefault(); e.stopPropagation(); const urls = [...selected].filter(s => s.url); if (!urls.length) { UI.toast('未勾选可跳转站点'); return; } urls.forEach(s => this.openTab(s.url)); UI.toast(`已打开 ${urls.length} 个站点`); }; wrap.append(all, none, dl, open); }
            box.appendChild(wrap);
        }
    };

    function main() {
        Config.load();
        UI.initStyle();
        if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('配置 IYUU', () => UI.showConfig());
        const boot = async () => {
            if (isMTeamHost() && !isMTeamDetail()) return;
            if (!isCurrentHostInCachedIndex()) return;
            const ok = await Core.init();
            if (!ok && !document.querySelector('.iyuu-check-btn')) {
                let tries = 0;
                const retry = async () => {
                    if (!isCurrentHostInCachedIndex() || (!isMTeamHost() && document.querySelector('.iyuu-check-btn')) || await Core.init() || ++tries > 40) return;
                    setTimeout(retry, 500);
                };
                setTimeout(retry, 500);
            }
            if (!Store.get(KEYS.configured, false) && !document.querySelector('.iyuu-modal-bg')) UI.showConfig();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
        if (location.hostname === 'bangumi.moe' || isMTeamHost()) {
            let mteamBootedFor = '';
            new MutationObserver(() => {
                if (!isMTeamHost()) {
                    if (!document.querySelector('.iyuu-check-btn')) setTimeout(boot, 300);
                    return;
                }
                const tid = location.pathname.match(/\/detail\/(\d+)/)?.[1] || location.href;
                if (mteamBootedFor === tid && document.querySelector('.iyuu-check-btn')) return;
                if (!document.querySelector('label') || !document.querySelector('label')?.textContent) return;
                if (!Array.from(document.querySelectorAll('label')).some(label => label.textContent.trim() === '字幕')) return;
                mteamBootedFor = tid;
                setTimeout(boot, 300);
            }).observe(document.body, { childList: true, subtree: true });
        }
        if (isMTeamHost()) {
            let lastUrl = location.href;
            setInterval(() => {
                if (location.href === lastUrl) return;
                lastUrl = location.href;
                setTimeout(boot, 300);
            }, 500);
        }
    }

    main();
})();

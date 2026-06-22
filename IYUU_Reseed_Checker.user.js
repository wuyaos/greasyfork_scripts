// ==UserScript==
// @name         IYUU 辅种检测助手(自用)
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      1.0.3
// @description  在PT/BT种子页面手动查询 IYUU 辅种信息，并用小图标展示可辅种站点。
// @author       ffwu & AI
// @match        https://*/details.php?id=*
// @match        http://*/details.php?id=*
// @match        https://*/details_movie.php?id=*
// @match        https://*/details_tv.php?id=*
// @match        https://*/details_animate.php?id=*
// @match        https://totheglory.im/t/*
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
// @match        https://monikadesign.uk/torrents/*
// @match        https://acg.rip/*
// @match        https://nyaa.si/*
// @match        https://*.kisssub.org/*
// @match        https://kisssub.org/*
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
// @connect      api.m-team.io
// @connect      api.m-team.vip
// @connect      *.m-team.cc
// @connect      *.m-team.io
// @connect      *.m-team.vip
// @connect      halomt.com
// @connect      *
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/IYUU_Reseed_Checker.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/IYUU_Reseed_Checker.user.js
// ==/UserScript==

// input: PT/BT 种子页面、IYUU Token、站点索引、可选 M-Team API Key
// output: 手动查询 IYUU 辅种结果，展示站点详情链接、多选跳转、下载入口，并从 MoviePilot 辅助选择拥有站点
// pos: 独立 IYUU 辅种检测脚本，可复用 MoviePilot 配置选择站点，首次使用自动引导配置

(function () {
    'use strict';

    const SCRIPT_NAME = 'IYUU 辅种检测助手';
    const API_BASE = 'https://2025.iyuu.cn';
    const ZMPT_API = 'https://zmpt.cc/nodeapi/iyuu/getIyuuByInfoHash';
    const KEYS = {
        token: 'iyuu_reseed_token', owned: 'iyuu_reseed_owned_sites', zmpt: 'iyuu_reseed_zmpt_enabled',
        sites: 'iyuu_reseed_sites_index', sitesTime: 'iyuu_reseed_sites_index_time', sid: 'iyuu_reseed_sid_sha1',
        sidTime: 'iyuu_reseed_sid_sha1_time', sidKey: 'iyuu_reseed_sid_sha1_key', result: 'iyuu_reseed_result_cache',
        mteamKey: 'iyuu_reseed_mteam_api_key', configured: 'iyuu_reseed_configured_once',
        mpUrl: 'moviepilotUrl', mpUser: 'moviepilotUser', mpPass: 'moviepilotPassword', mpAuthMode: 'moviepilotAuthMode', mpApiKey: 'moviepilotApiKey'
    };
    const COLORS = { primary: '#2775b6', secondary: '#e6702e', success: '#5bb053', warn: '#c54640', info: '#677489' };
    const DEBUG = true;
    const safeJson = v => { try { return JSON.stringify(v, (k, val) => val instanceof ArrayBuffer ? `ArrayBuffer(${val.byteLength})` : val, 2); } catch (_) { return String(v); } };
    const log = (label, value = '') => { if (DEBUG) console.log(`[${SCRIPT_NAME}] ${label}`, value && typeof value === 'object' ? safeJson(value) : value); };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    let iyuuLastRequest = 0;

    const Store = {
        get(k, d = '') { try { return GM_getValue(k, d); } catch (_) { return d; } },
        set(k, v) { try { GM_setValue(k, v); } catch (_) {} },
        del(k) { try { GM_deleteValue(k); } catch (_) {} },
        json(k, d) { try { const v = this.get(k, ''); return v ? JSON.parse(v) : d; } catch (_) { return d; } }
    };

    const Config = {
        token: '', owned: [], zmpt: true, mteamKey: '',
        load() {
            this.token = Store.get(KEYS.token, '');
            this.owned = Store.json(KEYS.owned, []);
            this.zmpt = true;
            Store.set(KEYS.zmpt, true);
            this.mteamKey = Store.get(KEYS.mteamKey, '');
        },
        save({ token, owned, mteamKey }) {
            Store.set(KEYS.token, String(token || '').trim());
            Store.set(KEYS.owned, JSON.stringify((owned || []).map(String)));
            Store.set(KEYS.zmpt, true);
            Store.set(KEYS.mteamKey, String(mteamKey || '').trim());
            Store.set(KEYS.configured, true);
            Store.del(KEYS.sid); Store.del(KEYS.sidTime); Store.del(KEYS.sidKey); Store.del(KEYS.result);
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
                .iyuu-row-box{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;line-height:1.6}.iyuu-btn,.iyuu-body button{border:0;border-radius:4px;color:#fff;cursor:pointer;font-weight:600;padding:0.25rem 0.75rem;background:${COLORS.secondary};font-size:12px;line-height:1.6}.iyuu-btn.primary,.iyuu-save,#iyuuSaveToken,#iyuuSaveMp{background:${COLORS.success}}.iyuu-btn.danger,.iyuu-cancel,#iyuuResetConfig{background:${COLORS.warn}}.iyuu-btn:disabled,.iyuu-body button:disabled{opacity:.7;cursor:not-allowed}.iyuu-chip{display:inline-flex;align-items:center;gap:4px;border-radius:0.375rem;padding:2px 7px;background:#eef3f8;color:#263238;text-decoration:none;border:1px solid #d6dde5}.iyuu-chip.source{color:#fff;background:${COLORS.primary};border-color:${COLORS.primary}}.iyuu-chip.error{background:${COLORS.warn};border-color:${COLORS.warn};color:#fff}.iyuu-site-choice{display:inline-flex;align-items:center;gap:4px}.iyuu-site-choice input{margin:0}.iyuu-site-link{display:inline-flex;align-items:center;gap:4px;color:inherit;text-decoration:none}.iyuu-icon{width:16px;height:16px;border-radius:3px;object-fit:contain;background:#fff;flex:0 0 auto;display:block}.iyuu-avatar{width:16px;height:16px;border-radius:4px;background:${COLORS.info};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}.iyuu-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483646;display:flex;align-items:center;justify-content:center}.iyuu-modal{width:620px;max-height:86vh;overflow:auto;background:#f9f9f9;color:#333;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.28);font-family:Segoe UI,system-ui,sans-serif}.iyuu-modal h2{margin:0;padding:14px 20px;color:#fff;background:linear-gradient(135deg,#2775b6,#5bb053);font-size:16px}.iyuu-body{padding:18px 22px}.iyuu-body label{display:block;font-weight:600;margin:10px 0 4px}.iyuu-body input[type=text],.iyuu-body input[type=password],.iyuu-body select{width:calc(100% - 18px);padding:8px;border:1px solid #ddd;border-radius:4px}.iyuu-more{margin:12px 0;border:1px solid #e5e5e5;border-radius:6px;background:#fff;padding:10px}.iyuu-more summary{cursor:pointer;font-weight:700;color:${COLORS.primary}}.iyuu-inline{display:flex;gap:8px;align-items:center}.iyuu-inline input{flex:1}.iyuu-actions{text-align:right;margin-top:14px;padding-top:12px;border-top:1px solid #e5e5e5}.iyuu-save{background:${COLORS.success};color:#fff}.iyuu-cancel{background:${COLORS.warn};color:#fff}.iyuu-site-toolbar{display:flex;gap:8px;align-items:center;margin:10px 0;flex-wrap:wrap}.iyuu-site-grid{display:flex;gap:7px;flex-wrap:wrap;max-height:230px;overflow:auto;border:1px solid #ddd;border-radius:6px;background:#fff;padding:10px}.iyuu-site-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid #d6dde5;border-radius:0.375rem;background:#fff;color:#8a94a3;cursor:pointer;font-size:12px;opacity:.75}.iyuu-site-chip:hover{border-color:${COLORS.primary}}.iyuu-site-chip.selected{border-color:${COLORS.success};background:${COLORS.success};color:#fff;opacity:1;font-weight:600}.iyuu-toast{position:fixed;top:20px;right:20px;z-index:2147483647;background:${COLORS.success};color:#fff;padding:12px 16px;border-radius:5px;box-shadow:0 4px 12px rgba(0,0,0,.15)}
            `);
        },
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
            let safeSrc = '';
            try {
                const u = new URL(src || '', location.origin);
                if (u.protocol === 'https:' || u.protocol === 'http:') safeSrc = u.href;
            } catch (_) {}
            if (!safeSrc) return this.avatar(name);
            const img = document.createElement('img'); img.className = 'iyuu-icon'; img.src = safeSrc; img.alt = '';
            img.onerror = () => img.replaceWith(this.avatar(name)); return img;
        },
        avatar(name) { const s = document.createElement('span'); s.className = 'iyuu-avatar'; s.textContent = String(name || '?').trim().slice(0, 1).toUpperCase(); return s; },
        toast(msg) { const t = document.createElement('div'); t.className = 'iyuu-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); },
        async safeRun(label, fn) { try { return await fn(); } catch (e) { log(`${label} 失败`, e?.message || e); this.toast(`${label}失败：${e?.message || '未知错误'}`); } },
        renderRow(type, htmlNode) {
            if (type === 'common' && /m-team\.(cc|io|vip)/.test(location.hostname)) {
                const th = document.createElement('th'); th.className = 'ant-descriptions-item-label'; th.style.cssText = 'width:135px;text-align:right'; th.textContent = 'IYUU';
                const td = document.createElement('td'); td.className = 'ant-descriptions-item-content'; td.appendChild(htmlNode); return [th, td];
            }
            if (type === 'common') { const h = document.createElement('td'); h.className = 'rowhead nowrap'; h.textContent = 'IYUU'; const d = document.createElement('td'); d.className = 'rowfollow'; d.appendChild(htmlNode); return [h, d]; }
            return [htmlNode];
        },
        async showConfig() {
            let sites = await SiteIndex.get(false).catch(() => []);
            const bg = document.createElement('div'); bg.className = 'iyuu-modal-bg';
            const modal = document.createElement('div'); modal.className = 'iyuu-modal';
            modal.innerHTML = `<h2>IYUU 设置</h2><div class="iyuu-body"><label>IYUU Token</label><div class="iyuu-inline"><input id="iyuuToken" type="password"><button id="iyuuSaveToken">保存</button></div><label>M-Team API Key（可选）</label><input id="iyuuMteamKey" type="password"><details class="iyuu-more"><summary>更多 / MoviePilot</summary><label>MoviePilot 地址</label><input id="iyuuMpUrl" type="text"><label>认证方式</label><select id="iyuuMpAuth"><option value="password">用户名密码</option><option value="apikey">API Key</option></select><label>用户名</label><input id="iyuuMpUser" type="text"><label>密码</label><input id="iyuuMpPass" type="password"><label>API Key</label><input id="iyuuMpApiKey" type="password"><button id="iyuuSaveMp">保存 MoviePilot</button></details><div class="iyuu-site-toolbar"><input id="iyuuSiteSearch" type="text" placeholder="搜索站点"><button id="iyuuRefreshSites">刷新索引</button><button id="iyuuDetectSites">从 MoviePilot 选择</button><button id="iyuuDetectLogin">选择已登录（不推荐）</button><button id="iyuuAllSites">全选</button><button id="iyuuClearSites">清空</button><button id="iyuuClearCache">清缓存</button><button id="iyuuResetConfig">重置配置</button></div><div id="iyuuSiteGrid" class="iyuu-site-grid"></div><div class="iyuu-actions"><button class="iyuu-cancel">关闭</button><button class="iyuu-save">保存全部</button></div></div>`;
            bg.appendChild(modal); document.body.appendChild(bg);
            modal.querySelector('#iyuuToken').value = Config.token;
            modal.querySelector('#iyuuMteamKey').value = Config.mteamKey;
            modal.querySelector('#iyuuMpUrl').value = Store.get(KEYS.mpUrl, 'http://127.0.0.1:3000');
            modal.querySelector('#iyuuMpAuth').value = Store.get(KEYS.mpAuthMode, 'password');
            modal.querySelector('#iyuuMpUser').value = Store.get(KEYS.mpUser, 'admin');
            modal.querySelector('#iyuuMpPass').value = Store.get(KEYS.mpPass, '');
            modal.querySelector('#iyuuMpApiKey').value = Store.get(KEYS.mpApiKey, '');
            const selected = new Set(Config.owned.map(String));
            if (!Store.get(KEYS.configured, false) && !selected.size && sites.length) sites.forEach(s => selected.add(String(s.id || s.sid)));
            const grid = modal.querySelector('#iyuuSiteGrid');
            const renderSites = (kw = '') => { grid.textContent = ''; sites.filter(s => SiteIndex.name(s).toLowerCase().includes(kw.toLowerCase())).forEach(s => { const sid = String(s.id || s.sid); if (!sid) return; const b = document.createElement('button'); b.type = 'button'; b.className = `iyuu-site-chip${selected.has(sid) ? ' selected' : ''}`; b.dataset.sid = sid; b.append(this.icon(SiteIndex.name(s), SiteIndex.icon(s)), document.createTextNode(SiteIndex.name(s))); b.onclick = () => { selected.has(sid) ? selected.delete(sid) : selected.add(sid); b.classList.toggle('selected'); }; grid.appendChild(b); }); };
            const tokenInput = modal.querySelector('#iyuuToken');
            renderSites(); modal.querySelector('#iyuuSiteSearch').oninput = e => renderSites(e.target.value);
            modal.querySelector('#iyuuAllSites').onclick = () => { sites.forEach(s => selected.add(String(s.id || s.sid))); renderSites(modal.querySelector('#iyuuSiteSearch').value); this.toast(`已全选 ${selected.size} 个站点`); };
            modal.querySelector('#iyuuClearSites').onclick = () => { selected.clear(); renderSites(modal.querySelector('#iyuuSiteSearch').value); this.toast('已清空站点选择'); };
            modal.querySelector('#iyuuRefreshSites').onclick = async () => { const token = tokenInput.value.trim(); if (!token) { this.toast('请先填写 IYUU Token'); return; } try { const first = !Store.get(KEYS.configured, false); sites = await SiteIndex.get(true, token); if (first) { selected.clear(); sites.forEach(s => selected.add(String(s.id || s.sid))); } renderSites(modal.querySelector('#iyuuSiteSearch').value); this.toast(`站点索引已刷新：${sites.length} 个`); } catch (e) { this.toast(`刷新失败：${e.message}`); } };
            modal.querySelector('#iyuuSaveToken').onclick = () => { Config.save({ token: tokenInput.value, mteamKey: modal.querySelector('#iyuuMteamKey').value, owned: [...selected] }); this.toast('Token 已保存，可继续刷新索引'); };
            modal.querySelector('#iyuuDetectSites').onclick = async () => { try { MoviePilot.save(modal); const detected = SiteIndex.matchMoviePilot(await MoviePilot.sites(), sites); detected.forEach(sid => selected.add(sid)); renderSites(modal.querySelector('#iyuuSiteSearch').value); this.toast(`已按 MoviePilot 选择站点：${detected.length} 个`); } catch (e) { this.toast(`MoviePilot 获取失败：${e.message}`); } };
            modal.querySelector('#iyuuDetectLogin').onclick = async ev => { const b = ev.currentTarget; if (b.disabled) return; if (!confirm('该方式会逐站访问首页检测登录，较慢且较重，确定继续？')) return; b.disabled = true; const detected = await SiteIndex.detectLoggedIn(sites, (done, total) => { b.textContent = `检测中 ${done}/${total}`; }); detected.forEach(sid => selected.add(sid)); renderSites(modal.querySelector('#iyuuSiteSearch').value); b.disabled = false; b.textContent = '选择已登录（不推荐）'; this.toast(`已选择疑似登录站点：${detected.length} 个`); };
            modal.querySelector('#iyuuSaveMp').onclick = () => { MoviePilot.save(modal); this.toast('MoviePilot 配置已保存'); };
            modal.querySelector('#iyuuClearCache').onclick = () => ResultCache.clear();
            modal.querySelector('#iyuuResetConfig').onclick = () => Config.reset();
            modal.querySelector('.iyuu-cancel').onclick = () => bg.remove(); bg.onclick = e => { if (e.target === bg) bg.remove(); };
            modal.querySelector('.iyuu-save').onclick = () => { Config.save({ token: tokenInput.value, mteamKey: modal.querySelector('#iyuuMteamKey').value, owned: [...selected] }); this.toast('配置已保存'); };
        }
    };

    const HTTP = {
        allowed(raw) { try { const u = new URL(raw, location.origin); const h = u.hostname; if (h === '2025.iyuu.cn' || h === 'zmpt.cc' || h === location.hostname || /(^|\.)m-team\.(cc|io|vip)$/.test(h) || h === 'halomt.com' || h === 'bangumi.moe' || h === 'totheglory.im') return true; const mp = MoviePilot.cfg().url; if (mp && h === new URL(mp).hostname.toLowerCase()) return true; return Store.json(KEYS.sites, []).some(s => { const host = SiteIndex.host(s); return host && (h === host || h.endsWith(`.${host}`) || host.endsWith(`.${h}`)); }); } catch (_) { return false; } },
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
        icon(s) { const direct = s?.icon || s?.logo || s?.favicon; if (direct) return direct; const host = s?.domain || s?.base_url || s?.url; if (!host) return ''; try { const u = host.startsWith('http') ? new URL(host) : new URL(`https://${host}`); return `${u.origin}/favicon.ico`; } catch (_) { return ''; } },
        host(s) { const raw = s?.domain || s?.base_url || s?.url || s?.site || ''; if (!raw) return ''; try { return (raw.startsWith('http') ? new URL(raw) : new URL(`https://${raw}`)).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return String(raw).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase(); } },
        homepage(s) { const raw = s?.base_url || s?.url || s?.domain || s?.site || ''; if (!raw) return ''; try { return (raw.startsWith('http') ? new URL(raw) : new URL(`https://${raw}`)).origin; } catch (_) { const host = this.host(s); return host ? `https://${host}` : ''; } },
        isHomepageUrl(url) { try { const u = new URL(url, location.origin); return (!u.pathname || u.pathname === '/') && !u.search && !u.hash; } catch (_) { return false; } },
        pageUrl(s, pageField, torrentId, rawUrl = '') { const origin = this.homepage(s); const direct = rawUrl || ''; if (!origin) return direct; if (!torrentId) return direct || origin; const tpl = pageField || 'details.php?id={}'; const path = String(tpl).replace('{}', String(torrentId)).replace(/\{[^}]*\}/g, ''); const built = path.startsWith('http') ? path : `${origin}/${path.replace(/^\//, '')}`; return direct && !this.isHomepageUrl(direct) ? direct : built; },
        detailUrl(s, torrentId, rawUrl = '') { return this.pageUrl(s, s?.details_page || 'details.php?id={}', torrentId, rawUrl); },
        downloadUrl(s, torrentId, rawUrl = '') { const direct = rawUrl || ''; if (direct && !this.isHomepageUrl(direct)) return direct; return torrentId ? this.pageUrl(s, s?.download_page || 'download.php?id={}', torrentId, '') : ''; },
        currentSid(list) { const current = location.hostname.replace(/^www\./, '').toLowerCase(); const match = (list || []).find(s => { const host = this.host(s); return host && (current === host || current.endsWith(`.${host}`) || host.endsWith(`.${current}`)); }); return match ? String(match.id || match.sid || '') : ''; },
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
        fromPage() { const text = `${location.href}\n${document.body?.innerText || ''}`; const all = text.match(/\b[a-fA-F0-9]{40}\b/g) || []; return all.find(this.valid) || ''; },
        valid(h) { return /^[a-f0-9]{40}$/i.test(h) && !/^(.)\1{39}$/.test(h) && !/^\d{40}$/.test(h); },
        base32ToHex(s) { const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; String(s).toUpperCase().replace(/=+$/, '').split('').forEach(c => { const v = alpha.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, '0'); }); let out = ''; for (let i = 0; i + 4 < bits.length; i += 4) out += parseInt(bits.slice(i, i + 4), 2).toString(16); return out.slice(0, 40).toLowerCase(); },
        async fromSpecial(info) { if (info._bangumiId) { const r = await HTTP.request({ url: `https://bangumi.moe/api/v2/torrent/${info._bangumiId}` }); if (r?.magnet) { info.downloadLink = r.magnet; return this.fromMagnet(r.magnet); } } if (/m-team\.(cc|io|vip)/.test(location.hostname)) { const link = await this.mteamLink(); if (link) { info.downloadLink = link; return await this.fromTorrent(link); } } return ''; },
        async mteamLink() { if (!Config.mteamKey) return ''; const id = location.pathname.match(/\/detail\/(\d+)/)?.[1]; if (!id) return ''; const api = `https://api.${location.hostname.replace(/^.*?m-team\./, 'm-team.')}/api/torrent/genDlToken`; const res = await HTTP.request({ method: 'POST', url: api, data: `id=${encodeURIComponent(id)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-key': Config.mteamKey }, responseType: 'json' }); return res?.data || ''; },
        async fromTorrent(url) { if (!url || url.startsWith('magnet:')) return ''; const buf = await HTTP.request({ url, responseType: 'arraybuffer' }); const bytes = new Uint8Array(buf); const range = this.infoRange(bytes); return range ? await Crypto.sha1Hex(bytes.slice(range[0], range[1])) : ''; },
        findTorrentUrl() {
            const selectors = [
                'a[href*="download.php"]',
                'a[href*="download"]',
                'a[href$=".torrent"]',
                'a[href*="/dl/"]',
                'a[href*="download?id="]'
            ];
            for (const sel of selectors) {
                const link = [...document.querySelectorAll(sel)].find(a => !String(a.href || '').startsWith('magnet:'));
                if (link?.href) return link.href;
            }
            const byText = [...document.querySelectorAll('a[href]')].find(a => /下载|torrent|种子|download/i.test(a.textContent || ''));
            return byText?.href || '';
        },
        infoRange(bytes) { const dec = new TextDecoder('latin1'); const str = dec.decode(bytes); const key = str.indexOf('4:info'); if (key < 0) return null; const start = key + 6; let i = start; const walk = () => { const begin = i; const c = str[i]; if (c === 'i') { i = str.indexOf('e', i) + 1; return [begin, i]; } if (c === 'l' || c === 'd') { i++; while (str[i] !== 'e' && i < str.length) walk(); i++; return [begin, i]; } if (/\d/.test(c)) { const colon = str.indexOf(':', i); const len = Number(str.slice(i, colon)); i = colon + 1 + len; return [begin, i]; } throw new Error('bad bencode'); }; try { return walk(); } catch (_) { return null; } }
    };

    const IYUU = {
        async sidSha1() { const sitesIndex = await SiteIndex.get(false); const currentSid = SiteIndex.currentSid(sitesIndex); const sortedSites = Array.from(new Set([...Config.owned, currentSid].map(Number).filter(Boolean))).sort((a, b) => a - b); log('sid list for reportExisting', { currentSid, owned: Config.owned, sortedSites }); const key = sortedSites.join(','); const oldKey = Store.get(KEYS.sidKey, ''); const old = Store.get(KEYS.sid, ''); const ts = Number(Store.get(KEYS.sidTime, 0)); if (old && key === oldKey && Date.now() - ts < 7 * 864e5) { log('reuse cached sid_sha1', { key }); return old; } if (!sortedSites.length) throw new Error('请先在菜单配置已拥有站点，或刷新站点索引以识别当前站'); const res = await HTTP.request({ method: 'POST', url: `${API_BASE}/reseed/sites/reportExisting`, headers: { Token: Config.token, 'Content-Type': 'application/json' }, data: JSON.stringify({ sid_list: sortedSites }) }); log('reportExisting response', res); const val = res?.data?.sid_sha1 || ''; if (!val) throw new Error(res?.msg || '获取 sid_sha1 失败'); Store.set(KEYS.sid, val); Store.set(KEYS.sidKey, key); Store.set(KEYS.sidTime, Date.now()); return val; },
        async query(hash) { if (!Config.token) return { ok: false, source: 'iyuu', error: '未配置 IYUU Token', sites: [] }; const sid_sha1 = await this.sidSha1(); const hashes = Array.from(new Set([hash.toLowerCase()])).sort(); const sha1 = await Crypto.sha1Hex(JSON.stringify(hashes)); const params = new URLSearchParams({ hash: JSON.stringify(hashes), sha1, sid_sha1, timestamp: String(Math.floor(Date.now() / 1000)), version: '8.2.0' }); log('IYUU query params', { hashes, sha1, sid_sha1: `${String(sid_sha1).slice(0, 8)}...` }); const raw = await HTTP.request({ method: 'POST', url: `${API_BASE}/reseed/index/index`, headers: { Token: Config.token, 'Content-Type': 'application/x-www-form-urlencoded' }, data: params.toString(), allowStatuses: [400, 404] }); log('IYUU query response', raw); if (raw?.msg === '未查询到可辅种数据') return { ok: true, source: 'iyuu', sites: [] }; if (raw?.code === 400 && raw?.msg === '站点缓存哈希值无效') { Store.del(KEYS.sid); Store.del(KEYS.sidTime); Store.del(KEYS.sidKey); throw new Error('站点缓存失效，请重试'); } if (raw && raw.code !== undefined && raw.code !== 0) throw new Error(raw.msg || 'IYUU 查询失败'); return await this.normalize(raw); },
        async normalize(raw) { const index = SiteIndex.bySid(await SiteIndex.get(false)); const dataObj = raw?.data || {}; const groups = Array.isArray(dataObj) ? dataObj : Object.values(dataObj); const list = groups.flatMap(g => Array.isArray(g?.torrent) ? g.torrent : (Array.isArray(g) ? g : [])); const m = new Map(); list.forEach(x => { const sid = String(x.sid || x.site_id || x.site || x.site_id_str || ''); if (!sid) return; const meta = index.get(sid) || {}; const name = x.site_name || x.site_alias || x.nickname || x.name || SiteIndex.name(meta) || `站点${sid}`; const torrentId = x.torrent_id || x.tid || x.id; const url = SiteIndex.detailUrl(meta, torrentId, x.url || x.page_url || x.zmpt_data?.url || ''); const downloadUrl = SiteIndex.downloadUrl(meta, torrentId, x.download_url || x.downloadUrl || x.down_url || x.zmpt_data?.download_url || ''); const item = m.get(sid) || { source: 'iyuu', sid, name, icon: x.icon || SiteIndex.icon(meta), count: 0, url, downloadUrl }; item.count++; if (!item.url) item.url = url; if (!item.downloadUrl) item.downloadUrl = downloadUrl; m.set(sid, item); }); return { ok: true, source: 'iyuu', sites: [...m.values()] }; }
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
        async query(hash) { if (!Config.zmpt) return { ok: false, source: 'fallback', sites: [] }; const raw = await HTTP.request({ url: `${ZMPT_API}?hash=${encodeURIComponent(hash)}` }); log('IYUU fallback query response', raw); const data = this.items(raw); log('IYUU fallback parsed items', data); const index = SiteIndex.bySid(await SiteIndex.get(false)); return { ok: true, source: 'fallback', sites: data.map((x, i) => { const sid = String(x.sid || x.site_id || x.site || `fallback-${i}`); const meta = index.get(sid) || {}; const torrentId = x.torrent_id || x.tid || x.id; const url = SiteIndex.detailUrl(meta, torrentId, x.url || x.page_url || x.link || ''); const downloadUrl = SiteIndex.downloadUrl(meta, torrentId, x.download_url || x.downloadUrl || x.down_url || ''); return { source: 'fallback', sid, name: x.site_name || x.name || x.site || x.nickname || x.name_cn || SiteIndex.name(meta) || 'IYUU', icon: x.icon || x.logo || SiteIndex.icon(meta), count: Number(x.count || x.num || 1), url, downloadUrl }; }) }; }
    };

    const ResultCache = {
        _data: null, version: 'selected-download-v1', okTtl: 6 * 3600e3, emptyTtl: 3600e3, max: 200,
        _load() { if (this._data) return this._data; try { const raw = Store.get(KEYS.result, '{}'); this._data = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch (_) { this._data = {}; } return this._data; },
        _persist() { try { Store.set(KEYS.result, JSON.stringify(this._data || {})); } catch (e) { log('result cache write failed', e.message); } },
        key(hash) { const sidKey = Config.owned.map(Number).filter(Boolean).sort((a, b) => a - b).join(','); return `${hash}|${sidKey}`; },
        get(hash) { const data = this._load(); const key = this.key(hash); const item = data[key]; if (!item || item.version !== this.version) return null; const ttl = item.empty ? this.emptyTtl : this.okTtl; if (Date.now() - (item.ts || 0) > ttl) { delete data[key]; this._persist(); return null; } return item.payload || null; },
        set(hash, payload) { if (!hash || !payload) return; const data = this._load(); data[this.key(hash)] = { payload, ts: Date.now(), version: this.version, empty: !(payload.sites || []).length }; this._prune(); this._persist(); },
        _prune() { const data = this._data || {}; const now = Date.now(); Object.keys(data).forEach(k => { const item = data[k] || {}; const ttl = item.empty ? this.emptyTtl : this.okTtl; if (now - (item.ts || 0) > ttl) delete data[k]; }); const keys = Object.keys(data); if (keys.length > this.max) keys.map(k => ({ k, ts: data[k]?.ts || 0 })).sort((a, b) => a.ts - b.ts).slice(0, keys.length - this.max).forEach(({ k }) => delete data[k]); },
        clear() { this._data = {}; Store.del(KEYS.result); UI.toast('辅种查询缓存已清空'); },
        size() { return Object.keys(this._load()).length; }
    };

    const Helpers = {
        text(sel, root = document) { return root.querySelector(sel)?.textContent?.trim() || ''; },
        abs(raw) { try { return raw ? new URL(raw, location.origin).href : ''; } catch (_) { return ''; } },
        size(t) { const m = String(t || '').replace(/iB/gi, 'B').toUpperCase().match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)/); if (!m) return 0; return Number(m[1]) * ({ TB: 1024 ** 4, GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024 }[m[2]] || 1); },
        simple({ name, downloadLink, sizeText, insertPoint }) { return name && insertPoint ? { name, downloadLink: downloadLink || '', size: this.size(sizeText), insertPoint, rowType: 'div', insertAction: (p, e) => p.after(e) } : null; }
    };

    const ADAPTERS = [
        { id: 'bangumi', matches: () => location.hostname === 'bangumi.moe', getInfo: () => { const modal = document.querySelector('.torrent-details-content'); const root = modal || document; const title = root.querySelector('a.title-link b, a[href*="/torrent/"]')?.textContent?.trim() || document.title.split(/[-|_]/)[0].trim(); const link = root.querySelector('a[href^="magnet:"]')?.href || ''; const id = root.querySelector('a[href*="/torrent/"]')?.href?.match(/\/torrent\/([a-f0-9]+)/i)?.[1] || location.pathname.match(/\/torrent\/([a-f0-9]+)/i)?.[1]; const info = Helpers.simple({ name: title, downloadLink: link, sizeText: root.textContent, insertPoint: root.querySelector('.torrent-info,.torrent-title') || document.body }); if (info) info._bangumiId = id; return info; } },
        { id: 'm-team', matches: () => /m-team\.(cc|io|vip)\/detail\//.test(location.href), getInfo: () => Helpers.simple({ name: Helpers.text('h2 span.align-middle') || Helpers.text('h2') || document.title, downloadLink: '', sizeText: document.body.innerText, insertPoint: document.querySelector('h2')?.parentElement || document.body }) },
        { id: 'nyaa', matches: () => location.hostname === 'nyaa.si', getInfo: () => Helpers.simple({ name: Helpers.text('h3.panel-title') || document.title.replace(/::.*$/, '').trim(), downloadLink: document.querySelector('a[href^="magnet:"],a[href*="/download/"]')?.href || '', sizeText: document.body.innerText, insertPoint: document.querySelector('.panel-heading') || document.body }) },
        { id: 'acg-rip', matches: () => location.hostname === 'acg.rip', getInfo: () => Helpers.simple({ name: Helpers.text('.panel-heading') || document.title.replace(/-\s*ACG\.RIP.*/i, '').trim(), downloadLink: document.querySelector('a[href^="magnet:"],a[href*=".torrent"]')?.href || '', sizeText: document.body.innerText, insertPoint: document.querySelector('.panel-heading') || document.body }) },
        { id: 'comicat-kisssub', matches: () => /(^|\.)(comicat|kisssub)\.org$/i.test(location.hostname), getInfo: () => { const hash = location.pathname.match(/show-([a-f0-9]{40})\.html/i)?.[1] || ''; return Helpers.simple({ name: document.title.replace(/\s*-\s*.*/, '').trim(), downloadLink: document.querySelector('a[href^="magnet:"]')?.href || (hash ? `magnet:?xt=urn:btih:${hash}` : ''), sizeText: document.body.innerText, insertPoint: document.querySelector('.intro,.basic_info') || document.body }); } },
        { id: 'generic', matches: () => true, getInfo: () => { const rows = document.querySelectorAll('.rowhead,.heading'); const nameRow = rows[0]; const nameLink = nameRow?.nextElementSibling?.querySelector('a') || document.querySelector('a[href^="magnet:"],a[href*="download"],a[href*=".torrent"]'); return { name: nameLink?.textContent?.replace(/\.torrent$/i, '').trim() || document.title, downloadLink: nameLink?.href || '', size: Helpers.size(document.body.innerText), insertPoint: nameRow?.parentElement?.parentElement || document.body, rowType: nameRow ? 'common' : 'div', insertAction: (p, e) => nameRow ? p.insertBefore(e, p.children[2] || null) : p.prepend(e) }; } }
    ];

    const Core = {
        adapter: null,
        init() { this.adapter = ADAPTERS.find(a => a.matches()); const info = this.adapter?.getInfo(); if (info?.name && !document.querySelector('.iyuu-check-btn')) this.inject(info); },
        inject(info) {
            const row = document.createElement(info.rowType === 'common' ? 'tr' : 'div');
            const box = document.createElement('div'); box.className = 'iyuu-row-box';
            const btn = document.createElement('button'); btn.className = 'iyuu-btn iyuu-check-btn'; btn.textContent = '查辅种'; btn.title = '配置请从 Tampermonkey 菜单打开「配置 IYUU」'; btn.onclick = e => { e.preventDefault(); e.stopPropagation(); this.check(box, btn, info); };
            const summary = UI.tag('IYUU 0站', COLORS.info); summary.classList.add('iyuu-summary');
            const multi = document.createElement('label'); multi.className = 'iyuu-chip iyuu-site-choice'; const multiInput = document.createElement('input'); multiInput.type = 'checkbox'; multiInput.className = 'iyuu-multi-toggle'; multi.append(multiInput, document.createTextNode('多选'));
            multiInput.onchange = e => { e.stopPropagation(); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); if (box._iyuuResult) this.render(box, btn, box._iyuuResult, info, box._iyuuCached); };
            box.append(btn, summary, multi); row.append(...UI.renderRow(info.rowType, box)); info.insertAction(info.insertPoint, row);
            this.restore(box, btn, info);
        },
        async restore(box, btn, info) { try { const hash = await InfoHash.extract(info); if (!hash) return; const cached = ResultCache.get(hash); if (cached) { btn.dataset.done = '1'; this.render(box, btn, cached, info, true); } } catch (_) {} },
        openTab(url) { if (!url) { UI.toast('未找到链接'); return; } if (typeof GM_openInTab === 'function') GM_openInTab(url, { active: false, insert: true }); else window.open(url, '_blank', 'noopener'); },
        download(url) {
            if (!url) { UI.toast('未找到下载链接'); return; }
            if (url.startsWith('magnet:')) { UI.toast('磁力链接，已在新标签打开'); this.openTab(url); return; }
            try { const a = document.createElement('a'); a.href = url; a.download = (url.split('/').pop() || 'download').split('?')[0] || 'download.torrent'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { UI.toast(`下载失败：${e.message}，改为打开链接`); this.openTab(url); }
        },
        downloadSelected(selected) {
            const sites = [...selected];
            if (!sites.length) { UI.toast('未勾选可下载站点'); return; }
            const urls = sites.map(s => s.downloadUrl).filter(Boolean);
            if (!urls.length) { UI.toast('选中站点缺少下载链接'); return; }
            if (urls.length === 1) { this.download(urls[0]); UI.toast('已触发下载 1 个站点种子'); return; }
            urls.forEach((url, i) => setTimeout(() => this.openTab(url), i * 500)); UI.toast(`已分批打开 ${urls.length} 个站点下载链接`);
        },
        async check(box, btn, info) { btn.disabled = true; btn.textContent = '查询中...'; box.querySelectorAll('.iyuu-result,.iyuu-error').forEach(n => n.remove()); try { const hash = await InfoHash.extract(info); if (!hash) throw new Error('未找到 Hash'); const force = btn.dataset.done === '1'; const cached = force ? null : ResultCache.get(hash); const result = cached || await this.fetch(hash); ResultCache.set(hash, result); btn.dataset.done = '1'; this.render(box, btn, result, info, Boolean(cached)); } catch (e) { btn.textContent = '重试'; const err = UI.tag(e.message || '查询失败', COLORS.warn); err.classList.add('iyuu-error'); box.appendChild(err); UI.toast(`查辅种失败：${e.message || '未知错误'}`); } finally { btn.disabled = false; } },
        mergeSites(list) { const m = new Map(); (list || []).forEach(s => { const key = s.sid || s.name; if (!key) return; const old = m.get(key); if (!old) { m.set(key, s); return; } if (SiteIndex.isHomepageUrl(old.url) && !SiteIndex.isHomepageUrl(s.url)) old.url = s.url; if (!old.downloadUrl && s.downloadUrl) old.downloadUrl = s.downloadUrl; }); return [...m.values()]; },
        async fetch(hash) { log('fetch sources', { hash, iyuu: Boolean(Config.token), fallback: Config.zmpt }); const tasks = [Config.token ? IYUU.query(hash) : Promise.resolve({ ok: false, source: 'iyuu', error: '未配置 IYUU Token', sites: [] })]; if (Config.zmpt) tasks.push(Fallback.query(hash)); const settled = await Promise.allSettled(tasks); const sources = settled.map((r, i) => r.status === 'fulfilled' ? r.value : { ok: false, source: i ? 'fallback' : 'iyuu', error: r.reason?.message || '查询失败', sites: [] }); log('fetch result sources', sources); return { hash, sources, sites: this.mergeSites(sources.flatMap(s => s.sites || [])) }; },
        render(box, btn, result, info, cached = false) {
            if (box._iyuuResult !== result) box._iyuuSelected = new Set(result.sites);
            box._iyuuResult = result; box._iyuuCached = cached;
            btn.textContent = '重新查询'; const wrap = document.createElement('span'); wrap.className = 'iyuu-result iyuu-row-box';
            const selected = box._iyuuSelected || new Set(result.sites); const multi = Boolean(box.querySelector('.iyuu-multi-toggle')?.checked); const primary = result.sources.find(s => s.source === 'iyuu'); const error = primary?.ok === false && primary.error ? primary.error : '';
            const summary = box.querySelector('.iyuu-summary'); if (summary) { summary.textContent = error ? `IYUU失败: ${error}` : `IYUU ${result.sites.length}站${cached ? ' 缓存' : ''}`; summary.style.background = error ? COLORS.warn : (result.sites.length ? COLORS.success : COLORS.info); summary.style.borderColor = summary.style.background; }
            if (!result.sites.length) wrap.append(UI.tag('暂无辅种', COLORS.info));
            result.sites.forEach(s => wrap.append(UI.siteChip(s, selected, multi)));
            if (multi && result.sites.length) { const all = document.createElement('button'); all.className = 'iyuu-btn'; all.textContent = '全选'; all.onclick = e => { e.preventDefault(); e.stopPropagation(); result.sites.forEach(s => selected.add(s)); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); this.render(box, btn, result, info, cached); }; const none = document.createElement('button'); none.className = 'iyuu-btn'; none.textContent = '清空'; none.onclick = e => { e.preventDefault(); e.stopPropagation(); selected.clear(); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); this.render(box, btn, result, info, cached); }; const dl = document.createElement('button'); dl.className = 'iyuu-btn'; dl.textContent = '下载种子'; dl.onclick = e => { e.preventDefault(); e.stopPropagation(); this.downloadSelected(selected); }; const open = document.createElement('button'); open.className = 'iyuu-btn'; open.textContent = '打开选中'; open.onclick = e => { e.preventDefault(); e.stopPropagation(); const urls = [...selected].filter(s => s.url); if (!urls.length) { UI.toast('未勾选可跳转站点'); return; } urls.forEach(s => this.openTab(s.url)); UI.toast(`已打开 ${urls.length} 个站点`); }; wrap.append(all, none, dl, open); }
            box.appendChild(wrap);
        }
    };

    function main() {
        Config.load(); UI.initStyle();
        if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('配置 IYUU', () => UI.showConfig());
        const boot = () => { Core.init(); if (!Store.get(KEYS.configured, false) && !document.querySelector('.iyuu-modal-bg')) UI.showConfig(); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
        if (location.hostname === 'bangumi.moe') new MutationObserver(() => setTimeout(boot, 300)).observe(document.body, { childList: true, subtree: true });
    }

    main();
})();

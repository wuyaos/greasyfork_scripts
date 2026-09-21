import { COLORS, KEYS, log, normalizeSiteKey } from './config.js';

import { Config, Store } from './settings.js';

import { MoviePilot } from './moviepilot.js';

import { SiteIndex } from './site-index.js';

import { ResultCache } from './cache.js';



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
                .iyuu-check-line small{display:block;margin-top:3px;color:${COLORS.info};font-weight:400;line-height:1.35}
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
                .iyuu-site-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid #cfd6df;border-radius:4px;background:#f1f3f5;color:#6b7280;cursor:pointer;font-size:12px;opacity:.72}
                .iyuu-site-chip:hover{border-color:#9aa4b2;background:#e9ecef;color:#4b5563;opacity:.9}
                .iyuu-site-chip.selected{border-color:${COLORS.success};background:${COLORS.success};color:#fff;opacity:1;font-weight:600}
                .iyuu-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:8px;margin:0 -16px;padding:10px 16px;background:#f6f7f9;border-top:1px solid #dfe4ea}
                .iyuu-actions button{margin:0}
                .iyuu-picker{width:100%;margin-top:8px;padding:8px;border:1px solid #dfe4ea;border-radius:6px;background:#fff;box-sizing:border-box;overflow-x:auto;color:#333}
                .iyuu-picker-title{font-weight:700;margin-bottom:6px;color:#1f2933}
                .iyuu-picker-table{width:100%;border-collapse:collapse;font-size:12px}
                .iyuu-picker-table th,.iyuu-picker-table td{border:1px solid #dfe4ea;padding:5px 6px;text-align:left;vertical-align:top}
                .iyuu-picker-table th{background:#f6f7f9;font-weight:700;white-space:nowrap}
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
            modal.innerHTML = `<h2>IYUU 配置</h2><div class="iyuu-body"><section class="iyuu-section"><h3 class="iyuu-section-title">基础设置</h3><div class="iyuu-field"><label for="iyuuToken">IYUU Token</label>${this.secretInput('iyuuToken')}</div><div class="iyuu-field"><label for="iyuuMteamKey">M-Team API Key（可选）</label>${this.secretInput('iyuuMteamKey')}</div><label class="iyuu-check-line"><input id="iyuuAutoQuery" type="checkbox"> 自动查询（默认关闭，命中缓存时不会重复请求）</label><label class="iyuu-check-line"><input id="iyuuGazelleDl" type="checkbox"> <span><b>允许使用 FL（消耗令牌）</b><small>Gazelle 站点（如 GPW）部分种子只有 FL 下载链接，使用会消耗下载令牌；关闭时这类种子将跳过并提示。DL 链接和 Haidan 不受影响。</small></span></label></section><section class="iyuu-section"><h3 class="iyuu-section-title">MoviePilot 联动</h3><div class="iyuu-field"><label for="iyuuMpUrl">MoviePilot 地址</label><input id="iyuuMpUrl" type="text"></div><div class="iyuu-field"><label for="iyuuMpAuth">认证方式</label><select id="iyuuMpAuth"><option value="password">用户名密码</option><option value="apikey">API Key</option></select></div><div id="iyuuMpPasswordFields"><div class="iyuu-field"><label for="iyuuMpUser">用户名</label><input id="iyuuMpUser" type="text"></div><div class="iyuu-field"><label for="iyuuMpPass">密码</label>${this.secretInput('iyuuMpPass')}</div></div><div id="iyuuMpApiKeyFields"><div class="iyuu-field"><label for="iyuuMpApiKey">API Key</label>${this.secretInput('iyuuMpApiKey')}</div></div></section><section class="iyuu-section"><h3 class="iyuu-section-title">索引站点</h3><div class="iyuu-site-toolbar"><input id="iyuuSiteSearch" type="text" placeholder="搜索名称 / 域名 / 别名"><button id="iyuuRefreshSites">刷新索引</button><button id="iyuuDetectSites">从 MP 选择</button><button id="iyuuDetectLogin">选择已登录</button><button id="iyuuAllSites">全选</button><button id="iyuuClearSites">清空</button><button id="iyuuClearCache">清缓存</button><button id="iyuuResetConfig">重置</button></div><div id="iyuuSiteGrid" class="iyuu-site-grid"></div></section><div class="iyuu-actions"><button class="iyuu-cancel">关闭</button><button class="iyuu-save">保存</button></div></div>`;
            bg.appendChild(modal); document.body.appendChild(bg);
            this.bindSecretToggles(modal);
            modal.querySelector('#iyuuToken').value = Config.token;
            modal.querySelector('#iyuuMteamKey').value = Config.mteamKey;
            modal.querySelector('#iyuuAutoQuery').checked = Config.autoQuery;
            modal.querySelector('#iyuuGazelleDl').checked = Config.gazelleDl;
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
                gazelleDl: modal.querySelector('#iyuuGazelleDl').checked,
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



export { UI };

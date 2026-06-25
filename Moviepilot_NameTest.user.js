// ==UserScript==
// @name         moviepilotNameTest(自用)
// @namespace    http://tampermonkey.net/
// @version      3.5.4
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
// @grant        GM_setClipboard
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @connect      *
// @license      MIT
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/moviepilot.png
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/Moviepilot_NameTest.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/Moviepilot_NameTest.user.js
// ==/UserScript==

// changelog:
// - 3.5.4: 收紧公共 BT 与 GPW 匹配到详情页，避免首页/列表页误注入，IPT 匹配收紧到详情页。
// - 3.5.3: 增强 lazy 详情页识别缓存/自动识别恢复，优化配置密钥显示切换，并限制 Monika 只匹配数字种子详情页。

(function () {
    'use strict';

    // ——————————————————————————————————————
    // [1] 配置 & 常量 (CONFIG & CONSTANTS)
    // ——————————————————————————————————————

    const SCRIPT_NAME = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';
    const MTEAM_API_BASE = 'https://api.m-team.cc/api';
    const MTEAM_DETAIL_TTL = 5 * 60 * 1000;
    const mteamDetailCache = new Map();
    const mteamDetailPending = new Map();

    const CONSTANTS = {
        API_ENDPOINTS: {
            LOGIN: '/api/v1/login/access-token',
            RECOGNIZE: '/api/v1/media/recognize',
            RECOGNIZE_BY_ID: '/api/v1/media/tmdb:',
            GET_SITE: '/api/v1/site/domain/',
            DOWNLOAD: '/api/v1/download/',
            DOWNLOAD_ADD: '/api/v1/download/add',
            GET_CLIENTS: '/api/v1/download/clients',
        },
        ALLOWED_HOSTS: ['api.themoviedb.org', 'api.m-team.cc'],
        RECOGNIZE_CACHE: {
            KEY: 'mp_recognize_cache',
            TTL_MS: 24 * 60 * 60 * 1000,  // 24 小时
            MAX_ENTRIES: 200
        },
        COLORS: {
            PRIMARY: '#2775b6',
            SECONDARY: '#e6702e',
            SUCCESS: '#5bb053',
            WARNING: '#c54640',
            INFO: '#677489',
            PURPLE: '#701eeb',
            BTN_SAVE: '#27ae60',
            BTN_SAVE_HOVER: '#229954',
            BTN_CANCEL: '#e74c3c',
            BTN_CANCEL_HOVER: '#c0392b',
        },
        DEFAULT_CONFIG: {
            moviepilotUrl: 'http://127.0.0.1:3000',
            moviepilotUser: 'admin',
            moviepilotPassword: '',
            moviepilotAuthMode: 'password',
            moviepilotApiKey: '',
            moviepilotTmdbKey: '',
            moviepilotMteamApiKey: '',
            moviepilotAutoQuery: false
        }
    };

    const CONFIG = {
        _values: {},

        load() {
            this._values.url = GM_getValue('moviepilotUrl', CONSTANTS.DEFAULT_CONFIG.moviepilotUrl);
            this._values.user = GM_getValue('moviepilotUser', CONSTANTS.DEFAULT_CONFIG.moviepilotUser);
            this._values.pass = GM_getValue('moviepilotPassword', CONSTANTS.DEFAULT_CONFIG.moviepilotPassword);
            this._values.authMode = GM_getValue('moviepilotAuthMode', CONSTANTS.DEFAULT_CONFIG.moviepilotAuthMode);
            this._values.apiKey = GM_getValue('moviepilotApiKey', CONSTANTS.DEFAULT_CONFIG.moviepilotApiKey);
            this._values.tmdbKey = GM_getValue('moviepilotTmdbKey', CONSTANTS.DEFAULT_CONFIG.moviepilotTmdbKey);
            this._values.mteamApiKey = GM_getValue('moviepilotMteamApiKey', CONSTANTS.DEFAULT_CONFIG.moviepilotMteamApiKey);
            this._values.autoQuery = Boolean(GM_getValue('moviepilotAutoQuery', CONSTANTS.DEFAULT_CONFIG.moviepilotAutoQuery));
            GM_log(`[${SCRIPT_NAME}] 配置已加载。`);
        },

        save({ url, user, pass, authMode, apiKey, tmdbKey, mteamApiKey, autoQuery }) {
            GM_setValue('moviepilotUrl', url);
            GM_setValue('moviepilotUser', user);
            GM_setValue('moviepilotPassword', pass);
            GM_setValue('moviepilotAuthMode', authMode || 'password');
            GM_setValue('moviepilotApiKey', apiKey || '');
            GM_setValue('moviepilotTmdbKey', tmdbKey || '');
            GM_setValue('moviepilotMteamApiKey', mteamApiKey || '');
            GM_setValue('moviepilotAutoQuery', Boolean(autoQuery));
            this.load();
            GM_log(`[${SCRIPT_NAME}] 配置已保存。`);
            UI.showToast(`[${SCRIPT_NAME}] 配置已保存。部分更改可能需要刷新页面生效。`);
        },

        reset() {
            if (confirm(`[${SCRIPT_NAME}]\n\n确定要重置所有配置吗？\n\n这将清除所有存储的 Moviepilot 设置并刷新页面。`)) {
                GM_deleteValue('moviepilotUrl');
                GM_deleteValue('moviepilotUser');
                GM_deleteValue('moviepilotPassword');
                GM_deleteValue('moviepilotAuthMode');
                GM_deleteValue('moviepilotApiKey');
                GM_deleteValue('moviepilotTmdbKey');
                GM_deleteValue('moviepilotMteamApiKey');
                GM_deleteValue('moviepilotAutoQuery');
                try { GM_deleteValue(CONSTANTS.RECOGNIZE_CACHE.KEY); } catch (e) {}
                GM_log(`[${SCRIPT_NAME}] 所有配置已重置。正在刷新页面...`);
                location.reload();
            }
        },

        get(key) {
            return this._values[key];
        },

        ensure() {
            if (!this.get('url')) {
                GM_log(`[${SCRIPT_NAME}] 配置不完整，显示配置弹窗。`);
                UI.showConfigModal(true);
                return false;
            }
            const mode = this.get('authMode') || 'password';
            if (mode === 'password' && (!this.get('user') || !this.get('pass'))) {
                GM_log(`[${SCRIPT_NAME}] 密码模式配置不完整，显示配置弹窗。`);
                UI.showConfigModal(true);
                return false;
            }
            if (mode === 'apikey' && !this.get('apiKey')) {
                GM_log(`[${SCRIPT_NAME}] API Key 模式配置不完整，显示配置弹窗。`);
                UI.showConfigModal(true);
                return false;
            }
            GM_log(`[${SCRIPT_NAME}] 配置完整。URL: ${this.get('url')}, AuthMode: ${mode}`);
            return true;
        }
    };

    const firstOf = (items, predicate) => {
        for (const item of items || []) {
            if (predicate(item)) return item;
        }
        return undefined;
    };


    // ——————————————————————————————————————
    // [2] UI 模块 (UI MODULE)
    // ——————————————————————————————————————

    const UI = {
        configModal: {
            element: null,
            backdrop: null,
        },

        showConfigModal(isInitialSetup = false) {
            if (this.configModal.element) return;

            this._injectModalCSS();

            this.configModal.backdrop = document.createElement('div');
            this.configModal.backdrop.id = 'mpConfigModalBackdrop';
            this.configModal.element = document.createElement('div');
            this.configModal.element.id = 'mpConfigModal';

            this.configModal.element.innerHTML = this._getConfigModalHTML();
            this.configModal.backdrop.appendChild(this.configModal.element);
            document.body.appendChild(this.configModal.backdrop);

            this._addModalEventListeners(isInitialSetup);
        },

        closeConfigModal() {
            if (this.configModal.backdrop) {
                this.configModal.backdrop.remove();
            }
            this.configModal.element = null;
            this.configModal.backdrop = null;
        },

        _addModalEventListeners(isInitialSetup) {
            const modeSelect = this.configModal.element.querySelector('#mpAuthMode');
            const passFields = this.configModal.element.querySelector('#mpPasswordFields');
            const apiKeyFields = this.configModal.element.querySelector('#mpApiKeyFields');
            this._bindSecretToggles(this.configModal.element);

            const toggleAuthFields = () => {
                const mode = modeSelect.value;
                passFields.style.display = mode === 'password' ? '' : 'none';
                apiKeyFields.style.display = mode === 'apikey' ? '' : 'none';
            };
            modeSelect.addEventListener('change', toggleAuthFields);

            this.configModal.element.querySelector('.mp-save-btn').addEventListener('click', () => {
                const newConfig = {
                    url: document.getElementById('mpUrl').value.trim().replace(/\/$/, ''),
                    user: document.getElementById('mpUser').value.trim(),
                    pass: document.getElementById('mpPass').value,
                    authMode: modeSelect.value,
                    apiKey: document.getElementById('mpApiKey').value.trim(),
                    tmdbKey: document.getElementById('mpTmdbKey').value.trim(),
                    mteamApiKey: document.getElementById('mpMteamApiKey').value.trim(),
                    autoQuery: document.getElementById('mpAutoQuery').checked
                };

                if (!newConfig.url) {
                    alert('请填写 MoviePilot 地址。');
                    return;
                }
                if (newConfig.authMode === 'password' && (!newConfig.user || !newConfig.pass)) {
                    alert('密码模式下必须填写用户名和密码。');
                    return;
                }
                if (newConfig.authMode === 'apikey' && !newConfig.apiKey) {
                    alert('API Key 模式下必须填写 API Key。');
                    return;
                }

                CONFIG.save(newConfig);
                this.closeConfigModal();
            });

            const cancelAction = () => {
                if (isInitialSetup) {
                    GM_log(`[${SCRIPT_NAME}] 首次配置是必需的。请填写并保存配置。`);
                } else {
                    this.closeConfigModal();
                }
            };

            this.configModal.element.querySelector('.mp-cancel-btn').addEventListener('click', cancelAction);
            this.configModal.backdrop.addEventListener('click', (event) => {
                if (event.target === this.configModal.backdrop) cancelAction();
            });

            // 测试 MoviePilot 连通性
            this.configModal.element.querySelector('.mp-test-mp-btn').addEventListener('click', async (e) => {
                const btn = e.target;
                const mpUrl = document.getElementById('mpUrl').value.trim().replace(/\/$/, '');
                const authMode = modeSelect.value;
                if (!mpUrl) { alert('请先填写 MoviePilot 地址'); return; }
                btn.disabled = true; btn.textContent = '测试中...';
                try {
                    const testUrl = `${mpUrl}/api/v1/site/statistic`;
                    const headers = {};
                    if (authMode === 'apikey') {
                        const key = document.getElementById('mpApiKey').value.trim();
                        if (!key) { alert('请填写 API Key'); btn.disabled = false; btn.textContent = '测试连接'; return; }
                        headers['X-API-KEY'] = key;
                    } else {
                        const user = document.getElementById('mpUser').value.trim();
                        const pass = document.getElementById('mpPass').value;
                        if (!user || !pass) { alert('请填写用户名密码'); btn.disabled = false; btn.textContent = '测试连接'; return; }
                        const loginRes = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                            method: 'POST', url: `${mpUrl}/api/v1/login/access-token`,
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            data: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
                            responseType: 'json', onload: resolve, onerror: reject
                        }));
                        if (loginRes.status !== 200) throw new Error(`登录失败: ${loginRes.status}`);
                        headers['Authorization'] = `bearer ${loginRes.response?.access_token}`;
                    }
                    const res = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                        method: 'GET', url: testUrl, headers, responseType: 'json', onload: resolve, onerror: reject
                    }));
                    if (res.status === 200) {
                        btn.textContent = '连接成功'; btn.style.color = '#27ae60';
                    } else {
                        btn.textContent = `失败: ${res.status}`; btn.style.color = '#e74c3c';
                    }
                } catch (err) {
                    btn.textContent = '连接失败'; btn.style.color = '#e74c3c';
                }
                setTimeout(() => { btn.disabled = false; btn.textContent = '测试连接'; btn.style.color = ''; }, 3000);
            });
        },

        _getConfigModalHTML() {
            const currentMode = CONFIG.get('authMode') || 'password';
            const showPass = currentMode === 'password';
            const showApiKey = currentMode === 'apikey';
            const secretInput = (id, value = '', placeholder = '') => this._secretInputHTML(id, value, placeholder);
            return `
                <h2>MoviePilot 配置</h2>
                <div class="mp-modal-body">
                    <section class="mp-config-section">
                        <h3>连接设置</h3>
                        <div class="mp-field">
                            <label for="mpUrl">MoviePilot 地址</label>
                            <input type="text" id="mpUrl" placeholder="例如：http://192.168.1.100:3000" value="${CONFIG.get('url') || ''}">
                        </div>
                        <div class="mp-field">
                            <label for="mpAuthMode">认证方式</label>
                            <select id="mpAuthMode">
                                <option value="password" ${showPass ? 'selected' : ''}>用户名密码</option>
                                <option value="apikey" ${showApiKey ? 'selected' : ''}>API Key</option>
                            </select>
                        </div>
                        <div id="mpPasswordFields" style="${showPass ? '' : 'display:none;'}">
                            <div class="mp-field">
                                <label for="mpUser">用户名</label>
                                <input type="text" id="mpUser" value="${CONFIG.get('user') || ''}">
                            </div>
                            <div class="mp-field">
                                <label for="mpPass">密码</label>
                                ${secretInput('mpPass', CONFIG.get('pass') || '')}
                            </div>
                        </div>
                        <div id="mpApiKeyFields" style="${showApiKey ? '' : 'display:none;'}">
                            <div class="mp-field">
                                <label for="mpApiKey">API Key</label>
                                ${secretInput('mpApiKey', CONFIG.get('apiKey') || '')}
                                <p class="mp-help">可在 MoviePilot 设置的 API 令牌中获取。</p>
                            </div>
                        </div>
                    </section>
                    <section class="mp-config-section">
                        <h3>识别设置</h3>
                        <div class="mp-field">
                            <label for="mpTmdbKey">TMDB API Key（可选）</label>
                            ${secretInput('mpTmdbKey', CONFIG.get('tmdbKey') || '', '用于识别失败时的智能匹配')}
                        </div>
                        <label class="mp-check-line"><input type="checkbox" id="mpAutoQuery" ${CONFIG.get('autoQuery') ? 'checked' : ''}> 自动查询（默认关闭，命中缓存时不会重复请求）</label>
                    </section>
                    <section class="mp-config-section">
                        <h3>M-Team 设置</h3>
                        <div class="mp-field">
                            <label for="mpMteamApiKey">M-Team API Key（可选）</label>
                            ${secretInput('mpMteamApiKey', CONFIG.get('mteamApiKey') || '')}
                            <p class="mp-help">用于 M-Team 详情页推送时调用 genDlToken 获取种子下载链接。</p>
                        </div>
                    </section>
                    <div class="mp-modal-buttons">
                        <button class="mp-test-mp-btn">测试连接</button>
                        <button class="mp-cancel-btn">取消</button>
                        <button class="mp-save-btn">保存</button>
                    </div>
                </div>
            `;
        },

        _eyeIcon(hidden = true) {
            return hidden
                ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.2-5.5 9.2-5.5S21.2 12 21.2 12s-3.2 5.5-9.2 5.5S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.4"/></svg>'
                : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.2-5.5 9.2-5.5c1.7 0 3.2.45 4.45 1.1M21.2 12s-3.2 5.5-9.2 5.5c-1.65 0-3.1-.4-4.3-1.05M4.5 4.5l15 15"/><path d="M9.9 9.9a2.4 2.4 0 0 0 3.2 3.2"/></svg>';
        },

        _secretInputHTML(id, value = '', placeholder = '') {
            const safeId = UTILS.escapeHtml(id);
            const safeValue = UTILS.escapeHtml(value);
            const safePlaceholder = placeholder ? ` placeholder="${UTILS.escapeHtml(placeholder)}"` : '';
            return `<div class="mp-secret-field"><input type="password" id="${safeId}" value="${safeValue}"${safePlaceholder} autocomplete="off"><button type="button" class="mp-secret-toggle" data-target="${safeId}" aria-label="显示密钥" title="显示密钥">${this._eyeIcon(true)}</button></div>`;
        },

        _bindSecretToggles(root) {
            root.querySelectorAll('.mp-secret-toggle').forEach(btn => {
                const input = document.getElementById(btn.dataset.target || '');
                if (!input) return;
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const visible = input.type === 'text';
                    input.type = visible ? 'password' : 'text';
                    btn.dataset.visible = visible ? '0' : '1';
                    btn.setAttribute('aria-label', visible ? '显示密钥' : '隐藏密钥');
                    btn.title = visible ? '显示密钥' : '隐藏密钥';
                    btn.innerHTML = this._eyeIcon(visible);
                });
            });
        },

        _injectModalCSS() {
            const styleId = 'mp-config-modal-style';
            if (document.getElementById(styleId)) return;
            const css = `
                #mpConfigModalBackdrop { position: fixed; inset: 0; background-color: rgba(0,0,0,0.55); z-index: 2147483646; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
                #mpConfigModal { background-color: #f6f7f9; padding: 0; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.28); z-index: 2147483647; width: min(520px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: hidden; font-family: "Segoe UI", system-ui, sans-serif; color: #333; }
                #mpConfigModal .mp-modal-body { display: grid; gap: 12px; padding: 14px 16px 0; max-height: calc(100vh - 88px); overflow-y: auto; }
                #mpConfigModal h2 { margin: 0; font-size: 15px; font-weight: 700; color: #fff; background: ${CONSTANTS.COLORS.PRIMARY}; padding: 12px 18px; letter-spacing: 0; position: sticky; top: 0; z-index: 1; }
                #mpConfigModal .mp-config-section { border: 1px solid #dfe4ea; border-radius: 6px; background: #fff; padding: 12px; }
                #mpConfigModal .mp-config-section h3 { margin: 0 0 10px; color: #1f2933; font-size: 13px; font-weight: 700; }
                #mpConfigModal .mp-field { display: grid; gap: 4px; margin-bottom: 10px; }
                #mpConfigModal .mp-field:last-child { margin-bottom: 0; }
                #mpConfigModal label { display: block; margin: 0; font-weight: 600; color: #4b5563; font-size: 12px; }
                #mpConfigModal .mp-check-line { display: flex; align-items: center; gap: 6px; font-weight: 600; }
                #mpConfigModal .mp-check-line input { margin: 0; }
                #mpConfigModal input[type="text"], #mpConfigModal input[type="password"], #mpConfigModal select { box-sizing: border-box; width: 100%; height: 32px; padding: 6px 8px; margin: 0; border: 1px solid #cfd6df; border-radius: 4px; font-size: 13px; background: #fff; color: #222; }
                #mpConfigModal input[type="text"]:focus, #mpConfigModal input[type="password"]:focus, #mpConfigModal select:focus { border-color: ${CONSTANTS.COLORS.PRIMARY}; outline: none; box-shadow: 0 0 0 2px rgba(39,117,182,.14); }
                #mpConfigModal .mp-secret-field { position: relative; width: 100%; }
                #mpConfigModal .mp-secret-field input { padding-right: 34px; }
                #mpConfigModal .mp-secret-toggle { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; padding: 0; border: 0; background: transparent; color: #677489; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; }
                #mpConfigModal .mp-secret-toggle:hover { background: rgba(39,117,182,.10); color: ${CONSTANTS.COLORS.PRIMARY}; }
                #mpConfigModal .mp-secret-toggle svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
                #mpConfigModal .mp-help { margin: 2px 0 0; color: #777; font-size: 12px; line-height: 1.45; }
                #mpConfigModal .mp-modal-buttons { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 8px; margin: 0 -16px; padding: 10px 16px; background: #f6f7f9; border-top: 1px solid #dfe4ea; }
                #mpConfigModal .mp-test-mp-btn { margin-right: auto; background-color: ${CONSTANTS.COLORS.PRIMARY}; color: white; }
                #mpConfigModal .mp-test-mp-btn:hover { filter: brightness(.96); }
                #mpConfigModal button { height: 32px; padding: 0 12px; margin: 0; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px; transition: background-color 0.2s, filter 0.2s; }
                #mpConfigModal button:disabled { opacity: .7; cursor: not-allowed; }
                #mpConfigModal button.mp-save-btn { background-color: ${CONSTANTS.COLORS.BTN_SAVE}; color: white; }
                #mpConfigModal button.mp-save-btn:hover { background-color: ${CONSTANTS.COLORS.BTN_SAVE_HOVER}; }
                #mpConfigModal button.mp-cancel-btn { background-color: ${CONSTANTS.COLORS.BTN_CANCEL}; color: white; }
                #mpConfigModal button.mp-cancel-btn:hover { background-color: ${CONSTANTS.COLORS.BTN_CANCEL_HOVER}; }
                @media(max-width:520px){#mpConfigModalBackdrop{padding:10px}#mpConfigModal{width:calc(100vw - 20px);max-height:calc(100vh - 20px)}#mpConfigModal .mp-modal-body{padding:12px 12px 0}#mpConfigModal .mp-modal-buttons{margin:0 -12px;padding:10px 12px;flex-wrap:wrap}#mpConfigModal .mp-test-mp-btn{margin-right:0}}
            `;
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style);
        },

        renderTag(text, color) {
            return `<span style="background-color:${color};border:1px solid ${color};color:#ffffff;display:inline-flex;align-items:center;gap:.35em;border-radius:4px;font:inherit;line-height:1.45;padding:.12em .5em;font-weight:600;text-decoration:none;vertical-align:middle;">${UTILS.escapeHtml(text)}</span>`;
        },

        renderActionButton(action, status, color, state = 'idle', title = '') {
            const label = `${action}（${status}）`;
            const safeTitle = title ? ` title="${UTILS.escapeHtml(title)}"` : '';
            return `<button type="button" class="mp-recognize-trigger mp-action-button" data-state="${UTILS.escapeHtml(state)}"${safeTitle} style="background-color:${color};border:1px solid ${color};color:#ffffff;display:inline-flex;align-items:center;gap:.35em;border-radius:4px;font:inherit;line-height:1.45;padding:.12em .6em;font-weight:600;text-decoration:none;vertical-align:middle;cursor:pointer;">${UTILS.escapeHtml(label)}</button>`;
        },

        showToast(message, duration = 3000) {
            const toastId = 'mp-toast-message';
            // 移除已存在的 toast
            const existingToast = document.getElementById(toastId);
            if (existingToast) {
                existingToast.remove();
            }

            const toast = document.createElement('div');
            toast.id = toastId;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: ${CONSTANTS.COLORS.SUCCESS};
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                z-index: 2147483647;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: opacity 0.3s ease-in-out;
                opacity: 0;
            `;
            document.body.appendChild(toast);

            // Fade in
            setTimeout(() => {
                toast.style.opacity = '1';
            }, 10);

            // Fade out and remove
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    toast.remove();
                }, 300); // 等待淡出动画完成
            }, duration);
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
        defaultLabel: 'MoviePilot',
        productId: 'mp',
        gridLabelClass: 'mp-grid-label',
        gridContentClass: 'mp-grid-content'
    });

    // ——————————————————————————————————————
    // [3] API 模块 (API MODULE)
    // ——————————————————————————————————————

    const API = {
        _sessionToken: null,

        _isAllowedRequestUrl(rawUrl) {
            try {
                const host = new URL(rawUrl, window.location.origin).hostname.toLowerCase();
                if (CONSTANTS.ALLOWED_HOSTS.includes(host)) return true;
                const mpUrl = CONFIG.get('url');
                if (!mpUrl) return false;
                const mpHost = new URL(mpUrl).hostname.toLowerCase();
                return host === mpHost;
            } catch (e) {
                return false;
            }
        },

        _buildAuthHeaders(token) {
            const mode = CONFIG.get('authMode') || 'password';
            if (mode === 'apikey') {
                return {
                    "user-agent": navigator.userAgent,
                    "X-API-KEY": CONFIG.get('apiKey') || ''
                };
            }
            return {
                "user-agent": navigator.userAgent,
                "Authorization": token ? `bearer ${token}` : ''
            };
        },

        _request(options) {
            return new Promise((resolve, reject) => {
                const { method, url, data, headers, responseType, token, absolute = false } = options;
                const fullUrl = absolute || /^https?:\/\//i.test(url) ? url : (CONFIG.get('url') + url);

                if (!this._isAllowedRequestUrl(fullUrl)) {
                    GM_log(`[${SCRIPT_NAME}] 请求被白名单守卫拦截: ${fullUrl}`);
                    reject({ status: 0, message: 'Blocked by host guard' });
                    return;
                }

                const finalHeaders = {
                    "accept": "application/json",
                    "user-agent": navigator.userAgent,
                    ...headers
                };

                if (token && !finalHeaders["Authorization"] && !finalHeaders["X-API-KEY"]) {
                    finalHeaders["Authorization"] = `bearer ${token}`;
                }

                GM_xmlhttpRequest({
                    method,
                    url: fullUrl,
                    data,
                    headers: finalHeaders,
                    responseType,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) {
                            resolve(res.response);
                        } else {
                            reject({ status: res.status, response: res.response, message: `HTTP Error ${res.status}` });
                        }
                    },
                    onerror: (err) => {
                        GM_log(`[${SCRIPT_NAME}] API Request Error:`, err);
                        reject({ message: 'Network or request error', error: err });
                    }
                });
            });
        },

        async login(retryCount = 0) {
            const MAX_RETRIES = 3;
            const RETRY_INTERVAL = 1000;

            if (!CONFIG.get('url') || !CONFIG.get('user') || !CONFIG.get('pass')) {
                throw new Error('配置不完整');
            }

            try {
                const res = await this._request({
                    method: 'POST',
                    url: CONSTANTS.API_ENDPOINTS.LOGIN,
                    data: `username=${encodeURIComponent(CONFIG.get('user'))}&password=${encodeURIComponent(CONFIG.get('pass'))}`,
                    headers: { "content-type": "application/x-www-form-urlencoded" },
                    responseType: 'json'
                });

                if (res && res.access_token) {
                    this._sessionToken = res.access_token;
                    return res.access_token;
                }
                throw new Error('无效的登录响应');

            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] 登录失败 (尝试 ${retryCount + 1}/${MAX_RETRIES})`, error);
                this._sessionToken = null;
                if (retryCount < MAX_RETRIES - 1) {
                    await new Promise(res => setTimeout(res, RETRY_INTERVAL));
                    return this.login(retryCount + 1);
                } else {
                    const status = error.status || 'N/A';
                    UI.showToast(`[${SCRIPT_NAME}] 登录 Moviepilot 失败！已尝试 ${MAX_RETRIES} 次，状态: ${status}`);
                    throw new Error(`登录失败，已达最大重试次数`);
                }
            }
        },

        async getAuthenticatedToken() {
            const mode = CONFIG.get('authMode') || 'password';
            if (mode === 'apikey') {
                if (!CONFIG.get('apiKey')) throw new Error('API Key 未配置');
                return CONFIG.get('apiKey');
            }
            if (this._sessionToken) {
                return this._sessionToken;
            }
            return await this.login();
        },

        async recognize(title, subtitle) {
            const token = await this.getAuthenticatedToken();
            const url = `${CONSTANTS.API_ENDPOINTS.RECOGNIZE}?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle || '')}`;
            return this._request({ method: 'GET', url, headers: this._buildAuthHeaders(token), responseType: 'json' });
        },

        async recognizeById(tmdbId, typeName) {
            const token = await this.getAuthenticatedToken();
            const url = `${CONSTANTS.API_ENDPOINTS.RECOGNIZE_BY_ID}${tmdbId}?type_name=${encodeURIComponent(typeName)}`;
            return this._request({ method: 'GET', url, headers: this._buildAuthHeaders(token), responseType: 'json' });
        },

        async searchTmdb(query, type = '') {
            const key = (CONFIG.get('tmdbKey') || '').trim();
            if (!key) return [];
            const path = type ? `search/${type}` : 'search/multi';
            const url = `https://api.themoviedb.org/3/${path}?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&language=zh-CN`;
            try {
                const res = await this._request({ method: 'GET', url, responseType: 'json', absolute: true });
                return res?.results || [];
            } catch (e) {
                GM_log(`[${SCRIPT_NAME}] TMDB 搜索失败:`, e);
                return [];
            }
        },

        async getSite() {
            const token = await this.getAuthenticatedToken();
            const url = `${CONSTANTS.API_ENDPOINTS.GET_SITE}${window.location.hostname}`;
            return this._request({ method: 'GET', url, headers: this._buildAuthHeaders(token), responseType: 'json' });
        },

        async download(media_info, torrent_info) {
            const token = await this.getAuthenticatedToken();
            // 修复 media_info 中字符串化的数组/对象字段
            const fixedMedia = { ...media_info };
            for (const [k, v] of Object.entries(fixedMedia)) {
                if (typeof v === 'string' && v.startsWith('[')) {
                    try { fixedMedia[k] = JSON.parse(v); } catch (_) {}
                }
            }
            const download_info = { media_in: fixedMedia, torrent_in: torrent_info };
            const res = await this._request({
                method: 'POST',
                url: CONSTANTS.API_ENDPOINTS.DOWNLOAD,
                data: JSON.stringify(download_info),
                headers: { ...this._buildAuthHeaders(token), "content-type": "application/json" },
                responseType: 'json'
            });
            // MoviePilot 可能返回 200 但 success=false
            if (res && res.success === false) {
                throw { status: 200, message: res.message || '推送被 MoviePilot 拒绝', response: res };
            }
            return res;
        },

        async getClients() {
            const token = await this.getAuthenticatedToken();
            return this._request({ method: 'GET', url: CONSTANTS.API_ENDPOINTS.GET_CLIENTS, headers: this._buildAuthHeaders(token), responseType: 'json' });
        },

        async downloadAdd(torrentInfo, downloader) {
            const token = await this.getAuthenticatedToken();
            const payload = {
                torrent_in: {
                    title: torrentInfo.name,
                    description: torrentInfo.description,
                    page_url: window.location.href,
                    enclosure: torrentInfo.downloadLink,
                    size: torrentInfo.size,
                },
                downloader: downloader || null
            };
            const res = await this._request({
                method: 'POST',
                url: CONSTANTS.API_ENDPOINTS.DOWNLOAD_ADD,
                data: JSON.stringify(payload),
                headers: { ...this._buildAuthHeaders(token), "content-type": "application/json" },
                responseType: 'json'
            });
            if (res && res.success === false) {
                throw { status: 200, message: res.message || '推送被 MoviePilot 拒绝', response: res };
            }
            return res;
        },

        async getMteamDownloadLink() {
            try {
                const torrentId = window.location.pathname.split('/').pop();
                if (!torrentId) throw new Error("在URL中未找到种子ID");
                const apiKey = String(CONFIG.get('mteamApiKey') || '').trim();
                if (!apiKey) throw new Error("未配置 M-Team API Key");

                const tokenResponse = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: `${MTEAM_API_BASE}/torrent/genDlToken`,
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "x-api-key": apiKey
                        },
                        data: `id=${torrentId}`,
                        responseType: 'json',
                        onload: (res) => {
                            if (res.status === 200 && (res.response?.code === "0" || res.response?.code === 0)) {
                                resolve(res.response);
                            } else {
                                const errorMsg = res.response?.message || `HTTP ${res.status}`;
                                reject(new Error(`生成下载令牌失败: ${errorMsg}`));
                            }
                        },
                        onerror: (err) => reject(new Error('生成下载令牌时发生网络错误'))
                    });
                });

                if (tokenResponse && tokenResponse.data) {
                    return tokenResponse.data;
                } else {
                    throw new Error("下载令牌响应无效");
                }
            } catch (error) {
                GM_log(`[Moviepilot] M-Team adapter: 获取下载链接失败. ${error.message}`);
                throw error; // 将错误向上抛出
            }
        },

        async getMteamTorrentDetail(id) {
            const torrentId = id || window.location.pathname.match(/\/detail\/(\d+)/)?.[1] || '';
            if (!torrentId) throw new Error("在URL中未找到种子ID");
            const apiKey = String(CONFIG.get('mteamApiKey') || '').trim();
            if (!apiKey) throw new Error("未配置 M-Team API Key");
            const cached = mteamDetailCache.get(torrentId);
            if (cached && Date.now() - cached.ts < MTEAM_DETAIL_TTL) return cached.res;
            if (mteamDetailPending.has(torrentId)) return mteamDetailPending.get(torrentId);
            const pending = this._request({
                method: 'POST',
                url: `${MTEAM_API_BASE}/torrent/detail?id=${encodeURIComponent(torrentId)}&origin=1`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "x-api-key": apiKey
                },
                responseType: 'json',
                absolute: true
            }).then(res => {
                mteamDetailCache.set(torrentId, { res, ts: Date.now() });
                return res;
            }).finally(() => mteamDetailPending.delete(torrentId));
            mteamDetailPending.set(torrentId, pending);
            return pending;
        }
    };


    // ——————————————————————————————————————
    // [4] 站点适配器 (SITE ADAPTERS)
    // ——————————————————————————————————————

    // TODO: 后续适配 https://www.haidan.cc / https://www.yemapt.org / https://rousi.pro
    const BT_SITE_HELPERS = {
        text(selector, root = document) {
            return root.querySelector(selector)?.textContent?.trim() || '';
        },

        attr(selector, attr, root = document) {
            return root.querySelector(selector)?.getAttribute(attr) || '';
        },

        absoluteUrl(rawUrl) {
            if (!rawUrl) return '';
            try {
                return new URL(rawUrl, window.location.origin).href;
            } catch (e) {
                return '';
            }
        },

        findSize(text) {
            return UTILS.parseSize(String(text || '').replace(/iB/gi, 'B'));
        },

        findDownloadLink(selectors) {
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                const href = el?.href || el?.getAttribute?.('href') || el?.value || '';
                const url = this.absoluteUrl(href);
                if (url) return url;
            }
            return '';
        },

        info({ name, description = '', downloadLink = '', sizeText = '', mount, extra = {} }) {
            return name && mount?.target ? { name, description, downloadLink, size: this.findSize(sizeText), mount, extra } : null;
        },

        simpleDivInfo({ name, description, downloadLink, sizeText, target }) {
            return this.info({ name, description, downloadLink, sizeText, mount: Mount.afterNode(target) });
        },

        titleFromDownload(link) {
            return String(link?.textContent || link?.href?.split('/').pop() || '').replace(/\.torrent$/i, '').trim();
        }
    };

    const SITE_ADAPTERS = [
        {
            id: 'totheglory',
            matches: () => window.location.href.includes('totheglory.im/t/'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = document.querySelectorAll('.rowhead, .heading');
                    if (rows.length < 2) return null;
                    return tableMount('totheglory', rows[1].parentElement, 'MoviePilot');
                },
                mount => {
                    const rows = document.querySelectorAll('.rowhead, .heading');
                    if (rows.length < 2) return null;
                    const nameLink = rows[0].nextElementSibling?.querySelector('a');
                    const sizeString = firstOf(rows, row => row.textContent.includes('尺寸'))
                        ?.nextElementSibling?.innerText || '';
                    const description = document.querySelector("h1")?.textContent.replace(/.*?\[/, '[').trim() || '';
                    return {
                        name: nameLink?.textContent.replace(/^\[TTG\]\s*|\s*\.torrent$/g, '') || '',
                        downloadLink: document.querySelector("td[valign='top'] a")?.getAttribute("href") || '',
                        description: description,
                        size: UTILS.parseSize(sizeString || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'hdsky',
            matches: () => window.location.href.includes('hdsky.me/details.php'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = document.querySelectorAll('.rowhead');
                    if (rows.length < 4) return null;
                    return tableMount('hdsky', rows[1].parentElement, 'MoviePilot');
                },
                mount => {
                    const rows = document.querySelectorAll('.rowhead');
                    if (rows.length < 4) return null;
                    const nameRow = rows[0], downloadLinkRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                    const nameLink = nameRow.parentElement.querySelector('.rowfollow input[type="submit"]')?.value.replace(/^\[HDSky\]\s*|\s*\.torrent$/g, '') || '';
                    const downloadLink = downloadLinkRow.parentElement.querySelector('.rowfollow a')?.href || '';
                    const description = descRow.parentElement.querySelector('.rowfollow')?.textContent.trim() || '';
                    const sizeString = sizeRow.parentElement.querySelector('.rowfollow')?.textContent.trim() || '';
                    return {
                        name: nameLink,
                        downloadLink: downloadLink,
                        description: description,
                        size: UTILS.parseSize(sizeString || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'sjtu',
            matches: () => window.location.href.includes('pt.sjtu.edu.cn/details.php'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = document.querySelectorAll('.rowhead, .heading');
                    if (rows.length < 4) return null;
                    return tableMount('sjtu', rows[1].parentElement, 'MoviePilot');
                },
                mount => {
                    const rows = document.querySelectorAll('.rowhead, .heading');
                    if (rows.length < 4) return null;
                    const nameRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                    const nameLink = nameRow.nextElementSibling?.querySelector('a')?.textContent.replace(/^\[PT\]\.\s*|\s*\.torrent$/g, '') || '';
                    const downloadLink = nameRow.nextElementSibling?.querySelector('a')?.href || '';
                    const description = descRow.parentElement.querySelector('.rowfollow').textContent.trim() || '';
                    const sizeString = sizeRow.parentElement.querySelector('.rowfollow').textContent.trim();
                    return {
                        name: nameLink,
                        downloadLink: downloadLink,
                        description: description,
                        size: UTILS.parseSize(sizeString || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'hdcity',
            matches: () => window.location.href.includes('hdcity.city/t-'),
            ...AdapterRuntime.withMount(
                () => Mount.blockAfter(document.querySelector('div.block') || document.body),
                mount => {
                    const rows = document.querySelectorAll('.blocktitle');
                    if (rows.length < 4) return null;
                    const nameLink = rows[0].textContent;
                    const infoBlock = firstOf(rows, row => row.textContent.includes('基本信息'))?.nextElementSibling;
                    const sizeblock = infoBlock?.textContent || rows[1].nextElementSibling?.textContent || '';
                    const description = rows[0].parentElement?.querySelector('.blockcontent')?.textContent.trim() || "";
                    const downloadLink = rows[3].nextElementSibling?.querySelector('input[type="text"][title="DirectLink"]')?.value || document.querySelector('a[href*="download?id="]')?.href || "";

                    return {
                        name: nameLink,
                        downloadLink: downloadLink,
                        description: description,
                        size: UTILS.parseSize(sizeblock || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'monikadesign',
            matches: () => window.location.hostname === 'monikadesign.uk' && /^\/torrents\/\d+\/?$/.test(window.location.pathname),
            ...AdapterRuntime.withMount(
                () => {
                    const target = AutoFeedAnchors.monikaNameRow();
                    return target ? tableMount('monikadesign', target, 'MoviePilot') : Mount.prepend();
                },
                mount => {
                    const nameElement = document.querySelector('h1.text-center');
                    const descriptionElement = document.querySelector('h2.text-center');
                    const downloadLinkElement = document.querySelector('a.down[href*="/download/"]');
                    const size = document.querySelector('.torrent-size td:nth-child(2)')?.textContent?.trim() || '';
                    if (!nameElement) return null;

                    return {
                        name: nameElement.textContent.trim(),
                        description: descriptionElement ? descriptionElement.textContent.trim() : '',
                        downloadLink: downloadLinkElement ? downloadLinkElement.href : '',
                        size: UTILS.parseSize(size.replace(/iB/gi, 'B') || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'bangumi-moe',
            matches: () => window.location.hostname === 'bangumi.moe',
            ...AdapterRuntime.withMount(
                () => {
                    const modal = document.querySelector('.torrent-details-content');
                    const isDetailUrl = /^\/torrent\/[a-f0-9]+$/i.test(window.location.pathname);
                    if (!isDetailUrl && !modal) return null;
                    const root = modal || document;
                    const titleEl = root.querySelector('a.title-link b') || root.querySelector('a[href*="/torrent/"]');
                    const target = titleEl?.closest('.torrent-info') || root.querySelector('.torrent-info, .torrent-title') || document.body;
                    return Mount.afterNode(target);
                },
                mount => {
                    const modal = document.querySelector('.torrent-details-content');
                    const root = modal || document;
                    const titleEl = root.querySelector('a.title-link b') || root.querySelector('a[href*="/torrent/"]');
                    const title = titleEl?.textContent?.trim()
                        || BT_SITE_HELPERS.text('.torrent-title, .subject-title, .title')
                        || document.title.replace(/\s*[-|_].*$/, '').trim();
                    const downloadLink = (root.querySelector('a[href^="magnet:"]')?.href)
                        || BT_SITE_HELPERS.findDownloadLink(['a[href^="magnet:"]', 'a[href*="/download/"]', 'a[href*=".torrent"]']);
                    const sizeText = root.querySelector('.filesize')?.textContent || root.textContent || '';
                    return BT_SITE_HELPERS.info({ name: title, description: title, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                if (/^\/torrent\/[a-f0-9]+$/i.test(window.location.pathname)) return null;
                const items = document.querySelectorAll('div.torrent-title');
                return Array.from(items).map(item => {
                    const h3 = item.querySelector('h3');
                    const name = h3?.textContent?.trim();
                    if (!name) return null;
                    const torrentLink = item.querySelector('a[href*="/torrent/"]');
                    const torrentId = torrentLink?.href?.match(/\/torrent\/([a-f0-9]+)/i)?.[1] || '';
                    const info = BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: '',
                        sizeText: '',
                        target: item.closest('md-item, .torrent-row') || item.parentElement || item
                    });
                    if (info && torrentId) info._bangumiId = torrentId;
                    return info;
                }).filter(Boolean);
            }
        },
        {
            id: 'mikanani',
            matches: () => window.location.hostname === 'mikanani.me' && window.location.pathname.startsWith('/Home/'),
            ...AdapterRuntime.withMount(
                () => {
                    if (!window.location.pathname.includes('/Home/Episode/')) return null;
                    return Mount.afterNode(document.querySelector('.episode-title, h1, h2, .an-text') || document.body);
                },
                mount => {
                    const rawTitle = BT_SITE_HELPERS.text('.episode-title, h1, h2, .an-text')
                        || document.title.replace(/\s*-\s*Mikan Project\s*$/, '').trim();
                    const title = rawTitle.replace(/\s*\[\d+(?:\.\d+)?\s*(?:GB|MB|GiB|MiB)\]\s*$/i, '').trim();
                    const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                        'a[href^="magnet:"]',
                        'a[href*="/Download/"]',
                        'a[href*="/download/"]',
                        'a[href*=".torrent"]'
                    ]);
                    const description = BT_SITE_HELPERS.text('.episode-desc, .bangumi-desc, .content, .panel-body') || title;
                    const sizeText = (document.querySelector('.episode-title, h1, h2, .an-text')?.parentElement?.innerText) || '';
                    return BT_SITE_HELPERS.info({ name: title, description, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                if (!window.location.pathname.includes('/Home/Bangumi/')) return null;
                const rows = document.querySelectorAll('table tbody tr');
                return Array.from(rows).map(row => {
                    const titleEl = row.querySelector('a[href*="/Home/Episode/"]') || row.querySelector('a');
                    const name = titleEl?.textContent?.trim()?.replace(/\s*\[\d+(?:\.\d+)?\s*(?:GB|MB|GiB|MiB)\]\s*$/i, '').trim();
                    if (!name) return null;
                    const magnet = row.querySelector('input[data-magnet]')?.getAttribute('data-magnet') || '';
                    const tds = row.querySelectorAll('td');
                    const sizeText = tds[2]?.textContent?.trim() || '';
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: magnet,
                        sizeText,
                        target: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'comicat-kisssub',
            matches: () => /(^|\.)(comicat|kisssub)\.org$/i.test(window.location.hostname),
            ...AdapterRuntime.withMount(
                () => {
                    if (!/\/show-[a-f0-9]{40}\.html$/i.test(window.location.pathname)) return null;
                    return Mount.afterNode(document.querySelector('.c2 > .box > .intro') || document.querySelector('.intro, .basic_info') || document.body);
                },
                mount => {
                    const title = document.title.replace(/\s*-\s*(?:漫猫动漫|爱恋动漫)\s+[a-f0-9]{40}\s*$/i, '').trim();
                    const hash = window.location.pathname.match(/show-([a-f0-9]{40})\.html/i)?.[1] || '';
                    const encodedMagnet = Array.from(document.querySelectorAll('a[href*="magnet%3A"], a[href*="magnet%3a"]'))
                        .map(el => el.href.match(/magnet%3A.*$/i)?.[0])
                        .filter(Boolean)[0];
                    const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                        'a[href^="magnet:"]',
                        'a[href*=".torrent"]'
                    ]) || (encodedMagnet ? decodeURIComponent(encodedMagnet) : '') || (hash ? `magnet:?xt=urn:btih:${hash}` : '');
                    const description = BT_SITE_HELPERS.text('.intro, .entry-content, .content, .description, .panel-body, article') || title;
                    const sizeText = (document.querySelector('.torrent_files, .basic_info, .c2')?.innerText) || '';
                    return BT_SITE_HELPERS.info({ name: title, description, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                if (/\/show-[a-f0-9]{40}\.html$/i.test(window.location.pathname)) return null;
                const rows = document.querySelectorAll('tr.alt1, tr.alt2');
                return Array.from(rows).map(row => {
                    const titleEl = row.querySelector('a[href*="show-"]');
                    const name = titleEl?.textContent?.trim();
                    if (!name) return null;
                    const hash = titleEl.href.match(/show-([a-f0-9]{40})/i)?.[1] || '';
                    const downloadLink = hash ? `magnet:?xt=urn:btih:${hash}` : '';
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink,
                        sizeText: row.textContent,
                        target: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'acg-rip',
            matches: () => window.location.hostname === 'acg.rip',
            ...AdapterRuntime.withMount(
                () => {
                    if (!/^\/t\/\d+$/.test(window.location.pathname)) return null;
                    const panelContent = document.querySelector('.panel-body.post-content');
                    const heading = panelContent?.parentElement?.querySelector('.panel-heading');
                    return Mount.afterNode(heading || panelContent || document.body);
                },
                mount => {
                    const panelContent = document.querySelector('.panel-body.post-content');
                    const heading = panelContent?.parentElement?.querySelector('.panel-heading');
                    const title = heading?.textContent?.trim() || document.title.replace(/\s*-\s*ACG\.RIP\s*$/i, '').trim();
                    const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                        'a[href^="magnet:"]',
                        'a[href*=".torrent"]'
                    ]);
                    const description = BT_SITE_HELPERS.text('.panel-body.post-content') || title;
                    const sizeText = (panelContent?.innerText) || '';
                    return BT_SITE_HELPERS.info({ name: title, description, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                const rows = document.querySelectorAll('table tbody tr');
                return Array.from(rows).map(row => {
                    const titleEl = row.querySelector('a[href*="/t/"]');
                    const name = titleEl?.textContent?.trim();
                    if (!name || titleEl.href.includes('.torrent')) return null;
                    const torrent = row.querySelector('a[href*=".torrent"]')?.href || '';
                    const tds = row.querySelectorAll('td');
                    const sizeText = tds[tds.length - 1]?.textContent?.trim() || '';
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: torrent,
                        sizeText,
                        target: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'nyaa',
            matches: () => window.location.hostname === 'nyaa.si',
            ...AdapterRuntime.withMount(
                () => /^\/view\/\d+$/.test(window.location.pathname) ? Mount.afterNode(document.querySelector('.panel-heading') || document.body) : null,
                mount => {
                    const title = BT_SITE_HELPERS.text('h3.panel-title')
                        || document.title.replace(/\s*::\s*Nyaa\s*$/i, '').trim();
                    const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                        'a[href^="magnet:"]',
                        'a[href*="/download/"]',
                        'a[href*=".torrent"]'
                    ]);
                    const description = BT_SITE_HELPERS.text('#torrent-description') || title;
                    const sizeText = (document.querySelector('.panel-body .row, .torrent-file-list')?.parentElement?.innerText) || '';
                    return BT_SITE_HELPERS.info({ name: title, description, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                const rows = document.querySelectorAll('table.torrent-list tbody tr');
                return Array.from(rows).map(row => {
                    const titleEl = row.querySelector('td:nth-child(2) a:not(.comments)');
                    const name = titleEl?.textContent?.trim();
                    if (!name) return null;
                    const magnet = row.querySelector('a[href^="magnet:"]')?.href || '';
                    const torrent = row.querySelector('a[href*="/download/"]')?.href || '';
                    const size = row.querySelector('td:nth-child(4)')?.textContent?.trim() || '';
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: magnet || torrent,
                        sizeText: size,
                        target: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'beyond-hd',
            matches: () => window.location.hostname === 'beyond-hd.me' && window.location.pathname.startsWith('/torrents/'),
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.bhd-fl-button[href*="/download/"]');
                    const row = AutoFeedAnchors.bhdNameRow();
                    const target = row || document.querySelector('table.table-details') || dl?.closest('.text-center') || dl?.parentElement || document.querySelector('.panel-title')?.closest('.panel') || document.querySelector('h1') || document.body;
                    return row ? tableMount('beyond-hd', row, 'MoviePilot') : Mount.afterNode(target);
                },
                mount => {
                    const dl = document.querySelector('a.bhd-fl-button[href*="/download/"]');
                    return BT_SITE_HELPERS.info({
                        name: document.title.replace(/\s*\|\s*Torrents\s*\|\s*BeyondHD.*/i, '').trim(),
                        description: BT_SITE_HELPERS.text('.panel-body'),
                        downloadLink: dl?.href || '',
                        sizeText: BT_SITE_HELPERS.text('.panel-body'),
                        mount
                    });
                }
            )
        },
        {
            id: 'eiga',
            matches: () => window.location.hostname === 'eiga.moi' && window.location.pathname.startsWith('/torrents/'),
            ...AdapterRuntime.withMount(
                () => {
                    const holder = AutoFeedAnchors.unit3dActionHolder('mp', 'MoviePilot', document.querySelector('menu.torrent__buttons') || document.querySelector('article'));
                    return holder ? Mount.append(holder) : Mount.afterNode(document.querySelector('menu.torrent__buttons') || document.querySelector('article') || document.body);
                },
                mount => {
                    const dl = document.querySelector('a[href*="/torrents/download/"]');
                    return BT_SITE_HELPERS.info({
                        name: BT_SITE_HELPERS.text('h1.meta__title') || document.title.replace(/\s+-\s+Torrents.*/i, '').trim(),
                        description: BT_SITE_HELPERS.text('.meta__description,.bbcode-rendered'),
                        downloadLink: dl?.href || '',
                        sizeText: document.body.innerText,
                        mount
                    });
                }
            )
        },
        {
            id: 'hd-space',
            matches: () => window.location.hostname === 'hd-space.org' && window.location.search.includes('page=torrent-details'),
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.hdSpaceTorrentRow() || AutoFeedAnchors.hdSpaceInfoHashRow();
                    return row ? tableMount('hd-space', row, 'MoviePilot') : Mount.afterNode(document.querySelector('#mcol') || document.body);
                },
                mount => {
                    const dl = document.querySelector('a[href*="download.php"]');
                    const nameRow = AutoFeedAnchors.rowAfterName(document.querySelector('#mcol'));
                    return BT_SITE_HELPERS.info({
                        name: nameRow?.cells?.[1]?.textContent?.trim() || document.title,
                        description: document.body.innerText,
                        downloadLink: dl?.href || '',
                        sizeText: document.body.innerText,
                        mount
                    });
                }
            )
        },
        {
            id: 'iptorrents',
            matches: () => window.location.hostname === 'iptorrents.com' && window.location.pathname === '/torrent.php',
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.iptMovieInfoRow();
                    return row ? tableMount('iptorrents', row, 'MoviePilot') : Mount.afterNode(document.querySelector('h2') || document.body);
                },
                mount => {
                    const id = new URLSearchParams(window.location.search).get('id') || '';
                    const dl = firstOf(document.querySelectorAll('a[href*="download.php"]'), a => a.href.includes(`/${id}/`) || a.href.includes(`id=${id}`)) || document.querySelector('a[href*="download.php"][href$=".torrent"]');
                    const row = AutoFeedAnchors.iptMovieInfoRow();
                    const target = row || dl?.closest('.info,.dBox') || dl?.parentElement || dl || document.querySelector('h2') || document.body;
                    return BT_SITE_HELPERS.info({
                        name: BT_SITE_HELPERS.text('h2') || document.title.replace(/\s*-\s*IPTorrents.*/i, '').trim(),
                        description: '',
                        downloadLink: dl?.href || '',
                        sizeText: target?.textContent || '',
                        mount
                    });
                }
            )
        },
        {
            id: 'filelist',
            matches: () => window.location.hostname === 'filelist.io' && window.location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const row = dl?.closest('tr');
                    const target = AutoFeedAnchors.fileListAnchor('mp', 'MoviePilot') || row || dl?.closest('.cblock-innercontent') || dl?.parentElement || dl || document.querySelector('.cblock-content,.cblock,#maincolumn,#container,table') || document.body;
                    return Mount.append(target);
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    return BT_SITE_HELPERS.info({
                        name: BT_SITE_HELPERS.titleFromDownload(dl) || document.title.split(' :: ')[0].trim(),
                        description: document.title.split(' :: ')[0].trim(),
                        downloadLink: dl?.href || '',
                        sizeText: mount?.target?.textContent || '',
                        mount
                    });
                }
            )
        },
        {
            id: 'hudbt',
            matches: () => window.location.hostname === 'hudbt.hust.edu.cn' && window.location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const dts = Array.from(document.querySelectorAll('#outer dl.table > dt'));
                    const byLabel = label => firstOf(dts, dt => dt.textContent.includes(label))?.nextElementSibling;
                    const target = byLabel('下载') || dl?.parentElement || document.querySelector('#outer dl.table');
                    return target ? Mount.definitionAfter(target) : Mount.prepend();
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const dts = Array.from(document.querySelectorAll('#outer dl.table > dt'));
                    const byLabel = label => firstOf(dts, dt => dt.textContent.includes(label))?.nextElementSibling;
                    const title = BT_SITE_HELPERS.text('#page-title') || BT_SITE_HELPERS.titleFromDownload(dl) || document.title.match(/"([^"]+)"/)?.[1] || document.title;
                    const sub = byLabel('副标题')?.textContent || '';
                    const info = byLabel('基本信息')?.textContent || '';
                    const intro = byLabel('简介')?.textContent || '';
                    return BT_SITE_HELPERS.info({ name: title, description: sub || intro || title, downloadLink: dl?.href || '', sizeText: info || document.body.innerText, mount });
                }
            )
        },
        {
            id: 'greatposterwall',
            matches: () => window.location.hostname === 'greatposterwall.com' && window.location.pathname === '/torrents.php' && new URLSearchParams(window.location.search).get('torrentid'),
            ...AdapterRuntime.withMount(
                () => {
                    const tid = new URLSearchParams(window.location.search).get('torrentid');
                    const dl = document.querySelector(`a[href*="action=download"][href*="id=${tid}"]`);
                    const row = AutoFeedAnchors.gpwTorrentRow() || dl?.closest('tr');
                    return row ? Mount.tableColspanAfter(row, 'MoviePilot') : Mount.afterNode(document.querySelector(`#torrent${tid}`) || document.body);
                },
                mount => {
                    const tid = new URLSearchParams(window.location.search).get('torrentid');
                    const dl = document.querySelector(`a[href*="action=download"][href*="id=${tid}"]`);
                    const row = AutoFeedAnchors.gpwTorrentRow() || dl?.closest('tr');
                    const name = document.title.replace(/\s*::\s*Great Poster Wall.*/i, '').trim();
                    return BT_SITE_HELPERS.info({ name, description: document.title, downloadLink: dl?.href || '', sizeText: row?.textContent || '', mount });
                }
            )
        },
        {
            id: 'hhclub',
            matches: () => window.location.hostname === 'hhanclub.net' && window.location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const row = dl?.closest('tr');
                    const grid = dl?.closest('.grid');
                    const gridCell = AutoFeedAnchors.hhclubSubtitleValue() || (grid ? firstOf(grid.children, el => el.contains(dl)) : null);
                    const target = row || gridCell || dl?.parentElement || dl || document.body;
                    return row ? tableMount('hhclub', row, 'MoviePilot') : (gridCell ? Mount.gridPairAfter(gridCell) : Mount.afterNode(target));
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const title = BT_SITE_HELPERS.titleFromDownload(dl) || document.title.match(/"([^"]+)"/)?.[1] || document.title;
                    return BT_SITE_HELPERS.info({ name: title, description: title, downloadLink: dl?.href || '', sizeText: mount?.target?.textContent || '', mount });
                }
            )
        },
        {
            id: 'generic-nexusphp',
            matches: () => document.querySelector('.rowhead') && !window.location.href.includes('totheglory.im') && !window.location.href.includes('hdsky.me') && !window.location.href.includes('hdcity.city'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = document.querySelectorAll('.rowhead');
                    const nameRow = rows[0];
                    return tableMount('generic-nexusphp', AutoFeedAnchors.domesticActionRow() || nameRow?.parentElement, 'MoviePilot');
                },
                mount => {
                    const rows = document.querySelectorAll('.rowhead');
                    if (rows.length < 3) return null;
                    const nameRow = rows[0], descRow = rows[1], sizeRow = rows[2];
                    if (!nameRow.nextElementSibling || !descRow.nextElementSibling || !sizeRow.nextElementSibling) return null;
                    const nameLink = nameRow.nextElementSibling.querySelector('a');
                    let description;
                    description = descRow.nextElementSibling.innerText || '';
                    if ( descRow.nextElementSibling.innerText.includes('https://')) {
                        description = '';
                    }
                    return {
                        name: nameLink?.textContent || '',
                        downloadLink: nameLink?.href || '',
                        description: description,
                        size: UTILS.parseSize(sizeRow.nextElementSibling.innerText),
                        mount
                    };
                }
            )
        },
        {
            id: 'm-team',
            matches: () => /m-team\.(cc|io|vip)\/detail\//.test(window.location.href),
            findMount: () => {
                const holder = AutoFeedAnchors.mTeamActionHolder('mp', 'MoviePilot');
                return holder ? Mount.append(holder) : null;
            },
            getInfo: async () => {
                const tid = window.location.pathname.match(/\/detail\/(\d+)/)?.[1] || '';
                if (!CONFIG.get('mteamApiKey')) throw new Error('未配置 M-Team API Key');
                const res = await API.getMteamTorrentDetail(tid);
                const data = res?.data || res?.result || res;
                const name = data?.name || data?.title || data?.smallDescr || (tid ? `M-Team ${tid}` : 'M-Team');
                return {
                    name,
                    description: data?.smallDescr || data?.descr || data?.description || name,
                    size: Number(data?.size || data?.fileSize || data?.torrentSize || 0) || UTILS.parseSize(String(data?.sizeText || '')),
                    downloadLink: '',
                    extra: { mteamTid: tid }
                };
            }
        }
    ];

    const Site = {
        adapter: null,
        init() {
            this.adapter = null;
            for (const adapter of SITE_ADAPTERS) {
                try {
                    if (adapter.matches()) {
                        this.adapter = adapter;
                        break;
                    }
                } catch (error) {
                    GM_log(`[${SCRIPT_NAME}] Adapter match failed: ${adapter.id}`, error?.stack || error?.message || error);
                }
            }
            if (this.adapter) {
                GM_log(`[${SCRIPT_NAME}] Matched site: ${this.adapter.id}`);
            } else {
                GM_log(`[${SCRIPT_NAME}] No matching site adapter found.`);
            }
        },
        async getTorrentInfo() {
            if (!this.adapter) return null;
            try {
                // 优先列表模式（多条）
                if (this.adapter.getListInfo) {
                    const list = await this.adapter.getListInfo();
                    if (list && list.length > 0) return list;
                }
                // 回退到详情页单条模式
                const single = await this.adapter.getInfo();
                return single ? [single] : null;
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Adapter getInfo failed: ${this.adapter.id}`, error?.stack || error?.message || error);
                return null;
            }
        }
    };




    // ——————————————————————————————————————
    // [5] 核心逻辑 (CORE LOGIC)
    // ——————————————————————————————————————

    const Core = {
        async handlePage() {
            try {
                if (Site.adapter?.findMount && this.renderLazyEntry(Site.adapter)) {
                    return true;
                }
                const torrentInfoList = await Site.getTorrentInfo();
                if (!torrentInfoList || torrentInfoList.length === 0) {
                    GM_log(`[${SCRIPT_NAME}] Could not extract torrent info.`);
                    return false;
                }
                GM_log(`[${SCRIPT_NAME}] 匹配到 ${torrentInfoList.length} 条种子信息`);
                for (const torrentInfo of torrentInfoList) {
                    if (!torrentInfo || !torrentInfo.name) continue;
                    this._processOneTorrent(torrentInfo);
                }
                return Boolean(document.querySelector('.mp-recognize-trigger'));
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Core handlePage failed`, error?.stack || error?.message || error);
                return false;
            }
        },

        renderLazyEntry(adapter) {
            const mount = adapter?.findMount?.();
            if (!mount?.target) return false;
            const siteId = AdapterRuntime.siteId(adapter);
            const existing = PTDOM.qs(PTDOM.productRootSelector(siteId)) || PTDOM.qs(PTDOM.productRootSelector(''));
            const container = existing || document.createElement('div');
            container.className = container.className || 'mp-row-box pt-helper-root pt-helper-root-mp';
            if (!container.classList.contains('pt-helper-root')) container.classList.add('pt-helper-root', 'pt-helper-root-mp');
            AdapterRuntime.mountRoot(adapter, mount, container, 'lazy-button');
            const button = UI.renderActionButton('识别', '待识别', CONSTANTS.COLORS.SECONDARY, 'idle');
            container.innerHTML = `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">${button}</div>`;
            const trigger = container.querySelector('.mp-recognize-trigger');
            if (trigger) {
                trigger.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (adapter.id === 'm-team' && !CONFIG.get('mteamApiKey')) {
                        trigger.textContent = '识别（需配置 M-Team API Key）';
                        trigger.setAttribute('data-state', 'error');
                        trigger.style.backgroundColor = CONSTANTS.COLORS.WARNING;
                        trigger.style.borderColor = CONSTANTS.COLORS.WARNING;
                        trigger.title = '请在 MoviePilot 配置中填写 M-Team API Key';
                        UI.showToast('请先配置 M-Team API Key');
                        UI.showConfigModal(false);
                        return;
                    }
                    try {
                        const torrentInfo = await adapter.getInfo(mount);
                        if (!torrentInfo?.name) throw new Error('未能获取种子信息');
                        this.startRecognition(container, torrentInfo);
                    } catch (error) {
                        trigger.textContent = `识别（${error?.message || '失败'}）`;
                        trigger.setAttribute('data-state', 'error');
                        trigger.style.backgroundColor = CONSTANTS.COLORS.WARNING;
                        trigger.style.borderColor = CONSTANTS.COLORS.WARNING;
                        UI.showToast(error?.message || '识别失败');
                    }
                };
            }
            this.restoreLazyEntry(container, adapter, mount);
            return true;
        },

        async restoreLazyEntry(container, adapter, mount) {
            if (adapter.id === 'm-team') return;
            try {
                const torrentInfo = await adapter.getInfo(mount);
                if (!torrentInfo?.name) return;
                const cached = Cache.get(torrentInfo.name);
                if (cached && cached.media_info) {
                    GM_log(`[${SCRIPT_NAME}] 命中识别缓存: ${torrentInfo.name}`);
                    this.renderSuccess(container, cached, torrentInfo);
                    return;
                }
                if (CONFIG.get('autoQuery')) {
                    setTimeout(() => {
                        const trigger = container.querySelector('.mp-recognize-trigger');
                        if (!trigger || trigger.getAttribute('data-state') === 'running') return;
                        if (container.querySelector('.mp-download-button')) return;
                        this.startRecognition(container, torrentInfo);
                    }, 300);
                }
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Lazy restore skipped: ${adapter.id}`, error?.stack || error?.message || error);
            }
        },

        _processOneTorrent(torrentInfo) {
            try {
                const { name, description, downloadLink, size, extra = {} } = torrentInfo;
                const siteId = Site.adapter?.id || '';
                const existing = siteId === 'm-team' ? (PTDOM.qs(PTDOM.productRootSelector(siteId)) || PTDOM.qs(PTDOM.productRootSelector(''))) : null;
                const container = existing || document.createElement('div');
                container.className = container.className || 'mp-row-box pt-helper-root pt-helper-root-mp';
                if (!container.classList.contains('pt-helper-root')) container.classList.add('pt-helper-root', 'pt-helper-root-mp');
                AdapterRuntime.mountRoot({ id: siteId }, torrentInfo.mount || Mount.prepend(), container, torrentInfo.mount?.type || '');
                if (container.parentElement?.querySelectorAll?.('.mp-recognize-trigger').length > 1) { container.remove(); return; }

                const torrentData = {
                    name,
                    description,
                    downloadLink,
                    size,
                    _bangumiId: extra.bangumiId || torrentInfo._bangumiId
                };

                // 检查缓存：有则直接渲染成功结果，无则显示手动入口
                const cached = Cache.get(name);
                if (cached && cached.media_info) {
                    GM_log(`[${SCRIPT_NAME}] 命中识别缓存: ${name}`);
                    this.renderSuccess(container, cached, torrentData);
                } else {
                    this.renderManualEntry(container, torrentData);
                    if (CONFIG.get('autoQuery')) setTimeout(() => this.startRecognition(container, torrentData), 300);
                }
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Process torrent failed: ${torrentInfo?.name || ''}`, error?.stack || error?.message || error);
            }
        },

        renderManualEntry(container, torrentInfo, state = 'idle', message = '待识别') {
            const containerStyle = `display: flex; align-items: center; gap: 5px; flex-wrap: wrap;`;
            const isRunning = state === 'running';
            const tagColor = state === 'error' ? CONSTANTS.COLORS.WARNING : (isRunning ? CONSTANTS.COLORS.PRIMARY : CONSTANTS.COLORS.SECONDARY);
            const status = state === 'error' ? '失败' : (isRunning ? '识别中' : message);
            const title = state === 'error' ? message : '';
            const manualTag = UI.renderActionButton('识别', status, tagColor, state, title);

            container.innerHTML = `<div style="${containerStyle}">${manualTag}</div>`;
            this.attachRecognizeTrigger(container, torrentInfo);
        },

        attachRecognizeTrigger(container, torrentInfo) {
            const trigger = container.querySelector('.mp-recognize-trigger');
            if (!trigger) return;
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const state = trigger.getAttribute('data-state');
                if (state === 'running') return;
                this.startRecognition(container, torrentInfo);
            });
        },

        async startRecognition(container, torrentInfo) {
            const setRunning = (msg) => {
                const trigger = container.querySelector('.mp-recognize-trigger');
                if (trigger) {
                    trigger.setAttribute('data-state', 'running');
                    trigger.textContent = `识别（${msg}）`;
                    trigger.disabled = true;
                    trigger.style.backgroundColor = CONSTANTS.COLORS.PRIMARY;
                    trigger.style.borderColor = CONSTANTS.COLORS.PRIMARY;
                    trigger.style.cursor = 'not-allowed';
                }
            };
            setRunning('识别中');

            try {
                const candidates = UTILS.getRecognitionCandidates(torrentInfo.name, torrentInfo.description);
                GM_log(`[${SCRIPT_NAME}] 识别候选词:`, candidates);

                for (let i = 0; i < candidates.length; i++) {
                    if (i > 0) setRunning(`重试${i + 1}/${candidates.length}`);
                    const subtitle = i === 0 ? torrentInfo.description : '';
                    try {
                        const data = await API.recognize(candidates[i], subtitle);
                        if (data && data.media_info) {
                            Cache.set(torrentInfo.name, data);
                            this.renderSuccess(container, data, torrentInfo);
                            return;
                        }
                    } catch (e) {
                        if ((e.message || '').includes('配置不完整') || (e.message || '').includes('API Key')) {
                            this.renderManualEntry(container, torrentInfo, 'error', '配置异常，重试');
                            return;
                        }
                        GM_log(`[${SCRIPT_NAME}] 候选词识别失败: ${candidates[i]}`, e);
                    }
                }

                if (CONFIG.get('tmdbKey')) {
                    setRunning('匹配中');
                    const mediaInfo = await this.tmdbFallback(candidates, torrentInfo.description);
                    if (mediaInfo && mediaInfo.tmdb_id) {
                        const data = { media_info: mediaInfo, meta_info: {} };
                        Cache.set(torrentInfo.name, data);
                        this.renderSuccess(container, data, torrentInfo);
                        return;
                    }
                }

                this.renderManualEntry(container, torrentInfo, 'error', '识别失败，重试');
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Recognition failed:`, error);
                const message = (error.message || '').includes('配置不完整') ? '配置异常，重试' : '识别失败，重试';
                this.renderManualEntry(container, torrentInfo, 'error', message);
            }
        },

        async tmdbFallback(candidates, subtitle) {
            try {
                const uniqueQueries = [];
                const addQuery = (q) => {
                    const val = String(q || '').trim();
                    if (val && !uniqueQueries.includes(val)) uniqueQueries.push(val);
                };
                candidates.forEach(addQuery);
                UTILS.extractSubtitleCandidates(subtitle).forEach(addQuery);

                const yearHints = UTILS.extractYearHintsFromText(`${candidates.join(' ')} ${subtitle || ''}`);
                const preferType = UTILS.inferTmdbSearchTypeFromText(`${candidates.join(' ')} ${subtitle || ''}`);
                const topQueries = uniqueQueries.slice(0, 6);
                const scored = [];
                const dedup = new Set();

                for (const q of topQueries) {
                    const modes = preferType ? [preferType, ''] : [''];
                    for (const mode of modes) {
                        const results = await API.searchTmdb(q, mode);
                        (results || []).slice(0, 12).forEach((item) => {
                            const key = `${item?.media_type || mode || ''}:${item?.id || ''}`;
                            if (!item?.id || dedup.has(key)) return;
                            dedup.add(key);
                            const mediaType = item?.media_type || (mode || 'movie');
                            const effectiveType = mediaType === 'tv' ? 'tv' : 'movie';
                            const score = UTILS.scoreTmdbResult({ ...item, media_type: effectiveType }, q, yearHints, preferType);
                            scored.push({ id: item.id, mediaType: effectiveType, score });
                        });
                    }
                }

                scored.sort((a, b) => b.score - a.score);
                const best = scored[0];
                GM_log(`[${SCRIPT_NAME}] TMDB 兜底结果 (top 5):`, scored.slice(0, 5));
                if (!best || best.score < 6) return null;

                const typeName = best.mediaType === 'tv' ? '电视剧' : '电影';
                return await API.recognizeById(best.id, typeName);
            } catch (e) {
                GM_log(`[${SCRIPT_NAME}] TMDB 兜底失败:`, e);
                return null;
            }
        },

        renderSuccess(container, data, torrentInfo) {
            const { media_info, meta_info } = data;
            const containerStyle = `display: flex; align-items: center; gap: 5px; flex-wrap: wrap;`;
            let finalHtml = `<div style="${containerStyle}">`;

            // Manual trigger + Download Button
            finalHtml += UI.renderActionButton('识别', '成功', CONSTANTS.COLORS.SECONDARY, 'idle', '重新识别');
            const buttonStyle = `background-color:${CONSTANTS.COLORS.BTN_SAVE}; color:white; border:none; border-radius:4px; font:inherit; line-height:1.45; font-weight:600; cursor:pointer; padding:.12em .6em;`;
            finalHtml += `<button class="mp-download-button" style="${buttonStyle}">推送到MP</button>`;

            // Tags
            finalHtml += media_info.type ? UI.renderTag(media_info.type, CONSTANTS.COLORS.PRIMARY) : '';
            finalHtml += media_info.category ? UI.renderTag(media_info.category, CONSTANTS.COLORS.PRIMARY) : '';
            if (media_info.title) {
                const titleStyle = `cursor: pointer; -webkit-user-select: none; user-select: none;`;
                finalHtml += `<span class="mp-clickable-title" style="${titleStyle}">${UI.renderTag(media_info.title, CONSTANTS.COLORS.WARNING)}</span>`;
            }
            finalHtml += meta_info.season_episode ? UI.renderTag(meta_info.season_episode, CONSTANTS.COLORS.SECONDARY) : '';
            finalHtml += meta_info.year ? UI.renderTag(meta_info.year, CONSTANTS.COLORS.SECONDARY) : '';
            finalHtml += media_info.tmdb_id ? `<a href="${media_info.detail_link}" target="_blank">${UI.renderTag(media_info.tmdb_id, CONSTANTS.COLORS.SUCCESS)}</a>` : '';
            finalHtml += meta_info.resource_type ? UI.renderTag(meta_info.resource_type, CONSTANTS.COLORS.INFO) : '';
            finalHtml += meta_info.resource_pix ? UI.renderTag(meta_info.resource_pix, CONSTANTS.COLORS.INFO) : '';
            finalHtml += meta_info.video_encode ? UI.renderTag(meta_info.video_encode, CONSTANTS.COLORS.INFO) : '';
            finalHtml += meta_info.audio_encode ? UI.renderTag(meta_info.audio_encode, CONSTANTS.COLORS.INFO) : '';
            finalHtml += meta_info.resource_team ? UI.renderTag(meta_info.resource_team, CONSTANTS.COLORS.PURPLE) : '';

            finalHtml += `</div>`;
            container.innerHTML = finalHtml;

            // Add event listeners
            this.addSuccessListeners(container, data, torrentInfo);
            this.attachRecognizeTrigger(container, torrentInfo);
        },

        addSuccessListeners(row, data, torrentInfo) {
            const titleElement = row.querySelector('.mp-clickable-title');
            if (titleElement) {
                titleElement.addEventListener('click', () => {
                    GM_setClipboard(data.media_info.title);
                    const originalContent = titleElement.innerHTML;
                    titleElement.innerHTML = UI.renderTag('已复制!', CONSTANTS.COLORS.SUCCESS);
                    setTimeout(() => { titleElement.innerHTML = originalContent; }, 1500);
                });
            }

            const downloadButton = row.querySelector('.mp-download-button');
            if (downloadButton) {
                downloadButton.addEventListener("click", (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.handleDownload(downloadButton, data.media_info, torrentInfo);
                });
            }
        },

        async handleDownload(button, media_info, torrentInfo) {
            button.disabled = true;
            const originalText = "推送到MP";
            const log = (msg, ...args) => GM_log(`[${SCRIPT_NAME}] [Download] ${msg}`, ...args);
            const setStatus = (text) => { button.textContent = text; UI.showToast(text, 2000); log(text); };

            try {
                // bangumi.moe 列表项：通过 API 获取真实 magnet
                if (torrentInfo._bangumiId && !torrentInfo.downloadLink) {
                    setStatus("获取 bangumi.moe 磁力链接...");
                    try {
                        const apiRes = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                            method: 'GET',
                            url: `https://bangumi.moe/api/v2/torrent/${torrentInfo._bangumiId}`,
                            responseType: 'json',
                            onload: (r) => r.status === 200 ? resolve(r.response) : reject(new Error(`API ${r.status}`)),
                            onerror: reject
                        }));
                        if (apiRes?.magnet) {
                            // 从页面已有 magnet 链接提取 tracker，提取不到用硬编码兜底
                            let trackerParams = '';
                            const existingMagnet = document.querySelector('a[href^="magnet:"]')?.href || '';
                            const extractedTrs = existingMagnet.split('&tr=').slice(1).map(t => '&tr=' + t.split('&')[0]);
                            if (extractedTrs.length > 0) {
                                trackerParams = extractedTrs.join('');
                                log(`从页面提取到 ${extractedTrs.length} 个 tracker`);
                            } else {
                                trackerParams = [
                                    'https://tr.bangumi.moe:9696/announce',
                                    'http://tr.bangumi.moe:6969/announce',
                                    'udp://tr.bangumi.moe:6969/announce',
                                    'http://open.acgtracker.com:1096/announce',
                                    'http://share.camoe.cn:8080/announce',
                                    'http://opentracker.acgnx.se/announce',
                                    'http://t.nyaatracker.com/announce',
                                ].map(t => `&tr=${encodeURIComponent(t)}`).join('');
                                log('使用硬编码 tracker 兜底');
                            }
                            torrentInfo.downloadLink = apiRes.magnet + trackerParams;
                            if (apiRes.size) torrentInfo.size = UTILS.parseSize(apiRes.size);
                            log(`bangumi API 获取成功: ${torrentInfo.downloadLink.substring(0, 80)}...`);
                        }
                    } catch (e) {
                        log('bangumi API 获取失败:', e);
                    }
                }

                log('开始推送:', { name: torrentInfo.name, downloadLink: torrentInfo.downloadLink?.substring(0, 60), size: torrentInfo.size });

                // M-Team 链接获取
                if (Site.adapter.id === 'm-team') {
                    setStatus("M-Team: 获取下载链接...");
                    let link = '';
                    try {
                        link = await API.getMteamDownloadLink();
                    } catch (e) {
                        GM_log(`[${SCRIPT_NAME}] genDlToken 失败:`, e);
                        if (/未配置 M-Team API Key/.test(String(e?.message || ''))) {
                            setStatus("请先配置 M-Team API Key");
                            setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
                            return;
                        }
                    }
                    if (!link) {
                        setStatus("链接获取失败");
                        setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
                        return;
                    }
                    torrentInfo.downloadLink = link;
                }

                // 1. 尝试完整推送（含站点+媒体信息）
                setStatus("查询站点信息...");
                let pushed = false;
                try {
                    const siteData = await API.getSite();
                    log(`站点匹配成功: id=${siteData.id}, name=${siteData.name}`);
                    setStatus(`站点: ${siteData.name}，推送中...`);
                    const torrentPayload = {
                        title: torrentInfo.name,
                        description: torrentInfo.description,
                        page_url: window.location.href,
                        enclosure: torrentInfo.downloadLink,
                        size: torrentInfo.size,
                        site: siteData.id,
                        site_name: siteData.name,
                        site_cookie: siteData.cookie,
                        proxy: siteData.proxy,
                        pubdate: UTILS.getFormattedDate(),
                        site_ua: navigator.userAgent
                    };
                    log('完整推送 payload:', torrentPayload);
                    const dlRes = await API.download(media_info, torrentPayload);
                    log('完整推送响应:', dlRes);
                    setStatus("MoviePilot 推送成功");
                    pushed = true;
                } catch (e) {
                    log('完整推送失败:', e);
                }

                // 2. 完整推送失败，尝试 downloadAdd（不含站点信息，走 MoviePilot 下载器）
                if (!pushed && torrentInfo.downloadLink) {
                    try {
                        setStatus("通过 MoviePilot 下载器直推...");
                        log('downloadAdd 参数:', { name: torrentInfo.name, enclosure: torrentInfo.downloadLink?.substring(0, 60) });
                        const addRes = await API.downloadAdd(torrentInfo);
                        log('downloadAdd 响应:', addRes);
                        setStatus("MoviePilot 下载器推送成功");
                        pushed = true;
                    } catch (e) {
                        log('downloadAdd 失败:', e);
                    }
                }

                if (!pushed) {
                    const reason = !torrentInfo.downloadLink ? '无下载链接（请到详情页操作）' : '所有推送方式均失败';
                    setStatus(reason);
                    setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
                    return;
                }
                button.disabled = false;
            } catch (outerErr) {
                GM_log(`[${SCRIPT_NAME}] handleDownload 异常:`, outerErr);
                setStatus(`异常: ${outerErr.message || '未知错误'}`);
                setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
            }
        }
    };


    // ——————————————————————————————————————
    // [6] 辅助函数 & 初始化 (UTILS & INITIALIZATION)
    // ——————————————————————————————————————

    const UTILS = {
        parseSize(sizeStr) {
            sizeStr = String(sizeStr || '');
            sizeStr = sizeStr.replace(/iB/gi, 'B');
            if (!sizeStr) return 0;
            const match = sizeStr.toUpperCase().match(/(\d+\.?\d*)\s*(TB|GB|MB|KB)/);
            if (!match) return 0;
            const size = parseFloat(match[1]);
            const unit = match[2];
            switch (unit) {
                case 'TB': return size * 1024 ** 4;
                case 'GB': return size * 1024 ** 3;
                case 'MB': return size * 1024 ** 2;
                case 'KB': return size * 1024;
                default: return 0;
            }
        },
        getFormattedDate() {
            return new Date().toISOString().slice(0, 19).replace('T', ' ');
        },

        escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        cleanText(value) {
            return String(value || '').replace(/\s+/g, ' ').trim();
        },

        normalizeTorrentTitle(rawTitle) {
            if (!rawTitle) return '';
            let title = String(rawTitle).replace(/\s+/g, ' ').trim();
            title = title
                .replace(/\.torrent$/i, '')
                .replace(/\.(mkv|mp4|avi|ts|m2ts|flv|wmv)$/i, '');
            for (let i = 0; i < 6; i++) {
                const next = title.replace(/^\s*(?:\[[^\]]{1,30}\]|\([^\)]{1,30}\)|【[^】]{1,30}】|<[^>]{1,30}>)(?:[\s._-]+|$)/, '');
                if (next === title) break;
                title = next;
            }
            title = title
                .replace(/^[^A-Za-z0-9\u4e00-\u9fa5]+/, '')
                .replace(/^[A-Za-z0-9]{2,10}\]\s*/, '')
                .replace(/^[\]\)\】\}]+/, '');
            title = title.replace(/[._]+/g, ' ');
            const noisyPart = title.match(/\b(?:4320p|2160p|1080p|720p|480p|web[-\s]?dl|webrip|bluray|bdrip|hdtv|dvdrip|remux|h\.?26[45]|x26[45]|hevc|avc|aac(?:\d\.\d)?|ddp?\d(?:\.\d)?|dts(?:-hd)?|atmos|hdr10\+?|dolby[\s-]?vision|10bit|8bit)\b/i);
            if (noisyPart && noisyPart.index > 0) {
                title = title.slice(0, noisyPart.index);
            }
            title = title.replace(/\s+free\s+\d+\s*h(?:\s+\d+\s*min)?$/i, '');
            title = title.replace(/\s+-[A-Za-z0-9][A-Za-z0-9._-]*$/, '');
            return title.replace(/\s+/g, ' ').trim();
        },

        stripEpisodeInfo(title) {
            return String(title || '')
                .replace(/\bS\d{1,2}E\d{1,3}\b/ig, ' ')
                .replace(/\bE\d{1,3}\b/ig, ' ')
                .replace(/\b第\s*\d+\s*[季集]\b/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        },

        extractSubtitleCandidates(subtitle) {
            const results = [];
            const add = (v) => {
                const val = String(v || '').replace(/\s+/g, ' ').trim();
                if (val && !results.includes(val)) results.push(val);
            };
            if (!subtitle) return results;
            const clean = String(subtitle || '')
                .replace(/\*[^*]{1,40}\*/g, ' ')
                .replace(/\[[^\]]{1,40}\]/g, ' ')
                .replace(/[|｜]/g, '/')
                .replace(/\s+/g, ' ')
                .trim();
            clean.split(/\s*\/\s*/).forEach((part) => {
                let p = String(part || '').trim();
                if (!p) return;
                p = p
                    .replace(/(?:评论音轨|多国语字幕|字幕|中字|簡繁|简繁|国语|日语|英语|粤语|双语|音轨|內封|外挂|內嵌).*/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                add(p);
                const words = p.match(/\b[A-Za-z][A-Za-z0-9'’-]{3,}\b/g) || [];
                words.forEach(add);
            });
            return results.slice(0, 8);
        },

        extractYearHintsFromText(text) {
            const years = [];
            String(text || '').replace(/\b(19|20)\d{2}\b/g, (m) => {
                if (!years.includes(m)) years.push(m);
                return m;
            });
            return years;
        },

        inferTmdbSearchTypeFromText(text) {
            const raw = String(text || '');
            if (/\bS\d{1,2}E\d{1,3}\b/i.test(raw)) return 'tv';
            if (/\bE\d{1,3}\b/i.test(raw) || /第\s*\d+\s*季/.test(raw)) return 'tv';
            return '';
        },

        normalizeForMatch(text) {
            return String(text || '')
                .toLowerCase()
                .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        },

        getRecognitionCandidates(rawTitle, subtitle = '') {
            const candidates = [];
            const addCandidate = (title) => {
                const val = String(title || '')
                    .replace(/\s+/g, ' ')
                    .replace(/\.torrent$/i, '')
                    .replace(/\.(mkv|mp4|avi|ts|m2ts|flv|wmv)$/i, '')
                    .replace(/^[A-Za-z0-9]{2,10}\]\s*/, '')
                    .trim();
                if (val && !candidates.includes(val)) candidates.push(val);
            };

            const normalized = this.normalizeTorrentTitle(rawTitle);
            const withoutEpisode = this.stripEpisodeInfo(normalized);
            const slashAlias = normalized.split(/\s*\/\s*/)[0].trim();
            const hasTvPattern = /\bS\d{1,2}E\d{1,3}\b/i.test(normalized)
                || /\bE\d{1,3}\b/i.test(normalized)
                || /第\s*\d+\s*[季集]/.test(normalized);

            addCandidate(rawTitle);
            addCandidate(normalized);
            addCandidate(slashAlias);
            addCandidate(withoutEpisode);
            this.extractSubtitleCandidates(subtitle).forEach(addCandidate);

            if (!hasTvPattern) {
                const yearMatch = normalized.match(/\b(?:19|20)\d{2}\b/);
                if (yearMatch) {
                    const year = yearMatch[0];
                    const noYear = normalized
                        .replace(new RegExp(`\\b${year}\\b`, 'g'), ' ')
                        .replace(/\(\s*\)/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    addCandidate(noYear);
                    if (noYear) {
                        addCandidate(`${noYear} ${year}`);
                        addCandidate(`${noYear} (${year})`);
                    }
                }
            }
            return candidates;
        },

        scoreTmdbResult(item, query, yearHints, preferType) {
            const title = item?.title || item?.name || '';
            const nt = this.normalizeForMatch(title);
            const nq = this.normalizeForMatch(query);
            let score = 0;
            if (!nt || !nq) return score;
            if (nt === nq) score += 12;
            else if (nt.includes(nq) || nq.includes(nt)) score += 8;
            const qTokens = nq.split(' ').filter(Boolean);
            const tTokens = nt.split(' ').filter(Boolean);
            const overlap = qTokens.filter(t => tTokens.includes(t)).length;
            score += Math.min(overlap, 6);
            const mediaType = item?.media_type || '';
            if (preferType && mediaType === preferType) score += 2;
            const y = String(item?.release_date || item?.first_air_date || '').slice(0, 4);
            if (y && yearHints.includes(y)) score += 4;
            return score;
        },
    };


    // ——————————————————————————————————————
    // [6.5] 识别结果缓存 (RECOGNIZE CACHE)
    // ——————————————————————————————————————

    const Cache = {
        _data: null,

        _load() {
            if (this._data) return this._data;
            try {
                const raw = GM_getValue(CONSTANTS.RECOGNIZE_CACHE.KEY, '{}');
                this._data = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
            } catch (e) {
                this._data = {};
            }
            return this._data;
        },

        _persist() {
            try {
                GM_setValue(CONSTANTS.RECOGNIZE_CACHE.KEY, JSON.stringify(this._data || {}));
            } catch (e) {
                GM_log(`[${SCRIPT_NAME}] 缓存写入失败:`, e);
            }
        },

        _normalizeKey(name) {
            return UTILS.cleanText(name).toLowerCase();
        },

        get(name) {
            const key = this._normalizeKey(name);
            if (!key) return null;
            const data = this._load();
            const item = data[key];
            if (!item) return null;
            if (Date.now() - (item.ts || 0) > CONSTANTS.RECOGNIZE_CACHE.TTL_MS) {
                delete data[key];
                this._persist();
                return null;
            }
            return item.payload || null;
        },

        set(name, payload) {
            const key = this._normalizeKey(name);
            if (!key || !payload) return;
            const data = this._load();
            data[key] = { payload, ts: Date.now() };
            this._prune();
            this._persist();
        },

        _prune() {
            const data = this._data || {};
            const now = Date.now();
            const ttl = CONSTANTS.RECOGNIZE_CACHE.TTL_MS;
            // 先删过期项
            Object.keys(data).forEach((k) => {
                if (now - (data[k]?.ts || 0) > ttl) delete data[k];
            });
            // 超出条数则删最旧的
            const max = CONSTANTS.RECOGNIZE_CACHE.MAX_ENTRIES;
            const keys = Object.keys(data);
            if (keys.length > max) {
                keys
                    .map((k) => ({ k, ts: data[k]?.ts || 0 }))
                    .sort((a, b) => a.ts - b.ts)
                    .slice(0, keys.length - max)
                    .forEach(({ k }) => delete data[k]);
            }
        },

        clear() {
            this._data = {};
            try { GM_deleteValue(CONSTANTS.RECOGNIZE_CACHE.KEY); } catch (e) {}
            UI.showToast(`[${SCRIPT_NAME}] 识别缓存已清空。`);
            GM_log(`[${SCRIPT_NAME}] 识别缓存已清空。`);
        },

        size() {
            return Object.keys(this._load()).length;
        }
    };

    const isMTeamHost = () => /(^|\.)m-team\.(cc|io|vip)$/.test(window.location.hostname);
    const isMTeamDetail = () => isMTeamHost() && window.location.pathname.startsWith('/detail/');

    function main() {
        // 1. 加载配置
        CONFIG.load();

        // 2. 注册菜单命令
        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand("配置Moviepilot参数", () => UI.showConfigModal(false), "c");
            GM_registerMenuCommand("清除识别缓存", () => Cache.clear(), "x");
            GM_registerMenuCommand("重置所有配置", () => CONFIG.reset(), "r");
        }
    
        // 3. 确保配置存在，否则弹窗并终止
        if (!CONFIG.ensure()) {
            return;
        }
    
        let hasBooted = false;
        const bootCore = async (options = {}) => {
            if (hasBooted && !options.force) return true;
            hasBooted = true;
            const ok = await Core.handlePage();
            if (!ok) hasBooted = false;
            return ok;
        };

        const installMTeamDynamicBoot = () => {
            let bootedTorrentId = '';
            let booting = false;
            let bootTimer = null;
            const currentTorrentId = () => window.location.pathname.match(/\/detail\/(\d+)/)?.[1] || '';
            const hasMTeamAnchor = () => Array.from(document.querySelectorAll('label')).some(label => label.textContent.trim() === '字幕');
            const requestBoot = (delay = 300) => {
                clearTimeout(bootTimer);
                bootTimer = setTimeout(tryBoot, delay);
            };

            let attempts = 0;
            const tryBoot = async () => {
                if (!isMTeamDetail()) return;
                const tid = currentTorrentId();
                if (!tid || booting || (bootedTorrentId === tid && document.querySelector('.mp-recognize-trigger'))) return;
                if (!hasMTeamAnchor()) {
                    if (attempts++ < 30) requestBoot(500);
                    return;
                }
                booting = true;
                Site.init();
                const ok = Site.adapter ? await bootCore({ force: true }) : false;
                booting = false;
                if (ok) {
                    bootedTorrentId = tid;
                    attempts = 0;
                    return;
                }
                if (attempts++ < 30) requestBoot(500);
            };
            requestBoot(300);

            new MutationObserver(() => {
                if (!isMTeamDetail()) return;
                requestBoot(300);
            }).observe(document.body, { childList: true, subtree: true });
        };

        // 4. 初始化站点适配器
        if (isMTeamHost() && !isMTeamDetail()) return;
        Site.init();
        if (!Site.adapter) {
            return; // 如果没有适配器，则不执行页面注入
        }

        // 5. 处理 M-Team 的动态加载，等待详细信息出现后再渲染入口
        if (Site.adapter.id === 'm-team') {
            installMTeamDynamicBoot();
        } else if (window.location.hostname === 'bangumi.moe') {
            // bangumi.moe 是 SPA，内容异步渲染，需要轮询等待 DOM 就绪
            const spaBoot = () => {
                let attempts = 0;
                const tryBoot = () => {
                    if (attempts++ > 15 || document.querySelector('.mp-recognize-trigger')) return;
                    hasBooted = false;
                    Site.init();
                    if (Site.adapter) bootCore();
                    if (!document.querySelector('.mp-recognize-trigger')) {
                        setTimeout(tryBoot, 500);
                    }
                };
                setTimeout(tryBoot, 300);
            };
            spaBoot();

            // 监听页内导航，URL 变化时清旧行、重新匹配
            let lastUrl = location.href;
            const onUrlChange = () => {
                if (location.href === lastUrl) return;
                lastUrl = location.href;
                document.querySelectorAll('.mp-recognize-trigger').forEach(el => {
                    const row = el.closest('tr, div');
                    if (row) row.remove();
                });
                spaBoot();
            };
            const origPush = history.pushState;
            const origReplace = history.replaceState;
            history.pushState = function(...args) { origPush.apply(this, args); onUrlChange(); };
            history.replaceState = function(...args) { origReplace.apply(this, args); onUrlChange(); };
            window.addEventListener('popstate', onUrlChange);

            // 监听弹窗：列表页点击种子后 DOM 插入 .torrent-details-content，URL 不变
            let modalProcessing = false;
            let modalDebounce = null;
            const modalObserver = new MutationObserver(() => {
                if (modalProcessing) return;
                clearTimeout(modalDebounce);
                modalDebounce = setTimeout(() => {
                    const modal = document.querySelector('.torrent-details-content');
                    if (modal && !modal.querySelector('.mp-recognize-trigger')) {
                        modalProcessing = true;
                        modalObserver.disconnect();
                        hasBooted = false;
                        bootCore();
                        setTimeout(() => {
                            modalProcessing = false;
                            modalObserver.observe(document.body, { childList: true, subtree: false });
                        }, 500);
                    }
                }, 300);
            });
            modalObserver.observe(document.body, { childList: true, subtree: false });
        } else {
            let attempts = 0;
            const tryBoot = async () => {
                if (document.querySelector('.mp-recognize-trigger')) return;
                Site.init();
                const ok = Site.adapter ? await bootCore() : false;
                if (!ok && attempts++ < 20) setTimeout(tryBoot, 500);
            };
            tryBoot();
        }
    }

    // 启动！
    main();

})();

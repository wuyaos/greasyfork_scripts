// ==UserScript==
// @name         moviepilotNameTest(自用)
// @namespace    http://tampermonkey.net/
// @version      3.4.0
// @description  moviepilots名称测试 - 多候选识别+TMDB兜底+API Key+M-Team多层捕获+识别缓存24h+BT站点适配
// @author       yubanmeiqin9048, benz1 (Refactored by ffwu & AI)
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
// @match        https://hdcity.city/t-*
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
// @grant        GM_setClipboard
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @connect      *
// @license      MIT
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/moviepilot.png
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/Moviepilot_NameTest.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/Moviepilot_NameTest.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ——————————————————————————————————————
    // [1] 配置 & 常量 (CONFIG & CONSTANTS)
    // ——————————————————————————————————————

    const SCRIPT_NAME = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';

    const CONSTANTS = {
        API_ENDPOINTS: {
            LOGIN: '/api/v1/login/access-token',
            RECOGNIZE: '/api/v1/media/recognize',
            RECOGNIZE_BY_ID: '/api/v1/media/tmdb:',
            GET_SITE: '/api/v1/site/domain/',
            DOWNLOAD: '/api/v1/download/',
        },
        ALLOWED_HOSTS: ['api.themoviedb.org'],
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
            qbUrl: '',
            qbUser: '',
            qbPass: ''
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
            this._values.qbUrl = GM_getValue('qbUrl', CONSTANTS.DEFAULT_CONFIG.qbUrl);
            this._values.qbUser = GM_getValue('qbUser', CONSTANTS.DEFAULT_CONFIG.qbUser);
            this._values.qbPass = GM_getValue('qbPass', CONSTANTS.DEFAULT_CONFIG.qbPass);
            GM_log(`[${SCRIPT_NAME}] 配置已加载。`);
        },

        save({ url, user, pass, authMode, apiKey, tmdbKey, qbUrl, qbUser, qbPass }) {
            GM_setValue('moviepilotUrl', url);
            GM_setValue('moviepilotUser', user);
            GM_setValue('moviepilotPassword', pass);
            GM_setValue('moviepilotAuthMode', authMode || 'password');
            GM_setValue('moviepilotApiKey', apiKey || '');
            GM_setValue('moviepilotTmdbKey', tmdbKey || '');
            GM_setValue('qbUrl', qbUrl || '');
            GM_setValue('qbUser', qbUser || '');
            GM_setValue('qbPass', qbPass || '');
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
                GM_deleteValue('qbUrl');
                GM_deleteValue('qbUser');
                GM_deleteValue('qbPass');
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
                    qbUrl: document.getElementById('mpQbUrl').value.trim().replace(/\/$/, ''),
                    qbUser: document.getElementById('mpQbUser').value.trim(),
                    qbPass: document.getElementById('mpQbPass').value
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
                        if (!key) { alert('请填写 API Key'); btn.disabled = false; btn.textContent = '测试 MoviePilot'; return; }
                        headers['X-API-KEY'] = key;
                    } else {
                        const user = document.getElementById('mpUser').value.trim();
                        const pass = document.getElementById('mpPass').value;
                        if (!user || !pass) { alert('请填写用户名密码'); btn.disabled = false; btn.textContent = '测试 MoviePilot'; return; }
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
                setTimeout(() => { btn.disabled = false; btn.textContent = '测试 MoviePilot'; btn.style.color = ''; }, 3000);
            });

            // 测试 qBittorrent 连通性
            this.configModal.element.querySelector('.mp-test-qb-btn').addEventListener('click', async (e) => {
                const btn = e.target;
                const qbUrl = document.getElementById('mpQbUrl').value.trim().replace(/\/$/, '');
                if (!qbUrl) { alert('请先填写 qBittorrent 地址'); return; }
                btn.disabled = true; btn.textContent = '测试中...';
                try {
                    const user = document.getElementById('mpQbUser').value.trim();
                    const pass = document.getElementById('mpQbPass').value;
                    const res = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                        method: 'POST', url: `${qbUrl}/api/v2/auth/login`,
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        data: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
                        responseType: 'text', onload: resolve, onerror: reject
                    }));
                    if (res.responseText === 'Ok.') {
                        btn.textContent = '连接成功'; btn.style.color = '#27ae60';
                    } else {
                        btn.textContent = '登录失败'; btn.style.color = '#e74c3c';
                    }
                } catch (err) {
                    btn.textContent = '连接失败'; btn.style.color = '#e74c3c';
                }
                setTimeout(() => { btn.disabled = false; btn.textContent = '测试 qB'; btn.style.color = ''; }, 3000);
            });
        },

        _getConfigModalHTML() {
            const currentMode = CONFIG.get('authMode') || 'password';
            const showPass = currentMode === 'password';
            const showApiKey = currentMode === 'apikey';
            return `
                <h2>⚙️ MoviePilot 配置</h2>
                <div class="mp-modal-body">
                <div>
                    <label for="mpUrl">Moviepilot服务器 URL:</label>
                    <input type="text" id="mpUrl" placeholder="例如：http://192.168.1.100:3000" value="${CONFIG.get('url') || ''}">
                </div>
                <div>
                    <label for="mpAuthMode">认证方式:</label>
                    <select id="mpAuthMode">
                        <option value="password" ${showPass ? 'selected' : ''}>用户名密码登录</option>
                        <option value="apikey" ${showApiKey ? 'selected' : ''}>API Key 令牌</option>
                    </select>
                </div>
                <div id="mpPasswordFields" style="${showPass ? '' : 'display:none;'}">
                    <div>
                        <label for="mpUser">用户名:</label>
                        <input type="text" id="mpUser" value="${CONFIG.get('user') || ''}">
                    </div>
                    <div>
                        <label for="mpPass">密码:</label>
                        <input type="password" id="mpPass" value="${CONFIG.get('pass') || ''}">
                    </div>
                </div>
                <div id="mpApiKeyFields" style="${showApiKey ? '' : 'display:none;'}">
                    <div>
                        <label for="mpApiKey">API Key (令牌):</label>
                        <input type="password" id="mpApiKey" value="${CONFIG.get('apiKey') || ''}">
                        <p style="margin:4px 0 0;color:#888;font-size:12px;">可在 MoviePilot 设置 → 系统设定 → 基础设置 → API 令牌中获取。</p>
                    </div>
                </div>
                <div>
                    <label for="mpTmdbKey">TMDB API Key (可选，用于识别失败时的智能匹配):</label>
                    <input type="text" id="mpTmdbKey" placeholder="可在 TMDB 账户设置里申请 v3 API Key" value="${CONFIG.get('tmdbKey') || ''}">
                </div>
                <h2 class="mp-section-title">📥 qBittorrent 直推 (可选)</h2>
                <div>
                    <label for="mpQbUrl">qBittorrent Web UI 地址:</label>
                    <input type="text" id="mpQbUrl" placeholder="例如：http://192.168.1.100:8080" value="${CONFIG.get('qbUrl') || ''}">
                </div>
                <div>
                    <label for="mpQbUser">qBittorrent 用户名:</label>
                    <input type="text" id="mpQbUser" value="${CONFIG.get('qbUser') || ''}">
                </div>
                <div>
                    <label for="mpQbPass">qBittorrent 密码:</label>
                    <input type="password" id="mpQbPass" value="${CONFIG.get('qbPass') || ''}">
                    <p style="margin:4px 0 0;color:#888;font-size:12px;">站点未适配 MoviePilot 时，将通过 qBittorrent 直接下载。</p>
                </div>
                <div class="mp-modal-buttons">
                    <button class="mp-test-mp-btn" style="float:left;">测试 MoviePilot</button>
                    <button class="mp-test-qb-btn" style="float:left;margin-left:8px;">测试 qB</button>
                    <button class="mp-cancel-btn">取消</button>
                    <button class="mp-save-btn">保存</button>
                </div>
                </div>
            `;
        },

        _injectModalCSS() {
            const styleId = 'mp-config-modal-style';
            if (document.getElementById(styleId)) return;
            const css = `
                #mpConfigModalBackdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 2147483646; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
                #mpConfigModal { background-color: #f9f9f9; padding: 0; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.28); z-index: 2147483647; width: 440px; max-height: calc(100vh - 40px); overflow-y: auto; font-family: "Segoe UI", system-ui, sans-serif; color: #333; }
                #mpConfigModal .mp-modal-body { padding: 20px 25px 25px; }
                #mpConfigModal h2 { margin: 0; font-size: 16px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #2775b6, #5bb053); padding: 14px 20px; letter-spacing: 0.5px; position: sticky; top: 0; z-index: 1; }
                #mpConfigModal h2.mp-section-title { font-size: 14px; margin: 12px -25px 10px; padding: 8px 20px; border-radius: 0; background: linear-gradient(135deg, #8e44ad, #3498db); }
                #mpConfigModal label { display: block; margin-bottom: 4px; font-weight: 600; color: #555; font-size: 13px; }
                #mpConfigModal input[type="text"], #mpConfigModal input[type="password"] { width: calc(100% - 20px); padding: 8px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
                #mpConfigModal select { width: 100%; padding: 8px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; background: #fff; }
                #mpConfigModal input[type="text"]:focus, #mpConfigModal input[type="password"]:focus, #mpConfigModal select:focus { border-color: #3498db; outline: none; }
                #mpConfigModal .mp-modal-buttons { text-align: right; margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee; overflow: hidden; }
                #mpConfigModal .mp-test-mp-btn, #mpConfigModal .mp-test-qb-btn { background-color: #3498db; color: white; font-size: 12px; padding: 7px 10px; }
                #mpConfigModal .mp-test-mp-btn:hover, #mpConfigModal .mp-test-qb-btn:hover { background-color: #2980b9; }
                #mpConfigModal button { padding: 10px 18px; margin-left: 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background-color 0.2s; }
                #mpConfigModal button.mp-save-btn { background-color: ${CONSTANTS.COLORS.BTN_SAVE}; color: white; }
                #mpConfigModal button.mp-save-btn:hover { background-color: ${CONSTANTS.COLORS.BTN_SAVE_HOVER}; }
                #mpConfigModal button.mp-cancel-btn { background-color: ${CONSTANTS.COLORS.BTN_CANCEL}; color: white; }
                #mpConfigModal button.mp-cancel-btn:hover { background-color: ${CONSTANTS.COLORS.BTN_CANCEL_HOVER}; }
            `;
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style);
        },

        renderTag(text, color) {
            return `<span style="background-color:${color};color:#ffffff;display:inline-flex;align-items:center;justify-content:center;border-radius:0.375rem;font-size:12px;padding:0.25rem 0.75rem;font-weight:bold;">${text}</span>`;
        },

        renderRecognizeRow(type, html) {
            if (type === "common" && window.location.href.includes("m-team")) {
                return `<th class="ant-descriptions-item-label" colspan="1" style="width: 135px; text-align: right;"><span>MoviePilot</span></th><td class="ant-descriptions-item-content" colspan="1">${html}</td>`;
            }
            if (type === 'div') {
                if (window.location.href.includes('hdcity.city')) {
                    return `<div class="block"><div class="blocktitle">MoviePilot</div><div class="blockcontent">${html}</div></div>`;
                }
                return html;
            }
            if (type === "common") {
                return `<td class="rowhead nowrap" valign="top" align="right">MoviePilot</td><td class="rowfollow" valign="top" align="left">${html}</td>`;
            }
            return html;
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
            const download_info = { media_in: media_info, torrent_in: torrent_info };
            return this._request({
                method: 'POST',
                url: CONSTANTS.API_ENDPOINTS.DOWNLOAD,
                data: JSON.stringify(download_info),
                headers: { ...this._buildAuthHeaders(token), "content-type": "application/json" },
                responseType: 'json'
            });
        },

        async getMteamDownloadLink() {
            try {
                const torrentId = window.location.pathname.split('/').pop();
                if (!torrentId) throw new Error("在URL中未找到种子ID");

                const tokenResponse = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: `${localStorage.getItem("apiHost")}/torrent/genDlToken`,
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "TS": String(Math.floor(Date.now() / 1000)),
                            "Authorization": localStorage.getItem("auth") || ""
                        },
                        data: `id=${torrentId}`,
                        responseType: 'json',
                        onload: (res) => {
                            if (res.status === 200 && res.response?.code === "0") {
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
        }
    };


    // ——————————————————————————————————————
    // [3.5] qBittorrent 直推 (QB MODULE)
    // ——————————————————————————————————————

    const QB = {
        _sid: null,

        isConfigured() {
            return !!CONFIG.get('qbUrl');
        },

        _rawRequest(options) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    ...options,
                    onload: (res) => resolve(res),
                    onerror: (err) => reject(new Error('qBittorrent 请求失败')),
                    ontimeout: () => reject(new Error('qBittorrent 请求超时'))
                });
            });
        },

        async login() {
            const qbUrl = CONFIG.get('qbUrl');
            const user = CONFIG.get('qbUser');
            const pass = CONFIG.get('qbPass');
            if (!qbUrl) throw new Error('未配置 qBittorrent 地址');
            const res = await this._rawRequest({
                method: 'POST',
                url: `${qbUrl}/api/v2/auth/login`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
                responseType: 'text'
            });
            if (res.responseText === 'Ok.') {
                const cookie = res.responseHeaders?.match(/SID=([^;\s]+)/i);
                this._sid = cookie ? cookie[1] : null;
                return true;
            }
            throw new Error('qBittorrent 登录失败，请检查用户名密码');
        },

        async addTorrent(downloadLink, torrentName) {
            if (!this._sid) await this.login();
            const qbUrl = CONFIG.get('qbUrl');
            const boundary = '----MP' + Date.now();
            let body = '';
            body += `--${boundary}\r\nContent-Disposition: form-data; name="urls"\r\n\r\n${downloadLink}\r\n`;
            if (torrentName) {
                body += `--${boundary}\r\nContent-Disposition: form-data; name="rename"\r\n\r\n${torrentName}\r\n`;
            }
            body += `--${boundary}--\r\n`;
            const res = await this._rawRequest({
                method: 'POST',
                url: `${qbUrl}/api/v2/torrents/add`,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Cookie': this._sid ? `SID=${this._sid}` : ''
                },
                data: body,
                responseType: 'text'
            });
            if (res.status === 200 && res.responseText === 'Ok.') return true;
            if (res.status === 403) {
                this._sid = null;
                await this.login();
                return this.addTorrent(downloadLink, torrentName);
            }
            throw new Error(`qBittorrent 添加失败: ${res.status} ${res.responseText}`);
        }
    };


    // ——————————————————————————————————————
    // [4] 站点适配器 (SITE ADAPTERS)
    // ——————————————————————————————————————

    //Todo: haidan待定
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
                const href = el?.href || el?.getAttribute?.('href') || '';
                const url = this.absoluteUrl(href);
                if (url) return url;
            }
            return '';
        },

        insertAfter(target, row) {
            target.after(row);
        },

        simpleDivInfo({ name, description, downloadLink, sizeText, insertPoint }) {
            if (!name || !insertPoint) return null;
            return {
                name,
                description: description || '',
                downloadLink: downloadLink || '',
                size: this.findSize(sizeText),
                insertPoint,
                rowType: 'div',
                insertAction: (point, element) => this.insertAfter(point, element)
            };
        }
    };

    const SITE_ADAPTERS = [
        {
            id: 'totheglory',
            matches: () => window.location.href.includes('totheglory.im/t/'),
            getInfo: () => {
                const rows = document.querySelectorAll('.rowhead, .heading');
                const nameLink = rows[0].nextElementSibling.querySelector('a');
                const sizeString = Array.from(rows)
                    .find(row => row.textContent.includes('尺寸'))
                    ?.nextElementSibling?.innerText || '';
                const description = document.querySelector("h1").textContent.replace(/.*?\[/, '[').trim();
                return {
                    name: nameLink?.textContent.replace(/^\[TTG\]\s*|\s*\.torrent$/g, '') || '',
                    downloadLink: document.querySelector("td[valign='top'] a").getAttribute("href") || '',
                    description: description,
                    size: UTILS.parseSize(sizeString || 0),
                    insertPoint: rows[1].parentElement.parentElement,
                    rowType: 'common',
                    insertAction: (point, element) => point.insertBefore(element, point.children[2])
                };
            }
        },
        {
            id: 'hdsky',
            matches: () => window.location.href.includes('hdsky.me/details.php'),
            getInfo: () => {
                const rows = document.querySelectorAll('.rowhead');
                const nameRow = rows[0], downloadLinkRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                const nameLink = nameRow.parentElement.querySelector('.rowfollow input[type="submit"]').value.replace(/^\[HDSky\]\s*|\s*\.torrent$/g, '') || '';
                const downloadLink = downloadLinkRow.parentElement.querySelector('.rowfollow a').href  || '';
                const description = descRow.parentElement.querySelector('.rowfollow').textContent.trim() || '';
                const sizeString = sizeRow.parentElement.querySelector('.rowfollow').textContent.trim();
                return {
                    name: nameLink,
                    downloadLink: downloadLink,
                    description: description,
                    size: UTILS.parseSize(sizeString || 0),
                    insertPoint: rows[1].parentElement.parentElement,
                    rowType: 'common',
                    insertAction: (point, element) => point.insertBefore(element, point.children[2])
                };
            }
        },
        {
            id: 'sjtu',
            matches: () => window.location.href.includes('pt.sjtu.edu.cn/details.php'),
            getInfo: () => {
                const rows = document.querySelectorAll('.rowhead, .heading');
                const nameRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                const nameLink = nameRow.nextElementSibling.querySelector('a').textContent.replace(/^\[PT\]\.\s*|\s*\.torrent$/g, '') || '';
                const downloadLink = nameRow.nextElementSibling.querySelector('a')?.href || '';
                const description = descRow.parentElement.querySelector('.rowfollow').textContent.trim() || '';
                const sizeString = sizeRow.parentElement.querySelector('.rowfollow').textContent.trim();
                return {
                    name: nameLink,
                    downloadLink: downloadLink,
                    description: description,
                    size: UTILS.parseSize(sizeString || 0),
                    insertPoint: rows[1].parentElement.parentElement,
                    rowType: 'common',
                    insertAction: (point, element) => point.insertBefore(element, point.children[2])
                };
            }
        },
        {
            id: 'hdcity',
            matches: () => window.location.href.includes('hdcity.city/t-'),
            getInfo: () => {
                const rows = document.querySelectorAll('.blocktitle');
                const nameLink = rows[0].textContent;
                const sizeblock = rows[1].nextElementSibling.textContent;
                const description = rows[0].parentElement.querySelector('.blockcontent').textContent.trim() || "";
                const downloadLink =  rows[3].nextElementSibling.querySelector('input[type="text"][title="DirectLink"]').value || "";

                return {
                    name: nameLink,
                    downloadLink: downloadLink,
                    description: description,
                    size: UTILS.parseSize(sizeblock || 0),
                    insertPoint: document.querySelector('div.block'),
                    rowType: 'div',
                    insertAction: (point, element) => {
                        point.after(element);
                    }
                };
            }
        },
        {
            id: 'monikadesign',
            matches: () => window.location.href.includes('monikadesign.uk/torrents/'),
            getInfo: () => {
                const nameElement = document.querySelector('h1.text-center');
                const descriptionElement = document.querySelector('h2.text-center');
                const downloadLinkElement = document.querySelector('a.down[href*="/download/"]');
                const size = document.querySelector('.torrent-size td:nth-child(2)').textContent.trim();
                const insertPoint = document.querySelector('.meta-general tr.torrent-subhead');
                if (!nameElement || !insertPoint) return null;

                return {
                    name: nameElement.textContent.trim(),
                    description: descriptionElement ? descriptionElement.textContent.trim() : '',
                    downloadLink: downloadLinkElement ? downloadLinkElement.href : '',
                    size: UTILS.parseSize(size.replace(/iB/gi, 'B') || 0),
                    insertPoint: insertPoint,
                    rowType: 'common',
                    insertAction: (point, element) => {
                        point.after(element);
                    }
                };
            }
        },
        {
            id: 'bangumi-moe',
            matches: () => window.location.hostname === 'bangumi.moe',
            getInfo: () => {
                // 详情页（URL 直接访问）或弹窗（列表页内点击）
                const modal = document.querySelector('.torrent-details-content');
                const isDetailUrl = /^\/torrent\/[a-f0-9]+$/i.test(window.location.pathname);
                if (!isDetailUrl && !modal) return null;
                const root = modal || document;
                const titleEl = root.querySelector('a.title-link b') || root.querySelector('a[href*="/torrent/"]');
                const title = titleEl?.textContent?.trim()
                    || BT_SITE_HELPERS.text('.torrent-title, .subject-title, .title')
                    || document.title.replace(/\s*[-|_].*$/, '').trim();
                const downloadLink = (root.querySelector('a[href^="magnet:"]')?.href)
                    || BT_SITE_HELPERS.findDownloadLink(['a[href^="magnet:"]', 'a[href*="/download/"]', 'a[href*=".torrent"]']);
                const sizeText = root.querySelector('.filesize')?.textContent || root.textContent || '';
                const insertPoint = titleEl?.closest('.torrent-info') || root.querySelector('.torrent-info, .torrent-title') || document.body;
                return BT_SITE_HELPERS.simpleDivInfo({ name: title, description: title, downloadLink, sizeText, insertPoint });
            },
            getListInfo: () => {
                if (/^\/torrent\/[a-f0-9]+$/i.test(window.location.pathname)) return null;
                const items = document.querySelectorAll('div.torrent-title');
                return Array.from(items).map(item => {
                    const h3 = item.querySelector('h3');
                    const name = h3?.textContent?.trim();
                    if (!name) return null;
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: '',
                        sizeText: '',
                        insertPoint: item.closest('md-item, .torrent-row') || item.parentElement || item
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'mikanani',
            matches: () => window.location.hostname === 'mikanani.me' && window.location.pathname.startsWith('/Home/'),
            getInfo: () => {
                if (!window.location.pathname.includes('/Home/Episode/')) return null;
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
                const sizeText = document.body?.innerText || '';
                const insertPoint = document.querySelector('.episode-title, h1, h2, .an-text') || document.body;
                return BT_SITE_HELPERS.simpleDivInfo({ name: title, description, downloadLink, sizeText, insertPoint });
            },
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
                        insertPoint: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'comicat-kisssub',
            matches: () => /(^|\.)(comicat|kisssub)\.org$/i.test(window.location.hostname),
            getInfo: () => {
                if (!/\/show-[a-f0-9]{40}\.html$/i.test(window.location.pathname)) return null;
                const title = document.title.replace(/\s*-\s*(?:漫猫动漫|爱恋动漫)\s+[a-f0-9]{40}\s*$/i, '').trim();
                const hash = window.location.pathname.match(/show-([a-f0-9]{40})\.html/i)?.[1] || '';
                const encodedMagnet = Array.from(document.querySelectorAll('a[href*="magnet%3A"], a[href*="magnet%3a"]'))
                    .map(el => el.href.match(/magnet%3A.*$/i)?.[0])
                    .find(Boolean);
                const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                    'a[href^="magnet:"]',
                    'a[href*=".torrent"]'
                ]) || (encodedMagnet ? decodeURIComponent(encodedMagnet) : '') || (hash ? `magnet:?xt=urn:btih:${hash}` : '');
                const description = BT_SITE_HELPERS.text('.intro, .entry-content, .content, .description, .panel-body, article') || title;
                const sizeText = document.body?.innerText || '';
                const insertPoint = document.querySelector('.c2 > .box > .intro') || document.querySelector('.intro, .basic_info') || document.body;
                return BT_SITE_HELPERS.simpleDivInfo({ name: title, description, downloadLink, sizeText, insertPoint });
            },
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
                        insertPoint: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'acg-rip',
            matches: () => window.location.hostname === 'acg.rip',
            getInfo: () => {
                if (!/^\/t\/\d+$/.test(window.location.pathname)) return null;
                const panelContent = document.querySelector('.panel-body.post-content');
                const heading = panelContent?.parentElement?.querySelector('.panel-heading');
                const title = heading?.textContent?.trim() || document.title.replace(/\s*-\s*ACG\.RIP\s*$/i, '').trim();
                const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                    'a[href^="magnet:"]',
                    'a[href*=".torrent"]'
                ]);
                const description = BT_SITE_HELPERS.text('.panel-body.post-content') || title;
                const sizeText = document.body?.innerText || '';
                const insertPoint = heading || panelContent || document.body;
                return BT_SITE_HELPERS.simpleDivInfo({ name: title, description, downloadLink, sizeText, insertPoint });
            },
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
                        insertPoint: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'nyaa',
            matches: () => window.location.hostname === 'nyaa.si',
            getInfo: () => {
                if (!/^\/view\/\d+$/.test(window.location.pathname)) return null;
                const title = BT_SITE_HELPERS.text('h3.panel-title')
                    || document.title.replace(/\s*::\s*Nyaa\s*$/i, '').trim();
                const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                    'a[href^="magnet:"]',
                    'a[href*="/download/"]',
                    'a[href*=".torrent"]'
                ]);
                const description = BT_SITE_HELPERS.text('#torrent-description') || title;
                const sizeText = document.body?.innerText || '';
                const insertPoint = document.querySelector('.panel-heading') || document.body;
                return BT_SITE_HELPERS.simpleDivInfo({ name: title, description, downloadLink, sizeText, insertPoint });
            },
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
                        insertPoint: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'generic-nexusphp',
            matches: () => document.querySelector('.rowhead') && !window.location.href.includes('totheglory.im') && !window.location.href.includes('hdsky.me') && !window.location.href.includes('hdsky.me') && !window.location.href.includes('hdcity.city'),
            getInfo: () => {
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
                    insertPoint: nameRow.parentElement.parentElement,
                    rowType: 'common',
                    insertAction: (point, element) => point.insertBefore(element, point.children[2])
                };
            }
        },
        {
            id: 'm-team',
            matches: () => /m-team\.(cc|io)\/detail\//.test(window.location.href),
            getInfo: () => {
                // 检查旧版UI,域名是否为ob.m-team.cc
                const isNewUI = !window.location.hostname.includes('ob.m-team.cc');
                if (isNewUI) {
                    // --- 新版UI逻辑 ---
                    const titleElement = document.querySelector('h2 > span.align-middle');
                    const descriptionElement = document.querySelector('p.text-mt-gray-4');
                    const sizeElement = Array.from(document.querySelectorAll('.ant-space-item .ant-typography')).find(el => el.textContent.includes('體積:'));
                    const insertPointElement = document.querySelector('h2')?.parentElement;
                    if (!titleElement || !insertPointElement) return null;
                    return {
                        name: titleElement.textContent.trim(),
                        description: descriptionElement ? descriptionElement.textContent.trim() : '',
                        size: sizeElement ? UTILS.parseSize(sizeElement.textContent) : 0,
                        downloadLink: '',
                        insertPoint: insertPointElement,
                        insertAction: (point, element) => point.after(element),
                        rowType: 'div'
                    };
                } else {
                    // --- 旧版UI逻辑 ---
                    const rows = document.querySelectorAll('.ant-descriptions-item-label');
                    if (rows.length < 3) return null;
                    const nameRow = rows[0], dlRow = rows[1], sizeRow = rows[2];
                    if (!nameRow.nextElementSibling || !dlRow.nextElementSibling || !sizeRow.nextElementSibling) return null;
                    const nameLink = nameRow.nextElementSibling.querySelector('a');
                    return {
                        name: nameLink?.textContent.replace(/\.torrent$/, '') || '',
                        downloadLink: '',
                        description: dlRow.nextElementSibling.innerText || '',
                        size: UTILS.parseSize(sizeRow.nextElementSibling.innerText),
                        insertPoint: nameRow.parentElement.parentElement,
                        rowType: 'common',
                        insertAction: (point, element) => point.insertBefore(element, point.children[2])
                    };
                }
            }
        }
    ];

    const Site = {
        adapter: null,
        init() {
            this.adapter = SITE_ADAPTERS.find(a => a.matches());
            if (this.adapter) {
                GM_log(`[${SCRIPT_NAME}] Matched site: ${this.adapter.id}`);
            } else {
                GM_log(`[${SCRIPT_NAME}] No matching site adapter found.`);
            }
        },
        async getTorrentInfo() {
            if (!this.adapter) return null;
            // 优先列表模式（多条）
            if (this.adapter.getListInfo) {
                const list = await this.adapter.getListInfo();
                if (list && list.length > 0) return list;
            }
            // 回退到详情页单条模式
            const single = await this.adapter.getInfo();
            return single ? [single] : null;
        }
    };


    // ——————————————————————————————————————
    // [4.5] M-Team 链接多层捕获 (MTEAM LINK CAPTURE)
    // ——————————————————————————————————————

    const MTeamLinkCapture = {
        _runtimeLinks: {},
        _prefetchState: {},
        _watcherState: {},
        _listenerInstalled: false,
        _hookInstalled: false,

        _getCurrentTid() {
            const m = window.location.pathname.match(/\/detail\/(\d+)/);
            return m ? m[1] : '';
        },

        _isLikelyTorrentDownloadUrl(url) {
            const s = String(url || '');
            if (!s) return false;
            if (/\/api\/rss\/dlv2\?/i.test(s)) return true;
            if (/\/api\/torrent\/download\?/i.test(s)) return true;
            if (/\.torrent(?:\?|$)/i.test(s)) return true;
            if (/[?&](?:app_id|payload|playload)=/i.test(s) && /[?&]sign=/i.test(s) && /[?&]t=/i.test(s)) return true;
            if (/halomt\.com/i.test(s) && /[?&]sign=/i.test(s)) return true;
            return false;
        },

        _isAllowedDownloadHost(url) {
            try {
                const host = new URL(url).hostname.toLowerCase();
                return /(^|\.)m-team\.cc$|(^|\.)m-team\.io$|(^|\.)halomt\.com$/.test(host);
            } catch (e) {
                return false;
            }
        },

        _extractLinkFromString(text) {
            const raw = String(text || '')
                .replace(/\\\//g, '/')
                .replace(/\\u002F/ig, '/')
                .replace(/\\u003A/ig, ':')
                .replace(/\\u003F/ig, '?')
                .replace(/\\u003D/ig, '=')
                .replace(/\\u0026/ig, '&')
                .replace(/\\u0025/ig, '%')
                .replace(/&amp;/g, '&');
            const match = raw.match(/https?:\/\/[^\s"'`<>\\]+|\/api\/rss\/dlv2\?[^\s"'`<>\\]+|\/api\/torrent\/download\?[^\s"'`<>\\]+/i);
            if (!match) return '';
            try {
                return new URL(match[0], window.location.origin).href;
            } catch (e) {
                return '';
            }
        },

        _deepFindDownloadLinkInObject(root, maxNodes = 5000) {
            if (!root) return '';
            const stack = [root];
            const visited = new Set();
            let count = 0;
            while (stack.length && count < maxNodes) {
                const current = stack.pop();
                count++;
                if (!current) continue;
                const t = typeof current;
                if (t === 'string') {
                    const parsed = this._extractLinkFromString(current);
                    if (parsed) return parsed;
                    continue;
                }
                if (t !== 'object' && t !== 'function') continue;
                if (visited.has(current)) continue;
                visited.add(current);
                let keys = [];
                try { keys = Object.keys(current); } catch (e) { continue; }
                for (const key of keys) {
                    let val;
                    try { val = current[key]; } catch (e) { continue; }
                    if (typeof val === 'string') {
                        const parsed = this._extractLinkFromString(val);
                        if (parsed) return parsed;
                    } else if (val && (typeof val === 'object' || typeof val === 'function')) {
                        stack.push(val);
                    }
                }
            }
            return '';
        },

        _findNativeDownloadButton() {
            // 精确选择器：m-team 新版 UI 的下载按钮位置（避免误匹配其他导航按钮导致跳转）
            const exactSelector = '#app-content > div > div.app-content__inner.px-\\[40px\\].flex.flex-col.justify-between > div.mx-auto.w-full > div.flex.py-5.mb-5.border-0.border-b.border-solid.border-\\[--mt-line-color\\].sticky.items-start.top-0.z-\\[999\\].bg-mt-primary-1.text-\\[--mt-text-base\\] > div.flex-grow.w-1.flex.flex-col.justify-between > div.flex.justify-between > div > div > div > div:nth-child(4)';
            const exact = document.querySelector(exactSelector);
            if (exact) return exact;

            // 兜底：在标题栏 sticky 容器内找带 download 关键字的元素
            const scope = document.querySelector('div.flex.py-5.mb-5.sticky') || document.querySelector('#app-content');
            if (!scope) return null;
            const candidates = scope.querySelectorAll('[class*="download" i], [title*="下載"], [title*="下载"], [aria-label*="下載"], [aria-label*="下载"]');
            for (const c of candidates) {
                const txt = (c.textContent || '').toLowerCase();
                if (txt.includes('下載') || txt.includes('下载') || txt.includes('download')) return c;
            }
            return null;
        },

        _dispatchSyntheticClick(el) {
            if (!el) return;
            try { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
            try { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
            try { el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
            try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
            try { if (typeof el.click === 'function') el.click(); } catch (e) {}
        },

        _getDownloadAttrsFromElement(el) {
            if (!el || typeof el.getAttribute !== 'function') return [];
            const attrs = ['href', 'data-url', 'data-href', 'onclick', 'title', 'aria-label'];
            const values = [];
            attrs.forEach((attr) => {
                const v = el.getAttribute(attr);
                if (v) values.push(v);
            });
            if (el.outerHTML) values.push(el.outerHTML);
            return values;
        },

        setRuntimeLink(url, source) {
            const tid = this._getCurrentTid();
            if (!tid || !url) return;
            const existing = this._runtimeLinks[tid];
            if (existing?.url === url) {
                existing.at = Date.now();
                return;
            }
            this._runtimeLinks[tid] = { url, source: source || 'runtime', at: Date.now() };
            GM_log(`[${SCRIPT_NAME}] M-Team 链接已捕获: ${source} → ${url}`);
            try {
                document.dispatchEvent(new CustomEvent('mp-mteam-runtime-link-updated', { detail: { tid, url, source } }));
            } catch (e) {}
        },

        getRuntimeLink() {
            const tid = this._getCurrentTid();
            if (!tid) return '';
            const item = this._runtimeLinks[tid];
            if (!item?.url) return '';
            if (Date.now() - (item.at || 0) > 10 * 60 * 1000) return '';
            return item.url;
        },

        init() {
            this._installRuntimeCaptureListener();
            this._installPageContextHook();
            this._installNativeDownloadHook();
        },

        _installRuntimeCaptureListener() {
            if (this._listenerInstalled) return;
            this._listenerInstalled = true;
            document.addEventListener('mp-download-url-captured', (ev) => {
                try {
                    const rawUrl = ev?.detail?.url || '';
                    const source = ev?.detail?.source || 'page-hook';
                    if (!rawUrl) return;
                    const abs = new URL(rawUrl, window.location.origin).href;
                    if (!this._isLikelyTorrentDownloadUrl(abs)) return;
                    if (!this._isAllowedDownloadHost(abs)) return;
                    const tid = this._getCurrentTid();
                    if (tid && /[?&]tid=\d+/.test(abs) && !new RegExp(`[?&]tid=${tid}(?:&|$)`).test(abs)) return;
                    this.setRuntimeLink(abs, `page:${source}`);
                } catch (e) {}
            }, true);
        },

        _installPageContextHook() {
            if (this._hookInstalled) return;
            this._hookInstalled = true;
            if (document.getElementById('mp-mteam-page-hook-script')) return;

            const script = document.createElement('script');
            script.id = 'mp-mteam-page-hook-script';
            script.textContent = `(function(){
                if(window.__mpMTeamPageHookInstalled)return;
                window.__mpMTeamPageHookInstalled=true;
                window.__mpMTeamPrefetchUntil=0;
                function shouldCapture(url){try{var s=String(url||'').toLowerCase();return s.indexOf('dlv2')>=0||s.indexOf('torrent/download')>=0||s.indexOf('.torrent')>=0||(s.indexOf('halomt.com')>=0&&s.indexOf('sign=')>=0)||((s.indexOf('app_id=')>=0||s.indexOf('payload=')>=0)&&s.indexOf('sign=')>=0)}catch(e){return false}}
                function inPrefetch(){try{return Date.now()<(window.__mpMTeamPrefetchUntil||0)}catch(e){return false}}
                try{document.addEventListener('mp-mteam-prefetch-mode',function(ev){try{var d=Number(ev&&ev.detail&&ev.detail.duration)||5000;if(d<500)d=500;window.__mpMTeamPrefetchUntil=Date.now()+d}catch(e){}},true)}catch(e){}
                function emit(url,source){try{if(!url||!shouldCapture(url))return;document.dispatchEvent(new CustomEvent('mp-download-url-captured',{detail:{url:String(url),source:source||'page-hook'}}))}catch(e){}}
                try{var origOpen=window.open;if(typeof origOpen==='function'){window.open=function(url){emit(url,'window.open');if(inPrefetch()&&shouldCapture(url))return null;return origOpen.apply(this,arguments)}}}catch(e){}
                try{if(window.fetch){var origFetch=window.fetch;window.fetch=function(input){try{var u=(typeof input==='string')?input:(input&&input.url);emit(u,'fetch')}catch(e){}return origFetch.apply(this,arguments)}}}catch(e){}
                try{var origXhrOpen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url){emit(url,'xhr.open');return origXhrOpen.apply(this,arguments)}}catch(e){}
                try{var origAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){emit(this&&this.href,'anchor.click');if(inPrefetch()&&shouldCapture(this&&this.href))return;return origAnchorClick.apply(this,arguments)}}catch(e){}
                try{document.addEventListener('click',function(ev){var path=ev.composedPath?ev.composedPath():[ev.target];for(var i=0;i<path.length;i++){var n=path[i];if(!n||!n.getAttribute)continue;emit(n.getAttribute('href'),'dom.click');emit(n.getAttribute('data-url'),'dom.click');emit(n.getAttribute('data-href'),'dom.click')}},true)}catch(e){}
            })();`;
            (document.documentElement || document.head || document.body).appendChild(script);
        },

        _installNativeDownloadHook() {
            const nativeBtn = this._findNativeDownloadButton();
            if (!nativeBtn) return;
            if (nativeBtn.dataset?.mpHooked === '1') return;
            if (nativeBtn.dataset) nativeBtn.dataset.mpHooked = '1';

            nativeBtn.addEventListener('click', () => {
                try {
                    this._getDownloadAttrsFromElement(nativeBtn).forEach((raw) => {
                        const parsed = this._extractLinkFromString(raw);
                        if (parsed && this._isLikelyTorrentDownloadUrl(parsed) && this._isAllowedDownloadHost(parsed)) {
                            this.setRuntimeLink(parsed, 'native-click');
                        }
                    });
                } catch (e) {}

                [250, 800, 1600, 2600, 4000].forEach((delay) => {
                    setTimeout(() => {
                        const perfHit = this._captureFromPerformance(`native-click+${delay}ms`);
                        if (perfHit) return;
                        const late = this.extractDownloadLink();
                        if (late) this.setRuntimeLink(late, `native-click-extract+${delay}ms`);
                    }, delay);
                });
            }, true);
        },

        _captureFromPerformance(source) {
            const tid = this._getCurrentTid();
            if (!tid) return '';
            try {
                const entries = performance.getEntriesByType('resource') || [];
                for (let i = entries.length - 1; i >= 0; i--) {
                    const url = entries[i]?.name || '';
                    if (!this._isLikelyTorrentDownloadUrl(url)) continue;
                    if (!this._isAllowedDownloadHost(url)) continue;
                    if (/[?&]tid=\d+/.test(url) && !new RegExp(`[?&]tid=${tid}(?:&|$)`).test(url)) continue;
                    this.setRuntimeLink(url, source || 'performance');
                    return url;
                }
            } catch (e) {}
            return '';
        },

        extractDownloadLink() {
            const tid = this._getCurrentTid();
            const seen = new Set();
            let bestUrl = '';

            const tryPush = (raw, source) => {
                if (!raw) return;
                let abs = '';
                try { abs = new URL(String(raw).replace(/\\\//g, '/').replace(/&amp;/g, '&'), window.location.origin).href; } catch (e) { return; }
                if (!this._isLikelyTorrentDownloadUrl(abs)) return;
                if (!this._isAllowedDownloadHost(abs)) return;
                if (tid && /[?&]tid=\d+/.test(abs) && !new RegExp(`[?&]tid=${tid}(?:&|$)`).test(abs)) return;
                if (!seen.has(abs)) {
                    seen.add(abs);
                    if (!bestUrl) bestUrl = abs;
                }
            };

            // 1. 运行时缓存
            const cached = this.getRuntimeLink();
            if (cached) return cached;

            // 2. 原生下载按钮
            const nativeBtn = this._findNativeDownloadButton();
            if (nativeBtn) {
                this._getDownloadAttrsFromElement(nativeBtn).forEach((raw) => {
                    tryPush(this._extractLinkFromString(raw), 'native-btn');
                });
                const reactKeys = Object.keys(nativeBtn).filter(k => /^__reactProps\$|^__reactFiber\$/i.test(k));
                reactKeys.forEach((key) => {
                    const reactHit = this._deepFindDownloadLinkInObject(nativeBtn[key]);
                    if (reactHit) tryPush(reactHit, `react:${key}`);
                });
            }

            // 3. DOM selector 扫描
            const selectors = [
                'a[href*="/api/rss/dlv2"]', 'a[href*="dlv2"]', 'a[href*="torrent/download"]',
                'a[href*=".torrent"]', '[data-url*="dlv2"]', '[data-href*="dlv2"]',
                '[class*="download"]', 'button[onclick*="dlv2"]', 'a[onclick*="download"]'
            ];
            for (const selector of selectors) {
                try {
                    document.querySelectorAll(selector).forEach((node) => {
                        const href = node.getAttribute('href');
                        if (href) tryPush(href, selector);
                        const dataUrl = node.getAttribute('data-url') || node.getAttribute('data-href');
                        if (dataUrl) tryPush(dataUrl, selector);
                        const inline = node.getAttribute('onclick') || node.textContent;
                        const parsed = this._extractLinkFromString(inline);
                        if (parsed) tryPush(parsed, selector);
                    });
                } catch (e) {}
            }

            // 4. Performance API
            if (!bestUrl) this._captureFromPerformance('extract-fallback');

            // 5. 兜底扫脚本文本
            if (!bestUrl) {
                document.querySelectorAll('script').forEach((s) => {
                    const parsed = this._extractLinkFromString(s.textContent || '');
                    if (parsed) tryPush(parsed, 'script');
                });
            }

            return bestUrl || this.getRuntimeLink();
        },

        _triggerPrefetchMode(durationMs = 5000) {
            try {
                document.dispatchEvent(new CustomEvent('mp-mteam-prefetch-mode', { detail: { duration: durationMs } }));
            } catch (e) {}
        },

        _startMutationWatcher(reason = 'auto', windowMs = 9000) {
            const tid = this._getCurrentTid();
            if (!tid) return;
            const state = this._watcherState[tid];
            if (state?.active) return;

            const observer = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.type !== 'attributes') continue;
                    const node = m.target;
                    if (!node || typeof node.getAttribute !== 'function') continue;
                    this._getDownloadAttrsFromElement(node).forEach((raw) => {
                        const parsed = this._extractLinkFromString(raw);
                        if (parsed && this._isLikelyTorrentDownloadUrl(parsed) && this._isAllowedDownloadHost(parsed)) {
                            this.setRuntimeLink(parsed, `mutation:${reason}`);
                        }
                    });
                }
            });

            this._watcherState[tid] = { active: true, observer };
            observer.observe(document.documentElement || document.body, {
                subtree: true, attributes: true,
                attributeFilter: ['href', 'data-url', 'data-href', 'onclick', 'title', 'aria-label']
            });
            setTimeout(() => {
                try { observer.disconnect(); } catch (e) {}
                this._watcherState[tid] = { active: false };
            }, windowMs);
        },

        autoPrefetch(reason = 'auto', options = {}) {
            const tid = this._getCurrentTid();
            if (!tid) return;
            if (this.getRuntimeLink()) return;

            const force = Boolean(options.force);
            const cooldownMs = Number(options.cooldownMs || 30000);
            const lastTs = this._prefetchState[tid] || 0;
            if (!force && Date.now() - lastTs < cooldownMs) return;

            const nativeBtn = this._findNativeDownloadButton();
            if (!nativeBtn) {
                GM_log(`[${SCRIPT_NAME}] M-Team 预取跳过: 未找到原生下载按钮 (${reason})`);
                return;
            }

            this._prefetchState[tid] = Date.now();
            GM_log(`[${SCRIPT_NAME}] M-Team 预取开始: ${reason}`);

            this._triggerPrefetchMode(8000);
            this._startMutationWatcher(reason, 9000);
            this._dispatchSyntheticClick(nativeBtn);

            [300, 900, 1600, 2600, 4000, 5200].forEach((delay) => {
                setTimeout(() => {
                    const perfHit = this._captureFromPerformance(`prefetch+${delay}ms`);
                    if (perfHit) return;
                    const late = this.extractDownloadLink();
                    if (late) this.setRuntimeLink(late, `prefetch-extract+${delay}ms`);
                }, delay);
            });
        },

        async waitForLinkOnDemand(initialLink = '') {
            this.autoPrefetch('manual-push', { force: true, cooldownMs: 1200 });
            const immediate = this.extractDownloadLink() || initialLink;
            if (immediate) return immediate;

            return new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 24;
                const intervalMs = 700;

                const cleanup = () => {
                    clearInterval(timer);
                    document.removeEventListener('mp-mteam-runtime-link-updated', onRuntimeLink, true);
                };

                const onRuntimeLink = () => {
                    const got = this.getRuntimeLink() || this.extractDownloadLink();
                    if (got) { cleanup(); resolve(got); }
                };
                document.addEventListener('mp-mteam-runtime-link-updated', onRuntimeLink, true);

                const timer = setInterval(() => {
                    attempts++;
                    if (attempts % 2 === 0) {
                        this.autoPrefetch('manual-push-retry', { force: true, cooldownMs: 1200 });
                    }
                    const got = this.getRuntimeLink() || this.extractDownloadLink();
                    if (got) { cleanup(); resolve(got); return; }
                    if (attempts >= maxAttempts) { cleanup(); resolve(''); }
                }, intervalMs);
            });
        },

        pruneCaches() {
            const now = Date.now();
            const maxAgeMs = 10 * 60 * 1000;
            const tid = this._getCurrentTid();
            Object.keys(this._runtimeLinks).forEach((k) => {
                if (k === tid) return;
                if (now - (this._runtimeLinks[k]?.at || 0) > maxAgeMs) delete this._runtimeLinks[k];
            });
            Object.keys(this._prefetchState).forEach((k) => {
                if (k === tid) return;
                if (now - (this._prefetchState[k] || 0) > maxAgeMs) delete this._prefetchState[k];
            });
        }
    };


    // ——————————————————————————————————————
    // [5] 核心逻辑 (CORE LOGIC)
    // ——————————————————————————————————————

    const Core = {
        async handlePage() {
            const torrentInfoList = await Site.getTorrentInfo();
            if (!torrentInfoList || torrentInfoList.length === 0) {
                GM_log(`[${SCRIPT_NAME}] Could not extract torrent info.`);
                return;
            }
            GM_log(`[${SCRIPT_NAME}] 匹配到 ${torrentInfoList.length} 条种子信息`);
            for (const torrentInfo of torrentInfoList) {
                if (!torrentInfo || !torrentInfo.name) continue;
                this._processOneTorrent(torrentInfo);
            }
        },

        _processOneTorrent(torrentInfo) {
            const { name, description, downloadLink, size, insertPoint, insertIndex, insertAction, rowType } = torrentInfo;

            // 去重：insertPoint 附近已有识别按钮则跳过
            if (insertPoint?.nextElementSibling?.querySelector?.('.mp-recognize-trigger')
                || insertPoint?.querySelector?.('.mp-recognize-trigger')) return;

            const row = document.createElement(rowType === 'common' ? 'tr' : 'div');
            if (rowType === 'common' && window.location.href.includes("m-team")) {
                row.className = "ant-descriptions-row";
            }
            if (insertAction) {
                insertAction(insertPoint, row);
            } else if (insertPoint && typeof insertIndex !== 'undefined') {
                insertPoint.insertBefore(row, insertPoint.children[insertIndex]);
            } else {
                GM_log(`[${SCRIPT_NAME}] No valid insert point for UI.`);
                return;
            }

            const torrentData = { name, description, downloadLink, size };

            // 检查缓存：有则直接渲染成功结果，无则显示手动入口
            const cached = Cache.get(name);
            if (cached && cached.media_info) {
                GM_log(`[${SCRIPT_NAME}] 命中识别缓存: ${name}`);
                this.renderSuccess(row, rowType, cached, torrentData);
            } else {
                this.renderManualEntry(row, rowType, torrentData);
            }
        },

        renderManualEntry(row, rowType, torrentInfo, state = 'idle', message = '点击识别') {
            const containerStyle = `display: flex; align-items: center; gap: 5px; flex-wrap: wrap;`;
            const buttonStyle = `background-color:${CONSTANTS.COLORS.BTN_SAVE}; color:white; border:none; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer; padding: 0.25rem 0.75rem;`;
            const isRunning = state === 'running';
            const tagColor = state === 'error' ? CONSTANTS.COLORS.WARNING : (isRunning ? CONSTANTS.COLORS.PRIMARY : CONSTANTS.COLORS.SECONDARY);
            const manualTag = `<span class="mp-recognize-trigger" data-state="${state}">${UI.renderTag(message, tagColor)}</span>`;
            const showButton = state === 'success';
            const downloadButton = showButton ? `<button id="mp-download-button" style="${buttonStyle}">下载种子</button>` : '';

            const html = `<div style="${containerStyle}">${manualTag}${downloadButton}</div>`;
            row.innerHTML = UI.renderRecognizeRow(rowType, html);
            this.attachRecognizeTrigger(row, rowType, torrentInfo);
        },

        attachRecognizeTrigger(row, rowType, torrentInfo) {
            const trigger = row.querySelector('.mp-recognize-trigger');
            if (!trigger) return;
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const state = trigger.getAttribute('data-state');
                if (state === 'running') return;
                this.startRecognition(row, rowType, torrentInfo);
            });
        },

        async startRecognition(row, rowType, torrentInfo) {
            const setRunning = (msg) => {
                const trigger = row.querySelector('.mp-recognize-trigger');
                if (trigger) {
                    trigger.setAttribute('data-state', 'running');
                    trigger.innerHTML = UI.renderTag(msg, CONSTANTS.COLORS.PRIMARY);
                }
            };
            setRunning('识别中...');

            try {
                const candidates = UTILS.getRecognitionCandidates(torrentInfo.name, torrentInfo.description);
                GM_log(`[${SCRIPT_NAME}] 识别候选词:`, candidates);

                for (let i = 0; i < candidates.length; i++) {
                    if (i > 0) setRunning(`识别重试 (${i + 1}/${candidates.length})...`);
                    const subtitle = i === 0 ? torrentInfo.description : '';
                    try {
                        const data = await API.recognize(candidates[i], subtitle);
                        if (data && data.media_info) {
                            Cache.set(torrentInfo.name, data);
                            this.renderSuccess(row, rowType, data, torrentInfo);
                            return;
                        }
                    } catch (e) {
                        if ((e.message || '').includes('配置不完整') || (e.message || '').includes('API Key')) {
                            this.renderManualEntry(row, rowType, torrentInfo, 'error', '配置异常，重试');
                            return;
                        }
                        GM_log(`[${SCRIPT_NAME}] 候选词识别失败: ${candidates[i]}`, e);
                    }
                }

                if (CONFIG.get('tmdbKey')) {
                    setRunning('TMDB 智能匹配中...');
                    const mediaInfo = await this.tmdbFallback(candidates, torrentInfo.description);
                    if (mediaInfo && mediaInfo.tmdb_id) {
                        const data = { media_info: mediaInfo, meta_info: {} };
                        Cache.set(torrentInfo.name, data);
                        this.renderSuccess(row, rowType, data, torrentInfo);
                        return;
                    }
                }

                this.renderManualEntry(row, rowType, torrentInfo, 'error', '识别失败，重试');
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Recognition failed:`, error);
                const message = (error.message || '').includes('配置不完整') ? '配置异常，重试' : '识别失败，重试';
                this.renderManualEntry(row, rowType, torrentInfo, 'error', message);
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

        renderSuccess(row, rowType, data, torrentInfo) {
            const { media_info, meta_info } = data;
            const containerStyle = `display: flex; align-items: center; gap: 5px; flex-wrap: wrap;`;
            let finalHtml = `<div style="${containerStyle}">`;

            // Manual trigger + Download Button
            finalHtml += `<span class="mp-recognize-trigger" data-state="idle">${UI.renderTag('重新识别', CONSTANTS.COLORS.SECONDARY)}</span>`;
            const buttonStyle = `background-color:${CONSTANTS.COLORS.BTN_SAVE}; color:white; border:none; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer; padding: 0.25rem 0.75rem;`;
            finalHtml += `<button id="mp-download-button" style="${buttonStyle}">下载种子</button>`;

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
            row.innerHTML = UI.renderRecognizeRow(rowType, finalHtml);

            // Add event listeners
            this.addSuccessListeners(row, data, torrentInfo);
            this.attachRecognizeTrigger(row, rowType, torrentInfo);
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

            const downloadButton = row.querySelector('#mp-download-button');
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
            const originalText = "下载种子";
            const setStatus = (text) => { button.textContent = text; UI.showToast(text, 2000); };

            try {
                // M-Team 链接获取
                if (Site.adapter.id === 'm-team') {
                    setStatus("M-Team: 获取下载链接...");
                    let link = await MTeamLinkCapture.waitForLinkOnDemand(torrentInfo.downloadLink);
                    if (!link) {
                        try { link = await API.getMteamDownloadLink(); } catch (e) { GM_log(`[${SCRIPT_NAME}] genDlToken 失败:`, e); }
                    }
                    if (!link) {
                        setStatus("链接获取失败");
                        setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
                        return;
                    }
                    torrentInfo.downloadLink = link;
                }

                // 1. 获取站点信息
                setStatus("查询站点信息...");
                let siteData = null;
                try {
                    siteData = await API.getSite();
                    setStatus(`站点: ${siteData.name}`);
                } catch (e) {
                    setStatus("站点未适配，使用通用模式...");
                    GM_log(`[${SCRIPT_NAME}] getSite 失败:`, e);
                }

                // 2. 推送到 MoviePilot
                setStatus("推送到 MoviePilot...");
                const torrentPayload = {
                    title: torrentInfo.name,
                    description: torrentInfo.description,
                    page_url: window.location.href,
                    enclosure: torrentInfo.downloadLink,
                    size: torrentInfo.size,
                    site: siteData?.id || -1,
                    site_name: siteData?.name || window.location.hostname,
                    site_cookie: siteData?.cookie || '',
                    proxy: siteData?.proxy || false,
                    pubdate: UTILS.getFormattedDate(),
                    site_ua: navigator.userAgent
                };
                await API.download(media_info, torrentPayload);
                setStatus("MoviePilot 推送成功");
                button.disabled = false;
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] MoviePilot download failed:`, error);

                // 3. MoviePilot 失败，尝试 qBittorrent 直推
                if (QB.isConfigured() && torrentInfo.downloadLink) {
                    try {
                        setStatus("qBittorrent 直推中...");
                        await QB.addTorrent(torrentInfo.downloadLink, torrentInfo.name);
                        setStatus("qBittorrent 推送成功");
                        button.disabled = false;
                        return;
                    } catch (qbErr) {
                        GM_log(`[${SCRIPT_NAME}] qBittorrent failed:`, qbErr);
                        setStatus(`qB失败: ${qbErr.message}`);
                        setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
                        return;
                    }
                }
                setStatus(`推送失败: ${error.message || '未知错误'}`);
                setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
            }
        }
    };


    // ——————————————————————————————————————
    // [6] 辅助函数 & 初始化 (UTILS & INITIALIZATION)
    // ——————————————————————————————————————

    const UTILS = {
        parseSize(sizeStr) {
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

    function main() {
        // 1. 加载配置
        CONFIG.load();

        // 2. 注册菜单命令
        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand("配置Moviepilot参数", () => UI.showConfigModal(false), "c");
            GM_registerMenuCommand("清除识别缓存", () => Cache.clear(), "x");
            GM_registerMenuCommand("重置所有配置", CONFIG.reset, "r");
        }
    
        // 3. 确保配置存在，否则弹窗并终止
        if (!CONFIG.ensure()) {
            return;
        }
    
        // 4. 初始化站点适配器
        Site.init();
        if (!Site.adapter) {
            return; // 如果没有适配器，则不执行页面注入
        }

        let hasBooted = false;
        const bootCore = () => {
            if (hasBooted) return;
            hasBooted = true;
            Core.handlePage();
        };

        // 5. 处理 M-Team 的动态加载，等待详细信息出现后再渲染入口
        if (Site.adapter.id === 'm-team') {
            // 立即初始化链接捕获，越早 hook fetch/XHR 命中越多
            MTeamLinkCapture.init();

            const originOpen = XMLHttpRequest.prototype.open;
            let executed = false;
            XMLHttpRequest.prototype.open = function(...args) {
                const url = args[1];
                if (typeof url === 'string' && url.includes("/api/torrent/detail")) {
                    this.addEventListener("readystatechange", function() {
                        if (this.readyState === 4 && this.status === 200) {
                            if (executed) return;
                            try {
                                const res = JSON.parse(this.responseText);
                                if (res && res.message === 'SUCCESS') {
                                    executed = true;
                                    GM_log(`[${SCRIPT_NAME}] M-Team torrent detail API intercepted. Recognition trigger is ready.`);
                                    setTimeout(() => {
                                        bootCore();
                                        // 启动后再 hook 一次原生按钮（此时 DOM 才齐全）
                                        MTeamLinkCapture._installNativeDownloadHook();
                                        // 不在初始化时自动预取（合成点击可能导致跳转），
                                        // 链接获取延迟到用户点击"下载种子"时按需触发
                                    }, 200);
                                }
                            } catch (e) {
                                GM_log(`[${SCRIPT_NAME}] Error parsing M-Team API response.`, e);
                            }
                        }
                    });
                }
                originOpen.apply(this, args);
            };
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
            bootCore();
        }
    }

    // 启动！
    main();

})();

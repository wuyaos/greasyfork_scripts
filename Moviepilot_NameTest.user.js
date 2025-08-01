// ==UserScript==
// @name         moviepilotNameTest(自用)
// @namespace    http://tampermonkey.net/
// @version      3.0.2
// @description  moviepilots名称测试 - 重构优化版
// @author       yubanmeiqin9048, benz1 (Refactored by ffwu & AI)
// @match        https://*/details.php?id=*
// @match        https://*/details_movie.php?id=*
// @match        https://*/details_tv.php?id=*
// @match        https://*/details_animate.php?id=*
// @match        https://totheglory.im/t/*
// @match        https://*.dmhy.org/*
// @match        https://*.m-team.cc/detail/*
// @match        https://*.m-team.io/detail/*
// @match        https://hdcity.city/t-*
// @match        https://monikadesign.uk/torrents/*
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
            GET_SITE: '/api/v1/site/domain/',
            DOWNLOAD: '/api/v1/download/',
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
            moviepilotPassword: ''
        }
    };

    const CONFIG = {
        _values: {},

        load() {
            this._values.url = GM_getValue('moviepilotUrl', CONSTANTS.DEFAULT_CONFIG.moviepilotUrl);
            this._values.user = GM_getValue('moviepilotUser', CONSTANTS.DEFAULT_CONFIG.moviepilotUser);
            this._values.pass = GM_getValue('moviepilotPassword', CONSTANTS.DEFAULT_CONFIG.moviepilotPassword);
            GM_log(`[${SCRIPT_NAME}] 配置已加载。`);
        },

        save({ url, user, pass }) {
            GM_setValue('moviepilotUrl', url);
            GM_setValue('moviepilotUser', user);
            GM_setValue('moviepilotPassword', pass);
            this.load(); // Reload config after saving
            GM_log(`[${SCRIPT_NAME}] 配置已保存。`);
            UI.showToast(`[${SCRIPT_NAME}] 配置已保存。部分更改可能需要刷新页面生效。`);
        },

        reset() {
            if (confirm(`[${SCRIPT_NAME}]\n\n确定要重置所有配置吗？\n\n这将清除所有存储的 Moviepilot 设置并刷新页面。`)) {
                GM_deleteValue('moviepilotUrl');
                GM_deleteValue('moviepilotUser');
                GM_deleteValue('moviepilotPassword');
                GM_log(`[${SCRIPT_NAME}] 所有配置已重置。正在刷新页面...`);
                location.reload();
            }
        },

        get(key) {
            return this._values[key];
        },

        ensure() {
            if (!this.get('url') || !this.get('user')) {
                GM_log(`[${SCRIPT_NAME}] 配置不完整，显示配置弹窗。`);
                UI.showConfigModal(true);
                return false;
            }
            GM_log(`[${SCRIPT_NAME}] 配置完整。URL: ${this.get('url')}, User: ${this.get('user')}`);
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
            this.configModal.element.querySelector('.mp-save-btn').addEventListener('click', () => {
                const newConfig = {
                    url: document.getElementById('mpUrl').value.trim(),
                    user: document.getElementById('mpUser').value.trim(),
                    pass: document.getElementById('mpPass').value
                };
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
        },

        _getConfigModalHTML() {
            return `
                <h2>配置 Moviepilot 参数</h2>
                <div>
                    <label for="mpUrl">Moviepilot服务器 URL:</label>
                    <input type="text" id="mpUrl" value="${CONFIG.get('url') || ''}">
                </div>
                <div>
                    <label for="mpUser">用户名:</label>
                    <input type="text" id="mpUser" value="${CONFIG.get('user') || ''}">
                </div>
                <div>
                    <label for="mpPass">密码:</label>
                    <input type="password" id="mpPass" value="${CONFIG.get('pass') || ''}">
                </div>
                <div class="mp-modal-buttons">
                    <button class="mp-cancel-btn">取消</button>
                    <button class="mp-save-btn">保存</button>
                </div>
            `;
        },

        _injectModalCSS() {
            const styleId = 'mp-config-modal-style';
            if (document.getElementById(styleId)) return;
            const css = `
                #mpConfigModalBackdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 2147483646; display: flex; align-items: center; justify-content: center; }
                #mpConfigModal { background-color: #f9f9f9; padding: 25px; border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.25); z-index: 2147483647; width: 420px; font-family: "Segoe UI", sans-serif; color: #333; }
                #mpConfigModal h2 { margin-top: 0; margin-bottom: 20px; font-size: 20px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                #mpConfigModal label { display: block; margin-bottom: 6px; font-weight: 600; color: #555; font-size: 14px; }
                #mpConfigModal input[type="text"], #mpConfigModal input[type="password"] { width: calc(100% - 24px); padding: 10px; margin-bottom: 18px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
                #mpConfigModal input[type="text"]:focus, #mpConfigModal input[type="password"]:focus { border-color: #3498db; outline: none; }
                #mpConfigModal .mp-modal-buttons { text-align: right; margin-top: 25px; }
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

        _request(options) {
            return new Promise((resolve, reject) => {
                const { method, url, data, headers, responseType, token, isLogin = false } = options;
                const fullUrl = (isLogin ? '' : CONFIG.get('url')) + url;

                const finalHeaders = {
                    "accept": "application/json",
                    "user-agent": navigator.userAgent,
                    ...headers
                };

                if (token) {
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
                    url: CONFIG.get('url') + CONSTANTS.API_ENDPOINTS.LOGIN,
                    data: `username=${CONFIG.get('user')}&password=${CONFIG.get('pass')}`,
                    headers: { "content-type": "application/x-www-form-urlencoded" },
                    responseType: 'json',
                    isLogin: true
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
                    showToast(`[${SCRIPT_NAME}] 登录 Moviepilot 失败！\n\n已尝试 ${MAX_RETRIES} 次。\n请检查您的配置是否正确。\n服务器返回状态: ${status}`);
                    throw new Error(`登录失败，已达最大重试次数`);
                }
            }
        },

        async getAuthenticatedToken() {
            if (this._sessionToken) {
                return this._sessionToken;
            }
            return await this.login();
        },

        async recognize(title, subtitle) {
            const token = await this.getAuthenticatedToken();
            const url = `${CONSTANTS.API_ENDPOINTS.RECOGNIZE}?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle)}`;
            return this._request({ method: 'GET', url, token, responseType: 'json' });
        },

        async getSite() {
            const token = await this.getAuthenticatedToken();
            const url = `${CONSTANTS.API_ENDPOINTS.GET_SITE}${window.location.hostname}`;
            return this._request({ method: 'GET', url, token, responseType: 'json' });
        },

        async download(media_info, torrent_info) {
            const token = await this.getAuthenticatedToken();
            const download_info = { media_in: media_info, torrent_in: torrent_info };
            return this._request({
                method: 'POST',
                url: CONSTANTS.API_ENDPOINTS.DOWNLOAD,
                data: JSON.stringify(download_info),
                headers: { "content-type": "application/json" },
                token,
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
    // [4] 站点适配器 (SITE ADAPTERS)
    // ——————————————————————————————————————

    //Todo: haidan待定
    const SITE_ADAPTERS = [
        {
            id: 'totheglory',
            matches: () => window.location.href.includes('totheglory.im/t/'),
            getInfo: () => {
                // rowhead + heading
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
                // 检查新版UI,域名是否为kp.m-team.cc
                const isNewUI = window.location.hostname.includes('kp.m-team.cc');
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
            return this.adapter ? await this.adapter.getInfo() : null;
        }
    };


    // ——————————————————————————————————————
    // [5] 核心逻辑 (CORE LOGIC)
    // ——————————————————————————————————————

    const Core = {
        async handlePage() {
            const torrentInfo = await Site.getTorrentInfo();
            // 日志
            GM_log(`MP 消息: 正在处理页面，匹配到的种子信息:`, torrentInfo && (({ insertPoint, insertAction, ...rest }) => rest)(torrentInfo));

            if (!torrentInfo || !torrentInfo.name) {
                GM_log(`[${SCRIPT_NAME}] Could not extract torrent info.`);
                return;
            }

            const { name, description, downloadLink, size, insertPoint, insertIndex, insertAction, rowType } = torrentInfo;
            
            const row = document.createElement(rowType === 'common' ? 'tr' : 'div');
            if (rowType === 'common' && window.location.href.includes("m-team")) {
                row.className = "ant-descriptions-row";
            }
            row.innerHTML = UI.renderRecognizeRow(rowType, "识别中...");

            if (insertAction) {
                insertAction(insertPoint, row);
            } else if (insertPoint && typeof insertIndex !== 'undefined') {
                insertPoint.insertBefore(row, insertPoint.children[insertIndex]);
            } else {
                GM_log(`[${SCRIPT_NAME}] No valid insert point for UI.`);
                return;
            }

            try {
                const data = await API.recognize(name, description);
                if (data && data.media_info) {
                    this.renderSuccess(row, rowType, data, { name, description, downloadLink, size });
                } else {
                    row.innerHTML = UI.renderRecognizeRow(rowType, '识别失败');
                }
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Recognition failed:`, error);
                const errorMessage = (error.message || '').includes('配置不完整') ? '登录失败，请检查配置' : '识别失败';
                row.innerHTML = UI.renderRecognizeRow(rowType, errorMessage);
            }
        },

        renderSuccess(row, rowType, data, torrentInfo) {
            const { media_info, meta_info } = data;
            const containerStyle = `display: flex; align-items: center; gap: 5px; flex-wrap: wrap;`;
            let finalHtml = `<div style="${containerStyle}">`;

            // Download Button
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
                downloadButton.addEventListener("click", () => this.handleDownload(downloadButton, data.media_info, torrentInfo));
            }
        },

        async handleDownload(button, media_info, torrentInfo) {
            button.disabled = true;
            button.textContent = "正在推送...";
        
            const originalText = "下载种子";
        
            try {
                // 如果是 M-Team, 在此时获取下载链接
                if (Site.adapter.id === 'm-team') {
                    button.textContent = "获取链接...";
                    try {
                        torrentInfo.downloadLink = await API.getMteamDownloadLink();
                        button.textContent = "正在推送..."; // 获取成功后更新文本
                    } catch (linkError) {
                        GM_log(`[${SCRIPT_NAME}] M-Team link acquisition failed:`, linkError);
                        button.textContent = "链接获取失败";
                        setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
                        return; // 获取失败，终止操作
                    }
                }
        
                const siteData = await API.getSite();
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
        
                await API.download(media_info, torrentPayload);
                button.textContent = "推送成功";
                // 成功后不再禁用按钮，并保持“推送成功”状态
                button.disabled = false; 
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Download failed:`, error);
                // 主 catch 块现在也可以捕获站点或下载错误
                if (button.textContent !== "链接获取失败") {
                    button.textContent = error.message.includes('站点') ? '站点未适配' : '推送失败';
                }
                setTimeout(() => { 
                    button.textContent = originalText; 
                    button.disabled = false; 
                }, 2000);
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
    };

    function main() {
        // 1. 加载配置
        CONFIG.load();
    
        // 2. 注册菜单命令
        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand("配置Moviepilot参数", () => UI.showConfigModal(false), "c");
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
    
        // 5. 执行页面核心逻辑
        // 特殊处理 M-Team 的动态加载, 拦截API请求来触发
        if (Site.adapter.id === 'm-team') {
            const originOpen = XMLHttpRequest.prototype.open;
            let executed = false;
            XMLHttpRequest.prototype.open = function(...args) {
                const url = args[1];
                if (typeof url === 'string' && url.includes("/api/torrent/detail")) {
                    this.addEventListener("readystatechange", function() {
                        if (this.readyState === 4 && this.status === 200) {
                            if (executed) return; // 防止重复执行
                            try {
                                const res = JSON.parse(this.responseText);
                                if (res && res.message === 'SUCCESS') {
                                    executed = true;
                                    GM_log(`[${SCRIPT_NAME}] M-Team torrent detail API intercepted. Running Core.handlePage()`);
                                    // 延迟一小段时间，确保页面可能依赖的其他脚本已执行完毕
                                    setTimeout(() => Core.handlePage(), 200);
                                }
                            } catch (e) {
                                GM_log(`[${SCRIPT_NAME}] Error parsing M-Team API response.`, e);
                            }
                        }
                    });
                }
                originOpen.apply(this, args);
            };
        } else {
            Core.handlePage();
        }
    }

    // 启动！
    main();

})();
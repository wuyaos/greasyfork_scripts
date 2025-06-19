// ==UserScript==
// @name         moviepilotNameTest(自用)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  moviepilots名称测试 - 重构优化版
// @author       yubanmeiqin9048, benz1 (Refactored by ffwu & AI)
// @match        https://*/details.php?id=*
// @match        https://*/details_movie.php?id=*
// @match        https://*/details_tv.php?id=*
// @match        https://*/details_animate.php?id=*
// @match        https://totheglory.im/t/*
// @match        https://bangumi.moe/*
// @match        https://*.acgnx.se/*
// @match        https://*.dmhy.org/*
// @match        https://nyaa.si/*
// @match        https://mikanani.me/*
// @match        https://*.skyey2.com/*
// @match        https://*.m-team.cc/detail/*
// @grant        GM_log
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_setClipboard
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
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
            moviepilotPassword: '',
            isTip: false
        }
    };

    const CONFIG = {
        _values: {},

        load() {
            this._values.url = GM_getValue('moviepilotUrl', CONSTANTS.DEFAULT_CONFIG.moviepilotUrl);
            this._values.user = GM_getValue('moviepilotUser', CONSTANTS.DEFAULT_CONFIG.moviepilotUser);
            this._values.pass = GM_getValue('moviepilotPassword', CONSTANTS.DEFAULT_CONFIG.moviepilotPassword);
            this._values.isTip = GM_getValue('isTip', CONSTANTS.DEFAULT_CONFIG.isTip);
            GM_log(`[${SCRIPT_NAME}] 配置已加载。`);
        },

        save({ url, user, pass, isTip }) {
            GM_setValue('moviepilotUrl', url);
            GM_setValue('moviepilotUser', user);
            GM_setValue('moviepilotPassword', pass);
            GM_setValue('isTip', isTip);
            this.load(); // Reload config after saving
            GM_log(`[${SCRIPT_NAME}] 配置已保存。`);
            alert(`[${SCRIPT_NAME}] 配置已保存。部分更改可能需要刷新页面生效。`);
        },

        reset() {
            if (confirm(`[${SCRIPT_NAME}]\n\n确定要重置所有配置吗？\n\n这将清除所有存储的 Moviepilot 设置并刷新页面。`)) {
                GM_deleteValue('moviepilotUrl');
                GM_deleteValue('moviepilotUser');
                GM_deleteValue('moviepilotPassword');
                GM_deleteValue('isTip');
                GM_log(`[${SCRIPT_NAME}] 所有配置已重置。正在刷新页面...`);
                alert(`[${SCRIPT_NAME}] 所有配置已重置。页面将刷新。`);
                location.reload();
            }
        },

        get(key) {
            return this._values[key];
        },

        set(key, value) {
            this._values[key] = value;
            GM_setValue(key, value);
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
                    pass: document.getElementById('mpPass').value,
                    isTip: document.getElementById('mpIsTip').checked
                };
                CONFIG.save(newConfig);
                this.closeConfigModal();
            });

            const cancelAction = () => {
                if (isInitialSetup) {
                    alert(`[${SCRIPT_NAME}] 首次配置是必需的。请填写并保存配置。`);
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
                <div class="mp-checkbox-container">
                    <input type="checkbox" id="mpIsTip" ${CONFIG.get('isTip') ? 'checked' : ''}>
                    <label for="mpIsTip" class="mp-checkbox-label">启用划词识别</label>
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
                #mpConfigModal .mp-checkbox-container { display: flex; align-items: center; margin-bottom: 20px; }
                #mpConfigModal input[type="checkbox"] { margin-right: 8px; transform: scale(1.1); }
                #mpConfigModal .mp-checkbox-label { font-weight: normal; margin-bottom:0; font-size: 14px; }
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

        showToast(message) {
            const toastId = 'mp-toast-notification';
            if (document.getElementById(toastId)) return;

            const toast = document.createElement('div');
            toast.id = toastId;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                background-color: rgba(40, 40, 40, 0.85); color: white; padding: 12px 24px;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 2147483647;
                font-size: 16px; font-weight: 600; font-family: "Segoe UI", sans-serif;
                transition: opacity 0.3s ease-in-out; opacity: 0;
            `;

            document.body.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '1'; }, 10);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        },

        renderTag(text, color) {
            return `<span style="background-color:${color};color:#ffffff;display:inline-flex;align-items:center;justify-content:center;border-radius:0.375rem;font-size:12px;padding:0.25rem 0.75rem;font-weight:bold;">${text}</span>`;
        },

        renderRecognizeRow(type, html) {
            if (type === "common" && window.location.href.includes("m-team")) {
                return `<th class="ant-descriptions-item-label" colspan="1" style="width: 135px; text-align: right;"><span>MoviePilot</span></th><td class="ant-descriptions-item-content" colspan="1">${html}</td>`;
            }
            if (type === "common") {
                return `<td class="rowhead nowrap" valign="top" align="right">MoviePilot</td><td class="rowfollow" valign="top" align="left">${html}</td>`;
            }
            return html;
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
                alert(`[${SCRIPT_NAME}] Moviepilot 配置不完整！请填写URL、用户名和密码。`);
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
                    alert(`[${SCRIPT_NAME}] 登录 Moviepilot 失败！\n\n已尝试 ${MAX_RETRIES} 次。\n请检查您的配置是否正确。\n服务器返回状态: ${status}`);
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
        }
    };


    // ——————————————————————————————————————
    // [4] 站点适配器 (SITE ADAPTERS)
    // ——————————————————————————————————————

    const SITE_ADAPTERS = [
        {
            id: 'm-team',
            matches: () => window.location.href.includes('m-team.cc/detail/'),
            getInfo: () => {
                const rows = document.querySelectorAll('.ant-descriptions-item-label');
                if (rows.length < 3) return null;
                const nameRow = rows[0], dlRow = rows[1], sizeRow = rows[2];
                if (!nameRow.nextElementSibling || !dlRow.nextElementSibling || !sizeRow.nextElementSibling) return null;
                const nameLink = nameRow.nextElementSibling.querySelector('a');
                return {
                    name: nameLink?.textContent.replace(/\.torrent$/, '') || '',
                    downloadLink: dlRow.nextElementSibling.querySelector('a')?.href || '',
                    description: dlRow.nextElementSibling.innerText || '',
                    size: UTILS.parseSize(sizeRow.nextElementSibling.innerText),
                    insertPoint: nameRow.parentElement.parentElement,
                    insertIndex: 2,
                    rowType: 'common'
                };
            }
        },
        {
            id: 'hdsky',
            matches: () => window.location.href.includes('hdsky'),
            getInfo: () => {
                const rows = document.querySelectorAll('#details > table tr');
                if (rows.length < 4) return null;
                return {
                    name: rows[0].querySelector('input[type=text]')?.value || '',
                    downloadLink: rows[1].querySelector('a')?.href || '',
                    description: rows[2].querySelectorAll('td')[1]?.innerText || '',
                    size: UTILS.parseSize(rows[3].querySelectorAll('td')[1]?.innerText || ''),
                    insertPoint: rows[0].parentElement,
                    insertIndex: 2,
                    rowType: 'common'
                };
            }
        },
        {
            id: 'totheglory',
            matches: () => window.location.href.includes('totheglory.im/t/'),
            getInfo: () => {
                const nameEl = document.querySelector('a[href*="download.php"]');
                const sizeEl = Array.from(document.querySelectorAll('.main .heading')).find(el => el.textContent.includes('大小'));
                if (!nameEl || !sizeEl) return null;
                return {
                    name: nameEl.textContent,
                    downloadLink: nameEl.href,
                    description: '', // TTG doesn't have a clear description field here
                    size: UTILS.parseSize(sizeEl.nextElementSibling.innerText),
                    insertPoint: document.querySelector('.main > table > tbody'),
                    insertIndex: 2,
                    rowType: 'common'
                };
            }
        },
        {
            id: 'generic-nexusphp',
            matches: () => document.querySelector('.rowhead'),
            getInfo: () => {
                const rows = document.querySelectorAll('.rowhead');
                if (rows.length < 3) return null;
                const nameRow = rows[0], descRow = rows[1], sizeRow = rows[2];
                if (!nameRow.nextElementSibling || !descRow.nextElementSibling || !sizeRow.nextElementSibling) return null;
                const nameLink = nameRow.nextElementSibling.querySelector('a');
                return {
                    name: nameLink?.textContent || '',
                    downloadLink: nameLink?.href || '',
                    description: descRow.nextElementSibling.innerText,
                    size: UTILS.parseSize(sizeRow.nextElementSibling.innerText),
                    insertPoint: nameRow.parentElement.parentElement,
                    insertIndex: 2,
                    rowType: 'common'
                };
            }
        },
        {
            id: 'bangumi.moe',
            matches: () => window.location.href.includes('bangumi.moe'),
            getInfo: () => {
                const torrent_index_div = document.querySelector('a.index');
                const divs = document.getElementsByClassName('font-bold leading-6');
                if (!torrent_index_div || divs.length < 6) return null;
                return {
                    name: torrent_index_div.textContent,
                    downloadLink: torrent_index_div.href,
                    description: divs[3].innerText,
                    size: UTILS.parseSize(divs[5].nextElementSibling.innerText),
                    insertPoint: divs[3],
                    insertAction: (point, element) => {
                        point.insertAdjacentHTML('afterend', '<div class="font-bold leading-6">moviepilot</div><div class="font-light leading-6 flex flex-wrap" id="moviepilot-container"></div>');
                        document.getElementById('moviepilot-container').appendChild(element);
                    },
                    rowType: 'div'
                };
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
        getTorrentInfo() {
            return this.adapter ? this.adapter.getInfo() : null;
        }
    };


    // ——————————————————————————————————————
    // [5] 核心逻辑 (CORE LOGIC)
    // ——————————————————————————————————————

    const Core = {
        async handlePage() {
            const torrentInfo = Site.getTorrentInfo();
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
                const errorMessage = error.message.includes('登录') ? `登录失败: ${error.message}` : '识别失败';
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

            try {
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
                UI.showToast("推送种子成功！");
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Download failed:`, error);
                button.textContent = error.message.includes('站点') ? '站点不存在' : '推送失败';
            } finally {
                button.disabled = false;
            }
        },
        
        initSelectionRecognition() {
            if (!CONFIG.get('isTip')) return;
            SelectionRecognizer.init();
        }
    };


    // ——————————————————————————————————————
    // [6] 划词识别 (SELECTION RECOGNIZER)
    // ——————————————————————————————————————

    const SelectionRecognizer = {
        tip: null,
        icon: null,

        init() {
            this.tip = this._createTip();
            this.icon = this._createIcon();
            document.addEventListener('mouseup', (e) => {
                const text = window.getSelection().toString().trim();
                if (!text) {
                    this.icon.hide();
                    this.tip.hide();
                } else {
                    this.icon.pop(e);
                }
            });
        },

        async _queryText(text, ev) {
            if (!text) return;
            this.icon.hide();
            this.tip.pop(ev);
            this.tip.showText('识别中...');

            try {
                const data = await API.recognize(text, '');
                if (data && data.media_info) {
                    let html = '';
                    html += data.media_info.type ? `类型：${data.media_info.type}<br>` : '';
                    html += data.media_info.category ? `分类：${data.media_info.category}<br>` : '';
                    html += data.media_info.title ? `标题：${data.media_info.title}<br>` : '';
                    html += data.meta_info.season_episode ? `季集：${data.meta_info.season_episode}<br>` : '';
                    html += data.meta_info.year ? `年份：${data.media_info.year}<br>` : '';
                    html += data.meta_info.resource_team ? `制作：${data.meta_info.resource_team}<br>` : '';
                    html += data.media_info.tmdb_id ? `tmdb：<a href="${data.media_info.detail_link}" target="_blank">${data.media_info.tmdb_id}</a>` : 'tmdb：未识别';
                    this.tip.showText(html);
                } else {
                    this.tip.showText('识别失败');
                }
            } catch (error) {
                this.tip.showText(`识别失败: ${error.message}`);
            }
        },

        _createTip() {
            const div = document.createElement('div');
            div.hidden = true;
            div.style.cssText = `position:absolute!important; font-size:13px!important; overflow:auto!important; background:#fff!important; font-family:sans-serif,Arial!important; text-align:left!important; color:#000!important; padding:0.5em 1em!important; line-height:1.5em!important; border-radius:5px!important; border:1px solid #ccc!important; box-shadow:4px 4px 8px #888!important; max-width:350px!important; max-height:216px!important; z-index:2147483647!important;`;
            document.documentElement.appendChild(div);
            div.addEventListener('mouseup', e => e.stopPropagation());
            return {
                _element: div,
                showText(text) { this._element.innerHTML = text; this._element.hidden = false; },
                hide() { this._element.innerHTML = ''; this._element.hidden = true; },
                pop(ev) {
                    this._element.style.top = ev.pageY + 'px';
                    this._element.style.left = (ev.pageX + 350 <= document.body.clientWidth ? ev.pageX : document.body.clientWidth - 350) + 'px';
                }
            };
        },

        _createIcon() {
            const icon = document.createElement('span');
            icon.hidden = true;
            icon.innerHTML = `<svg style="margin:4px !important;" width="16" height="16" viewBox="0 0 24 24"><path d="M12 2L22 12L12 22L2 12Z" style="fill:none;stroke:#3e84f4;stroke-width:2;"></path></svg>`;
            icon.style.cssText = `width:24px!important; height:24px!important; background:#fff!important; border-radius:50%!important; box-shadow:4px 4px 8px #888!important; position:absolute!important; z-index:2147483647!important; cursor:pointer;`;
            document.documentElement.appendChild(icon);
            icon.addEventListener('mousedown', e => e.preventDefault(), true);
            icon.addEventListener('mouseup', e => e.preventDefault(), true);
            icon.addEventListener('click', ev => {
                const text = window.getSelection().toString().trim().replace(/\s{2,}/g, ' ');
                this._queryText(text, ev);
            });
            return {
                _element: icon,
                pop(ev) {
                    this._element.style.top = ev.pageY + 9 + 'px';
                    this._element.style.left = ev.pageX + -18 + 'px';
                    this._element.hidden = false;
                    setTimeout(() => this.hide(), 2000);
                },
                hide() { this._element.hidden = true; }
            };
        }
    };


    // ——————————————————————————————————————
    // [7] 辅助函数 & 初始化 (UTILS & INITIALIZATION)
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
        mutationObserver(target, className, callback) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === 1 && node.classList.contains(className)) {
                                callback();
                                observer.disconnect();
                                return;
                            }
                        }
                    }
                }
            });
            observer.observe(target, { childList: true, subtree: true });
        }
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
        
        // 5. 初始化划词识别功能
        Core.initSelectionRecognition();

        // 6. 执行页面核心逻辑
        // 特殊处理 M-Team 的动态加载
        if (Site.adapter.id === 'm-team') {
            UTILS.mutationObserver(document.body, 'ant-descriptions-row', () => Core.handlePage());
        } else {
            Core.handlePage();
        }
    }

    // 启动！
    main();

})();
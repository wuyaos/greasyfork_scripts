import { CONSTANTS, SCRIPT_NAME } from './config.js';

import { CONFIG } from './settings.js';

import { UTILS } from './media-formatting.js';



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
                    autoQuery: document.getElementById('mpAutoQuery').checked,
                    gazelleFlEnabled: document.getElementById('mpGazelleFlEnabled').checked
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
                        <label class="mp-check-line"><input type="checkbox" id="mpGazelleFlEnabled" ${CONFIG.get('gazelleFlEnabled') ? 'checked' : ''}> <span><b>允许使用 FL（消耗令牌）</b><small>Gazelle 站点（如 GPW）部分种子只有 FL 下载链接，使用会消耗下载令牌；关闭时这类种子将跳过并提示。DL 链接和 Haidan 不受影响。</small></span></label>
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
                .mp-picker { width: 100%; margin-top: 8px; padding: 8px; border: 1px solid #dfe4ea; border-radius: 6px; background: #fff; box-sizing: border-box; overflow-x: auto; color: #333; }
                .mp-picker-title { font-weight: 700; margin-bottom: 6px; color: #1f2933; }
                .mp-picker-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .mp-picker-table th, .mp-picker-table td { border: 1px solid #dfe4ea; padding: 5px 6px; text-align: left; vertical-align: top; }
                .mp-picker-table th { background: #f6f7f9; font-weight: 700; white-space: nowrap; }
                .mp-picker-table button { background: ${CONSTANTS.COLORS.SECONDARY}; color: #fff; border: 0; border-radius: 4px; padding: 4px 8px; cursor: pointer; white-space: nowrap; }
                .mp-picker-table button:hover { filter: brightness(.96); }
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



export { UI };

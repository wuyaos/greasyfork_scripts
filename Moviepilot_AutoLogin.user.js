// ==UserScript==
// @name         MoviePilot自动登录(自用)
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  MoviePilot自动填充账号密码。
// @author       ffwu
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/moviepilot.png
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/Moviepilot_AutoLogin.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/Moviepilot_AutoLogin.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- 常量定义 ---
    const CONFIG_KEY = 'moviepilot_configs';
    const POLLING_INTERVAL = 500; // 登录表单轮询间隔 (ms)
    const TIMEOUT = 10000; // 轮询超时时间 (ms)

    const POPUP_STYLE = `
        #mp-config-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0,0,0,0.5); z-index: 9998;
        }
        #mp-config-popup {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: #f9f9f9; padding: 20px; border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 9999;
            width: 400px; font-family: sans-serif;
        }
        #mp-config-popup h2 { margin-top: 0; color: #333; }
        #mp-config-popup .form-group { margin-bottom: 15px; }
        #mp-config-popup label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        #mp-config-popup input, #mp-config-popup select {
            width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; color: #333;
        }
        #mp-config-popup .button-group { display: flex; justify-content: space-between; margin-top: 20px; }
        #mp-config-popup button {
            padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;
        }
        #btn_save { background-color: #28a745; color: white; }
        #btn_delete { background-color: #dc3545; color: white; }
        #btn_reset { background-color: #ffc107; color: black; }
        #btn_close_popup {
            position: absolute; top: 10px; right: 15px; font-size: 24px;
            font-weight: bold; cursor: pointer; border: none; background: none;
        }
    `;

    const POPUP_HTML = `
        <button id="btn_close_popup">&times;</button>
        <h2>MoviePilot 登录配置</h2>
        <div class="form-group">
            <label for="config_select">选择配置</label>
            <select id="config_select">
                <option value="new">-- 新建配置 --</option>
            </select>
        </div>
        <div class="form-group">
            <label for="config_name">配置名称 (自动生成)</label>
            <input type="text" id="config_name" readonly placeholder="由下方URL自动生成">
        </div>
        <div class="form-group">
            <label for="config_url">MoviePilot URL</label>
            <input type="text" id="config_url" placeholder="例如：http://192.168.1.10:3000">
        </div>
        <div class="form-group">
            <label for="config_username">账号</label>
            <input type="text" id="config_username">
        </div>
        <div class="form-group">
            <label for="config_password">密码</label>
            <input type="password" id="config_password">
        </div>
        <div class="button-group">
            <button id="btn_reset">重置</button>
            <button id="btn_delete">删除</button>
            <button id="btn_save">保存</button>
        </div>
    `;


    // --- 核心逻辑 ---

    /**
     * 初始化脚本，轮询等待登录表单出现
     */
    function initialize() {
        let intervalId = null;

        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            console.log('Moviepilot AutoLogin: 等待登录表单超时。');
        }, TIMEOUT);

        intervalId = setInterval(() => {
            const usernameInput = document.querySelector('input[name="username"]');
            const passwordInput = document.querySelector('input[name="current-password"]');

            if (usernameInput && passwordInput) {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                handleLoginForm(usernameInput, passwordInput);
            }
        }, POLLING_INTERVAL);
    }

    /**
     * 处理登录表单，根据配置进行登录或弹出配置窗口
     * @param {HTMLInputElement} usernameInput - 用户名输入框
     * @param {HTMLInputElement} passwordInput - 密码输入框
     */
    function handleLoginForm(usernameInput, passwordInput) {
        const configs = getConfigs();
        const currentOrigin = window.location.origin;
        const matchingConfig = configs.find(c => c.url === currentOrigin);

        if (matchingConfig && matchingConfig.username && matchingConfig.password) {
            autofillAndLogin(matchingConfig, usernameInput, passwordInput);
        } else {
            showConfigPopup(currentOrigin);
        }
    }

    /**
     * 自动填充并点击登录，同时监视登录错误
     * @param {object} config - 当前站点的配置
     * @param {HTMLInputElement} usernameInput - 用户名输入框
     * @param {HTMLInputElement} passwordInput - 密码输入框
     */
    function autofillAndLogin(config, usernameInput, passwordInput) {
        const loginButton = document.querySelector('button[type="submit"]');

        if (loginButton) {
            setInputValue(usernameInput, config.username);
            setInputValue(passwordInput, config.password);
            loginButton.click();
        }

        // 监视登录失败提示
        const observer = new MutationObserver((mutations, obs) => {
            const errorElement = document.querySelector('.bg-red-500');
            if (errorElement) {
                alert('账号或密码错误，请通过油猴菜单检查您的配置。');
                obs.disconnect(); // 发现错误后停止监视
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 以编程方式设置输入框的值，以确保触发相关事件
     * @param {HTMLInputElement} element - 目标输入框元素
     * @param {string} value - 要设置的值
     */
    function setInputValue(element, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }


    // --- 配置管理 ---

    /**
     * 从GM存储中获取所有配置
     * @returns {Array} - 配置数组
     */
    function getConfigs() {
        return JSON.parse(GM_getValue(CONFIG_KEY, '[]'));
    }

    /**
     * 将配置保存到GM存储
     * @param {Array} configs - 要保存的配置数组
     */
    function saveConfigs(configs) {
        GM_setValue(CONFIG_KEY, JSON.stringify(configs));
    }


    // --- UI (配置弹窗) ---

    /**
     * 显示配置弹窗
     * @param {string} [defaultUrl=window.location.origin] - 默认填充的URL
     */
    function showConfigPopup(defaultUrl) {
        // 如果是从菜单调用，defaultUrl可能不是字符串，进行修正
        if (typeof defaultUrl !== 'string') {
            defaultUrl = window.location.origin;
        }

        // 防止重复创建弹窗
        if (document.getElementById('mp-config-popup')) {
            return;
        }

        // 添加样式和HTML
        GM_addStyle(POPUP_STYLE);
        const overlay = document.createElement('div');
        overlay.id = 'mp-config-overlay';
        const popup = document.createElement('div');
        popup.id = 'mp-config-popup';
        popup.innerHTML = POPUP_HTML;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        // 绑定弹窗内的逻辑
        bindPopupLogic(defaultUrl);
    }

    /**
     * 为配置弹窗绑定事件和逻辑
     * @param {string} defaultUrl - 默认填充的URL
     */
    function bindPopupLogic(defaultUrl) {
        const elements = {
            select: document.getElementById('config_select'),
            nameInput: document.getElementById('config_name'),
            urlInput: document.getElementById('config_url'),
            usernameInput: document.getElementById('config_username'),
            passwordInput: document.getElementById('config_password'),
            saveButton: document.getElementById('btn_save'),
            deleteButton: document.getElementById('btn_delete'),
            resetButton: document.getElementById('btn_reset'),
            closeButton: document.getElementById('btn_close_popup'),
            overlay: document.getElementById('mp-config-overlay'),
            popup: document.getElementById('mp-config-popup')
        };

        const closePopup = () => {
            document.body.removeChild(elements.overlay);
            document.body.removeChild(elements.popup);
        };

        const loadConfigsIntoSelect = () => {
            const configs = getConfigs();
            elements.select.innerHTML = '<option value="new">-- 新建配置 --</option>'; // 重置下拉列表
            configs.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.name;
                elements.select.appendChild(option);
            });
            displayConfigDetails('new'); // 初始显示空表单
        };

        const displayConfigDetails = (configId) => {
            if (configId === 'new') {
                elements.nameInput.value = '';
                elements.urlInput.value = '';
                elements.usernameInput.value = '';
                elements.passwordInput.value = '';
                elements.deleteButton.disabled = true;
            } else {
                const config = getConfigs().find(c => c.id === configId);
                if (config) {
                    elements.nameInput.value = config.name;
                    elements.urlInput.value = config.url;
                    elements.usernameInput.value = config.username;
                    elements.passwordInput.value = config.password;
                }
                elements.deleteButton.disabled = false;
            }
        };

        const updateConfigNameFromUrl = () => {
            try {
                const url = new URL(elements.urlInput.value);
                const port = url.port ? `:${url.port}` : '';
                elements.nameInput.value = `MoviePilot(${url.hostname}${port})`;
            } catch (e) {
                elements.nameInput.value = ''; // URL无效时清空名称
            }
        };

        const saveConfiguration = () => {
            const name = elements.nameInput.value.trim();
            const url = elements.urlInput.value.trim();
            if (!name || !url) {
                alert('配置名称和URL不能为空！');
                return;
            }

            let configs = getConfigs();
            const selectedId = elements.select.value;
            let savedConfig;

            if (selectedId === 'new') { // 新建
                const newConfig = {
                    id: Date.now().toString(),
                    name,
                    url,
                    username: elements.usernameInput.value,
                    password: elements.passwordInput.value
                };
                configs.push(newConfig);
                savedConfig = newConfig;
            } else { // 编辑
                const configIndex = configs.findIndex(c => c.id === selectedId);
                if (configIndex > -1) {
                    configs[configIndex] = { ...configs[configIndex], name, url, username: elements.usernameInput.value, password: elements.passwordInput.value };
                    savedConfig = configs[configIndex];
                }
            }
            saveConfigs(configs);
            alert('保存成功！');

            // 如果保存的配置是当前页面，则尝试自动登录
            if (savedConfig && savedConfig.url === window.location.origin) {
                const usernameEl = document.querySelector('input[name="username"]');
                const passwordEl = document.querySelector('input[name="current-password"]');
                if (usernameEl && passwordEl) {
                    autofillAndLogin(savedConfig, usernameEl, passwordEl);
                }
            }
            closePopup();
        };

        const deleteConfiguration = () => {
            const selectedId = elements.select.value;
            if (selectedId === 'new') return;

            const selectedOption = elements.select.options[elements.select.selectedIndex];
            if (confirm(`确定要删除配置 "${selectedOption.text}" 吗？`)) {
                let configs = getConfigs();
                configs = configs.filter(c => c.id !== selectedId);
                saveConfigs(configs);
                alert('删除成功！');
                loadConfigsIntoSelect(); // 刷新列表
            }
        };

        // --- 绑定事件监听 ---
        elements.select.addEventListener('change', () => displayConfigDetails(elements.select.value));
        elements.urlInput.addEventListener('input', updateConfigNameFromUrl);
        elements.saveButton.addEventListener('click', saveConfiguration);
        elements.deleteButton.addEventListener('click', deleteConfiguration);
        elements.resetButton.addEventListener('click', () => displayConfigDetails(elements.select.value));
        elements.closeButton.addEventListener('click', closePopup);
        elements.overlay.addEventListener('click', closePopup);

        // --- 初始化 ---
        loadConfigsIntoSelect();
        elements.urlInput.value = defaultUrl;
        updateConfigNameFromUrl();
    }


    // --- 油猴菜单命令 ---
    GM_registerMenuCommand("⚙️ 配置 MoviePilot 登录", showConfigPopup);

    // --- 脚本入口 ---
    initialize();

})();
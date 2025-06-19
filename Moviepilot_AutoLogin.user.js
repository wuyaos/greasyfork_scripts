// ==UserScript==
// @name         MoviePilot自动登录(自用)
// @namespace    http://tampermonkey.net/
// @version      1.3.0
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
    /*
    * 更新记录
    * v1.3.0（2025-06-19）
    * 新增配置窗口，支持多个MoviePilot站点的账号密码配置
    * v1.2.2（2025-06-11）
    * 修改了登录逻辑
    * v1.2（2025-04-01）
    * 修复2.3.1以后的版本无法登录的问题
    * 修复了MoviePilot的账号密码错误无法自动登录的问题（账号密码错误重新弹出配置窗口）
    * 优化登录逻辑
    * 无需修改@match配置等代码配置自动判断当前网站是否是MoviePilot，对小白更友好（新增）
    *
    * v1.1（2025-01-05）
    * 新增配置窗口，无需更改文件可直接更改MoviePilot账号密码url信息，第一次使用会弹窗
    * 修复会登录其他程序的问题
    *
    */
    const CONFIG_KEY = 'moviepilot_configs';

    // --- Main Logic ---
    function initialize() {
        const POLLING_INTERVAL = 500; // ms
        const TIMEOUT = 10000; // 10 seconds

        let intervalId = null;

        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            console.log('Moviepilot AutoLogin: Timed out waiting for login form.');
        }, TIMEOUT);

        intervalId = setInterval(() => {
            const usernameInput = document.querySelector('input[name="username"]');
            const passwordInput = document.querySelector('input[name="current-password"]');

            if (usernameInput && passwordInput) {
                // Found the elements, stop polling and proceed.
                clearInterval(intervalId);
                clearTimeout(timeoutId);

                // 2. Find a matching configuration for the current site
                const configs = getConfigs();
                const currentOrigin = window.location.origin;
                const matchingConfig = configs.find(c => c.url === currentOrigin);

                // 3. Execute login or show configuration popup
                if (matchingConfig && matchingConfig.username && matchingConfig.password) {
                    startMonitoring(matchingConfig, usernameInput, passwordInput);
                } else {
                    // If no configuration matches, pop up the settings window immediately.
                    popUps(currentOrigin);
                }
            }
        }, POLLING_INTERVAL);
    }

    function setInputValue(element, value) {
        let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function startMonitoring(config, usernameInput, passwordInput) {
        const loginButton = document.querySelector('button[type="submit"]');

        if (loginButton) {
            setInputValue(usernameInput, config.username);
            setInputValue(passwordInput, config.password);
            loginButton.click();
        }

        const observer = new MutationObserver((mutations, obs) => {
            const errorElement = document.querySelector('.bg-red-500');
            if (errorElement) {
                alert('账号或密码错误，请通过油猴菜单检查您的配置。');
                obs.disconnect(); // Stop observing once the error is found
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // --- Configuration Management ---
    function getConfigs() {
        return JSON.parse(GM_getValue(CONFIG_KEY, '[]'));
    }

    function saveConfigs(configs) {
        GM_setValue(CONFIG_KEY, JSON.stringify(configs));
    }


    // --- UI (Popup Window) ---
    function popUps(defaultUrl) {
        // Handle calls from menu command where the first arg is not a string
        if (typeof defaultUrl !== 'string') {
            defaultUrl = window.location.origin;
        }

        // Prevent multiple popups
        if (document.getElementById('mp-config-popup')) {
            return;
        }

        // Add CSS for the popup
        GM_addStyle(`
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
        `);

        // Create HTML structure
        const overlay = document.createElement('div');
        overlay.id = 'mp-config-overlay';
        const popup = document.createElement('div');
        popup.id = 'mp-config-popup';

        popup.innerHTML = `
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

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        // --- Popup Logic ---
        const select = document.getElementById('config_select');
        const nameInput = document.getElementById('config_name');
        const urlInput = document.getElementById('config_url');
        const usernameInput = document.getElementById('config_username');
        const passwordInput = document.getElementById('config_password');

        const loadConfigsIntoSelect = () => {
            const configs = getConfigs();
            select.innerHTML = '<option value="new">-- 新建配置 --</option>'; // Reset
            configs.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.name;
                select.appendChild(option);
            });
            displayConfigDetails('new'); // Display empty form initially
        };

        const displayConfigDetails = (configId) => {
            if (configId === 'new') {
                nameInput.value = '';
                urlInput.value = '';
                usernameInput.value = '';
                passwordInput.value = '';
                document.getElementById('btn_delete').disabled = true;
            } else {
                const configs = getConfigs();
                const config = configs.find(c => c.id === configId);
                if (config) {
                    nameInput.value = config.name;
                    urlInput.value = config.url;
                    usernameInput.value = config.username;
                    passwordInput.value = config.password;
                }
                document.getElementById('btn_delete').disabled = false;
            }
        };

        const closePopup = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(popup);
        };

        // Event Listeners
        select.addEventListener('change', () => displayConfigDetails(select.value));

        const updateConfigName = () => {
            try {
                const url = new URL(urlInput.value);
                const port = url.port ? `:${url.port}` : '';
                nameInput.value = `MoviePilot(${url.hostname}${port})`;
            } catch (e) {
                nameInput.value = '';
            }
        };

        urlInput.addEventListener('input', updateConfigName);


        document.getElementById('btn_save').addEventListener('click', () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            if (!name || !url) {
                alert('配置名称和URL不能为空！');
                return;
            }

            let configs = getConfigs();
            const selectedId = select.value;
            let savedConfig;

            if (selectedId === 'new') { // Create new
                const newConfig = {
                    id: Date.now().toString(),
                    name: name,
                    url: url,
                    username: usernameInput.value,
                    password: passwordInput.value
                };
                configs.push(newConfig);
                savedConfig = newConfig;
            } else { // Edit existing
                const configIndex = configs.findIndex(c => c.id === selectedId);
                if (configIndex > -1) {
                    configs[configIndex] = { ...configs[configIndex], name, url, username: usernameInput.value, password: passwordInput.value };
                    savedConfig = configs[configIndex];
                }
            }
            saveConfigs(configs);
            alert('保存成功！');

            // If the saved config matches the current page, start monitoring. Otherwise, just close.
            if (savedConfig && savedConfig.url === window.location.origin) {
                const usernameEl = document.querySelector('input[name="username"]');
                const passwordEl = document.querySelector('input[name="current-password"]');
                if (usernameEl && passwordEl) {
                    startMonitoring(savedConfig, usernameEl, passwordEl);
                }
                closePopup();
            } else {
                closePopup(); // As per instructions, prefer closing over reloading.
            }
        });

        document.getElementById('btn_delete').addEventListener('click', () => {
            const selectedId = select.value;
            if (selectedId === 'new') return;

            if (confirm(`确定要删除配置 "${select.options[select.selectedIndex].text}" 吗？`)) {
                let configs = getConfigs();
                configs = configs.filter(c => c.id !== selectedId);
                saveConfigs(configs);
                alert('删除成功！');
                loadConfigsIntoSelect(); // Refresh the list
            }
        });

        document.getElementById('btn_reset').addEventListener('click', () => {
            displayConfigDetails(select.value); // Reset to last selected state
        });

        document.getElementById('btn_close_popup').addEventListener('click', closePopup);
        overlay.addEventListener('click', closePopup);

        // Initial load
        loadConfigsIntoSelect();
        urlInput.value = defaultUrl;
        updateConfigName(); // Initial name generation
    }


    // --- Greasemonkey Menu Command ---
    GM_registerMenuCommand("⚙️ 配置 MoviePilot 登录", popUps);

    // --- Script Entry Point ---
    initialize();

})();
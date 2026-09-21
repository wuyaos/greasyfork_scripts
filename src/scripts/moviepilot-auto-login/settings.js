import { POPUP_HTML, POPUP_STYLE } from './popup-template.js';

import { autofillAndLogin } from './login.js';

import { getConfigs, saveConfigs } from './storage.js';



function showConfigPopup(defaultUrl, isFirstTime = false) {
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

function bindPopupLogic(defaultUrl) {
        const elements = {
            select: document.getElementById('config_select'),
            nameInput: document.getElementById('config_name'),
            urlInput: document.getElementById('config_url'),
            usernameInput: document.getElementById('config_username'),
            passwordInput: document.getElementById('config_password'),
            saveButton: document.getElementById('btn_save'),
            deleteButton: document.getElementById('btn_delete'),
            closeButton: document.getElementById('btn_close_popup'),
            overlay: document.getElementById('mp-config-overlay'),
            popup: document.getElementById('mp-config-popup'),
            getCurrentUrlButton: document.getElementById('btn_get_current_url')
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
        elements.closeButton.addEventListener('click', closePopup);
        elements.overlay.addEventListener('click', closePopup);
        elements.getCurrentUrlButton.addEventListener('click', () => {
            elements.urlInput.value = window.location.origin;
            updateConfigNameFromUrl();
        });

        // --- 初始化 ---
        loadConfigsIntoSelect();
        elements.urlInput.value = defaultUrl;
        updateConfigNameFromUrl();
    }



export { showConfigPopup };

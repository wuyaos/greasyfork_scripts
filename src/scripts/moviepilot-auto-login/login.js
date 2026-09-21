import { POLLING_INTERVAL, TIMEOUT } from './config.js';

import { getConfigs } from './storage.js';

import { showConfigPopup } from './settings.js';



function initialize() {
        if (document.title !== 'MoviePilot') {
            return; // 如果页面标题不是 MoviePilot，则立即停止脚本，不执行任何后续操作。
        }

        let intervalId = null;

        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            console.log('Moviepilot AutoLogin: 等待登录表单超时。');
        }, TIMEOUT);

        intervalId = setInterval(() => {
            const usernameInput = document.querySelector('input[name="username"]');
            const passwordInput = document.querySelector('input[name="password"]');

            if (usernameInput && passwordInput) {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                handleLoginForm(usernameInput, passwordInput);
            }
        }, POLLING_INTERVAL);
    }

function handleLoginForm(usernameInput, passwordInput) {
        const configs = getConfigs();
        const currentOrigin = window.location.origin;
        const matchingConfig = configs.find(c => c.url === currentOrigin);

        if (matchingConfig && matchingConfig.username && matchingConfig.password) {
            autofillAndLogin(matchingConfig, usernameInput, passwordInput);
        } else {
            showConfigPopup(currentOrigin, true); // 传递 true 表示首次使用
        }
    }

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

function setInputValue(element, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }



export { autofillAndLogin, initialize };

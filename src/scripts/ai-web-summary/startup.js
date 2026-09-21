import { DEFAULT_CONFIG } from './prompts.js';

import { CONFIG, loadConfig } from './config.js';

import { createElements } from './summary-panel.js';

import { openSettings } from './settings-events.js';

import { showToastNotification } from './notifications.js';

import { initializeEvents } from './floating-panel.js';



let globalElements = {};

function main() {
        if (window.self !== window.top) { return; }
        try {
            loadConfig();
            globalElements = createElements();
            if (!globalElements || !globalElements.container) {
                console.error('AI_WebSummary: createElements() failed to return valid elements. Aborting initialization.');
                showToastNotification('AI Web Summary: 无法初始化悬浮窗核心元素，脚本可能无法正常工作。请检查浏览器控制台获取更多信息。');
                return;
            }

            initializeEvents(globalElements);
            const isDefaultApiKey = CONFIG.API_KEY === DEFAULT_CONFIG.API_KEY;

            if (isDefaultApiKey) {
                openSettings(globalElements);
                if (isDefaultApiKey) {
                    showToastNotification(`欢迎使用 AI 网页内容总结！请首次配置您的 API Key 和 Base URL。`);
                }
            }
        } catch (error) {
            console.error('AI_WebSummary: Critical error during script initialization:', error);
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed; bottom:10px; left:10px; background:red; color:white; padding:10px; z-index:100000; border-radius:5px; font-family: sans-serif;';
            errorDiv.textContent = 'AI Web Summary 脚本初始化失败，请检查控制台获取详细错误。';
            document.body.appendChild(errorDiv);
            setTimeout(() => {
                if (document.body.contains(errorDiv)) {
                    document.body.removeChild(errorDiv);
                }
            }, 10000);
        }
    }

function bootstrap() {
if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
}



export { bootstrap, globalElements };

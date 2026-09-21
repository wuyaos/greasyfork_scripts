import stylesheet1 from './styles/notifications.css';
import { globalElements } from './startup.js';



function showError(container, error, details = '') {
        container.innerHTML = `<div class="ai-summary-error"><strong>错误：</strong> ${error}</div>${details ? `<div class="ai-summary-debug">${details}</div>` : ''}`;
    }

function showToastNotification(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = stylesheet1;

        let shadowRootForToast = null;
        if (typeof globalElements !== 'undefined' && globalElements && globalElements.shadow) {
            shadowRootForToast = globalElements.shadow;
        } else {
            const rootEl = document.getElementById('ai-summary-root');
            if (rootEl && rootEl.shadowRoot) {
                shadowRootForToast = rootEl.shadowRoot;
            }
        }

        if (shadowRootForToast) {
            shadowRootForToast.appendChild(toast);
        } else {
            console.warn('AI_WebSummary: Shadow DOM for toast not found, appending to body. Style conflicts may occur.');
            document.body.appendChild(toast);
        }

        // 淡入效果
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.bottom = '40px';
        }, 50);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '20px';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500);
        }, duration);
    }



export { showError, showToastNotification };

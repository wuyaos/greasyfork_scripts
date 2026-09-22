import stylesheet1 from './styles/settings-panel-1.css';
import stylesheet2 from './styles/settings-panel-2.css';
import stylesheet3 from './styles/settings-panel-3.css';
import { DEFAULT_CONFIG } from './prompts.js';

import { CONFIG, getCurrentPromptContent, loadConfig } from './config.js';

import { updateAllPromptSelectors } from './selectors.js';

import { showToastNotification } from './notifications.js';

import { loadPosition } from './floating-panel.js';

import { globalElements } from './startup.js';



function createSettingsPanel(shadow) {
        const panel = document.createElement('div');
        panel.className = 'ai-settings-panel';
        panel.innerHTML = `<div class="panel-header"><h3>设置</h3><button class="cancel-btn ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div><div class="settings-content"><div class="form-group"><label for="base-url">Base URL (例如: https://api.openai.com)</label><input type="text" id="base-url" value="${CONFIG.BASE_URL || DEFAULT_CONFIG.BASE_URL}"></div><div class="form-group"><label for="api-key">API Key</label><input type="text" id="api-key" value="${CONFIG.API_KEY}"></div><div class="form-group"><label for="model-tags-container">模型</label><div class="model-tags-container" id="model-tags-container"></div><div class="model-actions"><button id="custom-model-btn" class="ai-btn ai-btn-special">自定义模型</button><button id="fetch-model-btn" class="ai-btn ai-btn-special">获取模型</button></div></div><div class="form-group"><label for="max-tokens">最大Token数</label><input type="number" id="max-tokens" value="${CONFIG.MAX_TOKENS}"></div><div class="form-group"><label for="shortcut">快捷键 (例如: Alt+S, Ctrl+Shift+Y)</label><input type="text" id="shortcut" value="${CONFIG.SHORTCUT}"></div><div class="form-group config-select-group"><label for="config-select">提示词选择</label><select class="ai-config-select" id="config-select" title="选择一个预设提示词模板"></select></div><div class="form-group"><label for="prompt">总结提示词内容</label><textarea id="prompt" readonly>${getCurrentPromptContent()}</textarea></div></div><div class="buttons" style="display: flex; justify-content: flex-end; gap: 10px;"><button class="clear-cache-btn ai-btn ai-btn-danger">重置</button><button class="save-btn ai-btn ai-btn-success">保存</button></div>`;

        const style = document.createElement('style');
        style.textContent = stylesheet1;
       style.textContent += stylesheet2;

        const settingsOverlay = document.createElement('div');
        settingsOverlay.className = 'ai-settings-overlay';
        settingsOverlay.style.display = 'none';

        const overlayStyle = document.createElement('style');
        overlayStyle.textContent = stylesheet3;
        shadow.appendChild(overlayStyle);
        shadow.appendChild(settingsOverlay);
        shadow.appendChild(panel);

        panel.querySelector('.clear-cache-btn').addEventListener('click', () => {
            if (!confirm('确定要重置所有设置并清除缓存吗？这将恢复到默认配置。')) {
                return;
            }

            const keysToClear = ['BASE_URL', 'API_KEY', 'MAX_TOKENS', 'SHORTCUT', 'MODEL', 'CURRENT_PROMPT_IDENTIFIER', 'SAVED_MODELS', 'saved_prompts', 'containerPosition'];
            keysToClear.forEach(key => GM_setValue(key, undefined));

            loadConfig();

            panel.querySelector('#base-url').value = CONFIG.BASE_URL;
            panel.querySelector('#api-key').value = CONFIG.API_KEY;
            panel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
            panel.querySelector('#shortcut').value = CONFIG.SHORTCUT;
            
            if (globalElements && globalElements.shadow) {
                const configSelect = panel.querySelector('#config-select');
                if (configSelect) {
                    configSelect.value = CONFIG.CURRENT_PROMPT_IDENTIFIER;
                    configSelect.dispatchEvent(new Event('change'));
                }
                updateAllPromptSelectors(globalElements);
            }

            panel.querySelector('#model-tags-container').renderModelTags();

            panel.setDirtyStatus(false);

            if (globalElements && globalElements.container) {
                loadPosition(globalElements.container);
            }

            showToastNotification('设置已重置并清除缓存！');
        });

        shadow.appendChild(style);

        const modelSelectionModal = document.createElement('div');
        modelSelectionModal.id = 'model-selection-modal';
        modelSelectionModal.className = 'ai-modal';
        modelSelectionModal.innerHTML = `<div class="modal-header"><h3>选择模型</h3><button class="close-modal ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div><div class="modal-content"><input type="text" id="model-search-input" placeholder="搜索模型..." style="width: 100%; padding: 6px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 12px;"><div id="model-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; max-height: 35vh; overflow-y: auto;"></div></div><div class="modal-footer" style="text-align: right;"><button id="save-selected-models" class="ai-btn ai-btn-success">保存</button></div>`;
        shadow.appendChild(modelSelectionModal);
        return { panel, overlay: settingsOverlay, modelSelectionModal };
    }

function validateShortcut(shortcut) {
        const regex = /^((Ctrl|Alt|Shift|Meta|Option)\+)*[A-Za-z]$/;
        return regex.test(shortcut);
    }



export { createSettingsPanel, validateShortcut };

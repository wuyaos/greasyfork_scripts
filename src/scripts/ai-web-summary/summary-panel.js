import stylesheet1 from './styles/summary-panel.css';
import { createSettingsPanel } from './settings-panel.js';



function createElements() {
        const rootContainer = document.createElement('div');
        rootContainer.id = 'ai-summary-root';

        const shadow = rootContainer.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = stylesheet1;

        const container = document.createElement('div');
        container.className = 'ai-summary-container ai-summary-hidden-initially snap-right';
        container.innerHTML = `<div class="ai-hover-wrapper"><div class="ai-actions-container"><button class="ai-template-btn" title="打开面板"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg></button><button class="ai-settings-btn-float" title="打开设置"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button><div class="ai-model-btn-container"><button class="ai-model-btn" title="选择模型"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></button><div class="ai-model-list ai-actions-list"></div></div><div class="ai-prompt-btn-container"><button class="ai-prompt-btn" title="选择提示词"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></button><div class="ai-prompt-list ai-actions-list"></div></div></div><button class="ai-summary-btn">AI</button></div>`;

        const modal = document.createElement('div');
        modal.className = 'ai-summary-modal';
        modal.innerHTML = `<div class="ai-summary-header"><div class="modal-title-group" style="display: flex; align-items: center; gap: 10px; flex-grow: 1; justify-content: flex-start;"><h3 style="margin-right: auto;">网页内容总结</h3><div class="modal-selectors" style="display: flex; align-items: center; gap: 10px;"><div style="display: flex; align-items: center; gap: 10px;"><label for="ai-prompt-select-modal" style="font-size: 12px; color: #495057; font-weight: 600;">模型 </label><select id="ai-model-select-modal" class="ai-model-select-modal" title="选择当前对话使用的模型" style="padding: 3px 6px; border-radius: 4px; border: 1px solid #ccc; font-size: 11px; max-width: 120px;"></select></div><div style="display: flex; align-items: center; gap: 8px;"><label for="ai-prompt-select-modal" style="font-size: 12px; color: #495057; font-weight: 600;">提示词 </label><select id="ai-prompt-select-modal" class="ai-prompt-select-modal" title="选择当前对话使用的提示词" style="flex-grow: 1; padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 11px;"></select></div></div></div><button class="ai-summary-close ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div><div class="ai-summary-content"></div><div class="ai-summary-footer"><div class="footer-buttons-container" style="display: flex; justify-content: flex-end; gap: 10px; width: 100%;"><button class="ai-settings-btn ai-btn ai-btn-icon" title="打开设置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button><button class="ai-retry-btn ai-btn ai-btn-icon" title="重新总结"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-2.3-6M21 3v6h-6"></path></svg></button><button class="ai-download-btn ai-btn ai-btn-secondary" title="下载总结"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>下载</span></button><button class="ai-copy-btn ai-btn ai-btn-secondary"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>复制</span></button></div></div>`;

        const overlay = document.createElement('div');
        overlay.className = 'ai-summary-overlay';

        const { panel: settingsPanel, overlay: settingsOverlay, modelSelectionModal } = createSettingsPanel(shadow);

        shadow.appendChild(style);
        shadow.appendChild(container);
        shadow.appendChild(modal);
        shadow.appendChild(overlay);
        shadow.appendChild(settingsPanel);

        document.body.appendChild(rootContainer);

        return {
            container,
            hoverWrapper: container.querySelector('.ai-hover-wrapper'),
            button: container.querySelector('.ai-summary-btn'),
            templateBtn: container.querySelector('.ai-template-btn'),
            settingsBtnFloat: container.querySelector('.ai-settings-btn-float'),
            actionsContainer: container.querySelector('.ai-actions-container'),
            promptBtn: container.querySelector('.ai-prompt-btn'),
            promptList: container.querySelector('.ai-prompt-list'),
            modelBtn: container.querySelector('.ai-model-btn'),
            modelList: container.querySelector('.ai-model-list'),
            modal,
            overlay,
            dragHandle: container.querySelector('.ai-summary-btn'),
            settingsPanel,
            settingsOverlay,
            shadow,
            downloadBtn: modal.querySelector('.ai-download-btn'),
            modelSelectionModal
        };
    }



export { createElements };

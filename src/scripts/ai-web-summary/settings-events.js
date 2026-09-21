import { DEFAULT_CONFIG, PROMPT_TEMPLATES } from './prompts.js';

import { CONFIG, getCurrentPromptContent } from './config.js';

import { populateModalModelSelector, updateAllPromptSelectors } from './selectors.js';

import { validateShortcut } from './settings-panel.js';

import { fetchModels } from './api.js';

import { showToastNotification } from './notifications.js';



function initializeSettingsEvents(panel, modal, settingsOverlay, modelSelectionModal, shadow) {
        panel.setDirtyStatus = setDirtyStatus;
        const saveBtn = panel.querySelector('.save-btn');
        const cancelBtn = panel.querySelector('.cancel-btn');

        let isDirty = false;
        let settingsSnapshot = {};
        let isSaving = false;

        function setDirtyStatus(dirty) {
            if (isSaving && dirty) {
                return;
            }
            isDirty = dirty;
            saveBtn.textContent = dirty ? '保存*' : '保存';
            if (dirty) {
                saveBtn.style.cssText = 'background: #e67e22 !important;';
            } else {
                saveBtn.style.cssText = 'background: #617043cc !important;';
            }
        }

        // 捕获当前设置面板中各项配置的值，并存储到 `settingsSnapshot` 对象中
        function takeSettingsSnapshot() {
            settingsSnapshot = {
                baseURL: panel.querySelector('#base-url').value,
                apiKey: panel.querySelector('#api-key').value,
                maxTokens: panel.querySelector('#max-tokens').value,
                shortcut: panel.querySelector('#shortcut').value,
                promptIdentifier: panel.querySelector('#config-select').value,
                model: CONFIG.MODEL,
                savedModels: [...CONFIG.SAVED_MODELS]
            };
        }

        function restoreSettingsFromSnapshot() {
            panel.querySelector('#base-url').value = settingsSnapshot.baseURL;
            panel.querySelector('#api-key').value = settingsSnapshot.apiKey;
            panel.querySelector('#max-tokens').value = settingsSnapshot.maxTokens;
            panel.querySelector('#shortcut').value = settingsSnapshot.shortcut;
            panel.querySelector('#config-select').value = settingsSnapshot.promptIdentifier;

            const promptChangeEvent = new Event('change');
            panel.querySelector('#config-select').dispatchEvent(promptChangeEvent);

            CONFIG.MODEL = settingsSnapshot.model;
            CONFIG.SAVED_MODELS = [...settingsSnapshot.savedModels];
            renderModelTags();
        }

        panel.takeSettingsSnapshot = takeSettingsSnapshot;

        function closeSettingsPanel() {
            if (isDirty) {
                if (confirm('您有未保存的更改。确定要放弃吗？')) {
                    restoreSettingsFromSnapshot();
                    setDirtyStatus(false);
                    panel.style.display = 'none';
                    settingsOverlay.style.display = 'none';
                }
            } else {
                panel.style.display = 'none';
                settingsOverlay.style.display = 'none';
            }
        }

        // 获取设置面板中的关键UI元素
        const promptSelect = panel.querySelector('#config-select'); // 提示词模板选择器
        const shortcutInput = panel.querySelector('#shortcut');       // 快捷键输入框
        const customModelBtn = panel.querySelector('#custom-model-btn'); // "自定义模型"按钮
        const fetchModelsBtn = panel.querySelector('#fetch-model-btn'); // "获取模型"按钮
        const modelTagsContainer = panel.querySelector('#model-tags-container'); // 模型标签容器

        // 根据用户操作系统判断是否为Mac，以显示不同的快捷键占位符提示
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
        shortcutInput.placeholder = isMac ?
            '例如: Option+S, ⌘+Shift+Y' :
            '例如: Alt+S, Ctrl+Shift+Y';

        saveBtn.textContent = '保存';

        panel.querySelector('#base-url').addEventListener('input', () => setDirtyStatus(true));
        panel.querySelector('#api-key').addEventListener('input', () => setDirtyStatus(true));
        panel.querySelector('#max-tokens').addEventListener('input', () => setDirtyStatus(true));
        shortcutInput.addEventListener('input', () => setDirtyStatus(true));

        promptSelect.addEventListener('change', (e) => {
            if (!isSaving) {
                setDirtyStatus(true);
            }
            const selectedIdentifier = e.target.value;
            const promptTextarea = panel.querySelector('#prompt');
            const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === selectedIdentifier);
            if (selectedTemplate) {
                promptTextarea.value = selectedTemplate.content;
                CONFIG.CURRENT_PROMPT_IDENTIFIER = selectedTemplate.identifier;
            } else {
                const defaultTemplate = PROMPT_TEMPLATES.find(t => t.identifier === DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER);
                promptTextarea.value = defaultTemplate.content;
                CONFIG.CURRENT_PROMPT_IDENTIFIER = DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER;
            }
        });

        function renderModelTags() {
            modelTagsContainer.innerHTML = '';
            CONFIG.SAVED_MODELS.forEach(modelId => {
                const tag = document.createElement('div');
                tag.className = 'model-tag';
                tag.textContent = modelId;
                tag.dataset.modelId = modelId;
                if (modelId === CONFIG.MODEL) {
                    tag.classList.add('selected');
                }

                tag.addEventListener('click', () => {
                    if (CONFIG.MODEL !== modelId) {
                        CONFIG.MODEL = modelId;
                        renderModelTags();
                        setDirtyStatus(true);
                    }
                });

                // 为每个模型标签创建并添加一个删除按钮 (×)
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.title = '删除此模型';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`确定要删除模型 "${modelId}" 吗？`)) {
                        CONFIG.SAVED_MODELS = CONFIG.SAVED_MODELS.filter(m => m !== modelId);
                        if (CONFIG.MODEL === modelId) {
                            CONFIG.MODEL = CONFIG.SAVED_MODELS.length > 0 ? CONFIG.SAVED_MODELS[0] : '';
                        }
                        renderModelTags();
                        setDirtyStatus(true);
                    }
                });

                tag.appendChild(deleteBtn);
                modelTagsContainer.appendChild(tag);
            });
        }

        renderModelTags();
        modelTagsContainer.renderModelTags = renderModelTags;

        modelTagsContainer.addEventListener('click', (e) => {
            if (e.target === modelTagsContainer) { 
                showMultiDeleteModal();
            }
        });

        function showMultiDeleteModal() {
            const multiDeleteModal = document.createElement('div');
            multiDeleteModal.className = 'ai-modal';
            multiDeleteModal.style.display = 'flex';
            multiDeleteModal.style.zIndex = '100003';

            const overlay = document.createElement('div');
            overlay.className = 'ai-settings-overlay';
            overlay.style.cssText = 'display: block; z-index: 100002;';
            overlay.addEventListener('click', e => e.stopPropagation());

            multiDeleteModal.innerHTML = `<div class="modal-header"><h3>批量删除模型</h3><button class="close-modal ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div><div class="modal-content"><input type="text" class="multi-delete-search-input" placeholder="搜索要删除的模型..." style="width: 100%; padding: 6px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 12px;"><div class="multi-delete-model-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; max-height: 35vh; overflow-y: auto; margin-top: 8px;"></div></div><div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;"><button class="modal-action-btn cancel-btn ai-btn ai-btn-secondary">取消</button><button class="modal-action-btn delete-selected-btn ai-btn ai-btn-danger">删除已选</button></div>`;

            shadow.appendChild(overlay);
            shadow.appendChild(multiDeleteModal);

            const modelListContainer = multiDeleteModal.querySelector('.multi-delete-model-list-container');
            const searchInput = multiDeleteModal.querySelector('.multi-delete-search-input');

            function renderDeleteList(filter = '') {
                const lowerCaseFilter = filter.toLowerCase();
                const filteredModels = CONFIG.SAVED_MODELS.filter(m => m.toLowerCase().includes(lowerCaseFilter));
                modelListContainer.innerHTML = filteredModels.map(modelId => `<div class="model-item" data-model-id="${modelId}"><input type="checkbox" value="${modelId}" id="multi-delete-chk-${modelId}" style="pointer-events: none;"><label for="multi-delete-chk-${modelId}">${modelId}</label></div>`).join('');
            }

            renderDeleteList();
            searchInput.addEventListener('input', () => renderDeleteList(searchInput.value));

            modelListContainer.addEventListener('click', e => {
                const item = e.target.closest('.model-item');
                if (item) {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox) checkbox.checked = !checkbox.checked;
                }
            });

            const closeModal = () => {
                shadow.removeChild(multiDeleteModal);
                shadow.removeChild(overlay);
            };

            multiDeleteModal.querySelector('.close-modal').addEventListener('click', closeModal);
            multiDeleteModal.querySelector('.cancel-btn').addEventListener('click', closeModal);

            multiDeleteModal.querySelector('.delete-selected-btn').addEventListener('click', () => {
                const selectedForDeletion = Array.from(modelListContainer.querySelectorAll('input[type="checkbox"]:checked')).map(chk => chk.value);

                if (selectedForDeletion.length === 0) {
                    showToastNotification('请至少选择一个要删除的模型。');
                    return;
                }

                if (confirm(`确定要删除这 ${selectedForDeletion.length} 个模型吗？`)) {
                    CONFIG.SAVED_MODELS = CONFIG.SAVED_MODELS.filter(m => !selectedForDeletion.includes(m));
                    if (selectedForDeletion.includes(CONFIG.MODEL)) {
                        CONFIG.MODEL = CONFIG.SAVED_MODELS.length > 0 ? CONFIG.SAVED_MODELS[0] : '';
                    }
                    renderModelTags();
                    setDirtyStatus(true);
                    closeModal();
                    showToastNotification('所选模型已删除。');
                }
            });
        }

        function showCustomModelModal() {
            const overlay = document.createElement('div');
            overlay.className = 'ai-settings-overlay';
            overlay.style.cssText = 'display: block; z-index: 100002;';
            overlay.addEventListener('click', e => e.stopPropagation());
            shadow.appendChild(overlay);

            const customModal = document.createElement('div');
            customModal.className = 'ai-modal ai-custom-model-modal';
            customModal.style.display = 'flex';
            customModal.style.zIndex = '100003';
            customModal.innerHTML = `<div class="modal-header"><h3>添加自定义模型</h3><button class="close-modal ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div><div class="modal-content"><p style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">请输入模型名称，多个模型请用英文逗号 (,) 或换行分隔。</p><textarea id="custom-models-textarea" placeholder="e.g. gpt-4o-mini, gpt-4-turbo" style="height: 80px;"></textarea></div><div class="modal-footer"><button class="cancel-btn ai-btn ai-btn-secondary">取消</button><button class="save-custom-models-btn ai-btn ai-btn-success">保存</button></div>`;
            shadow.appendChild(customModal);

            const closeModal = () => {
                shadow.removeChild(customModal);
                shadow.removeChild(overlay);
            };

            customModal.querySelector('.close-modal').addEventListener('click', closeModal);
            customModal.querySelector('.cancel-btn').addEventListener('click', closeModal);

            customModal.querySelector('.save-custom-models-btn').addEventListener('click', () => {
                const textarea = customModal.querySelector('#custom-models-textarea');
                const newModelsInput = textarea.value;

                if (newModelsInput && newModelsInput.trim()) {
                    const newModels = newModelsInput.trim().split(/[\n,]+/).map(m => m.trim()).filter(m => m);
                    let added = false;
                    let lastAddedModel = '';
                    newModels.forEach(modelId => {
                        if (!CONFIG.SAVED_MODELS.includes(modelId)) {
                            CONFIG.SAVED_MODELS.push(modelId);
                            lastAddedModel = modelId;
                            added = true;
                        }
                    });

                    if (added) {
                        CONFIG.MODEL = lastAddedModel;
                        renderModelTags();
                        setDirtyStatus(true);
                        showToastNotification('自定义模型已添加！');
                    } else {
                        showToastNotification('所有输入的模型均已存在！');
                    }
                    closeModal();
                } else {
                    showToastNotification('请输入模型名称。');
                }
            });
        }

        customModelBtn.addEventListener('click', showCustomModelModal);

        let fetchedModelsCache = [];
        const searchInput = modelSelectionModal.querySelector('#model-search-input'); // 模型选择模态框内的搜索框
        const modelListContainer = modelSelectionModal.querySelector('#model-list-container'); // 模型选择模态框内显示模型列表的容器

        function renderModelList(filter = '') {
            modelListContainer.innerHTML = '';
            const lowerCaseFilter = filter.toLowerCase();
            const filteredModels = fetchedModelsCache.filter(m => m.id.toLowerCase().includes(lowerCaseFilter));

            if (filteredModels.length === 0) {
                modelListContainer.innerHTML = `<p style="padding: 8px;">没有找到匹配的模型。</p>`;
                return;
            }

            filteredModels.forEach(model => {
                const div = document.createElement('div');
                div.className = 'model-item';
                div.innerHTML = `<input type="checkbox" value="${model.id}" id="model-checkbox-${model.id}" ${CONFIG.SAVED_MODELS.includes(model.id) ? 'checked' : ''} style="pointer-events: none;"><label for="model-checkbox-${model.id}">${model.id}</label>`;
                modelListContainer.appendChild(div);

            });
        }

        searchInput.addEventListener('input', () => renderModelList(searchInput.value));
        modelListContainer.addEventListener('click', e => {
            const item = e.target.closest('.model-item');
            if (item) {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
            }
        });

        fetchModelsBtn.addEventListener('click', async () => {
            modelListContainer.innerHTML = '<div class="ai-loading">正在获取模型列表...</div>';
            searchInput.value = '';
            modelSelectionModal.style.display = 'flex';

            try {
                const rawModels = await fetchModels();
                fetchedModelsCache = rawModels.map(m => (typeof m === 'string' ? { id: m, created: 0, owned_by: 'unknown' } : m));
                renderModelList();
            } catch (error) {
                modelListContainer.innerHTML = `<p style="color: red; padding: 8px;">获取模型失败: ${error.message}</p>`;
            }
        });


        saveBtn.addEventListener('click', () => {
            isSaving = true;

            let newShortcut = panel.querySelector('#shortcut').value.trim();
            newShortcut = newShortcut.replace(/Option\+/g, 'Alt+');
            if (!validateShortcut(newShortcut) && newShortcut !== "") {
                isSaving = false;
                showToastNotification(isMac ? '快捷键格式不正确。有效示例: Option+S, ⌘+Shift+Y' : '快捷键格式不正确。有效示例: Alt+S, Ctrl+Shift+Y');
                return;
            }

            const baseURLValue = panel.querySelector('#base-url').value.trim();
            if (!baseURLValue) {
                showToastNotification('Base URL 不能为空。');
                isSaving = false; return;
            }
            if (!baseURLValue.match(/^https?:\/\/.+/)) {
                showToastNotification('Base URL 格式不正确，应以 http:// 或 https:// 开头。');
                isSaving = false; return;
            }

            const apiKeyVaule = panel.querySelector('#api-key').value.trim();
            if (!apiKeyVaule) {
                alert('API Key 不能为空。');
                isSaving = false; return;
            }

            const maxTokensValue = panel.querySelector('#max-tokens').value.trim();
            const maxTokensParsed = parseInt(maxTokensValue);
            if (maxTokensValue === "" || isNaN(maxTokensParsed) || maxTokensParsed <= 0) { // 必须是大于0的有效数字
                alert('最大Token数必须是一个大于0的有效数字。');
                isSaving = false; return;
            }
            if (maxTokensParsed > 100000) {
                alert('最大Token数设置过大，可能导致请求失败或费用过高。请设置一个合理的值。');
            }

            if (!CONFIG.MODEL) {
                alert('请至少选择或添加一个模型。');
                isSaving = false; return;
            }

            CONFIG.BASE_URL = baseURLValue;
            CONFIG.API_KEY = apiKeyVaule;
            CONFIG.MAX_TOKENS = maxTokensParsed;
            CONFIG.SHORTCUT = newShortcut || DEFAULT_CONFIG.SHORTCUT;

            GM_setValue('BASE_URL', CONFIG.BASE_URL);
            GM_setValue('API_KEY', CONFIG.API_KEY);
            GM_setValue('MAX_TOKENS', CONFIG.MAX_TOKENS);
            GM_setValue('SHORTCUT', CONFIG.SHORTCUT);
            GM_setValue('MODEL', CONFIG.MODEL);
            GM_setValue('CURRENT_PROMPT_IDENTIFIER', CONFIG.CURRENT_PROMPT_IDENTIFIER);
            GM_setValue('SAVED_MODELS', CONFIG.SAVED_MODELS);

            populateModalModelSelector(modal);

            if (typeof panel.takeSettingsSnapshot === 'function') {
                panel.takeSettingsSnapshot();
            }
            setDirtyStatus(false);
            isSaving = false;

            showToastNotification('设置已应用！');
        });

        cancelBtn.addEventListener('click', closeSettingsPanel);
    }

function openSettings(elements) {
        const { settingsPanel, settingsOverlay } = elements;

        settingsPanel.querySelector('#base-url').value = CONFIG.BASE_URL || DEFAULT_CONFIG.BASE_URL;
        settingsPanel.querySelector('#api-key').value = CONFIG.API_KEY;
        settingsPanel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
        settingsPanel.querySelector('#shortcut').value = CONFIG.SHORTCUT;
        settingsPanel.querySelector('#prompt').value = getCurrentPromptContent();

        updateAllPromptSelectors(elements);

        const takeSnapshotFunc = settingsPanel.takeSettingsSnapshot;
        if (typeof takeSnapshotFunc === 'function') {
            takeSnapshotFunc();
        } else {
            console.error("takeSettingsSnapshot function is not attached to the panel.");
        }

        const setDirtyStatusFunc = settingsPanel.setDirtyStatus;
        if (typeof setDirtyStatusFunc === 'function') {
            setDirtyStatusFunc(false);
        } else {
            if (panel && typeof panel.setDirtyStatus === 'function') {
                panel.setDirtyStatus(false);
            } else if (elements && elements.settingsPanel && typeof elements.settingsPanel.setDirtyStatus === 'function') {
                elements.settingsPanel.setDirtyStatus(false);
            }
            else {
                console.warn("setDirtyStatus function could not be called directly on panel open. Dirty state might be initially incorrect.");
            }
        }


        settingsPanel.style.display = 'flex';
        settingsOverlay.style.display = 'block';
    }



export { initializeSettingsEvents, openSettings };

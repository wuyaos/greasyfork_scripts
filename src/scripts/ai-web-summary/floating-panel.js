import { DEFAULT_CONFIG, PROMPT_TEMPLATES } from './prompts.js';

import { CONFIG, getCurrentPromptContent } from './config.js';

import { populateModalModelSelector, updateAllPromptSelectors } from './selectors.js';

import { initializeSettingsEvents, openSettings } from './settings-events.js';

import { getFullEndpoint, getPageContent } from './api.js';

import { showError, showToastNotification } from './notifications.js';



let hasDragged = false;

let originalMarkdownText = '';

async function summarizeContent(content, shadow, selectedModel) {
        const contentContainer = shadow.querySelector('.ai-summary-content');
        contentContainer.innerHTML = '<div class="ai-loading">正在总结中...</div>';
        originalMarkdownText = '';

        try {
            const apiUrlToUse = getFullEndpoint(CONFIG.BASE_URL);
            if (!apiUrlToUse) {
                throw new Error("API端点配置不正确，请检查BASE_URL设置。");
            }

            const payload = {
                model: selectedModel,
                messages: [
                    { role: 'system', content: getCurrentPromptContent() },
                    { role: 'user', content: content }
                ],
                max_tokens: CONFIG.MAX_TOKENS,
                temperature: 0.7,
                stream: true
            };
            return new Promise((resolve, reject) => {
                GM.xmlHttpRequest({
                    method: 'POST',
                    url: apiUrlToUse,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.API_KEY}`
                    },
                    data: JSON.stringify(payload),
                    responseType: 'stream',
                    onloadstart: (stream) => {
                        const reader = stream.response.getReader();
                        const decoder = new TextDecoder('utf-8');
                        let buffer = '';

                        function processText() {
                            reader.read().then(({ done, value }) => {
                                if (done) {
                                    if (buffer.startsWith('data: ')) {
                                        const dataStr = buffer.substring(6);
                                        if (dataStr.trim() !== '[DONE]') {
                                            try {
                                                const chunk = JSON.parse(dataStr);
                                                if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                                                    originalMarkdownText += chunk.choices[0].delta.content;
                                                }
                                            } catch(e) { /* 忽略解析错误，因为这可能是流意外中断的最后一部分 */ }
                                        }
                                    }
                                    contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                                    contentContainer.scrollTop = contentContainer.scrollHeight;
                                    resolve(originalMarkdownText);
                                    return;
                                }

                                buffer += decoder.decode(value, { stream: true });
                                let lines = buffer.split('\n');
                                buffer = lines.pop();

                                for (const line of lines) {
                                    if (line.startsWith('data: ')) {
                                        const dataStr = line.substring(6);
                                        if (dataStr.trim() === '[DONE]') {
                                            contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                                            contentContainer.scrollTop = contentContainer.scrollHeight;
                                            resolve(originalMarkdownText);
                                            reader.cancel();
                                            return;
                                        }
                                        try {
                                            // 解析JSON数据块
                                            const chunk = JSON.parse(dataStr);
                                            if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                                                const textChunk = chunk.choices[0].delta.content;
                                                originalMarkdownText += textChunk;
                                                let htmlContent = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                                                htmlContent += '<span class="thinking-cursor">▋</span>';
                                                contentContainer.innerHTML = htmlContent;
                                                contentContainer.scrollTop = contentContainer.scrollHeight;
                                            }
                                        } catch (e) {
                                            console.error('解析JSON块失败:', e, '原始数据:', dataStr);
                                        }
                                    }
                                }
                                processText();
                            }).catch(err => {
                                if (err.name === 'AbortError') {
                                    console.log('GM.xmlHttpRequest: reader.read() 中捕获到 AbortError (通常由用户操作触发)');
                                }
                                reject(err);
                            });
                        }
                        processText(); // 首次调用，启动流式数据处理
                    },
                    onerror: (response) => {
                        let errorDetail = `GM.xmlHttpRequest 请求失败 (${response.status})。`;
                        try {
                            if (response.response) {
                                const errorResponse = JSON.parse(response.response);
                                if (errorResponse.error && errorResponse.error.message) {
                                    errorDetail = `API错误 (${response.status}): ${errorResponse.error.message}`;
                                }
                            }
                        } catch (e) {
                            errorDetail += ' 无法解析错误响应。';
                        }
                        reject(new Error(errorDetail));
                    },
                    ontimeout: () => {
                        reject(new Error('GM.xmlHttpRequest 请求超时。'));
                    }
                });

            });
        } catch (error) {
            console.error('总结生成错误:', error);
            showError(contentContainer, error.message);
            throw error;
        }
    }

function initializeEvents(elements) {
        const { container, hoverWrapper, button, templateBtn, settingsBtnFloat, promptBtn, modelBtn, modal, overlay, dragHandle, settingsPanel, settingsOverlay, shadow, modelSelectionModal, promptList, modelList, actionsContainer } = elements;

        overlay.addEventListener('click', e => e.stopPropagation());
        settingsOverlay.addEventListener('click', e => e.stopPropagation());

        if (!elements.shadow) {
            console.error('Shadow root not initialized for initializeEvents');
            return;
        }

        initializeDrag(container, dragHandle);

        let leaveTimeout;
        const HIDE_DELAY = 500;

        const hideSubMenus = (force = false) => {
            let wasVisible = false;
            [promptList, modelList].forEach(list => {
                if (list.classList.contains('show')) {
                    wasVisible = true;
                    if (force) {
                        list.classList.remove('show', 'is-collapsing');
                        list.style.display = 'none';
                    } else {
                        list.classList.add('is-collapsing');
                        list.addEventListener('animationend', () => {
                            list.classList.remove('show', 'is-collapsing');
                            list.style.display = 'none'; // 动画结束后再隐藏
                        }, { once: true });
                    }
                }
            });
            return wasVisible;
        };

        // 核心函数：显示完整交互UI
        const showUi = () => {
            clearTimeout(leaveTimeout); // 取消准备收起UI的计时器
            container.classList.remove('is-collapsing');
            container.classList.add('is-expanded');

            // --- 智能定位主面板 (actionsContainer) ---
            requestAnimationFrame(() => {
                const mainButtonRect = button.getBoundingClientRect();
                const GAP = 12;

                // 预计算面板尺寸
                actionsContainer.style.visibility = 'hidden';
                actionsContainer.style.display = 'flex';
                const actionsHeight = actionsContainer.offsetHeight;
                actionsContainer.style.display = '';
                actionsContainer.style.visibility = '';

                // 默认在按钮下方弹出
                let panelTop = mainButtonRect.height + GAP;
                actionsContainer.style.top = `${panelTop}px`;
                actionsContainer.style.bottom = 'auto';

                // 如果下方空间不足，则在上方弹出
                if (mainButtonRect.bottom + actionsHeight + GAP > window.innerHeight) {
                    actionsContainer.style.top = 'auto';
                    actionsContainer.style.bottom = `${mainButtonRect.height + GAP}px`;
                }
            });
        };

        // 核心函数：收起UI
        const hideUi = () => {
            clearTimeout(leaveTimeout);
            leaveTimeout = setTimeout(() => {
                hideSubMenus();
                // 延迟收起主面板，给子菜单动画留出时间 (150ms)
                setTimeout(() => {
                    container.classList.add('is-collapsing');
                    container.classList.remove('is-expanded');
                }, 150);
            }, HIDE_DELAY);
        };

        [hoverWrapper, promptList, modelList].forEach(elem => {
            elem.addEventListener('mouseenter', showUi);
            elem.addEventListener('mouseleave', hideUi);
        });

        // 核心函数：切换（显示/隐藏）子菜单列表
        function toggleMenuList(listElement, buttonElement, items, configKey, gmKey, displayField, idField, toastPrefix) {
            const isVisible = listElement.classList.contains('show');
            hideSubMenus(true);

            if (isVisible) return;

            listElement.innerHTML = '';
            const currentId = CONFIG[configKey];
            items.forEach(item => {
                const listItem = document.createElement('div');
                listItem.className = 'ai-actions-list-item';
                if (item[idField] === currentId) listItem.classList.add('selected');
                listItem.textContent = item[displayField];
                listItem.dataset.id = item[idField];
                listItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newId = e.currentTarget.dataset.id;
                    if (CONFIG[configKey] !== newId) {
                        CONFIG[configKey] = newId;
                        GM_setValue(gmKey, newId);

                        // 实时高亮
                        const parentList = e.currentTarget.parentNode;
                        const oldSelected = parentList.querySelector('.selected');
                        if (oldSelected) oldSelected.classList.remove('selected');
                        e.currentTarget.classList.add('selected');

                        if (configKey === 'CURRENT_PROMPT_IDENTIFIER') updateAllPromptSelectors(elements);
                        else populateModalModelSelector(modal);

                        const newName = items.find(i => i[idField] === newId)?.[displayField] || '';
                        showToastNotification(`${toastPrefix}: ${newName}`);
                    }

                });
                listElement.appendChild(listItem);
            });

            // --- 智能定位列表 ---
            listElement.style.display = 'block';
            listElement.classList.remove('is-collapsing');

            // 强制浏览器重绘以获取稳定的 listRect 尺寸
            listElement.offsetHeight;

            requestAnimationFrame(() => {
                const actionsRect = actionsContainer.getBoundingClientRect();
                const btnRect = buttonElement.getBoundingClientRect();
                const viewportPadding = 10;

                const isSnappedLeft = container.classList.contains('snap-left');
                if (isSnappedLeft) {
                    listElement.style.left = `${actionsRect.width}px`;
                    listElement.style.right = 'auto';
                    listElement.style.transformOrigin = 'left center';
                } else {
                    listElement.style.right = `${actionsRect.width}px`;
                    listElement.style.left = 'auto';
                    listElement.style.transformOrigin = 'right center';
                }

                const listHeight = listElement.scrollHeight;
                const spaceAbove = btnRect.top - viewportPadding;
                const spaceBelow = window.innerHeight - btnRect.bottom - viewportPadding;
                const maxHeight = window.innerHeight / 3;

                let finalMaxHeight = Math.min(listHeight, maxHeight);
                let top;

                if (finalMaxHeight > spaceBelow && spaceAbove > spaceBelow) {
                    finalMaxHeight = Math.min(finalMaxHeight, spaceAbove);
                    top = buttonElement.offsetTop + buttonElement.offsetHeight - finalMaxHeight;
                } else {
                    finalMaxHeight = Math.min(finalMaxHeight, spaceBelow);
                    top = buttonElement.offsetTop;
                }

                listElement.style.top = `${top}px`;
                listElement.style.maxHeight = `${finalMaxHeight}px`;
                listElement.style.bottom = 'auto';

                listElement.classList.add('show');
            });
        }

        promptBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenuList(promptList, promptBtn, PROMPT_TEMPLATES, 'CURRENT_PROMPT_IDENTIFIER', 'CURRENT_PROMPT_IDENTIFIER', 'title', 'identifier', '提示词');
        });

        modelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modelItems = CONFIG.SAVED_MODELS.map(id => ({ id: id, name: id }));
            toggleMenuList(modelList, modelBtn, modelItems, 'MODEL', 'MODEL', 'name', 'id', '模型');
        });

        document.addEventListener('click', (e) => {
            if (!actionsContainer.contains(e.target)) {
                hideSubMenus();
            }
        });

        const modalPromptSelector = modal.querySelector('#ai-prompt-select-modal');
        if (modalPromptSelector) {
            modalPromptSelector.addEventListener('change', (e) => {
                const newIdentifier = e.target.value;
                 if (CONFIG.CURRENT_PROMPT_IDENTIFIER !== newIdentifier) {
                    CONFIG.CURRENT_PROMPT_IDENTIFIER = newIdentifier;
                    GM_setValue('CURRENT_PROMPT_IDENTIFIER', newIdentifier);
                    updateAllPromptSelectors(elements);
                    const newTitle = PROMPT_TEMPLATES.find(t => t.identifier === newIdentifier)?.title || '提示词';
                    showToastNotification(`提示词已切换为: ${newTitle}`);
                }
            });
        }

        const modelSelectInModal = modal.querySelector('#ai-model-select-modal');
        if (modelSelectInModal) {
            modelSelectInModal.addEventListener('change', (e) => {
                const newModel = e.target.value;
                if (CONFIG.MODEL !== newModel) {
                    CONFIG.MODEL = newModel;
                    GM_setValue('MODEL', newModel);
                    showToastNotification(`模型已切换为: ${newModel}`);
                }
            });
        }

        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            hideSubMenus(true);
            openSettings(elements);
        });

        if (settingsBtnFloat) {
            settingsBtnFloat.addEventListener('click', () => {
                hideSubMenus(true);
                openSettings(elements);
            });
        }

        templateBtn.addEventListener('click', () => {
            hideSubMenus(true);
            populateModalModelSelector(modal);
            updateAllPromptSelectors(elements);
            showModal(modal, overlay);
            const contentContainer = modal.querySelector('.ai-summary-content');
            if (originalMarkdownText && originalMarkdownText.trim() !== '') {
                contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
            } else {
                contentContainer.innerHTML = '<p style="text-align:center; color:#6c757d; margin: 2em 1em; font-size: 14px;">点击 "AI" 按钮开始总结，或在下方选择不同功能。</p>';
            }
        });

        button.addEventListener('click', async () => {
            if (hasDragged) {
                hasDragged = false;
                return;
            }
            if (!CONFIG.API_KEY || !CONFIG.BASE_URL || !CONFIG.MODEL || CONFIG.API_KEY === DEFAULT_CONFIG.API_KEY) {
                showToastNotification('请先在设置中配置API Key、Base URL和模型。', 3000);
                openSettings(elements);
                return;
            }

            showModal(modal, overlay);
            const contentContainer = modal.querySelector('.ai-summary-content');

            const retryBtnModal = modal.querySelector('.ai-retry-btn');
            const downloadBtnModal = modal.querySelector('.ai-download-btn');
            const copyBtnModal = modal.querySelector('.ai-copy-btn');

            button.disabled = true;
            button.textContent = '...';
            if(retryBtnModal) retryBtnModal.disabled = true;
            if(downloadBtnModal) downloadBtnModal.disabled = true;
            if(copyBtnModal) copyBtnModal.disabled = true;
            originalMarkdownText = '';

            try {
                const { content } = getPageContent();
                if (!content.trim()) {
                    throw new Error('网页内容为空，无法生成总结。');
                }
                populateModalModelSelector(modal);
                updateAllPromptSelectors(elements);
                const modelForApi = modelSelectInModal.value;
                if (!modelForApi) {
                    throw new Error('未配置模型，请在设置中选择一个模型。');
                }
                await summarizeContent(content, shadow, modelForApi);
            } catch (error) {
                console.error('Summary Error:', error);
                showError(contentContainer, error.message || '发生未知错误');
                originalMarkdownText = '';
            } finally {
                button.disabled = false;
                button.textContent = "AI";
                if(retryBtnModal) retryBtnModal.disabled = false;
                if(downloadBtnModal) downloadBtnModal.disabled = !originalMarkdownText;
                if(copyBtnModal) copyBtnModal.disabled = !originalMarkdownText;
            }
        });

        modal.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target;
            const downloadBtn = target.closest('.ai-download-btn');
            const copyBtn = target.closest('.ai-copy-btn');
            const retryBtn = target.closest('.ai-retry-btn');
            const settingsBtn = target.closest('.ai-settings-btn');
            const closeBtn = target.closest('.ai-summary-close');

            if (downloadBtn) {
                e.preventDefault();
                console.log('AI_WebSummary: Download button clicked', { hasContent: !!originalMarkdownText });
                
                if (!originalMarkdownText || originalMarkdownText.trim() === '') {
                    showToastNotification('总结内容尚未生成或已失效。');
                    return;
                }
                
                try {
                    let pageTitle = document.title.trim();
                    let decodedPageTitle = '';
                    if (pageTitle) {
                        try {
                            decodedPageTitle = decodeURIComponent(pageTitle);
                        } catch (err) {
                            console.warn('Failed to decode URI component in page title:', pageTitle, err);
                            decodedPageTitle = pageTitle;
                        }
                    } else {
                        decodedPageTitle = "Untitled_Page";
                    }
                    const domain = window.location.hostname || "";
                    let baseFileName = `${decodedPageTitle} - ${domain}`;
                    baseFileName = baseFileName.replace(/[<>:"/\\|?*~#%&{}\\$;'@`=!,+()[\]^]/g, '_').replace(/\s+/g, ' ').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
                    const maxLength = 80;
                    if (baseFileName.length > maxLength) {
                        baseFileName = baseFileName.substring(0, maxLength).replace(/_$/,'').replace(/^_|_$/g, '');
                    }
                    if (!baseFileName) {
                        const now = new Date();
                        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
                        baseFileName = `Summary_${timestamp}`;
                        showToastNotification('无法从网页标题和域名生成有效文件名，已使用默认文件名。', 3000);
                    }
                    const fileName = `${baseFileName}.md`;
                    const blob = new Blob([originalMarkdownText], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', fileName);
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showToastNotification('文件下载成功！');
                    console.log('AI_WebSummary: File download completed', { fileName });
                } catch (error) {
                    console.error('AI_WebSummary: Download failed', error);
                    showToastNotification('下载失败，请稍后重试。');
                }
            }
            else if (copyBtn) {
                e.preventDefault();
                console.log('AI_WebSummary: Copy button clicked', { hasContent: !!originalMarkdownText });
                if (!originalMarkdownText || originalMarkdownText.trim() === '') {
                    showToastNotification('总结内容尚未生成或已失效。');
                    return;
                }

                if (!navigator.clipboard) {
                    showToastNotification('浏览器不支持复制功能，请手动复制内容。');
                    return;
                }

                navigator.clipboard.writeText(originalMarkdownText).then(() => {
                    const textSpan = copyBtn.querySelector('span');
                    if (textSpan) {
                        const originalText = textSpan.textContent;
                        textSpan.textContent = '已复制！';
                        copyBtn.style.opacity = '0.7';
                        setTimeout(() => {
                            textSpan.textContent = originalText;
                            copyBtn.style.opacity = '1';
                        }, 2000);
                    }
                    console.log('AI_WebSummary: Copy completed using Clipboard API');
                }).catch((error) => {
                    console.error('AI_WebSummary: Copy failed with Clipboard API', error);
                    showToastNotification('复制失败，请手动复制内容。');
                });
            }
            else if (retryBtn) {
                button.click();
            }
            else if (settingsBtn) {
                openSettings(elements);
            }
            else if (closeBtn) {
                hideModal(modal, overlay);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (isShortcutPressed(e, CONFIG.SHORTCUT)) {
                e.preventDefault();
                button.click();
            }
            if (e.key === 'Escape') {
                if (settingsPanel.style.display === 'flex') {
                    settingsPanel.style.display = 'none';
                    settingsOverlay.style.display = 'none';
                }
                if (modal.classList.contains('show')) {
                    hideModal(modal, overlay);
                }
            }
        });

        initializeSettingsEvents(settingsPanel, modal, settingsOverlay, modelSelectionModal, shadow);
        updateAllPromptSelectors(elements);
        modelSelectionModal.querySelector('.close-modal').addEventListener('click', () => {
            modelSelectionModal.style.display = 'none';
        });

        modelSelectionModal.querySelector('#save-selected-models').addEventListener('click', () => {
            const selectedModels = [];
            const checkboxes = modelSelectionModal.querySelectorAll('#model-list-container input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                selectedModels.push(checkbox.value);
            });

            CONFIG.SAVED_MODELS = selectedModels;
            GM_setValue('SAVED_MODELS', selectedModels);

            if (!selectedModels.includes(CONFIG.MODEL)) {
                CONFIG.MODEL = selectedModels.length > 0 ? selectedModels[0] : '';
                GM_setValue('MODEL', CONFIG.MODEL);
            }

            settingsPanel.querySelector('#model-tags-container').renderModelTags();
            settingsPanel.setDirtyStatus(true);


            modelSelectionModal.style.display = 'none';
            showToastNotification('模型列表已保存！');
        });
    }

function isShortcutPressed(event, shortcut) {
        const keys = shortcut.split('+');
        let ctrl = false, alt = false, shift = false, meta = false, key = null;

        keys.forEach(k => {
            const lower = k.toLowerCase();
            if (lower === 'ctrl') ctrl = true;
            if (lower === 'alt' || lower === 'option') alt = true;
            if (lower === 'shift') shift = true;
            if (lower === 'meta') meta = true;
            if (lower.length === 1 && /^[a-z]$/.test(lower)) key = lower;
        });

        if (key && event.key.toLowerCase() === key) {
            return event.ctrlKey === ctrl &&
                   event.altKey === alt &&
                   event.shiftKey === shift &&
                   event.metaKey === meta;
        }

        return false;
    }

function showModal(modal, overlay) {
        modal.classList.add('show');
        overlay.style.display = 'block';
    }

function hideModal(modal, overlay) {
        modal.classList.remove('show');
        overlay.style.display = 'none';
    }

function savePosition(container) {
        const position = {
            top: container.style.top,
            isSnapLeft: container.classList.contains('snap-left')
        };
        GM_setValue('containerPosition', position);
    }

function loadPosition(container) {
        let savedPosition = GM_getValue('containerPosition');

        // 清除旧版本数据格式
        if (savedPosition && savedPosition.left !== undefined && savedPosition.isSnapLeft === undefined) {
            GM_setValue('containerPosition', undefined);
            savedPosition = undefined;
        }

        if (savedPosition && savedPosition.top !== undefined) {
            container.style.top = savedPosition.top;

            const isSnapLeft = savedPosition.isSnapLeft !== undefined ? savedPosition.isSnapLeft : false;

            container.classList.toggle('snap-left', isSnapLeft);
            container.classList.toggle('snap-right', !isSnapLeft);

            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            const SCROLLBAR_MARGIN = Math.max(scrollbarWidth, 15);

            if (isSnapLeft) {
                container.style.left = '0px';
            } else {
                const containerWidth = Math.max(32, Math.min(36, window.innerWidth * 0.08)); // 自适应容器宽度
                container.style.left = `${window.innerWidth - containerWidth - SCROLLBAR_MARGIN}px`;
            }

        } else {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            const SCROLLBAR_MARGIN = Math.max(scrollbarWidth, 15);
            const defaultTop = window.innerHeight - 100;
            const containerWidth = Math.max(32, Math.min(36, window.innerWidth * 0.08)); // 自适应容器宽度

            container.style.left = `${window.innerWidth - containerWidth - SCROLLBAR_MARGIN}px`;
            container.style.top = `${defaultTop}px`;

            container.classList.remove('snap-left');
            container.classList.add('snap-right');
        }


    }

function initializeDrag(container, dragHandle) {
        let isDragging = false;
        let offsetX, offsetY;
        let animationFrameId = null;

        const startDragTransition = () => container.style.transition = 'none';
        const endDragTransition = () => container.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

        const snapToEdge = (moveContainer = true, forceRecalculate = false) => {
            endDragTransition();
            if (isDragging) return;

            const rect = container.getBoundingClientRect();
            const windowWidth = window.innerWidth;

            let isSnappedLeft;
            if (forceRecalculate || (!container.classList.contains('snap-left') && !container.classList.contains('snap-right'))) {
                isSnappedLeft = (rect.left + rect.width / 2) < windowWidth / 2;
                container.classList.toggle('snap-left', isSnappedLeft);
                container.classList.toggle('snap-right', !isSnappedLeft);
            } else {
                isSnappedLeft = container.classList.contains('snap-left');
            }

            if (moveContainer) {
                requestAnimationFrame(() => {
                    let targetLeft;

                    if (isSnappedLeft) {
                        targetLeft = 0;
                    } else {
                        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                        const SCROLLBAR_MARGIN = Math.max(scrollbarWidth, 15);
                        targetLeft = windowWidth - rect.width - SCROLLBAR_MARGIN;
                    }

                    container.style.left = `${targetLeft}px`;
                });
            }

            requestAnimationFrame(() => {
                if (container.classList.contains('ai-summary-hidden-initially')) {
                    container.classList.remove('ai-summary-hidden-initially');
                }
            });
        };

        dragHandle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            hasDragged = false;
            const rect = container.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            startDragTransition();
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            hasDragged = true;

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }

            animationFrameId = requestAnimationFrame(() => {
                if (!isDragging) return;
                let newX = e.clientX - offsetX;
                let newY = e.clientY - offsetY;
                const containerWidth = container.offsetWidth;
                const containerHeight = container.offsetHeight;
                const PADDING = 10;

                newX = Math.max(0, Math.min(newX, window.innerWidth - containerWidth));
                newY = Math.max(PADDING, Math.min(newY, window.innerHeight - containerHeight - PADDING));

                container.style.left = `${newX}px`;
                container.style.top = `${newY}px`;
            });
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
                document.body.style.userSelect = 'auto';
                snapToEdge(true, true); // 先重新计算贴边方向
                savePosition(container); // 然后保存贴边后的状态
            }
        });

        window.addEventListener('load', () => {
            container.style.transition = 'none';
            container.style.opacity = '0';
            container.classList.remove('ai-summary-hidden-initially');

            loadPosition(container);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (container.classList.contains('ai-summary-hidden-initially')) {
                        container.classList.remove('ai-summary-hidden-initially');
                    }

                    snapToEdge(true);

                    container.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), left 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
                    container.style.opacity = '1';
                });
            });
        });

        window.addEventListener('resize', () => setTimeout(() => snapToEdge(true, false), 100));

    }



export { initializeEvents, loadPosition };

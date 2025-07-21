// ==UserScript==
// @name         AI网页内容总结(自用)
// @namespace    http://tampermonkey.net/
// @version      2.0.4
// @description  使用AI总结网页内容的油猴脚本
// @author       Jinfeng (modifed by ffwu)
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/ai.png
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @require      https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js
// @license      Apache-2.0
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/AI_WebSummary.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/AI_WebSummary.user.js
// ==/UserScript==

/* ==更新日志==
 * v2.0.4 (2025-07-21)
 * - 更新悬浮窗样式
 * v2.0.3 (2025-06-30)
 * - 修改悬浮菜单交互逻辑和样式，支持菜单吸附
 * v2.0.2 (2025-06-14)
 * - 修复github页面的总结
 * - 修复populateModalModelSelector is not defined
 * - 修复失去焦点时总结内容消失的问题
 * - 清理无用代码、添加中文注释
 * - 优化悬浮窗停靠动画
 * - 修改UI界面
 * - 修复悬浮窗超出窗口的问题
 * v2.0.1 (2025-06-14)
 * - 修复多选删除/模型选择模态框字体对比度问题
 * - 优化设置面板状态同步机制
 * - 实现模型列表实时更新功能
 */

(function() {
    'use strict';

    let hasDragged = false; // 全局（IIFE作用域内）标志，用于区分点击和拖拽

    // 默认配置
    const PROMPT_TEMPLATES = [
        {
            identifier: "template-通用网页总结",
            title: "通用网页总结",
            content: "（用中文回答）请用markdown格式全面总结以下网页内容，包含主要观点、关键信息和重要细节。总结需要完整、准确、有条理。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-学术论文总结",
            title: "学术论文总结",
            content: "（用中文回答）请用markdown格式总结这篇学术论文，包含以下要点：\n1. 研究目的和背景\n2. 研究方法\n3. 主要发现\n4. 结论和意义\n请确保总结准确、专业，并突出论文的创新点。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-新闻事件总结",
            title: "新闻事件总结",
            content: "（用中文回答）请用markdown格式总结这则新闻，包含以下要点：\n1. 事件梗概（时间、地点、人物）\n2. 事件经过\n3. 影响和意义\n4. 各方反应\n请确保总结客观、准确，并突出新闻的重要性。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-一句话概括",
            title: "一句话概括",
            content: "（用中文回答）请用markdown格式用一句简洁但信息量充足的话概括这段内容的核心要点。要求：不超过50个字，通俗易懂，突出重点。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-知乎专业解答",
            title: "知乎专业解答",
            content: "（用中文回答）请用markdown格式以知乎回答的风格总结这段内容。要求：\n1. 开头要吸引眼球\n2. 分点论述，层次分明\n3. 使用专业术语\n4. 适当举例佐证\n5. 语气要专业且自信\n6. 结尾点题升华\n注意：要用markdown格式，保持知乎体特有的严谨专业但不失亲和力的风格。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-表格化总结",
            title: "表格化总结",
            content: "（用中文回答）请用markdown格式将内容重点提取并整理成markdown表格格式。表格应当包含以下列：\n| 主题/概念 | 核心要点 | 补充说明 |\n要求条理清晰，重点突出，易于阅读。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-深度分析",
            title: "深度分析",
            content: "（用中文回答）请用markdown格式对内容进行深度分析，包含：\n1. 表层信息提炼\n2. 深层原因分析\n3. 可能的影响和发展\n4. 个人见解和建议\n注意：分析要有洞察力，观点要有独特性，论述要有逻辑性。使用markdown格式。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-轻松幽默风",
            title: "轻松幽默风",
            content: "（用中文回答）请用markdown格式用轻松幽默的语气总结这段内容。要求：\n1. 口语化表达\n2. 适当使用梗和比喻\n3. 保持内容准确性\n4. 增加趣味性类比\n注意：幽默要得体，不失专业性。使用markdown格式。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-要点清单",
            title: "要点清单",
            content: "（用中文回答）请用markdown格式将内容整理成简洁的要点清单，要求：\n1. 用markdown的项目符号格式\n2. 每点都简洁明了（不超过20字）\n3. 按重要性排序\n4. 分类呈现（如适用）\n5. 突出关键词或数字\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-ELI5通俗解释",
            title: "ELI5通俗解释",
            content: "（用中文回答）请用markdown格式用简单易懂的语言解释这段内容，就像向一个五年级学生解释一样。要求：\n1. 使用简单的词汇\n2. 多用比喻和类比\n3. 避免专业术语\n4. 循序渐进地解释\n注意：解释要生动有趣，便于理解，但不能有失准确性。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-观点对比",
            title: "观点对比",
            content: "（用中文回答）请用markdown格式以对比的形式总结文中的不同观点或方面：\n\n### 正面观点/优势\n- 观点1\n- 观点2\n\n### 负面观点/劣势\n- 观点1\n- 观点2\n\n### 中立分析\n综合以上观点的分析和建议\n\n注意：要客观公正，论据充分。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-Q&A模式",
            title: "Q&A模式",
            content: "（用中文回答）请用markdown格式将内容重点转化为问答形式，要求：\n1. 问题要简洁清晰\n2. 答案要详细准确\n3. 由浅入深\n4. 覆盖核心知识点\n格式：\nQ1: [问题]\nA1: [答案]\n\n注意：问答要有逻辑性，便于理解和记忆。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-商务简报",
            title: "商务简报",
            content: "（用中文回答）请用markdown格式以商务简报的形式总结内容：\n\n### 执行摘要\n[一段概述]\n\n### 关键发现\n- 发现1\n- 发现2\n\n### 数据支撑\n[列出关键数据]\n\n### 行动建议\n1. 建议1\n2. 建议2\n\n注意：简报风格要专业、简洁、重点突出。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-时间轴梳理",
            title: "时间轴梳理",
            content: "（用中文回答）请用markdown格式将内容按时间顺序整理成清晰的时间轴：\n\n### 时间轴\n- [时间点1]：事件/进展描述\n- [时间点2]：事件/进展描述\n\n### 关键节点分析\n[分析重要时间节点的意义]\n\n注意：要突出重要时间节点，并分析其意义。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-观点提炼",
            title: "观点提炼",
            content: "（用中文回答）请用markdown格式提炼这段内容中的核心观点，按逻辑顺序列出。每个观点需要简洁明了，突出其关键性。要求：\n- 使用简洁的语言\n- 突出观点的主旨\n- 按照论点的层次组织\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-趋势预测",
            title: "趋势预测",
            content: "（用中文回答）请用markdown格式基于这段内容分析其背后的趋势，预测未来可能的发展方向。要求：\n- 提出一个清晰的趋势分析框架\n- 分析现有数据和信息如何推动这一趋势\n- 预测可能的行业影响和未来趋势\n- 提供具体的建议或行动步骤\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-关键问题分析",
            title: "关键问题分析",
            content: "（用中文回答）请用markdown格式对文中提出的关键问题进行详细分析，包含以下要点：\n1. 问题的背景与成因\n2. 当前解决方案及其效果\n3. 可能的解决方案和优缺点\n4. 解决这一问题的长期影响和潜在风险\n要求：分析要有深度，确保逻辑严密，提出建设性意见。\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-对话式总结",
            title: "对话式总结",
            content: "（用中文回答）请用markdown格式将内容总结为对话式的形式，类似于对话问答。要求：\n- 通过模拟两个人的对话来呈现信息\n- 每个问题要简洁明了\n- 答案要准确、易懂，避免过于专业的术语\n- 对话可以适当加入互动与思考\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-SWOT分析",
            title: "SWOT分析",
            content: "（用中文回答）请用markdown格式对这段内容进行SWOT分析（优势、劣势、机会、威胁）。要求：\n- 优势：列出文中描述的优势\n- 劣势：列出可能的劣势或挑战\n- 机会：分析潜在的机会\n- 威胁：分析可能面临的威胁\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-情景假设",
            title: "情景假设",
            content: "（用中文回答）请用markdown格式基于这段内容，设定一个假设情景并进行分析。要求：\n- 提供假设情景的背景和设定\n- 根据现有内容推演可能的结果\n- 讨论可能面临的挑战与解决方案\n- 结合现实情况，给出合理的建议\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        },
        {
            identifier: "template-步骤指南",
            title: "步骤指南",
            content: "（用中文回答）请用markdown格式将这段内容总结成一个清晰的操作步骤指南。要求：\n- 每一步操作清晰简洁\n- 每一步的目标或目的要明确\n- 适当提供示例或注意事项\n- 步骤顺序按逻辑组织\n 另外要求输出时不需要再注明这是markdown代码块，即```markdown .... ```"
        }
    ];

    const DEFAULT_CONFIG = {
        BASE_URL: 'https://api.openai.com',
        API_KEY: 'sk-randomKey1234567890',
        MAX_TOKENS: 4000,
        SHORTCUT: 'Alt+S',
        MODEL: 'gpt-4o-mini',
        CURRENT_PROMPT_IDENTIFIER: PROMPT_TEMPLATES[0].identifier,
        SAVED_MODELS: ['gpt-4o-mini'],
    };

    // 获取配置
    let CONFIG = {};
    function loadConfig() {
        CONFIG = {
            BASE_URL: GM_getValue('BASE_URL', DEFAULT_CONFIG.BASE_URL),
            API_KEY: GM_getValue('API_KEY', DEFAULT_CONFIG.API_KEY),
            MAX_TOKENS: GM_getValue('MAX_TOKENS', DEFAULT_CONFIG.MAX_TOKENS),
            SHORTCUT: GM_getValue('SHORTCUT', DEFAULT_CONFIG.SHORTCUT),
            MODEL: GM_getValue('MODEL', DEFAULT_CONFIG.MODEL),
            CURRENT_PROMPT_IDENTIFIER: GM_getValue('CURRENT_PROMPT_IDENTIFIER', DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER),
            SAVED_MODELS: GM_getValue('SAVED_MODELS', DEFAULT_CONFIG.SAVED_MODELS),
            containerPosition: GM_getValue('containerPosition')
        };
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === CONFIG.CURRENT_PROMPT_IDENTIFIER);
        if (!selectedTemplate) {
            CONFIG.CURRENT_PROMPT_IDENTIFIER = DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER;
        }
        return CONFIG;
    }

    // 获取当前选中的提示词模板内容。
    function getCurrentPromptContent() {
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === CONFIG.CURRENT_PROMPT_IDENTIFIER);
        if (selectedTemplate) {
            return selectedTemplate.content;
        }

        const defaultTemplate = PROMPT_TEMPLATES.find(t => t.identifier === DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER);
        return defaultTemplate ? defaultTemplate.content : "请用markdown格式全面总结以下网页内容，包含主要观点、关键信息和重要细节。总结需要完整、准确、有条理。"; // 最后的硬编码后备
    }


    function populateModalModelSelector(modalElement) {
        if (!modalElement) {
            console.error("populateModalModelSelector: modalElement is undefined");
            return;
        }
        const modelSelectInModal = modalElement.querySelector('#ai-model-select-modal');
        if (modelSelectInModal) {
            modelSelectInModal.innerHTML = CONFIG.SAVED_MODELS.map(modelId =>
                `<option value="${modelId}" ${modelId === CONFIG.MODEL ? 'selected' : ''}>${modelId}</option>`
            ).join('');
        } else {
            console.error("populateModalModelSelector: #ai-model-select-modal not found in modalElement");
        }
    }

    function updateAllPromptSelectors(elements) {
        if (!elements || !elements.shadow) {
            console.error('Elements or shadow root not initialized for updateAllPromptSelectors');
            return;
        }
        const currentIdentifier = CONFIG.CURRENT_PROMPT_IDENTIFIER || PROMPT_TEMPLATES[0].identifier;
        const optionsHTML = PROMPT_TEMPLATES.map(template =>
            `<option value="${template.identifier}" ${template.identifier === currentIdentifier ? 'selected' : ''}>${template.title}</option>`
        ).join('');

        const mainSelector = elements.shadow.querySelector('.ai-main-prompt-selector');
        if (mainSelector) mainSelector.innerHTML = optionsHTML;

        const modalSelector = elements.shadow.querySelector('#ai-prompt-select-modal');
        if (modalSelector) modalSelector.innerHTML = optionsHTML;

        const settingsSelector = elements.settingsPanel.querySelector('#config-select');
        if (settingsSelector) settingsSelector.innerHTML = PROMPT_TEMPLATES.map(template =>
            `<option value="${template.identifier}" ${template.identifier === currentIdentifier ? 'selected' : ''}>${template.title} (预设)</option>`
        ).join('');

        const promptTextarea = elements.settingsPanel.querySelector('#prompt');
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === currentIdentifier);
        if (promptTextarea && selectedTemplate) {
            promptTextarea.value = selectedTemplate.content;
        }
    }

    //  初始化设置面板的事件监听器， 此函数负责处理设置面板内的所有用户交互
    function initializeSettingsEvents(panel, modal, settingsOverlay, modelSelectionModal, shadow, elements) { // 接收 elements 作为参数
        panel.setDirtyStatus = setDirtyStatus;
        const saveBtn = panel.querySelector('.save-btn');
        const cancelBtn = panel.querySelector('.cancel-btn');

        // isDirty: 标记设置是否有未保存的更改。
        let isDirty = false;
        // settingsSnapshot: 存储打开设置面板时各项配置的初始值，用于"取消"操作时恢复。
        let settingsSnapshot = {};
        // isSaving: 标志位，指示当前是否正在执行保存操作。
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
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
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

            multiDeleteModal.innerHTML = `
                <div class="modal-header">
                    <h3>批量删除模型</h3>
                    <button class="close-modal ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
                <div class="modal-content">
                    <input type="text" class="multi-delete-search-input" placeholder="搜索要删除的模型..." style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                    <div class="multi-delete-model-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 40vh; overflow-y: auto; margin-top: 10px;">
                        <!-- Models will be rendered here -->
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="modal-action-btn cancel-btn ai-btn ai-btn-secondary">取消</button>
                    <button class="modal-action-btn delete-selected-btn ai-btn ai-btn-danger">删除已选</button>
                </div>
            `;

            shadow.appendChild(overlay);
            shadow.appendChild(multiDeleteModal);

            const modelListContainer = multiDeleteModal.querySelector('.multi-delete-model-list-container');
            const searchInput = multiDeleteModal.querySelector('.multi-delete-search-input');

            function renderDeleteList(filter = '') {
                const lowerCaseFilter = filter.toLowerCase();
                const filteredModels = CONFIG.SAVED_MODELS.filter(m => m.toLowerCase().includes(lowerCaseFilter));
                modelListContainer.innerHTML = filteredModels.map(modelId => `
                    <div class="model-item" data-model-id="${modelId}">
                        <input type="checkbox" value="${modelId}" id="multi-delete-chk-${modelId}" style="pointer-events: none;">
                        <label for="multi-delete-chk-${modelId}">${modelId}</label>
                    </div>
                `).join('');
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
            customModal.innerHTML = `
                <div class="modal-header">
                    <h3>添加自定义模型</h3>
                    <button class="close-modal ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
                <div class="modal-content">
                    <p style="font-size: 13px; color: #6c757d; margin-bottom: 10px;">请输入模型名称，多个模型请用英文逗号 (,) 或换行分隔。</p>
                    <textarea id="custom-models-textarea" placeholder="e.g. gpt-4o-mini, gpt-4-turbo" style="height: 100px;"></textarea>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn ai-btn ai-btn-secondary">取消</button>
                    <button class="save-custom-models-btn ai-btn ai-btn-success">保存</button>
                </div>
            `;
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
                modelListContainer.innerHTML = `<p style="padding: 10px;">没有找到匹配的模型。</p>`;
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
            // 
            modelListContainer.innerHTML = '<div class="ai-loading">正在获取模型列表...</div>';
            searchInput.value = '';
            modelSelectionModal.style.display = 'flex';

            try {
                const rawModels = await fetchModels();
                fetchedModelsCache = rawModels.map(m => (typeof m === 'string' ? { id: m, created: 0, owned_by: 'unknown' } : m));
                renderModelList();
            } catch (error) {
                modelListContainer.innerHTML = `<p style="color: red; padding: 10px;">获取模型失败: ${error.message}</p>`; // 显示错误信息
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

    function createSettingsPanel(shadow) {
        const panel = document.createElement('div');
        panel.className = 'ai-settings-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>设置</h3>
                <button class="cancel-btn ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div class="settings-content">
                <div class="form-group">
                    <label for="base-url">Base URL (例如: https://api.openai.com)</label> <!-- API基础地址输入 -->
                    <input type="text" id="base-url" value="${CONFIG.BASE_URL || DEFAULT_CONFIG.BASE_URL}">
                </div>
                <div class="form-group">
                    <label for="api-key">API Key</label> <!-- API密钥输入 -->
                    <input type="text" id="api-key" value="${CONFIG.API_KEY}">
                </div>
                <!-- 模型管理区域: 显示已选模型标签，并提供自定义和获取模型的按钮 -->
                <div class="form-group">
                    <label for="model-tags-container">模型</label>
                    <div class="model-tags-container" id="model-tags-container">
                        {/* 动态生成的模型标签将出现在这里 (由initializeSettingsEvents中的renderModelTags函数填充) */}
                    </div>
                    <div class="model-actions">
                        <button id="custom-model-btn" class="ai-btn ai-btn-special">自定义模型</button> <!-- 手动添加模型名称 -->
                        <button id="fetch-model-btn" class="ai-btn ai-btn-special">获取模型</button> <!-- 从API获取可用模型列表 -->
                    </div>
                </div>
                <div class="form-group">
                    <label for="max-tokens">最大Token数</label> <!-- 最大Token数输入 -->
                    <input type="number" id="max-tokens" value="${CONFIG.MAX_TOKENS}">
                </div>
                <div class="form-group">
                    <label for="shortcut">快捷键 (例如: Alt+S, Ctrl+Shift+Y)</label> <!-- 快捷键输入 -->
                    <input type="text" id="shortcut" value="${CONFIG.SHORTCUT}">
                </div>
                <!-- 提示词选择区域: 包含一个下拉选择器和用于显示当前选中模板内容的只读文本域 -->
                <div class="form-group config-select-group">
                    <label for="config-select">提示词选择</label>
                    <select class="ai-config-select" id="config-select" title="选择一个预设提示词模板">
                        {/* 选项将由 updateAllPromptSelectors 函数动态填充 */}
                    </select>
                </div>
                <div class="form-group">
                    <label for="prompt">总结提示词内容</label>
                    <textarea id="prompt" readonly>${getCurrentPromptContent()}</textarea> <!-- 显示当前选中提示词模板的内容 -->
                </div>
            </div>
            <div class="buttons" style="display: flex; justify-content: flex-end; gap: 10px;"> <!-- 面板底部的操作按钮区域 -->
                <button class="clear-cache-btn ai-btn ai-btn-danger">重置</button> <!-- 重置所有设置到默认值并清除缓存 -->
                <button class="save-btn ai-btn ai-btn-success">保存</button> <!-- 保存当前设置 -->
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            /* 设置面板主容器样式：定位居中、尺寸、背景、边框、阴影、字体等 */
            .ai-settings-panel {
                display: none; /* 默认隐藏 */
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                width: 90%;
                max-width: 600px; /* 最大宽度限制 */
                max-height: 80vh; /* 最大高度限制 */
                box-sizing: border-box;
                font-family: "Microsoft Yahei", "PingFang SC", "HanHei SC", sans-serif;
                font-size: 15px;
                z-index: 100001; /* 确保在其他页面元素之上 */
                flex-direction: column; /* 新增: 使用flex布局，使子元素垂直排列 */
                overflow: hidden; /* 防止内容溢出圆角 */
            }
            .ai-settings-panel h3 { /* 面板标题样式 */
                margin: 0 0 20px 0;
                padding-bottom: 10px;
                color: #495057;
                font-size: 18px;
                font-weight: 900;
            }
            .panel-header { /* 模态框头部样式 */
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #dee2e6;
                padding: 10px 20px; /* 调整内边距 */
                margin-bottom: 0; /* 移除外边距 */
                flex-shrink: 0; /* 防止头部在flex布局中被压缩 */
            }
            .panel-header h3 { /* 模态框标题样式 */
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #495057;
            }

            .settings-content {
                overflow-y: auto;
                flex-grow: 1;
                padding: 0 20px;
                min-height: 0;
            }
            .form-group { /* 表单组通用样式 */
                margin-bottom: 15px;
            }
            .form-group label { /* 表单标签样式 */
                display: block;
                margin-bottom: 5px;
                color: #495057;
                font-weight: 600;
            }
            /* 表单输入框、文本域、选择器的通用样式 */
            .form-group input,
            .form-group textarea,
            .form-group select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
                background: #fff;
                color: #495057;
            }

            /* 输入框、文本域、选择器获取焦点时的样式 */
            .form-group input:focus,
            .form-group textarea:focus,
            .form-group select:focus {
                outline: none;
                border-color: #3b82f6; /* 统一焦点颜色 */
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25); /* 统一焦点光晕 */
            }
            .form-group textarea { /* 文本域特定样式 */
                height: 100px; /* 默认高度 */
                resize: vertical; /* 允许垂直方向调整大小 */
                font-family: inherit; /* 继承父容器字体 */
            }
            .form-group.config-select-group { /* 提示词选择器所在表单组的特殊布局 */
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .form-group.config-select-group label { /* 提示词选择器标签的样式调整 */
                flex: 0 0 auto; /* 不伸缩 */
                margin-bottom: 0;
            }

            .form-group:not(.config-select-group) { /* 其他非提示词选择器的表单组恢复默认块级布局 */
                display: block;
            }
            .buttons { /* 面板底部按钮容器的样式 */
                display: flex;
                justify-content: flex-end; /* 按钮靠右 */
                gap: 10px;
                padding: 15px 20px;
                border-top: 1px solid #dee2e6;
                flex-shrink: 0;
            }

            .modal-action-btn { /* 通用模态框操作按钮（如"获取模型"模态框中的按钮）的基本样式 */
               /* 这个类名在HTML中是加在 .cancel-btn 和 .delete-selected-btn 上的，它们可以继续使用 .ai-btn-* */
            }

            .ai-config-select { /* 提示词模板下拉选择器样式 */
                padding: 6px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                background: #fff;
                color: #495057;
                flex-grow: 1; /* 占据可用空间 */
            }

            /* 通用模态框样式 (例如用于"获取模型"、"批量删除模型"等功能) */
            .ai-modal {
                display: none; /* 默认隐藏 */
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                width: 90%;
                max-width: 500px;
                max-height: 70vh;
                z-index: 100003; /* 确保在设置面板的遮罩层之上 */
                display: none; /* 默认隐藏 */
                flex-direction: column; /* 内部元素垂直排列 */
                overflow: hidden; /* 确保子元素不会破坏圆角 */
                background: #fff;
                padding: 0; /* 移除内边距，由子元素控制 */
            }
            .modal-header { /* 模态框头部样式 */
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #dee2e6;
                padding: 15px 20px;
                margin-bottom: 0;
                border-bottom: 1px solid #dee2e6;
                flex-shrink: 0; /* 防止头部被压缩 */
            }
            .modal-header h3 { /* 模态框标题样式 */
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #495057;
            }
            /* .close-modal (模态框关闭按钮) 现在使用 .ai-btn.ai-btn-icon, 无需额外样式 */
            .modal-content { /* 模态框内容区域样式 */
                overflow-y: auto; /* 内容溢出时垂直滚动 */
                flex-grow: 1; /* 占据可用垂直空间 */
                padding: 20px;
                margin-bottom: 0;
                min-height: 0; /* 修复flexbox在某些浏览器中的溢出问题 */
            }
            #model-list-container label { /* 模型选择列表中的标签样式 */
                font-weight: normal;
                font-size: 14px;
                color: #e2e8f0;
            }
            .ai-modal .model-item, /* 批量删除 */
            #model-list-container .model-item { /* 模型选择列表中的每个条目样式 */
                padding: 8px 12px;
                border: 1px solid #dee2e6; /* 灰色框线 */
                margin-bottom: 5px; /* 增加一点间距 */
                border-radius: 4px; /* 加上一点圆角与整体风格统一 */
                display: flex;
                align-items: center;
                transition: background-color 0.2s, color 0.2s;
                cursor: pointer;
            }
            .ai-modal .model-item label,
            #model-list-container .model-item label {
                color: #333333;
                margin-left: 8px;
                cursor: pointer;
                flex-grow: 1; /* 确保标签填满剩余空间 */
            }
            .ai-modal .model-item:hover,
            #model-list-container .model-item:hover {
                background-color: #eef5ff; /* 统一悬停背景色 (浅蓝) */
            }
            .ai-modal .model-item:hover label,
            #model-list-container .model-item:hover label {
                color: #2563eb; /* 统一悬停文字颜色 (深蓝) */
            }
            .modal-footer { /* 模态框底部样式 */
                border-top: 1px solid #dee2e6;
                padding: 15px 20px;
                text-align: right; /* 按钮靠右对齐 */
                flex-shrink: 0; /* 防止底部被压缩 */
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background-color: #f8f9fa;
                border-top: 1px solid #dee2e6;
            }
            #save-selected-models { /* "获取模型"模态框中的"保存"按钮样式，将使用 .ai-btn-success */
                /* padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                color: #fff;
                background: #617043cc; */
            }
            /* #save-selected-models:hover { background:rgb(47, 86, 56); } */
            .form-group.config-select-group { /* 再次定义以确保flex布局生效 */
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: nowrap; /* 防止换行 */
            }
            .ai-config-select { /* 再次定义以确保flex-grow生效 */
                flex-grow: 1;
            }
            /* 模型标签容器和单个模型标签的样式 */
            .model-tags-container {
               display: flex; /* 水平排列标签 */
               flex-wrap: wrap; /* 允许换行 */
               gap: 8px; /* 标签之间的间隙 */
               margin-bottom: 10px;
               padding: 8px;
               background-color: #f8f9fa; /* 轻微背景色 */
               border: 1px solid #dee2e6;
               border-radius: 4px;
           }
           .model-tag { /* 单个模型标签的样式 */
               display: flex;
               align-items: center;
               background-color: #e9ecef;
               padding: 5px 10px;
               border-radius: 15px; /* 圆角标签 */
               font-size: 14px;
               color: #333;
               cursor: pointer; /* 可点击选择 */
               transition: background-color 0.2s;
           }
           .model-tag.selected { /* 当前选中的模型标签的特殊样式 */
               background-color: #3b82f6; /* 统一选中颜色 */
               color: white;
               font-weight: bold;
           }
           .model-tag .delete-btn { /* 模型标签内部的删除按钮 (×) 样式 */
               background: none;
               border: none;
               color: #888;
               font-size: 18px;
               margin-left: 8px;
               cursor: pointer;
               padding: 0;
               line-height: 1;
           }
           .model-tag.selected .delete-btn { color: white; } /* 选中标签的删除按钮颜色 */
           .model-tag .delete-btn:hover { color: #f00; } /* 删除按钮悬停时颜色变为红色 */
           /* "自定义模型"和"获取模型"按钮的容器样式 */
           .model-actions {
                display: flex;
                gap: 10px;
                margin-top: 10px;
                color:#ffffff;
           }
       `;
       style.textContent += `
           /* Custom Modal for adding models */
           .ai-custom-model-modal {
               width: 350px; /* Specific width for this modal */
               max-width: 90%;
           }
           .ai-custom-model-modal .modal-content textarea {
               width: 100%;
               padding: 8px 12px;
               border: 1px solid #ced4da;
               border-radius: 4px;
               font-size: 14px;
               box-sizing: border-box;
               background: #fff;
               color: #495057;
               resize: vertical;
               font-family: inherit;
           }
           .ai-custom-model-modal .modal-content textarea:focus {
               outline: none;
               border-color: #3b82f6; /* 统一焦点颜色 */
               box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25); /* 统一焦点光晕 */
           }
       `;

        const settingsOverlay = document.createElement('div');
        settingsOverlay.className = 'ai-settings-overlay';
        settingsOverlay.style.display = 'none';

        const overlayStyle = document.createElement('style');
        overlayStyle.textContent = `
            .ai-settings-overlay { /* 设置面板遮罩层的样式 */
                display: none; /* 默认隐藏 */
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
                z-index: 100000; /* 层级确保在设置面板下方，但在页面其他内容之上 */
            }
        `;
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
            
            if (typeof globalElements !== 'undefined' && globalElements && globalElements.shadow) {
                const configSelect = panel.querySelector('#config-select');
                if (configSelect) {
                    configSelect.value = CONFIG.CURRENT_PROMPT_IDENTIFIER;
                    configSelect.dispatchEvent(new Event('change'));
                }
                updateAllPromptSelectors(globalElements);
            }

            const modelTagsContainer = panel.querySelector('#model-tags-container');
            if (modelTagsContainer && typeof modelTagsContainer.renderModelTags === 'function') {
                modelTagsContainer.renderModelTags();
            } else {
                console.warn("renderModelTags function not found on modelTagsContainer during cache clear.");
            }

            if (panel && typeof panel.setDirtyStatus === 'function') {
                panel.setDirtyStatus(false);
            }

            if (typeof globalElements !== 'undefined' && globalElements && globalElements.container) {
                loadPosition(globalElements.container);
            }

            showToastNotification('设置已重置并清除缓存！');
        });

        shadow.appendChild(style);

        const modelSelectionModal = document.createElement('div');
        modelSelectionModal.id = 'model-selection-modal';
        modelSelectionModal.className = 'ai-modal';
        modelSelectionModal.innerHTML = `
            <div class="modal-header"> <!-- 模态框头部：标题和关闭按钮 -->
                <h3>选择模型</h3>
                <button class="close-modal ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div class="modal-content"> <!-- 模态框内容区域 -->
                <!-- 模型搜索输入框 -->
                <input type="text" id="model-search-input" placeholder="搜索模型..." style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                <!-- 模型列表容器 (由JS动态填充) -->
                <div id="model-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 40vh; overflow-y: auto;"></div>
            </div>
            <div class="modal-footer" style="text-align: right;"> <!-- 模态框底部：保存按钮 -->
                <button id="save-selected-models" class="ai-btn ai-btn-success">保存</button>
            </div>
        `;
        shadow.appendChild(modelSelectionModal);
        return { panel, overlay: settingsOverlay, modelSelectionModal };
    }

    function validateShortcut(shortcut) {
        // 更新正则表达式以支持 Option 键
        const regex = /^((Ctrl|Alt|Shift|Meta|Option)\+)*[A-Za-z]$/;
        return regex.test(shortcut);
    }

    function createElements() {
        const rootContainer = document.createElement('div');
        rootContainer.id = 'ai-summary-root';

        const shadow = rootContainer.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            /* 统一按钮基础样式 */
            .ai-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                line-height: 1.2;
                text-align: center;
                transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease;
                color: #ffffff;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                min-width: 100px; /* 确保按钮有一定最小宽度 */
                font-family: inherit; /* 继承父容器字体 */
            }
            .ai-btn:active {
                transform: translateY(1px);
                box-shadow: 0 0 2px rgba(0,0,0,0.1);
            }

            /* 主操作按钮 */
            .ai-btn-primary {
                background-color: #34567a; /* 深蓝色 */
            }
            .ai-btn-primary:hover {
                background-color: #2c4864;
            }

            /* 次要/常规操作按钮 */
            .ai-btn-secondary {
                background-color: #5a6268; /* 中灰色 */
            }
            .ai-btn-secondary:hover {
                background-color: #4a4e52;
            }

            /* 危险/警告操作按钮 */
            .ai-btn-danger {
                background-color:#c82333; /* 暗红色 */
            }
            .ai-btn-danger:hover {
                background-color:#ac1e2d;
            }

            /* 成功/保存操作按钮 */
            .ai-btn-success {
                background-color:#218838; /* 暗绿色 */
            }
            .ai-btn-success:hover {
                background-color: #196c2c;
            }

            /* 特殊/文本按钮 */
            .ai-btn-special {
                background-color:#ffffff;
                color: #495057;
                border: 1px solid rgba(108, 117, 125, 0);
            }
            .ai-btn-special:hover {
                background-color:#ffffff;
            }

            /* 图标按钮，无背景，仅图标 */
            .ai-btn-icon {
                background: none;
                border: none;
                padding: 5px; /* 较小的内边距 */
                color: #adb5bd; /* 浅灰色图标 */
                box-shadow: none;
                min-width: auto; /* 图标按钮不需要最小宽度 */
                line-height: 1; /* 确保图标垂直居中 */
            }
            .ai-btn-icon svg {
                width: 20px; /* 保持SVG大小 */
                height: 20px;
            }
            .ai-btn-icon:hover {
                color: #e9ecef; /* 更亮的灰色图标 */
                background-color: rgba(255,255,255,0.1); /* 轻微背景反馈 */
            }
            /* --- 原有样式开始 --- */
            /* --- 动画 Keyframes 定义 --- */
            /* Keyframes for smooth animations with better easing */
            @keyframes slide-in-from-right {
                from { transform: translateX(50%); }
                to { transform: translateX(0); }
            }
            @keyframes slide-out-to-right {
                from { transform: translateX(0); }
                to { transform: translateX(50%); }
            }
            @keyframes slide-in-from-left {
                from { transform: translateX(-50%); }
                to { transform: translateX(0); }
            }
            @keyframes slide-out-to-left {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
            }

            @keyframes panel-popup-in {
                from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.98); }
                to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            }
            @keyframes panel-popup-out {
                from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                to { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.98); }
            }
            @keyframes menu-expand-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes menu-collapse-out {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.95); }
            }

            .ai-summary-hidden-initially {
                visibility: hidden;
            }

            .ai-summary-container {
                position: fixed;
                z-index: 99990;
                user-select: none;
                /* Default state (snapped right) */
                transform: translateX(50%);
                /* Smoother transitions for position and transform */
                /* 只对 transform 应用过渡，以获得最佳性能 */
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); /* 更平缓的动画曲线 */
            }

            /* State modifiers for snapping */
            .ai-summary-container.snap-left {
                /* 当贴靠左侧时，其左边缘应为0，然后由 transform 将其移出视野 */
                transform: translateX(-50%);
            }
            .ai-summary-container.snap-right {
                transform: translateX(50%);
            }
            .ai-summary-container.is-expanded {
                transform: translateX(0);
            }

            /* 折叠时没有特殊的过渡，它由状态改变处理 */

            .ai-summary-btn {
                width: 40px;
                height: 40px;
                background-color: #3b82f6;
                color: white;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                transition: background-color 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .ai-summary-btn:hover {
                background-color: #2563eb;
                transform: scale(1.05);
            }
            .ai-actions-container {
                display: flex;
                flex-direction: column;
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                opacity: 0;
                pointer-events: none;
                gap: 8px;
                background-color: rgba(55, 65, 81, 0.95);
                padding: 8px;
                border-radius: 8px;
                z-index: -1;
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: opacity, transform;
            }
            /* V4 对齐修复: 仅在snap-left时覆盖动画原点，保持其居中定位 */
            .ai-summary-container.snap-left .ai-actions-container {
                transform-origin: left center;
            }
            .ai-summary-container.is-expanded .ai-actions-container {
                opacity: 1;
                pointer-events: auto;
                animation: panel-popup-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards;
            }
            .ai-summary-container:not(.is-expanded) .ai-actions-container {
                opacity: 0;
                pointer-events: none;
                animation: panel-popup-out 0.2s cubic-bezier(0.5, 0, 0.75, 0) forwards;
            }

            .ai-hover-wrapper {
                padding: 10px;
                margin: -10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
            }
            .ai-prompt-btn-container, .ai-model-btn-container {
                position: relative;
            }
            .ai-actions-list {
                display: none;
                position: absolute;
                background-color: #2d3748;
                border-radius: 6px;
                padding: 5px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4); /* 增加阴影 */
                z-index: 10;
                width: 200px;
                /* max-height 由JS动态设置 */
                overflow-y: auto;
                transform-origin: top center; /* JS会动态调整 */
                animation: menu-expand-in 0.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                will-change: opacity, transform; /* 性能优化提示 */
            }
            .ai-actions-list.is-collapsing {
                animation: menu-collapse-out 0.15s cubic-bezier(0.5, 0, 0.75, 0) forwards;
            }
            .ai-actions-list.show {
                display: block;
            }
            .ai-actions-list-item {
                padding: 10px 15px; /* 增加内边距 */
                color: #e2e8f0;
                cursor: pointer;
                border-radius: 0; /* 移除圆角，与设置面板统一 */
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: background-color 0.15s ease-in-out;
                border-bottom: 1px solid #3d4756; /* 分隔线 */
            }
            .ai-actions-list-item:last-child {
                border-bottom: none; /* 最后一项无分隔线 */
            }
            .ai-actions-list-item:hover {
                background-color: #4a5568; /* 保持深色主题的悬停效果 */
            }
            .ai-actions-list-item.selected {
                background-color: #3b82f6;
                font-weight: bold;
                color: #fff; /* 确保选中项文字清晰 */
            }
            /* 为所有圆形图标按钮应用统一的样式 */
            .ai-template-btn, .ai-settings-btn-float, .ai-prompt-btn, .ai-model-btn {
                padding: 0;
                background-color: transparent;
                color: #f3f4f6;
                border: none;
                cursor: pointer;
                height: 30px;
                width: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
            }
            .ai-template-btn:hover, .ai-settings-btn-float:hover, .ai-prompt-btn:hover, .ai-model-btn:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            .ai-summary-modal {
                user-select: none;
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 800px;
                max-height: 80vh;
                background: #f8f9fa;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                border-radius: 8px;
                z-index: 99995;
                overflow: hidden;
                font-family: "Microsoft Yahei", "PingFang SC", "HanHei SC", sans-serif;
            }
            .ai-summary-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 99994;
            }
            .ai-summary-header {
                padding: 15px 20px;
                background: #e7ebee;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            .ai-summary-header h3 {
                color: #495057;
                margin: 0;
                padding: 0;
                font-size: 18px;
                font-weight: 900;
                line-height: 1.4;
                font-family: inherit;
            }
            /* .ai-summary-close (总结模态框的关闭按钮) 现在使用 .ai-btn.ai-btn-icon, 无需额外样式 */
            .ai-summary-content {
                user-select: text;
                padding: 20px;
                overflow-y: auto;
                max-height: calc(80vh - 130px); /* 底部按钮区域高度可能变化，需要调整 */
                line-height: 1.6;
                color: #374151;
                font-size: 15px;
                font-family: inherit;
                -webkit-overflow-scrolling: touch; /* 改善移动端滚动体验 */
            }
            .ai-summary-content h1 {
                font-size: 1.8em;
                margin: 1.5em 0 0.8em;
                padding-bottom: 0.3em;
                border-bottom: 2px solid #e5e7eb;
                font-weight: 600;
                line-height: 1.3;
                color: #1f2937;
            }
            .ai-summary-content h2 {
                font-size: 1.5em;
                margin: 1.3em 0 0.7em;
                padding-bottom: 0.2em;
                border-bottom: 1px solid #e5e7eb;
                font-weight: 600;
                line-height: 1.3;
                color: #1f2937;
            }
            .ai-summary-content h3 {
                font-size: 1.3em;
                margin: 1.2em 0 0.6em;
                font-weight: 600;
                line-height: 1.3;
                color: #1f2937;
            }
            .ai-summary-content p {
                margin: 1em 0;
                line-height: 1.8;
                color: inherit;
            }
            .ai-summary-content ul,
            .ai-summary-content ol {
                margin: 1em 0;
                padding-left: 2em;
                line-height: 1.6;
            }
            .ai-summary-content li {
                margin: 0.5em 0;
                line-height: inherit;
                color: inherit;
            }
            .ai-summary-content blockquote {
                margin: 1em 0;
                padding: 0.5em 1em;
                border-left: 4px solid #60a5fa;
                background: #f3f4f6;
                color: #4b5563;
                font-style: normal;
            }
            .ai-summary-content code {
                background: #f3f4f6;
                padding: 0.2em 0.4em;
                border-radius: 3px;
                font-family: Consolas, Monaco, "Courier New", monospace;
                font-size: 0.9em;
                color: #d946ef;
                white-space: pre-wrap;
            }
            .ai-summary-content pre {
                background: #1f2937;
                color: #e5e7eb;
                padding: 1em;
                border-radius: 6px;
                overflow-x: auto;
                margin: 1em 0;
                white-space: pre;
                word-wrap: normal;
            }
            .ai-summary-content pre code {
                background: none;
                color: inherit;
                padding: 0;
                border-radius: 0;
                font-size: inherit;
                white-space: pre;
            }
            .ai-summary-content table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
                font-size: inherit;
            }
            .ai-summary-content th,
            .ai-summary-content td {
                border: 1px solid #d1d5db;
                padding: 0.5em;
                text-align: left;
                color: inherit;
                background: none;
            }
            .ai-summary-content th {
                background: #f9fafb;
                font-weight: 600;
            }
            .ai-summary-footer {
                padding: 15px 20px;
                border-top: 1px solid #dee2e6;
                display: flex;
                /* flex-direction: column; /* 改为 row 以适应新的按钮样式 */
                /* justify-content: center; */
                justify-content: flex-end; /* 按钮靠右 */
                gap: 10px;
                align-items: center; /* 垂直居中 */
                position: sticky;
                bottom: 0;
                background: #f0f2f4;
                z-index: 1;
            }

            /* SVG图标的样式保持不变，因为 .ai-btn-icon 会处理图标大小 */
            .ai-download-btn svg, /* 这些类名可能需要调整或与 .ai-btn-icon 结合 */
            .ai-retry-btn svg,
            .ai-copy-btn svg,
            .ai-settings-btn svg {
                width: 16px; /* .ai-btn-icon 中定义为 20px，如果想用16px需要覆盖或调整 .ai-btn-icon */
                height: 16px;
            }
            .ai-loading {
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-family: "Microsoft Yahei", "PingFang SC", "HanHei SC", sans-serif;
            }
            .ai-loading-dots:after {
                content: '.';
                animation: dots 1.5s steps(5, end) infinite;
            }
            @keyframes dots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60% { content: '...'; }
                80%, 100% { content: ''; }
            }
            .thinking-cursor {
                animation: blink 1s step-end infinite;
                font-weight: bold;
                margin-left: 2px;
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }

            /* 优化移动端响应式布局 */
            @media (max-width: 768px) {
                .ai-settings-panel,
                .ai-summary-modal {
                    width: 95%;
                    max-height: 90vh;
                }
                .ai-summary-footer {
                    flex-wrap: wrap; /* 允许按钮换行 */
                    gap: 8px;
                }
                .ai-summary-container {
                    bottom: 10px;
                    right: 10px;
                }
            }
            .ai-summary-modal,
            .ai-summary-overlay,
            .ai-settings-panel {
                transition: opacity 0.2s ease-in-out;
            }
            /* .buttons button:active { ... }  这个是设置面板的，后面处理 */

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            .ai-summary-header,
            .ai-summary-footer,
            .ai-summary-close,
            /* ai-download-btn, (这个类名在HTML里是按钮，会被新类替换) */
            .ai-settings-btn, /* 同上 */
            .ai-retry-btn,    /* 同上 */
            .ai-copy-btn {   /* 同上 */
                user-select: none;
            }
            /* --- 原有样式结束 --- */

            /* --- 全局滚动条样式 --- */
            ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            ::-webkit-scrollbar-track {
                background: transparent; /* 改为透明以避免破坏圆角 */
                border-radius: 10px;
            }
            ::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 10px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
        `;

        const container = document.createElement('div');
        container.className = 'ai-summary-container ai-summary-hidden-initially';
        container.innerHTML = `
            <div class="ai-hover-wrapper">
                <div class="ai-actions-container">
                    <button class="ai-template-btn" title="打开面板">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                    </button>
                    <button class="ai-settings-btn-float" title="打开设置">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    </button>
                    <div class="ai-model-btn-container">
                        <button class="ai-model-btn" title="选择模型">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        </button>
                        <div class="ai-model-list ai-actions-list"></div>
                    </div>
                    <div class="ai-prompt-btn-container">
                        <button class="ai-prompt-btn" title="选择提示词">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                        <div class="ai-prompt-list ai-actions-list"></div>
                    </div>
                </div>
                <button class="ai-summary-btn">AI</button>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'ai-summary-modal';
        modal.innerHTML = `
            <div class="ai-summary-header">
                <div class="modal-title-group" style="display: flex; align-items: center; gap: 10px; flex-grow: 1; justify-content: flex-start;">
                    <h3 style="margin-right: auto;">网页内容总结</h3>
                    <div class="modal-selectors" style="display: flex; align-items: center; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label for="ai-prompt-select-modal" style="font-size: 14px; color: #495057; font-weight: 600;">模型 </label>
                            <select id="ai-model-select-modal" class="ai-model-select-modal" title="选择当前对话使用的模型" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 13px; max-width: 150px;"></select>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label for="ai-prompt-select-modal" style="font-size: 14px; color: #495057; font-weight: 600;">提示词 </label>
                            <select id="ai-prompt-select-modal" class="ai-prompt-select-modal" title="选择当前对话使用的提示词" style="flex-grow: 1; padding: 6px 10px; border-radius: 4px; border: 1px solid #ccc; font-size: 13px;"></select>
                        </div>
                    </div>
                </div>
                <button class="ai-summary-close ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div class="ai-summary-content"></div>
            <div class="ai-summary-footer">
                <div class="footer-buttons-container" style="display: flex; justify-content: flex-end; gap: 10px; width: 100%;">
                    <button class="ai-settings-btn ai-btn ai-btn-icon" title="打开设置">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button class="ai-retry-btn ai-btn ai-btn-icon" title="重新总结">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 11-2.3-6M21 3v6h-6"></path>
                        </svg>
                    </button>
                    <button class="ai-download-btn ai-btn ai-btn-secondary" title="下载总结">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>下载</span>
                    </button>
                    <button class="ai-copy-btn ai-btn ai-btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>复制</span>
                    </button>
                </div>
            </div>
        `;

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

    function getFullEndpoint(baseUrl) {
        if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
            console.error("Base URL is not configured or invalid.");
            return null;
        }
        const trimmedBaseUrl = baseUrl.trim();
        if (trimmedBaseUrl.includes('#')) {
            return trimmedBaseUrl.replace('#', '');
        } else if (trimmedBaseUrl.endsWith('/')) {
            return trimmedBaseUrl + 'v1/chat/completions';
        } else {
            return trimmedBaseUrl + '/v1/chat/completions';
        }
    }

    function getPageContent() {
        const title = document.title;
        const content = document.body.innerText;
        return { title, content };
    }

    async function fetchModels() {
        if (!CONFIG.BASE_URL) {
            console.error("BASE_URL is not configured. Cannot fetch models.");
            throw new Error('BASE_URL 未配置，无法获取模型列表');
        }
        if (!CONFIG.API_KEY) {
            console.error('API Key is not configured. Cannot fetch models.');
            throw new Error('API Key未配置，无法获取模型列表');
        }

    let chatCompletionsUrl = getFullEndpoint(CONFIG.BASE_URL);
    if (!chatCompletionsUrl) {
        throw new Error('无法构造有效的API端点路径 (Base URL可能配置错误)');
    }

    const endpoint = chatCompletionsUrl.replace('/v1/chat/completions', '/v1/models');

    try {
        const response = await GM.xmlHttpRequest({
            method: 'GET',
            url: endpoint,
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        if (response.status === 200) {
            const responseData = JSON.parse(response.responseText);
            if (responseData.data && Array.isArray(responseData.data)) {
            return responseData.data.filter(m => m.id && typeof m.id === 'string');
            } else if (Array.isArray(responseData) && responseData.every(item => item && typeof item.id === 'string')) {
                return responseData.filter(m => m.id && typeof m.id === 'string');
            }
            else {
                console.error('模型加载失败: 响应数据格式不符合预期', responseData);
                throw new Error('API返回的模型列表数据格式不正确');
            }
            } else {
            let errorDetail = `HTTP状态码 ${response.status}: ${response.statusText}`;
            try {
                const errorResponse = JSON.parse(response.responseText);
                if (errorResponse.error && errorResponse.error.message) {
                errorDetail = `API错误 (${response.status}): ${errorResponse.error.message}`;
                } else if (typeof errorResponse === 'string') {
                errorDetail = `API错误 (${response.status}): ${errorResponse}`;
                }
            } catch (parseError) {
                console.error('解析获取模型列表的错误响应失败:', parseError);
            }
            console.error('模型加载失败:', errorDetail);
            throw new Error(errorDetail);
        }
    } catch (error) {
        console.error('Detailed fetch error:', {
            message: error.message,
            stack: error.stack,
            config: {
                BASE_URL: CONFIG.BASE_URL,
                endpoint: endpoint
            }
        });
        throw error;
    }
    }

    function showError(container, error, details = '') {
        container.innerHTML = `
            <div class="ai-summary-error" style="color: red;">
                <strong>错误：</strong> ${error}
            </div>
            ${details ? `<div class="ai-summary-debug">${details}</div>` : ''}
        `;
    }

    function showToastNotification(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.75); /* 稍微加深背景以便更清晰 */
            color: white;
            padding: 12px 22px; /* 稍微增大内边距 */
            border-radius: 6px; /* 稍微增大圆角 */
            z-index: 100005; /* 比其他模态框更高 */
            opacity: 0;
            transition: opacity 0.4s ease-in-out, bottom 0.4s ease-in-out; /* 动画更平滑 */
            font-family: "Microsoft Yahei", "PingFang SC", "HanHei SC", sans-serif;
            font-size: 14px;
            box-shadow: 0 3px 12px rgba(0,0,0,0.25); /* 增加阴影效果 */
            text-align: center;
            max-width: 80%; /* 防止提示过宽 */
        `;

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

    let originalMarkdownText = '';

    // 调用AI API对给定的内容进行总结。使用流式响应逐步更新总结模态框的内容
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
                const xhr = GM.xmlHttpRequest({
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

        initializeDrag(container, dragHandle, button, actionsContainer); // Pass more elements

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
                const subMenuWasVisible = hideSubMenus(); // 先调用收起子菜单
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
            const _ = listElement.offsetHeight;

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
                contentContainer.innerHTML = '<p style="text-align:center; color:#6c757d;">点击 "AI" 按钮开始总结，或在下方选择不同功能。</p>';
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
            const originalButtonText = button.textContent;
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
                // 检查浏览器是否支持clipboard API
                if (!navigator.clipboard) {
                    console.warn('AI_WebSummary: Clipboard API not supported, falling back to execCommand');
                    try {
                        const textArea = document.createElement('textarea');
                        textArea.value = originalMarkdownText;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);

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
                        console.log('AI_WebSummary: Copy completed using execCommand');
                    } catch (error) {
                        console.error('AI_WebSummary: Copy failed with execCommand', error);
                        showToastNotification('复制失败，请手动复制内容。');
                    }
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
                if (settingsPanel.style.display === 'block') {
                    settingsPanel.style.display = 'none';
                    settingsOverlay.style.display = 'none';
                }
                if (modal.style.display === 'block') {
                    hideModal(modal, overlay);
                }
            }
        });

        initializeSettingsEvents(settingsPanel, modal, settingsOverlay, modelSelectionModal, shadow, elements); // 传递 elements
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

            const renderTagsFunc = settingsPanel.querySelector('#model-tags-container').renderModelTags;
            if (typeof renderTagsFunc === 'function') {
            renderTagsFunc();
            }
            if (settingsPanel && typeof settingsPanel.setDirtyStatus === 'function') {
                settingsPanel.setDirtyStatus(true);
            } else {
                console.warn("setDirtyStatus function not found on settingsPanel from 'save-selected-models' event.");
            }

            modelSelectionModal.style.display = 'none';
            showToastNotification('模型列表已保存！');
        });
    }

    //  判断用户按下的组合键是否与配置的快捷键匹配。
    function isShortcutPressed(event, shortcut) {
        const keys = shortcut.split('+');
        let ctrl = false, alt = false, shift = false, meta = false, key = null;

        keys.forEach(k => {
            const lower = k.toLowerCase();
            if (lower === 'ctrl') ctrl = true;
            // 将 Option 键映射到 Alt 键，因为在 Mac 中 Option 键触发的是 altKey
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
        modal.style.display = 'block';
        overlay.style.display = 'block';
    }

    function hideModal(modal, overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    function savePosition(container) {
        const position = {
            left: container.style.left,
            top: container.style.top,
        };
        GM_setValue('containerPosition', position);
    }

    function loadPosition(container) {
        const savedPosition = GM_getValue('containerPosition');
        if (savedPosition && savedPosition.left && savedPosition.top) {
            container.style.left = savedPosition.left;
            container.style.top = savedPosition.top;
        } else {
            // Default position if none is saved, use pixels to avoid calc() issues
            container.style.left = `${window.innerWidth - 60}px`;
            container.style.top = `${window.innerHeight - 100}px`;
        }
    }

    function initializeDrag(container, dragHandle, button, actionsContainer) {
        let isDragging = false;
        let offsetX, offsetY;
        let animationFrameId = null;

        const startDragTransition = () => container.style.transition = 'none';
        const endDragTransition = () => container.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';

        // 核心函数：智能贴边
        const snapToEdge = () => {
            endDragTransition();
            if (isDragging) return;

            const rect = container.getBoundingClientRect();
            const buttonRect = button.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const PEEK_MARGIN = 10;
            const isSnappedLeft = (rect.left + rect.width / 2) < windowWidth / 2;

            container.classList.toggle('snap-left', isSnappedLeft);
            container.classList.toggle('snap-right', !isSnappedLeft);

            requestAnimationFrame(() => {
                if (container.classList.contains('is-expanded')) {
                    let targetLeft = rect.left;
                    if (rect.left < PEEK_MARGIN) {
                        targetLeft = PEEK_MARGIN;
                    } else if (rect.right > windowWidth - PEEK_MARGIN) {
                        targetLeft = windowWidth - rect.width - PEEK_MARGIN;
                    }
                    container.style.left = `${targetLeft}px`;
                } else {
                    if (isSnappedLeft) {
                        container.style.left = `0px`;
                    } else {
                        container.style.left = `${windowWidth - buttonRect.width - 15}px`; // 留出15px以避免遮挡滚动条
                    }
                }
                savePosition(container);
            });

            // 在第一次贴边动画完成后移除初始隐藏类
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
                snapToEdge();
            }
        });

        // On window load, restore the button to its last saved position.
        window.addEventListener('load', () => {
            // Load the last saved position for the container.
            loadPosition(container);

            // After loading the position, determine if it's on the left or right side of the
            // screen and apply the corresponding class. This ensures the hover-in/out
            // animations work correctly from the restored position without overriding it.
            const rect = container.getBoundingClientRect();
            const isSnappedLeft = (rect.left + rect.width / 2) < window.innerWidth / 2;
            container.classList.toggle('snap-left', isSnappedLeft);
            container.classList.toggle('snap-right', !isSnappedLeft);

            // Apply transition effects and make the button visible.
            endDragTransition();
            requestAnimationFrame(() => {
                if (container.classList.contains('ai-summary-hidden-initially')) {
                    container.classList.remove('ai-summary-hidden-initially');
                }
            });
        });

        window.addEventListener('resize', () => setTimeout(snapToEdge, 100));

    }

    let globalElements = {}; // 全局变量，用于存储脚本创建的主要UI元素的引用

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();
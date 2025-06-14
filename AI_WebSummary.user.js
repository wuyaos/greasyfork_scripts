// ==UserScript==
// @name         AI网页内容总结(自用)
// @namespace    http://tampermonkey.net/
// @version      2.0.1
// @description  使用AI总结网页内容的油猴脚本，采用Shadow DOM隔离样式
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
 * v2.0.1 (2025-06-14)
 * - 修复多选删除/模型选择模态框字体对比度问题
 * - 优化设置面板状态同步机制
 * - 实现模型列表实时更新功能
 */

(function() {
    'use strict';

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
        CURRENT_PROMPT_IDENTIFIER: PROMPT_TEMPLATES[0].identifier, // 默认使用第一个预设模板的标识符
        SAVED_MODELS: ['gpt-4o-mini'] // 保存用户选择的模型列表
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
            SAVED_MODELS: GM_getValue('SAVED_MODELS', DEFAULT_CONFIG.SAVED_MODELS)
        };
        // API_URL 相关逻辑已完全移除

        // 确保加载的标识符有效，如果无效则回退到默认值
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === CONFIG.CURRENT_PROMPT_IDENTIFIER);
        if (!selectedTemplate) {
            CONFIG.CURRENT_PROMPT_IDENTIFIER = DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER;
        }
        return CONFIG;
    }

    // 获取当前选中的提示词内容
    function getCurrentPromptContent() {
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === CONFIG.CURRENT_PROMPT_IDENTIFIER);
        if (selectedTemplate) {
            return selectedTemplate.content;
        }
        // 回退到默认值
        const defaultTemplate = PROMPT_TEMPLATES.find(t => t.identifier === DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER);
        return defaultTemplate ? defaultTemplate.content : "请用markdown格式全面总结以下网页内容，包含主要观点、关键信息和重要细节。总结需要完整、准确、有条理。"; // 最后的硬编码后备
    }

// 预定义的模型选项 - 将由API动态加载，这里保留一个自定义选项的标识
    let MODEL_OPTIONS = []; // 将在获取后填充
    const CUSTOM_MODEL_VALUE = "custom_model_input_value"; // 用于标识自定义输入
    // 保存配置 (简化版，不再处理 configName 和 saved_configs)
    function saveConfig(newConfig) {
        // 保存配置到 GM storage
        Object.keys(newConfig).forEach(key => {
            // PROMPT 和 CURRENT_PROMPT_IDENTIFIER 由专门的逻辑处理，这里不直接覆盖
            // 其他如 BASE_URL, API_KEY, MAX_TOKENS, SHORTCUT, MODEL 可以直接保存
            if (key !== 'PROMPT' && key !== 'CURRENT_PROMPT_IDENTIFIER') {
                 GM_setValue(key, newConfig[key]);
            }
        });

        // 更新内存中的配置
        CONFIG = {
            ...CONFIG,
            ...newConfig
        };
    }

    // 更新提示词选择器 (原 updateConfigSelectors)
    // 更新所有提示词选择器
    function updateAllPromptSelectors() {
        const currentIdentifier = CONFIG.CURRENT_PROMPT_IDENTIFIER || PROMPT_TEMPLATES[0].identifier;
        const optionsHTML = PROMPT_TEMPLATES.map(template =>
            `<option value="${template.identifier}" ${template.identifier === currentIdentifier ? 'selected' : ''}>${template.title}</option>`
        ).join('');

        // 更新主界面选择器
        const mainSelector = elements.shadow.querySelector('.ai-main-prompt-selector');
        if (mainSelector) mainSelector.innerHTML = optionsHTML;

        // 更新模态框选择器
        const modalSelector = elements.shadow.querySelector('#ai-prompt-select-modal');
        if (modalSelector) modalSelector.innerHTML = optionsHTML;

        // 更新设置面板选择器
        const settingsSelector = elements.settingsPanel.querySelector('#config-select');
        if (settingsSelector) settingsSelector.innerHTML = PROMPT_TEMPLATES.map(template =>
            `<option value="${template.identifier}" ${template.identifier === currentIdentifier ? 'selected' : ''}>${template.title} (预设)</option>`
        ).join(''); // 设置面板的选项格式稍有不同

         // 更新设置面板中的文本区域
        const promptTextarea = elements.settingsPanel.querySelector('#prompt');
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === currentIdentifier);
        if (promptTextarea && selectedTemplate) {
            promptTextarea.value = selectedTemplate.content;
        }
    }

    // 修改设置面板的事件处理
    function initializeSettingsEvents(panel, modal, settingsOverlay, modelSelectionModal, shadow) {
        panel.setDirtyStatus = setDirtyStatus; // Attach setDirtyStatus to the panel object
        const saveBtn = panel.querySelector('.save-btn');
        const cancelBtn = panel.querySelector('.cancel-btn');
        let isDirty = false;
        let settingsSnapshot = {}; // To store state when panel opens
        let isSaving = false; // 新增：保存状态标志，防止保存时触发dirty

        // Helper to update dirty status and provide visual feedback
        function setDirtyStatus(dirty) {
            isDirty = dirty;
            saveBtn.textContent = dirty ? '保存*' : '保存';
            if (dirty) {
                saveBtn.style.cssText = 'background: #e67e22 !important;';
            } else {
                saveBtn.style.cssText = 'background: #617043cc !important;';
            }
        }

        // Function to take a snapshot of current settings
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

        // Function to restore settings from snapshot
        function restoreSettingsFromSnapshot() {
            panel.querySelector('#base-url').value = settingsSnapshot.baseURL;
            panel.querySelector('#api-key').value = settingsSnapshot.apiKey;
            panel.querySelector('#max-tokens').value = settingsSnapshot.maxTokens;
            panel.querySelector('#shortcut').value = settingsSnapshot.shortcut;
            panel.querySelector('#config-select').value = settingsSnapshot.promptIdentifier;

            // This will trigger the change event to update the textarea
            const promptChangeEvent = new Event('change');
            panel.querySelector('#config-select').dispatchEvent(promptChangeEvent);

            CONFIG.MODEL = settingsSnapshot.model;
            CONFIG.SAVED_MODELS = [...settingsSnapshot.savedModels];
            renderModelTags(); // Re-render tags to reflect restored state
        }

        // Attach snapshot function to the panel element to make it accessible from outside
        panel.takeSettingsSnapshot = takeSettingsSnapshot;

        // Attach snapshot function to the panel element to make it accessible from outside
        panel.takeSettingsSnapshot = takeSettingsSnapshot;

        // Function to handle closing the settings panel
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

        const promptSelect = panel.querySelector('#config-select');
        const shortcutInput = panel.querySelector('#shortcut');
        const customModelBtn = panel.querySelector('#custom-model-btn');
        const fetchModelsBtn = panel.querySelector('#fetch-model-btn');
        const modelTagsContainer = panel.querySelector('#model-tags-container');
        let availableModels = [];

        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        shortcutInput.placeholder = isMac ?
            '例如: Option+S, ⌘+Shift+Y' :
            '例如: Alt+S, Ctrl+Shift+Y';

        saveBtn.textContent = '保存';

        // Add event listeners to detect changes
        panel.querySelector('#base-url').addEventListener('input', () => setDirtyStatus(true));
        panel.querySelector('#api-key').addEventListener('input', () => setDirtyStatus(true));
        panel.querySelector('#max-tokens').addEventListener('input', () => setDirtyStatus(true));
        shortcutInput.addEventListener('input', () => setDirtyStatus(true));

        // 提示词选择变更事件
        promptSelect.addEventListener('change', (e) => {
            if (!isSaving) { // 新增条件：不在保存状态时才设置dirty
                setDirtyStatus(true);
            }
            const selectedIdentifier = e.target.value;
            const promptTextarea = panel.querySelector('#prompt');
            const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === selectedIdentifier);
            if (selectedTemplate) {
                promptTextarea.value = selectedTemplate.content;
                CONFIG.CURRENT_PROMPT_IDENTIFIER = selectedTemplate.identifier;
            } else {
                // Fallback to default if something goes wrong
                const defaultTemplate = PROMPT_TEMPLATES.find(t => t.identifier === DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER);
                promptTextarea.value = defaultTemplate.content;
                CONFIG.CURRENT_PROMPT_IDENTIFIER = DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER;
            }
        });

        // --- 新的模型管理逻辑 ---

        // 渲染模型标签
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

                // 点击选择模型
                tag.addEventListener('click', () => {
                    if (CONFIG.MODEL !== modelId) {
                        CONFIG.MODEL = modelId;
                        renderModelTags(); // 重新渲染以更新选中状态
                        setDirtyStatus(true);
                    }
                });

                // 创建删除按钮
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.title = '删除此模型';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 防止触发标签的点击事件
                    if (confirm(`确定要删除模型 "${modelId}" 吗？`)) {
                        CONFIG.SAVED_MODELS = CONFIG.SAVED_MODELS.filter(m => m !== modelId);
                        // 如果删除的是当前选中的模型，则选择第一个
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

        // 初始化时渲染标签
        renderModelTags();
        // 将渲染函数附加到元素上，以便在其他地方调用
        modelTagsContainer.renderModelTags = renderModelTags;

        // 点击空白处进行多选删除
        modelTagsContainer.addEventListener('click', (e) => {
            if (e.target === modelTagsContainer) {
                showMultiDeleteModal();
            }
        });

        function showMultiDeleteModal() {
            const multiDeleteModal = document.createElement('div');
            multiDeleteModal.className = 'ai-modal';
            multiDeleteModal.style.cssText = 'display: block; z-index: 100003;';

            const overlay = document.createElement('div');
            overlay.className = 'ai-settings-overlay';
            overlay.style.cssText = 'display: block; z-index: 100002;';

            const modelsHTML = CONFIG.SAVED_MODELS.map(modelId => `
                <div class="model-item" style="cursor: pointer; padding: 10px; border-radius: 4px; display: flex; align-items: center;">
                    <input type="checkbox" value="${modelId}" id="multi-delete-chk-${modelId}" style="margin-right: 10px; cursor: pointer;">
                    <label for="multi-delete-chk-${modelId}" style="cursor: pointer; flex-grow: 1; color: #333333;">${modelId}</label>
                </div>
            `).join('');

            multiDeleteModal.innerHTML = `
                <div class="modal-header">
                    <h3>批量删除模型</h3>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-content" style="max-height: 50vh; overflow-y: auto;">
                    ${modelsHTML}
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
                     <button class="modal-action-btn cancel-btn" style="background:rgb(131, 194, 217); color: white;">取消</button>
                    <button class="modal-action-btn delete-selected-btn" style="background: #dc3545; color: white;">删除</button>
                </div>
            `;

            // Add custom styles for the new button
            const style = document.createElement('style');
            style.textContent = `
                .delete-selected-btn {
                    padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;
                    font-size: 14px; font-weight: bold; transition: background 0.3s;
                }
                .delete-selected-btn:hover { background: #c82333 !important; }
                .cancel-btn {
                    padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;
                    font-size: 14px; font-weight: bold; transition: background 0.3s;
                }
                .cancel-btn:hover { background: #5bc0de !important; }
            `;
            multiDeleteModal.appendChild(style);

            shadow.appendChild(overlay);
            shadow.appendChild(multiDeleteModal);

            const closeModal = () => {
                shadow.removeChild(multiDeleteModal);
                shadow.removeChild(overlay);
            };

            multiDeleteModal.querySelector('.close-modal').addEventListener('click', closeModal);
            multiDeleteModal.querySelector('.cancel-btn').addEventListener('click', closeModal);
            overlay.addEventListener('click', closeModal);

            multiDeleteModal.querySelector('.delete-selected-btn').addEventListener('click', () => {
                const selectedForDeletion = [];
                multiDeleteModal.querySelectorAll('input[type="checkbox"]:checked').forEach(chk => {
                    selectedForDeletion.push(chk.value);
                });

                if (selectedForDeletion.length === 0) {
                    alert('请至少选择一个要删除的模型。');
                    return;
                }

                if (confirm(`确定要删除的 ${selectedForDeletion.length} 个模型吗？`)) {
                    CONFIG.SAVED_MODELS = CONFIG.SAVED_MODELS.filter(m => !selectedForDeletion.includes(m));
                    if (selectedForDeletion.includes(CONFIG.MODEL)) {
                        CONFIG.MODEL = CONFIG.SAVED_MODELS.length > 0 ? CONFIG.SAVED_MODELS[0] : '';
                    }
                    renderModelTags();
                    setDirtyStatus(true);
                    closeModal();
                }
            });
        }

        // “使用自定义模型”按钮
        customModelBtn.addEventListener('click', () => {
            const newModelsInput = prompt('请输入要添加的自定义模型名称（多个模型请用英文逗号,隔开）：');
            if (newModelsInput && newModelsInput.trim()) {
                const newModels = newModelsInput.trim().split(',').map(m => m.trim()).filter(m => m);
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
                    CONFIG.MODEL = lastAddedModel; // 选中最后一个添加的模型
                    renderModelTags();
                    setDirtyStatus(true);
                } else {
                    alert('所有输入的模型均已存在！');
                }
            }
        });

        // “获取模型”按钮
        let fetchedModelsCache = []; // Cache for models
        const searchInput = modelSelectionModal.querySelector('#model-search-input');
        const modelListContainer = modelSelectionModal.querySelector('#model-list-container');
        const descriptionArea = modelSelectionModal.querySelector('#model-description-area');

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
                div.innerHTML = `<input type="checkbox" value="${model.id}" id="model-checkbox-${model.id}" ${CONFIG.SAVED_MODELS.includes(model.id) ? 'checked' : ''}><label for="model-checkbox-${model.id}">${model.id}</label>`;
                modelListContainer.appendChild(div);

                div.addEventListener('mouseenter', () => {
                    const createdDate = model.created ? new Date(model.created * 1000).toLocaleString() : 'N/A';
                    const ownedBy = model.owned_by || 'N/A';
                    descriptionArea.innerHTML = `
                        <p style="margin:0; font-weight: bold;">${model.id}</p>
                    `;
                });
            });
        }

        searchInput.addEventListener('input', () => renderModelList(searchInput.value));

        fetchModelsBtn.addEventListener('click', async () => {
            modelListContainer.innerHTML = '<div class="ai-loading">正在获取模型列表...</div>';
            descriptionArea.innerHTML = `<p><i>将鼠标悬停在模型上以查看描述。</i></p>`;
            searchInput.value = '';
            modelSelectionModal.style.display = 'block';

            try {
                const rawModels = await fetchModels();
                fetchedModelsCache = rawModels.map(m => (typeof m === 'string' ? { id: m, created: 0, owned_by: 'unknown' } : m));
                renderModelList();
            } catch (error) {
                modelListContainer.innerHTML = `<p style="color: red; padding: 10px;">获取模型失败: ${error.message}</p>`;
            }
        });


        // 保存按钮
        saveBtn.addEventListener('click', () => {
            isSaving = true; // 新增：开始保存操作，设置标志
            let newShortcut = panel.querySelector('#shortcut').value.trim();
            newShortcut = newShortcut.replace(/Option\+/g, 'Alt+');
            if (!validateShortcut(newShortcut) && newShortcut !== "") {
                isSaving = false; // 新增：校验失败，重置标志
                alert(isMac ? '快捷键格式不正确。有效示例: Option+S, ⌘+Shift+Y' : '快捷键格式不正确。有效示例: Alt+S, Ctrl+Shift+Y');
                return;
            }

            const baseURLValue = panel.querySelector('#base-url').value.trim();
            if (!baseURLValue) {
                alert('Base URL 不能为空。');
                isSaving = false; // 新增：校验失败，重置标志
                return;
            }
            if (!baseURLValue.match(/^https?:\/\/.+/)) {
                alert('Base URL 格式不正确，应以 http:// 或 https:// 开头。');
                isSaving = false; // 新增：校验失败，重置标志
                return;
            }

            const apiKeyVaule = panel.querySelector('#api-key').value.trim();
            if (!apiKeyVaule) {
                alert('API Key 不能为空。');
                isSaving = false; // 新增：校验失败，重置标志
                return;
            }

            const maxTokensValue = panel.querySelector('#max-tokens').value.trim();
            const maxTokensParsed = parseInt(maxTokensValue);
            if (maxTokensValue === "" || isNaN(maxTokensParsed) || maxTokensParsed <= 0) {
                alert('最大Token数必须是一个大于0的有效数字。');
                isSaving = false; // 新增：校验失败，重置标志
                return;
            }
            if (maxTokensParsed > 100000) {
                alert('最大Token数设置过大，可能导致请求失败或费用过高。请设置一个合理的值。');
            }

            // modelValue 现在直接从 CONFIG.MODEL 获取，该值由标签点击实时更新
            if (!CONFIG.MODEL) {
                alert('请至少选择或添加一个模型。');
                isSaving = false; // 新增：校验失败，重置标志
                return;
            }

            CONFIG.BASE_URL = baseURLValue;
            CONFIG.API_KEY = apiKeyVaule;
            CONFIG.MAX_TOKENS = maxTokensParsed;
            CONFIG.SHORTCUT = newShortcut || DEFAULT_CONFIG.SHORTCUT;
            // CONFIG.PROMPT is no longer used, identifier is the source of truth

            // 保存所有配置到 GM_storage
            GM_setValue('BASE_URL', CONFIG.BASE_URL);
            GM_setValue('API_KEY', CONFIG.API_KEY);
            GM_setValue('MAX_TOKENS', CONFIG.MAX_TOKENS);
            GM_setValue('SHORTCUT', CONFIG.SHORTCUT);
            GM_setValue('MODEL', CONFIG.MODEL);
            // GM_setValue('PROMPT', CONFIG.PROMPT); // PROMPT is no longer saved
            GM_setValue('CURRENT_PROMPT_IDENTIFIER', CONFIG.CURRENT_PROMPT_IDENTIFIER);
            GM_setValue('SAVED_MODELS', CONFIG.SAVED_MODELS);
            populateModalModelSelector(); // 刷新模态框模型选择器

            // 更新快照以反映已保存的更改，修复关闭时“未保存更改”的误报
            if (typeof panel.takeSettingsSnapshot === 'function') {
                panel.takeSettingsSnapshot();
            }
            setDirtyStatus(false); // 确保在面板隐藏前更新状态，并且在快照之后
            
            // 将 isSaving = false; 移到 setDirtyStatus(false) 之后
            // 确保在 isDirty 状态和UI完全更新为“干净”后，才允许其他事件更改 dirty 状态。
            isSaving = false;

            panel.style.display = 'none';
            settingsOverlay.style.display = 'none';
            alert('设置已应用！');
        });

        // Cancel button and overlay click
        cancelBtn.addEventListener('click', closeSettingsPanel);
        settingsOverlay.addEventListener('click', closeSettingsPanel);
    }

    // 创建设置面板
    function createSettingsPanel(shadow) {
        const panel = document.createElement('div');
        panel.className = 'ai-settings-panel';
        panel.innerHTML = `
            <h3>设置</h3>
            <div class="form-group">
                <label for="base-url">Base URL (例如: https://api.openai.com)</label>
                <input type="text" id="base-url" value="${CONFIG.BASE_URL || DEFAULT_CONFIG.BASE_URL}">
            </div>
            <div class="form-group">
                <label for="api-key">API Key</label>
                <input type="text" id="api-key" value="${CONFIG.API_KEY}">
            </div>
            <div class="form-group">
                <label for="model-tags-container">模型</label>
                <div class="model-tags-container" id="model-tags-container">
                    {/* 动态生成的模型标签将出现在这里 */}
                </div>
                <div class="model-actions">
                    <button id="custom-model-btn">自定义模型</button>
                    <button id="fetch-model-btn">获取模型</button>
                </div>
            </div>
            <div class="form-group">
                <label for="max-tokens">最大Token数</label>
                <input type="number" id="max-tokens" value="${CONFIG.MAX_TOKENS}">
            </div>
            <div class="form-group">
                <label for="shortcut">快捷键 (例如: Alt+S, Ctrl+Shift+Y)</label>
                <input type="text" id="shortcut" value="${CONFIG.SHORTCUT}">
            </div>
            <div class="form-group config-select-group">
                <label for="config-select">提示词选择</label>
                <select class="ai-config-select" id="config-select" title="选择一个预设提示词模板">
                    {/* 选项将由 updatePromptSelector 动态填充 */}
                </select>
            </div>
            <div class="form-group">
                <label for="prompt">总结提示词内容</label>
                <textarea id="prompt" readonly>${getCurrentPromptContent()}</textarea>
            </div>
            <div class="buttons">
                <button class="clear-cache-btn">重置</button>
                <button class="cancel-btn">关闭</button>
                <button class="save-btn">保存</button>
            </div>
        `;

        // 样式定义在Shadow DOM内部
        const style = document.createElement('style');
        style.textContent = `
            .ai-settings-panel {
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-sizing: border-box;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
                font-size: 15px;
                z-index: 100001;
            }
            .ai-settings-panel h3 {
                margin: 0 0 20px 0;
                padding-bottom: 10px;
                border-bottom: 1px solid #dee2e6;
                color: #495057;
                font-size: 18px;
                font-weight: 900;
            }
            .form-group {
                margin-bottom: 15px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                color: #495057;
                font-weight: 600;
            }
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
            .form-group input:focus,
            .form-group textarea:focus,
            .form-group select:focus {
                outline: none;
                border-color: #60a5fa;
                box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
            }
            .form-group textarea {
                height: 100px;
                resize: vertical;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
            }
            .form-group.config-select-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .form-group.config-select-group label {
                flex: 0 0 auto;
                margin-bottom: 0;
            }

            .form-group:not(.config-select-group) {
                display: block; /* 恢复其他form-group的默认布局 */
            }
            .buttons {
                display: flex;
                justify-content: space-around;
                gap: 10px;
                margin-top: 20px;
            }
            .buttons button {
                padding: 8px 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: background 0.3s;
                color: #fff;
            }
           .modal-action-btn {
               min-width: 100px;
               padding: 8px 16px;
           }
            .cancel-btn {
                background: #6c757d;
            }
            .cancel-btn:hover {
                background: #5a6268;
            }
            .clear-cache-btn {
                background: #b47474cc !important;
            }
            .clear-cache-btn:hover {
                background: #c82333 !important;
            }
            .ai-config-select {
                padding: 6px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                background: #fff;
                color: #495057;
                /* margin-right: 10px; */ /* 移除，因为提示词模板选择器已删除 */
                flex-grow: 1; /* 让提示词选择器占据可用空间 */
            }
            .save-as-group {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #dee2e6;
            }
            .delete-config-btn {
                background: #b47474cc !important;
            }
            .delete-config-btn:hover {
                background: #c82333 !important;
            }
            .save-as-input-group {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .save-as-input-group input {
                flex: 1;
            }
            .save-as-input-group button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                color: #fff;
            }
            .save-btn, .confirm-save-as-btn {
                background: #617043cc !important;
            }
            .save-btn:hover, .confirm-save-as-btn:hover {
                background: #218838 !important;
            }
            .cancel-save-as-btn {
                background: #6c757d;
            }
            .cancel-save-as-btn:hover {
                background: #5a6268;
            }
            .save-as-btn, .rename-config-btn {
                background: #647f96cc !important;
            }
            .save-as-btn:hover, .rename-config-btn:hover {
                background: #2980b9 !important;
            }
            /* .ai-prompt-template-select styling can be removed as the element is removed */
            .ai-modal {
                display: none;
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
                z-index: 100002;
                flex-direction: column;
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #dee2e6;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #495057; /* 确保字体颜色与背景有足够对比度, 与主总结模态框标题一致 */
            }
            .close-modal {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6c757d;
            }
            .modal-content {
                overflow-y: auto;
                flex-grow: 1;
                margin-bottom: 15px;
            }
            #model-list-container label {
                font-weight: normal;
                font-size: 14px;
                color: #333333; /* 确保列表项字体颜色与背景有足够对比度 */
            }
            #model-list-container .model-item {
                padding: 8px;
                border: 1px solid #eee;
                border-radius: 4px;
                display: flex;
                align-items: center;
                transition: background-color 0.2s;
                cursor: pointer;
            }
            #model-list-container .model-item:hover {
                background-color: #f0f8ff;
            }
            #model-list-container .model-item label {
                margin-left: 8px;
                cursor: pointer;
            }
            .modal-footer {
                border-top: 1px solid #dee2e6;
                padding-top: 15px;
                text-align: right;
            }
            #save-selected-models {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                color: #fff;
                background: #617043cc;
            }
            #save-selected-models:hover {
                background: #218838;
            }
            .form-group.config-select-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: nowrap;
            }
            .ai-config-select {
                flex-grow: 1;
            }
            .rename-input-group {
                display: none;
                gap: 10px;
                margin: 10px 0;
                padding: 10px 0;
                border-top: 1px solid #dee2e6;
            }

            .rename-input-group input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
            }

            .rename-input-group button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                color: #fff;
            }

            .rename-input-group .confirm-rename-btn {
                background: #617043cc;
            }

            .rename-input-group .confirm-rename-btn:hover {
                background: #218838;
            }

            .rename-input-group .cancel-rename-btn {
                background: #6c757d;
            }

            .rename-input-group .cancel-rename-btn:hover {
                background: #5a6268;
            }
.model-tags-container {
               display: flex;
               flex-wrap: wrap;
               gap: 8px;
               margin-bottom: 10px;
               padding: 8px;
               background-color: #f8f9fa;
               border: 1px solid #dee2e6;
               border-radius: 4px;
           }
           .model-tag {
               display: flex;
               align-items: center;
               background-color: #e9ecef;
               padding: 5px 10px;
               border-radius: 15px;
               font-size: 14px;
               color: #333;
               cursor: pointer;
               transition: background-color 0.2s;
           }
           .model-tag.selected {
               background-color: #60a5fa;
               color: white;
               font-weight: bold;
           }
           .model-tag .delete-btn {
               background: none;
               border: none;
               color: #888;
               font-size: 18px;
               margin-left: 8px;
               cursor: pointer;
               padding: 0;
               line-height: 1;
           }
            .model-tag.selected .delete-btn {
               color: white;
           }
           .model-tag .delete-btn:hover {
               color: #f00;
           }
           .model-actions {
               display: flex;
               gap: 10px;
               margin-top: 10px;
           }
           .model-actions button {
               padding: 8px 12px;
               border: 1px solid #ced4da;
               border-radius: 4px;
               background-color: #f8f9fa;
               color: #212529; /* 确保字体颜色有足够对比度 */
               cursor: pointer;
               font-size: 14px;
               transition: background-color 0.2s;
           }
           .model-actions button:hover {
               background-color: #e2e6ea;
           }
        `;

        // 创建新的覆盖层
        const settingsOverlay = document.createElement('div');
        settingsOverlay.className = 'ai-settings-overlay';
        settingsOverlay.style.display = 'none'; // 默认隐藏

        // 添加点击覆盖层关闭设置面板的事件
        // The overlay click is now handled inside initializeSettingsEvents

        // 定义样式
        const overlayStyle = document.createElement('style');
        overlayStyle.textContent = `
            .ai-settings-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 100000; /* 确保覆盖层在设置面板下方 */
            }
        `;
        shadow.appendChild(overlayStyle);
        shadow.appendChild(settingsOverlay);
        shadow.appendChild(panel);

        // 事件监听
        panel.querySelector('.save-btn').addEventListener('click', () => {
            const newShortcut = panel.querySelector('#shortcut').value.trim();
            if (!validateShortcut(newShortcut)) {
                alert('快捷键格式不正确，请使用例如 Alt+S, Ctrl+Shift+Y 的格式。');
                return;
            }

            const newConfig = {
                BASE_URL: panel.querySelector('#base-url').value.trim() || DEFAULT_CONFIG.BASE_URL, // 读取BASE_URL
                API_KEY: panel.querySelector('#api-key').value.trim(),
                MAX_TOKENS: parseInt(panel.querySelector('#max-tokens').value) || DEFAULT_CONFIG.MAX_TOKENS,
                SHORTCUT: newShortcut || DEFAULT_CONFIG.SHORTCUT,
                PROMPT: panel.querySelector('#prompt').value.trim() || DEFAULT_CONFIG.PROMPT,
                MODEL: (() => { // 从新的模型选择器获取值
                    if (customModelCheckbox.checked) {
                        return customModelInput.value.trim() || DEFAULT_CONFIG.MODEL;
                    }
                    const selectedRadioButton = modelSelectContainer.querySelector('input[type="radio"]:checked');
                    return selectedRadioButton ? selectedRadioButton.value : DEFAULT_CONFIG.MODEL;
                })()
            };
            saveConfig(newConfig);
            panel.style.display = 'none';
            settingsOverlay.style.display = 'none';
        });

        // The cancel button click is now handled inside initializeSettingsEvents

        // 清除缓存按钮事件
        panel.querySelector('.clear-cache-btn').addEventListener('click', () => {
            const keysToClear = ['BASE_URL', 'API_KEY', 'MAX_TOKENS', 'SHORTCUT', 'MODEL', 'CURRENT_PROMPT_IDENTIFIER', 'SAVED_MODELS', 'saved_prompts'];
            // 移除了对 API_URL 的引用，因为它已不再使用
            keysToClear.forEach(key => GM_setValue(key, undefined)); // 使用 undefined 来模拟删除或重置

            // 重置为默认配置
            CONFIG = { ...DEFAULT_CONFIG };
            // 确保将CONFIG中的默认值也写入GM_storage，以便下次加载时正确
            GM_setValue('BASE_URL', CONFIG.BASE_URL);
            // GM_setValue('API_URL', CONFIG.API_URL); // API_URL 不再使用
            GM_setValue('API_KEY', CONFIG.API_KEY);
            GM_setValue('MAX_TOKENS', CONFIG.MAX_TOKENS);
            GM_setValue('SHORTCUT', CONFIG.SHORTCUT);
            // GM_setValue('PROMPT', CONFIG.PROMPT); // PROMPT is no longer saved
            GM_setValue('MODEL', CONFIG.MODEL);
            GM_setValue('CURRENT_PROMPT_IDENTIFIER', CONFIG.CURRENT_PROMPT_IDENTIFIER);
            GM_setValue('SAVED_MODELS', CONFIG.SAVED_MODELS);
            GM_setValue('saved_prompts', {}); // 清空已保存的提示词

            // 更新输入框的值
            panel.querySelector('#base-url').value = CONFIG.BASE_URL;
            // panel.querySelector('#api-url').value = CONFIG.API_URL; // #api-url 输入框已不存在
            panel.querySelector('#api-key').value = CONFIG.API_KEY;
            panel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
            panel.querySelector('#shortcut').value = CONFIG.SHORTCUT;
            panel.querySelector('#prompt').value = getCurrentPromptContent();

            // 更新提示词选择器以反映清空状态
            updateAllPromptSelectors();

            // 更新新模型选择UI以反映当前CONFIG
            const customModelCheckbox = panel.querySelector('#custom-model-checkbox');
            const customModelInput = panel.querySelector('#custom-model-input');
            const modelSelectContainer = panel.querySelector('#model-select-container');
            // 假设 availableModels 变量在此处仍然可访问，如果不可访问，则需要重新获取或从MODEL_OPTIONS构建
            // 此处简化为，如果MODEL_OPTIONS有内容，则用它来填充
            const modelsForPopulation = MODEL_OPTIONS && MODEL_OPTIONS.length > 0 ? MODEL_OPTIONS.map(m => m.value) : [];

            if (modelsForPopulation.includes(CONFIG.MODEL)) {
                customModelCheckbox.checked = false;
                customModelInput.style.display = 'none';
                customModelInput.value = '';
            } else {
                customModelCheckbox.checked = true;
                customModelInput.style.display = 'block';
                customModelInput.value = CONFIG.MODEL;
            }
            // 此处的 populateModelCheckboxes 需要在 initializeSettingsEvents 中定义并传入
            // 暂时依赖 initializeSettingsEvents 中的 populateModelCheckboxes 函数能够正确处理
            // 为了安全，最好确保 populateModelCheckboxes 在这里被调用
             if (typeof populateSavedModelSelector === "function") {
                 populateSavedModelSelector(panel, CONFIG.SAVED_MODELS, CONFIG.MODEL);
             } else {
                 // Fallback or error, e.g., manually clear and set default
                 modelSelectContainer.innerHTML = ''; // 清空
                 // 可能需要更复杂的逻辑来重新构建单选按钮
             }


            alert('缓存已清除，已重置');
        });

        // 移除旧的 promptTemplateSelect 事件监听器，因为该元素已被移除
        // const promptTemplateSelect = panel.querySelector('#prompt-template-select');
        // const promptTextarea = panel.querySelector('#prompt');

        // if (promptTemplateSelect) { // Defensive check
        //     promptTemplateSelect.addEventListener('change', (e) => {
        //         const selectedTemplate = PROMPT_TEMPLATES.find(t => t.title === e.target.value);
        //         if (selectedTemplate) {
        //             promptTextarea.value = selectedTemplate.content;
        //         }
        //     });
        // }

        shadow.appendChild(style);

        const modelSelectionModal = document.createElement('div');
        modelSelectionModal.id = 'model-selection-modal';
        modelSelectionModal.className = 'ai-modal';
        modelSelectionModal.innerHTML = `
            <div class="modal-header">
                <h3>选择模型</h3>
                <button class="close-modal">×</button>
            </div>
            <div class="modal-content">
                <input type="text" id="model-search-input" placeholder="搜索模型..." style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                <div id="model-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 40vh; overflow-y: auto;"></div>
                <div id="model-description-area" style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; min-height: 50px; border: 1px solid #e9ecef; color: #333333;">
                    <p><i>将鼠标悬停在模型上以查看描述。</i></p>
                </div>
            </div>
            <div class="modal-footer">
                <button id="save-selected-models">保存</button>
            </div>
        `;
        shadow.appendChild(modelSelectionModal);

        return { panel, overlay: settingsOverlay, modelSelectionModal };
    }

    // 快捷键验证
    function validateShortcut(shortcut) {
        // 更新正则表达式以支持 Option 键
        const regex = /^((Ctrl|Alt|Shift|Meta|Option)\+)*[A-Za-z]$/;
        return regex.test(shortcut);
    }

    // 创建DOM元素并使用 Shadow DOM
    function createElements() {
        // 创建根容器
        const rootContainer = document.createElement('div');
        rootContainer.id = 'ai-summary-root';

        // 附加 Shadow DOM
        const shadow = rootContainer.attachShadow({ mode: 'open' });

        // 创建样式和结构
        const style = document.createElement('style');
        style.textContent = `
            .ai-summary-container {
                position: fixed; /* Draggable, left/top will be set dynamically */
                /* bottom: 20px; */ /* Removed to allow top/left positioning */
                /* right: 20px; */ /* Removed to allow top/left positioning */
                /* Initial position will be handled by loadPosition or default to top/left 0,0 */
                display: flex;
                align-items: center;
                z-index: 99990;
                user-select: none;
                /* align-items: stretch; */ /* Removed for vertical layout */
                flex-direction: column; /* New: for vertical layout */
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                /* height: 30px; */ /* Removed for auto height */
                background-color: rgba(75, 85, 99, 0.8);
                border-radius: 5px;
                overflow: hidden; /* 防止子元素溢出圆角 */
            }
            .ai-drag-handle {
                width: 15px;
                height: 100%;
                background-color: rgba(75, 85, 99, 0.5);
                border-radius: 5px;
                cursor: move;
                margin-right: 1px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ai-drag-handle::before {
                content: "⋮";
                color: #f3f4f6;
                font-size: 16px;
                transform: rotate(90deg);
            }
            .ai-summary-btn, .ai-template-btn {
                padding: 5px 15px;
                background-color: rgba(75, 85, 99, 0.8);
                color: #f3f4f6;
                border: none;
                border-top: 1px solid rgba(107, 114, 128, 0.5);
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s;
                height: 30px;
                line-height: 1;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
                width: 100%;
                border-radius: 0; /*  Ensure no radius between buttons */
            }
            .ai-template-btn {
                border-radius: 0 0 4px 4px;
            }
            .ai-summary-btn:hover {
                background-color: rgba(75, 85, 99, 0.9);
            }
            .ai-main-prompt-selector {
                height: 30px;
                background-color: rgba(75, 85, 99, 0.8);
                color: #f3f4f6;
                border: none;
                border-radius: 4px 4px 0 0;
                padding: 0 5px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.3s;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
                width: 100%;
                text-align: center;
                border-bottom: 1px solid rgba(107, 114, 128, 0.5); /* Add border to connect with button */
            }
            .ai-main-prompt-selector:hover {
                background-color: rgba(75, 85, 99, 0.9);
            }
            .ai-main-prompt-selector option {
                background: #374151;
                color: #f3f4f6;
            }
            .ai-summary-btn:active {
                transform: scale(0.95);
                transition: transform 0.1s;
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
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
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
            .ai-summary-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #6c757d;
                padding: 0 5px;
                line-height: 1;
                font-family: inherit;
            }
            .ai-summary-close:hover {
                color: #495057;
            }
            .ai-summary-content {
                user-select: text;
                padding: 20px;
                overflow-y: auto;
                max-height: calc(80vh - 130px);
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
                flex-direction: column;
                justify-content: center;
                gap: 10px;
                align-items: stretch;
                position: sticky;
                bottom: 0;
                background: #f0f2f4;
                z-index: 1;
            }
            .ai-summary-footer button {
                padding: 8px 16px;
                background: #6c757d;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: background 0.3s;
                font-size: 14px;
                line-height: 1;
                font-family: inherit;
            }
            .ai-summary-footer button:hover {
                background: #5a6268;
            }
            .ai-download-btn svg,
            .ai-retry-btn svg,
            .ai-copy-btn svg,
            .ai-settings-btn svg {
                width: 20px;
                height: 20px;
            }
            .ai-loading {
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-family: inherit;
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
            .ai-download-btn,
            .ai-summary-btn,
            .ai-retry-btn,
            .ai-copy-btn,
            .ai-settings-btn {
                z-index: 99991;
                position: relative;
            }
            /* 优化移动端响应式布局 */
            @media (max-width: 768px) {
                .ai-settings-panel,
                .ai-summary-modal {
                    width: 95%;
                    max-height: 90vh;
                }
                .ai-summary-footer {
                    flex-wrap: wrap;
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
            .buttons button:active {
                transform: translateY(1px);
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            .ai-summary-header,
            .ai-summary-footer,
            .ai-summary-close,
            ai-download-btn,
            .ai-settings-btn,
            .ai-retry-btn,
            .ai-copy-btn {
                user-select: none;
            }
        `;

        // 创建按钮和拖动把手
        const container = document.createElement('div');
        container.className = 'ai-summary-container';
        container.innerHTML = `
            <div class="ai-drag-handle"></div>
            <select class="ai-main-prompt-selector" title="选择提示词"></select>
            <button class="ai-summary-btn">总结网页</button>
            <button class="ai-template-btn">打开面板</button>
        `;

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'ai-summary-modal';
        modal.innerHTML = `
            <div class="ai-summary-header">
                <div class="modal-title-group" style="display: flex; align-items: center; gap: 10px; flex-grow: 1; justify-content: flex-start;">
                    <h3 style="margin-right: auto;">网页内容总结</h3>
                    <div class="modal-selectors" style="display: flex; align-items: center; gap: 10px;">
                        <select id="ai-model-select-modal" class="ai-model-select-modal" title="选择当前对话使用的模型" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 13px; max-width: 150px;"></select>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label for="ai-prompt-select-modal" style="font-size: 14px; color: #495057; font-weight: 600;">提示词:</label>
                            <select id="ai-prompt-select-modal" class="ai-prompt-select-modal" title="选择当前对话使用的提示词" style="flex-grow: 1; padding: 6px 10px; border-radius: 4px; border: 1px solid #ccc; font-size: 13px;"></select>
                        </div>
                    </div>
                </div>
                <button class="ai-summary-close">×</button>
            </div>
            <div class="ai-summary-content"></div>
            <div class="ai-summary-footer">
                <div class="footer-buttons-container" style="display: flex; justify-content: flex-end; gap: 10px; width: 100%;">
                    <button class="ai-settings-btn" title="打开设置">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button class="ai-retry-btn" title="重新总结">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 11-2.3-6M21 3v6h-6"></path>
                        </svg>
                    </button>
                    <button class="ai-download-btn" title="下载总结">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>下载总结</span>
                    </button>
                    <button class="ai-copy-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>复制总结</span>
                    </button>
                </div>
            </div>
        `;

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'ai-summary-overlay';

        // 创建设置面板
        const { panel: settingsPanel, overlay: settingsOverlay, modelSelectionModal } = createSettingsPanel(shadow);

        // 将所有元素添加到Shadow DOM
        shadow.appendChild(style);
        shadow.appendChild(container);
        shadow.appendChild(modal);
        shadow.appendChild(overlay);
        shadow.appendChild(settingsPanel);

        // 将根容器添加到body
        document.body.appendChild(rootContainer);

        return {
            container,
            button: container.querySelector('.ai-summary-btn'),
            templateBtn: container.querySelector('.ai-template-btn'),
            mainPromptSelector: container.querySelector('.ai-main-prompt-selector'),
            modal,
            overlay,
            dragHandle: container.querySelector('.ai-drag-handle'),
            settingsPanel,
            settingsOverlay,
            shadow,
            downloadBtn: modal.querySelector('.ai-download-btn'),
            modelSelectionModal
        };
    }

    // 打开设置面板的函数
    function openSettings() {
        const { settingsPanel, settingsOverlay } = elements;

        settingsPanel.querySelector('#base-url').value = CONFIG.BASE_URL || DEFAULT_CONFIG.BASE_URL;
        settingsPanel.querySelector('#api-key').value = CONFIG.API_KEY;
        settingsPanel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
        settingsPanel.querySelector('#shortcut').value = CONFIG.SHORTCUT;
        settingsPanel.querySelector('#prompt').value = getCurrentPromptContent();

        // 更新所有选择器
        updateAllPromptSelectors();

        // Take a snapshot of the current settings AFTER all fields are populated
        const takeSnapshotFunc = settingsPanel.takeSettingsSnapshot;
        if (typeof takeSnapshotFunc === 'function') {
            takeSnapshotFunc();
        } else {
            console.error("takeSettingsSnapshot function is not attached to the panel.");
        }
        // Ensure the panel starts in a clean state
        const setDirtyStatusFunc = settingsPanel.setDirtyStatus; // Assuming setDirtyStatus is also attached or accessible
        if (typeof setDirtyStatusFunc === 'function') {
             setDirtyStatusFunc(false);
        } else {
            // Fallback or find a way to call setDirtyStatus from initializeSettingsEvents context
            // For now, we'll assume it's accessible or this part might need adjustment
            // if setDirtyStatus is not directly callable here.
            // One way is to ensure 'panel' has a reference to its 'setDirtyStatus'
            // which is typically done in `initializeSettingsEvents` by `panel.setDirtyStatus = setDirtyStatus;`
            // Let's assume `initializeSettingsEvents` attaches `setDirtyStatus` to the panel.
            if (panel && typeof panel.setDirtyStatus === 'function') {
                 panel.setDirtyStatus(false);
            } else if (elements && elements.settingsPanel && typeof elements.settingsPanel.setDirtyStatus === 'function') {
                elements.settingsPanel.setDirtyStatus(false); // Try accessing via elements if panel is not directly the settingsPanel
            }
            else {
                 console.warn("setDirtyStatus function could not be called directly on panel open. Dirty state might be initially incorrect.");
            }
        }


        settingsPanel.style.display = 'block';
        settingsOverlay.style.display = 'block';
    }

    // 获取完整API端点 (新版)
    function getFullEndpoint(baseUrl) {
      if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
        console.error("Base URL is not configured or invalid.");
        // 返回 null，让调用者处理，例如 summarizeContent 函数中已有处理
        return null;
      }
      const trimmedBaseUrl = baseUrl.trim();
      if (trimmedBaseUrl.includes('#')) {
        return trimmedBaseUrl.replace('#', ''); // 强制使用原始地址
      } else if (trimmedBaseUrl.endsWith('/')) {
        return trimmedBaseUrl + 'v1/chat/completions';
      } else {
        return trimmedBaseUrl + '/v1/chat/completions';
      }
    }
    // 获取网页内容
    function getPageContent() {
        const title = document.title;
        const content = document.body.innerText;
        return { title, content };
    }

// 获取可用模型列表 (新版 fetchModels)
    async function fetchModels() {
      if (!CONFIG.BASE_URL) {
        console.error("BASE_URL is not configured. Cannot fetch models.");
        throw new Error('BASE_URL 未配置，无法获取模型列表');
      }
      if (!CONFIG.API_KEY) {
        console.error('API Key is not configured. Cannot fetch models.');
        throw new Error('API Key未配置，无法获取模型列表');
      }

      // 使用 getFullEndpoint 获取基础的 completions 端点，然后替换为 models 端点
      let chatCompletionsUrl = getFullEndpoint(CONFIG.BASE_URL);
      if (!chatCompletionsUrl) {
          // getFullEndpoint 内部已打印错误，这里直接抛出，让调用者处理UI
          throw new Error('无法构造有效的API端点路径 (Base URL可能配置错误)');
      }

      const endpoint = chatCompletionsUrl.replace('/v1/chat/completions', '/v1/models');
      console.log("Fetching models from new endpoint:", endpoint);

      try {
        const res = await GM.xmlHttpRequest({
          method: 'GET',
          url: endpoint,
          headers: { Authorization: `Bearer ${CONFIG.API_KEY}` },
          timeout: 15000 // 15秒超时
        });

        if (res.status === 200) {
          const responseData = JSON.parse(res.responseText);
          // 假设API返回的结构是 { data: [{id: "model1"}, {id: "model2"}] }
          if (responseData.data && Array.isArray(responseData.data)) {
           return responseData.data.filter(m => m.id && typeof m.id === 'string');
         } else if (Array.isArray(responseData) && responseData.every(item => item && typeof item.id === 'string')) {
           // 兼容直接返回数组 [{id: "model1"}, ...] 的情况 (非标准OpenAI但常见)
            return responseData.filter(m => m.id && typeof m.id === 'string');
         }
          else {
            console.error('模型加载失败: 响应数据格式不符合预期', responseData);
            throw new Error('API返回的模型列表数据格式不正确');
          }
        } else {
          let errorDetail = `HTTP状态码 ${res.status}: ${res.statusText}`;
          try {
            const errorResponse = JSON.parse(res.responseText);
            if (errorResponse.error && errorResponse.error.message) {
              errorDetail = `API错误 (${res.status}): ${errorResponse.error.message}`;
            } else if (typeof errorResponse === 'string') {
              errorDetail = `API错误 (${res.status}): ${errorResponse}`;
            }
          } catch (parseError) {
            console.error('解析获取模型列表的错误响应失败:', parseError);
          }
          console.error('模型加载失败:', errorDetail);
          throw new Error(errorDetail);
        }
      } catch (e) {
        console.error('模型加载失败', e);
        let errorMessage = '获取模型列表时发生网络请求错误。';
         if (e && e.message) { // 检查 e 是否存在以及是否有 message 属性
            if (e.message.toLowerCase().includes('timeout')) {
                errorMessage = '获取模型列表超时，请检查网络连接或API服务。';
            } else {
                errorMessage = e.message; // 使用原始错误信息
            }
        } else if (typeof e === 'string') { // 有时错误可能只是一个字符串
            errorMessage = e;
        }
        // 抛出错误，以便调用者（如 refreshModelsBtn 点击事件）可以捕获并更新UI
        throw new Error(errorMessage);
      }
    }
    // 显示错误信息
    function showError(container, error, details = '') {
        container.innerHTML = `
            <div class="ai-summary-error" style="color: red;">
                <strong>错误：</strong> ${error}
            </div>
            ${details ? `<div class="ai-summary-debug">${details}</div>` : ''}
        `;
    }

    // 全局变量，用于存储原始的 Markdown 文本和中断控制器
    let originalMarkdownText = '';
    let abortController = null;

    // 调用API进行总结
    async function summarizeContent(content, shadow, selectedModel) {
        const contentContainer = shadow.querySelector('.ai-summary-content');
        contentContainer.innerHTML = '<div class="ai-loading">正在生成总结<span class="ai-loading-dots"></span></div>';
        originalMarkdownText = ''; // 开始时清空

        // 如果有正在进行的请求，先中断它
        if (abortController) {
            abortController.abort();
        }
        abortController = new AbortController();
        const signal = abortController.signal;

        try {
            const apiUrlToUse = getFullEndpoint(CONFIG.BASE_URL);
            if (!apiUrlToUse) {
                throw new Error("API端点配置不正确，请检查BASE_URL设置。");
            }

            const response = await fetch(apiUrlToUse, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: getCurrentPromptContent() },
                        { role: 'user', content: content }
                    ],
                    max_tokens: CONFIG.MAX_TOKENS,
                    temperature: 0.7,
                    stream: true // 开启流式响应
                }),
                signal: signal // 传递 signal
            });

            if (!response.ok) {
                let errorDetail = `API请求失败 (${response.status})。`;
                try {
                    const errorResponse = await response.json();
                    if (errorResponse.error && errorResponse.error.message) {
                        errorDetail = `API错误 (${response.status}): ${errorResponse.error.message}`;
                    }
                } catch (e) {
                    errorDetail += ' 无法解析错误响应。';
                }
                throw new Error(errorDetail);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            contentContainer.innerHTML = ''; // 清空加载提示

            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });

                // 处理 SSE (Server-Sent Events) 数据块
                let lines = buffer.split('\n');
                buffer = lines.pop(); // 保留下次可能不完整的数据行

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        if (dataStr.trim() === '[DONE]') {
                            break;
                        }
                        try {
                            const chunk = JSON.parse(dataStr);
                            if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                                const textChunk = chunk.choices[0].delta.content;
                                originalMarkdownText += textChunk;
                                // 实时渲染 Markdown
                                contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                                // 滚动到底部
                                contentContainer.scrollTop = contentContainer.scrollHeight;
                            }
                        } catch (e) {
                            console.error('解析JSON块失败:', e, '原始数据:', dataStr);
                        }
                    }
                }
            }
             // 最后处理缓冲区中可能剩余的内容
            if (buffer.startsWith('data: ')) {
                const dataStr = buffer.substring(6);
                if (dataStr.trim() !== '[DONE]') {
                    try {
                        const chunk = JSON.parse(dataStr);
                         if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                            originalMarkdownText += chunk.choices[0].delta.content;
                            contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                            contentContainer.scrollTop = contentContainer.scrollHeight;
                        }
                    } catch(e) {
                        // ignore
                    }
                }
            }


            return originalMarkdownText;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('请求被用户中断。');
                contentContainer.innerHTML = '<p>操作已取消。</p>';
                return ''; // 返回空字符串表示中断
            }
            console.error('总结生成错误:', error);
            showError(contentContainer, error.message);
            throw error; // 重新抛出，以便调用方可以更新UI状态
        } finally {
            abortController = null; // 清理控制器
        }
    }

    // 初始化事件监听
    function initializeEvents(elements) {
        const { container, button, templateBtn, modal, overlay, dragHandle, settingsPanel, settingsOverlay, shadow, modelSelectionModal } = elements;

        // 初始化拖动功能
        initializeDrag(container, dragHandle, shadow);

        const modelSelectModal = modal.querySelector('#ai-model-select-modal');
        const promptSelectModal = modal.querySelector('#ai-prompt-select-modal');

        function populateModalModelSelector() {
            if (modelSelectModal) {
                modelSelectModal.innerHTML = CONFIG.SAVED_MODELS.map(modelId =>
                    `<option value="${modelId}" ${modelId === CONFIG.MODEL ? 'selected' : ''}>${modelId}</option>`
                ).join('');
            }
        }

        function populateAllSelectors() {
            updateAllPromptSelectors();
        }

        populateAllSelectors(); // 初始填充

        // 为所有选择器添加事件监听器以实现同步
        const selectors = [
            elements.mainPromptSelector,
            modal.querySelector('#ai-prompt-select-modal'),
            settingsPanel.querySelector('#config-select')
        ];

        selectors.forEach(selector => {
            if (selector) {
                selector.addEventListener('change', (e) => {
                    const newIdentifier = e.target.value;
                    if (CONFIG.CURRENT_PROMPT_IDENTIFIER !== newIdentifier) {
                        CONFIG.CURRENT_PROMPT_IDENTIFIER = newIdentifier;
                        GM_setValue('CURRENT_PROMPT_IDENTIFIER', newIdentifier);
                        updateAllPromptSelectors(); // 同步所有选择器
                    }
                });
            }
        });



        // 右键打开设置菜单
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openSettings();
        });

        // 点击“打开模板”按钮
        templateBtn.addEventListener('click', () => {
             populateModalModelSelector(); // 在显示模态框前刷新模型列表
             showModal(modal, overlay);
             // Optionally, clear the content or show a specific message
             const contentContainer = modal.querySelector('.ai-summary-content');
             contentContainer.innerHTML = '<p>请选择一个模板或进行其他操作。</p>';
        });

        // 点击按钮显示模态框
        button.addEventListener('click', async () => {
            if (!CONFIG.API_KEY || !CONFIG.BASE_URL || !CONFIG.MODEL) {
                alert('请先在设置中配置API Key、Base URL和模型。');
                settingsPanel.style.display = 'block';
                settingsOverlay.style.display = 'block';
                return;
            }

            showModal(modal, overlay);
            const contentContainer = modal.querySelector('.ai-summary-content');
            const originalButtonText = button.textContent;
            const retryBtnModal = modal.querySelector('.ai-retry-btn');
            const downloadBtnModal = modal.querySelector('.ai-download-btn');
            const copyBtnModal = modal.querySelector('.ai-copy-btn');

            // 修复：在重新总结前，捕获并更新当前在模态框中选择的模型
            const modelSelectInModal = modal.querySelector('#ai-model-select-modal');
            if (modelSelectInModal && modelSelectInModal.value) {
                CONFIG.MODEL = modelSelectInModal.value;
            }

            button.disabled = true;
            button.textContent = '正在请求...';
            if(retryBtnModal) retryBtnModal.disabled = true;
            if(downloadBtnModal) downloadBtnModal.disabled = true;
            if(copyBtnModal) copyBtnModal.disabled = true;
            originalMarkdownText = ''; // 清空之前的总结

            try {
                const { content } = getPageContent();
                if (!content.trim()) {
                    throw new Error('网页内容为空，无法生成总结。');
                }

                populateModalModelSelector(); // Refresh selector when opening modal
                updateAllPromptSelectors(); // 刷新所有选择器
                const modelForApi = modelSelectModal.value;
                if (!modelForApi) {
                    throw new Error('未配置模型，请在设置中选择一个模型。');
                }

                // The prompt selector logic in modal is removed.

                const summary = await summarizeContent(content, shadow, modelForApi);
                // typeWriter 会处理渲染, originalMarkdownText 在 summarizeContent 中被设置
            } catch (error) {
                console.error('Summary Error:', error);
                showError(contentContainer, error.message ? error.message : '发生未知错误');
                originalMarkdownText = ''; // 明确在错误时清空
            } finally {
                button.disabled = false;
                button.textContent = originalButtonText;
                if(retryBtnModal) retryBtnModal.disabled = false;
                if(downloadBtnModal) downloadBtnModal.disabled = !originalMarkdownText;
                if(copyBtnModal) copyBtnModal.disabled = !originalMarkdownText;
                 // 恢复重试按钮的原始SVG和文本
                const retryBtn = modal.querySelector('.ai-retry-btn');
                retryBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-2.3-6M21 3v6h-6"></path>
                    </svg>
                `;
            }
        });

        // 关闭模态框
        modal.querySelector('.ai-summary-close').addEventListener('click', () => {
            hideModal(modal, overlay);
        });

        // 点击总结页面外的覆盖层关闭模态框
        overlay.addEventListener('click', () => {
            hideModal(modal, overlay);
        });

        // 下载按钮功能
        modal.querySelector('.ai-download-btn').addEventListener('click', () => {
            if (!originalMarkdownText) {
                alert('总结内容尚未生成或已失效。');
                return;
            }
            let firstLine = originalMarkdownText.split('\n')[0].trim().replace(/^#+\s*/, '');
            if (!firstLine) {
                alert('总结内容格式错误，无法生成文件名。');
                return;
            }
            let safeFirstLine = firstLine.length > 30 ? firstLine.substring(0, 30) : firstLine;
            safeFirstLine = safeFirstLine.replace(/[<>:"/\\|?*]/g, '');
            const encodedFirstLine = encodeURIComponent(safeFirstLine).replace(/%20/g, '_');
            const fileName = `网页总结-${encodedFirstLine}.md`;
            const blob = new Blob([originalMarkdownText], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        // 复制按钮功能
        modal.querySelector('.ai-copy-btn').addEventListener('click', () => {
            if (!originalMarkdownText) {
                alert('总结内容尚未生成或已失效。');
                return;
            }
            navigator.clipboard.writeText(originalMarkdownText).then(() => {
                const copyBtn = modal.querySelector('.ai-copy-btn');
                const textSpan = copyBtn.querySelector('span');
                const originalText = textSpan.textContent;
                textSpan.textContent = '已复制！';
                textSpan.style.opacity = '0.7';
                setTimeout(() => {
                    textSpan.textContent = originalText;
                    textSpan.style.opacity = '1';
                }, 2000);
            }).catch(() => {
                alert('复制失败，请手动复制内容。');
            });
        });

        // 添加快捷键支持
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

        // 添加重试按钮事件处理
        // 修改重试按钮的事件处理，现在它也应该能中断请求
        modal.querySelector('.ai-retry-btn').addEventListener('click', () => {
             // 直接调用主总结按钮的点击事件，因为逻辑是相同的
            button.click();
        });

        // 设置按钮功能（现在在模态框底部）
        modal.querySelector('.ai-settings-btn').addEventListener('click', openSettings);

        // 关闭设置面板时，隐藏其覆盖层
        settingsPanel.querySelector('.cancel-btn').addEventListener('click', () => {
            // This is now handled by the generic closeSettingsPanel function
        });

        // 初始化设置面板的事件
        initializeSettingsEvents(settingsPanel, modal, settingsOverlay, modelSelectionModal, shadow);

        // 初始化时更新一次所有提示词选择器
        updateAllPromptSelectors();

        // Model Selection Modal Events
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

            // 刷新设置面板中的模型显示
             // 修复：直接调用附加在元素上的渲染函数来刷新设置面板中的模型标签
             const renderTagsFunc = settingsPanel.querySelector('#model-tags-container').renderModelTags;
             if (typeof renderTagsFunc === 'function') {
                 renderTagsFunc();
             }
            // 新增: 确保更改模型列表后设置 dirty 状态
            if (settingsPanel && typeof settingsPanel.setDirtyStatus === 'function') {
                settingsPanel.setDirtyStatus(true);
            } else {
                console.warn("setDirtyStatus function not found on settingsPanel from 'save-selected-models' event.");
            }

            modelSelectionModal.style.display = 'none';
            alert('模型列表已保存！');
        });
    }
    // 判断快捷键是否被按下
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

    // 多系统适配的快捷键显示
    function getSystemShortcutDisplay(shortcut) {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        if (!isMac) return shortcut;

        // 为 Mac 系统转换快捷键显示
        return shortcut.replace(/Alt\+/g, 'Option+')
                    .replace(/Ctrl\+/g, '⌘+')
                    .replace(/Meta\+/g, '⌘+');
    }

    // 显示模态框
    function showModal(modal, overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
    }

    // 隐藏模态框
    function hideModal(modal, overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    const DOCK_POSITIONS = {
        LEFT: 'left',
        RIGHT: 'right',
        NONE: 'none'
    };

    const DEBOUNCE_TIME = 10; // 防抖时间
    const FOLD_DELAY = 1000; // 折叠延迟时间

    const DOCK_THRESHOLD = 100; // 贴靠触发阈值

    function savePosition(container) {
        const position = {
            left: container.style.left,
            top: container.style.top,
            right: container.style.right,
            bottom: container.style.bottom,
            dockPosition: container.dataset.dockPosition || DOCK_POSITIONS.NONE,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
        GM_setValue('containerPosition', position);
    }

    function loadPosition(container) {
        const savedPosition = GM_getValue('containerPosition');
        if (savedPosition) {
            // Always clear previous docking classes before applying new state
            container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn');

            if (savedPosition.dockPosition === DOCK_POSITIONS.LEFT) {
                dockToLeft(container); // This sets left, right, adds classes, sets dataset
                // Restore vertical position if available and it's a valid CSS value
                if (savedPosition.top && savedPosition.top !== 'auto') container.style.top = savedPosition.top;
                else container.style.top = 'auto'; // Default or clear if not specifically set for docked
                container.style.bottom = 'auto'; // Usually bottom is not set for left/right dock
            } else if (savedPosition.dockPosition === DOCK_POSITIONS.RIGHT) {
                dockToRight(container); // This sets left, right, adds classes, sets dataset
                if (savedPosition.top && savedPosition.top !== 'auto') container.style.top = savedPosition.top;
                else container.style.top = 'auto';
                container.style.bottom = 'auto';
            } else if (savedPosition.left && savedPosition.top) {
                // Free-floating or old save format
                container.style.left = savedPosition.left;
                container.style.top = savedPosition.top;
                container.style.right = savedPosition.right || 'auto';
                container.style.bottom = savedPosition.bottom || 'auto';
                container.dataset.dockPosition = DOCK_POSITIONS.NONE; // Ensure dataset is correct

                // Adjust for window resize if dimensions are saved
                if (savedPosition.windowWidth && savedPosition.windowHeight &&
                    (savedPosition.windowWidth !== window.innerWidth || savedPosition.windowHeight !== window.innerHeight)) {
                    const widthRatio = window.innerWidth / savedPosition.windowWidth;
                    const heightRatio = window.innerHeight / savedPosition.windowHeight;
                    
                    // Use offsetWidth/Height only if element is visible, otherwise it might be 0
                    const rect = container.getBoundingClientRect();
                    const containerWidth = rect.width > 0 ? rect.width : parseFloat(container.style.width) || 50; // Fallback width
                    const containerHeight = rect.height > 0 ? rect.height : parseFloat(container.style.height) || 90; // Fallback height


                    let newLeft = parseFloat(savedPosition.left) * widthRatio;
                    let newTop = parseFloat(savedPosition.top) * heightRatio;

                    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - containerWidth));
                    newTop = Math.max(0, Math.min(newTop, window.innerHeight - containerHeight));

                    container.style.left = `${newLeft}px`;
                    container.style.top = `${newTop}px`;
                }
            }
            // If no specific condition met, element remains at default CSS position or last known valid state.
        }
    }

    function initializeDrag(container, dragHandle, shadow) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let foldTimeout;

        const style = document.createElement('style');
        style.textContent = `
            .ai-summary-container {
                transition: transform 0.3s ease;
            }
            .ai-summary-container.docked {
                transition: all 0.3s ease;
            }
            .ai-drag-handle {
                pointer-events: auto !important;
            }
            .ai-summary-container.docked .ai-summary-btn,
            .ai-summary-container.docked .ai-template-btn,
            .ai-summary-container.docked .ai-main-prompt-selector {
                width: 0;
                padding: 0;
                opacity: 0;
                overflow: hidden;
                border: none;
                height: 0;
                transition: all 0.3s ease;
            }
            .ai-summary-container.docked.show-btn .ai-summary-btn,
            .ai-summary-container.docked.show-btn .ai-template-btn,
            .ai-summary-container.docked.show-btn .ai-main-prompt-selector,
            .ai-summary-container.docked:hover .ai-summary-btn,
            .ai-summary-container.docked:hover .ai-template-btn,
            .ai-summary-container.docked:hover .ai-main-prompt-selector {
                width: 100%;
                padding: 5px 15px;
                opacity: 1;
                height: 30px;
            }
            .ai-summary-container.docked.show-btn .ai-main-prompt-selector,
            .ai-summary-container.docked:hover .ai-main-prompt-selector {
                padding: 0 5px; /* Restore padding for selector */
            }
            .ai-summary-container.docked.show-btn .ai-summary-btn,
            .ai-summary-container.docked:hover .ai-summary-btn {
                 border-top: 1px solid rgba(107, 114, 128, 0.5);
            }
            .ai-summary-container.right-dock {
                right: 0 !important;
                left: auto !important;
            }
            .ai-summary-container.left-dock {
                left: 0 !important;
                right: auto !important;
            }
        `;
        shadow.appendChild(style);

        // 鼠标进入和离开事件处理
        container.addEventListener('mouseenter', () => {
            clearTimeout(foldTimeout); // 清除之前的折叠计时器
            if (container.classList.contains('docked')) {
                container.classList.add('show-btn');
            }
        });

        container.addEventListener('mouseleave', () => {
            if (container.classList.contains('docked')) {
                // 设置延迟折叠
                foldTimeout = setTimeout(() => {
                    container.classList.remove('show-btn');
                }, FOLD_DELAY);
            }
        });

        // 防抖函数
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        loadPosition(container);

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = container.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            console.log('[DragStart] initialX:', initialX, 'initialY:', initialY, 'rect.left:', rect.left, 'rect.top:', rect.top, 'clientX:', e.clientX, 'clientY:', e.clientY); // DEBUG LOG

            // 开始拖动时，先记录当前位置
            if (container.classList.contains('right-dock')) {
                currentX = window.innerWidth - container.offsetWidth;
            } else if (container.classList.contains('left-dock')) {
                currentX = 0;
            } else {
                currentX = rect.left;
            }
            currentY = rect.top;

            container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn');
            container.dataset.dockPosition = DOCK_POSITIONS.NONE;
            // Ensure right/bottom are auto when starting a free drag
            container.style.right = 'auto';
            container.style.bottom = 'auto';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const newX = e.clientX - initialX;
            const newY = e.clientY - initialY;
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            if (e.clientX < DOCK_THRESHOLD) {
                dockToLeft(container);
                container.classList.add('show-btn'); // 贴靠时立即显示按钮
            }
            else if (e.clientX > window.innerWidth - DOCK_THRESHOLD) {
                dockToRight(container);
                container.classList.add('show-btn'); // 贴靠时立即显示按钮
            }
            else {
                const maxX = window.innerWidth - containerWidth;
                const maxY = window.innerHeight - containerHeight;

                currentX = Math.max(0, Math.min(newX, maxX));
                currentY = Math.max(0, Math.min(newY, maxY));

                container.style.left = `${currentX}px`;
                container.style.top = `${currentY}px`;
                container.style.right = 'auto';
                container.style.bottom = 'auto'; // Ensure bottom is auto for free drag
                container.dataset.dockPosition = DOCK_POSITIONS.NONE;
                container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn');
                console.log('[DragMove] clientX:', e.clientX, 'clientY:', e.clientY, 'newX:', newX, 'newY:', newY, 'currentX:', currentX, 'currentY:', currentY); // DEBUG LOG
            }
            // Removed GM_setValue from mousemove to avoid excessive writes. Saving is handled on mouseup.
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = 'auto';
                savePosition(container); // Call the main savePosition function to save the full state
            }
        });

        // 使用防抖处理窗口调整
        const debouncedLoadPosition = debounce(() => {
            loadPosition(container);
        }, DEBOUNCE_TIME);

        window.addEventListener('resize', debouncedLoadPosition);
    }

    function dockToLeft(container) {
        container.classList.add('docked', 'left-dock');
        container.dataset.dockPosition = DOCK_POSITIONS.LEFT;
        container.style.left = '0';
        container.style.right = 'auto';
    }

    function dockToRight(container) {
        container.classList.add('docked', 'right-dock');
        container.dataset.dockPosition = DOCK_POSITIONS.RIGHT;
        container.style.right = '0';
        container.style.left = 'auto';
    }

    // 1. 加载配置
    loadConfig();

    // 2. 创建元素
    const elements = createElements();

    // 3. 初始化事件
    initializeEvents(elements);

    // 4. 检查配置是否完整
    if (!CONFIG.BASE_URL || !CONFIG.API_KEY) {
        elements.settingsPanel.style.display = 'block';
        // elements.shadow.querySelector('.ai-summary-overlay').style.display = 'block'; // 这个是总结模态框的覆盖层
        elements.settingsOverlay.style.display = 'block'; // 这个是设置面板的覆盖层
        alert('请先配置Base URL和API Key。');
    }
})();%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 100000; /* 确保覆盖层在设置面板下方 */
            }
        `;
        shadow.appendChild(overlayStyle);
        shadow.appendChild(settingsOverlay);
        shadow.appendChild(panel);

        // 事件监听
        panel.querySelector('.save-btn').addEventListener('click', () => {
            const newShortcut = panel.querySelector('#shortcut').value.trim();
            if (!validateShortcut(newShortcut)) {
                alert('快捷键格式不正确，请使用例如 Alt+S, Ctrl+Shift+Y 的格式。');
                return;
            }

            const newConfig = {
                BASE_URL: panel.querySelector('#base-url').value.trim() || DEFAULT_CONFIG.BASE_URL, // 读取BASE_URL
                API_KEY: panel.querySelector('#api-key').value.trim(),
                MAX_TOKENS: parseInt(panel.querySelector('#max-tokens').value) || DEFAULT_CONFIG.MAX_TOKENS,
                SHORTCUT: newShortcut || DEFAULT_CONFIG.SHORTCUT,
                PROMPT: panel.querySelector('#prompt').value.trim() || DEFAULT_CONFIG.PROMPT,
                MODEL: (() => { // 从新的模型选择器获取值
                    if (customModelCheckbox.checked) {
                        return customModelInput.value.trim() || DEFAULT_CONFIG.MODEL;
                    }
                    const selectedRadioButton = modelSelectContainer.querySelector('input[type="radio"]:checked');
                    return selectedRadioButton ? selectedRadioButton.value : DEFAULT_CONFIG.MODEL;
                })()
            };
            saveConfig(newConfig);
            panel.style.display = 'none';
            settingsOverlay.style.display = 'none';
        });

        // The cancel button click is now handled inside initializeSettingsEvents

        // 清除缓存按钮事件
        panel.querySelector('.clear-cache-btn').addEventListener('click', () => {
            const keysToClear = ['BASE_URL', 'API_KEY', 'MAX_TOKENS', 'SHORTCUT', 'MODEL', 'CURRENT_PROMPT_IDENTIFIER', 'SAVED_MODELS', 'saved_prompts'];
            // 移除了对 API_URL 的引用，因为它已不再使用
            keysToClear.forEach(key => GM_setValue(key, undefined)); // 使用 undefined 来模拟删除或重置

            // 重置为默认配置
            CONFIG = { ...DEFAULT_CONFIG };
            // 确保将CONFIG中的默认值也写入GM_storage，以便下次加载时正确
            GM_setValue('BASE_URL', CONFIG.BASE_URL);
            // GM_setValue('API_URL', CONFIG.API_URL); // API_URL 不再使用
            GM_setValue('API_KEY', CONFIG.API_KEY);
            GM_setValue('MAX_TOKENS', CONFIG.MAX_TOKENS);
            GM_setValue('SHORTCUT', CONFIG.SHORTCUT);
            // GM_setValue('PROMPT', CONFIG.PROMPT); // PROMPT is no longer saved
            GM_setValue('MODEL', CONFIG.MODEL);
            GM_setValue('CURRENT_PROMPT_IDENTIFIER', CONFIG.CURRENT_PROMPT_IDENTIFIER);
            GM_setValue('SAVED_MODELS', CONFIG.SAVED_MODELS);
            GM_setValue('saved_prompts', {}); // 清空已保存的提示词

            // 更新输入框的值
            panel.querySelector('#base-url').value = CONFIG.BASE_URL;
            // panel.querySelector('#api-url').value = CONFIG.API_URL; // #api-url 输入框已不存在
            panel.querySelector('#api-key').value = CONFIG.API_KEY;
            panel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
            panel.querySelector('#shortcut').value = CONFIG.SHORTCUT;
            panel.querySelector('#prompt').value = getCurrentPromptContent();

            // 更新提示词选择器以反映清空状态
            updateAllPromptSelectors();

            // 更新新模型选择UI以反映当前CONFIG
            const customModelCheckbox = panel.querySelector('#custom-model-checkbox');
            const customModelInput = panel.querySelector('#custom-model-input');
            const modelSelectContainer = panel.querySelector('#model-select-container');
            // 假设 availableModels 变量在此处仍然可访问，如果不可访问，则需要重新获取或从MODEL_OPTIONS构建
            // 此处简化为，如果MODEL_OPTIONS有内容，则用它来填充
            const modelsForPopulation = MODEL_OPTIONS && MODEL_OPTIONS.length > 0 ? MODEL_OPTIONS.map(m => m.value) : [];

            if (modelsForPopulation.includes(CONFIG.MODEL)) {
                customModelCheckbox.checked = false;
                customModelInput.style.display = 'none';
                customModelInput.value = '';
            } else {
                customModelCheckbox.checked = true;
                customModelInput.style.display = 'block';
                customModelInput.value = CONFIG.MODEL;
            }
            // 此处的 populateModelCheckboxes 需要在 initializeSettingsEvents 中定义并传入
            // 暂时依赖 initializeSettingsEvents 中的 populateModelCheckboxes 函数能够正确处理
            // 为了安全，最好确保 populateModelCheckboxes 在这里被调用
             if (typeof populateSavedModelSelector === "function") {
                 populateSavedModelSelector(panel, CONFIG.SAVED_MODELS, CONFIG.MODEL);
             } else {
                 // Fallback or error, e.g., manually clear and set default
                 modelSelectContainer.innerHTML = ''; // 清空
                 // 可能需要更复杂的逻辑来重新构建单选按钮
             }


            alert('缓存已清除，已恢复默认设置');
        });

        // 移除旧的 promptTemplateSelect 事件监听器，因为该元素已被移除
        // const promptTemplateSelect = panel.querySelector('#prompt-template-select');
        // const promptTextarea = panel.querySelector('#prompt');

        // if (promptTemplateSelect) { // Defensive check
        //     promptTemplateSelect.addEventListener('change', (e) => {
        //         const selectedTemplate = PROMPT_TEMPLATES.find(t => t.title === e.target.value);
        //         if (selectedTemplate) {
        //             promptTextarea.value = selectedTemplate.content;
        //         }
        //     });
        // }

        shadow.appendChild(style);

        const modelSelectionModal = document.createElement('div');
        modelSelectionModal.id = 'model-selection-modal';
        modelSelectionModal.className = 'ai-modal';
        modelSelectionModal.innerHTML = `
            <div class="modal-header">
                <h3>选择模型</h3>
                <button class="close-modal">×</button>
            </div>
            <div class="modal-content">
                <input type="text" id="model-search-input" placeholder="搜索模型..." style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                <div id="model-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 40vh; overflow-y: auto;"></div>
                <div id="model-description-area" style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; min-height: 50px; border: 1px solid #e9ecef;">
                    <p><i>将鼠标悬停在模型上以查看描述。</i></p>
                </div>
            </div>
            <div class="modal-footer">
                <button id="save-selected-models">保存选中模型</button>
            </div>
        `;
        shadow.appendChild(modelSelectionModal);

        return { panel, overlay: settingsOverlay, modelSelectionModal };
    }

    // 快捷键验证
    function validateShortcut(shortcut) {
        // 更新正则表达式以支持 Option 键
        const regex = /^((Ctrl|Alt|Shift|Meta|Option)\+)*[A-Za-z]$/;
        return regex.test(shortcut);
    }

    // 创建DOM元素并使用 Shadow DOM
    function createElements() {
        // 创建根容器
        const rootContainer = document.createElement('div');
        rootContainer.id = 'ai-summary-root';

        // 附加 Shadow DOM
        const shadow = rootContainer.attachShadow({ mode: 'open' });

        // 创建样式和结构
        const style = document.createElement('style');
        style.textContent = `
            .ai-summary-container {
                position: fixed; /* Draggable, left/top will be set dynamically */
                /* bottom: 20px; */ /* Removed to allow top/left positioning */
                /* right: 20px; */ /* Removed to allow top/left positioning */
                /* Initial position will be handled by loadPosition or default to top/left 0,0 */
                display: flex;
                align-items: center;
                z-index: 99990;
                user-select: none;
                /* align-items: stretch; */ /* Removed for vertical layout */
                flex-direction: column; /* New: for vertical layout */
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                /* height: 30px; */ /* Removed for auto height */
                background-color: rgba(75, 85, 99, 0.8);
                border-radius: 5px;
                overflow: hidden; /* 防止子元素溢出圆角 */
            }
            .ai-drag-handle {
                width: 15px;
                height: 100%;
                background-color: rgba(75, 85, 99, 0.5);
                border-radius: 5px;
                cursor: move;
                margin-right: 1px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ai-drag-handle::before {
                content: "⋮";
                color: #f3f4f6;
                font-size: 16px;
                transform: rotate(90deg);
            }
            .ai-summary-btn, .ai-template-btn {
                padding: 5px 15px;
                background-color: rgba(75, 85, 99, 0.8);
                color: #f3f4f6;
                border: none;
                border-top: 1px solid rgba(107, 114, 128, 0.5);
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s;
                height: 30px;
                line-height: 1;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
                width: 100%;
                border-radius: 0; /*  Ensure no radius between buttons */
            }
            .ai-template-btn {
                border-radius: 0 0 4px 4px;
            }
            .ai-summary-btn:hover {
                background-color: rgba(75, 85, 99, 0.9);
            }
            .ai-main-prompt-selector {
                height: 30px;
                background-color: rgba(75, 85, 99, 0.8);
                color: #f3f4f6;
                border: none;
                border-radius: 4px 4px 0 0;
                padding: 0 5px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.3s;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
                width: 100%;
                text-align: center;
                border-bottom: 1px solid rgba(107, 114, 128, 0.5); /* Add border to connect with button */
            }
            .ai-main-prompt-selector:hover {
                background-color: rgba(75, 85, 99, 0.9);
            }
            .ai-main-prompt-selector option {
                background: #374151;
                color: #f3f4f6;
            }
            .ai-summary-btn:active {
                transform: scale(0.95);
                transition: transform 0.1s;
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
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
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
            .ai-summary-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #6c757d;
                padding: 0 5px;
                line-height: 1;
                font-family: inherit;
            }
            .ai-summary-close:hover {
                color: #495057;
            }
            .ai-summary-content {
                user-select: text;
                padding: 20px;
                overflow-y: auto;
                max-height: calc(80vh - 130px);
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
                flex-direction: column;
                justify-content: center;
                gap: 10px;
                align-items: stretch;
                position: sticky;
                bottom: 0;
                background: #f0f2f4;
                z-index: 1;
            }
            .ai-summary-footer button {
                padding: 8px 16px;
                background: #6c757d;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: background 0.3s;
                font-size: 14px;
                line-height: 1;
                font-family: inherit;
            }
            .ai-summary-footer button:hover {
                background: #5a6268;
            }
            .ai-download-btn svg,
            .ai-retry-btn svg,
            .ai-copy-btn svg,
            .ai-settings-btn svg {
                width: 20px;
                height: 20px;
            }
            .ai-loading {
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-family: inherit;
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
            .ai-download-btn,
            .ai-summary-btn,
            .ai-retry-btn,
            .ai-copy-btn,
            .ai-settings-btn {
                z-index: 99991;
                position: relative;
            }
            /* 优化移动端响应式布局 */
            @media (max-width: 768px) {
                .ai-settings-panel,
                .ai-summary-modal {
                    width: 95%;
                    max-height: 90vh;
                }
                .ai-summary-footer {
                    flex-wrap: wrap;
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
            .buttons button:active {
                transform: translateY(1px);
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            .ai-summary-header,
            .ai-summary-footer,
            .ai-summary-close,
            ai-download-btn,
            .ai-settings-btn,
            .ai-retry-btn,
            .ai-copy-btn {
                user-select: none;
            }
        `;

        // 创建按钮和拖动把手
        const container = document.createElement('div');
        container.className = 'ai-summary-container';
        container.innerHTML = `
            <div class="ai-drag-handle"></div>
            <select class="ai-main-prompt-selector" title="选择提示词"></select>
            <button class="ai-summary-btn">总结网页</button>
            <button class="ai-template-btn">打开面板</button>
        `;

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'ai-summary-modal';
        modal.innerHTML = `
            <div class="ai-summary-header">
                <div class="modal-title-group" style="display: flex; align-items: center; gap: 10px; flex-grow: 1; justify-content: flex-start;">
                    <h3 style="margin-right: auto;">网页内容总结</h3>
                    <div class="modal-selectors" style="display: flex; align-items: center; gap: 10px;">
                        <select id="ai-model-select-modal" class="ai-model-select-modal" title="选择当前对话使用的模型" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 13px; max-width: 150px;"></select>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label for="ai-prompt-select-modal" style="font-size: 14px; color: #495057; font-weight: 600;">提示词:</label>
                            <select id="ai-prompt-select-modal" class="ai-prompt-select-modal" title="选择当前对话使用的提示词" style="flex-grow: 1; padding: 6px 10px; border-radius: 4px; border: 1px solid #ccc; font-size: 13px;"></select>
                        </div>
                    </div>
                </div>
                <button class="ai-summary-close">×</button>
            </div>
            <div class="ai-summary-content"></div>
            <div class="ai-summary-footer">
                <div class="footer-buttons-container" style="display: flex; justify-content: flex-end; gap: 10px; width: 100%;">
                    <button class="ai-settings-btn" title="打开设置">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button class="ai-retry-btn" title="重新总结">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 11-2.3-6M21 3v6h-6"></path>
                        </svg>
                    </button>
                    <button class="ai-download-btn" title="下载总结">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>下载总结</span>
                    </button>
                    <button class="ai-copy-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>复制总结</span>
                    </button>
                </div>
            </div>
        `;

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'ai-summary-overlay';

        // 创建设置面板
        const { panel: settingsPanel, overlay: settingsOverlay, modelSelectionModal } = createSettingsPanel(shadow);

        // 将所有元素添加到Shadow DOM
        shadow.appendChild(style);
        shadow.appendChild(container);
        shadow.appendChild(modal);
        shadow.appendChild(overlay);
        shadow.appendChild(settingsPanel);

        // 将根容器添加到body
        document.body.appendChild(rootContainer);

        return {
            container,
            button: container.querySelector('.ai-summary-btn'),
            templateBtn: container.querySelector('.ai-template-btn'),
            mainPromptSelector: container.querySelector('.ai-main-prompt-selector'),
            modal,
            overlay,
            dragHandle: container.querySelector('.ai-drag-handle'),
            settingsPanel,
            settingsOverlay,
            shadow,
            downloadBtn: modal.querySelector('.ai-download-btn'),
            modelSelectionModal
        };
    }

    // 打开设置面板的函数
    function openSettings() {
        const { settingsPanel, settingsOverlay } = elements;

        // Take a snapshot of the current settings when opening the panel
        // Note: This requires initializeSettingsEvents to have run and defined takeSettingsSnapshot
        // We will call it from here.
        const takeSnapshotFunc = settingsPanel.takeSettingsSnapshot;
        if (typeof takeSnapshotFunc === 'function') {
            takeSnapshotFunc();
        } else {
            console.error("takeSettingsSnapshot function is not attached to the panel.");
        }

        settingsPanel.querySelector('#base-url').value = CONFIG.BASE_URL || DEFAULT_CONFIG.BASE_URL;
        settingsPanel.querySelector('#api-key').value = CONFIG.API_KEY;
        settingsPanel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
        settingsPanel.querySelector('#shortcut').value = CONFIG.SHORTCUT;
        settingsPanel.querySelector('#prompt').value = getCurrentPromptContent();

        // 更新所有选择器
        updateAllPromptSelectors();

        settingsPanel.style.display = 'block';
        settingsOverlay.style.display = 'block';
    }

// 获取完整API端点 (新版)
    function getFullEndpoint(baseUrl) {
      if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
        console.error("Base URL is not configured or invalid.");
        // 返回 null，让调用者处理，例如 summarizeContent 函数中已有处理
        return null;
      }
      const trimmedBaseUrl = baseUrl.trim();
      if (trimmedBaseUrl.includes('#')) {
        return trimmedBaseUrl.replace('#', ''); // 强制使用原始地址
      } else if (trimmedBaseUrl.endsWith('/')) {
        return trimmedBaseUrl + 'v1/chat/completions';
      } else {
        return trimmedBaseUrl + '/v1/chat/completions';
      }
    }
    // 获取网页内容
    function getPageContent() {
        const title = document.title;
        const content = document.body.innerText;
        return { title, content };
    }

// 获取可用模型列表 (新版 fetchModels)
    async function fetchModels() {
      if (!CONFIG.BASE_URL) {
        console.error("BASE_URL is not configured. Cannot fetch models.");
        throw new Error('BASE_URL 未配置，无法获取模型列表');
      }
      if (!CONFIG.API_KEY) {
        console.error('API Key is not configured. Cannot fetch models.');
        throw new Error('API Key未配置，无法获取模型列表');
      }

      // 使用 getFullEndpoint 获取基础的 completions 端点，然后替换为 models 端点
      let chatCompletionsUrl = getFullEndpoint(CONFIG.BASE_URL);
      if (!chatCompletionsUrl) {
          // getFullEndpoint 内部已打印错误，这里直接抛出，让调用者处理UI
          throw new Error('无法构造有效的API端点路径 (Base URL可能配置错误)');
      }

      const endpoint = chatCompletionsUrl.replace('/v1/chat/completions', '/v1/models');
      console.log("Fetching models from new endpoint:", endpoint);

      try {
        const res = await GM.xmlHttpRequest({
          method: 'GET',
          url: endpoint,
          headers: { Authorization: `Bearer ${CONFIG.API_KEY}` },
          timeout: 15000 // 15秒超时
        });

        if (res.status === 200) {
          const responseData = JSON.parse(res.responseText);
          // 假设API返回的结构是 { data: [{id: "model1"}, {id: "model2"}] }
          if (responseData.data && Array.isArray(responseData.data)) {
           return responseData.data.filter(m => m.id && typeof m.id === 'string');
         } else if (Array.isArray(responseData) && responseData.every(item => item && typeof item.id === 'string')) {
           // 兼容直接返回数组 [{id: "model1"}, ...] 的情况 (非标准OpenAI但常见)
            return responseData.filter(m => m.id && typeof m.id === 'string');
         }
          else {
            console.error('模型加载失败: 响应数据格式不符合预期', responseData);
            throw new Error('API返回的模型列表数据格式不正确');
          }
        } else {
          let errorDetail = `HTTP状态码 ${res.status}: ${res.statusText}`;
          try {
            const errorResponse = JSON.parse(res.responseText);
            if (errorResponse.error && errorResponse.error.message) {
              errorDetail = `API错误 (${res.status}): ${errorResponse.error.message}`;
            } else if (typeof errorResponse === 'string') {
              errorDetail = `API错误 (${res.status}): ${errorResponse}`;
            }
          } catch (parseError) {
            console.error('解析获取模型列表的错误响应失败:', parseError);
          }
          console.error('模型加载失败:', errorDetail);
          throw new Error(errorDetail);
        }
      } catch (e) {
        console.error('模型加载失败', e);
        let errorMessage = '获取模型列表时发生网络请求错误。';
         if (e && e.message) { // 检查 e 是否存在以及是否有 message 属性
            if (e.message.toLowerCase().includes('timeout')) {
                errorMessage = '获取模型列表超时，请检查网络连接或API服务。';
            } else {
                errorMessage = e.message; // 使用原始错误信息
            }
        } else if (typeof e === 'string') { // 有时错误可能只是一个字符串
            errorMessage = e;
        }
        // 抛出错误，以便调用者（如 refreshModelsBtn 点击事件）可以捕获并更新UI
        throw new Error(errorMessage);
      }
    }
    // 显示错误信息
    function showError(container, error, details = '') {
        container.innerHTML = `
            <div class="ai-summary-error" style="color: red;">
                <strong>错误：</strong> ${error}
            </div>
            ${details ? `<div class="ai-summary-debug">${details}</div>` : ''}
        `;
    }

    // 全局变量，用于存储原始的 Markdown 文本和中断控制器
    let originalMarkdownText = '';
    let abortController = null;

    // 调用API进行总结
    async function summarizeContent(content, shadow, selectedModel) {
        const contentContainer = shadow.querySelector('.ai-summary-content');
        contentContainer.innerHTML = '<div class="ai-loading">正在生成总结<span class="ai-loading-dots"></span></div>';
        originalMarkdownText = ''; // 开始时清空

        // 如果有正在进行的请求，先中断它
        if (abortController) {
            abortController.abort();
        }
        abortController = new AbortController();
        const signal = abortController.signal;

        try {
            const apiUrlToUse = getFullEndpoint(CONFIG.BASE_URL);
            if (!apiUrlToUse) {
                throw new Error("API端点配置不正确，请检查BASE_URL设置。");
            }

            const response = await fetch(apiUrlToUse, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: getCurrentPromptContent() },
                        { role: 'user', content: content }
                    ],
                    max_tokens: CONFIG.MAX_TOKENS,
                    temperature: 0.7,
                    stream: true // 开启流式响应
                }),
                signal: signal // 传递 signal
            });

            if (!response.ok) {
                let errorDetail = `API请求失败 (${response.status})。`;
                try {
                    const errorResponse = await response.json();
                    if (errorResponse.error && errorResponse.error.message) {
                        errorDetail = `API错误 (${response.status}): ${errorResponse.error.message}`;
                    }
                } catch (e) {
                    errorDetail += ' 无法解析错误响应。';
                }
                throw new Error(errorDetail);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            contentContainer.innerHTML = ''; // 清空加载提示

            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });

                // 处理 SSE (Server-Sent Events) 数据块
                let lines = buffer.split('\n');
                buffer = lines.pop(); // 保留下次可能不完整的数据行

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        if (dataStr.trim() === '[DONE]') {
                            break;
                        }
                        try {
                            const chunk = JSON.parse(dataStr);
                            if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                                const textChunk = chunk.choices[0].delta.content;
                                originalMarkdownText += textChunk;
                                // 实时渲染 Markdown
                                contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                                // 滚动到底部
                                contentContainer.scrollTop = contentContainer.scrollHeight;
                            }
                        } catch (e) {
                            console.error('解析JSON块失败:', e, '原始数据:', dataStr);
                        }
                    }
                }
            }
             // 最后处理缓冲区中可能剩余的内容
            if (buffer.startsWith('data: ')) {
                const dataStr = buffer.substring(6);
                if (dataStr.trim() !== '[DONE]') {
                    try {
                        const chunk = JSON.parse(dataStr);
                         if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                            originalMarkdownText += chunk.choices[0].delta.content;
                            contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                            contentContainer.scrollTop = contentContainer.scrollHeight;
                        }
                    } catch(e) {
                        // ignore
                    }
                }
            }


            return originalMarkdownText;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('请求被用户中断。');
                contentContainer.innerHTML = '<p>操作已取消。</p>';
                return ''; // 返回空字符串表示中断
            }
            console.error('总结生成错误:', error);
            showError(contentContainer, error.message);
            throw error; // 重新抛出，以便调用方可以更新UI状态
        } finally {
            abortController = null; // 清理控制器
        }
    }

    // 初始化事件监听
    function initializeEvents(elements) {
        const { container, button, templateBtn, modal, overlay, dragHandle, settingsPanel, settingsOverlay, shadow, modelSelectionModal } = elements;

        // 初始化拖动功能
        initializeDrag(container, dragHandle, shadow);

        const modelSelectModal = modal.querySelector('#ai-model-select-modal');
        const promptSelectModal = modal.querySelector('#ai-prompt-select-modal');

        function populateModalModelSelector() {
            if (modelSelectModal) {
                modelSelectModal.innerHTML = CONFIG.SAVED_MODELS.map(modelId =>
                    `<option value="${modelId}" ${modelId === CONFIG.MODEL ? 'selected' : ''}>${modelId}</option>`
                ).join('');
            }
        }

        function populateAllSelectors() {
            updateAllPromptSelectors();
        }

        populateAllSelectors(); // 初始填充

        // 为所有选择器添加事件监听器以实现同步
        const selectors = [
            elements.mainPromptSelector,
            modal.querySelector('#ai-prompt-select-modal'),
            settingsPanel.querySelector('#config-select')
        ];

        selectors.forEach(selector => {
            if (selector) {
                selector.addEventListener('change', (e) => {
                    const newIdentifier = e.target.value;
                    if (CONFIG.CURRENT_PROMPT_IDENTIFIER !== newIdentifier) {
                        CONFIG.CURRENT_PROMPT_IDENTIFIER = newIdentifier;
                        GM_setValue('CURRENT_PROMPT_IDENTIFIER', newIdentifier);
                        updateAllPromptSelectors(); // 同步所有选择器
                    }
                });
            }
        });



        // 右键打开设置菜单
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openSettings();
        });

        // 点击“打开模板”按钮
        templateBtn.addEventListener('click', () => {
             showModal(modal, overlay);
             // Optionally, clear the content or show a specific message
             const contentContainer = modal.querySelector('.ai-summary-content');
             contentContainer.innerHTML = '<p>请选择一个模板或进行其他操作。</p>';
        });

        // 点击按钮显示模态框
        button.addEventListener('click', async () => {
            if (!CONFIG.API_KEY || !CONFIG.BASE_URL || !CONFIG.MODEL) {
                alert('请先在设置中配置API Key、Base URL和模型。');
                settingsPanel.style.display = 'block';
                settingsOverlay.style.display = 'block';
                return;
            }

            showModal(modal, overlay);
            const contentContainer = modal.querySelector('.ai-summary-content');
            const originalButtonText = button.textContent;
            const retryBtnModal = modal.querySelector('.ai-retry-btn');
            const downloadBtnModal = modal.querySelector('.ai-download-btn');
            const copyBtnModal = modal.querySelector('.ai-copy-btn');

            // 修复：在重新总结前，捕获并更新当前在模态框中选择的模型
            const modelSelectInModal = modal.querySelector('#ai-model-select-modal');
            if (modelSelectInModal && modelSelectInModal.value) {
                CONFIG.MODEL = modelSelectInModal.value;
            }

            button.disabled = true;
            button.textContent = '正在请求...';
            if(retryBtnModal) retryBtnModal.disabled = true;
            if(downloadBtnModal) downloadBtnModal.disabled = true;
            if(copyBtnModal) copyBtnModal.disabled = true;
            originalMarkdownText = ''; // 清空之前的总结

            try {
                const { content } = getPageContent();
                if (!content.trim()) {
                    throw new Error('网页内容为空，无法生成总结。');
                }

                populateModalModelSelector(); // Refresh selector when opening modal
                updateAllPromptSelectors(); // 刷新所有选择器
                const modelForApi = modelSelectModal.value;
                if (!modelForApi) {
                    throw new Error('未配置模型，请在设置中选择一个模型。');
                }

                // The prompt selector logic in modal is removed.

                const summary = await summarizeContent(content, shadow, modelForApi);
                // typeWriter 会处理渲染, originalMarkdownText 在 summarizeContent 中被设置
            } catch (error) {
                console.error('Summary Error:', error);
                showError(contentContainer, error.message ? error.message : '发生未知错误');
                originalMarkdownText = ''; // 明确在错误时清空
            } finally {
                button.disabled = false;
                button.textContent = originalButtonText;
                if(retryBtnModal) retryBtnModal.disabled = false;
                if(downloadBtnModal) downloadBtnModal.disabled = !originalMarkdownText;
                if(copyBtnModal) copyBtnModal.disabled = !originalMarkdownText;
                 // 恢复重试按钮的原始SVG和文本
                const retryBtn = modal.querySelector('.ai-retry-btn');
                retryBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-2.3-6M21 3v6h-6"></path>
                    </svg>
                `;
            }
        });

        // 关闭模态框
        modal.querySelector('.ai-summary-close').addEventListener('click', () => {
            hideModal(modal, overlay);
        });

        // 点击总结页面外的覆盖层关闭模态框
        overlay.addEventListener('click', () => {
            hideModal(modal, overlay);
        });

        // 下载按钮功能
        modal.querySelector('.ai-download-btn').addEventListener('click', () => {
            if (!originalMarkdownText) {
                alert('总结内容尚未生成或已失效。');
                return;
            }
            let firstLine = originalMarkdownText.split('\n')[0].trim().replace(/^#+\s*/, '');
            if (!firstLine) {
                alert('总结内容格式错误，无法生成文件名。');
                return;
            }
            let safeFirstLine = firstLine.length > 30 ? firstLine.substring(0, 30) : firstLine;
            safeFirstLine = safeFirstLine.replace(/[<>:"/\\|?*]/g, '');
            const encodedFirstLine = encodeURIComponent(safeFirstLine).replace(/%20/g, '_');
            const fileName = `网页总结-${encodedFirstLine}.md`;
            const blob = new Blob([originalMarkdownText], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        // 复制按钮功能
        modal.querySelector('.ai-copy-btn').addEventListener('click', () => {
            if (!originalMarkdownText) {
                alert('总结内容尚未生成或已失效。');
                return;
            }
            navigator.clipboard.writeText(originalMarkdownText).then(() => {
                const copyBtn = modal.querySelector('.ai-copy-btn');
                const textSpan = copyBtn.querySelector('span');
                const originalText = textSpan.textContent;
                textSpan.textContent = '已复制！';
                textSpan.style.opacity = '0.7';
                setTimeout(() => {
                    textSpan.textContent = originalText;
                    textSpan.style.opacity = '1';
                }, 2000);
            }).catch(() => {
                alert('复制失败，请手动复制内容。');
            });
        });

        // 添加快捷键支持
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

        // 添加重试按钮事件处理
        // 修改重试按钮的事件处理，现在它也应该能中断请求
        modal.querySelector('.ai-retry-btn').addEventListener('click', () => {
             // 直接调用主总结按钮的点击事件，因为逻辑是相同的
            button.click();
        });

        // 设置按钮功能（现在在模态框底部）
        modal.querySelector('.ai-settings-btn').addEventListener('click', openSettings);

        // 关闭设置面板时，隐藏其覆盖层
        settingsPanel.querySelector('.cancel-btn').addEventListener('click', () => {
            // This is now handled by the generic closeSettingsPanel function
        });

        // 初始化设置面板的事件
        initializeSettingsEvents(settingsPanel, modal, settingsOverlay, modelSelectionModal, shadow);

        // 初始化时更新一次所有提示词选择器
        updateAllPromptSelectors();

        // Model Selection Modal Events
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

            // 刷新设置面板中的模型显示
             // 修复：直接调用附加在元素上的渲染函数来刷新设置面板中的模型标签
             const renderTagsFunc = settingsPanel.querySelector('#model-tags-container').renderModelTags;
             if (typeof renderTagsFunc === 'function') {
                 renderTagsFunc();
             }

            modelSelectionModal.style.display = 'none';
            alert('模型列表已保存！');
        });
    }
    // 判断快捷键是否被按下
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

    // 多系统适配的快捷键显示
    function getSystemShortcutDisplay(shortcut) {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        if (!isMac) return shortcut;

        // 为 Mac 系统转换快捷键显示
        return shortcut.replace(/Alt\+/g, 'Option+')
                    .replace(/Ctrl\+/g, '⌘+')
                    .replace(/Meta\+/g, '⌘+');
    }

    // 显示模态框
    function showModal(modal, overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
    }

    // 隐藏模态框
    function hideModal(modal, overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    const DOCK_POSITIONS = {
        LEFT: 'left',
        RIGHT: 'right',
        NONE: 'none'
    };

    const DEBOUNCE_TIME = 10; // 防抖时间
    const FOLD_DELAY = 1000; // 折叠延迟时间

    const DOCK_THRESHOLD = 100; // 贴靠触发阈值

    function savePosition(container) {
        const position = {
            left: container.style.left,
            top: container.style.top,
            right: container.style.right,
            bottom: container.style.bottom,
            dockPosition: container.dataset.dockPosition || DOCK_POSITIONS.NONE,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
        GM_setValue('containerPosition', position);
    }

    function loadPosition(container) {
        const savedPosition = GM_getValue('containerPosition');
        if (savedPosition) {
            // Always clear previous docking classes before applying new state
            container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn');

            if (savedPosition.dockPosition === DOCK_POSITIONS.LEFT) {
                dockToLeft(container); // This sets left, right, adds classes, sets dataset
                // Restore vertical position if available and it's a valid CSS value
                if (savedPosition.top && savedPosition.top !== 'auto') container.style.top = savedPosition.top;
                else container.style.top = 'auto'; // Default or clear if not specifically set for docked
                container.style.bottom = 'auto'; // Usually bottom is not set for left/right dock
            } else if (savedPosition.dockPosition === DOCK_POSITIONS.RIGHT) {
                dockToRight(container); // This sets left, right, adds classes, sets dataset
                if (savedPosition.top && savedPosition.top !== 'auto') container.style.top = savedPosition.top;
                else container.style.top = 'auto';
                container.style.bottom = 'auto';
            } else if (savedPosition.left && savedPosition.top) {
                // Free-floating or old save format
                container.style.left = savedPosition.left;
                container.style.top = savedPosition.top;
                container.style.right = savedPosition.right || 'auto';
                container.style.bottom = savedPosition.bottom || 'auto';
                container.dataset.dockPosition = DOCK_POSITIONS.NONE; // Ensure dataset is correct

                // Adjust for window resize if dimensions are saved
                if (savedPosition.windowWidth && savedPosition.windowHeight &&
                    (savedPosition.windowWidth !== window.innerWidth || savedPosition.windowHeight !== window.innerHeight)) {
                    const widthRatio = window.innerWidth / savedPosition.windowWidth;
                    const heightRatio = window.innerHeight / savedPosition.windowHeight;
                    
                    // Use offsetWidth/Height only if element is visible, otherwise it might be 0
                    const rect = container.getBoundingClientRect();
                    const containerWidth = rect.width > 0 ? rect.width : parseFloat(container.style.width) || 50; // Fallback width
                    const containerHeight = rect.height > 0 ? rect.height : parseFloat(container.style.height) || 90; // Fallback height


                    let newLeft = parseFloat(savedPosition.left) * widthRatio;
                    let newTop = parseFloat(savedPosition.top) * heightRatio;

                    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - containerWidth));
                    newTop = Math.max(0, Math.min(newTop, window.innerHeight - containerHeight));

                    container.style.left = `${newLeft}px`;
                    container.style.top = `${newTop}px`;
                }
            }
            // If no specific condition met, element remains at default CSS position or last known valid state.
        }
    }

    function initializeDrag(container, dragHandle, shadow) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let foldTimeout;

        const style = document.createElement('style');
        style.textContent = `
            .ai-summary-container {
                transition: transform 0.3s ease;
            }
            .ai-summary-container.docked {
                transition: all 0.3s ease;
            }
            .ai-drag-handle {
                pointer-events: auto !important;
            }
            .ai-summary-container.docked .ai-summary-btn,
            .ai-summary-container.docked .ai-template-btn,
            .ai-summary-container.docked .ai-main-prompt-selector {
                width: 0;
                padding: 0;
                opacity: 0;
                overflow: hidden;
                border: none;
                height: 0;
                transition: all 0.3s ease;
            }
            .ai-summary-container.docked.show-btn .ai-summary-btn,
            .ai-summary-container.docked.show-btn .ai-template-btn,
            .ai-summary-container.docked.show-btn .ai-main-prompt-selector,
            .ai-summary-container.docked:hover .ai-summary-btn,
            .ai-summary-container.docked:hover .ai-template-btn,
            .ai-summary-container.docked:hover .ai-main-prompt-selector {
                width: 100%;
                padding: 5px 15px;
                opacity: 1;
                height: 30px;
            }
            .ai-summary-container.docked.show-btn .ai-main-prompt-selector,
            .ai-summary-container.docked:hover .ai-main-prompt-selector {
                padding: 0 5px; /* Restore padding for selector */
            }
            .ai-summary-container.docked.show-btn .ai-summary-btn,
            .ai-summary-container.docked:hover .ai-summary-btn {
                 border-top: 1px solid rgba(107, 114, 128, 0.5);
            }
            .ai-summary-container.right-dock {
                right: 0 !important;
                left: auto !important;
            }
            .ai-summary-container.left-dock {
                left: 0 !important;
                right: auto !important;
            }
        `;
        shadow.appendChild(style);

        // 鼠标进入和离开事件处理
        container.addEventListener('mouseenter', () => {
            clearTimeout(foldTimeout); // 清除之前的折叠计时器
            if (container.classList.contains('docked')) {
                container.classList.add('show-btn');
            }
        });

        container.addEventListener('mouseleave', () => {
            if (container.classList.contains('docked')) {
                // 设置延迟折叠
                foldTimeout = setTimeout(() => {
                    container.classList.remove('show-btn');
                }, FOLD_DELAY);
            }
        });

        // 防抖函数
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        loadPosition(container);

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = container.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            console.log('[DragStart] initialX:', initialX, 'initialY:', initialY, 'rect.left:', rect.left, 'rect.top:', rect.top, 'clientX:', e.clientX, 'clientY:', e.clientY); // DEBUG LOG

            // 开始拖动时，先记录当前位置
            if (container.classList.contains('right-dock')) {
                currentX = window.innerWidth - container.offsetWidth;
            } else if (container.classList.contains('left-dock')) {
                currentX = 0;
            } else {
                currentX = rect.left;
            }
            currentY = rect.top;

            container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn');
            container.dataset.dockPosition = DOCK_POSITIONS.NONE;
            // Ensure right/bottom are auto when starting a free drag
            container.style.right = 'auto';
            container.style.bottom = 'auto';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const newX = e.clientX - initialX;
            const newY = e.clientY - initialY;
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            if (e.clientX < DOCK_THRESHOLD) {
                dockToLeft(container);
                container.classList.add('show-btn'); // 贴靠时立即显示按钮
            }
            else if (e.clientX > window.innerWidth - DOCK_THRESHOLD) {
                dockToRight(container);
                container.classList.add('show-btn'); // 贴靠时立即显示按钮
            }
            else {
                const maxX = window.innerWidth - containerWidth;
                const maxY = window.innerHeight - containerHeight;

                currentX = Math.max(0, Math.min(newX, maxX));
                currentY = Math.max(0, Math.min(newY, maxY));

                container.style.left = `${currentX}px`;
                container.style.top = `${currentY}px`;
                container.style.right = 'auto';
                container.style.bottom = 'auto'; // Ensure bottom is auto for free drag
                container.dataset.dockPosition = DOCK_POSITIONS.NONE;
                container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn');
                console.log('[DragMove] clientX:', e.clientX, 'clientY:', e.clientY, 'newX:', newX, 'newY:', newY, 'currentX:', currentX, 'currentY:', currentY); // DEBUG LOG
            }
            // Removed GM_setValue from mousemove to avoid excessive writes. Saving is handled on mouseup.
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = 'auto';
                savePosition(container); // Call the main savePosition function to save the full state
            }
        });

        // 使用防抖处理窗口调整
        const debouncedLoadPosition = debounce(() => {
            loadPosition(container);
        }, DEBOUNCE_TIME);

        window.addEventListener('resize', debouncedLoadPosition);
    }

    function dockToLeft(container) {
        container.classList.add('docked', 'left-dock');
        container.dataset.dockPosition = DOCK_POSITIONS.LEFT;
        container.style.left = '0';
        container.style.right = 'auto';
    }

    function dockToRight(container) {
        container.classList.add('docked', 'right-dock');
        container.dataset.dockPosition = DOCK_POSITIONS.RIGHT;
        container.style.right = '0';
        container.style.left = 'auto';
    }

    // 1. 加载配置
    loadConfig();

    // 2. 创建元素
    const elements = createElements();

    // 3. 初始化事件
    initializeEvents(elements);

    // 4. 检查配置是否完整
    if (!CONFIG.BASE_URL || !CONFIG.API_KEY) {
        elements.settingsPanel.style.display = 'block';
        // elements.shadow.querySelector('.ai-summary-overlay').style.display = 'block'; // 这个是总结模态框的覆盖层
        elements.settingsOverlay.style.display = 'block'; // 这个是设置面板的覆盖层
        alert('请先配置Base URL和API Key。');
    }
})();
// ==UserScript==
// @name         AI网页内容总结(自用)
// @namespace    http://tampermonkey.net/
// @version      2.0.2
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
 * v2.0.1 (2025-06-14)
 * - 修复多选删除/模型选择模态框字体对比度问题
 * - 优化设置面板状态同步机制
 * - 实现模型列表实时更新功能
 * v2.0.2 (2025-06-14)
 * - 修复github页面的总结
 * - 修复populateModalModelSelector is not defined
 * - 修复失去焦点时总结内容消失的问题
 * - 清理无用代码、添加中文注释
 * - 优化悬浮窗停靠动画
 * - 修改UI界面
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
        SAVED_MODELS: ['gpt-4o-mini'], // 保存用户选择的模型列表

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
            containerPosition: GM_getValue('containerPosition') // 不再提供默认值，loadPosition会处理
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
        // 回退到默认值
        const defaultTemplate = PROMPT_TEMPLATES.find(t => t.identifier === DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER);
        return defaultTemplate ? defaultTemplate.content : "请用markdown格式全面总结以下网页内容，包含主要观点、关键信息和重要细节。总结需要完整、准确、有条理。"; // 最后的硬编码后备
    }

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

    function updateAllPromptSelectors(elements) { // 接收 elements 作为参数
        if (!elements || !elements.shadow) {
            console.error('Elements or shadow root not initialized for updateAllPromptSelectors');
            return;
        }
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

    //  初始化设置面板的事件监听器， 此函数负责处理设置面板内的所有用户交互
    function initializeSettingsEvents(panel, modal, settingsOverlay, modelSelectionModal, shadow, elements) { // 接收 elements 作为参数
        panel.setDirtyStatus = setDirtyStatus;
        const saveBtn = panel.querySelector('.save-btn');
        const cancelBtn = panel.querySelector('.cancel-btn');

        // isDirty: 标记设置是否有未保存的更改。
        let isDirty = false;
        // settingsSnapshot: 存储打开设置面板时各项配置的初始值，用于“取消”操作时恢复。
        let settingsSnapshot = {};
        // isSaving: 标志位，指示当前是否正在执行保存操作。
        let isSaving = false;

        function setDirtyStatus(dirty) {
            // 如果当前正在执行保存操作 (isSaving is true)，并且尝试将状态标记为 dirty，则阻止此操作。
            if (isSaving && dirty) {
                return;
            }
            isDirty = dirty;
            saveBtn.textContent = dirty ? '保存*' : '保存';
            if (dirty) {
                saveBtn.style.cssText = 'background: #e67e22 !important;'; // 橙色表示有未保存更改
            } else {
                saveBtn.style.cssText = 'background: #617043cc !important;'; // 绿色表示已保存或无更改
            }
        }

        // 捕获当前设置面板中各项配置的值，并存储到 `settingsSnapshot` 对象中
        function takeSettingsSnapshot() {
            settingsSnapshot = {
                baseURL: panel.querySelector('#base-url').value,
                apiKey: panel.querySelector('#api-key').value,
                maxTokens: panel.querySelector('#max-tokens').value,
                shortcut: panel.querySelector('#shortcut').value,
                promptIdentifier: panel.querySelector('#config-select').value, // 当前选中的提示词模板标识符
                model: CONFIG.MODEL, // 当前选中的模型
                savedModels: [...CONFIG.SAVED_MODELS] // 已保存的模型列表（深拷贝以防意外修改）
            };
        }

        function restoreSettingsFromSnapshot() {
            // 将快照中的值恢复到各个输入框
            panel.querySelector('#base-url').value = settingsSnapshot.baseURL;
            panel.querySelector('#api-key').value = settingsSnapshot.apiKey;
            panel.querySelector('#max-tokens').value = settingsSnapshot.maxTokens;
            panel.querySelector('#shortcut').value = settingsSnapshot.shortcut;
            panel.querySelector('#config-select').value = settingsSnapshot.promptIdentifier;

            const promptChangeEvent = new Event('change');
            panel.querySelector('#config-select').dispatchEvent(promptChangeEvent);

            // 恢复内存中 CONFIG 对象的模型相关设置
            CONFIG.MODEL = settingsSnapshot.model;
            CONFIG.SAVED_MODELS = [...settingsSnapshot.savedModels]; // 使用展开运算符创建副本
            renderModelTags(); // 重新渲染模型标签以反映恢复后的状态（例如，选中的模型、可用的模型列表）
        }

        panel.takeSettingsSnapshot = takeSettingsSnapshot;

        function closeSettingsPanel() {
            if (isDirty) { // 检查是否有未保存的更改
                // 弹出确认对话框
                if (confirm('您有未保存的更改。确定要放弃吗？')) {
                    restoreSettingsFromSnapshot(); // 用户确认放弃，则从快照恢复设置
                    setDirtyStatus(false);       // 将状态标记为“干净”
                    panel.style.display = 'none';      // 隐藏设置面板
                    settingsOverlay.style.display = 'none'; // 隐藏遮罩层
                }
                // 如果用户选择“取消”放弃，则不做任何操作，面板保持打开状态。
            } else {
                panel.style.display = 'none';
                settingsOverlay.style.display = 'none';
            }
        }

        // 获取设置面板中的关键UI元素
        const promptSelect = panel.querySelector('#config-select'); // 提示词模板选择器
        const shortcutInput = panel.querySelector('#shortcut');       // 快捷键输入框
        const customModelBtn = panel.querySelector('#custom-model-btn'); // “自定义模型”按钮
        const fetchModelsBtn = panel.querySelector('#fetch-model-btn'); // “获取模型”按钮
        const modelTagsContainer = panel.querySelector('#model-tags-container'); // 模型标签容器

        // 根据用户操作系统判断是否为Mac，以显示不同的快捷键占位符提示
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        shortcutInput.placeholder = isMac ?
            '例如: Option+S, ⌘+Shift+Y' :  // Mac 示例
            '例如: Alt+S, Ctrl+Shift+Y';   // Windows/Linux 示例

        // 初始化保存按钮的文本
        saveBtn.textContent = '保存';

        // 为基础配置输入框添加 'input' 事件监听器，当内容改变时，调用 setDirtyStatus(true) 标记为有未保存更改。
        panel.querySelector('#base-url').addEventListener('input', () => setDirtyStatus(true));
        panel.querySelector('#api-key').addEventListener('input', () => setDirtyStatus(true));
        panel.querySelector('#max-tokens').addEventListener('input', () => setDirtyStatus(true));
        shortcutInput.addEventListener('input', () => setDirtyStatus(true));

        // 提示词选择器 (`promptSelect`) 的 'change' 事件监听器
        promptSelect.addEventListener('change', (e) => {
            // 仅当不处于保存操作过程中 (!isSaving) 才将状态标记为 dirty。
            if (!isSaving) {
                setDirtyStatus(true);
            }
            const selectedIdentifier = e.target.value; // 获取选中的提示词模板的标识符
            const promptTextarea = panel.querySelector('#prompt'); // 获取提示词内容文本域
            // 根据标识符在 PROMPT_TEMPLATES 数组中查找对应的模板对象
            const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === selectedIdentifier);
            if (selectedTemplate) {
                promptTextarea.value = selectedTemplate.content; // 更新文本域内容
                CONFIG.CURRENT_PROMPT_IDENTIFIER = selectedTemplate.identifier; // 更新全局配置中的当前提示词标识符
            } else {
                // 如果找不到选中的模板（异常情况），则回退到默认配置中的第一个模板
                const defaultTemplate = PROMPT_TEMPLATES.find(t => t.identifier === DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER);
                promptTextarea.value = defaultTemplate.content;
                CONFIG.CURRENT_PROMPT_IDENTIFIER = DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER;
            }
        });

        function renderModelTags() {
            modelTagsContainer.innerHTML = ''; // 清空现有标签
            CONFIG.SAVED_MODELS.forEach(modelId => {
                const tag = document.createElement('div');
                tag.className = 'model-tag'; // CSS 类名
                tag.textContent = modelId;   // 显示模型ID
                tag.dataset.modelId = modelId; // 将模型ID存储在data属性中，方便事件处理
                if (modelId === CONFIG.MODEL) {
                    tag.classList.add('selected'); // 如果是当前选中的模型，添加 'selected' 类以高亮显示
                }

                // 为模型标签添加点击事件：选择此模型作为当前活动模型
                tag.addEventListener('click', () => {
                    if (CONFIG.MODEL !== modelId) { // 仅当点击了非当前选中的模型时才执行
                        CONFIG.MODEL = modelId;      // 更新全局配置中的当前模型
                        renderModelTags();           // 重新渲染所有标签以更新选中状态
                        setDirtyStatus(true);        // 标记设置为有未保存更改
                    }
                });

                // 为每个模型标签创建并添加一个删除按钮 (×)
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-btn'; // CSS 类名
                deleteBtn.innerHTML = '&times;';    // "×" 符号
                deleteBtn.title = '删除此模型';    // 鼠标悬停提示
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡到父元素 (tag)，防止触发tag的点击选择事件
                    if (confirm(`确定要删除模型 "${modelId}" 吗？`)) { // 弹出确认对话框
                        // 从 SAVED_MODELS 数组中过滤掉要删除的模型
                        CONFIG.SAVED_MODELS = CONFIG.SAVED_MODELS.filter(m => m !== modelId);
                        // 如果删除的是当前选中的模型，则需要重置 CONFIG.MODEL
                        if (CONFIG.MODEL === modelId) {
                            // 如果还有其他已保存的模型，则选择第一个作为新的当前模型；否则清空当前模型。
                            CONFIG.MODEL = CONFIG.SAVED_MODELS.length > 0 ? CONFIG.SAVED_MODELS[0] : '';
                        }
                        renderModelTags();      // 重新渲染模型标签
                        setDirtyStatus(true);   // 标记设置为有未保存更改
                    }
                });

                tag.appendChild(deleteBtn); // 将删除按钮添加到标签内
                modelTagsContainer.appendChild(tag); // 将标签添加到容器内
            });
        }

        // 初始化时调用一次，渲染初始的模型标签
        renderModelTags();
        modelTagsContainer.renderModelTags = renderModelTags;

        // 为模型标签容器本身添加点击事件，用于触发批量删除模态框。
        modelTagsContainer.addEventListener('click', (e) => {
            if (e.target === modelTagsContainer) { // 确保点击的是容器空白处
                showMultiDeleteModal(); // 显示批量删除模态框
            }
        });

        function showMultiDeleteModal() {
            // 创建模态框和遮罩层的DOM元素
            const multiDeleteModal = document.createElement('div');
            multiDeleteModal.className = 'ai-modal'; // 通用模态框样式
            multiDeleteModal.style.cssText = 'display: block; z-index: 100003;'; // 立即显示，并设置较高层级

            const overlay = document.createElement('div');
            overlay.className = 'ai-settings-overlay'; // 通用遮罩层样式
            overlay.style.cssText = 'display: block; z-index: 100002;'; // 立即显示，层级低于模态框

            // 为每个已保存的模型生成一个带复选框的列表项HTML
            const modelsHTML = CONFIG.SAVED_MODELS.map(modelId => `
                <div class="model-item" style="cursor: pointer; padding: 10px; border-radius: 4px; display: flex; align-items: center;">
                    <input type="checkbox" value="${modelId}" id="multi-delete-chk-${modelId}" style="margin-right: 10px; cursor: pointer;">
                    <label for="multi-delete-chk-${modelId}" style="cursor: pointer; flex-grow: 1; color: #333333;">${modelId}</label>
                </div>
            `).join('');

            // 设置模态框的内部HTML结构
            multiDeleteModal.innerHTML = `
                <div class="modal-header">
                    <h3>批量删除模型</h3>
                    <button class="close-modal ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
                <div class="modal-content" style="max-height: 50vh; overflow-y: auto;">
                    ${modelsHTML}
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="modal-action-btn cancel-btn ai-btn ai-btn-secondary">取消</button>
                    <button class="modal-action-btn delete-selected-btn ai-btn ai-btn-danger">删除</button>
                </div>
            `;

            // 将模态框和遮罩层附加到Shadow DOM
            shadow.appendChild(overlay);
            shadow.appendChild(multiDeleteModal);

            // 定义关闭模态框的辅助函数
            const closeModal = () => {
                shadow.removeChild(multiDeleteModal);
                shadow.removeChild(overlay);
            };

            // 为模态框的关闭按钮、取消按钮和遮罩层添加点击事件监听器，用于关闭模态框
            multiDeleteModal.querySelector('.close-modal').addEventListener('click', closeModal);
            multiDeleteModal.querySelector('.cancel-btn').addEventListener('click', closeModal);
            overlay.addEventListener('click', closeModal);

            // 为“删除已选”按钮添加点击事件监听器
            multiDeleteModal.querySelector('.delete-selected-btn').addEventListener('click', () => {
                const selectedForDeletion = []; // 存储用户选中的要删除的模型ID
                // 遍历模态框中所有选中的复选框
                multiDeleteModal.querySelectorAll('input[type="checkbox"]:checked').forEach(chk => {
                    selectedForDeletion.push(chk.value); // 将选中的模型ID添加到数组
                });

                if (selectedForDeletion.length === 0) { // 如果没有选择任何模型
                    showToastNotification('请至少选择一个要删除的模型。');
                    return;
                }

                // 弹出确认对话框
                if (confirm(`确定要删除的 ${selectedForDeletion.length} 个模型吗？`)) {
                    // 从 CONFIG.SAVED_MODELS 中过滤掉选中的模型
                    CONFIG.SAVED_MODELS = CONFIG.SAVED_MODELS.filter(m => !selectedForDeletion.includes(m));
                    // 如果当前选中的模型 (CONFIG.MODEL) 在被删除的列表中，则重置 CONFIG.MODEL
                    if (selectedForDeletion.includes(CONFIG.MODEL)) {
                        CONFIG.MODEL = CONFIG.SAVED_MODELS.length > 0 ? CONFIG.SAVED_MODELS[0] : '';
                    }
                    renderModelTags();      // 重新渲染模型标签
                    setDirtyStatus(true);   // 标记设置为有未保存更改
                    closeModal();           // 关闭批量删除模态框
                }
            });
        }

        // “使用自定义模型”按钮的点击事件监听器
        customModelBtn.addEventListener('click', () => {
            // 提示用户输入自定义模型的名称，支持多个，用逗号分隔
            const newModelsInput = prompt('请输入要添加的自定义模型名称（多个模型请用英文逗号,隔开）：');
            if (newModelsInput && newModelsInput.trim()) { // 确保用户输入了内容
                // 分割、去空格、过滤空字符串，得到有效的模型ID数组
                const newModels = newModelsInput.trim().split(',').map(m => m.trim()).filter(m => m);
                let added = false; // 标记是否成功添加了至少一个新模型
                let lastAddedModel = ''; // 记录最后一个成功添加的模型ID
                newModels.forEach(modelId => {
                    if (!CONFIG.SAVED_MODELS.includes(modelId)) { // 如果模型ID尚不存在于已保存列表中
                        CONFIG.SAVED_MODELS.push(modelId); // 添加到列表
                        lastAddedModel = modelId;
                        added = true;
                    }
                });

                if (added) { // 如果成功添加了新模型
                    CONFIG.MODEL = lastAddedModel; // 将最后一个添加的模型设为当前选中模型
                    renderModelTags();           // 重新渲染模型标签
                    setDirtyStatus(true);        // 标记设置为有未保存更改
                } else { // 如果所有输入的模型都已存在
                    showToastNotification('所有输入的模型均已存在！');
                }
            }
        });

        // --- “获取模型”按钮相关逻辑 ---
        // fetchedModelsCache: 用于缓存从API获取的模型列表，避免重复请求。
        let fetchedModelsCache = [];
        const searchInput = modelSelectionModal.querySelector('#model-search-input'); // 模型选择模态框内的搜索框
        const modelListContainer = modelSelectionModal.querySelector('#model-list-container'); // 模型选择模态框内显示模型列表的容器
        const descriptionArea = modelSelectionModal.querySelector('#model-description-area'); // 模型选择模态框内显示模型描述的区域

        function renderModelList(filter = '') {
            modelListContainer.innerHTML = ''; // 清空现有列表
            const lowerCaseFilter = filter.toLowerCase(); // 转换为小写以便不区分大小写搜索
            // 过滤缓存中的模型，只保留ID包含过滤字符串的模型
            const filteredModels = fetchedModelsCache.filter(m => m.id.toLowerCase().includes(lowerCaseFilter));

            if (filteredModels.length === 0) { // 如果没有匹配的模型
                modelListContainer.innerHTML = `<p style="padding: 10px;">没有找到匹配的模型。</p>`;
                return;
            }

            // 遍历过滤后的模型，为每个模型创建DOM元素并添加到列表容器
            filteredModels.forEach(model => {
                const div = document.createElement('div');
                div.className = 'model-item'; // CSS类名
                // 复选框的选中状态根据该模型ID是否存在于 CONFIG.SAVED_MODELS 中来决定
                div.innerHTML = `<input type="checkbox" value="${model.id}" id="model-checkbox-${model.id}" ${CONFIG.SAVED_MODELS.includes(model.id) ? 'checked' : ''}><label for="model-checkbox-${model.id}">${model.id}</label>`;
                modelListContainer.appendChild(div);

                // 为每个模型项添加鼠标悬停事件，在描述区域显示模型ID
                div.addEventListener('mouseenter', () => {
                    const createdDate = model.created ? new Date(model.created * 1000).toLocaleString() : 'N/A';
                    const ownedBy = model.owned_by || 'N/A';
                    descriptionArea.innerHTML = `
                        <p style="margin:0; font-weight: bold;">${model.id}</p>
                    `;
                });
            });
        }

        // 为模型选择模态框中的搜索输入框添加 'input' 事件监听，实现实时过滤模型列表
        searchInput.addEventListener('input', () => renderModelList(searchInput.value));

        // “获取模型”按钮的点击事件监听器
        fetchModelsBtn.addEventListener('click', async () => {
            // 初始化模态框状态：显示加载提示，清空描述区和搜索框
            modelListContainer.innerHTML = '<div class="ai-loading">正在获取模型列表...</div>';
            descriptionArea.innerHTML = `<p><i>将鼠标悬停在模型上以查看描述。</i></p>`;
            searchInput.value = '';
            modelSelectionModal.style.display = 'block'; // 显示模型选择模态框

            try {
                const rawModels = await fetchModels(); // 调用API获取模型数据
                // 将获取到的原始模型数据（可能仅为字符串ID数组）转换为包含id的对象数组，并存入缓存
                fetchedModelsCache = rawModels.map(m => (typeof m === 'string' ? { id: m, created: 0, owned_by: 'unknown' } : m));
                renderModelList(); // 使用获取到的数据渲染模型列表
            } catch (error) { // 如果获取模型失败
                modelListContainer.innerHTML = `<p style="color: red; padding: 10px;">获取模型失败: ${error.message}</p>`; // 显示错误信息
            }
        });


        // “保存”按钮的点击事件监听器
        saveBtn.addEventListener('click', () => {
            isSaving = true; // 设置保存状态标志，防止在保存过程中触发不必要的 dirty 状态更新

            // 1. 获取并验证快捷键输入
            let newShortcut = panel.querySelector('#shortcut').value.trim();
            newShortcut = newShortcut.replace(/Option\+/g, 'Alt+'); // 将Mac的Option+替换为通用的Alt+
            if (!validateShortcut(newShortcut) && newShortcut !== "") { // 如果格式不正确且非空
                isSaving = false; // 重置保存标志
                showToastNotification(isMac ? '快捷键格式不正确。有效示例: Option+S, ⌘+Shift+Y' : '快捷键格式不正确。有效示例: Alt+S, Ctrl+Shift+Y');
                return; // 中断保存
            }

            // 2. 获取并验证Base URL输入
            const baseURLValue = panel.querySelector('#base-url').value.trim();
            if (!baseURLValue) { // 不能为空
                showToastNotification('Base URL 不能为空。');
                isSaving = false; return;
            }
            if (!baseURLValue.match(/^https?:\/\/.+/)) { // 必须以 http:// 或 https:// 开头
                showToastNotification('Base URL 格式不正确，应以 http:// 或 https:// 开头。');
                isSaving = false; return;
            }

            // 3. 获取并验证API Key输入
            const apiKeyVaule = panel.querySelector('#api-key').value.trim();
            if (!apiKeyVaule) { // 不能为空
                alert('API Key 不能为空。');
                isSaving = false; return;
            }

            // 4. 获取并验证Max Tokens输入
            const maxTokensValue = panel.querySelector('#max-tokens').value.trim();
            const maxTokensParsed = parseInt(maxTokensValue);
            if (maxTokensValue === "" || isNaN(maxTokensParsed) || maxTokensParsed <= 0) { // 必须是大于0的有效数字
                alert('最大Token数必须是一个大于0的有效数字。');
                isSaving = false; return;
            }
            if (maxTokensParsed > 100000) { // 对过大的值给出警告（非强制）
                alert('最大Token数设置过大，可能导致请求失败或费用过高。请设置一个合理的值。');
            }

            // 5. 验证是否已选择模型
            // CONFIG.MODEL 的值由模型标签的点击事件实时更新
            if (!CONFIG.MODEL) {
                alert('请至少选择或添加一个模型。');
                isSaving = false; return;
            }

            // 6. 所有验证通过，更新内存中的 CONFIG 对象
            CONFIG.BASE_URL = baseURLValue;
            CONFIG.API_KEY = apiKeyVaule;
            CONFIG.MAX_TOKENS = maxTokensParsed;
            CONFIG.SHORTCUT = newShortcut || DEFAULT_CONFIG.SHORTCUT; // 如果为空，则使用默认快捷键
            // CONFIG.CURRENT_PROMPT_IDENTIFIER 和 CONFIG.SAVED_MODELS 已由各自的交互实时更新，此处无需再次赋值

            // 7. 将更新后的 CONFIG各项持久化存储到 GM_setValue
            GM_setValue('BASE_URL', CONFIG.BASE_URL);
            GM_setValue('API_KEY', CONFIG.API_KEY);
            GM_setValue('MAX_TOKENS', CONFIG.MAX_TOKENS);
            GM_setValue('SHORTCUT', CONFIG.SHORTCUT);
            GM_setValue('MODEL', CONFIG.MODEL);
            GM_setValue('CURRENT_PROMPT_IDENTIFIER', CONFIG.CURRENT_PROMPT_IDENTIFIER);
            GM_setValue('SAVED_MODELS', CONFIG.SAVED_MODELS);

            // 8. 刷新主总结模态框中的模型选择器，以同步最新的模型列表和当前选中的模型
            populateModalModelSelector(modal);

            // 9. 更新设置快照以反映已保存的更改。
            //    这确保了如果用户在保存后立即关闭面板，不会误报“未保存更改”。
            if (typeof panel.takeSettingsSnapshot === 'function') {
                panel.takeSettingsSnapshot();
            }
            // 10. 将设置状态标记为“干净”。这必须在更新快照之后执行。
            setDirtyStatus(false);
            
            // 11. 重置保存状态标志。这必须在 setDirtyStatus(false) 之后执行，
            //     以确保 dirty 状态和UI完全更新为“干净”后，才允许其他事件（如输入框修改）再次更改 dirty 状态。
            isSaving = false;

            // 12. 隐藏设置面板和遮罩层，并显示成功提示
            panel.style.display = 'none';
            settingsOverlay.style.display = 'none';
            showToastNotification('设置已应用！');
        });

        // 为“取消”按钮和设置面板的遮罩层添加点击事件监听器，调用 closeSettingsPanel 函数来关闭面板。
        cancelBtn.addEventListener('click', closeSettingsPanel);
        settingsOverlay.addEventListener('click', closeSettingsPanel);
    }

    function createSettingsPanel(shadow) {
        const panel = document.createElement('div'); // 设置面板的根元素
        panel.className = 'ai-settings-panel';
        // 使用模板字符串构建设置面板的内部HTML结构
        panel.innerHTML = `
            <div class="panel-header">
                <h3>设置</h3>
                <button class="cancel-btn ai-btn ai-btn-icon" title="关闭"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
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
            <div class="buttons" style="display: flex; justify-content: flex-end; gap: 10px;"> <!-- 面板底部的操作按钮区域 -->
                <button class="clear-cache-btn ai-btn ai-btn-danger">重置</button> <!-- 重置所有设置到默认值并清除缓存 -->
                <button class="save-btn ai-btn ai-btn-success">保存</button> <!-- 保存当前设置 -->
            </div>
        `; // panel.innerHTML 结束

        // 创建 <style> 元素，用于定义设置面板及其内部组件的CSS样式
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
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                width: 90%;
                max-width: 600px; /* 最大宽度限制 */
                max-height: 80vh; /* 最大高度限制，超出则显示滚动条 */
                overflow-y: auto; /* 内容溢出时垂直滚动 */
                box-sizing: border-box;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
                font-size: 15px;
                z-index: 100001; /* 确保在其他页面元素之上 */
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
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            .panel-header h3 { /* 模态框标题样式 */
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #495057;
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
                border-color: #60a5fa; /* 焦点时边框颜色变化 */
                box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2); /* 焦点时外发光效果 */
            }
            .form-group textarea { /* 文本域特定样式 */
                height: 100px; /* 默认高度 */
                resize: vertical; /* 允许垂直方向调整大小 */
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
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
                justify-content: space-around; /* 按钮平均分布 */
                gap: 10px;
                margin-top: 20px;
            }

            .modal-action-btn { /* 通用模态框操作按钮（如“获取模型”模态框中的按钮）的基本样式 */
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

            /* 通用模态框样式 (例如用于“获取模型”、“批量删除模型”等功能) */
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
                z-index: 100002; /* 层级高于设置面板的遮罩层，但低于设置面板本身（如果同时显示）*/
                flex-direction: column; /* 内部元素垂直排列 */
            }
            .modal-header { /* 模态框头部样式 */
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #dee2e6;
                padding-bottom: 10px;
                margin-bottom: 15px;
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
                margin-bottom: 15px;
            }
            #model-list-container label { /* 模型选择列表中的标签样式 */
                font-weight: normal;
                font-size: 14px;
                color: #333333;
            }
            #model-list-container .model-item { /* 模型选择列表中的每个条目样式 */
                padding: 8px;
                border: 1px solid #eee;
                border-radius: 4px;
                display: flex;
                align-items: center;
                transition: background-color 0.2s;
                cursor: pointer;
            }
            #model-list-container .model-item:hover { background-color: #f0f8ff; } /* 悬停时背景色变化 */
            #model-list-container .model-item label { /* 模型条目内标签的样式 */
                margin-left: 8px;
                cursor: pointer;
            }
            .modal-footer { /* 模态框底部样式 */
                border-top: 1px solid #dee2e6;
                padding-top: 15px;
                text-align: right; /* 按钮靠右对齐 */
            }
            #save-selected-models { /* “获取模型”模态框中的“保存”按钮样式，将使用 .ai-btn-success */
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
               background-color: #60a5fa; /* 高亮背景色 */
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
           /* “自定义模型”和“获取模型”按钮的容器样式 */
           .model-actions {
               display: flex;
               gap: 10px;
               margin-top: 10px;
               color:#ffffff;
           }
       `; // style.textContent 结束

        const settingsOverlay = document.createElement('div');
        settingsOverlay.className = 'ai-settings-overlay';
        settingsOverlay.style.display = 'none'; // 默认隐藏

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
        shadow.appendChild(overlayStyle); // 将遮罩层样式附加到Shadow DOM
        shadow.appendChild(settingsOverlay); // 将遮罩层元素附加到Shadow DOM
        shadow.appendChild(panel); // 将设置面板元素附加到Shadow DOM

        panel.querySelector('.clear-cache-btn').addEventListener('click', () => {
            // 弹出确认对话框，防止用户误操作
            if (!confirm('确定要重置所有设置并清除缓存吗？这将恢复到默认配置。')) {
                return; // 用户取消，则不执行任何操作
            }

            // 定义需要从GM存储中清除的键名列表
            const keysToClear = ['BASE_URL', 'API_KEY', 'MAX_TOKENS', 'SHORTCUT', 'MODEL', 'CURRENT_PROMPT_IDENTIFIER', 'SAVED_MODELS', 'saved_prompts', 'containerPosition'];
            keysToClear.forEach(key => GM_setValue(key, undefined));

            // 重新加载配置以应用默认值（除了containerPosition）
            loadConfig(); // 这会重新加载除 containerPosition 之外的默认值

            // 更新设置面板UI上的各个输入字段，以反映重置后的默认值
            panel.querySelector('#base-url').value = CONFIG.BASE_URL;
            panel.querySelector('#api-key').value = CONFIG.API_KEY;
            panel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
            panel.querySelector('#shortcut').value = CONFIG.SHORTCUT;
            
            // 更新提示词相关的UI：选择器选项和提示词内容文本域
            if (typeof globalElements !== 'undefined' && globalElements && globalElements.shadow) {
                const configSelect = panel.querySelector('#config-select'); // 获取提示词模板选择器
                if (configSelect) {
                    configSelect.value = CONFIG.CURRENT_PROMPT_IDENTIFIER; // 将选择器的值设置为默认模板的标识符
                    configSelect.dispatchEvent(new Event('change')); // 手动触发 'change' 事件，以更新提示词内容文本域
                }
                updateAllPromptSelectors(globalElements); // 调用全局函数，确保所有界面的提示词选择器都同步更新
            }

            // 更新模型标签UI，以反映重置后的模型列表 (通常是默认模型) 和当前选中的模型
            const modelTagsContainer = panel.querySelector('#model-tags-container');
            if (modelTagsContainer && typeof modelTagsContainer.renderModelTags === 'function') {
                // renderModelTags 函数会从 CONFIG.SAVED_MODELS 和 CONFIG.MODEL 读取数据并重新渲染标签
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

            showToastNotification('设置已重置并清除缓存！'); // 显示操作成功的提示消息
        });

        shadow.appendChild(style); // 将包含所有设置面板样式的 <style> 元素附加到 Shadow DOM

        const modelSelectionModal = document.createElement('div');
        modelSelectionModal.id = 'model-selection-modal'; // 设置ID，方便后续查找
        modelSelectionModal.className = 'ai-modal'; // 应用通用模态框样式
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
                <!-- 模型描述区域 (鼠标悬停在模型上时显示信息) -->
                <div id="model-description-area" style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; min-height: 50px; border: 1px solid #e9ecef; color: #333333;">
                    <p><i>将鼠标悬停在模型上以查看描述。</i></p>
                </div>
            </div>
            <div class="modal-footer" style="text-align: right;"> <!-- 模态框底部：保存按钮 -->
                <button id="save-selected-models" class="ai-btn ai-btn-success">保存</button>
            </div>
        `;
        shadow.appendChild(modelSelectionModal); // 将模型选择模态框附加到 Shadow DOM
        return { panel, overlay: settingsOverlay, modelSelectionModal };
    }

    function validateShortcut(shortcut) {
        // 更新正则表达式以支持 Option 键
        const regex = /^((Ctrl|Alt|Shift|Meta|Option)\+)*[A-Za-z]$/;
        return regex.test(shortcut);
    }

    function createElements() {
        // 创建根容器
        const rootContainer = document.createElement('div');
        rootContainer.id = 'ai-summary-root';

        // 附加 Shadow DOM
        const shadow = rootContainer.attachShadow({ mode: 'open' });

        // 创建样式和结构
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
            .ai-summary-container {
                position: fixed; /* Draggable, left/top will be set dynamically */
                display: flex;
                align-items: center;
                z-index: 99990;
                user-select: none;
                flex-direction: column; /* New: for vertical layout */
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                background-color: rgba(75, 85, 99, 0.8);
                border-radius: 5px;
                overflow: hidden; /* 防止子元素溢出圆角 */
            }
            .ai-drag-handle {
                width: 100%; /* Changed from 15px */
                height: 20px; /* Changed from 100% to a fixed height */
                background-color: rgba(75, 85, 99, 0.5);
                border-radius: 5px 5px 0 0; /* Top corners rounded */
                cursor: move;
                margin-bottom: 1px; /* Optional: space between handle and first button */
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ai-drag-handle::before {
                content: "⋯"; /* Changed from ⋮ and removed rotation */
                color: #f3f4f6;
                font-size: 16px;
            }
            /* 悬浮窗按钮的特殊处理 */
            .ai-summary-btn, .ai-template-btn {
                padding: 5px 15px;
                background-color: #374151; /* 深灰蓝 */
                color: #f3f4f6; /* 浅灰色文字 */
                border: none;
                border-top: 1px solid #4B5563; /* 深灰蓝边框 */
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s;
                height: 30px;
                line-height: 1;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
                width: 100%;
                border-radius: 0;
            }
            .ai-template-btn {
                border-radius: 0 0 4px 4px;
            }
            .ai-summary-btn:hover, .ai-template-btn:hover { /* 合并hover */
                background-color: #4B5563; /* 稍亮的深灰蓝 */
            }
            .ai-main-prompt-selector {
                height: 30px;
                background-color: #374151; /* 深灰蓝 */
                color: #f3f4f6; /* 浅灰色文字 */
                border: none;
                border-radius: 4px 4px 0 0;
                padding: 0 5px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.3s;
                font-family: Microsoft Yahei,PingFang SC,HanHei SC,Arial;
                width: 100%;
                text-align: center;
                border-bottom: 1px solid #4B5563; /* 深灰蓝边框 */
            }
            .ai-main-prompt-selector:hover {
                background-color: #4B5563; /* 稍亮的深灰蓝 */
            }
            .ai-main-prompt-selector option {
                background: #4B5563; /* 下拉选项背景 */
                color: #f3f4f6; /* 下拉选项文字 */
            }
            .ai-summary-btn:active { /* 保持原有active效果 */
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

    // 打开设置面板，并使用当前配置填充面板中的各个输入字段。
    function openSettings(elements) { // 接收 elements 作为参数
        const { settingsPanel, settingsOverlay } = elements;

        settingsPanel.querySelector('#base-url').value = CONFIG.BASE_URL || DEFAULT_CONFIG.BASE_URL;
        settingsPanel.querySelector('#api-key').value = CONFIG.API_KEY;
        settingsPanel.querySelector('#max-tokens').value = CONFIG.MAX_TOKENS;
        settingsPanel.querySelector('#shortcut').value = CONFIG.SHORTCUT;
        settingsPanel.querySelector('#prompt').value = getCurrentPromptContent();

        // 更新所有选择器
        updateAllPromptSelectors(elements); // 传递 elements

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

      // 使用 getFullEndpoint 获取基础的 completions 端点，然后替换为 models 端点
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

    // 显示一个自动消失的toast提示消息。
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
            font-family: Microsoft Yahei, PingFang SC, HanHei SC, Arial;
            font-size: 14px;
            box-shadow: 0 3px 12px rgba(0,0,0,0.25); /* 增加阴影效果 */
            text-align: center;
            max-width: 80%; /* 防止提示过宽 */
        `;

        // 尝试将toast添加到shadow DOM的根节点
        let shadowRootForToast = null;
        if (typeof globalElements !== 'undefined' && globalElements && globalElements.shadow) {
            shadowRootForToast = globalElements.shadow;
        } else {
            // 备用方案：尝试通过ID获取根元素的shadowRoot
            const rootEl = document.getElementById('ai-summary-root');
            if (rootEl && rootEl.shadowRoot) {
                shadowRootForToast = rootEl.shadowRoot;
            }
        }

        if (shadowRootForToast) {
            shadowRootForToast.appendChild(toast);
        } else {
            console.warn('AI_WebSummary: Shadow DOM for toast not found, appending to body. Style conflicts may occur.');
            document.body.appendChild(toast); // 最后手段
        }

        // 淡入效果
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.bottom = '40px'; // 动画效果更明显
        }, 50); // 缩短延迟以更快显示

        // 持续时间后淡出并移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '20px';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500); // 等待淡出动画完成
        }, duration);
    }

    // 全局变量，用于存储原始的 Markdown 文本
    let originalMarkdownText = ''; // 全局变量，用于存储AI生成的原始Markdown文本

    // 调用AI API对给定的内容进行总结。使用流式响应逐步更新总结模态框的内容
    async function summarizeContent(content, shadow, selectedModel) {
        const contentContainer = shadow.querySelector('.ai-summary-content');
        contentContainer.innerHTML = '<div class="ai-loading">正在总结中...</div>';
        originalMarkdownText = ''; // 开始时清空

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
                stream: true // 开启流式响应
            };
            // 使用 GM.xmlHttpRequest 替代 fetch
            return new Promise((resolve, reject) => {
                const xhr = GM.xmlHttpRequest({
                    method: 'POST',
                    url: apiUrlToUse,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.API_KEY}`
                    },
                    data: JSON.stringify(payload),
                    responseType: 'stream', // 请求流式响应
                    onloadstart: (stream) => {
                        const reader = stream.response.getReader();
                        const decoder = new TextDecoder('utf-8');
                        let buffer = ''; // 用于缓存可能被截断的数据流片段

                        function processText() {
                            reader.read().then(({ done, value }) => {
                                // 流读取结束的标志
                                if (done) {
                                    if (buffer.startsWith('data: ')) {
                                        const dataStr = buffer.substring(6); // 移除 "data: " 前缀
                                        if (dataStr.trim() !== '[DONE]') { // 确保不是一个明确的结束标记
                                            try {
                                                const chunk = JSON.parse(dataStr);
                                                if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                                                    originalMarkdownText += chunk.choices[0].delta.content; // 累加最后的内容
                                                }
                                            } catch(e) { /* 忽略解析错误，因为这可能是流意外中断的最后一部分 */ }
                                        }
                                    }
                                    // 最终渲染完整内容，移除打字光标
                                    contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                                    contentContainer.scrollTop = contentContainer.scrollHeight; // 确保滚动到底部
                                    resolve(originalMarkdownText); // Promise 完成，返回完整总结
                                    return;
                                }

                                // 将接收到的 Uint8Array 数据块解码为字符串，并追加到缓冲区
                                buffer += decoder.decode(value, { stream: true });
                                let lines = buffer.split('\n');
                                buffer = lines.pop();

                                // 遍历每一行接收到的数据
                                for (const line of lines) {
                                    if (line.startsWith('data: ')) {
                                        const dataStr = line.substring(6); // 提取JSON数据字符串
                                        // 检查是否是API发送的结束信号 "[DONE]"
                                        if (dataStr.trim() === '[DONE]') {
                                            contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText)); // 最终渲染
                                            contentContainer.scrollTop = contentContainer.scrollHeight; // 滚动到底部
                                            resolve(originalMarkdownText); // Promise 完成
                                            reader.cancel(); // 主动关闭读取流，防止后续操作
                                            return; // 结束处理
                                        }
                                        try {
                                            // 解析JSON数据块
                                            const chunk = JSON.parse(dataStr);
                                            // 检查数据结构是否符合预期，并提取内容
                                            if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                                                const textChunk = chunk.choices[0].delta.content; // 获取AI生成的文本片段
                                                originalMarkdownText += textChunk; // 累加到完整文本
                                                // 将累积的Markdown文本转换为HTML，并进行净化处理
                                                let htmlContent = DOMPurify.sanitize(marked.parse(originalMarkdownText));
                                                // 添加一个闪烁的光标效果，模拟打字过程，提升用户体验
                                                htmlContent += '<span class="thinking-cursor">▋</span>';
                                                contentContainer.innerHTML = htmlContent; // 更新UI显示
                                                // 实时滚动内容区域到底部，以便用户能看到新生成的内容
                                                contentContainer.scrollTop = contentContainer.scrollHeight;
                                            }
                                        } catch (e) {
                                            console.error('解析JSON块失败:', e, '原始数据:', dataStr);
                                        }
                                    }
                                }
                                processText(); // 递归调用，继续读取下一块数据
                            }).catch(err => {
                                // 捕获读取流时发生的错误
                                if (err.name === 'AbortError') {
                                    console.log('GM.xmlHttpRequest: reader.read() 中捕获到 AbortError (通常由用户操作触发)');
                                }
                                // 对于其他类型的错误，将其传递给Promise的reject处理
                                reject(err);
                            });
                        }
                        processText(); // 首次调用，启动流式数据处理
                    },
                    onerror: (response) => {
                        // 处理 GM.xmlHttpRequest 请求本身的错误 (例如网络问题、CORS等)
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
            throw error; // 重新抛出，以便调用方可以更新UI状态
        }
    }

    function initializeEvents(elements) {
        const { container, button, templateBtn, modal, overlay, dragHandle, settingsPanel, settingsOverlay, shadow, modelSelectionModal } = elements;

        // 确保elements完全初始化后再调用updateAllPromptSelectors
        if (!elements.shadow) {
            console.error('Shadow root not initialized for initializeEvents');
            return;
        }

        // 初始化拖动功能
        initializeDrag(container, dragHandle, shadow);

        const modelSelectModal = modal.querySelector('#ai-model-select-modal');
        const promptSelectModal = modal.querySelector('#ai-prompt-select-modal');

        function populateAllSelectors(elements) { // 接收 elements 作为参数
            updateAllPromptSelectors(elements); // 传递 elements
        }

        populateAllSelectors(elements); // 初始填充，传递 elements

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
                        updateAllPromptSelectors(elements); // 同步所有选择器
                        showToastNotification(`提示词已切换为: ${newIdentifier}`);
                    }
                });
            }
        });

        // Event listener for model selection in the modal
        const modelSelectInModalFromEvents = modal.querySelector('#ai-model-select-modal');
        if (modelSelectInModalFromEvents) {
            modelSelectInModalFromEvents.addEventListener('change', (e) => {
                const newModel = e.target.value;
                if (CONFIG.MODEL !== newModel) {
                    CONFIG.MODEL = newModel;
                    GM_setValue('MODEL', newModel);
                    showToastNotification(`模型已切换为: ${newModel}`);
                }
            });
        }



        // 右键打开设置菜单
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openSettings(elements); // 传递 elements
        });

        // 点击“打开模板”按钮
        templateBtn.addEventListener('click', () => {
             populateModalModelSelector(modal); // 在显示模态框前刷新模型列表
             if (typeof globalElements !== 'undefined' && globalElements && globalElements.shadow) {
                updateAllPromptSelectors(globalElements);
            }
             showModal(modal, overlay);
             const contentContainer = modal.querySelector('.ai-summary-content');
             if (originalMarkdownText && originalMarkdownText.trim() !== '') {
                 contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(originalMarkdownText));
             } else {
                 contentContainer.innerHTML = '<p>请选择一个模板或进行其他操作。</p>';
             }
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

                populateModalModelSelector(modal); // Refresh selector when opening modal
                updateAllPromptSelectors(elements); // 刷新所有选择器
                const modelForApi = modelSelectModal.value;
                if (!modelForApi) {
                    throw new Error('未配置模型，请在设置中选择一个模型。');
                }
                const summary = await summarizeContent(content, shadow, modelForApi);
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
                showToastNotification('总结内容尚未生成或已失效。');
                return;
            }
            let pageTitle = document.title.trim();
            let decodedPageTitle = '';
            if (pageTitle) {
                try {
                    decodedPageTitle = decodeURIComponent(pageTitle);
                } catch (e) {
                    console.warn('Failed to decode URI component in page title:', pageTitle, e);
                    decodedPageTitle = pageTitle; // Fallback to original if decoding fails
                }
            } else {
                decodedPageTitle = "Untitled_Page"; // Fallback if no title
            }

            const domain = window.location.hostname || "";
            
            // Combine decoded title and domain
            let baseFileName = `${decodedPageTitle} - ${domain}`;

            // Sanitize: remove illegal characters, replace spaces, ensure single underscores
            baseFileName = baseFileName.replace(/[<>:"/\\|?*~#%&{}\\$;'@`=!,+()[\]^]/g, '_'); // More comprehensive illegal char list for filenames
            baseFileName = baseFileName.replace(/\s+/g, ' '); // Replace all whitespace (including multiple spaces, tabs, newlines) with a single underscore
            baseFileName = baseFileName.replace(/_{2,}/g, '_'); // Replace multiple underscores with a single one
            baseFileName = baseFileName.replace(/^_|_$/g, ''); // Remove leading/trailing underscores

            // Truncate if too long (e.g., max 80 chars for the base part)
            const maxLength = 80;
            if (baseFileName.length > maxLength) {
                baseFileName = baseFileName.substring(0, maxLength);
                // Ensure it doesn't end with a partial multi-byte char or cut-off underscore
                baseFileName = baseFileName.replace(/_$/,''); // Remove trailing underscore if truncation created one
                baseFileName = baseFileName.replace(/^_|_$/g, ''); // Clean again after truncation
            }

            if (!baseFileName) { // If after all processing, it's empty
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
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        // 复制按钮功能
        modal.querySelector('.ai-copy-btn').addEventListener('click', () => {
            if (!originalMarkdownText) {
                showToastNotification('总结内容尚未生成或已失效。');
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
                showToastNotification('复制失败，请手动复制内容。');
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
        modal.querySelector('.ai-retry-btn').addEventListener('click', () => {
            button.click();
        });

        // 设置按钮功能（现在在模态框底部）
        modal.querySelector('.ai-settings-btn').addEventListener('click', () => openSettings(elements)); // 传递 elements

        // 关闭设置面板时，隐藏其覆盖层
        settingsPanel.querySelector('.cancel-btn').addEventListener('click', () => {
        });

        // 初始化设置面板的事件
        initializeSettingsEvents(settingsPanel, modal, settingsOverlay, modelSelectionModal, shadow, elements); // 传递 elements

        // 初始化时更新一次所有提示词选择器
        updateAllPromptSelectors(elements); // 传递 elements

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

    // 根据当前操作系统，获取快捷键的显示字符串
    function getSystemShortcutDisplay(shortcut) {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        if (!isMac) return shortcut;

        // 为 Mac 系统转换快捷键显示
        return shortcut.replace(/Alt\+/g, 'Option+')
                    .replace(/Ctrl\+/g, '⌘+')
                    .replace(/Meta\+/g, '⌘+');
    }

    function showModal(modal, overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
    }

    function hideModal(modal, overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    // 定义可能的停靠位置
    const DOCK_POSITIONS = {
        LEFT: 'left', // 左侧停靠
        RIGHT: 'right' // 右侧停靠
    };

    const DEBOUNCE_TIME = 10; // 防抖时间
    const FOLD_DELAY = 1000; // 折叠延迟时间


    // 将悬浮窗 (`container`) 的当前位置信息和状态保存到 `GM_setValue`。
    function savePosition(container) {
        const containerRect = container.getBoundingClientRect();
        const dockPosition = container.dataset.dockPosition || DOCK_POSITIONS.RIGHT; // 默认为右停靠
        let bottomValue;

        if (dockPosition === DOCK_POSITIONS.LEFT || dockPosition === DOCK_POSITIONS.RIGHT) {
            // 对于停靠状态，bottom 是相对于窗口底部计算的
            bottomValue = window.innerHeight - containerRect.bottom;
        } else {
            if (container.style.bottom && container.style.bottom !== 'auto') {
                bottomValue = parseFloat(container.style.bottom);
            } else if (container.style.top && container.style.top !== 'auto') {
                bottomValue = window.innerHeight - (parseFloat(container.style.top) + containerRect.height);
            } else {
                bottomValue = 20;
            }
        }

        const position = {
            bottom: `${Math.round(bottomValue)}px`, // 四舍五入并转为字符串
            dockPosition: dockPosition
        };
        GM_setValue('containerPosition', position);
    }

    function setDefaultPosition(container) {
        dockToRight(container); // 默认停靠到右侧
        container.style.bottom = '20px'; // 默认距离底部20px
        container.style.top = 'auto';
        savePosition(container); // 保存这个默认位置
    }


    function loadPosition(container) {
        const savedPosition = GM_getValue('containerPosition');
        container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn'); // 清理旧类

        if (savedPosition &&
            typeof savedPosition.bottom === 'string' &&
            (savedPosition.dockPosition === DOCK_POSITIONS.LEFT || savedPosition.dockPosition === DOCK_POSITIONS.RIGHT)) {

            container.style.bottom = savedPosition.bottom;
            container.style.top = 'auto'; // 确保基于底部定位

            if (savedPosition.dockPosition === DOCK_POSITIONS.LEFT) {
                dockToLeft(container);
            } else {
                dockToRight(container);
            }
            // 确保元素在屏幕内 (主要垂直方向，因为水平方向由停靠决定)
            const containerRect = container.getBoundingClientRect();
            const containerHeight = containerRect.height > 0 ? containerRect.height : 110; // 估算高度
            const bottomPx = parseFloat(savedPosition.bottom);

            if (window.innerHeight - bottomPx < 0) { // 如果底部超出视窗顶部
                container.style.bottom = `${window.innerHeight - containerHeight}px`;
            }
            if (bottomPx < 0) { // 如果底部低于视窗底部
                 container.style.bottom = '0px';
            }


        } else {
            // 如果没有有效的保存位置，或格式不正确，则设置默认位置
            setDefaultPosition(container);
        }
    }


    function initializeDrag(container, dragHandle, shadow) {
        let isDragging = false; // (行内注释) 布尔值，标记当前是否处于拖动操作状态。
        let currentX; // (行内注释) 数字，拖动过程中容器左上角的当前X坐标（相对于视口）。
        let currentY; // (行内注释) 数字，拖动过程中容器左上角的当前Y坐标（相对于视口）。
        let initialX; // (行内注释) 数字，鼠标按下时，鼠标指针相对于容器左上角的X轴偏移量。
        let initialY; // (行内注释) 数字，鼠标按下时，鼠标指针相对于容器左上角的Y轴偏移量。
        let foldTimeout; // (行内注释) 定时器ID，用于实现鼠标移开已停靠的悬浮窗后延迟自动折叠按钮区域。

        const style = document.createElement('style');
        style.textContent = `
            .ai-summary-container { /* (行内注释) 悬浮窗主容器的基础过渡效果，应用于 transform 属性。 */
                transition: left 0.2s ease-out, top 0.2s ease-out, right 0.2s ease-out, bottom 0.2s ease-out, transform 0.3s ease;
            }
            .ai-summary-container.docked { /* (行内注释) 容器处于停靠状态时的通用过渡效果，应用于所有可过渡的CSS属性。 */
                /* transition: all 0.3s ease; 已被上方更具体的 transition 覆盖，可移除或保留作为回退 */
            }
            .ai-drag-handle { /* (行内注释) 确保拖动手柄在任何状态下都能正确响应鼠标事件。 */
                pointer-events: auto !important;
            }
            /* (段落注释) 定义当容器停靠且未被鼠标悬停时，内部按钮和选择器如何隐藏。
               通过将宽度、内边距、透明度、高度都设置为0，并配合 transition 实现平滑的隐藏动画。*/
            .ai-summary-container.docked .ai-summary-btn,
            .ai-summary-container.docked .ai-template-btn,
            .ai-summary-container.docked .ai-main-prompt-selector {
                width: 0; /* (行内注释) 宽度为0 */
                padding: 0; /* (行内注释) 内边距为0 */
                opacity: 0; /* (行内注释) 透明度为0 */
                overflow: hidden; /* (行内注释) 隐藏溢出内容 */
                border: none; /* (行内注释) 移除边框 */
                height: 0; /* (行内注释) 高度为0 */
                transition: all 0.3s ease; /* (行内注释) 应用于所有属性的过渡动画 */
            }
            /* (段落注释) 定义当容器停靠且具有 'show-btn' 类（通常由鼠标悬停触发添加）或直接被鼠标悬停时，
               内部按钮和选择器如何恢复其原始尺寸和可见性，并配合过渡动画。*/
            .ai-summary-container.docked.show-btn .ai-summary-btn,
            .ai-summary-container.docked.show-btn .ai-template-btn,
            .ai-summary-container.docked.show-btn .ai-main-prompt-selector,
            .ai-summary-container.docked:hover .ai-summary-btn,
            .ai-summary-container.docked:hover .ai-template-btn,
            .ai-summary-container.docked:hover .ai-main-prompt-selector {
                width: 100%; /* (行内注释) 恢复完整宽度 */
                padding: 5px 15px; /* (行内注释) 恢复内边距 */
                opacity: 1; /* (行内注释) 完全可见 */
                height: 30px; /* (行内注释) 恢复原始高度 */
            }
            /* (行内注释) 特别为提示词选择器在展开时恢复其特有的内边距。 */
            .ai-summary-container.docked.show-btn .ai-main-prompt-selector,
            .ai-summary-container.docked:hover .ai-main-prompt-selector {
                padding: 0 5px;
            }
            /* (行内注释) 为总结按钮在展开时恢复其顶边框。 */
            .ai-summary-container.docked.show-btn .ai-summary-btn,
            .ai-summary-container.docked:hover .ai-summary-btn {
                 border-top: 1px solid rgba(107, 114, 128, 0.5);
            }
            .ai-summary-container.right-dock { /* (行内注释) 定义悬浮窗停靠在屏幕右侧时的定位规则。 */
                right: 0 !important; /* (行内注释) 强制右边距为0 */
                left: auto !important; /* (行内注释) 左边距自动 */
            }
            .ai-summary-container.left-dock { /* (行内注释) 定义悬浮窗停靠在屏幕左侧时的定位规则。 */
                left: 0 !important; /* (行内注释) 强制左边距为0 */
                right: auto !important; /* (行内注释) 右边距自动 */
            }
        `;
        shadow.appendChild(style);

        container.addEventListener('mouseenter', () => {
            clearTimeout(foldTimeout); // (行内注释) 清除可能存在的延迟折叠计时器
            if (container.classList.contains('docked')) { // (行内注释) 如果容器当前已停靠
                container.classList.add('show-btn'); // (行内注释) 添加 'show-btn' 类以立即展开按钮区域
            }
        });

        container.addEventListener('mouseleave', () => {
            if (container.classList.contains('docked')) { // (行内注释) 如果容器当前已停靠
                // (行内注释) 设置一个新的计时器，在 FOLD_DELAY 毫秒后移除 'show-btn' 类以折叠按钮区域
                foldTimeout = setTimeout(() => {
                    container.classList.remove('show-btn');
                }, FOLD_DELAY);
            }
        });

        // (行内注释) 防抖函数，用于限制高频事件（如窗口大小调整）的触发次数。
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

        loadPosition(container); // 初始化时，加载并应用悬浮窗上一次保存的位置和状态。

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = container.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;

            // 开始拖动时，暂时移除停靠类，使其可以自由移动，但保持其当前的 dockPosition 数据
            container.style.left = `${rect.left}px`; // 设置初始 left
            container.style.top = `${rect.top}px`;   // 设置初始 top
            container.style.right = 'auto';
            container.style.bottom = 'auto';
            container.classList.remove('docked', 'right-dock', 'left-dock', 'show-btn'); // 移除停靠类以便自由移动
            container.style.transition = 'none'; // 拖动时移除过渡效果，使其更流畅

            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            // 限制在视窗内
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const maxX = window.innerWidth - containerWidth;
            const maxY = window.innerHeight - containerHeight;

            currentX = Math.max(0, Math.min(currentX, maxX));
            currentY = Math.max(0, Math.min(currentY, maxY));

            container.style.left = `${currentX}px`;
            container.style.top = `${currentY}px`;
            container.style.right = 'auto'; // 明确在拖动时基于 left/top
            container.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = 'auto';
                container.style.transition = ''; // 恢复过渡效果，让吸附有动画

                const finalRect = container.getBoundingClientRect();

                // 决定停靠到哪一边
                if ((finalRect.left + finalRect.width / 2) < window.innerWidth / 2) {
                    dockToLeft(container);
                } else {
                    dockToRight(container);
                }

                // 设置最终的垂直位置 (通过bottom)
                container.style.top = 'auto'; // 清除 top 定位，改为 bottom 定位
                container.style.bottom = `${window.innerHeight - (currentY + finalRect.height)}px`;

                // 确保停靠后按钮是隐藏的，除非鼠标悬浮
                if (container.classList.contains('docked')) {
                     // 延迟一下移除 show-btn，确保动画效果，除非鼠标还在上面
                    setTimeout(() => {
                        if (!container.matches(':hover')) { // 检查鼠标是否还在容器上
                            container.classList.remove('show-btn');
                        }
                    }, 50); // 短暂延迟
                }
                savePosition(container);
            }
        });

        // 创建一个经过防抖处理的 loadPosition 函数版本，用于窗口大小调整事件。
        const debouncedLoadPosition = debounce(() => {
            loadPosition(container);
        }, DEBOUNCE_TIME);

        // (行内注释) 监听窗口的 `resize` 事件，当窗口大小改变时，调用防抖处理后的 `loadPosition` 函数，
        window.addEventListener('resize', debouncedLoadPosition);
    }

    function dockToLeft(container) {
        container.classList.add('docked', 'left-dock'); // (行内注释) 添加停靠和左侧停靠的CSS类
        container.dataset.dockPosition = DOCK_POSITIONS.LEFT; // (行内注释) 在dataset中记录停靠位置为左侧
        container.style.left = '0'; // (行内注释) 将容器的左边距设置为0，使其紧贴屏幕左边缘
        container.style.right = 'auto'; // (行内注释) 清除右边距定位，确保由左边距控制位置
    }

    function dockToRight(container) {
        container.classList.add('docked', 'right-dock'); // (行内注释) 添加停靠和右侧停靠的CSS类
        container.dataset.dockPosition = DOCK_POSITIONS.RIGHT; // (行内注释) 在dataset中记录停靠位置为右侧
        container.style.right = '0'; // (行内注释) 将容器的右边距设置为0，使其紧贴屏幕右边缘
        container.style.left = 'auto'; // (行内注释) 清除左边距定位，确保由右边距控制位置
    }

    let globalElements = {}; // 全局变量，用于存储脚本创建的主要UI元素的引用

    function main() {
        try {
            // 1. 加载配置
            loadConfig();

            // 2. 创建元素
            globalElements = createElements(); // 将 createElements() 的结果赋值给全局变量
            if (!globalElements || !globalElements.container) {
                console.error('AI_WebSummary: createElements() failed to return valid elements. Aborting initialization.');
                showToastNotification('AI Web Summary: 无法初始化悬浮窗核心元素，脚本可能无法正常工作。请检查浏览器控制台获取更多信息。');
                return;
            }

            // 3. 初始化事件
            initializeEvents(globalElements); // 传递 globalElements

            // 4. 检查配置是否完整，并处理首次打开
            const isDefaultApiKey = CONFIG.API_KEY === DEFAULT_CONFIG.API_KEY;

            if (isDefaultApiKey) {
                openSettings(globalElements); // 使用 openSettings 函数来正确打开和初始化设置面板
                if (isDefaultApiKey) {
                    // 只有当 API Key 是初始默认值时，才显示首次配置的欢迎信息
                    showToastNotification(`欢迎使用 AI 网页内容总结！请首次配置您的 API Key 和 Base URL。`);
                }
            }
        } catch (error) {
            console.error('AI_WebSummary: Critical error during script initialization:', error);
            // Fallback display mechanism
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
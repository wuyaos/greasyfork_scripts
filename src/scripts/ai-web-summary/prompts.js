

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



export { DEFAULT_CONFIG, PROMPT_TEMPLATES };

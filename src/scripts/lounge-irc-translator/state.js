

const state = {
    input: null,
    form: null,
    panel: null, // 常驻侧边面板根节点（挂在 body，不受 #form 重渲染影响）
    overlayMode: "", // '' | translate（译文预览确认中）
    translated: "", // 待确认译文
    previewSnapshot: "", // 翻译发起时的输入框原文快照（编辑即作废预览）
    errorText: "", // 失败态原文（重试用）
    errorRaw: "", // 失败态原文快照
    candidates: [], // 当前候选列表
    sending: false, // 派发 Enter 时防递归拦截
    suggestBusy: false, // 候选生成中（防 ↻/Ctrl+R 并发重入）
    spaceStreak: 0, // 三连空格计数
    spaceStreakAt: 0, // 上次空格时间戳
  };



export { state };

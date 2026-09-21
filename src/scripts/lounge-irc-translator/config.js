

const NS = "lit";

const CFG_KEY = `${NS}_config`;

const ICON_URL =
    "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/lounge-irc-translator.png";

const DEFAULT_CFG = {
    backend: "auto", // auto | llm | free；auto=配了 LLM 用 LLM，否则 MyMemory
    llmBase: "", // OpenAI 兼容 base，如 http://127.0.0.1:11434/v1
    llmKey: "",
    llmModel: "",
    ctxCount: 20, // 候选回答取最近 N 条消息
    candCount: 3, // 候选回答条数
    retries: 1, // 翻译失败重试次数
    channelTranslate: "on", // on | off：自动翻译页面内所有外文消息
    channelEngine: "google", // google | llm：频道消息翻译引擎
    thinking: "off", // off | on | model：LLM 思考模式（off=enable_thinking:false 保速度）
    hotkey: "space3", // space3 | tab | ctrlenter | off：就地翻译触发快捷键
    phrases: [], // 自定义常用短语（字符串数组，内置之外追加）
    stylePrompt: "", // 输入翻译与候选回答的风格指令（仅 LLM 生效，留空跟随频道风格）
  };

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;

const TOKEN_PREFIX = "__LIT";

const TOKEN_SUFFIX = "__";

const PROTECT_PATTERNS = [
    { re: /https?:\/\/\S+/g, key: "url" },
    { re: /(?<=^|\s)\/[A-Za-z][\w-]*(?:\s+[^\s#@/][^\s]*)?/g, key: "cmd" },
    { re: /#[A-Za-z0-9_\-[\]]+/g, key: "chan" },
    { re: /@[A-Za-z0-9_\-[\]]+/g, key: "nick" },
  ];



export { CFG_KEY, CJK_RE, DEFAULT_CFG, ICON_URL, NS, PROTECT_PATTERNS, TOKEN_PREFIX, TOKEN_SUFFIX };

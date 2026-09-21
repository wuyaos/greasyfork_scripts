// ==UserScript==
// @name         Lounge IRC 翻译助手
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.8.5
// @description  The Lounge IRC 翻译助手：频道外文消息自动翻译为中文（引擎可选谷歌/LLM），译文内联下划虚线跟随原文；常驻侧边面板提供候选回答与常用语（{nick} 点名、自定义增删），免展开；中文输入 Enter 预览确认（预览与频道消息同列）或快捷键就地翻译（三连空格/Tab/Ctrl+Enter 可选），风格提示词可自定义；LLM 思考模式可配置。/命令、#频道、昵称原样保留。
// @author       wuyaos & AI
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/lounge-irc-translator.png
// @match        http://192.168.123.115:9033/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// @noframes
// @license      MIT
// @downloadURL  https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Lounge_IRC_Translator.user.js
// @updateURL    https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Lounge_IRC_Translator.user.js
// ==/UserScript==

(() => {
  // ==================== 常量与状态 ====================

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
  // 占位保护：IRC 命令/频道/昵称/URL 与正文隔离，翻译后原样还原；用可读 token 而非控制字符（避免翻译 API 丢弃）
  const TOKEN_PREFIX = "__LIT";
  const TOKEN_SUFFIX = "__";
  // URL 必须先于 cmd 保护（否则 https:// 里的 //path 会被当 /命令）；cmd 用 lookbehind 要求 / 前是行首或空白，避免引入捕获组
  const PROTECT_PATTERNS = [
    { re: /https?:\/\/\S+/g, key: "url" },
    { re: /(?<=^|\s)\/[A-Za-z][\w-]*(?:\s+[^\s#@/][^\s]*)?/g, key: "cmd" },
    { re: /#[A-Za-z0-9_\-[\]]+/g, key: "chan" },
    { re: /@[A-Za-z0-9_\-[\]]+/g, key: "nick" },
  ];
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

  // ==================== Adapter 层（The Lounge） ====================

  function locateInput() {
    return document.querySelector("#input");
  }

  function locateForm() {
    return (
      document.querySelector("#form") ||
      (state.input && state.input.closest("form"))
    );
  }

  // 发送：填入译文 → 派发 Enter keydown 交给 The Lounge 原生处理；
  // 若 The Lounge 未消费（输入框未被清空）则补 dispatch submit 兜底，异步检查避免双发
  function sendText(text) {
    if (!text) return;
    state.sending = true;
    state.input.value = text;
    state.input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      }),
    );
    setTimeout(() => {
      if (state.input && state.input.value !== "") {
        state.form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      }
      state.sending = false;
    }, 150);
  }

  // 取最近 N 条普通消息：正文 .content、昵称 .from .user；过滤系统行(***)、join/quit、折叠行、action
  function collectContext(count) {
    const rows = activeMsgRows();
    const out = [];
    for (let i = rows.length - 1; i >= 0 && out.length < count; i--) {
      const row = rows[i];
      if (row.classList.contains("closed") || row.classList.contains("action"))
        continue;
      const from = nickOf(row.querySelector(".from .user"));
      const text = clean(row.querySelector(".content")?.textContent);
      if (!from || !text || from === "***" || text.startsWith("***")) continue;
      out.unshift(`${from}: ${text}`);
    }
    return out.join("\n");
  }

  // ==================== 用户名识别 ====================

  // The Lounge 的昵称节点：.user 元素带 data-name（精确拼写），textContent 兜底
  function nickOf(node) {
    if (!node) return "";
    return clean(node.getAttribute?.("data-name") || node.textContent || "");
  }

  // 只取当前激活频道的消息行：#chat 下所有频道窗口都常驻 DOM，不限定会把别的频道历史混进上下文
  function activeMsgRows() {
    const rows = [
      ...document.querySelectorAll("#chat .chan.active .messages .msg"),
    ];
    return rows.length
      ? rows
      : [...document.querySelectorAll("#chat .messages .msg")];
  }

  // 自己的昵称：The Lounge 在输入区 #nick 常显当前昵称
  function selfNick() {
    return clean(document.querySelector("#nick")?.textContent || "");
  }

  // {nick} 解析目标：最新消息里提及的用户（content 内 .user[data-name]）优先，
  // 其次最近一个非自己的发言者；跳过系统行/折叠行/自己
  function lastSpeakerNick() {
    const me = selfNick();
    for (const row of activeMsgRows().reverse()) {
      if (row.classList.contains("closed") || row.classList.contains("action"))
        continue;
      const mentioned = [...row.querySelectorAll(".content .user")]
        .map(nickOf)
        .find((n) => n && n !== me);
      if (mentioned) return mentioned;
      const from = nickOf(row.querySelector(".from .user"));
      if (!from || from === "***" || from === me) continue;
      return from;
    }
    return "";
  }

  // {nick} 占位符：点击短语时替换为识别到的用户名，无则去占位符收尾
  function resolvePhrase(phrase) {
    if (!phrase.includes("{nick}")) return phrase;
    const nick = lastSpeakerNick();
    return phrase
      .split("{nick}")
      .join(nick)
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // ==================== Protect 层（占位保护） ====================

  function protect(text) {
    const tokens = [];
    let out = text;
    for (const pattern of PROTECT_PATTERNS) {
      out = out.replace(pattern.re, (match) => {
        const token = `${TOKEN_PREFIX}${tokens.length}${TOKEN_SUFFIX}`;
        tokens.push(match);
        return token;
      });
    }
    return { protected: tokens, text: out };
  }

  function restore(text, tokens) {
    let out = String(text || "");
    tokens.forEach((token, index) => {
      out = out.split(`${TOKEN_PREFIX}${index}${TOKEN_SUFFIX}`).join(token);
    });
    // 兜底：未被还原的占位符（API 改写等）清理掉，避免漏出内部 token
    return out.replace(
      new RegExp(`${TOKEN_PREFIX}\\d+${TOKEN_SUFFIX}`, "g"),
      "",
    );
  }

  // ==================== Translator 层 ====================

  async function translate(text) {
    const cfg = getCfg();
    const useLLM = cfg.backend !== "free" && !!cfg.llmBase && !!cfg.llmModel;
    const attempts = Math.max(0, parseInt(cfg.retries, 10) || 0) + 1;
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return useLLM
          ? await translateLLM(
              text,
              translatePrompt(text, collectContext(STYLE_REF_COUNT)),
            )
          : await translateFree(text);
      } catch (error) {
        lastError = error;
        if (i < attempts - 1) await sleep(400);
      }
    }
    throw lastError || new Error("翻译失败");
  }

  async function translateLLM(text, system) {
    const cfg = getCfg();
    if (!cfg.llmBase || !cfg.llmModel)
      throw new Error("未配置 LLM（设置里填 Base URL 与模型名）");
    const base = cfg.llmBase.replace(/\/+$/, "");
    const res = await gmJson({
      method: "POST",
      url: `${base}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        ...(cfg.llmKey ? { Authorization: `Bearer ${cfg.llmKey}` } : {}),
      },
      data: JSON.stringify({
        model: cfg.llmModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        // 思考模式：off=enable_thinking:false（Qwen/vLLM/new-api 约定，保速度）；on=强制开启；model=不发参数跟随默认
        ...(cfg.thinking === "off"
          ? { enable_thinking: false }
          : cfg.thinking === "on"
            ? { enable_thinking: true }
            : {}),
      }),
    });
    const content = res.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM 无返回内容");
    return content.trim();
  }

  // 频道风格参考：取最近 N 条消息给 LLM 模仿语气（仅 LLM 模式；免费 API 无此能力）
  const STYLE_REF_COUNT = 8;
  function translatePrompt(text, styleCtx) {
    const styleBlock = styleCtx
      ? `Channel style reference (recent messages, mimic this tone):\n${styleCtx}\n`
      : "";
    // 用户自定义风格指令优先；留空则跟随频道实际聊天风格
    const tone = clean(getCfg().stylePrompt)
      ? `Translate the user's Chinese message into English following this style directive: ${clean(getCfg().stylePrompt)}.`
      : "Translate the user's Chinese message into short, natural, colloquial English matching the channel's actual chat style.";
    return `You are an IRC chat translator for an open-source community channel. ${tone}
Hard rules:
1. Keep it short and natural — no formal or long sentences, no polite filler.
2. Preserve the original meaning; do not add or remove content.
3. Return ONLY the translation — no explanations, no quotes, no notes.
${styleBlock}Text: ${text}`;
  }

  // MyMemory 免费翻译：无需 key；限流时抛明确错误
  async function translateFree(text) {
    const q = text.slice(0, 500);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=zh-CN|en-GB`;
    const res = await gmJson({ method: "GET", url });
    if (res.responseStatus === 403 || res.responseStatus === 429)
      throw new Error("MyMemory 限流，请稍后重试或配置 LLM");
    const out = res.responseData?.translatedText;
    if (!out) throw new Error("MyMemory 无结果");
    return out.trim();
  }

  // ==================== Suggester 层（候选回答） ====================

  async function generateSuggestions() {
    if (state.suggestBusy) return; // 生成中忽略重复触发
    const cfg = getCfg();
    if (!cfg.llmBase || !cfg.llmModel) {
      renderSuggestNote(
        "候选回答需要 LLM：请在「翻译助手设置」配置 Base URL 与模型名",
        true,
      );
      return;
    }
    const ctx = collectContext(cfg.ctxCount);
    if (!ctx.length) {
      renderSuggestNote("没有可用的上文消息", true);
      return;
    }
    renderSuggestNote("生成中…");
    state.suggestBusy = true;
    try {
      // 自定义风格指令优先；留空保持母语者随口闲聊风格
      const tone = clean(cfg.stylePrompt)
        ? ` Style: ${clean(cfg.stylePrompt)}.`
        : " Keep them short and informal, like a native speaker chatting casually.";
      // 用户名识别：#nick=自己；最近发言者=最可能的回复对象（LLM 按上下文精确拼写点名）
      const me = selfNick();
      const target = lastSpeakerNick();
      const selfHint = me
        ? `- You are ${me}; never reply to your own messages.\n`
        : "";
      const targetHint =
        target && target !== me
          ? `- The latest message is from ${target}; if replying to them, start with "${target}:".\n`
          : "";
      const system = `You are chatting in an open-source community IRC channel. Below is the recent conversation (nick: message).
Write ${cfg.candCount} candidate replies you could send next.${tone}
Rules:
- Each reply under 15 words; no polite filler; match the conversation tone.
- If replying to a specific user, start with their nick and a colon, using the exact nick spelling from the conversation.
${selfHint}${targetHint}- Return ONLY ${cfg.candCount} lines, each in the exact format: english reply ||| 中文大意
Conversation:\n${ctx}`;
      const raw = await translateLLM("", system);
      const candidates = raw
        .split(/\n+/)
        .map((line) => {
          // 兼容模型输出 |||/||/| 分隔；分隔符缺失时按首个中文位置兜底切分，避免中文混进待发送文本
          const parts = line.split(/\s*\|{2,}\s*/);
          let en = parts[0].replace(/^[\s\-*\d.)]+/, "").trim();
          let zh = (parts[1] || "").trim();
          if (!zh) {
            const cjkAt = en.search(CJK_RE);
            if (cjkAt > 0) {
              zh = en.slice(cjkAt).trim();
              en = en
                .slice(0, cjkAt)
                .replace(/[\s|~—-]+$/, "")
                .trim();
            }
          }
          if (!en) return null;
          return { en, zh };
        })
        .filter(Boolean)
        .slice(0, cfg.candCount);
      if (!candidates.length) throw new Error("LLM 未返回候选");
      state.candidates = candidates;
      renderSuggestions(candidates);
    } catch (error) {
      renderSuggestNote(`生成失败：${error.message || error}`, true);
    } finally {
      state.suggestBusy = false;
    }
  }

  // 候选回答渲染进侧边面板：编号列表，点击英文填入输入框，中文仅作提示（Alt+1-N 同效）
  function renderSuggestions(candidates, hint) {
    const body = state.panel.querySelector(".lit-suggest-body");
    body.classList.remove("lit-panel-empty", "lit-error");
    body.textContent = "";
    candidates.forEach((cand, index) => {
      const item = el(
        "div",
        { class: "lit-cand" },
        el("span", { class: "lit-cand-num" }, String(index + 1)),
        el(
          "div",
          { class: "lit-cand-col" },
          el("div", { class: "lit-cand-en" }, cand.en),
          cand.zh ? el("div", { class: "lit-cand-zh" }, cand.zh) : null,
        ),
      );
      item.addEventListener("click", () => fillCandidate(cand.en));
      body.append(item);
    });
    body.append(
      el(
        "div",
        { class: "lit-panel-hint" },
        hint || `点击或 Alt+1-${candidates.length} 填入输入框`,
      ),
    );
  }

  function renderSuggestNote(text, isError = false) {
    const body = state.panel.querySelector(".lit-suggest-body");
    body.classList.remove("lit-error");
    body.classList.add("lit-panel-empty");
    if (isError) body.classList.add("lit-error");
    body.textContent = text;
  }

  // 内置常用语：源自 GGN 频道真实高频表达（#afterhours 等频道全用户历史统计，剔除 bot 播报与裸昵称），按使用场景分组；{nick} 占位符点击时替换为最近发言者/提及者
  const BUILTIN_PHRASES = [
    {
      group: "反应",
      items: [
        "lol",
        "lmao",
        "lmfao",
        "haha",
        "xd",
        "nice",
        "nice mine",
        "nice lines",
        "wow",
        "oh nice",
        "oh wow",
        "oh yeah",
        "hell yeah",
        "oh no",
        "oof",
        "wtf",
        "rip",
        "damn",
        "omg",
        "congrats",
        "yay",
      ],
    },
    {
      group: "认同回应",
      items: [
        "yes",
        "yeah",
        "yep",
        "nope",
        "nah",
        "sure",
        "same",
        "true",
        "exactly",
        "indeed",
        "interesting",
        "idk",
        "gotcha",
      ],
    },
    {
      group: "问候社交",
      items: [
        "hi",
        "hello",
        "yo",
        "hey",
        "o/",
        "good morning",
        "good morning everyone",
        "good night",
        "how are you",
        "me too",
        "bye",
      ],
    },
    {
      group: "点名（{nick}=最近用户）",
      items: [
        "congrats {nick}",
        "hi {nick}",
        "thanks {nick}",
        "gg {nick}",
        "o/ {nick}",
      ],
    },
    {
      group: "表情",
      items: ["<3", "¯\\_(ツ)_/¯", "👀"],
    },
  ];

  function getPhrases() {
    const custom = Array.isArray(getCfg().phrases) ? getCfg().phrases : [];
    return custom.length
      ? [{ group: "自定义", items: custom }, ...BUILTIN_PHRASES]
      : BUILTIN_PHRASES;
  }

  function savePhrases(custom) {
    setCfg({ ...getCfg(), phrases: custom });
  }

  // 短语面板：按情形分组的小方块流式布局，点击填入；自定义短语带 × 可删，底部输入行可添加
  function renderPhrases() {
    const body = state.panel.querySelector(".lit-phrases-body");
    body.textContent = "";
    const custom = new Set(
      Array.isArray(getCfg().phrases) ? getCfg().phrases : [],
    );
    getPhrases().forEach(({ group, items }) => {
      body.append(el("div", { class: "lit-chip-group" }, group));
      const chips = el("div", { class: "lit-chips" });
      items.forEach((phrase) => {
        const chip = el(
          "span",
          {
            class: "lit-chip",
            title: phrase.includes("{nick}")
              ? "点击填入，{nick} 自动替换为最近发言者/提及者"
              : custom.has(phrase)
                ? "自定义短语"
                : "点击填入",
          },
          phrase,
        );
        chip.addEventListener("click", () =>
          fillCandidate(resolvePhrase(phrase)),
        );
        if (custom.has(phrase)) {
          const x = el("span", { class: "lit-chip-x", title: "删除" }, "×");
          x.addEventListener("click", (event) => {
            event.stopPropagation();
            savePhrases(getCfg().phrases.filter((p) => p !== phrase));
            renderPhrases();
          });
          chip.append(x);
        }
        chips.append(chip);
      });
      body.append(chips);
    });
    const add = el("div", { class: "lit-phrase-add" });
    const input = el("input", {
      type: "text",
      placeholder: "添加自定义短语，Enter 确认",
    });
    const btn = el("button", { type: "button", class: "lit-btn" }, "添加");
    const addPhrase = () => {
      const phrase = clean(input.value);
      if (!phrase) return;
      if (
        getPhrases().some(({ items }) =>
          items.some((p) => p.toLowerCase() === phrase.toLowerCase()),
        )
      ) {
        input.value = "";
        return;
      }
      savePhrases([...(getCfg().phrases || []), phrase]);
      renderPhrases();
      state.panel.querySelector(".lit-phrase-add input")?.focus();
    };
    btn.addEventListener("click", addPhrase);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addPhrase();
      }
    });
    add.append(input, btn);
    body.append(add);
  }

  // ==================== 频道消息翻译（外文 → 中文） ====================

  // 缓存键带引擎前缀：切谷歌/LLM 后不会串用另一引擎的旧译文
  function msgCacheKey(text) {
    return `${getCfg().channelEngine}\u0000${text}`;
  }
  // 消息译文 GM 持久缓存（重启不丢；上限 500 条 FIFO，防无限增长）
  const MSG_CACHE_KEY = `${NS}_msg_cache`;
  const MSG_CACHE_MAX = 500;
  function msgCacheGet(text) {
    try {
      const cache = GM_getValue(MSG_CACHE_KEY, {}) || {};
      return cache[text] || "";
    } catch {
      return "";
    }
  }
  function msgCacheSet(text, translated) {
    try {
      const cache = GM_getValue(MSG_CACHE_KEY, {}) || {};
      if (cache[text] === translated) return;
      cache[text] = translated;
      const keys = Object.keys(cache);
      if (keys.length > MSG_CACHE_MAX) delete cache[keys[0]];
      GM_setValue(MSG_CACHE_KEY, cache);
    } catch {}
  }
  const autoQueue = [];
  let autoRunning = false;
  // 自适应限速：失败翻倍（退避），成功减半回落——避免 gtx 连续请求被限流后整批消息被跳过
  let queueDelay = 400;
  const QUEUE_DELAY_MIN = 400;
  const QUEUE_DELAY_MAX = 4000;
  let sweepTimer = 0;
  // SPA 重渲染可能替换 #input/#form 节点：检测失联并重新定位，快捷键/预览不失效
  function ensureBound() {
    if (state.input && state.input.isConnected) return;
    const input = locateInput();
    if (!input) return;
    state.input = input;
    state.form = locateForm();
    ensureOverlayInForm();
  }

  // 全量扫描当前激活频道：未翻译的可翻译消息统一入队（backlog/新消息/切频道/失败重试统一入口），配合队列 unshift 实现「最新优先」
  function sweepChannel() {
    ensureBound(); // SPA 重渲染替换 #input 后自愈重绑
    if (getCfg().channelTranslate !== "on") return;
    // 每次进入频道给「永久跳过」的消息一次新机会：限流通常已过，重置失败计数（单次访问最多再试 3 次，不会死循环）
    activeMsgRows().forEach((row) => {
      if (row.dataset.litFail) {
        delete row.dataset.litFail;
        delete row.dataset.litFails;
      }
    });
    activeMsgRows().forEach((row) => enqueueAuto(row));
  }
  function scheduleSweep(delay = 300) {
    clearTimeout(sweepTimer);
    sweepTimer = setTimeout(sweepChannel, delay);
  }

  function attachChatObserver() {
    const chat = document.querySelector("#chat") || document.body;
    const observer = new MutationObserver((mutations) => {
      if (getCfg().channelTranslate !== "on") return;
      // 新消息挂载或频道切换（active 类迁移）都触发防抖扫描
      const relevant = mutations.some(
        (m) =>
          m.type === "attributes" ||
          [...m.addedNodes].some(
            (n) =>
              n.nodeType === 1 &&
              (n.matches?.(".msg") || n.querySelector?.(".msg")),
          ),
      );
      if (relevant) scheduleSweep();
    });
    observer.observe(chat, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    sweepChannel();
  }

  function enqueueAuto(row) {
    if (row.dataset.litQueued || row.dataset.litDone || row.dataset.litFail)
      return;
    if (!isTranslatableMsg(row)) return;
    const text = clean(row.querySelector(".content")?.textContent);
    if (!text) return;
    // 缓存命中：免队列即时渲染（刷新后整页译文秒出，不吃限速间隔）
    const cached = msgCacheGet(msgCacheKey(text));
    if (cached) {
      row.dataset.litDone = "1";
      renderMsgTranslation(row, cached);
      return;
    }
    row.dataset.litQueued = "1";
    // unshift 插到队首：全局按最新优先处理，新消息不被历史 backlog 淹没
    autoQueue.unshift(row);
    if (!autoRunning) {
      autoRunning = true;
      processAutoQueue();
    }
  }

  // 串行翻译队列：自适应限速 + unshift 最新优先；排空后补扫捞起新消息/切频道/失败重试
  async function processAutoQueue() {
    if (getCfg().channelTranslate !== "on") {
      // 用户已关闭自动翻译：丢弃剩余队列
      autoQueue.length = 0;
      autoRunning = false;
      return;
    }
    const row = autoQueue.shift();
    if (row) {
      await translateMsg(row);
      await sleep(queueDelay);
    }
    if (autoQueue.length) processAutoQueue();
    else {
      autoRunning = false;
      // 排空后补一轮扫描：捞起新消息/频道切换/失败重试
      scheduleSweep(1000);
    }
  }

  // 可翻译：非系统/折叠/action 行、有昵称正文、非中文、长度 >1
  function isTranslatableMsg(row) {
    if (row.classList.contains("closed") || row.classList.contains("action"))
      return false;
    const from = clean(
      row.querySelector(".from .user")?.textContent ||
        row.querySelector(".from")?.textContent,
    );
    if (!from || from === "***") return false;
    const text = clean(row.querySelector(".content")?.textContent);
    if (!text || text.startsWith("***") || CJK_RE.test(text)) return false;
    return text.length > 1;
  }

  async function translateMsg(row) {
    try {
      const text = clean(row.querySelector(".content")?.textContent);
      if (!text) return;
      // 缓存键带引擎前缀：切谷歌/LLM 后不会串用另一引擎的旧译文
      const cacheKey = msgCacheKey(text);
      let translated = msgCacheGet(cacheKey);
      if (!translated) {
        translated = await translateToZh(text);
        msgCacheSet(cacheKey, translated);
      }
      row.dataset.litDone = "1";
      renderMsgTranslation(row, translated);
      row.dataset.litDone = "1";
      renderMsgTranslation(row, translated);
      // 成功：间隔减半回落，尽快恢复吞吐
      queueDelay = Math.max(QUEUE_DELAY_MIN, Math.floor(queueDelay / 2));
    } catch (error) {
      // 失败：间隔翻倍退避（最高 4s），给限流接口喘息；连续 3 次失败才本会话跳过，
      // 且切换频道时 sweepChannel 会重置失败标记再给机会
      queueDelay = Math.min(QUEUE_DELAY_MAX, queueDelay * 2);
      const fails = (parseInt(row.dataset.litFails || "0", 10) || 0) + 1;
      row.dataset.litFails = String(fails);
      delete row.dataset.litQueued;
      if (fails >= 3) row.dataset.litFail = "1";
    }
  }

  function renderMsgTranslation(row, translated) {
    const content = row.querySelector(".content");
    if (!content) return;
    // 译文内联跟在原文之后（同一段落内续排），下划虚线区分
    content.append(el("span", { class: "lit-msg-trans" }, translated));
  }

  // 外文 → 中文：引擎可选 google（gtx 免 key）/ llm（走已配置模型）；译文 GM 持久缓存
  async function translateToZh(text) {
    const cfg = getCfg();
    if (cfg.channelEngine === "llm") {
      return translateLLM(
        text,
        `You are an IRC chat translator. Translate the following IRC message into natural, concise Simplified Chinese. Keep nicknames, /commands, #channels, URLs and technical terms as-is. Return ONLY the translation, no quotes or explanations.\nMessage: ${text}`,
      );
    }
    // gtx：sl=auto 自动检测源语言，tl=zh-CN
    const q = text.slice(0, 800);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(q)}`;
    const res = await gmJson({ method: "GET", url });
    // gtx 返回 [["译","源",…],…] 分段数组，按序拼接
    const segs = Array.isArray(res?.[0]) ? res[0] : null;
    const out = segs ? segs.map((seg) => seg?.[0] || "").join("") : "";
    if (!out.trim()) throw new Error("谷歌翻译无结果");
    return out.trim();
  }
  // ==================== UI 层 ====================

  function buildUI() {
    ensureStyle();
    // 译文预览浮层：挂在 #form 内、输入框上方，与频道消息同列显示
    state.overlay = el("div", { id: `${NS}-overlay`, class: `${NS}-hidden` });
    state.overlay.append(
      el(
        "div",
        { class: "lit-panel-sec-head" },
        el("span", {}, "译文预览"),
        el(
          "span",
          { class: "lit-head-actions" },
          el(
            "button",
            {
              type: "button",
              class: "lit-icon lit-retry",
              title: "重试翻译原文",
            },
            "↻",
          ),
          el(
            "button",
            {
              type: "button",
              class: "lit-icon lit-close",
              title: "取消 (Esc)",
            },
            "×",
          ),
        ),
      ),
      el("div", { class: "lit-preview-body" }),
      el("div", { class: "lit-panel-hint" }),
    );
    state.overlay
      .querySelector(".lit-close")
      .addEventListener("click", hideOverlay);
    state.overlay
      .querySelector(".lit-retry")
      .addEventListener("click", retryTranslate);
    ensureOverlayInForm();
    // 常驻侧边面板：候选回答 + 常用语（免展开，挂在 body 不受 #form 重渲染影响）
    const panel = el(
      "div",
      { id: `${NS}-panel` },
      el(
        "div",
        { class: "lit-panel-head" },
        el(
          "strong",
          {},
          el("img", {
            src: ICON_URL,
            alt: "",
            onerror: "this.style.display='none'",
          }),
          " 翻译助手",
        ),
        el(
          "button",
          {
            type: "button",
            class: "lit-icon lit-panel-trans",
            title: "翻译输入框内容（中文→英文）",
          },
          "🌐",
        ),
        el(
          "button",
          { type: "button", class: "lit-icon lit-panel-cfg", title: "设置" },
          "⚙",
        ),
      ),
      el(
        "div",
        { class: "lit-panel-sec" },
        el(
          "div",
          { class: "lit-panel-sec-head" },
          el("span", {}, "候选回答"),
          el(
            "button",
            {
              type: "button",
              class: "lit-icon lit-suggest-btn",
              title: "生成/刷新 (Ctrl+R)",
            },
            "↻",
          ),
        ),
        el(
          "div",
          { class: "lit-suggest-body lit-panel-empty" },
          "Ctrl+R 根据上文生成候选",
        ),
      ),
      el(
        "div",
        { class: "lit-panel-sec lit-panel-phrases-sec" },
        el("div", { class: "lit-panel-sec-head" }, el("span", {}, "常用语")),
        el("div", { class: "lit-phrases-body" }),
        el(
          "div",
          { class: "lit-phrase-add" },
          el("input", {
            type: "text",
            placeholder: "添加自定义短语，Enter 确认",
          }),
          el("button", { type: "button", class: "lit-btn" }, "添加"),
        ),
      ),
    );
    state.panel = panel;
    document.body.append(panel);
    panel.querySelector(".lit-panel-trans").addEventListener("click", () => {
      const text = clean(state.input.value);
      if (text) translateAndPreview(text);
    });
    panel
      .querySelector(".lit-panel-cfg")
      .addEventListener("click", openSettings);
    panel
      .querySelector(".lit-suggest-btn")
      .addEventListener("click", () => generateSuggestions());
    panel
      .querySelector(".lit-phrase-add input")
      .addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addPhraseFromInput();
        }
      });
    panel
      .querySelector(".lit-phrase-add .lit-btn")
      .addEventListener("click", addPhraseFromInput);
    renderPhrases();
    // Esc 取消预览 / Alt+1-N 填入候选
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && state.overlayMode) hideOverlay();
        if (
          state.candidates.length &&
          state.overlayMode !== "translate" &&
          event.altKey &&
          /^[1-9]$/.test(event.key)
        ) {
          const index = parseInt(event.key, 10) - 1;
          const cand = state.candidates[index];
          if (cand) {
            event.preventDefault();
            fillCandidate(cand.en);
          }
        }
      },
      true,
    );
  }

  // #form 被 The Lounge 重渲染后浮层会被移出 DOM：重新挂回并补齐布局样式
  function ensureOverlayInForm() {
    if (!state.overlay) return;
    if (!state.overlay.isConnected) {
      state.form = locateForm() || state.form;
      if (state.form) {
        state.form.style.display = state.form.style.display || "flex";
        state.form.style.flexWrap = "wrap";
        state.form.append(state.overlay);
      }
    }
  }

  function addPhraseFromInput() {
    const input = state.panel.querySelector(".lit-phrase-add input");
    const phrase = clean(input.value);
    if (!phrase) return;
    if (
      getPhrases().some(({ items }) =>
        items.some((p) => p.toLowerCase() === phrase.toLowerCase()),
      )
    ) {
      input.value = "";
      return;
    }
    savePhrases([...(getCfg().phrases || []), phrase]);
    renderPhrases();
    state.panel.querySelector(".lit-phrase-add input")?.focus();
  }

  // 预览浮层（译文确认）：仅 translate 模式使用，挂在 #form 内与频道消息同列
  function showPreview(content, hint, isError = false) {
    state.overlayMode = "translate";
    ensureOverlayInForm();
    state.overlay.classList.remove(`${NS}-hidden`);
    state.overlay.querySelector(".lit-retry").style.display = isError
      ? ""
      : "none";
    const body = state.overlay.querySelector(".lit-preview-body");
    body.textContent = "";
    if (content) body.append(el("div", { class: "lit-translated" }, content));
    setOverlayHint(hint, isError);
  }

  function setOverlayHint(text, isError = false) {
    const hint = state.overlay.querySelector(".lit-panel-hint");
    hint.textContent = text || "";
    hint.classList.toggle("lit-error", !!isError);
  }

  function hideOverlay() {
    // 仅取消译文预览；候选/短语常驻侧边面板，不清空
    state.overlayMode = "";
    state.translated = "";
    state.previewSnapshot = "";
    state.errorRaw = "";
    state.overlay.classList.add(`${NS}-hidden`);
  }

  function fillCandidate(text) {
    state.input.value = text;
    state.input.focus();
    hideOverlay();
  }

  // ==================== 翻译预览流程 ====================

  async function translateAndPreview(rawText) {
    const { protected: tokens, text: body } = protect(rawText);
    if (!body.trim()) return; // 全是命令/链接等，无需翻译
    state.previewSnapshot = rawText;
    state.errorRaw = rawText;
    showPreview(null, "翻译中…");
    try {
      const translated = restore(await translate(body), tokens);
      if (!translated.trim()) throw new Error("翻译结果为空");
      state.translated = translated;
      showPreview(translated, `Enter 发送译文 · Esc 取消 · 编辑输入框作废`);
    } catch (error) {
      showPreview(
        null,
        `翻译失败：${error.message || error} · 重试或 Esc 后直接发送原文`,
        true,
      );
    }
  }

  // 就地翻译（三连空格触发）：输入框直接替换为译文，可继续编辑后 Enter 原生发送
  async function translateInPlace(rawText) {
    const input = state.input;
    const { protected: tokens, text: body } = protect(rawText);
    if (!body.trim()) return; // 整行命令/链接等，无需翻译
    state.errorRaw = rawText;
    try {
      const translated = restore(await translate(body), tokens);
      if (!translated.trim()) throw new Error("翻译结果为空");
      if (state.input === input) {
        input.value = translated;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.setSelectionRange(translated.length, translated.length);
      }
    } catch (error) {
      showPreview(
        null,
        `就地翻译失败：${error.message || error} · 可 Esc 关闭后重试`,
        true,
      );
    }
  }

  // 预览失败后的 ↻：用失败原文重试
  function retryTranslate() {
    if (state.errorRaw) translateAndPreview(state.errorRaw);
  }

  // ==================== Config 层 ====================

  function getCfg() {
    let cfg = {};
    try {
      cfg = GM_getValue(CFG_KEY, {}) || {};
    } catch {}
    const merged = { ...DEFAULT_CFG, ...cfg };
    // 旧版本 hover/auto 模式统一迁移为 on（全页自动翻译）
    if (merged.channelTranslate !== "off") merged.channelTranslate = "on";
    return merged;
  }

  function setCfg(cfg) {
    GM_setValue(CFG_KEY, { ...DEFAULT_CFG, ...cfg });
  }

  // ==================== 设置弹窗 ====================

  function openSettings() {
    const cfg = getCfg();
    ensureStyle();
    document.querySelector(`#${NS}-modal`)?.remove();
    const overlay = el("div", { id: `${NS}-modal`, class: "lit-modal" });
    const close = el("button", { type: "button", class: "lit-icon" }, "×");
    const backend = el(
      "select",
      {},
      el(
        "option",
        { value: "auto" },
        "自动（有 LLM 配置用 LLM，否则免费 API）",
      ),
      el("option", { value: "llm" }, "LLM（口语风格，推荐）"),
      el("option", { value: "free" }, "MyMemory 免费 API"),
    );
    backend.value = cfg.backend;
    const llmBase = el("input", {
      type: "text",
      placeholder: "http://127.0.0.1:11434/v1",
      value: cfg.llmBase,
    });
    const llmKey = el("input", {
      type: "password",
      placeholder: "API Key（本地模型可留空）",
      value: cfg.llmKey,
    });
    const llmModel = el("input", {
      type: "text",
      placeholder: "如 llama3.1 / deepseek-chat",
      value: cfg.llmModel,
    });
    const stylePrompt = el("input", {
      type: "text",
      placeholder:
        "风格指令，如：casual gamer slang, lowercase（留空跟随频道）",
      value: cfg.stylePrompt || "",
    });
    const hotkeySel = el(
      "select",
      {},
      el("option", { value: "space3" }, "三连空格（700ms 内，默认）"),
      el("option", { value: "tab" }, "Tab 键"),
      el("option", { value: "ctrlenter" }, "Ctrl+Enter"),
      el("option", { value: "off" }, "不使用快捷键"),
    );
    hotkeySel.value = ["tab", "ctrlenter", "off"].includes(cfg.hotkey)
      ? cfg.hotkey
      : "space3";
    const thinkingSel = el(
      "select",
      {},
      el("option", { value: "off" }, "关闭思考（默认，响应更快）"),
      el("option", { value: "on" }, "开启思考"),
      el("option", { value: "model" }, "跟随模型默认"),
    );
    thinkingSel.value = ["on", "model"].includes(cfg.thinking)
      ? cfg.thinking
      : "off";
    const ctxCount = el("input", {
      type: "number",
      min: "5",
      max: "100",
      value: String(cfg.ctxCount),
    });
    const candCount = el("input", {
      type: "number",
      min: "1",
      max: "10",
      value: String(cfg.candCount),
    });
    const retries = el("input", {
      type: "number",
      min: "0",
      max: "5",
      value: String(cfg.retries),
    });
    const status = el("span", { class: "lit-status" });
    const save = el(
      "button",
      { type: "button", class: "lit-btn lit-btn-primary" },
      "保存",
    );
    const test = el("button", { type: "button", class: "lit-btn" }, "测试 LLM");
    const readCfg = () => ({
      backend: backend.value,
      llmBase: clean(llmBase.value),
      llmKey: llmKey.value.trim(),
      llmModel: clean(llmModel.value),
      ctxCount: Math.max(5, Math.min(100, parseInt(ctxCount.value, 10) || 20)),
      candCount: Math.max(1, Math.min(10, parseInt(candCount.value, 10) || 3)),
      retries: Math.max(0, Math.min(5, parseInt(retries.value, 10) || 1)),
      channelTranslate: chanMode.value === "off" ? "off" : "on",
      channelEngine: engineSel.value === "llm" ? "llm" : "google",
      thinking: ["on", "model"].includes(thinkingSel.value)
        ? thinkingSel.value
        : "off",
      stylePrompt: clean(stylePrompt.value),
      hotkey: ["tab", "ctrlenter", "off"].includes(hotkeySel.value)
        ? hotkeySel.value
        : "space3",
    });
    test.addEventListener("click", async () => {
      status.textContent = "测试中…";
      const testCfg = readCfg();
      if (!testCfg.llmBase || !testCfg.llmModel) {
        status.textContent = "请先填 Base URL 与模型名";
        return;
      }
      try {
        const out = await translateLLM("ping", "Reply with exactly: pong");
        status.textContent = out.includes("pong")
          ? "连接成功"
          : `连接成功（返回: ${out.slice(0, 30)}）`;
      } catch (error) {
        status.textContent = `失败：${error.message || error}`;
      }
    });
    save.addEventListener("click", () => {
      setCfg({ ...getCfg(), ...readCfg() });
      overlay.remove();
    });
    close.addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    const chanMode = el(
      "select",
      {},
      el("option", { value: "on" }, "开启：自动翻译页面内所有外文消息"),
      el("option", { value: "off" }, "关闭"),
    );
    chanMode.value = cfg.channelTranslate === "off" ? "off" : "on";
    const engineSel = el(
      "select",
      {},
      el("option", { value: "google" }, "谷歌翻译（免费）"),
      el("option", { value: "llm" }, "LLM（需配置，走模型）"),
    );
    engineSel.value = cfg.channelEngine === "llm" ? "llm" : "google";
    const advanced = el(
      "details",
      { class: "lit-advanced" },
      el("summary", {}, "⚙ 高级"),
      field("上文条数", ctxCount),
      field("候选条数", candCount),
      field("失败重试", retries),
    );
    const box = el(
      "div",
      { class: "lit-modal-box" },
      el(
        "div",
        { class: "lit-modal-head" },
        el("strong", {}, "翻译助手设置"),
        close,
      ),
      el(
        "div",
        { class: "lit-modal-body" },
        field("翻译引擎", backend),
        field("频道翻译", chanMode),
        field("频道引擎", engineSel),
        field("LLM Base URL", llmBase),
        field("API Key", llmKey),
        field("模型名", llmModel),
        field("思考模式", thinkingSel),
        field("风格提示词", stylePrompt),
        field("翻译快捷键", hotkeySel),
        advanced,
        el("div", { class: "lit-actions" }, test, status, save),
      ),
    );
    overlay.append(box);
    document.body.append(overlay);
  }

  // ==================== Event 层 ====================

  function bindEvents() {
    document.addEventListener("keydown", onKeyDown, true);
    // 输入事件委托到 document：#input 被 The Lounge 重渲染替换后依然生效
    document.addEventListener(
      "input",
      (event) => {
        if (event.target !== state.input) return;
        if (
          state.overlayMode === "translate" &&
          state.input.value !== state.previewSnapshot
        ) {
          hideOverlay();
        }
      },
      true,
    );
  }

  function onKeyDown(event) {
    if (!state.input) return;
    const active = document.activeElement === state.input;
    const isEnter = event.key === "Enter" && !event.shiftKey;

    // Ctrl+R：生成候选回答（输入框聚焦或候选面板打开时）
    if (
      event.ctrlKey &&
      !event.shiftKey &&
      !event.isComposing &&
      !event.altKey &&
      event.key.toLowerCase() === "r"
    ) {
      if (active || state.overlayMode === "suggest") {
        event.preventDefault();
        event.stopPropagation();
        generateSuggestions();
      }
      return;
    }
    // 输入翻译快捷键（设置可选：space3 | tab | ctrlenter | off）
    const hotkey = getCfg().hotkey || "space3";
    // space3：连续三次空格（700ms 内）= 就地翻译输入框中文（不经预览，直接替换可编辑）
    if (event.key !== " " || hotkey !== "space3") state.spaceStreak = 0;
    if (
      hotkey === "space3" &&
      active &&
      !event.isComposing &&
      event.key === " " &&
      !state.overlayMode
    ) {
      const now = Date.now();
      state.spaceStreak =
        now - state.spaceStreakAt < 700 ? state.spaceStreak + 1 : 1;
      state.spaceStreakAt = now;
      if (state.spaceStreak >= 3) {
        state.spaceStreak = 0;
        const text = clean(state.input.value);
        if (text && CJK_RE.test(text)) {
          event.preventDefault();
          translateInPlace(text);
          return;
        }
      }
    }
    // tab：Tab 默认移动焦点，拦截无副作用
    if (
      hotkey === "tab" &&
      active &&
      !event.isComposing &&
      event.key === "Tab" &&
      !state.overlayMode
    ) {
      const text = clean(state.input.value);
      if (text && CJK_RE.test(text)) {
        event.preventDefault();
        translateInPlace(text);
        return;
      }
    }
    if (!active || !isEnter || event.isComposing) return;

    if (state.overlayMode === "translate" && state.translated) {
      // 预览就绪：Enter 确认发送译文
      event.preventDefault();
      event.stopPropagation();
      hideOverlay();
      sendText(state.translated);
      return;
    }
    if (state.sending) return; // 我们派发的 Enter，放行给 The Lounge

    const text = (state.input.value || "").trim();
    if (text && CJK_RE.test(text)) {
      // ctrlenter：就地翻译（预览未打开时）
      if (hotkey === "ctrlenter" && event.ctrlKey && !state.overlayMode) {
        event.preventDefault();
        event.stopPropagation();
        translateInPlace(text);
        return;
      }
      // 含中文才拦截：/cmd 前缀、#频道、@昵称、URL 由 protect 占位保护，整行命令时正文为空则自动放行
      event.preventDefault();
      event.stopPropagation();
      translateAndPreview(text);
    }
  }

  // ==================== 工具 ====================

  function gmJson({ method, url, headers = {}, data = null }) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers,
        data,
        timeout: 30000,
        onload: (res) => {
          let json = null;
          try {
            json = JSON.parse(res.responseText || "{}");
          } catch {}
          if (res.status >= 400 && !json)
            reject(new Error(`HTTP ${res.status}`));
          else resolve(json || {});
        },
        onerror: () => reject(new Error("网络错误")),
        ontimeout: () => reject(new Error("请求超时")),
      });
    });
  }

  function clean(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function field(labelText, child) {
    return el("div", { class: "lit-field" }, el("label", {}, labelText), child);
  }

  function el(tag, attrs = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      node.append(
        kid instanceof Node ? kid : document.createTextNode(String(kid)),
      );
    }
    return node;
  }

  function ensureStyle() {
    if (document.querySelector(`#${NS}-style`)) return;
    GM_addStyle(`
#${NS}-overlay{position:static;order:-1;flex:0 0 100%;box-sizing:border-box;margin-bottom:6px;background:#1e2127;border:1px solid #3a4150;border-radius:8px;color:#d6dde8;font:13px/1.5 "Segoe UI",Arial,Helvetica,sans-serif}
#${NS}-overlay.${NS}-hidden{display:none}
#${NS}-overlay .lit-panel-sec-head{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;color:#9fd0ff;font-size:12px;font-weight:700}
#${NS}-overlay .lit-icon{background:none;border:0;color:#8b95a5;font-size:14px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}
#${NS}-overlay .lit-icon:hover{background:#2d3542;color:#fff}
#${NS}-overlay .lit-preview-body{padding:8px 12px;max-height:150px;overflow:auto}
#${NS}-overlay .lit-translated{word-break:break-word;color:#e8eef7;white-space:pre-wrap}
#${NS}-overlay .lit-panel-hint{padding:4px 12px 8px;color:#7f8ba0;font-size:12px}
#${NS}-overlay .lit-panel-hint.lit-error{color:#ff9d9d}
#${NS}-panel{position:fixed;top:56px;right:10px;width:340px;max-height:calc(100vh - 72px);display:flex;flex-direction:column;z-index:99999;background:#1e2127;border:1px solid #3a4150;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.45);color:#d6dde8;font:13px/1.5 "Segoe UI",Arial,Helvetica,sans-serif}
#${NS}-panel .lit-panel-head{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #2c3340;background:#242933;border-radius:10px 10px 0 0;font-weight:700;color:#9fd0ff;font-size:13px}
#${NS}-panel .lit-panel-head img{width:18px;height:18px;border-radius:4px;margin-right:6px;vertical-align:-3px}
#${NS}-panel .lit-panel-sec{border-top:1px solid #2c3340}
#${NS}-panel .lit-panel-sec-head{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;color:#9fd0ff;font-size:12px;font-weight:700}
#${NS}-panel .lit-icon{background:none;border:0;color:#8b95a5;font-size:14px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}
#${NS}-panel .lit-icon:hover{background:#2d3542;color:#fff}
#${NS}-panel .lit-suggest-body{padding:4px 10px 8px;max-height:200px;overflow:auto}
#${NS}-panel .lit-suggest-body.lit-panel-empty{color:#7f8ba0;font-size:12px}
#${NS}-panel .lit-suggest-body.lit-error{color:#ff9d9d;font-size:12px}
#${NS}-panel .lit-panel-hint{padding:2px 0 6px;color:#7f8ba0;font-size:12px}
#${NS}-panel .lit-cand{display:flex;align-items:flex-start;padding:5px 8px;margin-bottom:5px;background:#262c36;border:1px solid #343c4a;border-radius:6px;cursor:pointer;color:#dbe4f0;font-size:12px;line-height:1.5}
#${NS}-panel .lit-cand:last-child{margin-bottom:0}
#${NS}-panel .lit-cand:hover{background:#2d3542;border-color:#4a5568}
#${NS}-panel .lit-cand-num{display:inline-block;min-width:16px;margin-right:6px;color:#7f8ba0;font-weight:700;font-size:11px}
#${NS}-panel .lit-cand-col{flex:1;min-width:0}
#${NS}-panel .lit-cand-en{word-break:break-word}
#${NS}-panel .lit-cand-zh{margin-top:1px;color:#7f8ba0;font-size:11px}
#${NS}-panel .lit-panel-phrases-sec{flex:1 1 auto;min-height:140px;overflow:auto;padding-bottom:8px}
#${NS}-panel .lit-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px}
#${NS}-panel .lit-chip-group{margin:6px 0 4px;color:#9fb0c5;font-size:11px;font-weight:700;letter-spacing:.5px;padding:0 2px}
#${NS}-panel .lit-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:#262c36;border:1px solid #343c4a;border-radius:6px;font-size:12px;color:#dbe4f0;cursor:pointer;line-height:1.6}
#${NS}-panel .lit-chip:hover{background:#2d3542;border-color:#4a5568}
#${NS}-panel .lit-chip-x{color:#8b95a5;font-size:12px}
#${NS}-panel .lit-chip-x:hover{color:#ff9d9d}
#${NS}-panel .lit-phrase-add{display:flex;gap:6px;margin-top:8px;padding:0 10px}
#${NS}-panel .lit-phrase-add input{flex:1;min-width:0;height:26px;box-sizing:border-box;border:1px solid #3a4150;border-radius:5px;background:#15171c;color:#e6edf6;padding:2px 8px;font-size:12px}
#${NS}-panel .lit-phrase-add .lit-btn{height:26px;padding:0 10px}
.lit-modal{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:13px/1.5 "Segoe UI",Arial,Helvetica,sans-serif}
.lit-modal-box{width:min(480px,calc(100vw - 32px));background:#1e2127;border:1px solid #3a4150;border-radius:10px;color:#d6dde8;box-shadow:0 18px 54px rgba(0,0,0,.5)}
.lit-modal-head{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #2c3340;background:#242933;border-radius:10px 10px 0 0}
.lit-modal-head .lit-icon{background:none;border:0;color:#8b95a5;font-size:18px;cursor:pointer;padding:0 6px}
.lit-modal-body{display:grid;grid-template-columns:1fr;gap:9px;padding:14px}
.lit-field{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:center;gap:8px}
.lit-field label{color:#9fb0c5;text-align:right;white-space:nowrap}
.lit-field input,.lit-field select{height:29px;box-sizing:border-box;border:1px solid #3a4150;border-radius:5px;background:#15171c;color:#e6edf6;padding:2px 8px}
.lit-advanced summary{cursor:pointer;color:#9fb0c5;padding:4px 0;user-select:none}
.lit-advanced[open] summary{margin-bottom:4px}
.lit-actions{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:6px}
.lit-btn{height:28px;border:1px solid #3a4150;border-radius:5px;background:#2a303b;color:#d6dde8;padding:0 14px;cursor:pointer}
.lit-btn-primary{background:#1d4a3a;border-color:#2f7d5d;color:#b9f6d3;font-weight:700}
.lit-btn:hover{filter:brightness(1.1)}
.lit-status{color:#7f8ba0;margin-right:auto;font-size:12px}
.lit-msg-trans{margin-left:6px;color:#8b95a5;font-size:12px;line-height:1.6;word-break:break-word;border-bottom:1px dashed #4a5568;padding-bottom:1px}
    `);
    const style = document.createElement("style");
    style.id = `${NS}-style`;
    style.textContent = "";
    document.documentElement.append(style);
  }

  // ==================== 启动 ====================

  GM_registerMenuCommand("翻译助手设置", openSettings);
  const ready = () => {
    // The Lounge 是 Vue SPA：#input 要等应用挂载并渲染出聊天区后才存在，轮询等待而非一次性放弃
    if (state.panel) return; // 已构建，防重复初始化
    state.input = locateInput();
    if (!state.input) {
      setTimeout(ready, 400);
      return;
    }
    state.form = locateForm();
    buildUI();
    bindEvents();
    attachChatObserver();
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();

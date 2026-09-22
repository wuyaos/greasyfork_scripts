// ==UserScript==
// @name         Lounge IRC 翻译助手
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.8.6
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
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Lounge_IRC_Translator.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Lounge_IRC_Translator.user.js
// ==/UserScript==

// Generated from src/scripts/lounge-irc-translator/index.js; do not edit dist files.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/scripts/lounge-irc-translator/state.js
  var state = {
    input: null,
    form: null,
    panel: null,
    // 常驻侧边面板根节点（挂在 body，不受 #form 重渲染影响）
    overlayMode: "",
    // '' | translate（译文预览确认中）
    translated: "",
    // 待确认译文
    previewSnapshot: "",
    // 翻译发起时的输入框原文快照（编辑即作废预览）
    errorRaw: "",
    // 失败态原文快照
    candidates: [],
    // 当前候选列表
    sending: false,
    // 派发 Enter 时防递归拦截
    suggestBusy: false,
    // 候选生成中（防 ↻/Ctrl+R 并发重入）
    spaceStreak: 0,
    // 三连空格计数
    spaceStreakAt: 0
    // 上次空格时间戳
  };

  // src/scripts/lounge-irc-translator/elements.js
  function gmJson({ method, url, headers = {}, data = null }) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers,
        data,
        timeout: 3e4,
        onload: /* @__PURE__ */ __name((res) => {
          let json = null;
          try {
            json = JSON.parse(res.responseText || "{}");
          } catch {
          }
          if (res.status >= 400 && !json)
            reject(new Error(`HTTP ${res.status}`));
          else resolve(json || {});
        }, "onload"),
        onerror: /* @__PURE__ */ __name(() => reject(new Error("网络错误")), "onerror"),
        ontimeout: /* @__PURE__ */ __name(() => reject(new Error("请求超时")), "ontimeout")
      });
    });
  }
  __name(gmJson, "gmJson");
  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  __name(clean, "clean");
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  __name(sleep, "sleep");
  function field(labelText, child) {
    return el("div", { class: "lit-field" }, el("label", {}, labelText), child);
  }
  __name(field, "field");
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
        kid instanceof Node ? kid : document.createTextNode(String(kid))
      );
    }
    return node;
  }
  __name(el, "el");

  // src/scripts/lounge-irc-translator/chat.js
  function locateInput() {
    return document.querySelector("#input");
  }
  __name(locateInput, "locateInput");
  function locateForm() {
    return document.querySelector("#form") || state.input && state.input.closest("form");
  }
  __name(locateForm, "locateForm");
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
        cancelable: true
      })
    );
    setTimeout(() => {
      if (state.input && state.input.value !== "") {
        state.form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
      }
      state.sending = false;
    }, 150);
  }
  __name(sendText, "sendText");
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
  __name(collectContext, "collectContext");
  function nickOf(node) {
    if (!node) return "";
    return clean(node.getAttribute?.("data-name") || node.textContent || "");
  }
  __name(nickOf, "nickOf");
  function activeMsgRows() {
    const rows = [
      ...document.querySelectorAll("#chat .chan.active .messages .msg")
    ];
    return rows.length ? rows : [...document.querySelectorAll("#chat .messages .msg")];
  }
  __name(activeMsgRows, "activeMsgRows");
  function selfNick() {
    return clean(document.querySelector("#nick")?.textContent || "");
  }
  __name(selfNick, "selfNick");
  function lastSpeakerNick() {
    const me = selfNick();
    for (const row of activeMsgRows().reverse()) {
      if (row.classList.contains("closed") || row.classList.contains("action"))
        continue;
      const mentioned = [...row.querySelectorAll(".content .user")].map(nickOf).find((n) => n && n !== me);
      if (mentioned) return mentioned;
      const from = nickOf(row.querySelector(".from .user"));
      if (!from || from === "***" || from === me) continue;
      return from;
    }
    return "";
  }
  __name(lastSpeakerNick, "lastSpeakerNick");
  function resolvePhrase(phrase) {
    if (!phrase.includes("{nick}")) return phrase;
    const nick = lastSpeakerNick();
    return phrase.split("{nick}").join(nick).replace(/\s{2,}/g, " ").trim();
  }
  __name(resolvePhrase, "resolvePhrase");

  // src/scripts/lounge-irc-translator/config.js
  var NS = "lit";
  var CFG_KEY = `${NS}_config`;
  var ICON_URL = "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/lounge-irc-translator.png";
  var DEFAULT_CFG = {
    backend: "auto",
    // auto | llm | free；auto=配了 LLM 用 LLM，否则 MyMemory
    llmBase: "",
    // OpenAI 兼容 base，如 http://127.0.0.1:11434/v1
    llmKey: "",
    llmModel: "",
    ctxCount: 20,
    // 候选回答取最近 N 条消息
    candCount: 3,
    // 候选回答条数
    retries: 1,
    // 翻译失败重试次数
    channelTranslate: "on",
    // on | off：自动翻译页面内所有外文消息
    channelEngine: "google",
    // google | llm：频道消息翻译引擎
    thinking: "off",
    // off | on | model：LLM 思考模式（off=enable_thinking:false 保速度）
    hotkey: "space3",
    // space3 | tab | ctrlenter | off：就地翻译触发快捷键
    phrases: [],
    // 自定义常用短语（字符串数组，内置之外追加）
    stylePrompt: ""
    // 输入翻译与候选回答的风格指令（仅 LLM 生效，留空跟随频道风格）
  };
  var CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
  var TOKEN_PREFIX = "__LIT";
  var TOKEN_SUFFIX = "__";
  var PROTECT_PATTERNS = [
    { re: /https?:\/\/\S+/g, key: "url" },
    { re: /(?<=^|\s)\/[A-Za-z][\w-]*(?:\s+[^\s#@/][^\s]*)?/g, key: "cmd" },
    { re: /#[A-Za-z0-9_\-[\]]+/g, key: "chan" },
    { re: /@[A-Za-z0-9_\-[\]]+/g, key: "nick" }
  ];

  // src/scripts/lounge-irc-translator/styles.js
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
  __name(ensureStyle, "ensureStyle");

  // src/scripts/lounge-irc-translator/settings.js
  function getCfg() {
    let cfg = {};
    try {
      cfg = GM_getValue(CFG_KEY, {}) || {};
    } catch {
    }
    const merged = { ...DEFAULT_CFG, ...cfg };
    if (merged.channelTranslate !== "off") merged.channelTranslate = "on";
    return merged;
  }
  __name(getCfg, "getCfg");
  function setCfg(cfg) {
    GM_setValue(CFG_KEY, { ...DEFAULT_CFG, ...cfg });
  }
  __name(setCfg, "setCfg");
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
        "自动（有 LLM 配置用 LLM，否则免费 API）"
      ),
      el("option", { value: "llm" }, "LLM（口语风格，推荐）"),
      el("option", { value: "free" }, "MyMemory 免费 API")
    );
    backend.value = cfg.backend;
    const llmBase = el("input", {
      type: "text",
      placeholder: "http://127.0.0.1:11434/v1",
      value: cfg.llmBase
    });
    const llmKey = el("input", {
      type: "password",
      placeholder: "API Key（本地模型可留空）",
      value: cfg.llmKey
    });
    const llmModel = el("input", {
      type: "text",
      placeholder: "如 llama3.1 / deepseek-chat",
      value: cfg.llmModel
    });
    const stylePrompt = el("input", {
      type: "text",
      placeholder: "风格指令，如：casual gamer slang, lowercase（留空跟随频道）",
      value: cfg.stylePrompt || ""
    });
    const hotkeySel = el(
      "select",
      {},
      el("option", { value: "space3" }, "三连空格（700ms 内，默认）"),
      el("option", { value: "tab" }, "Tab 键"),
      el("option", { value: "ctrlenter" }, "Ctrl+Enter"),
      el("option", { value: "off" }, "不使用快捷键")
    );
    hotkeySel.value = ["tab", "ctrlenter", "off"].includes(cfg.hotkey) ? cfg.hotkey : "space3";
    const thinkingSel = el(
      "select",
      {},
      el("option", { value: "off" }, "关闭思考（默认，响应更快）"),
      el("option", { value: "on" }, "开启思考"),
      el("option", { value: "model" }, "跟随模型默认")
    );
    thinkingSel.value = ["on", "model"].includes(cfg.thinking) ? cfg.thinking : "off";
    const ctxCount = el("input", {
      type: "number",
      min: "5",
      max: "100",
      value: String(cfg.ctxCount)
    });
    const candCount = el("input", {
      type: "number",
      min: "1",
      max: "10",
      value: String(cfg.candCount)
    });
    const retries = el("input", {
      type: "number",
      min: "0",
      max: "5",
      value: String(cfg.retries)
    });
    const status = el("span", { class: "lit-status" });
    const save = el(
      "button",
      { type: "button", class: "lit-btn lit-btn-primary" },
      "保存"
    );
    const test = el("button", { type: "button", class: "lit-btn" }, "测试 LLM");
    const readCfg = /* @__PURE__ */ __name(() => ({
      backend: backend.value,
      llmBase: clean(llmBase.value),
      llmKey: llmKey.value.trim(),
      llmModel: clean(llmModel.value),
      ctxCount: Math.max(5, Math.min(100, parseInt(ctxCount.value, 10) || 20)),
      candCount: Math.max(1, Math.min(10, parseInt(candCount.value, 10) || 3)),
      retries: Math.max(0, Math.min(5, parseInt(retries.value, 10) || 1)),
      channelTranslate: chanMode.value === "off" ? "off" : "on",
      channelEngine: engineSel.value === "llm" ? "llm" : "google",
      thinking: ["on", "model"].includes(thinkingSel.value) ? thinkingSel.value : "off",
      stylePrompt: clean(stylePrompt.value),
      hotkey: ["tab", "ctrlenter", "off"].includes(hotkeySel.value) ? hotkeySel.value : "space3"
    }), "readCfg");
    test.addEventListener("click", async () => {
      status.textContent = "测试中…";
      const testCfg = readCfg();
      if (!testCfg.llmBase || !testCfg.llmModel) {
        status.textContent = "请先填 Base URL 与模型名";
        return;
      }
      try {
        const out = await translateLLM("ping", "Reply with exactly: pong");
        status.textContent = out.includes("pong") ? "连接成功" : `连接成功（返回: ${out.slice(0, 30)}）`;
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
      el("option", { value: "off" }, "关闭")
    );
    chanMode.value = cfg.channelTranslate === "off" ? "off" : "on";
    const engineSel = el(
      "select",
      {},
      el("option", { value: "google" }, "谷歌翻译（免费）"),
      el("option", { value: "llm" }, "LLM（需配置，走模型）")
    );
    engineSel.value = cfg.channelEngine === "llm" ? "llm" : "google";
    const advanced = el(
      "details",
      { class: "lit-advanced" },
      el("summary", {}, "⚙ 高级"),
      field("上文条数", ctxCount),
      field("候选条数", candCount),
      field("失败重试", retries)
    );
    const box = el(
      "div",
      { class: "lit-modal-box" },
      el(
        "div",
        { class: "lit-modal-head" },
        el("strong", {}, "翻译助手设置"),
        close
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
        el("div", { class: "lit-actions" }, test, status, save)
      )
    );
    overlay.append(box);
    document.body.append(overlay);
  }
  __name(openSettings, "openSettings");

  // src/scripts/lounge-irc-translator/translation.js
  async function translate(text) {
    const cfg = getCfg();
    const useLLM = cfg.backend !== "free" && !!cfg.llmBase && !!cfg.llmModel;
    const attempts = Math.max(0, parseInt(cfg.retries, 10) || 0) + 1;
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return useLLM ? await translateLLM(
          text,
          translatePrompt(text, collectContext(STYLE_REF_COUNT))
        ) : await translateFree(text);
      } catch (error) {
        lastError = error;
        if (i < attempts - 1) await sleep(400);
      }
    }
    throw lastError || new Error("翻译失败");
  }
  __name(translate, "translate");
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
        ...cfg.llmKey ? { Authorization: `Bearer ${cfg.llmKey}` } : {}
      },
      data: JSON.stringify({
        model: cfg.llmModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        // 思考模式：off=enable_thinking:false（Qwen/vLLM/new-api 约定，保速度）；on=强制开启；model=不发参数跟随默认
        ...cfg.thinking === "off" ? { enable_thinking: false } : cfg.thinking === "on" ? { enable_thinking: true } : {}
      })
    });
    const content = res.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM 无返回内容");
    return content.trim();
  }
  __name(translateLLM, "translateLLM");
  var STYLE_REF_COUNT = 8;
  function translatePrompt(text, styleCtx) {
    const styleBlock = styleCtx ? `Channel style reference (recent messages, mimic this tone):
${styleCtx}
` : "";
    const tone = clean(getCfg().stylePrompt) ? `Translate the user's Chinese message into English following this style directive: ${clean(getCfg().stylePrompt)}.` : "Translate the user's Chinese message into short, natural, colloquial English matching the channel's actual chat style.";
    return `You are an IRC chat translator for an open-source community channel. ${tone}
Hard rules:
1. Keep it short and natural — no formal or long sentences, no polite filler.
2. Preserve the original meaning; do not add or remove content.
3. Return ONLY the translation — no explanations, no quotes, no notes.
${styleBlock}Text: ${text}`;
  }
  __name(translatePrompt, "translatePrompt");
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
  __name(translateFree, "translateFree");

  // src/scripts/lounge-irc-translator/message-cache.js
  function msgCacheKey(text) {
    return `${getCfg().channelEngine}\0${text}`;
  }
  __name(msgCacheKey, "msgCacheKey");
  var MSG_CACHE_KEY = `${NS}_msg_cache`;
  var MSG_CACHE_MAX = 500;
  function msgCacheGet(text) {
    try {
      const cache = GM_getValue(MSG_CACHE_KEY, {}) || {};
      return cache[text] || "";
    } catch {
      return "";
    }
  }
  __name(msgCacheGet, "msgCacheGet");
  function msgCacheSet(text, translated) {
    try {
      const cache = GM_getValue(MSG_CACHE_KEY, {}) || {};
      if (cache[text] === translated) return;
      cache[text] = translated;
      const keys = Object.keys(cache);
      if (keys.length > MSG_CACHE_MAX) delete cache[keys[0]];
      GM_setValue(MSG_CACHE_KEY, cache);
    } catch {
    }
  }
  __name(msgCacheSet, "msgCacheSet");

  // src/scripts/lounge-irc-translator/suggestions.js
  async function generateSuggestions() {
    if (state.suggestBusy) return;
    const cfg = getCfg();
    if (!cfg.llmBase || !cfg.llmModel) {
      renderSuggestNote(
        "候选回答需要 LLM：请在「翻译助手设置」配置 Base URL 与模型名",
        true
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
      const tone = clean(cfg.stylePrompt) ? ` Style: ${clean(cfg.stylePrompt)}.` : " Keep them short and informal, like a native speaker chatting casually.";
      const me = selfNick();
      const target = lastSpeakerNick();
      const selfHint = me ? `- You are ${me}; never reply to your own messages.
` : "";
      const targetHint = target && target !== me ? `- The latest message is from ${target}; if replying to them, start with "${target}:".
` : "";
      const system = `You are chatting in an open-source community IRC channel. Below is the recent conversation (nick: message).
Write ${cfg.candCount} candidate replies you could send next.${tone}
Rules:
- Each reply under 15 words; no polite filler; match the conversation tone.
- If replying to a specific user, start with their nick and a colon, using the exact nick spelling from the conversation.
${selfHint}${targetHint}- Return ONLY ${cfg.candCount} lines, each in the exact format: english reply ||| 中文大意
Conversation:
${ctx}`;
      const raw = await translateLLM("", system);
      const candidates = raw.split(/\n+/).map((line) => {
        const parts = line.split(/\s*\|{2,}\s*/);
        let en = parts[0].replace(/^[\s\-*\d.)]+/, "").trim();
        let zh = (parts[1] || "").trim();
        if (!zh) {
          const cjkAt = en.search(CJK_RE);
          if (cjkAt > 0) {
            zh = en.slice(cjkAt).trim();
            en = en.slice(0, cjkAt).replace(/[\s|~—-]+$/, "").trim();
          }
        }
        if (!en) return null;
        return { en, zh };
      }).filter(Boolean).slice(0, cfg.candCount);
      if (!candidates.length) throw new Error("LLM 未返回候选");
      state.candidates = candidates;
      renderSuggestions(candidates);
    } catch (error) {
      renderSuggestNote(`生成失败：${error.message || error}`, true);
    } finally {
      state.suggestBusy = false;
    }
  }
  __name(generateSuggestions, "generateSuggestions");
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
          cand.zh ? el("div", { class: "lit-cand-zh" }, cand.zh) : null
        )
      );
      item.addEventListener("click", () => fillCandidate(cand.en));
      body.append(item);
    });
    body.append(
      el(
        "div",
        { class: "lit-panel-hint" },
        hint || `点击或 Alt+1-${candidates.length} 填入输入框`
      )
    );
  }
  __name(renderSuggestions, "renderSuggestions");
  function renderSuggestNote(text, isError = false) {
    const body = state.panel.querySelector(".lit-suggest-body");
    body.classList.remove("lit-error");
    body.classList.add("lit-panel-empty");
    if (isError) body.classList.add("lit-error");
    body.textContent = text;
  }
  __name(renderSuggestNote, "renderSuggestNote");

  // src/scripts/lounge-irc-translator/phrases.js
  var BUILTIN_PHRASES = [
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
        "yay"
      ]
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
        "gotcha"
      ]
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
        "bye"
      ]
    },
    {
      group: "点名（{nick}=最近用户）",
      items: [
        "congrats {nick}",
        "hi {nick}",
        "thanks {nick}",
        "gg {nick}",
        "o/ {nick}"
      ]
    },
    {
      group: "表情",
      items: ["<3", "¯\\_(ツ)_/¯", "👀"]
    }
  ];
  function getPhrases() {
    const custom = Array.isArray(getCfg().phrases) ? getCfg().phrases : [];
    return custom.length ? [{ group: "自定义", items: custom }, ...BUILTIN_PHRASES] : BUILTIN_PHRASES;
  }
  __name(getPhrases, "getPhrases");
  function savePhrases(custom) {
    setCfg({ ...getCfg(), phrases: custom });
  }
  __name(savePhrases, "savePhrases");
  function renderPhrases() {
    const body = state.panel.querySelector(".lit-phrases-body");
    body.textContent = "";
    const custom = new Set(
      Array.isArray(getCfg().phrases) ? getCfg().phrases : []
    );
    getPhrases().forEach(({ group, items }) => {
      body.append(el("div", { class: "lit-chip-group" }, group));
      const chips = el("div", { class: "lit-chips" });
      items.forEach((phrase) => {
        const chip = el(
          "span",
          {
            class: "lit-chip",
            title: phrase.includes("{nick}") ? "点击填入，{nick} 自动替换为最近发言者/提及者" : custom.has(phrase) ? "自定义短语" : "点击填入"
          },
          phrase
        );
        chip.addEventListener(
          "click",
          () => fillCandidate(resolvePhrase(phrase))
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
      placeholder: "添加自定义短语，Enter 确认"
    });
    const btn = el("button", { type: "button", class: "lit-btn" }, "添加");
    const addPhrase = /* @__PURE__ */ __name(() => {
      const phrase = clean(input.value);
      if (!phrase) return;
      if (getPhrases().some(
        ({ items }) => items.some((p) => p.toLowerCase() === phrase.toLowerCase())
      )) {
        input.value = "";
        return;
      }
      savePhrases([...getCfg().phrases || [], phrase]);
      renderPhrases();
      state.panel.querySelector(".lit-phrase-add input")?.focus();
    }, "addPhrase");
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
  __name(renderPhrases, "renderPhrases");

  // src/scripts/lounge-irc-translator/protected-text.js
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
  __name(protect, "protect");
  function restore(text, tokens) {
    let out = String(text || "");
    tokens.forEach((token, index) => {
      out = out.split(`${TOKEN_PREFIX}${index}${TOKEN_SUFFIX}`).join(token);
    });
    return out.replace(
      new RegExp(`${TOKEN_PREFIX}\\d+${TOKEN_SUFFIX}`, "g"),
      ""
    );
  }
  __name(restore, "restore");

  // src/scripts/lounge-irc-translator/draft-translation.js
  async function translateAndPreview(rawText) {
    const { protected: tokens, text: body } = protect(rawText);
    if (!body.trim()) return;
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
        true
      );
    }
  }
  __name(translateAndPreview, "translateAndPreview");
  async function translateInPlace(rawText) {
    const input = state.input;
    const { protected: tokens, text: body } = protect(rawText);
    if (!body.trim()) return;
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
        true
      );
    }
  }
  __name(translateInPlace, "translateInPlace");
  function retryTranslate() {
    if (state.errorRaw) translateAndPreview(state.errorRaw);
  }
  __name(retryTranslate, "retryTranslate");

  // src/scripts/lounge-irc-translator/panel.js
  function buildUI() {
    ensureStyle();
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
              title: "重试翻译原文"
            },
            "↻"
          ),
          el(
            "button",
            {
              type: "button",
              class: "lit-icon lit-close",
              title: "取消 (Esc)"
            },
            "×"
          )
        )
      ),
      el("div", { class: "lit-preview-body" }),
      el("div", { class: "lit-panel-hint" })
    );
    state.overlay.querySelector(".lit-close").addEventListener("click", hideOverlay);
    state.overlay.querySelector(".lit-retry").addEventListener("click", retryTranslate);
    ensureOverlayInForm();
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
            onerror: "this.style.display='none'"
          }),
          " 翻译助手"
        ),
        el(
          "button",
          {
            type: "button",
            class: "lit-icon lit-panel-trans",
            title: "翻译输入框内容（中文→英文）"
          },
          "🌐"
        ),
        el(
          "button",
          { type: "button", class: "lit-icon lit-panel-cfg", title: "设置" },
          "⚙"
        )
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
              title: "生成/刷新 (Ctrl+R)"
            },
            "↻"
          )
        ),
        el(
          "div",
          { class: "lit-suggest-body lit-panel-empty" },
          "Ctrl+R 根据上文生成候选"
        )
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
            placeholder: "添加自定义短语，Enter 确认"
          }),
          el("button", { type: "button", class: "lit-btn" }, "添加")
        )
      )
    );
    state.panel = panel;
    document.body.append(panel);
    panel.querySelector(".lit-panel-trans").addEventListener("click", () => {
      const text = clean(state.input.value);
      if (text) translateAndPreview(text);
    });
    panel.querySelector(".lit-panel-cfg").addEventListener("click", openSettings);
    panel.querySelector(".lit-suggest-btn").addEventListener("click", () => generateSuggestions());
    panel.querySelector(".lit-phrase-add input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addPhraseFromInput();
      }
    });
    panel.querySelector(".lit-phrase-add .lit-btn").addEventListener("click", addPhraseFromInput);
    renderPhrases();
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && state.overlayMode) hideOverlay();
        if (state.candidates.length && state.overlayMode !== "translate" && event.altKey && /^[1-9]$/.test(event.key)) {
          const index = parseInt(event.key, 10) - 1;
          const cand = state.candidates[index];
          if (cand) {
            event.preventDefault();
            fillCandidate(cand.en);
          }
        }
      },
      true
    );
  }
  __name(buildUI, "buildUI");
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
  __name(ensureOverlayInForm, "ensureOverlayInForm");
  function addPhraseFromInput() {
    const input = state.panel.querySelector(".lit-phrase-add input");
    const phrase = clean(input.value);
    if (!phrase) return;
    if (getPhrases().some(
      ({ items }) => items.some((p) => p.toLowerCase() === phrase.toLowerCase())
    )) {
      input.value = "";
      return;
    }
    savePhrases([...getCfg().phrases || [], phrase]);
    renderPhrases();
    state.panel.querySelector(".lit-phrase-add input")?.focus();
  }
  __name(addPhraseFromInput, "addPhraseFromInput");
  function showPreview(content, hint, isError = false) {
    state.overlayMode = "translate";
    ensureOverlayInForm();
    state.overlay.classList.remove(`${NS}-hidden`);
    state.overlay.querySelector(".lit-retry").style.display = isError ? "" : "none";
    const body = state.overlay.querySelector(".lit-preview-body");
    body.textContent = "";
    if (content) body.append(el("div", { class: "lit-translated" }, content));
    setOverlayHint(hint, isError);
  }
  __name(showPreview, "showPreview");
  function setOverlayHint(text, isError = false) {
    const hint = state.overlay.querySelector(".lit-panel-hint");
    hint.textContent = text || "";
    hint.classList.toggle("lit-error", !!isError);
  }
  __name(setOverlayHint, "setOverlayHint");
  function hideOverlay() {
    state.overlayMode = "";
    state.translated = "";
    state.previewSnapshot = "";
    state.errorRaw = "";
    state.overlay.classList.add(`${NS}-hidden`);
  }
  __name(hideOverlay, "hideOverlay");
  function fillCandidate(text) {
    state.input.value = text;
    state.input.focus();
    hideOverlay();
  }
  __name(fillCandidate, "fillCandidate");

  // src/scripts/lounge-irc-translator/auto-translation.js
  var autoQueue = [];
  var autoRunning = false;
  var queueDelay = 400;
  var QUEUE_DELAY_MIN = 400;
  var QUEUE_DELAY_MAX = 4e3;
  var sweepTimer = 0;
  function ensureBound() {
    if (state.input && state.input.isConnected) return;
    const input = locateInput();
    if (!input) return;
    state.input = input;
    state.form = locateForm();
    ensureOverlayInForm();
  }
  __name(ensureBound, "ensureBound");
  function sweepChannel() {
    ensureBound();
    if (getCfg().channelTranslate !== "on") return;
    activeMsgRows().forEach((row) => {
      if (row.dataset.litFail) {
        delete row.dataset.litFail;
        delete row.dataset.litFails;
      }
    });
    activeMsgRows().forEach((row) => enqueueAuto(row));
  }
  __name(sweepChannel, "sweepChannel");
  function scheduleSweep(delay = 300) {
    clearTimeout(sweepTimer);
    sweepTimer = setTimeout(sweepChannel, delay);
  }
  __name(scheduleSweep, "scheduleSweep");
  function attachChatObserver() {
    const chat = document.querySelector("#chat") || document.body;
    const observer = new MutationObserver((mutations) => {
      if (getCfg().channelTranslate !== "on") return;
      const relevant = mutations.some(
        (m) => m.type === "attributes" || [...m.addedNodes].some(
          (n) => n.nodeType === 1 && (n.matches?.(".msg") || n.querySelector?.(".msg"))
        )
      );
      if (relevant) scheduleSweep();
    });
    observer.observe(chat, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    sweepChannel();
  }
  __name(attachChatObserver, "attachChatObserver");
  function enqueueAuto(row) {
    if (row.dataset.litQueued || row.dataset.litDone || row.dataset.litFail)
      return;
    if (!isTranslatableMsg(row)) return;
    const text = clean(row.querySelector(".content")?.textContent);
    if (!text) return;
    const cached = msgCacheGet(msgCacheKey(text));
    if (cached) {
      row.dataset.litDone = "1";
      renderMsgTranslation(row, cached);
      return;
    }
    row.dataset.litQueued = "1";
    autoQueue.unshift(row);
    if (!autoRunning) {
      autoRunning = true;
      processAutoQueue();
    }
  }
  __name(enqueueAuto, "enqueueAuto");
  async function processAutoQueue() {
    if (getCfg().channelTranslate !== "on") {
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
      scheduleSweep(1e3);
    }
  }
  __name(processAutoQueue, "processAutoQueue");
  function isTranslatableMsg(row) {
    if (row.classList.contains("closed") || row.classList.contains("action"))
      return false;
    const from = clean(
      row.querySelector(".from .user")?.textContent || row.querySelector(".from")?.textContent
    );
    if (!from || from === "***") return false;
    const text = clean(row.querySelector(".content")?.textContent);
    if (!text || text.startsWith("***") || CJK_RE.test(text)) return false;
    return text.length > 1;
  }
  __name(isTranslatableMsg, "isTranslatableMsg");
  async function translateMsg(row) {
    try {
      const text = clean(row.querySelector(".content")?.textContent);
      if (!text) return;
      const cacheKey = msgCacheKey(text);
      let translated = msgCacheGet(cacheKey);
      if (!translated) {
        translated = await translateToZh(text);
        msgCacheSet(cacheKey, translated);
      }
      row.dataset.litDone = "1";
      renderMsgTranslation(row, translated);
      queueDelay = Math.max(QUEUE_DELAY_MIN, Math.floor(queueDelay / 2));
    } catch (error) {
      queueDelay = Math.min(QUEUE_DELAY_MAX, queueDelay * 2);
      const fails = (parseInt(row.dataset.litFails || "0", 10) || 0) + 1;
      row.dataset.litFails = String(fails);
      delete row.dataset.litQueued;
      if (fails >= 3) row.dataset.litFail = "1";
    }
  }
  __name(translateMsg, "translateMsg");
  function renderMsgTranslation(row, translated) {
    const content = row.querySelector(".content");
    if (!content) return;
    content.append(el("span", { class: "lit-msg-trans" }, translated));
  }
  __name(renderMsgTranslation, "renderMsgTranslation");
  async function translateToZh(text) {
    const cfg = getCfg();
    if (cfg.channelEngine === "llm") {
      return translateLLM(
        text,
        `You are an IRC chat translator. Translate the following IRC message into natural, concise Simplified Chinese. Keep nicknames, /commands, #channels, URLs and technical terms as-is. Return ONLY the translation, no quotes or explanations.
Message: ${text}`
      );
    }
    const q = text.slice(0, 800);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(q)}`;
    const res = await gmJson({ method: "GET", url });
    const segs = Array.isArray(res?.[0]) ? res[0] : null;
    const out = segs ? segs.map((seg) => seg?.[0] || "").join("") : "";
    if (!out.trim()) throw new Error("谷歌翻译无结果");
    return out.trim();
  }
  __name(translateToZh, "translateToZh");

  // src/scripts/lounge-irc-translator/events.js
  function bindEvents() {
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener(
      "input",
      (event) => {
        if (event.target !== state.input) return;
        if (state.overlayMode === "translate" && state.input.value !== state.previewSnapshot) {
          hideOverlay();
        }
      },
      true
    );
  }
  __name(bindEvents, "bindEvents");
  function onKeyDown(event) {
    if (!state.input) return;
    const active = document.activeElement === state.input;
    const isEnter = event.key === "Enter" && !event.shiftKey;
    if (event.ctrlKey && !event.shiftKey && !event.isComposing && !event.altKey && event.key.toLowerCase() === "r") {
      if (active || state.overlayMode === "suggest") {
        event.preventDefault();
        event.stopPropagation();
        generateSuggestions();
      }
      return;
    }
    const hotkey = getCfg().hotkey || "space3";
    if (event.key !== " " || hotkey !== "space3") state.spaceStreak = 0;
    if (hotkey === "space3" && active && !event.isComposing && event.key === " " && !state.overlayMode) {
      const now = Date.now();
      state.spaceStreak = now - state.spaceStreakAt < 700 ? state.spaceStreak + 1 : 1;
      state.spaceStreakAt = now;
      if (state.spaceStreak >= 3) {
        state.spaceStreak = 0;
        const text2 = clean(state.input.value);
        if (text2 && CJK_RE.test(text2)) {
          event.preventDefault();
          translateInPlace(text2);
          return;
        }
      }
    }
    if (hotkey === "tab" && active && !event.isComposing && event.key === "Tab" && !state.overlayMode) {
      const text2 = clean(state.input.value);
      if (text2 && CJK_RE.test(text2)) {
        event.preventDefault();
        translateInPlace(text2);
        return;
      }
    }
    if (!active || !isEnter || event.isComposing) return;
    if (state.overlayMode === "translate" && state.translated) {
      event.preventDefault();
      event.stopPropagation();
      hideOverlay();
      sendText(state.translated);
      return;
    }
    if (state.sending) return;
    const text = (state.input.value || "").trim();
    if (text && CJK_RE.test(text)) {
      if (hotkey === "ctrlenter" && event.ctrlKey && !state.overlayMode) {
        event.preventDefault();
        event.stopPropagation();
        translateInPlace(text);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      translateAndPreview(text);
    }
  }
  __name(onKeyDown, "onKeyDown");

  // src/scripts/lounge-irc-translator/startup.js
  var ready = /* @__PURE__ */ __name(() => {
    if (state.panel) return;
    state.input = locateInput();
    if (!state.input) {
      setTimeout(ready, 400);
      return;
    }
    state.form = locateForm();
    buildUI();
    bindEvents();
    attachChatObserver();
  }, "ready");
  function bootstrap() {
    GM_registerMenuCommand("翻译助手设置", openSettings);
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", ready);
    else ready();
  }
  __name(bootstrap, "bootstrap");

  // src/scripts/lounge-irc-translator/index.js
  bootstrap();
})();

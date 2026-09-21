import { CFG_KEY, DEFAULT_CFG, NS } from './config.js';

import { translateLLM } from './translation.js';

import { clean, el, field } from './elements.js';

import { ensureStyle } from './styles.js';



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



export { getCfg, openSettings, setCfg };

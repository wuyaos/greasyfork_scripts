import { ICON_URL, NS } from './config.js';

import { state } from './state.js';

import { locateForm } from './chat.js';

import { generateSuggestions } from './suggestions.js';

import { getPhrases, renderPhrases, savePhrases } from './phrases.js';

import { retryTranslate, translateAndPreview } from './draft-translation.js';

import { getCfg, openSettings } from './settings.js';

import { clean, el } from './elements.js';

import { ensureStyle } from './styles.js';



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



export { buildUI, ensureOverlayInForm, fillCandidate, hideOverlay, showPreview };

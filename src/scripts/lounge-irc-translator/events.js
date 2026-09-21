import { CJK_RE } from './config.js';

import { state } from './state.js';

import { sendText } from './chat.js';

import { generateSuggestions } from './suggestions.js';

import { hideOverlay } from './panel.js';

import { translateAndPreview, translateInPlace } from './draft-translation.js';

import { getCfg } from './settings.js';

import { clean } from './elements.js';



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



export { bindEvents };

import { state } from './state.js';

import { protect, restore } from './protected-text.js';

import { translate } from './translation.js';

import { showPreview } from './panel.js';



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

function retryTranslate() {
    if (state.errorRaw) translateAndPreview(state.errorRaw);
  }



export { retryTranslate, translateAndPreview, translateInPlace };

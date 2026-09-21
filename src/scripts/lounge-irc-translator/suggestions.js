import { CJK_RE } from './config.js';

import { state } from './state.js';

import { collectContext, lastSpeakerNick, selfNick } from './chat.js';

import { translateLLM } from './translation.js';

import { fillCandidate } from './panel.js';

import { getCfg } from './settings.js';

import { clean, el } from './elements.js';



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



export { generateSuggestions };

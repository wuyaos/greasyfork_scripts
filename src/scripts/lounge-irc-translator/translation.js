import { collectContext } from './chat.js';

import { getCfg } from './settings.js';

import { clean, gmJson, sleep } from './elements.js';



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



export { translate, translateLLM };

import { CJK_RE } from './config.js';

import { state } from './state.js';

import { activeMsgRows, locateForm, locateInput } from './chat.js';

import { translateLLM } from './translation.js';

import { msgCacheGet, msgCacheKey, msgCacheSet } from './message-cache.js';

import { ensureOverlayInForm } from './panel.js';

import { getCfg } from './settings.js';

import { clean, el, gmJson, sleep } from './elements.js';



const autoQueue = [];

let autoRunning = false;

let queueDelay = 400;

const QUEUE_DELAY_MIN = 400;

const QUEUE_DELAY_MAX = 4000;

let sweepTimer = 0;

function ensureBound() {
    if (state.input && state.input.isConnected) return;
    const input = locateInput();
    if (!input) return;
    state.input = input;
    state.form = locateForm();
    ensureOverlayInForm();
  }

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



export { attachChatObserver };

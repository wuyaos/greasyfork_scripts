import { state } from './state.js';

import { clean } from './elements.js';



function locateInput() {
    return document.querySelector("#input");
  }

function locateForm() {
    return (
      document.querySelector("#form") ||
      (state.input && state.input.closest("form"))
    );
  }

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

function nickOf(node) {
    if (!node) return "";
    return clean(node.getAttribute?.("data-name") || node.textContent || "");
  }

function activeMsgRows() {
    const rows = [
      ...document.querySelectorAll("#chat .chan.active .messages .msg"),
    ];
    return rows.length
      ? rows
      : [...document.querySelectorAll("#chat .messages .msg")];
  }

function selfNick() {
    return clean(document.querySelector("#nick")?.textContent || "");
  }

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

function resolvePhrase(phrase) {
    if (!phrase.includes("{nick}")) return phrase;
    const nick = lastSpeakerNick();
    return phrase
      .split("{nick}")
      .join(nick)
      .replace(/\s{2,}/g, " ")
      .trim();
  }



export { activeMsgRows, collectContext, lastSpeakerNick, locateForm, locateInput, resolvePhrase, selfNick, sendText };

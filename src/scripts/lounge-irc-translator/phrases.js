import { state } from './state.js';

import { resolvePhrase } from './chat.js';

import { fillCandidate } from './panel.js';

import { getCfg, setCfg } from './settings.js';

import { clean, el } from './elements.js';



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



export { getPhrases, renderPhrases, savePhrases };

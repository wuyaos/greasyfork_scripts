import { state } from './state.js';

import { locateForm, locateInput } from './chat.js';

import { attachChatObserver } from './auto-translation.js';

import { buildUI } from './panel.js';

import { openSettings } from './settings.js';

import { bindEvents } from './events.js';



const ready = () => {
    // The Lounge 是 Vue SPA：#input 要等应用挂载并渲染出聊天区后才存在，轮询等待而非一次性放弃
    if (state.panel) return; // 已构建，防重复初始化
    state.input = locateInput();
    if (!state.input) {
      setTimeout(ready, 400);
      return;
    }
    state.form = locateForm();
    buildUI();
    bindEvents();
    attachChatObserver();
  };

function bootstrap() {
GM_registerMenuCommand("翻译助手设置", openSettings);

if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ready);
  else ready();
}



export { bootstrap };

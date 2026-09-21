// ==UserScript==
// @name         Lounge IRC 翻译助手
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.8.6
// @description  The Lounge IRC 翻译助手：频道外文消息自动翻译为中文（引擎可选谷歌/LLM），译文内联下划虚线跟随原文；常驻侧边面板提供候选回答与常用语（{nick} 点名、自定义增删），免展开；中文输入 Enter 预览确认（预览与频道消息同列）或快捷键就地翻译（三连空格/Tab/Ctrl+Enter 可选），风格提示词可自定义；LLM 思考模式可配置。/命令、#频道、昵称原样保留。
// @author       wuyaos & AI
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/lounge-irc-translator.png
// @match        http://192.168.123.115:9033/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// @noframes
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Lounge_IRC_Translator.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Lounge_IRC_Translator.user.js
// ==/UserScript==

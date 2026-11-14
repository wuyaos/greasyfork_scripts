// ==UserScript==
// @name         Cola 剪贴板图片解析填入
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.4.6
// @description  在 Cola PT (colapt.com) 发布页注入「解析剪贴板图片」按钮：从剪贴板解析任意域名的图片地址（每行裸 URL、[img]URL[/img]、[url=..][img]URL[/img][/url] 可混合出现），按顺序填入截图地址列表，自动点「添加截图地址」补足输入框。
// @author       wuyaos & AI
// @match        https://www.colapt.com/upload*
// @match        https://colapt.com/upload*
// @icon         https://www.colapt.com/brand/cola/favicon-black-red.ico
// @run-at       document-idle
// @noframes
// @license      MIT
// ==/UserScript==

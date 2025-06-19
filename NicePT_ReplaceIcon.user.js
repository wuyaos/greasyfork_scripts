// ==UserScript==
// @name         nicePT分类图标替换（自用）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  替换分类中的图标，一目了然
// @match        https://www.nicept.net/*
// @grant        none
// @icon         https://www.nicept.net/favicon.ico
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/NicePT_ReplaceIcon.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/NicePT_ReplaceIcon.user.js
// ==/UserScript==

(function () {
    'use strict';

    // 图标匹配规则
    const iconMap = [
        {
            match: /写真、套图/,
            url: "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/class icon/xz.png"
        },
        {
            match: /动漫/,
            url: "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/class icon/dm.png"
        },
        {
            match: /欧美/,
            url: "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/class icon/om.png"
        },
        {
            match: /日本无码/,
            url: "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/class icon/rb.png"
        },
        {
            match: /其他（限制级）/,
            url: "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/class icon/qt.png"
        },
        {
            match: /日本有码/,
            url: "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/class icon/rq.png"
        },
        {
            match: /SM调教/,
            url: "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/class icon/sm.png"
        },
        {
            match: /真人秀，自拍（限制级）/,
            url: "https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/class icon/zr.png"
        }
    ];

    function replaceIcons() {
        // 同时查找 c_doc 和 c_movies 两种图标
        const icons = document.querySelectorAll('img.c_doc, img.c_movies');

        icons.forEach(img => {
            const descriptor = img.alt || img.title || '';

            for (const rule of iconMap) {
                if (rule.match.test(descriptor)) {
                    const div = document.createElement("div");

                    div.style.display = "inline-block";
                    div.style.width = img.width ? `${img.width}px` : '45px';
                    div.style.height = img.height ? `${img.height}px` : '45px';

                    div.style.backgroundImage = `url(${rule.url})`;
                    div.style.backgroundSize = "cover";
                    div.style.backgroundRepeat = "no-repeat";
                    div.style.backgroundPosition = "center";

                    if (img.title) div.title = img.title;

                    img.replaceWith(div);
                    break; // 找到匹配就停止
                }
            }
        });
    }

    replaceIcons();

    // 监听动态内容
    const observer = new MutationObserver(replaceIcons);
    observer.observe(document.body, { childList: true, subtree: true });
})();
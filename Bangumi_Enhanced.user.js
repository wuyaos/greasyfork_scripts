// ==UserScript==
// @name         Bangumi Enhanced (中文标题与放送优化)
// @namespace    https://greasyfork.org/zh-CN/users/756550
// @version      1.0.0
// @description  Bangumi增强脚本：显示中文标题，优化放送日历(仿B站番剧时间表)。
// @author       ffwu
// @match        http*://bgm.tv/*
// @match        http*://bangumi.tv/*
// @match        http*://chii.in/*
// @icon         https://bgm.tv/img/favicon.ico
// @grant        GM_addStyle
// @run-at       document-start
// @icon         https://bgm.tv/img/favicon.ico
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/Bangumi_Enhanced.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/Bangumi_Enhanced.user.js
// ==/UserScript==

(function () {
    'use strict';

    // --- --- --- Script Configuration --- --- ---
    // --- 来自 "Bangumi/bgm.tv 每日番剧放送 (仿B站番剧时间表).user.js" ---
    const CONFIG_CALENDAR_ADD_NAV_BUTTON = true; // 是否在顶部菜单添加"放送"快捷按钮
    const CONFIG_CALENDAR_SHOW_SUBTITLE = true;   // 是否显示副标题 (放送日历页面)

    // --- 来自 "Bangumi/bgm.tv 显示中文标题，样式优化.user.js" ---
    const CONFIG_HOMEPAGE_TINY_MODE_FONT_SIZE = "1.2em"; // 番剧管理器字号放大 (首页)
    const CONFIG_HOMEPAGE_ENABLE_EDIT_BUTTON = false;    // 番剧管理器edit按钮是否启用 (首页)
    const CONFIG_HOMEPAGE_EDIT_BUTTON_TEXT = "❤";       // edit按钮文本 (首页)


    // --- --- --- Global Variables & SVG Icons (主要来自放送日历脚本) --- --- ---
    const CALENDAR_LEFT_BTN_SVG = `
        <svg t="1618724723358" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2015" width="100" height="200">
            <path d="M704 908.8 307.2 512 704 115.2c25.6-25.6 25.6-70.4 0-96-25.6-25.6-70.4-25.6-96 0L166.4 460.8C147.2 480 140.8 492.8 140.8 512s6.4 32 19.2 51.2l441.6 441.6c25.6 25.6 70.4 25.6 96 0C729.6 979.2 729.6 934.4 704 908.8z" p-id="2016" fill="#BBB"></path>
        </svg>`;
    const CALENDAR_RIGHT_BTN_SVG = `
        <svg t="1618724984341" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2791" width="100" height="200">
            <path d="M294.4 908.8 684.8 512 294.4 115.2c-25.6-25.6-25.6-70.4 0-96 25.6-25.6 70.4-25.6 96 0L832 460.8c12.8 12.8 19.2 32 19.2 51.2S844.8 544 832 563.2l-441.6 441.6c-25.6 25.6-70.4 25.6-96 0C262.4 979.2 262.4 934.4 294.4 908.8z" p-id="2792" fill="#BBB"></path>
        </svg>`;

    const CURRENT_PATHNAME = document.location.pathname;
    const TODAY_DATE_OBJ = new Date();
    const TODAY_DAY_OF_WEEK = TODAY_DATE_OBJ.getDay(); // 0 for Sunday, 1 for Monday...
    const TODAY_MONTH = TODAY_DATE_OBJ.getMonth() + 1;
    const TODAY_DATE_IN_MONTH = TODAY_DATE_OBJ.getDate();


    // --- --- --- CSS Styles Application --- --- ---
    function applyStyles() {
        let combinedCSS = "";

        // --- 全局通用样式 (合并自两个脚本) ---
        combinedCSS += `
            /* 全局 */
            #main { /* From Calendar Script */
                width: 990px;
            }
            #header small.blue { /* From Calendar Script, header统计 */
                font-size: 16px;
            }
            /* 隐藏doujin天窗联盟 (Merged from both scripts) */
            #navNeue2 #navMenuNeue li.doujin {
                display: none;
            }
            #navNeue2 #menuNeue { /* From Title/Style Script */
                width: inherit;
            }
            /* 搜索框拉长 (From Title/Style Script) */
            #headerNeue2 #headerSearch input.textfield {
                width: initial;
            }
            /* 全局输入字体调大 (From Title/Style Script) */
            input[type=text], input[type=password], textarea {
                font-size: 1.2em;
            }
        `;

        // --- 放送日历页面样式 (/calendar) ---
        if (CURRENT_PATHNAME.endsWith("/calendar")) {
            combinedCSS += `
                /* 日历头 */
                div.BgmCalendar dl dt {
                    background: none;
                    height: 35px;
                    width: 330px;
                }
                div.BgmCalendar h3 {
                    text-indent: 0;
                    font-size: 2em;
                    width: inherit;
                    line-height: normal;
                    color: #555;
                }
                html[data-theme='dark'] div.BgmCalendar h3 { /* 关灯环境 */
                    color: #DDD;
                }
                /* 日历主体 */
                .columns { /* Viewport for calendar */
                    width: 990px; /* Shows 3 days */
                    overflow: hidden;
                }
                #colunmSingle { /* Sliding container for all 7 days */
                    width: 2310px; /* 7 days * 330px per day */
                    display: flex; /* Ensures days are laid out horizontally */
                    transform: translateX(${-TODAY_DAY_OF_WEEK * 330}px); /* Initial position: Today is first */
                    transition: transform 0.5s ease;
                }
                /* 每列栏目 */
                div.BgmCalendar dl dd {
                    border-left: 5px dotted #FF0F00;
                    border-right: none;
                    flex-shrink: 0; /* Prevent shrinking if flex container is too small */
                }
                div.BgmCalendar ul.large li.week { /* Each day column */
                    width: 300px; /* Content width */
                    padding-right: 30px; /* Total 330px */
                    box-sizing: content-box;
                }
                /* 海报 */
                div.BgmCalendar ul.coverList li {
                    height: 80px;
                    width: 80px;
                    border: none;
                    border-radius: 4px;
                    margin: 10px 0 0 10px;
                    background-size: cover !important;
                    background-position-x: inherit !important;
                    background-position-y: inherit !important;
                    background-repeat: no-repeat !important;
                }
                /* 标题 */
                div.BgmCalendar ul.coverList li div.info_bg {
                    background: none;
                    opacity: initial;
                    color: #000;
                    font-size: 1.2em;
                    font-weight: 600;
                    line-height: normal;
                    overflow: initial;
                    width: 200px;
                    height: inherit;
                    bottom: initial;
                    padding: 0 0 0 90px;
                }
                div.info { /* Inside info_bg */
                    height: inherit;
                }
                a.nav, a.nav:link, a.nav:visited, a.nav:active {
                    color: #000; /* Ensuring calendar item titles are black by default */
                }
                div.BgmCalendar ul.coverList li:hover div.info_bg {
                    height: inherit;
                }
                div.BgmCalendar ul.coverList li:hover div.info {
                    position: initial;
                    bottom: initial;
                    line-height: normal;
                }
                /* 副标题 原标题 */
                .info_bg em {
                    font-weight: 500;
                    font-style: normal;
                    font-size: 1em;
                    color: #999;
                    ${CONFIG_CALENDAR_SHOW_SUBTITLE ? '' : 'opacity: 0;'}
                }
                /* 左右控制按钮 */
                #calendarLeftBtn, #calendarRightBtn {
                    position: fixed;
                    bottom: calc(50% - 100px);
                    cursor: pointer;
                    opacity: 0.2;
                    z-index: 1002; /* Higher than most bgm elements */
                }
                #calendarLeftBtn { left: 0; }
                #calendarRightBtn { right: 0; }
                #calendarLeftBtn:hover, #calendarRightBtn:hover {
                    background: rgb(245, 245, 245);
                    opacity: 1;
                }
                html[data-theme='dark'] #calendarLeftBtn:hover, html[data-theme='dark'] #calendarRightBtn:hover {
                    background: #5e5e5e;
                }
            `;
        }

        // --- 条目详情页与章节页样式 (/subject/*, /ep/*) ---
        if (CURRENT_PATHNAME.startsWith("/subject/") || CURRENT_PATHNAME.startsWith("/ep/")) {
            combinedCSS += `
                /* 话数按钮优化 */
                a.epBtnUnknown, a.epBtnWatched, a.epBtnAir, a.epBtnNA, a.epBtnQueue, a.epBtnToday, a.epBtnDrop {
                    border: 1px solid #0000;
                    border-radius: 2px;
                    font-size: 1.3em !important;
                }
                ul.prg_list a, ul.prg_list a:active, ul.prg_list a:visited { /* General styling for episode buttons */
                    padding: 2px;
                    margin: 0 4px 6px 0;
                }
                /* hover高亮 */
                a.epBtnUnknown:hover, a.epBtnWatched:hover, a.epBtnAir:hover,
                a.epBtnNA:hover, a.epBtnQueue:hover, a.epBtnToday:hover, a.epBtnDrop:hover {
                    background-color: orange;
                    color: white !important; /* Important to override default link colors */
                    /* border: 1px solid #0000; */ /* Not strictly needed if bg is solid */
                }
                ul.prg_list a:hover { /* General hover for episode list items */
                    padding: 2px; /* Keep padding consistent */
                    -webkit-transform: scale(1.1);
                    transform: scale(1.1);
                }
                /* 关灯环境 for hover */
                html[data-theme='dark'] a.epBtnUnknown:hover, html[data-theme='dark'] a.epBtnWatched:hover,
                html[data-theme='dark'] a.epBtnAir:hover, html[data-theme='dark'] a.epBtnNA:hover,
                html[data-theme='dark'] a.epBtnQueue:hover, html[data-theme='dark'] a.epBtnToday:hover,
                html[data-theme='dark'] a.epBtnDrop:hover {
                    background-color: orange;
                    color: white !important; /* Ensure white text on orange */
                    /* border: 1px solid #0000; */
                }
            `;
            if (CURRENT_PATHNAME.startsWith("/ep/")) {
                combinedCSS += `
                    /* 章节讨论区右侧固定 */
                    #columnEpB {
                        position: -webkit-sticky;
                        position: sticky;
                        top: 10px;
                    }
                `;
            }
        }

        // --- 登录后首页样式 (/) ---
        if (CURRENT_PATHNAME === "/") {
            combinedCSS += `
                /* hide prgsPercentNum */
                #prgsPercentNum {
                    display: none;
                }
                /* prg button general */
                [id^='prg_'] { /* General styling for progress buttons */
                    border: 1px solid #0000 !important;
                    border-radius: 2px;
                }
                ul.prg_list { /* Container for progress buttons */
                    padding-top: 0.3em;
                    line-height: 100%;
                }
                /* prg button hover in tinyMode */
                .tinyMode ul.prg_list a:hover {
                    padding: 2px 2px;
                    background-color: orange;
                    color: white;
                    -webkit-transform: scale(1.1);
                    transform: scale(1.1);
                }
                /* 关灯环境 for tinyMode hover */
                html[data-theme='dark'] .tinyMode a.epBtnNA:hover, html[data-theme='dark'] a.sepBtnNA:hover {
                    color: #FFF; /* Keep text white */
                    border-top: initial; /* Reset from original script if any */
                }
                /* 作品标题字号放大 (tinyMode) */
                [id^='subjectPanel'] > div.epGird > div > a:nth-last-of-type(1) {
                    font-size: ${CONFIG_HOMEPAGE_TINY_MODE_FONT_SIZE};
                }
                /* edit按钮显示/隐藏 */
                [id^='sbj_prg_'] {
                    ${CONFIG_HOMEPAGE_ENABLE_EDIT_BUTTON ? 'color: pink !important;' : 'display: none;'}
                }

                /* blockMode CSS for episode buttons (similar to subject page) */
                #prgManagerMainBox.blockMode a.epBtnUnknown, #prgManagerMainBox.blockMode a.epBtnWatched,
                #prgManagerMainBox.blockMode a.epBtnAir, #prgManagerMainBox.blockMode a.epBtnNA,
                #prgManagerMainBox.blockMode a.epBtnQueue, #prgManagerMainBox.blockMode a.epBtnToday,
                #prgManagerMainBox.blockMode a.epBtnDrop {
                    border: 1px solid #0000;
                    border-radius: 2px;
                    font-size: 1.3em !important;
                }
                #prgManagerMainBox.blockMode ul.prg_list a {
                    margin: 0 4px 6px 0;
                    padding: 2px;
                }
                #prgManagerMainBox.blockMode a.epBtnUnknown:hover, #prgManagerMainBox.blockMode a.epBtnWatched:hover,
                #prgManagerMainBox.blockMode a.epBtnAir:hover, #prgManagerMainBox.blockMode a.epBtnNA:hover,
                #prgManagerMainBox.blockMode a.epBtnQueue:hover, #prgManagerMainBox.blockMode a.epBtnToday:hover,
                #prgManagerMainBox.blockMode a.epBtnDrop:hover {
                    background-color: orange;
                    color: white;
                }
                #prgManagerMainBox.blockMode ul.prg_list a:hover {
                    -webkit-transform: scale(1.1);
                    transform: scale(1.1);
                }
            `;
        }
        GM_addStyle(combinedCSS);
    }
    applyStyles(); // Apply styles as soon as possible

    // --- --- --- Helper Functions --- --- ---

    // --- 放送日历页专属功能 (/calendar) ---
    function calendar_addHeaderDateText() {
        const dic = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const todayHeader = document.querySelector(`.week.${dic[TODAY_DAY_OF_WEEK]} h3`);
        if (todayHeader) {
            todayHeader.innerText += " (今天)";
            todayHeader.style.color = "orange";
        }
        for (let i = 0; i <= 6; i++) {
            if (i !== TODAY_DAY_OF_WEEK) {
                const dayHeader = document.querySelector(`.week.${dic[i]} h3`);
                if (dayHeader) {
                    // Calculate date for other days relative to today
                    let tempDate = new Date(TODAY_DATE_OBJ);
                    tempDate.setDate(TODAY_DATE_OBJ.getDate() + (i - TODAY_DAY_OF_WEEK));
                    dayHeader.innerText = dayHeader.innerText.split(" (")[0] + ` (${tempDate.getMonth() + 1}-${tempDate.getDate()})`;
                }
            }
        }
    }

    function calendar_completeContent() {
        // 主标题补全(部分番剧无主标题)
        document.querySelectorAll(".info p:nth-child(1)").forEach(function (t) {
            if (t.innerText.trim() === "" && t.firstElementChild && t.nextElementSibling) {
                t.firstElementChild.innerText = t.nextElementSibling.innerText;
            }
        });
        // 海报图片补全(冷门番剧无海报)
        document.querySelectorAll(`.coverList li[style*="/lain.bgm.tv/pic/cover/c/')"]`).forEach(function (t) {
            // More robust check for empty background
            if (t.style.backgroundImage.includes("/c/')") && !t.style.backgroundImage.match(/\/c\/.*?\.(jpg|png|gif)/i)) {
                 t.style.backgroundImage = "url('//lain.bgm.tv/img/no_icon_subject.png')";
            }
        });
         // A more specific selector from original script1
        document.querySelectorAll(`.coverList li[style="background:url('//lain.bgm.tv/pic/cover/c/') 50% 20%"]`).forEach(function (t) {
            t.style.backgroundImage = "url('//lain.bgm.tv/img/no_icon_subject.png')";
        });
    }

    function calendar_addLinkTarget() {
        document.querySelectorAll('.BgmCalendar a').forEach(function (t) {
            t.setAttribute('target', '_blank');
        });
    }

    function calendar_addControlButtons() {
        const colunmSingle = document.getElementById("colunmSingle");
        if (!colunmSingle) return;

        const parent = document.querySelector(".columns");
        if (!parent) return;

        const leftBtn = document.createElement("div");
        leftBtn.id = "calendarLeftBtn";
        leftBtn.innerHTML = CALENDAR_LEFT_BTN_SVG;

        const rightBtn = document.createElement("div");
        rightBtn.id = "calendarRightBtn";
        rightBtn.innerHTML = CALENDAR_RIGHT_BTN_SVG;

        parent.insertBefore(leftBtn, parent.firstChild); // Insert before .columns content
        parent.appendChild(rightBtn);

        const dayWidth = 330;
        const minTranslateX = -(6 * dayWidth); // Allows scrolling to show Saturday as first item
        const maxTranslateX = 0; // Allows scrolling to show Sunday as first item

        leftBtn.addEventListener("click", function () {
            let currentTransform = colunmSingle.style.transform || "translateX(0px)";
            let currentMove = parseInt(currentTransform.match(/-?\d+/)[0]);
            let newMove = currentMove + dayWidth;
            if (newMove > maxTranslateX) newMove = maxTranslateX;
            colunmSingle.style.transform = `translateX(${newMove}px)`;
        });

        rightBtn.addEventListener("click", function () {
            let currentTransform = colunmSingle.style.transform || "translateX(0px)";
            let currentMove = parseInt(currentTransform.match(/-?\d+/)[0]);
            let newMove = currentMove - dayWidth;
            if (newMove < minTranslateX) newMove = minTranslateX;
            colunmSingle.style.transform = `translateX(${newMove}px)`;
        });
    }

    // --- 条目/剧集页专属功能 (/subject/*, /ep/*) ---
    function subjectEp_replaceH1Title() {
        const h1Link = document.querySelector("#headerSubject > h1 > a");
        if (h1Link && h1Link.title.trim() !== "" && h1Link.text.trim() !== h1Link.title.trim()) {
            const originalTitleText = h1Link.text;
            h1Link.text = h1Link.title; // Set Chinese title

            const smallOriginalTitle = document.createElement("small");
            smallOriginalTitle.innerText = ` ${originalTitleText} `; // Add space for separation
            smallOriginalTitle.style.fontSize = "0.65em"; // Make it smaller
            smallOriginalTitle.style.opacity = "0.8";
            h1Link.parentNode.insertBefore(smallOriginalTitle, h1Link.nextSibling);

            // Update right side info link if it exists and shows Japanese title
            const rightTitleLink = document.querySelector("#subject_inner_info > a.title");
            if (rightTitleLink && rightTitleLink.title === originalTitleText) {
                 // This part of script2 was: rightTitle.innerHTML = rightTitle.innerHTML.replace(rightTitle.title, h1Title.text);
                 // It seems it intended to replace the display text if it matched the old h1 title.
                 // Let's ensure it correctly refers to the new h1Link.text which is Chinese.
                 if (rightTitleLink.innerText.includes(originalTitleText)) {
                    rightTitleLink.innerHTML = rightTitleLink.innerHTML.replace(originalTitleText, h1Link.text);
                 }
            }
        }
    }

    // --- 首页专属功能 (/) ---
    function homepage_convertTitlesAndButtons() {
        // Convert titles in tinyMode
        document.querySelectorAll("#prgsMakerList [id^='subjectPanel'] > div.epGird > div > a:nth-last-of-type(1)").forEach(function (t) {
            const cnTitle = t.getAttribute('title') || t.getAttribute('data-original-title');
            if (cnTitle && cnTitle.trim() !== "") {
                if (t.innerText.trim() !== cnTitle.trim()) {
                    t.innerText = cnTitle;
                }
                t.removeAttribute('title'); // Clear to prevent default tooltip
                t.removeAttribute('data-original-title');
            }
        });

        // Convert titles in blockMode (central column)
        document.querySelectorAll("#prgsMakerList [id^='subjectPanel'] > div.header.clearit > div > h3 > a").forEach(function (t) {
            const cnTitle = t.getAttribute('title') || t.getAttribute('data-original-title');
            if (cnTitle && cnTitle.trim() !== "") {
                 if (t.innerText.trim() !== cnTitle.trim()) {
                    t.innerText = cnTitle;
                }
                t.removeAttribute('title');
                t.removeAttribute('data-original-title');
            }
        });
        
        // Convert titles in blockMode (left list #prgSubjectList)
        document.querySelectorAll("#prgSubjectList li a.subjectItem.title.textTip").forEach(function (t) {
            const cnTitle = t.getAttribute('title') || t.getAttribute('data-original-title');
            const span = t.querySelector("span");
            if (span && cnTitle && cnTitle.trim() !== "") {
                if (span.innerHTML.trim() !== cnTitle.trim()) {
                    span.innerHTML = cnTitle;
                }
                t.removeAttribute('title');
                t.removeAttribute('data-original-title');
            }
        });


        // Customize edit button text if enabled
        if (CONFIG_HOMEPAGE_ENABLE_EDIT_BUTTON) {
            document.querySelectorAll("[id^='sbj_prg_']").forEach(function (t) {
                t.innerText = CONFIG_HOMEPAGE_EDIT_BUTTON_TEXT;
            });
        }
    }

    // --- 全局功能 (导航按钮等) ---
    function global_addCalendarNavButton() {
        const navMenu = document.querySelector("#navMenuNeue");
        if (navMenu && !navMenu.querySelector('a[href="/calendar"].top.chl')) {
            const calendarLi = document.createElement("li");
            calendarLi.innerHTML = `<a href="/calendar" class="top chl"><span>放送</span></a>`;
            if (navMenu.children.length > 1) {
                navMenu.insertBefore(calendarLi, navMenu.children[1]); // Insert after "动画" or first item
            } else {
                navMenu.appendChild(calendarLi);
            }
        }
    }

    // --- --- --- Main Execution Logic --- --- ---
    window.addEventListener('DOMContentLoaded', function () {
        console.log("Bangumi Enhanced Script Loaded. Path: " + CURRENT_PATHNAME);

        // 全局DOM操作
        if (CONFIG_CALENDAR_ADD_NAV_BUTTON) {
            global_addCalendarNavButton();
        }

        // 放送日历页专属逻辑
        if (CURRENT_PATHNAME.endsWith("/calendar")) {
            console.log("Bangumi Enhanced: Applying Calendar Page JS");
            calendar_addHeaderDateText();
            calendar_completeContent();
            calendar_addLinkTarget();
            calendar_addControlButtons();
        }
        // 条目/剧集页专属逻辑
        else if (CURRENT_PATHNAME.startsWith("/subject/") || CURRENT_PATHNAME.startsWith("/ep/")) {
            console.log("Bangumi Enhanced: Applying Subject/Episode Page JS");
            subjectEp_replaceH1Title();
        }
        // 首页专属逻辑
        else if (CURRENT_PATHNAME === "/") {
            console.log("Bangumi Enhanced: Applying Homepage JS");
            homepage_convertTitlesAndButtons(); // Initial conversion

            // Interval for dynamically loaded items on homepage (from script2)
            let homepage_lastBgmCount = 0;
            let homepage_interval_exec_count = 0;
            const homepage_intervalId = setInterval(() => {
                // Script2 selector: #cloumnSubjectInfo .epGird .tinyHeader
                // More general for items: #prgsMakerList [id^='subjectPanel']
                const bgmList = document.querySelectorAll("#prgsMakerList [id^='subjectPanel']");
                if (bgmList && bgmList.length > homepage_lastBgmCount) {
                    console.log("Bangumi Enhanced: Homepage - new items detected, converting titles.");
                    homepage_lastBgmCount = bgmList.length;
                    homepage_convertTitlesAndButtons();
                }
                homepage_interval_exec_count++;
                if (homepage_interval_exec_count >= 80) { // Poll for ~8 seconds (80 * 100ms)
                    clearInterval(homepage_intervalId);
                }
            }, 100);
        }
    });

})();
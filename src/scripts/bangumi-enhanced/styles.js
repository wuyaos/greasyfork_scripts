import stylesheet1 from './styles/styles-1.css';
import stylesheet2 from './styles/styles-2.css';
import { CONFIG_CALENDAR_SHOW_SUBTITLE, CONFIG_HOMEPAGE_ENABLE_EDIT_BUTTON, CONFIG_HOMEPAGE_TINY_MODE_FONT_SIZE, CURRENT_PATHNAME, TODAY_DAY_OF_WEEK } from './config.js';



function applyStyles() {
        let combinedCSS = "";

        // --- 全局通用样式 (合并自两个脚本) ---
        combinedCSS += stylesheet1;

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
            combinedCSS += stylesheet2;
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



export { applyStyles };

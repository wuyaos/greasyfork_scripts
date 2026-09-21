import { CONFIG_CALENDAR_ADD_NAV_BUTTON, CURRENT_PATHNAME } from './config.js';

import { applyStyles } from './styles.js';

import { calendar_addControlButtons, calendar_addHeaderDateText, calendar_addLinkTarget, calendar_completeContent } from './calendar.js';

import { subjectEp_replaceH1Title } from './subject-title.js';

import { homepage_convertTitlesAndButtons } from './homepage.js';

import { global_addCalendarNavButton } from './navigation.js';



function bootstrap() {
applyStyles();

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
}



export { bootstrap };

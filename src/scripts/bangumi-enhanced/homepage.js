import { CONFIG_HOMEPAGE_EDIT_BUTTON_TEXT, CONFIG_HOMEPAGE_ENABLE_EDIT_BUTTON } from './config.js';



function homepage_convertTitlesAndButtons() {
        // 中文标题替换（tinyMode / blockMode 中央列 / blockMode 左侧列表共用同一处理）
        const applyCnTitle = (el, target) => {
            const cnTitle = el.getAttribute('title') || el.getAttribute('data-original-title');
            if (cnTitle && cnTitle.trim() !== "") {
                if (target.innerText.trim() !== cnTitle.trim()) {
                    target.innerText = cnTitle;
                }
                el.removeAttribute('title'); // Clear to prevent default tooltip
                el.removeAttribute('data-original-title');
            }
        };
        document.querySelectorAll("#prgsMakerList [id^='subjectPanel'] > div.epGird > div > a:nth-last-of-type(1)")
            .forEach(t => applyCnTitle(t, t));
        document.querySelectorAll("#prgsMakerList [id^='subjectPanel'] > div.header.clearit > div > h3 > a")
            .forEach(t => applyCnTitle(t, t));
        document.querySelectorAll("#prgSubjectList li a.subjectItem.title.textTip").forEach(function (t) {
            const span = t.querySelector("span");
            const cnTitle = t.getAttribute('title') || t.getAttribute('data-original-title');
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



export { homepage_convertTitlesAndButtons };

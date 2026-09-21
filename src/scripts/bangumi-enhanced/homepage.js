import { CONFIG_HOMEPAGE_EDIT_BUTTON_TEXT, CONFIG_HOMEPAGE_ENABLE_EDIT_BUTTON } from './config.js';



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



export { homepage_convertTitlesAndButtons };

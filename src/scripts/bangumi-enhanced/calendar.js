import { CALENDAR_LEFT_BTN_SVG, CALENDAR_RIGHT_BTN_SVG, TODAY_DATE_OBJ, TODAY_DAY_OF_WEEK } from './config.js';



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



export { calendar_addControlButtons, calendar_addHeaderDateText, calendar_addLinkTarget, calendar_completeContent };

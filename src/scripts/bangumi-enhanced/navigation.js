

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



export { global_addCalendarNavButton };

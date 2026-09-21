import { iconMap } from './icon-rules.js';



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



export { replaceIcons };

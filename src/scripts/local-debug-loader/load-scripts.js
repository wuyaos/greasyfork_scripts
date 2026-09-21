import { IYUU_SCRIPT_URL, MP_SCRIPT_URL, log } from './config.js';

import { requestText } from './request.js';

import { shouldLoadIyuu } from './routing.js';



async function loadScripts() {
        const urls = shouldLoadIyuu() ? [IYUU_SCRIPT_URL, MP_SCRIPT_URL] : [MP_SCRIPT_URL];
        for (const url of urls) {
            try {
                const code = await requestText(url);
                if (!code.trim()) throw new Error(`${url} is empty`);
                log(`加载 ${url}`);
                eval(`${code}\n//# sourceURL=${url}`);
            } catch (error) {
                log(`加载失败 ${url}`, error?.stack || error?.message || error);
            }
        }
    }



export { loadScripts };

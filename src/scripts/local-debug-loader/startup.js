import { log } from './config.js';

import { loadScripts } from './load-scripts.js';



const boot = () => loadScripts().then(() => log('全部本地脚本已加载')).catch(error => log('加载失败', error?.message || error));

function bootstrap() {
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
}



export { bootstrap };

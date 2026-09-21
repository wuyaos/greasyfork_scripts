import { registerMenus, shouldRun } from './sites.js';

import { start } from './mount.js';



function bootstrap() {
registerMenus()

if (!shouldRun()) {
    // AJAX 站点（如 MAM freeleech.php）DOM 加载后重试
    const obs = new MutationObserver(() => { if (shouldRun()) { obs.disconnect(); start(); } });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 30000);
    return;
  }

start()
}



export { bootstrap };

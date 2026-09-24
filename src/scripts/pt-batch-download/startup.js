import { registerMenus, shouldRun } from './sites.js';

import { start } from './mount.js';



// JSZip 的异步调度依赖全局 setImmediate；其自带垫片在油猴沙箱里可能落到永不触发的
// 分支（如 script onreadystatechange），导致 ZIP 流 0 事件静默卡死。JSZip 在运行时动态
// 查找全局 setImmediate，这里在启动前统一提供一个基于 setTimeout 的可用实现。
globalThis.setImmediate = fn => setTimeout(fn, 0)
globalThis.clearImmediate = id => clearTimeout(id)

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

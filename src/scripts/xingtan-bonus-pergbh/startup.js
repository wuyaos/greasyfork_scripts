import { appendPerGBhRow } from './bonus.js';

const PROCESSED = 'data-gbh-processed';

function processRows() {
  document.querySelectorAll('.bonus-data').forEach(bonusData => {
    if (bonusData.hasAttribute(PROCESSED)) return;
    const bonusResult = bonusData.nextElementSibling;
    if (!bonusResult || !bonusResult.classList.contains('bonus-result')) return;
    if (appendPerGBhRow(bonusData, bonusResult)) bonusData.setAttribute(PROCESSED, '1');
  });
}

function bootstrap() {
  // 站点脚本在 DOMContentLoaded 渲染 bonus-result；观察 DOM 变化以覆盖延迟渲染和局部刷新。
  processRows();
  const observer = new MutationObserver(() => processRows());
  observer.observe(document.body, { childList: true, subtree: true });
}

export { bootstrap };

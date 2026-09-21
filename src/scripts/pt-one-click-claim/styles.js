import stylesheet1 from './styles/styles.css';
import { el } from './elements.js';



function ensureStyle() {
    if (document.querySelector('#pt-claim-plus-style')) return;
    const style = el('style', { id: 'pt-claim-plus-style' });
    style.textContent = stylesheet1;
    document.head.append(style);
  }



export { ensureStyle };

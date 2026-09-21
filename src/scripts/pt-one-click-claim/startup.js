import { state } from './config.js';

import { adapters } from './adapters.js';

import { getSeedingBlock, insertPanel, siteHasClaim } from './page.js';

import { buildPanel, refreshItemsAndOptions } from './panel.js';



async function init() {
    state.adapter = adapters.find(a => a.match());
    state.block = getSeedingBlock();
    if (!state.block || document.querySelector('#pt-claim-plus')) return console.log('当前做种未找到');
    const hasFeature = await siteHasClaim(state.adapter);
    if (!hasFeature) return console.log('当前站点无认领功能，隐藏操作栏');
    insertPanel(buildPanel());
    refreshItemsAndOptions();
  }

function bootstrap() {
window.addEventListener('load', init);
}



export { bootstrap };

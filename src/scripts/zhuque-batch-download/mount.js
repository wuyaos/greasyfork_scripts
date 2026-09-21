import { ID, state } from './config.js';

import { buildPanel } from './panel.js';

import { injectRowChecks, refreshRowsAndOptions } from './selection.js';

import { registerMenu } from './settings.js';



function mount() {
    if (document.querySelector('#' + ID)) { refreshRowsAndOptions(); return; }
    if (!document.querySelector('.ant-table-row')) return;
    const panel = buildPanel();
    const table = document.querySelector('.ant-table-wrapper') || document.querySelector('.ant-table') || document.querySelector('.ant-table-row')?.closest('div') || document.body;
    table.parentElement?.insertBefore(panel, table) || document.body.prepend(panel);
    injectRowChecks();
  }

function observe() {
    mount();
    const mo = new MutationObserver(() => {
      if (document.querySelector('.ant-table-row') && !document.querySelector('#' + ID)) mount();
      else refreshRowsAndOptions();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    if (state.mountTimer) clearInterval(state.mountTimer);
    state.mountTimer = setInterval(() => { if (document.querySelector('.ant-table-row') && !document.querySelector('#' + ID)) mount(); }, 1500);
  }

function start() {
    const ready = () => { observe(); registerMenu(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  }



export { start };

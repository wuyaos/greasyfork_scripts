import { getAdapter } from './sites.js';

import { buildPanel } from './panel.js';

import { refreshTorrents } from './torrents.js';

import { ensureStyle } from './styles.js';



function start() {
    const ready = () => {
      ensureStyle()
      buildPanel()
      refreshTorrents()
      watchListChanges()
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready)
    else ready()
  }

function watchListChanges() {
    const adapter = getAdapter()
    const root = adapter?.listRoot?.() || document.body
    let timer = null
    const observer = new MutationObserver(() => {
      if (timer) return
      timer = setTimeout(() => { timer = null; refreshTorrents() }, 600)
    })
    observer.observe(root, { childList: true, subtree: true })
  }



export { start };

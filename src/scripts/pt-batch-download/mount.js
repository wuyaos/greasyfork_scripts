import { getAdapter } from './sites.js';

import { ID } from './config.js';

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
    const observer = new MutationObserver(records => {
      const panel = document.getElementById(ID)
      const listChanged = records.some(record => {
        if (panel?.contains(record.target)) return false
        const nodes = [...record.addedNodes, ...record.removedNodes]
        return nodes.some(node => !(node === panel || panel?.contains(node)))
      })
      if (!listChanged) return
      if (timer) return
      timer = setTimeout(() => { timer = null; refreshTorrents() }, 600)
    })
    observer.observe(root, { childList: true, subtree: true })
  }



export { start };

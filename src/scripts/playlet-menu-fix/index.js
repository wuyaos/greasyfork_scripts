'use strict';

import { bindClickToggle, injectStyle } from './menu-style.js';

function init() {
  if (!document.getElementById('ddtopmenubar')) return;
  injectStyle();
  bindClickToggle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

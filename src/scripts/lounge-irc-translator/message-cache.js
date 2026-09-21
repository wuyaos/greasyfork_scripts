import { NS } from './config.js';

import { getCfg } from './settings.js';



function msgCacheKey(text) {
    return `${getCfg().channelEngine}\u0000${text}`;
  }

const MSG_CACHE_KEY = `${NS}_msg_cache`;

const MSG_CACHE_MAX = 500;

function msgCacheGet(text) {
    try {
      const cache = GM_getValue(MSG_CACHE_KEY, {}) || {};
      return cache[text] || "";
    } catch {
      return "";
    }
  }

function msgCacheSet(text, translated) {
    try {
      const cache = GM_getValue(MSG_CACHE_KEY, {}) || {};
      if (cache[text] === translated) return;
      cache[text] = translated;
      const keys = Object.keys(cache);
      if (keys.length > MSG_CACHE_MAX) delete cache[keys[0]];
      GM_setValue(MSG_CACHE_KEY, cache);
    } catch {}
  }



export { msgCacheGet, msgCacheKey, msgCacheSet };

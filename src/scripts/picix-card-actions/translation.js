import { TRANS_CACHE_KEY } from './config.js';

import { cfgDeeplxUrl, cfgOpenaiKey, cfgTransSrc } from './settings.js';



function gmRequest(opts) {
    return new Promise(resolve => {
      GM_xmlhttpRequest({ ...opts, timeout: 15000,
        onload: res => { try { resolve(JSON.parse(res.responseText)); } catch (_) { resolve(null); } },
        onerror: () => resolve(null), ontimeout: () => resolve(null)
      });
    });
  }

async function translate(text) {
    if (!text) return '';
    let cache = {};
    try { cache = GM_getValue(TRANS_CACHE_KEY, {}) || {}; } catch (_) {}
    const ckey = `${cfgTransSrc()}\u0000${text}`;
    if (cache[ckey]) return cache[ckey];
    let t = '';
    if (cfgTransSrc() === 'google') {
      const r = await gmRequest({ method: 'GET', url: `https://translate.google.com/translate_a/single?client=gtx&sl=ja&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}` });
      t = (r?.[0] || []).map(s => s?.[0] || '').join('');
    } else if (cfgTransSrc() === 'openai') {
      const key = cfgOpenaiKey();
      if (!key) return '';
      const r = await gmRequest({ method: 'POST', url: 'https://api.openai.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, data: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: '将日文翻译成中文，只输出译文' }, { role: 'user', content: text }] }) });
      t = r?.choices?.[0]?.message?.content?.trim() || '';
    } else {
      const url = cfgDeeplxUrl();
      if (!url) return '';
      const r = await gmRequest({ method: 'POST', url, headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ text, source_lang: 'auto', target_lang: 'ZH' }) });
      t = r?.data || '';
    }
    if (t) { cache[ckey] = t; try { GM_setValue(TRANS_CACHE_KEY, cache); } catch (_) {} }
    return t;
  }



export { translate };

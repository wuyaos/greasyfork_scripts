// ==UserScript==
// @name         Picix 卡片快捷操作
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.4.6
// @description  在 picix.us 影片卡片上直接解锁/收藏，无需进入详情页。复用页面 Vue $api（带签名），支持 Movies/Search、Movies/Rank、MovieList/Detail、Dashs 等含 a.movie-card 的页面。
// @author       wuyaos & AI
// @match        https://picix.us/*
// @icon         https://picix.us/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @connect      *
// @noframes
// @license      MIT
// @downloadURL  https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Picix_CardQuickActions.user.js
// @updateURL    https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Picix_CardQuickActions.user.js
// ==/UserScript==

(function () {
  'use strict';

  // 复用页面 Vue app 的 $api（axios，带 Authorization + X-Picix-Proof 签名拦截器）；GM_xmlhttpRequest 无法生成签名，故必须用页面实例。
  // API: POST /api/Movies/unlock {movieId,movieListLinkId:0}（2026-09 站方更新：fromMovieList 字段已移除，未知字段会被拒绝）| POST /api/Favorites/add|remove {type:'movies',resourceId}
  // 成功响应 res 可能为 null（响应拦截器）；失败(409 CONFLICT)抛 AxiosError，e.response.data 即业务错误体。
  const NS = 'picix-quick';
  const MOVIE_ID_RE = /\/Movies\/Detail\/(\d+)/;
  const LOCK_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3z"/></svg>';

  // 标题翻译（DeepLX）：菜单配置 URL + 开关，hover 时翻译，GM_setValue 持久化缓存
  const CFG_URL_KEY = 'picix_deeplx_url';
  const CFG_OPENAI_KEY = 'picix_openai_key';
  const CFG_TRANS_ON_KEY = 'picix_trans_on';
  const CFG_TRANS_SRC_KEY = 'picix_trans_src';
  const TRANS_CACHE_KEY = 'picix_trans_cache';
  function cfgDeeplxUrl() { return String(GM_getValue(CFG_URL_KEY, '') || '').trim(); }
  function cfgOpenaiKey() { return String(GM_getValue(CFG_OPENAI_KEY, '') || '').trim(); }
  function cfgTransOn() { return GM_getValue(CFG_TRANS_ON_KEY, true) !== false; }
  function cfgTransSrc() { return String(GM_getValue(CFG_TRANS_SRC_KEY, 'google')) || 'google'; }
  function openSettings() {
    const bg = document.createElement('div');
    bg.className = `${NS}-modal-bg`;
    const m = document.createElement('div');
    m.className = `${NS}-modal`;
    m.innerHTML = `<h3>Picix 设置</h3>` +
      `<label>翻译源<select id="${NS}-cfg-src"><option value="google" ${cfgTransSrc()==='google'?'selected':''}>Google（免费，易限流）</option><option value="deeplx" ${cfgTransSrc()==='deeplx'?'selected':''}>DeepLX（需URL）</option><option value="openai" ${cfgTransSrc()==='openai'?'selected':''}>OpenAI（需key）</option></select></label>` +
      `<label>DeepLX 翻译 URL（含 token，DeepLX 源时必填）<input type="text" id="${NS}-cfg-url" value="${cfgDeeplxUrl()}"></label>` +
      `<label>OpenAI API Key（OpenAI 源时必填，https://platform.openai.com/api-keys）<input type="text" id="${NS}-cfg-openai" value="${cfgOpenaiKey()}"></label>` +
      `<label><input type="checkbox" id="${NS}-cfg-on" ${cfgTransOn() ? 'checked' : ''}> 启用标题翻译</label>` +
      `<div class="${NS}-modal-btns"><button id="${NS}-cfg-save">保存并刷新</button><button id="${NS}-cfg-close">取消</button></div>`;
    bg.append(m); document.body.append(bg);
    bg.onclick = e => { if (e.target === bg) bg.remove(); };
    m.querySelector(`#${NS}-cfg-close`).onclick = () => bg.remove();
    m.querySelector(`#${NS}-cfg-save`).onclick = () => {
      GM_setValue(CFG_URL_KEY, m.querySelector(`#${NS}-cfg-url`).value.trim());
      GM_setValue(CFG_OPENAI_KEY, m.querySelector(`#${NS}-cfg-openai`).value.trim());
      GM_setValue(CFG_TRANS_ON_KEY, m.querySelector(`#${NS}-cfg-on`).checked);
      GM_setValue(CFG_TRANS_SRC_KEY, m.querySelector(`#${NS}-cfg-src`).value);
      bg.remove();
      location.reload();
    };
  }
  GM_registerMenuCommand('Picix 设置', openSettings);
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

  function getPageApi() {
    try {
      const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      return win.document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$api || null;
    } catch (_) { return null; }
  }

  async function callApi(path, body) {
    const api = getPageApi();
    if (!api) return { success: false, msg: '页面未就绪，请刷新后重试' };
    try {
      const res = await api.post(path, body); // axios baseURL=/api
      return res?.data ?? { success: true }; // 成功 res 可能 null
    } catch (e) {
      return e?.response?.data || { success: false, msg: e?.message || '请求失败' };
    }
  }

  const detailCache = new Map();
  // 懒加载详情：列表 API 只有 {id,title,cover,releaseDate}，标签/解锁/收藏状态需 detail API（hover 时调一次，缓存）
  async function fetchDetail(movieId) {
    if (detailCache.has(movieId)) return detailCache.get(movieId);
    const api = getPageApi();
    const empty = { tags: [], isUnlock: null, isFavorite: null };
    if (!api) { detailCache.set(movieId, empty); return empty; }
    try {
      const res = await api.get(`Movies/detail?movieId=${movieId}`, { timeout: 30000 });
      const d = res?.data ?? res; // 兼容 res 为 axios response 或直接为 data
      const info = {
        tags: (d?.tags || []).map(t => ({ id: t.id, name: t.zhName || t.jaName })).filter(t => t.name),
        isUnlock: d?.isUnlock ?? null,
        isFavorite: d?.isFavorite ?? null
      };
      detailCache.set(movieId, info);
      return info;
    } catch (_) { detailCache.set(movieId, empty); return empty; }
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = `${NS}-toast`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function makeButton(kind, html, onClick) {
    const btn = document.createElement('button');
    btn.className = `${NS}-btn`;
    btn.dataset.kind = kind;
    btn.type = 'button';
    btn.innerHTML = html;
    btn.onclick = e => { e.preventDefault(); e.stopPropagation(); onClick(btn); };
    return btn;
  }

  function buildOverlay(movieId) {
    const overlay = document.createElement('div');
    overlay.className = `${NS}-overlay`;
    const id = Number(movieId);

    overlay.append(
      // 锁：灰→绿(已解锁)，CONFLICT(已解锁) 视为成功
      makeButton('unlock', LOCK_SVG, async btn => {
        if (btn.dataset.done) return;
        btn.disabled = true; btn.innerHTML = '…';
        const r = await callApi('Movies/unlock', { movieId: id, movieListLinkId: 0 });
        btn.disabled = false;
        if (r.success || r.code === 'CONFLICT') { btn.dataset.done = '1'; btn.innerHTML = LOCK_SVG; btn.classList.add('is-active'); }
        else { btn.innerHTML = LOCK_SVG; if (r.msg) toast(r.msg); }
      }),
      // 星：☆→★(已收藏,黄)，CONFLICT 视为已操作；可 toggle
      makeButton('fav', '☆', async btn => {
        const wantAdd = !btn.dataset.done;
        btn.disabled = true; btn.textContent = '…';
        const r = await callApi(wantAdd ? 'Favorites/add' : 'Favorites/remove', { type: 'movies', resourceId: id });
        btn.disabled = false;
        if (r.success || (wantAdd && r.code === 'CONFLICT')) {
          btn.dataset.done = wantAdd ? '1' : '';
          btn.textContent = wantAdd ? '★' : '☆';
          btn.classList.toggle('is-active', wantAdd);
        } else {
          btn.textContent = wantAdd ? '☆' : '★';
          if (r.msg) toast(r.msg);
        }
      })
    );
    return overlay;
  }

  function buildTop(card) {
    const title = card.querySelector('.movie-title')?.textContent?.trim() || '';
    const code = (title.match(/([A-Z]{2,}-\d+)/) || [])[1] || '';
    const date = card.querySelector('.movie-date')?.textContent?.trim() || '';
    const top = document.createElement('div');
    top.className = `${NS}-top`;
    if (code) {
      const c = document.createElement('span');
      c.className = `${NS}-code`;
      c.textContent = code;
      top.append(c);
    }
    if (date) {
      const d = document.createElement('span');
      d.className = `${NS}-date`;
      d.textContent = date;
      top.append(d);
    }
    const tags = document.createElement('span');
    tags.className = `${NS}-tags`;
    return { top, tagsEl: tags };
  }

  function inject(card) {
    if (card.dataset.picixQuick) return;
    const id = (card.getAttribute('href') || '').match(MOVIE_ID_RE)?.[1];
    if (!id) return;
    card.dataset.picixQuick = '1';
    const overlay = buildOverlay(id);
    const { top, tagsEl } = buildTop(card);
    top.append(overlay);
    const box = document.createElement('div');
    box.className = `${NS}-box`;
    box.append(top, tagsEl);
    (card.querySelector('.movie-meta') || card).append(box);
    // 加载详情：填充标签 + 按钮初始状态。注入时后台触发（刷新后自动恢复），hover 兜底
    const load = async () => {
      if (card.dataset.picixDetail) return;
      card.dataset.picixDetail = '1';
      const d = await fetchDetail(id);
      tagsEl.replaceChildren(...d.tags.map(t => {
        const s = document.createElement('span');
        s.className = `${NS}-tag`;
        s.textContent = t.name;
        s.title = `搜索：${t.name}`;
        s.onclick = e => { e.preventDefault(); e.stopPropagation(); window.open(`/Movies/Search?tagIds=${t.id}`, '_blank'); };
        return s;
      }));
      if (d.isUnlock) { const u = overlay.querySelector('[data-kind=unlock]'); u.dataset.done = '1'; u.classList.add('is-active'); }
      if (d.isFavorite) { const f = overlay.querySelector('[data-kind=fav]'); f.dataset.done = '1'; f.textContent = '★'; f.classList.add('is-active'); }
      // 翻译标题（开关开启 + URL 已配置）
      if (cfgTransOn()) {
        const titleEl = card.querySelector('.movie-title');
        if (titleEl && !titleEl.dataset.picixTrans) {
          titleEl.dataset.picixTrans = '1';
          const trans = await translate(titleEl.textContent.trim());
          if (trans) {
            const tr = document.createElement('div');
            tr.className = `${NS}-trans`;
            tr.textContent = trans;
            titleEl.after(tr);
          }
        }
      }
    };
    card.addEventListener('mouseenter', load, { once: true });
    load();
  }

  const observer = new MutationObserver(muts => {
    for (const m of muts) for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches?.('a.movie-card')) inject(node);
      else node.querySelectorAll?.('a.movie-card').forEach(inject);
    }
  });

  function start() {
    document.querySelectorAll('a.movie-card').forEach(inject);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  GM_addStyle(`
    .${NS}-box { display:flex; flex-direction:column; gap:3px; z-index:10; pointer-events:none; padding:2px 4px; }
    .${NS}-top { display:flex; gap:4px; align-items:center; }
    .${NS}-overlay { display:flex; gap:8px; margin-left:auto; flex-shrink:0; opacity:1; pointer-events:auto; }
    a.movie-card:hover .${NS}-overlay { filter:brightness(1.15); }
    .${NS}-btn { margin:0; padding:4px 7px; font-size:16px; line-height:1; cursor:pointer; border:0; border-radius:4px; background:rgba(0,0,0,.62); color:#fff; display:flex; align-items:center; }
    .${NS}-btn:hover:not(:disabled) { background:rgba(0,0,0,.85); }
    .${NS}-btn[data-kind=unlock].is-active { background:rgba(34,139,34,.92); }
    .${NS}-btn[data-kind=fav].is-active { background:rgba(255,193,7,.92); color:#3a2a00; }
    .${NS}-btn:disabled { opacity:.6; cursor:default; }
    .${NS}-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.82); color:#fff; padding:8px 16px; border-radius:4px; z-index:99999; font:13px/1.5 Arial,'Microsoft YaHei',sans-serif; }
    .${NS}-code, .${NS}-date { font-weight:700; background:rgba(0,0,0,.55); padding:1px 5px; border-radius:3px; color:#fff; }
    .${NS}-tags { display:flex; flex-wrap:wrap; gap:3px; }
    .${NS}-tag { padding:0 4px; border-radius:3px; font-size:10px; line-height:1.4; cursor:pointer; pointer-events:auto; white-space:nowrap; color:#fff; }
    .${NS}-tag:nth-child(7n+1) { background:rgba(244,67,54,.78); }
    .${NS}-tag:nth-child(7n+2) { background:rgba(33,150,243,.78); }
    .${NS}-tag:nth-child(7n+3) { background:rgba(76,175,80,.78); }
    .${NS}-tag:nth-child(7n+4) { background:rgba(255,152,0,.85); color:#3a2a00; }
    .${NS}-tag:nth-child(7n+5) { background:rgba(156,39,176,.78); }
    .${NS}-tag:nth-child(7n+6) { background:rgba(0,188,212,.78); }
    .${NS}-tag:nth-child(7n+7) { background:rgba(121,85,72,.78); }
    .${NS}-tag:hover { filter:brightness(1.15); }
    a.movie-card .movie-date { display:none; }
    .${NS}-trans { font:11px/1.3 Arial,'Microsoft YaHei',sans-serif; color:rgb(229,234,243); margin-top:2px; word-break:break-word; white-space:normal; }
    .${NS}-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:99999; display:flex; align-items:center; justify-content:center; }
    .${NS}-modal { background:#fff; padding:16px 20px; border-radius:8px; width:440px; max-width:90vw; font:13px/1.5 Arial,'Microsoft YaHei',sans-serif; color:#333; }
    .${NS}-modal h3 { margin:0 0 12px; }
    .${NS}-modal label { display:block; margin:10px 0; }
    .${NS}-modal input[type=text] { width:100%; padding:5px; box-sizing:border-box; margin-top:4px; }
    .${NS}-modal-btns { margin-top:14px; text-align:right; }
    .${NS}-modal-btns button { padding:5px 14px; margin-left:8px; cursor:pointer; border:0; border-radius:4px; }
    .${NS}-modal-btns button:first-child { background:#409eff; color:#fff; }
    .${NS}-modal-btns button:last-child { background:#eee; }
  `);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

// ==UserScript==
// @name         Picix 卡片快捷操作
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.2.0
// @description  在 picix.us 影片卡片上直接解锁/收藏，无需进入详情页。复用页面 Vue $api（带签名），支持 Movies/Search、Movies/Rank、MovieList/Detail、Dashs 等含 a.movie-card 的页面。
// @author       wuyaos & AI
// @match        https://picix.us/*
// @icon         https://picix.us/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        unsafeWindow
// @noframes
// @license      MIT
// @downloadURL  https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Picix_CardQuickActions.user.js
// @updateURL    https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Picix_CardQuickActions.user.js
// ==/UserScript==

(function () {
  'use strict';

  // 复用页面 Vue app 的 $api（axios，带 Authorization + X-Picix-Proof 签名拦截器）；GM_xmlhttpRequest 无法生成签名，故必须用页面实例。
  // API: POST /api/Movies/unlock {movieId,fromMovieList:1} | POST /api/Favorites/add|remove {type:'movies',resourceId}
  // 成功响应 res 可能为 null（响应拦截器）；失败(409 CONFLICT)抛 AxiosError，e.response.data 即业务错误体。
  const NS = 'picix-quick';
  const MOVIE_ID_RE = /\/Movies\/Detail\/(\d+)/;
  const LOCK_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3z"/></svg>';

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
        const r = await callApi('Movies/unlock', { movieId: id, fromMovieList: 1 });
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

  function inject(card) {
    if (card.dataset.picixQuick) return;
    const id = (card.getAttribute('href') || '').match(MOVIE_ID_RE)?.[1];
    if (!id) return;
    card.dataset.picixQuick = '1';
    card.appendChild(buildOverlay(id));
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
    .${NS}-overlay { position:absolute; bottom:8px; right:8px; display:flex; gap:8px; z-index:10; opacity:1; pointer-events:auto; }
    a.movie-card:hover .${NS}-overlay { filter:brightness(1.15); }
    .${NS}-btn { margin:0; padding:4px 7px; font-size:16px; line-height:1; cursor:pointer; border:0; border-radius:4px; background:rgba(0,0,0,.62); color:#fff; display:flex; align-items:center; }
    .${NS}-btn:hover:not(:disabled) { background:rgba(0,0,0,.85); }
    .${NS}-btn[data-kind=unlock].is-active { background:rgba(34,139,34,.92); }
    .${NS}-btn[data-kind=fav].is-active { background:rgba(255,193,7,.92); color:#3a2a00; }
    .${NS}-btn:disabled { opacity:.6; cursor:default; }
    .${NS}-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.82); color:#fff; padding:8px 16px; border-radius:4px; z-index:99999; font:13px/1.5 Arial,'Microsoft YaHei',sans-serif; }
  `);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

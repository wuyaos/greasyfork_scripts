// ==UserScript==
// @name         Picix 卡片快捷操作
// @namespace    https://github.com/wuyaos/greasyfork_scripts
// @version      0.3.5
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
  `);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

import { LOCK_SVG, NS } from './config.js';

import { callApi } from './api.js';

import { makeButton, toast } from './controls.js';



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



export { buildOverlay, buildTop };

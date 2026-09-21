import { MOVIE_ID_RE, NS } from './config.js';

import { cfgTransOn } from './settings.js';

import { translate } from './translation.js';

import { fetchDetail } from './api.js';

import { buildOverlay, buildTop } from './card-toolbar.js';



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



export { start };

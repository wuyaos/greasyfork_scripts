import { state } from './config.js';

import { clean, el } from './elements.js';



function insertPanel(panel) {
    if (state.block?.tagName === 'TBODY') {
      const row = el('tr');
      const cell = el('td', { colspan: String(maxColumnCount(state.block)) });
      cell.append(panel);
      row.append(cell);
      state.block.prepend(row);
      return;
    }
    state.block.prepend(panel);
  }

function maxColumnCount(tbody) {
    return Math.max(1, ...[...tbody.rows].map(row => row.cells?.length || 0));
  }

async function siteHasClaim(adapter) {
    if (adapter.knownClaim) return true;
    if (!hasClaimEntryLink()) return false;
    const cacheKey = `ptc:${location.hostname}`;
    const cached = cacheGet(cacheKey);
    if (cached !== null) return cached === '1';
    const uid = currentUid();
    const path = adapter.probePath + (uid ? `?uid=${uid}` : '');
    try {
      const resp = await fetch(path, { credentials: 'same-origin' });
      if (!resp.ok) return false;
      const ok = adapter.pageHit(await resp.text());
      cacheSet(cacheKey, ok ? '1' : '0');
      return ok;
    } catch (_) { return false; }
  }

function hasClaimEntryLink() {
    const areas = [...document.querySelectorAll('td.bottom, #info_block, #userinfo, .medium, .user-info, .fix-menu, .top-account-entry, .top-account-dropdown, .top-stats-bar')];
    const links = areas.flatMap(area => [...area.querySelectorAll('a[href*="claim.php"]')]);
    return links.some(a => /认领|認領|claim|\d+\s*\/\s*\d+/i.test(a.textContent || a.href));
  }

function currentUid() {
    const m = location.search.match(/[?&](?:id|userid|uid)=(\d+)/i);
    return m?.[1] || '';
  }

function cacheGet(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } }

function cacheSet(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} }

const SEEDING_LABEL_RE = /^(当前做种|目前做種|目前做种|当前做種|做種中|做种中)$/;

function getSeedingBlock() { if (/\/(?:getusertorrentlist|usertorrentlist)\.php/i.test(location.pathname)) { const bodies = document.querySelectorAll('tbody'); return bodies[bodies.length - 1]; } const rowBlock = [...document.querySelectorAll('tr')].find(row => row.childElementCount === 2 && SEEDING_LABEL_RE.test(clean(row.cells[0]?.textContent)))?.cells[1]; if (rowBlock) return rowBlock; const link = [...document.querySelectorAll('a[onclick*="getusertorrentlistajax"]')].find(a => /seeding/.test(a.getAttribute('onclick') || '') && SEEDING_LABEL_RE.test(clean(a.textContent))); const targetId = link?.getAttribute('onclick')?.match(/['"](ka\d*)['"]\)/)?.[1]; const target = targetId ? document.getElementById(targetId) : null; return target?.parentElement || target; }

function readableText(node) { if (!node) return ''; const clone = node.cloneNode(true); clone.querySelectorAll('br').forEach(br => br.replaceWith('\n')); clone.querySelectorAll('img[title]').forEach(img => img.replaceWith(` ${img.title} `)); return clone.textContent || ''; }



export { getSeedingBlock, insertPanel, readableText, siteHasClaim };

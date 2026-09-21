import { assertOk, closestCell, formRequest, isVisible, safeJson } from './elements.js';



const adapters = [
    { id: 'pter', name: 'PterClub', match: () => /(^|\.)pterclub\.(com|net)$/i.test(location.hostname), knownClaim: true, claim(row) { const a = row.querySelector('.claim-confirm[data-url],a[data-url*="add_torrent_id"],a[href*="add_torrent_id"]'); const raw = a?.getAttribute('data-url') || a?.getAttribute('href') || ''; const id = raw.match(/add_torrent_id=(\d+)/)?.[1]; return id ? { id, cell: closestCell(a) } : null; }, request(item) { return { url: `/viewclaims.php?in_modal=yes&do_ajax=1&add_torrent_id=${encodeURIComponent(item.id)}`, method: 'GET' }; }, async validate(resp) { assertOk(resp); try { await resp.json(); } catch (_) { throw new Error('认领失败，可能认领人数已满'); } } },
    { id: 'spring', name: 'SpringSunday', match: () => /(^|\.)springsunday\.net$/i.test(location.hostname), knownClaim: true, claim(row) { const btn = [...row.querySelectorAll('button[id^="btn"],.btn[id^="btn"]')].find(isVisible); const id = btn?.id?.replace(/^btn/, ''); return id ? { id, cell: closestCell(btn) } : null; }, request(item) { return formRequest('/adopt.php', { action: 'add', id: item.id }); }, async validate(resp) { assertOk(resp); } },
    { id: 'audiences', name: 'Audiences', match: () => /(^|\.)audiences\.me$/i.test(location.hostname), knownClaim: true, claim(row) { const a = [...row.querySelectorAll('a[href]')].find(el => /认领种子|領種|claim/i.test(el.textContent)); const href = a?.getAttribute('href') || ''; const id = href.match(/claim\('add','(\d+)'/)?.[1] || href.match(/claim_block(\d+)/)?.[1] || a?.closest('[id^="claim_block"]')?.id?.match(/claim_block(\d+)/)?.[1] || href.match(/[?&]tid=(\d+)/)?.[1]; return id ? { id, cell: closestCell(a) } : null; }, request(item) { return { url: `/claim.php?act=add&tid=${encodeURIComponent(item.id)}`, method: 'GET' }; }, async validate(resp) { assertOk(resp); const data = await safeJson(resp); if (data && data.res === false) throw new Error(data.message || '认领失败'); } },
    { id: 'generic', name: '通用 NPHP', match: () => true, probePath: '/claim.php', pageHit: html => /用戶認領種子詳情|用户认领种子详情|認領種子詳情|认领种子详情/i.test(html), claim(row) { const btn = [...row.querySelectorAll('button[data-torrent_id]')].find(el => isVisible(el) && /领|領|認領|认领|claim/i.test(el.textContent)); const id = btn?.getAttribute('data-torrent_id'); return id ? { id, cell: closestCell(btn) } : null; }, request(item) { return formRequest('/ajax.php', { action: 'addClaim', 'params[torrent_id]': item.id }); }, async validate(resp) { assertOk(resp); const data = await safeJson(resp); if (data && data.ret !== undefined && Number(data.ret) !== 0) throw new Error(data.msg || '认领失败'); } }
  ];



export { adapters };

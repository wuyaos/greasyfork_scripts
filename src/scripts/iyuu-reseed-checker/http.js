import { KEYS, wait, log } from './config.js';
import { Store } from './settings.js';

import { MoviePilot } from './moviepilot.js';

import { SiteIndex } from './site-index.js';





















let iyuuLastRequest = 0;



const HTTP = {
        allowed(raw) { try { const u = new URL(raw, location.origin); const h = u.hostname; if (h === '2025.iyuu.cn' || h === 'zmpt.cc' || h === 'api.m-team.cc' || h === location.hostname || /(^|\.)m-team\.(cc|io|vip)$/.test(h) || h === 'bangumi.moe' || h === 'totheglory.im') return true; const mp = MoviePilot.cfg().url; if (mp && h === new URL(mp).hostname.toLowerCase()) return true; return SiteIndex.applyOverrides(Store.json(KEYS.sites, [])).some(s => { const host = SiteIndex.host(s); return host && (h === host || h.endsWith(`.${host}`) || host.endsWith(`.${h}`)); }); } catch (_) { return false; } },
        request({ method = 'GET', url, data, headers = {}, responseType = 'json', allowStatuses = [] }) {
            const full = new URL(url, location.origin).href;
            if (!this.allowed(full)) return Promise.reject(new Error('请求被白名单拦截'));
            const run = async () => {
                if (new URL(full).hostname === '2025.iyuu.cn') { const gap = Date.now() - iyuuLastRequest; if (gap < 800) await wait(800 - gap); iyuuLastRequest = Date.now(); }
                log('HTTP request', { method, url: full, responseType, allowStatuses });
                return new Promise((resolve, reject) => GM_xmlhttpRequest({ method, url: full, data, headers, responseType, timeout: 15000, onload: r => { log('HTTP response', { url: full, status: r.status, response: r.response }); return (r.status >= 200 && r.status < 300) || allowStatuses.includes(r.status) ? resolve(r.response) : reject(new Error(`HTTP ${r.status}`)); }, onerror: reject, ontimeout: () => reject(new Error('请求超时')) }));
            };
            return run();
        },
        async arrayBuffer(url) {
            const full = new URL(url, location.origin).href;
            const sameOrigin = new URL(full).origin === location.origin;
            if (sameOrigin) {
                const res = await fetch(full, { credentials: 'include' });
                if (!res.ok) throw new Error(`下载 HTTP ${res.status}`);
                return res.arrayBuffer();
            }
            return this.request({ url: full, responseType: 'arraybuffer' });
        }
    };





export { HTTP };

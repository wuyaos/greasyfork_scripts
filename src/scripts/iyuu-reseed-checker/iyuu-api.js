import { API_BASE, KEYS, log, wait } from './config.js';
import { HTTP } from './http.js';

import { Config, Store } from './settings.js';

import { SiteIndex } from './site-index.js';

import { Crypto } from './crypto.js';

import { ReseedSite } from './reseed-sites.js';



const IYUU = {
        async sidSha1(retries = 3) {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const sitesIndex = await SiteIndex.get(false);
                    const currentSid = SiteIndex.currentSid(sitesIndex);
                    const sortedSites = Array.from(new Set([...Config.owned, currentSid].map(Number).filter(Boolean))).sort((a, b) => a - b);
                    log(`sid list for reportExisting (attempt ${attempt}/${retries})`, { currentSid, owned: Config.owned, sortedSites });
                    const key = sortedSites.join(',');
                    const oldKey = Store.get(KEYS.sidKey, '');
                    const old = Store.get(KEYS.sid, '');
                    const ts = Number(Store.get(KEYS.sidTime, 0));
                    if (old && key === oldKey && Date.now() - ts < 7 * 864e5) {
                        log('reuse cached sid_sha1', { key });
                        return old;
                    }
                    if (!sortedSites.length) throw new Error('请先在菜单配置已拥有站点，或刷新站点索引以识别当前站');
                    const res = await HTTP.request({ method: 'POST', url: `${API_BASE}/reseed/sites/reportExisting`, headers: { Token: Config.token, 'Content-Type': 'application/json' }, data: JSON.stringify({ sid_list: sortedSites }) });
                    log(`reportExisting response (attempt ${attempt})`, res);
                    if (res?.code === 400 && String(res?.msg || '').includes('Server internal error') && attempt < retries) {
                        log(`reportExisting Server internal error, waiting ${attempt * 1000}ms before retry...`);
                        await new Promise(r => setTimeout(r, attempt * 1000));
                        continue;
                    }
                    const val = res?.data?.sid_sha1 || '';
                    if (!val) throw new Error(res?.msg || '获取 sid_sha1 失败');
                    Store.set(KEYS.sid, val);
                    Store.set(KEYS.sidKey, key);
                    Store.set(KEYS.sidTime, Date.now());
                    return val;
                } catch (e) {
                    if (attempt < retries) {
                        log(`reportExisting error, waiting ${attempt * 1000}ms before retry...`, e);
                        await new Promise(r => setTimeout(r, attempt * 1000));
                        continue;
                    }
                    throw e;
                }
            }
        },
        retryableQueryError(message) {
            return /(?:HTTP\s*)?(?:429|5\d\d)|请求超时|timeout|network|Failed to fetch|NetworkError|频率|限额|过于频繁|稍后/i.test(String(message || ''));
        },
        async query(hash, retried = false, attempt = 1) {
            if (!Config.token) return { ok: false, source: 'iyuu', error: '未配置 IYUU Token', sites: [] };
            let sid_sha1 = '';
            try {
                sid_sha1 = await this.sidSha1();
            } catch (e) {
                const msg = String(e?.message || '');
                if (!retried && /Server internal error|sid_sha1|获取 sid_sha1 失败|站点缓存/i.test(msg)) {
                    Store.del(KEYS.sid);
                    Store.del(KEYS.sidTime);
                    Store.del(KEYS.sidKey);
                    log('sid cache reset before retry', { reason: msg });
                    return this.query(hash, true);
                }
                throw e;
            }
            const hashes = Array.from(new Set([hash.toLowerCase()])).sort();
            const sha1 = await Crypto.sha1Hex(JSON.stringify(hashes));
            const params = new URLSearchParams({ hash: JSON.stringify(hashes), sha1, sid_sha1, timestamp: String(Math.floor(Date.now() / 1000)), version: '8.2.0' });
            log('IYUU query params', { hashes, sha1, sid_sha1: `${String(sid_sha1).slice(0, 8)}...`, attempt });
            let raw;
            try {
                raw = await HTTP.request({ method: 'POST', url: `${API_BASE}/reseed/index/index`, headers: { Token: Config.token, 'Content-Type': 'application/x-www-form-urlencoded' }, data: params.toString(), allowStatuses: [400, 404] });
            } catch (e) {
                const msg = e?.message || 'IYUU 查询失败';
                if (attempt < 2 && this.retryableQueryError(msg)) {
                    const delay = 1200 * attempt;
                    log(`IYUU query retry after ${delay}ms`, msg);
                    await wait(delay);
                    return this.query(hash, retried, attempt + 1);
                }
                throw e;
            }
            log('IYUU query response', raw);
            if (raw?.msg === '未查询到可辅种数据') return { ok: true, source: 'iyuu', sites: [] };
            const retriableServerError = raw?.code === 400 && /站点缓存哈希值无效|Server internal error/i.test(String(raw?.msg || ''));
            const retryableHttpError = raw && raw.code !== undefined && raw.code !== 0 && this.retryableQueryError(`${raw.code} ${raw.msg || ''}`);
            if (retryableHttpError && attempt < 2) {
                const delay = 1200 * attempt;
                log(`IYUU query API retry after ${delay}ms`, raw?.msg || raw?.code || '');
                await wait(delay);
                return this.query(hash, retried, attempt + 1);
            }
            if (retriableServerError && !retried) {
                Store.del(KEYS.sid);
                Store.del(KEYS.sidTime);
                Store.del(KEYS.sidKey);
                log('sid cache reset and retry query', { reason: raw?.msg || '' });
                return this.query(hash, true);
            }
            if (raw && raw.code !== undefined && raw.code !== 0) throw new Error(raw.msg || 'IYUU 查询失败');
            return await this.normalize(raw);
        },
        rawTorrents(raw) {
            const dataObj = raw?.data || {};
            const groups = Array.isArray(dataObj) ? dataObj : Object.values(dataObj);
            return groups.flatMap(group => {
                if (Array.isArray(group?.torrent)) return group.torrent;
                return Array.isArray(group) ? group : [];
            });
        },
        async normalize(raw) {
            const index = SiteIndex.bySid(await SiteIndex.get(false));
            const sites = new Map();
            this.rawTorrents(raw).forEach(rawItem => {
                const next = ReseedSite.build({ source: 'iyuu', raw: rawItem, index });
                if (!next) return;
                const old = sites.get(next.sid);
                if (!old) {
                    sites.set(next.sid, next);
                    return;
                }
                ReseedSite.mergeBySid(old, next);
            });
            return { ok: true, source: 'iyuu', sites: [...sites.values()] };
        }
    };



export { IYUU };

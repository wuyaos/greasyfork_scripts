import { KEYS, log } from './config.js';

import { Config, Store } from './settings.js';

import { UI } from './ui.js';



const ResultCache = {
        _data: null, version: 'site-dedupe-v2', okTtl: 6 * 3600e3, partialTtl: 3600e3, max: 500,
        _load() { if (this._data) return this._data; try { const raw = Store.get(KEYS.result, '{}'); this._data = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch (_) { this._data = {}; } return this._data; },
        _persist() { try { Store.set(KEYS.result, JSON.stringify(this._data || {})); } catch (e) { log('result cache write failed', e.message); } },
        sidKey() { return Config.owned.map(Number).filter(Boolean).sort((a, b) => a - b).join(','); },
        key(hash) { return `hash:${hash}|${this.sidKey()}`; },
        normalizeUrl(url) { try { const u = new URL(url || location.href, location.origin); u.hash = ''; ['authkey', 'torrent_pass', 'usetoken', 'https', 'passkey'].forEach(key => u.searchParams.delete(key)); u.searchParams.sort(); return u.href; } catch (_) { return String(url || ''); } },
        downloadUrlKey(url) { try { const u = new URL(url || location.href, location.origin); const id = u.searchParams.get('id'); const action = u.searchParams.get('action') || ''; if (id && (/download/i.test(u.pathname) || /download/i.test(action))) return `${u.origin}${u.pathname}?action=${action || 'download'}&id=${id}`; } catch (_) { /* noop */ } return ''; },
        detailUrlKey(url) {
            try {
                const u = new URL(url || location.href, location.origin);
                const path = u.pathname;
                const q = new URLSearchParams();
                if (/(^|\.)haidan\.(cc|video)$/i.test(u.hostname) && /\/details\.php$/i.test(path)) {
                    // haidan 详情页 group_id 常为空，按 torrent_id/id 归一化，保证同一种子跨 URL 形式共享缓存
                    const tid = u.searchParams.get('torrent_id') || u.searchParams.get('id');
                    if (tid) q.set('torrent_id', tid);
                    else if (u.searchParams.get('group_id')) q.set('group_id', u.searchParams.get('group_id'));
                    else return '';
                    return `https://www.haidan.cc${path}?${q.toString()}`;
                }
                if (/\/details\.php$/i.test(path) && u.searchParams.get('id')) {
                    q.set('id', u.searchParams.get('id'));
                } else if (/\/torrents\.php$/i.test(path) && u.searchParams.get('id')) {
                    q.set('id', u.searchParams.get('id'));
                    if (u.searchParams.get('torrentid')) q.set('torrentid', u.searchParams.get('torrentid'));
                } else if (/\/details\.php$/i.test(path) && u.searchParams.get('group_id')) {
                    q.set('group_id', u.searchParams.get('group_id'));
                    if (u.searchParams.get('torrent_id')) q.set('torrent_id', u.searchParams.get('torrent_id'));
                } else if (/\/detail\/\d+\/?$/i.test(path) || /^\/t\/\d+\/?$/i.test(path)) {
                    return `${u.origin}${path.replace(/\/$/, '')}`;
                } else {
                    return '';
                }
                return `${u.origin}${path}?${q.toString()}`;
            } catch (_) { return ''; }
        },
        pageKey(input = '') { const url = typeof input === 'string' ? input : ''; return `page:${this.detailUrlKey(url) || this.downloadUrlKey(url) || this.normalizeUrl(url)}|${this.sidKey()}`; },
        siteKeys(payload) { return (payload?.sites || []).flatMap(s => [s?.url, s?.downloadUrl].filter(Boolean).map(url => this.pageKey(url))); },
        _ttlOf(item) { return item?.partial ? this.partialTtl : this.okTtl; },
        getKey(key) { const data = this._load(); const item = data[key]; if (!item || item.version !== this.version) return null; const ttl = this._ttlOf(item); if (Date.now() - (item.ts || 0) > ttl) { delete data[key]; this._persist(); return null; } return item.payload || null; },
        get(hash) { return this.getKey(this.key(hash)); },
        getPage(url = '') { return this.getKey(this.pageKey(url)); },
        set(hash, payload, info) { if (!hash || !payload) return; const data = this._load(); const item = { payload, ts: Date.now(), version: this.version, partial: Boolean(payload.partial) }; data[this.key(hash)] = item; data[this.pageKey()] = item; this.siteKeys(payload).forEach(k => { data[k] = item; }); this._prune(); this._persist(); },
        _prune() { const data = this._data || {}; const now = Date.now(); Object.keys(data).forEach(k => { const item = data[k] || {}; const ttl = this._ttlOf(item); if (now - (item.ts || 0) > ttl) delete data[k]; }); const keys = Object.keys(data); if (keys.length > this.max) keys.map(k => ({ k, ts: data[k]?.ts || 0 })).sort((a, b) => a.ts - b.ts).slice(0, keys.length - this.max).forEach(({ k }) => delete data[k]); },
        clear() { this._data = {}; Store.del(KEYS.result); UI.toast('辅种查询缓存已清空'); },
        size() { return Object.keys(this._load()).length; }
    };



export { ResultCache };

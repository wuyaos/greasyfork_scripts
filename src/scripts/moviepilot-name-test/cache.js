import { CONSTANTS, SCRIPT_NAME } from './config.js';

import { UI } from './ui.js';

import { UTILS } from './media-formatting.js';



function normalizeDownloadKey(url) {
        const raw = String(url || '').trim();
        if (!raw || raw.startsWith('magnet:')) return '';
        try {
            const parsed = new URL(raw, window.location.href);
            ['authkey', 'torrent_pass', 'usetoken', 'https', 'passkey'].forEach(key => parsed.searchParams.delete(key));
            const kept = new URLSearchParams();
            ['action', 'id'].forEach(key => {
                const value = parsed.searchParams.get(key);
                if (value) kept.set(key, value);
            });
            const query = kept.toString();
            return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`.toLowerCase();
        } catch (e) {
            return '';
        }
    }

const Cache = {
        _data: null,

        _load() {
            if (this._data) return this._data;
            try {
                const raw = GM_getValue(CONSTANTS.RECOGNIZE_CACHE.KEY, '{}');
                this._data = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
            } catch (e) {
                this._data = {};
            }
            return this._data;
        },

        _persist() {
            try {
                GM_setValue(CONSTANTS.RECOGNIZE_CACHE.KEY, JSON.stringify(this._data || {}));
            } catch (e) {
                GM_log(`[${SCRIPT_NAME}] 缓存写入失败:`, e);
            }
        },

        _normalizeKey(name) {
            return UTILS.cleanText(name).toLowerCase();
        },

        keyOf(input) {
            if (typeof input === 'string') return this._normalizeKey(input);
            const downloadKey = normalizeDownloadKey(input?.downloadLink);
            return downloadKey || this._normalizeKey(input?.name);
        },

        get(input) {
            const key = this.keyOf(input);
            if (!key) return null;
            const data = this._load();
            const item = data[key];
            if (!item) return null;
            if (Date.now() - (item.ts || 0) > CONSTANTS.RECOGNIZE_CACHE.TTL_MS) {
                delete data[key];
                this._persist();
                return null;
            }
            return item.payload || null;
        },

        set(input, payload) {
            const key = this.keyOf(input);
            if (!key || !payload) return;
            const data = this._load();
            data[key] = { payload, ts: Date.now() };
            this._prune();
            this._persist();
        },

        _prune() {
            const data = this._data || {};
            const now = Date.now();
            const ttl = CONSTANTS.RECOGNIZE_CACHE.TTL_MS;
            // 先删过期项
            Object.keys(data).forEach((k) => {
                if (now - (data[k]?.ts || 0) > ttl) delete data[k];
            });
            // 超出条数则删最旧的
            const max = CONSTANTS.RECOGNIZE_CACHE.MAX_ENTRIES;
            const keys = Object.keys(data);
            if (keys.length > max) {
                keys
                    .map((k) => ({ k, ts: data[k]?.ts || 0 }))
                    .sort((a, b) => a.ts - b.ts)
                    .slice(0, keys.length - max)
                    .forEach(({ k }) => delete data[k]);
            }
        },

        clear() {
            this._data = {};
            try { GM_deleteValue(CONSTANTS.RECOGNIZE_CACHE.KEY); } catch (e) {}
            UI.showToast(`[${SCRIPT_NAME}] 识别缓存已清空。`);
            GM_log(`[${SCRIPT_NAME}] 识别缓存已清空。`);
        },

        size() {
            return Object.keys(this._load()).length;
        }
    };



export { Cache };

import { KEYS, SCRIPT_NAME } from './config.js';



const Store = {
        get(k, d = '') { try { return GM_getValue(k, d); } catch (_) { return d; } },
        set(k, v) { try { GM_setValue(k, v); } catch (_) {} },
        del(k) { try { GM_deleteValue(k); } catch (_) {} },
        json(k, d) { try { const v = this.get(k, ''); return v ? JSON.parse(v) : d; } catch (_) { return d; } }
    };

const SITE_OVERRIDES = {
        38: { base_url: 'pt.hdupt.com', domain: 'pt.hdupt.com', host: 'pt.hdupt.com', site: 'hdupt' },
        'pt.hdupt.net': { base_url: 'pt.hdupt.com', domain: 'pt.hdupt.com', host: 'pt.hdupt.com', site: 'hdupt' },
        56: { base_url: 'www.haidan.cc', domain: 'www.haidan.cc', host: 'www.haidan.cc', site: 'haidan' },
        'haidan.video': { base_url: 'www.haidan.cc', domain: 'www.haidan.cc', host: 'www.haidan.cc', site: 'haidan' },
        'haidan.cc': { base_url: 'www.haidan.cc', domain: 'www.haidan.cc', host: 'www.haidan.cc', site: 'haidan' },
        'pterclub.com': { base_url: 'pterclub.net', domain: 'pterclub.net', host: 'pterclub.net', site: 'pterclub' },
        'www.pterclub.com': { base_url: 'pterclub.net', domain: 'pterclub.net', host: 'pterclub.net', site: 'pterclub' }
    };

const Config = {
        token: '', owned: [], zmpt: true, mteamKey: '', autoQuery: false, gazelleDl: false,
        load() {
            this.token = Store.get(KEYS.token, '');
            this.owned = Store.json(KEYS.owned, []);
            this.zmpt = true;
            Store.set(KEYS.zmpt, true);
            this.mteamKey = Store.get(KEYS.mteamKey, '');
            this.autoQuery = Boolean(Store.get(KEYS.autoQuery, false));
            this.gazelleDl = Boolean(Store.get(KEYS.gazelleDl, false));
        },
        save({ token, owned, mteamKey, autoQuery, gazelleDl }) {
            Store.set(KEYS.token, String(token || '').trim());
            Store.set(KEYS.owned, JSON.stringify((owned || []).map(String)));
            Store.set(KEYS.zmpt, true);
            Store.set(KEYS.mteamKey, String(mteamKey || '').trim());
            Store.set(KEYS.autoQuery, Boolean(autoQuery));
            Store.set(KEYS.gazelleDl, Boolean(gazelleDl));
            Store.set(KEYS.configured, true);
            Store.del(KEYS.sid); Store.del(KEYS.sidTime); Store.del(KEYS.sidKey);
            this.load();
        },
        reset() {
            if (!confirm(`${SCRIPT_NAME}\n\n确定重置所有配置和缓存吗？`)) return;
            Object.values(KEYS).forEach(k => Store.del(k));
            location.reload();
        }
    };



export { Config, SITE_OVERRIDES, Store };

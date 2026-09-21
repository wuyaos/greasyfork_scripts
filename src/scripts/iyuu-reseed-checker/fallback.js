import { ZMPT_API, log, normalizeSiteKey } from './config.js';
import { HTTP } from './http.js';

import { Config } from './settings.js';

import { SiteIndex } from './site-index.js';

import { ReseedSite } from './reseed-sites.js';



const Fallback = {
        items(raw) {
            const data = raw?.data ?? raw?.result ?? raw;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            if (Array.isArray(data?.list)) return data.list;
            if (Array.isArray(data?.sites)) return data.sites;
            if (Array.isArray(raw?.list)) return raw.list;
            return Object.values(data || {}).flatMap(v => Array.isArray(v) ? v : (Array.isArray(v?.torrent) ? v.torrent : []));
        },
        isOwnedItem(item, built, ownedSet, ownedSites) {
            const realSid = String(item?.sid || item?.site_id || item?.site || item?.site_id_str || '');
            if (realSid && ownedSet.has(realSid)) return true;
            const hostCandidates = [
                built?.host, SiteIndex.host(built), SiteIndex.host({ url: built?.downloadUrl }),
                item?.domain, item?.host, item?.base_url,
                item?.url, item?.page_url, item?.link,
                item?.download_url, item?.downloadUrl, item?.down_url,
                item?.zmpt_data?.url, item?.zmpt_data?.download_url
            ];
            const itemHosts = hostCandidates.map(raw => {
                if (!raw) return '';
                const rewritten = SiteIndex.rewriteOverrideUrl(raw);
                return SiteIndex.host({ url: rewritten }) || SiteIndex.host({ domain: raw, base_url: raw, host: raw });
            }).filter(Boolean);
            if (itemHosts.length && ownedSites.some(s => {
                const ownedHost = SiteIndex.host(s);
                return ownedHost && itemHosts.some(h => SiteIndex.sameHost(ownedHost, h));
            })) return true;
            const itemName = String(item?.site_name || item?.site_alias || item?.name || item?.name_cn || built?.name || '').trim();
            if (itemName && ownedSites.some(s => normalizeSiteKey(SiteIndex.name(s)) === normalizeSiteKey(itemName))) return true;
            return false;
        },
        async query(hash) {
            if (!Config.zmpt) return { ok: false, source: 'fallback', sites: [] };
            const raw = await HTTP.request({ url: `${ZMPT_API}?hash=${encodeURIComponent(hash)}` });
            log('IYUU fallback query response', raw);
            const data = this.items(raw);
            log('IYUU fallback parsed items', data);
            const list = await SiteIndex.get(false);
            const index = SiteIndex.bySid(list);
            const ownedSet = new Set((Config.owned || []).map(String));
            const ownedSites = list.filter(s => ownedSet.has(String(s.id || s.sid)));
            const sites = data.map((item, idx) => {
                const built = ReseedSite.build({ source: 'fallback', raw: item, index, fallbackSid: `fallback-${idx}` });
                if (!built) return null;
                if (ownedSet.size && !this.isOwnedItem(item, built, ownedSet, ownedSites)) return null;
                return built;
            }).filter(Boolean);
            return { ok: true, source: 'fallback', sites };
        }
    };



export { Fallback };

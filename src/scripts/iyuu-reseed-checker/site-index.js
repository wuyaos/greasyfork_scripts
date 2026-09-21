import { API_BASE, KEYS, MTEAM_API_BASE, log, normalizeSiteKey, wait } from './config.js';
import { HTTP } from './http.js';

import { AUTO_FEED_CANONICAL_HOSTS, AUTO_FEED_HOST_URLS, AUTO_FEED_SITE_DEFS, AUTO_FEED_SITE_URLS } from './site-catalog.js';

import { firstOf } from '../../common/first-match.js';

import { Config, SITE_OVERRIDES, Store } from './settings.js';



const SiteIndex = {
        async get(force, tokenOverride = '') {
            const ts = Number(Store.get(KEYS.sitesTime, 0)); const cached = Store.json(KEYS.sites, []);
            if (!force && cached.length && Date.now() - ts < 7 * 864e5) return this.applyOverrides(cached);
            const token = tokenOverride || Config.token; if (!token) return this.applyOverrides(cached);
            let last = null;
            for (let i = 0; i < 3; i++) {
                const res = await HTTP.request({ url: `${API_BASE}/reseed/sites/index`, headers: { Token: token, Accept: 'application/json' } });
                log('sites index response', res); last = this.parse(res);
                if (last.length) { Store.set(KEYS.sites, JSON.stringify(last)); Store.set(KEYS.sitesTime, Date.now()); return this.applyOverrides(last); }
                await wait(1000 + i * 700);
            }
            if (cached.length) return this.applyOverrides(cached);
            throw new Error('站点索引为空，请稍后重试或检查 Token');
        },
        applyOverrides(list) {
            return (list || []).map(site => {
                const sid = String(site?.id || site?.sid || '');
                const host = this.host(site);
                const override = SITE_OVERRIDES[sid] || SITE_OVERRIDES[host];
                return override ? Object.assign({}, site, override) : site;
            });
        },
        parse(res) {
            const raw = res?.data?.sites || res?.data?.site_list || res?.data?.siteList || res?.data?.list || res?.data || res?.sites || res?.list || res;
            if (Array.isArray(raw)) return raw;
            if (raw && typeof raw === 'object') return Object.keys(raw).map(id => Object.assign({ id }, raw[id]));
            return [];
        },
        name(s) { return s?.nickname || s?.name_cn || s?.name || s?.site || s?.domain || `站点${s?.id || s?.sid || ''}`; },
        aliases(s) {
            const autoFeed = this.autoFeedMeta(s);
            return [
                ...(Array.isArray(s?.aliases) ? s.aliases : []),
                ...(Array.isArray(s?.alias) ? s.alias : [s?.alias]),
                ...(autoFeed?.aliases || [])
            ].filter(Boolean);
        },
        autoFeedMeta(s) {
            const url = this.autoFeedUrl(s);
            if (!url) return null;
            return firstOf(AUTO_FEED_SITE_DEFS, def => def.url === url);
        },
        searchText(s) {
            const fields = [
                this.name(s), s?.nickname, s?.name_cn, s?.name, s?.site, s?.domain, s?.host, s?.base_url, s?.url,
                this.host(s), this.host({ url: this.autoFeedUrl(s) }), ...this.aliases(s)
            ];
            return fields.map(normalizeSiteKey).filter(Boolean).join(' ');
        },
        searchTitle(s) {
            const parts = [this.name(s), this.host(s), ...this.aliases(s)].filter(Boolean);
            return [...new Set(parts)].join(' / ');
        },
        autoFeedUrl(s) {
            const host = this.host(s);
            if (host) {
                const hit = firstOf(Object.entries(AUTO_FEED_HOST_URLS), ([known]) => host === known || host.endsWith(`.${known}`) || known.endsWith(`.${host}`));
                if (hit) return hit[1];
            }
            const fields = [this.name(s), s?.site, s?.name, s?.nickname, s?.name_cn, s?.domain, s?.host];
            for (const field of fields) {
                const direct = AUTO_FEED_SITE_URLS[String(field || '').toLowerCase()] || AUTO_FEED_SITE_URLS[normalizeSiteKey(field)];
                if (direct) return direct;
            }
            return '';
        },
        icon(s) {
            const candidates = [];
            const seen = new Set();
            const origin = firstOf([s?.base_url, s?.url, s?.domain, s?.host, this.autoFeedUrl(s)], raw => {
                try {
                    const u = /^https?:\/\//i.test(String(raw || '')) ? new URL(raw) : new URL(`https://${raw}`);
                    return u.hostname.includes('.');
                } catch (_) {
                    return false;
                }
            });
            const siteOrigin = origin ? (/^https?:\/\//i.test(String(origin)) ? new URL(origin).origin : new URL(`https://${origin}`).origin) : '';
            const addCandidate = raw => {
                if (!raw) return false;
                try {
                    const text = String(raw);
                    const url = /^https?:\/\//i.test(text) ? new URL(text) : (siteOrigin ? new URL(text, siteOrigin) : null);
                    if (!url || seen.has(url.href)) return false;
                    seen.add(url.href);
                    candidates.push(url.href);
                    return true;
                } catch (_) {
                    return false;
                }
            };
            for (const raw of [s?.icon, s?.logo, s?.favicon]) {
                addCandidate(raw);
                if (candidates.length >= 2) break;
            }
            if (siteOrigin) {
                const u = new URL(siteOrigin);
                addCandidate(`${u.origin}/favicon.ico`);
                if (candidates.length === 1) addCandidate(`${u.origin}/apple-touch-icon.png`);
            }
            return candidates;
        },
        host(s) {
            const raws = [s?.domain, s?.base_url, s?.url, s?.site, s?.host, s?.details_page, s?.download_page];
            for (const raw of raws) {
                if (!raw) continue;
                try {
                    const text = String(raw);
                    const normalized = /^https?:\/\//i.test(text) ? text : `https://${text}`;
                    const host = new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
                    if (host && !host.includes('{')) return host;
                } catch (_) {
                    const host = String(raw).replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0].toLowerCase();
                    if (host && host.includes('.') && !host.includes('{')) return host;
                }
            }
            return '';
        },
        homepage(s) { const raw = s?.base_url || s?.url || s?.domain || s?.site || ''; if (!raw) return ''; try { return (raw.startsWith('http') ? new URL(raw) : new URL(`https://${raw}`)).origin; } catch (_) { const host = this.host(s); return host ? `https://${host}` : ''; } },
        webOrigin(s) { const origin = this.homepage(s); return /(^|\.)m-team\.(cc|io|vip)$/i.test(this.host(s)) ? 'https://kp.m-team.cc' : origin; },
        rewriteOverrideUrl(rawUrl) {
            if (!rawUrl || typeof rawUrl !== 'string') return '';
            if (!/^https?:\/\//i.test(rawUrl)) return rawUrl;
            let url;
            try { url = new URL(rawUrl, location.origin); } catch (_) { return rawUrl; }
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return rawUrl;
            const strippedHost = url.hostname.replace(/^www\./, '').toLowerCase();
            for (const [key, override] of Object.entries(SITE_OVERRIDES)) {
                if (typeof key !== 'string' || !key || /^-?\d+$/.test(key)) continue;
                const oldHost = key.replace(/^www\./, '').toLowerCase();
                if (oldHost !== strippedHost) continue;
                const newHost = (override && (override.host || override.domain || override.base_url)) || '';
                if (!newHost) continue;
                try {
                    const replacement = new URL(`https://${String(newHost).replace(/^https?:\/\//i, '').replace(/^www\./, '')}`);
                    url.host = replacement.host;
                    return url.href;
                } catch (_) { return rawUrl; }
            }
            return rawUrl;
        },
        webUrl(url) { try { const u = new URL(url, location.origin); if (/(^|\.)m-team\.(cc|io|vip)$/i.test(u.hostname.replace(/^api\./, ''))) { u.protocol = 'https:'; u.host = 'kp.m-team.cc'; } return u.href; } catch (_) { return url || ''; } },
        isHomepageUrl(url) { try { const u = new URL(url, location.origin); return (!u.pathname || u.pathname === '/') && !u.search && !u.hash; } catch (_) { return false; } },
        pageUrl(s, pageField, torrentId, rawUrl = '', web = false) { const origin = web ? this.webOrigin(s) : this.homepage(s); const direct = rawUrl || ''; if (!origin) return web ? this.webUrl(direct) : direct; if (!torrentId) return web ? this.webUrl(direct || origin) : (direct || origin); const tpl = pageField || 'details.php?id={}'; const path = String(tpl).replace('{}', String(torrentId)).replace(/\{[^}]*\}/g, ''); const built = path.startsWith('http') ? path : `${origin}/${path.replace(/^\//, '')}`; const out = direct && !this.isHomepageUrl(direct) ? direct : built; return web ? this.webUrl(out) : out; },
        detailUrl(s, torrentId, rawUrl = '') { return this.pageUrl(s, s?.details_page || 'details.php?id={}', torrentId, rawUrl, true); },
        downloadUrl(s, torrentId, rawUrl = '') { const direct = rawUrl || ''; if (direct && !this.isHomepageUrl(direct)) return direct; if (this.isTotheglory(s)) return ''; return torrentId ? this.pageUrl(s, s?.download_page || 'download.php?id={}', torrentId, '') : ''; },
        isLikelyDetailUrl(url) { return /(?:details\.php|\/detail\/|torrents\.php\?id=)/i.test(String(url || '')); },
        bestDownloadUrl(site, torrentId = site?.torrentId) {
            let tid = torrentId;
            if (!tid) {
                const m = String(site?.url || site?.downloadUrl || '').match(/[?&](?:id|tid|torrent_id)=(\d+)/i);
                if (m) tid = m[1];
            }
            const url = site?.downloadUrl || this.downloadUrl(site, tid) || '';
            return this.isLikelyDetailUrl(url) ? '' : url;
        },
        isMTeam(s) { const text = [s?.host, s?.url, s?.downloadUrl, s?.domain, s?.base_url, s?.site, s?.name, s?.nickname, s?.name_cn].filter(Boolean).join(' '); return /m-team\.(cc|io|vip)|馒头|饅頭|\bM[-_ ]?Team\b|\bMT\b/i.test(text); },
        isTotheglory(s) { const text = [s?.host, s?.url, s?.downloadUrl, s?.domain, s?.base_url, s?.site, s?.name, s?.nickname, s?.name_cn].filter(Boolean).join(' '); return /totheglory\.im|(^|\b)TTG\b/i.test(text); },
        mTeamApi() { return `${MTEAM_API_BASE}/torrent/genDlToken`; },
        canonicalHost(host) {
            const h = String(host || '').replace(/^www\./, '').toLowerCase();
            return AUTO_FEED_CANONICAL_HOSTS[h] || h;
        },
        sameHost(a, b) {
            const left = this.canonicalHost(a);
            const right = this.canonicalHost(b);
            return Boolean(left && right && (left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)));
        },
        currentSid(list) {
            const current = location.hostname.replace(/^www\./, '').toLowerCase();
            const currentIsMTeam = /(^|\.)m-team\.(cc|io|vip)$/.test(current);
            const match = firstOf(list || [], s => {
                const hosts = [this.host(s), this.host({ url: this.autoFeedUrl(s) })].filter(Boolean);
                const text = [s?.domain, s?.base_url, s?.url, s?.site, s?.host, s?.name, s?.nickname, s?.name_cn].filter(Boolean).join(' ').toLowerCase();
                return hosts.some(host => this.sameHost(current, host)) || (currentIsMTeam && this.isMTeam(s)) || text.includes(current);
            });
            return match ? String(match.id || match.sid || '') : '';
        },
        hasCurrent(list) { return Boolean(this.currentSid(list)); },
        bySid(list) { const m = new Map(); (list || []).forEach(s => m.set(String(s.id || s.sid), s)); return m; },
        matchMoviePilot(mpSites, iyuuSites) { const hosts = new Set((mpSites || []).map(s => this.host(s)).filter(Boolean)); return (iyuuSites || []).filter(s => { const host = this.host(s); return host && [...hosts].some(h => this.sameHost(h, host)); }).map(s => String(s.id || s.sid)).filter(Boolean); },
        async detectLoggedIn(list, onProgress) {
            const targets = (list || []).filter(s => this.host(s) && (s.id || s.sid)); const hits = []; let done = 0; const concurrency = 3; const gap = 400;
            const probe = async s => { const sid = String(s.id || s.sid); const host = this.host(s); try { const html = await HTTP.request({ url: `https://${host}/`, responseType: 'text', allowStatuses: [301, 302, 403] }); if (!/login|登录|sign\s*in|忘记密码|忘記密碼|验证码|captcha|two[-_ ]?step/i.test(String(html || ''))) hits.push(sid); } catch (_) {} done++; onProgress?.(done, targets.length); await wait(gap); };
            for (let i = 0; i < targets.length; i += concurrency) await Promise.all(targets.slice(i, i + concurrency).map(probe));
            return hits;
        }
    };



export { SiteIndex };

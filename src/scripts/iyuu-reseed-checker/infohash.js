import { MTEAM_API_BASE, log } from './config.js';
import { HTTP } from './http.js';

import { firstOf } from '../../common/first-match.js';

import { Config } from './settings.js';

import { TORRENT_LINK_SELECTORS, needsDownloadForHash } from './page-tools.js';

import { Crypto } from './crypto.js';

import { Helpers } from './torrent-fields.js';



const InfoHash = {
        async extract(info) {
            if (info.extra) info.extra.gazelleSkipped = false;
            const explicitHash = info.extra?.explicitHash || '';
            if (explicitHash && this.valid(explicitHash)) return explicitHash.toLowerCase();
            const magnetHash = this.fromMagnet(info.downloadLink);
            if (magnetHash) { log('hash from magnet', magnetHash); return magnetHash; }
            const specialHash = await this.fromSpecial(info);
            if (specialHash) { log('hash from special site/torrent', specialHash); return specialHash; }
            if (needsDownloadForHash({ ...info, explicitHash }) && /([?&])usetoken=1(?:&|$)/.test(info.downloadLink || '') && !Config.gazelleDl) {
                info.extra = info.extra || {};
                info.extra.gazelleSkipped = true;
                log('gazelle FL disabled, skip hash', info);
                return '';
            }
            const torrentUrl = info.downloadLink || this.findTorrentUrl();
            log('torrent url candidate', torrentUrl);
            const torrentHash = await this.fromTorrent(torrentUrl).catch(e => { log('torrent hash failed', e.message); return ''; });
            if (torrentHash) { log('hash from torrent', torrentHash); return torrentHash; }
            const pageHash = this.fromPage();
            log('hash from page fallback', pageHash);
            return pageHash;
        },
        fromMagnet(v) { const m = String(v || '').match(/xt=urn:btih:([a-z2-7]{32}|[a-f0-9]{40})/i); if (!m) return ''; return m[1].length === 40 ? m[1].toLowerCase() : this.base32ToHex(m[1]); },
        fromPage() { const text = `${location.href}\n${document.body?.innerText || ''}`; const all = text.match(/\b[a-fA-F0-9]{40}\b/g) || []; return firstOf(all, this.valid) || ''; },
        valid(h) { return /^[a-f0-9]{40}$/i.test(h) && !/^(.)\1{39}$/.test(h) && !/^\d{40}$/.test(h); },
        base32ToHex(s) { const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; String(s).toUpperCase().replace(/=+$/, '').split('').forEach(c => { const v = alpha.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, '0'); }); let out = ''; for (let i = 0; i + 4 < bits.length; i += 4) out += parseInt(bits.slice(i, i + 4), 2).toString(16); return out.slice(0, 40).toLowerCase(); },
        async fromSpecial(info) { if (info._bangumiId) { const r = await HTTP.request({ url: `https://bangumi.moe/api/v2/torrent/${info._bangumiId}` }); if (r?.magnet) { info.downloadLink = r.magnet; return this.fromMagnet(r.magnet); } } if (/m-team\.(cc|io|vip)/.test(location.hostname)) { const link = await this.mteamLink(); if (link) { info.downloadLink = link; return await this.fromTorrent(link); } } return ''; },
        async mteamLink() { const id = location.pathname.match(/\/detail\/(\d+)/)?.[1]; if (!id || !Config.mteamKey) return ''; const res = await HTTP.request({ method: 'POST', url: `${MTEAM_API_BASE}/torrent/genDlToken`, data: `id=${encodeURIComponent(id)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-key': Config.mteamKey }, responseType: 'json' }); return res?.data || ''; },
        async fromTorrent(url) {
            if (!url || url.startsWith('magnet:')) return '';
            let bytes;
            try {
                bytes = new Uint8Array(await HTTP.arrayBuffer(url));
            } catch (e) { throw new Error(`下载种子失败：${e?.message || e}`); }
            this.assertTorrentResponse(bytes);
            const range = this.infoRange(bytes);
            return range ? await Crypto.sha1Hex(bytes.slice(range[0], range[1])) : '';
        },
        assertTorrentResponse(bytes) {
            const head = new TextDecoder('utf-8').decode(bytes.slice(0, 160));
            if (/^\s*\{/.test(head)) { try { const json = JSON.parse(new TextDecoder().decode(bytes)); throw new Error(json?.message || json?.msg || '下载链接未返回种子文件'); } catch (e) { if (e?.message) throw e; throw new Error('下载链接未返回种子文件'); } }
            if (/^\s*<!doctype html|<html|<head/i.test(head)) throw new Error('下载被 Cloudflare/登录拦截，请用带 passkey 的 HTTPS 链接');
        },
        findTorrentUrl() {
            const all = [];
            for (const sel of TORRENT_LINK_SELECTORS) all.push(...document.querySelectorAll(sel));
            const best = [...new Set(all)].map(a => ({ a, s: Helpers.scoreTorrentLink(a, { rewardDownloadPath: true }) })).filter(x => x.s >= 0).sort((x, y) => y.s - x.s)[0]?.a;
            if (best?.href) return best.href;
            for (const sel of TORRENT_LINK_SELECTORS) {
                const link = firstOf(document.querySelectorAll(sel), a => Helpers.scoreTorrentLink(a) >= 0);
                if (link?.href) return link.href;
            }
            const byText = firstOf(document.querySelectorAll('a[href]'), a => /下载|torrent|种子|download/i.test(a.textContent || '') && Helpers.scoreTorrentLink(a) >= 0);
            return byText?.href || '';
        },
        infoRange(bytes) { const dec = new TextDecoder('latin1'); const str = dec.decode(bytes); const key = str.indexOf('4:info'); if (key < 0) return null; const start = key + 6; let i = start; const walk = () => { const begin = i; const c = str[i]; if (c === 'i') { i = str.indexOf('e', i) + 1; return [begin, i]; } if (c === 'l' || c === 'd') { i++; while (str[i] !== 'e' && i < str.length) walk(); i++; return [begin, i]; } if (/\d/.test(c)) { const colon = str.indexOf(':', i); const len = Number(str.slice(i, colon)); i = colon + 1 + len; return [begin, i]; } throw new Error('bad bencode'); }; try { return walk(); } catch (_) { return null; } }
    };



export { InfoHash };

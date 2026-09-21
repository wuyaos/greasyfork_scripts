import { SiteIndex } from './site-index.js';



const ReseedSite = {
        sid(raw = {}, fallback = '') {
            return String(raw.sid || raw.site_id || raw.site || raw.site_id_str || fallback || '');
        },
        torrentId(raw = {}) {
            return raw.torrent_id || raw.tid || raw.id;
        },
        name(raw = {}, meta = {}, sid = '', source = 'iyuu') {
            return raw.site_name || raw.site_alias || raw.name || raw.site || raw.nickname || raw.name_cn
                || SiteIndex.name(meta) || (source === 'iyuu' ? `站点${sid}` : 'IYUU');
        },
        count(raw = {}, source = 'iyuu') {
            return source === 'iyuu' ? 1 : Number(raw.count || raw.num || 1);
        },
        build({ source, raw = {}, index, fallbackSid = '' }) {
            const sid = this.sid(raw, fallbackSid);
            if (!sid) return null;
            const meta = index.get(sid) || {};
            const torrentId = this.torrentId(raw);
            const rewrite = SiteIndex.rewriteOverrideUrl.bind(SiteIndex);
            const detailRaw = rewrite(raw.url || raw.page_url || raw.link || raw.zmpt_data?.url || '');
            const downloadRaw = rewrite(raw.download_url || raw.downloadUrl || raw.down_url || raw.zmpt_data?.download_url || '');
            return {
                source,
                sid,
                name: this.name(raw, meta, sid, source),
                host: SiteIndex.host(meta),
                torrentId,
                icon: raw.icon || raw.logo || raw.favicon || SiteIndex.icon(meta),
                count: this.count(raw, source),
                url: SiteIndex.detailUrl(meta, torrentId, detailRaw) || SiteIndex.detailUrl(meta, torrentId, ''),
                downloadUrl: SiteIndex.bestDownloadUrl({ ...meta, downloadUrl: downloadRaw }, torrentId)
            };
        },
        mergeBySid(target, next) {
            target.count = Number(target.count || 0) + Number(next.count || 1);
            if (!target.url) target.url = next.url;
            if (!target.downloadUrl) target.downloadUrl = next.downloadUrl;
            if (!target.torrentId) target.torrentId = next.torrentId;
            if (!target.icon && next.icon) target.icon = next.icon;
        }
    };



export { ReseedSite };

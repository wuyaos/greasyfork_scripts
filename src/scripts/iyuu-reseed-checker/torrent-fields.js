

const Helpers = {
        text(sel, root = document) { return root.querySelector(sel)?.textContent?.trim() || ''; },
        abs(raw) { try { return raw ? new URL(raw, location.origin).href : ''; } catch (_) { return ''; } },
        size(t) { const m = String(t || '').replace(/iB/gi, 'B').toUpperCase().match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)/); if (!m) return 0; return Number(m[1]) * ({ TB: 1024 ** 4, GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024 }[m[2]] || 1); },
        findDownload(selectors) { for (const sel of selectors) { const el = document.querySelector(sel); if (el?.href || el?.value) return el.href || el.value; } return ''; },
        scoreTorrentLink(link, { allowMagnet = false, rewardDownloadPath = false } = {}) { const h = String(link?.href || link || ''); if (!h || (h.startsWith('magnet:') && !allowMagnet)) return -1; let s = 0; if (/^https:/i.test(h)) s += 2; if (/passkey=/i.test(h)) s += 2; if (/https=1/i.test(h)) s += 1; if (rewardDownloadPath && /download\.php|\/download(?:\/|$)|\.torrent(?:$|\?)/i.test(h)) s += 3; if (/edit|report|comment|help|rules/i.test(h)) s -= 2; return s; },
        titleFromDownload(link) { return String(link?.textContent || link?.href?.split('/').pop() || '').replace(/\.torrent$/i, '').trim(); },
        info({ id, name, description = '', downloadLink = '', sizeText = '', size = 0, mount, extra = {} }) { return name && mount?.target ? { id, name: String(name).trim(), description, downloadLink, size: Number(size) || this.size(sizeText), mount, extra } : null; }
    };



export { Helpers };



const UTILS = {
        parseSize(sizeStr) {
            sizeStr = String(sizeStr || '');
            sizeStr = sizeStr.replace(/iB/gi, 'B');
            if (!sizeStr) return 0;
            const match = sizeStr.toUpperCase().match(/(\d+\.?\d*)\s*(TB|GB|MB|KB)/);
            if (!match) return 0;
            const size = parseFloat(match[1]);
            const unit = match[2];
            switch (unit) {
                case 'TB': return size * 1024 ** 4;
                case 'GB': return size * 1024 ** 3;
                case 'MB': return size * 1024 ** 2;
                case 'KB': return size * 1024;
                default: return 0;
            }
        },
        getFormattedDate() {
            return new Date().toISOString().slice(0, 19).replace('T', ' ');
        },

        escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        cleanText(value) {
            return String(value || '').replace(/\s+/g, ' ').trim();
        },

        normalizeTorrentTitle(rawTitle) {
            if (!rawTitle) return '';
            let title = String(rawTitle).replace(/\s+/g, ' ').trim();
            title = title
                .replace(/\.torrent$/i, '')
                .replace(/\.(mkv|mp4|avi|ts|m2ts|flv|wmv)$/i, '');
            for (let i = 0; i < 6; i++) {
                const next = title.replace(/^\s*(?:\[[^\]]{1,30}\]|\([^\)]{1,30}\)|【[^】]{1,30}】|<[^>]{1,30}>)(?:[\s._-]+|$)/, '');
                if (next === title) break;
                title = next;
            }
            title = title
                .replace(/^[^A-Za-z0-9\u4e00-\u9fa5]+/, '')
                .replace(/^[A-Za-z0-9]{2,10}\]\s*/, '')
                .replace(/^[\]\)\】\}]+/, '');
            title = title.replace(/[._]+/g, ' ');
            const noisyPart = title.match(/\b(?:4320p|2160p|1080p|720p|480p|web[-\s]?dl|webrip|bluray|bdrip|hdtv|dvdrip|remux|h\.?26[45]|x26[45]|hevc|avc|aac(?:\d\.\d)?|ddp?\d(?:\.\d)?|dts(?:-hd)?|atmos|hdr10\+?|dolby[\s-]?vision|10bit|8bit)\b/i);
            if (noisyPart && noisyPart.index > 0) {
                title = title.slice(0, noisyPart.index);
            }
            title = title.replace(/\s+free\s+\d+\s*h(?:\s+\d+\s*min)?$/i, '');
            title = title.replace(/\s+-[A-Za-z0-9][A-Za-z0-9._-]*$/, '');
            return title.replace(/\s+/g, ' ').trim();
        },

        stripEpisodeInfo(title) {
            return String(title || '')
                .replace(/\bS\d{1,2}E\d{1,3}\b/ig, ' ')
                .replace(/\bE\d{1,3}\b/ig, ' ')
                .replace(/\b第\s*\d+\s*[季集]\b/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        },

        extractSubtitleCandidates(subtitle) {
            const results = [];
            const add = (v) => {
                const val = String(v || '').replace(/\s+/g, ' ').trim();
                if (val && !results.includes(val)) results.push(val);
            };
            if (!subtitle) return results;
            const clean = String(subtitle || '')
                .replace(/\*[^*]{1,40}\*/g, ' ')
                .replace(/\[[^\]]{1,40}\]/g, ' ')
                .replace(/[|｜]/g, '/')
                .replace(/\s+/g, ' ')
                .trim();
            clean.split(/\s*\/\s*/).forEach((part) => {
                let p = String(part || '').trim();
                if (!p) return;
                p = p
                    .replace(/(?:评论音轨|多国语字幕|字幕|中字|簡繁|简繁|国语|日语|英语|粤语|双语|音轨|內封|外挂|內嵌).*/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                add(p);
                const words = p.match(/\b[A-Za-z][A-Za-z0-9'’-]{3,}\b/g) || [];
                words.forEach(add);
            });
            return results.slice(0, 8);
        },

        extractYearHintsFromText(text) {
            const years = [];
            String(text || '').replace(/\b(19|20)\d{2}\b/g, (m) => {
                if (!years.includes(m)) years.push(m);
                return m;
            });
            return years;
        },

        inferTmdbSearchTypeFromText(text) {
            const raw = String(text || '');
            if (/\bS\d{1,2}E\d{1,3}\b/i.test(raw)) return 'tv';
            if (/\bE\d{1,3}\b/i.test(raw) || /第\s*\d+\s*季/.test(raw)) return 'tv';
            return '';
        },

        normalizeForMatch(text) {
            return String(text || '')
                .toLowerCase()
                .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        },

        getRecognitionCandidates(rawTitle, subtitle = '') {
            const candidates = [];
            const addCandidate = (title) => {
                const val = String(title || '')
                    .replace(/\s+/g, ' ')
                    .replace(/\.torrent$/i, '')
                    .replace(/\.(mkv|mp4|avi|ts|m2ts|flv|wmv)$/i, '')
                    .replace(/^[A-Za-z0-9]{2,10}\]\s*/, '')
                    .trim();
                if (val && !candidates.includes(val)) candidates.push(val);
            };

            const normalized = this.normalizeTorrentTitle(rawTitle);
            const withoutEpisode = this.stripEpisodeInfo(normalized);
            const slashAlias = normalized.split(/\s*\/\s*/)[0].trim();
            const hasTvPattern = /\bS\d{1,2}E\d{1,3}\b/i.test(normalized)
                || /\bE\d{1,3}\b/i.test(normalized)
                || /第\s*\d+\s*[季集]/.test(normalized);

            addCandidate(rawTitle);
            addCandidate(normalized);
            addCandidate(slashAlias);
            addCandidate(withoutEpisode);
            this.extractSubtitleCandidates(subtitle).forEach(addCandidate);

            if (!hasTvPattern) {
                const yearMatch = normalized.match(/\b(?:19|20)\d{2}\b/);
                if (yearMatch) {
                    const year = yearMatch[0];
                    const noYear = normalized
                        .replace(new RegExp(`\\b${year}\\b`, 'g'), ' ')
                        .replace(/\(\s*\)/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    addCandidate(noYear);
                    if (noYear) {
                        addCandidate(`${noYear} ${year}`);
                        addCandidate(`${noYear} (${year})`);
                    }
                }
            }
            return candidates;
        },

        scoreTmdbResult(item, query, yearHints, preferType) {
            const title = item?.title || item?.name || '';
            const nt = this.normalizeForMatch(title);
            const nq = this.normalizeForMatch(query);
            let score = 0;
            if (!nt || !nq) return score;
            if (nt === nq) score += 12;
            else if (nt.includes(nq) || nq.includes(nt)) score += 8;
            const qTokens = nq.split(' ').filter(Boolean);
            const tTokens = nt.split(' ').filter(Boolean);
            const overlap = qTokens.filter(t => tTokens.includes(t)).length;
            score += Math.min(overlap, 6);
            const mediaType = item?.media_type || '';
            if (preferType && mediaType === preferType) score += 2;
            const y = String(item?.release_date || item?.first_air_date || '').slice(0, 4);
            if (y && yearHints.includes(y)) score += 4;
            return score;
        },
    };



export { UTILS };

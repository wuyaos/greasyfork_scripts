    // <pt-common:start>
    const createPTCommon = ({
        defaultLabel,
        productId,
        gridLabelClass,
        gridContentClass
    }) => {
        const NS = 'pt-helper';
        const TORRENT_LINK_SELECTORS = Object.freeze([
            'a[href*="download.php"]',
            'a[href*="download"]',
            'a[href$=".torrent"]',
            'a[href*="/dl/"]',
            'a[href*="download?id="]'
        ])
        const Native = {
            closest: Element.prototype.closest
        };
        const DOM = {
            ns: NS,
            productId,
            qs(selector, root = document) {
                try { return typeof root?.querySelector === 'function' ? root.querySelector(selector) : null; } catch (_) { return null; }
            },
            qsa(selector, root = document) {
                try { return typeof root?.querySelectorAll === 'function' ? Array.from(root.querySelectorAll(selector)) : []; } catch (_) { return []; }
            },
            closest(node, selector) {
                try { return node ? Native.closest.call(node, selector) : null; } catch (_) { return null; }
            },
            productRootSelector(siteId = '') {
                const site = siteId ? `[data-${NS}-site="${siteId}"]` : '';
                return `[data-${NS}-root="1"][data-${NS}-product="${productId}"]${site}`;
            },
            markRoot(node, { siteId = '', family = '', anchorLevel = '', anchorReason = '', anchorKey = '' } = {}) {
                if (!node?.setAttribute) return node;
                node.setAttribute(`data-${NS}-root`, '1');
                node.setAttribute(`data-${NS}-product`, productId);
                if (siteId) node.setAttribute(`data-${NS}-site`, siteId);
                if (family) node.setAttribute(`data-${NS}-family`, family);
                if (anchorLevel) node.setAttribute(`data-${NS}-anchor-level`, String(anchorLevel));
                if (anchorReason) node.setAttribute(`data-${NS}-anchor-reason`, anchorReason);
                if (anchorKey) node.setAttribute(`data-${NS}-anchor-key`, anchorKey);
                return node;
            }
        };

        const labelOf = mount => mount?.label || defaultLabel;
        const rootSelector = siteId => DOM.productRootSelector(siteId);
        const stableNodeKey = node => {
            if (!node) return '';
            if (node.id) return `#${node.id}`;
            const dataKey = node.getAttribute?.(`data-${NS}-anchor`) || node.getAttribute?.(`data-${NS}-key`);
            if (dataKey) return `[data:${dataKey}]`;
            const text = String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
            const tag = String(node.tagName || 'node').toLowerCase();
            return text ? `${tag}:${text}` : tag;
        };
        const mountAnchorKey = mount => {
            if (!mount?.target) return '';
            const target = mount.target;
            if (mount.type === 'append' || mount.type === 'prepend') return `${mount.type}:${stableNodeKey(target)}`;
            if (mount.type === 'table-row-after' || mount.type === 'table-colspan-after' || mount.type === 'table-colspan-before' || mount.type === 'ant-row-after') {
                const ref = DOM.closest(target, 'tr') || target;
                const firstCell = ref?.cells?.[0] || ref;
                return `${mount.type}:${stableNodeKey(ref)}:${stableNodeKey(firstCell)}`;
            }
            if (mount.type === 'definition-after') {
                const ref = DOM.closest(target, 'dd') || target;
                return `${mount.type}:${stableNodeKey(ref.previousElementSibling)}:${stableNodeKey(ref)}`;
            }
            if (mount.type === 'grid-pair-after') {
                return `${mount.type}:${stableNodeKey(target.previousElementSibling)}:${stableNodeKey(target)}`;
            }
            return `${mount.type}:${stableNodeKey(target)}`;
        };
        const mountHost = mount => {
            if (!mount?.target) return null;
            if (mount.type === 'append' || mount.type === 'prepend') return mount.target || document.body;
            if (mount.type === 'table-row-after' || mount.type === 'table-colspan-after' || mount.type === 'table-colspan-before' || mount.type === 'ant-row-after') {
                return mount.target?.closest?.('table') || mount.target?.parentElement || mount.target;
            }
            if (mount.type === 'definition-after') return mount.target?.closest?.('dl') || mount.target?.parentElement || mount.target;
            if (mount.type === 'grid-pair-after') return mount.target?.parentElement || mount.target;
            return mount.target?.parentElement || mount.target;
        };
        const isEmptyElement = node => node?.nodeType === 1 && !String(node.textContent || '').trim() && !node.querySelector?.('img,button,a,input,select,textarea,svg,canvas,video,audio');
        const cleanupEmptyMountShell = node => {
            let current = node;
            for (let depth = 0; depth < 3; depth += 1) {
                if (!isEmptyElement(current)) return;
                const next = current.parentElement;
                current.remove();
                current = next;
            }
        };

        const Mount = {
            afterNode(target) { return { type: 'div-after', target }; },
            inlineAfter(target, label = defaultLabel) { return { type: 'inline-after', target, label }; },
            tableRowAfter(target, label = defaultLabel) { return { type: 'table-row-after', target, label }; },
            tableColspanAfter(target, label = defaultLabel, colspan = 0) { return { type: 'table-colspan-after', target, label, colspan }; },
            tableColspanBefore(target, label = defaultLabel, colspan = 0) { return { type: 'table-colspan-before', target, label, colspan }; },
            blockAfter(target, label = defaultLabel) { return { type: 'block-after', target, label }; },
            antRowAfter(target, label = defaultLabel) { return { type: 'ant-row-after', target, label }; },
            gridPairAfter(target, label = defaultLabel) { return { type: 'grid-pair-after', target, label }; },
            prepend(target = document.body) { return { type: 'prepend', target }; },
            append(target) { return { type: 'append', target }; },
            definitionAfter(target, label = defaultLabel) { return { type: 'definition-after', target, label }; },
            mountRoot(mount, contentNode, meta = {}) {
                const siteId = meta.siteId || '';
                const existing = DOM.qs(rootSelector(siteId)) || DOM.qs(rootSelector(''));
                const anchorKey = meta.anchorKey || mountAnchorKey(mount);
                const targetHost = mountHost(mount);
                if (existing && existing !== contentNode) {
                    const sameHost = targetHost && targetHost.contains?.(existing);
                    const sameAnchor = anchorKey && existing.getAttribute?.(`data-${NS}-anchor-key`) === anchorKey;
                    const oldParent = existing.parentElement;
                    DOM.markRoot(existing, { ...meta, anchorReason: meta.anchorReason || mount?.type || '', anchorKey });
                    if ((!sameHost || !sameAnchor) && mount?.target) {
                        this.render(mount, existing);
                        cleanupEmptyMountShell(oldParent);
                    }
                    return existing;
                }
                DOM.markRoot(contentNode, { ...meta, anchorReason: meta.anchorReason || mount?.type || '', anchorKey });
                this.render(mount, contentNode);
                return contentNode;
            },
            render(mount, contentNode) {
                const m = mount?.target ? mount : this.prepend();
                if (m.type === 'table-row-after') return this.tableRow(m, contentNode);
                if (m.type === 'table-colspan-after') return this.tableColspan(m, contentNode);
                if (m.type === 'table-colspan-before') return this.tableColspan(m, contentNode, true);
                if (m.type === 'inline-after') return this.renderInlineAfter(m, contentNode);
                if (m.type === 'block-after') return this.block(m, contentNode);
                if (m.type === 'ant-row-after') return this.antRow(m, contentNode);
                if (m.type === 'grid-pair-after') return this.gridPair(m, contentNode);
                if (m.type === 'definition-after') return this.definition(m, contentNode);
                if (m.type === 'append') return m.target.appendChild(contentNode);
                if (m.type === 'prepend') return (m.target || document.body).prepend(contentNode);
                return m.target.after(contentNode);
            },
            tableRow(m, contentNode) {
                const ref = m.target?.closest?.('tr') || m.target;
                const tr = document.createElement('tr');
                const h = document.createElement('td');
                const d = document.createElement('td');
                const refHead = ref?.cells?.[0], refBody = ref?.cells?.[1];
                if (ref?.className) tr.className = ref.className;
                if (ref?.getAttribute?.('style')) tr.setAttribute('style', ref.getAttribute('style'));
                h.className = refHead ? refHead.className : 'rowhead nowrap';
                d.className = refBody ? refBody.className : 'rowfollow';
                if (refHead?.getAttribute?.('style')) h.setAttribute('style', refHead.getAttribute('style'));
                if (refBody?.getAttribute?.('style')) d.setAttribute('style', refBody.getAttribute('style'));
                ['align', 'valign'].forEach(attr => { if (refHead?.getAttribute?.(attr)) h.setAttribute(attr, refHead.getAttribute(attr)); if (refBody?.getAttribute?.(attr)) d.setAttribute(attr, refBody.getAttribute(attr)); });
                const refText = refHead?.querySelector?.('.td-text');
                if (refText) {
                    const span = document.createElement('span');
                    span.className = refText.className;
                    span.textContent = labelOf(m);
                    h.appendChild(span);
                } else if (refHead?.firstElementChild && refHead.firstElementChild.children.length === 0) {
                    const wrapper = refHead.firstElementChild.cloneNode(false);
                    wrapper.textContent = labelOf(m);
                    h.appendChild(wrapper);
                } else {
                    h.textContent = labelOf(m);
                }
                d.appendChild(contentNode);
                tr.append(h, d);
                ref?.after ? ref.after(tr) : m.target.after(tr);
                return tr;
            },
            tableColspan(m, contentNode, before = false) {
                const ref = m.target?.closest?.('tr') || m.target;
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                const table = ref?.closest?.('table');
                const label = document.createElement('span');
                const separator = document.createElement('span');
                label.style.cssText = 'font-weight:700;vertical-align:middle;';
                label.textContent = labelOf(m);
                separator.textContent = '｜';
                contentNode.style.display = 'inline-flex';
                contentNode.style.alignItems = 'center';
                contentNode.style.flexWrap = 'wrap';
                contentNode.style.gap = contentNode.style.gap || '6px';
                contentNode.style.verticalAlign = 'middle';
                td.colSpan = m.colspan || Math.max(1, ...[...(table?.rows || [])].map(r => r.cells.length));
                td.style.padding = '6px 8px';
                td.style.textAlign = 'left';
                td.append(label, separator, contentNode);
                tr.appendChild(td);
                if (before && ref?.before) ref.before(tr);
                else if (ref?.after) ref.after(tr);
                else (m.target || document.body).after(tr);
                return tr;
            },
            renderInlineAfter(m, contentNode) {
                const wrap = document.createElement('div');
                const label = document.createElement('span');
                const separator = document.createElement('span');
                wrap.style.cssText = 'display:flex;justify-content:flex-start;align-items:center;gap:4px;flex-wrap:wrap;padding:4px 6px;text-align:left;width:100%;margin-left:0;align-self:stretch;';
                label.style.fontWeight = '700';
                label.textContent = labelOf(m);
                separator.textContent = '｜';
                contentNode.style.display = 'inline-flex';
                contentNode.style.alignItems = 'center';
                contentNode.style.flexWrap = 'wrap';
                contentNode.style.gap = contentNode.style.gap || '6px';
                contentNode.style.marginLeft = '0';
                wrap.append(label, separator, contentNode);
                m.target.after(wrap);
                return wrap;
            },
            block(m, contentNode) {
                const block = document.createElement('div');
                block.className = 'block';
                const title = document.createElement('div');
                title.className = 'blocktitle';
                title.textContent = labelOf(m);
                const body = document.createElement('div');
                body.className = 'blockcontent';
                body.appendChild(contentNode);
                block.append(title, body);
                m.target.after(block);
                return block;
            },
            antRow(m, contentNode) {
                const tr = document.createElement('tr');
                tr.className = 'ant-descriptions-row';
                const th = document.createElement('th');
                th.className = 'ant-descriptions-item-label';
                th.style.cssText = 'width:135px;text-align:right';
                th.textContent = labelOf(m);
                const td = document.createElement('td');
                td.className = 'ant-descriptions-item-content';
                td.appendChild(contentNode);
                tr.append(th, td);
                (m.target?.closest?.('tr') || m.target).after(tr);
                return tr;
            },
            definition(m, contentNode) {
                const dt = document.createElement('dt');
                dt.textContent = labelOf(m);
                const dd = document.createElement('dd');
                dd.appendChild(contentNode);
                const ref = m.target?.closest?.('dd') || m.target;
                ref.after(dt, dd);
                return dd;
            },
            gridPair(m, contentNode) {
                const refValue = m.target;
                const refLabel = refValue?.previousElementSibling;
                const label = document.createElement('div');
                label.className = refLabel?.className || refValue?.className || gridLabelClass;
                label.textContent = labelOf(m);
                const value = document.createElement('div');
                value.className = refValue?.className || refLabel?.className || gridContentClass;
                value.appendChild(contentNode);
                m.target.after(label, value);
                return value;
            }
        };

        const GazelleSites = {
            isOrpheusHost() { return /(^|\.)orpheus\.network$/i.test(location.hostname); },
            isGpwHost() { return location.hostname === 'greatposterwall.com'; },
            isHaidanHost() { return /(^|\.)haidan\.(cc|video)$/i.test(location.hostname); },
            orphusMatches() { return this.isOrpheusHost() && location.pathname === '/torrents.php' && new URLSearchParams(location.search).has('id'); },
            gpwMatches() {
                const params = new URLSearchParams(location.search);
                return this.isGpwHost() && location.pathname === '/torrents.php' && params.has('id') && !params.has('action');
            },
            haidanMatches() { return this.isHaidanHost() && location.pathname === '/details.php' && new URLSearchParams(location.search).has('group_id'); },
            gazelleTidFromLink(link, param = 'id') {
                const href = link?.href || link?.getAttribute?.('href') || '';
                try { return new URL(href, location.origin).searchParams.get(param) || ''; } catch (_) { return ''; }
            },
            parseSize(text) {
                const match = String(text || '').replace(/iB/gi, 'B').toUpperCase().match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)/);
                if (!match) return 0;
                return Number(match[1]) * ({ TB: 1024 ** 4, GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024 }[match[2]] || 1);
            },
            firstLineText(node, limit = 120) {
                const text = String(node?.innerText || node?.textContent || '').split(/\n|◎/).map(s => s.trim()).find(Boolean) || '';
                return text.replace(/\s+/g, ' ').trim().slice(0, limit);
            },
            async haidanActualName(tid) {
                if (!tid) return '';
                try {
                    const res = await fetch(new URL(`torrent_info.php?id=${encodeURIComponent(tid)}`, location.origin).href, { credentials: 'include' });
                    const html = await res.text();
                    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    return text.match(/- \[name\] \(String\) \[\d+\] :\s*(.*?)(?:\s*- \[piece length\]|\s*- \[pieces\]|\s*- \[private\]|$)/i)?.[1]?.trim() || '';
                } catch (_) { return ''; }
            },
            gazelleUnifiedEntry(row, dl, opts = {}) {
                if (!row || !dl) return null;
                const tid = opts.tid || this.gazelleTidFromLink(dl, opts.tidParam || 'id');
                if (!tid) return null;
                const text = String(row.textContent || '').replace(/\s+/g, ' ').trim();
                const title = String(opts.title || '').trim() || this.firstLineText(DOM.qs('.detail-info-items-block-content2', row), 120) || `torrentid ${tid}`;
                const format = String(opts.format || '').trim()
                    || DOM.qs('.torrent_format, .format', row)?.textContent?.trim()
                    || text.match(/\b(FLAC|MP3|AAC|AC3|DTS|Blu-?ray|WEB-?DL|WEBRip|Encode|Remux|DVD|HDTV|x264|x265|H\.?264|H\.?265)\b/i)?.[0]
                    || '';
                const size = String(opts.size || text.match(/\b\d+(?:\.\d+)?\s*[TGMK]i?B\b/i)?.[0] || '').trim();
                const slc = String(opts.slc || '').trim();
                const downloadLink = opts.downloadLink || dl.href || dl.getAttribute?.('href') || '';
                const flLink = String(opts.flLink || '').trim();
                const needsToken = Boolean(opts.needsToken);
                const explicitHash = this.extractExplicitHash(row);
                const actualName = String(opts.actualName || '').trim();
                return { tid, title, format, actualName, size, sizeBytes: this.parseSize(size), slc, active: slc, downloadLink, flLink, needsToken, explicitHash };
            },
            gazelleEntry(row, dl, id) {
                return this.gazelleUnifiedEntry(row, dl, { tid: id });
            },
            gpwGroupTitle(root = document) {
                return (DOM.qs('.group-info__name', root)?.textContent || DOM.qs('h2 a[href*="torrents.php?id="]', root)?.textContent || document.title.replace(/\s*::.*/, '')).replace(/\s+/g, ' ').trim();
            },
            gpwActualName(row, tid = '') {
                const detail = tid ? (DOM.qs(`#torrent_detail_${tid}`) || DOM.qs(`#torrent_${tid}`) || DOM.qs(`#torrent${tid}`)) : null;
                if (!detail) return '';
                const mi = DOM.qs('.is-mediainfo', detail);
                if (mi) {
                    // 取媒体信息容器里第一个含「详情 |」的 div（不含 hidden pre）
                    const divs = DOM.qsa('div', mi);
                    for (const div of divs) {
                        if (div.classList?.contains('hidden')) continue;
                        const t = String(div.textContent || '').replace(/\s+/g, ' ').trim();
                        if (/详情\s*[|｜]/i.test(t)) {
                            const m = t.match(/详情\s*[|｜]\s*(.+)/i);
                            if (m) return m[1].trim();
                        }
                    }
                }
                return '';
            },
            gazelleEntries(root = document) {
                const groupTitle = this.gpwGroupTitle(root);
                return DOM.qsa('tr.torrent_row, tr.TableTorrent-rowTitle', root).map(row => {
                    const links = DOM.qsa('a[href*="action=download"]', row);
                    const dl = links.find(link => !/([?&])usetoken=1(?:&|$)/.test(link.href || link.getAttribute?.('href') || '')) || links[0];
                    const fl = links.find(link => /([?&])usetoken=1(?:&|$)/.test(link.href || link.getAttribute?.('href') || ''));
                    const tid = this.gazelleTidFromLink(dl, 'id');
                    const seed = DOM.qs('.TableTorrent-cellSeeders, .torrent_seeders, .seeders', row)?.textContent?.trim() || '';
                    const leech = DOM.qs('.TableTorrent-cellLeechers, .torrent_leechers, .leechers', row)?.textContent?.trim() || '';
                    const snatch = DOM.qs('.TableTorrent-cellSnatches, .torrent_snatched, .snatches, .snatched', row)?.textContent?.trim() || '';
                    const actualName = this.gpwActualName(row, tid);
                    const format = DOM.qs('span.TorrentTitle', row)?.textContent?.trim() || '';
                    return this.gazelleUnifiedEntry(row, dl, {
                        tid,
                        title: actualName || groupTitle || format,
                        format,
                        actualName,
                        size: DOM.qs('.TableTorrent-cellSize', row)?.textContent?.trim() || '',
                        slc: seed || leech || snatch ? `${seed || 0}/${leech || 0}/${snatch || 0}` : '',
                        flLink: fl?.href || fl?.getAttribute?.('href') || '',
                        needsToken: Boolean(fl && dl === fl)
                    });
                }).filter(Boolean);
            },
            haidanEntries(root = document) {
                const box = DOM.qs('.torrents.content-color', root) || root;
                const rows = DOM.qsa('.torrent-wrap', box).filter(row => DOM.qs('a[href*="download.php"]', row));
                const sources = rows.length ? rows : DOM.qsa('a[href*="download.php"]', box).map(dl => DOM.closest(dl, '.torrent-wrap') || DOM.closest(dl, 'tr') || dl.parentElement).filter(Boolean);
                return sources.map(row => {
                    const dl = DOM.qs('a[href*="download.php"]', row);
                    const nums = DOM.qsa('div', row).filter(div => !DOM.qs('div', div) && /^\d{1,6}$/.test(String(div.textContent || '').trim())).slice(0, 3).map(div => div.textContent.trim());
                    return this.gazelleUnifiedEntry(row, dl, {
                        tid: this.gazelleTidFromLink(dl, 'id'),
                        title: this.firstLineText(DOM.qs('.detail-info-items-block-content2', row), 120),
                        format: DOM.qsa('a[href*="viewDetail"]', row).map(a => a.textContent.trim()).find(Boolean) || '',
                        slc: nums.length ? `${nums[0] || 0}/${nums[1] || 0}/${nums[2] || 0}` : ''
                    });
                }).filter(Boolean);
            },
            gazelleHeader() {
                return DOM.qs('tr.colhead_dark')
                    || DOM.qs('table.TableTorrent tr')
                    || DOM.qsa('tr').find(tr => /^\s*Torrents\s*$/i.test(tr.textContent || ''))
                    || DOM.qs('tr');
            },
            orphusMount(label = defaultLabel) {
                const tid = new URLSearchParams(location.search).get('torrentid');
                if (tid) {
                    const dl = DOM.qs(`a[href*="action=download"][href*="id=${tid}"]`);
                    const row = DOM.closest(dl, 'tr.torrent_row') || DOM.qs(`#torrent${tid}, #torrent_${tid}`);
                    return row ? Mount.tableColspanAfter(row, label) : Mount.afterNode(DOM.qs('h2') || document.body);
                }
                const header = this.gazelleHeader();
                return header ? Mount.tableColspanAfter(header, label) : Mount.afterNode(DOM.qs('h2') || document.body);
            },
            gpwMount(label = defaultLabel) {
                const tid = new URLSearchParams(location.search).get('torrentid');
                const header = DOM.qs('table.TableTorrent tr') || this.gazelleHeader();
                if (header) return Mount.tableColspanAfter(header, label);
                if (tid) {
                    const dl = DOM.qs(`a[href*="action=download"][href*="id=${tid}"]`);
                    const row = this.gpwTorrentRow(tid) || DOM.closest(dl, 'tr');
                    return row ? Mount.tableColspanAfter(row, label) : Mount.afterNode(DOM.qs(`#torrent${tid}`) || document.body);
                }
                return Mount.afterNode(document.body);
            },
            haidanMount(label = defaultLabel) {
                const header = DOM.qs('.torrents.content-color')?.firstElementChild;
                return Mount.inlineAfter(header || DOM.qs('.detail-info-title') || DOM.qs('.detail-info-body') || document.body, label);
            },
            gpwTorrentRow(tid = new URLSearchParams(location.search).get('torrentid')) {
                if (!tid) return null;
                return DOM.qs(`#torrent${tid}, #torrent_${tid}, #torrent_detail_${tid}`)
                    || DOM.closest(DOM.qs(`#torrent_details a[href*="id=${tid}"]`), 'tr');
            },
            extractExplicitHash(root = document) {
                return `${root?.innerText || ''}\n${root?.textContent || ''}`.match(/Hash[：:]\s*([a-fA-F0-9]{40})/)?.[1] || '';
            }
        };

        const SITE_FAMILIES = Object.freeze({
            'totheglory': 'custom-ttg',
            'hdsky': 'nexusphp',
            'sjtu': 'nexusphp',
            'm-team': 'custom-mteam',
            'hdcity': 'tbsource',
            'monikadesign': 'unit3d',
            'beyond-hd': 'custom-bhd',
            'eiga': 'unit3d',
            'hd-space': 'tbsource',
            'iptorrents': 'custom-ipt',
            'filelist': 'tbsource',
            'hudbt': 'custom-hudbt',
            'orpheus': 'custom-gazelle',
            'greatposterwall': 'custom-gpw',
            'haidan': 'custom-gazelle',
            'hhclub': 'custom-hhclub',
            'bangumi': 'public-bt',
            'bangumi-moe': 'public-bt',
            'mikanani': 'public-bt',
            'nyaa': 'public-bt',
            'acg-rip': 'public-bt',
            'comicat-kisssub': 'public-bt',
            'generic': 'unknown',
            'generic-nexusphp': 'nexusphp'
        });

        function needsDownloadForHash(info = {}) {
            const host = String(info.host || info.hostname || '').replace(/^www\./i, '').toLowerCase();
            const siteId = String(info.id || info.siteId || '').toLowerCase();
            const family = info.family || SITE_FAMILIES[siteId] || SITE_FAMILIES[host] || SITE_FAMILIES[host.split('.')[0]] || '';
            const explicitHash = info.explicitHash || info.extra?.explicitHash || '';
            return /gazelle|gpw/.test(family) && !/^[a-fA-F0-9]{40}$/.test(String(explicitHash)) && info.extra?.needsToken === true;
        }

        function tableMount(siteId, row, label) {
            if (!row) return null;
            return Mount.tableRowAfter(row, label);
        }

        const AdapterRuntime = {
            withMount(findMount, getInfo) {
                return {
                    findMount,
                    getInfo: mount => getInfo(mount || findMount())
                };
            },
            siteId(adapter = {}) {
                return adapter.id || '';
            },
            family(adapter = {}) {
                const siteId = this.siteId(adapter);
                return adapter.family || SITE_FAMILIES[siteId] || '';
            },
            mountRoot(adapter, mount, contentNode, anchorReason = 'lazy-button') {
                const siteId = this.siteId(adapter);
                return Mount.mountRoot(mount, contentNode, {
                    siteId,
                    family: this.family(adapter),
                    anchorReason
                });
            }
        };

        const GazellePicker = {
            COLUMNS: [
                { k: 'title', t: '标题', align: 'left', wrap: true },
                { k: 'format', t: '格式', align: 'left', wrap: true },
                { k: 'size', t: '体积', align: 'right' },
                { k: 'slc', t: 'S/L/C', align: 'center' },
                { k: 'tid', t: 'ID', align: 'right' }
            ],
            style: '.pt-gazelle-picker{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:24px}.pt-gazelle-picker-panel{width:min(860px,96vw);max-height:86vh;overflow:auto;background:#fff;color:#222;border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.25);font-size:14px}.pt-gazelle-picker-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb}.pt-gazelle-picker-title{font-weight:700;font-size:16px}.pt-gazelle-picker-close{border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer;color:#666}.pt-gazelle-picker-table{width:100%;border-collapse:collapse}.pt-gazelle-picker-table th{position:sticky;top:49px;background:#f7f9fb;z-index:1}.pt-gazelle-picker-table th,.pt-gazelle-picker-table td{padding:9px 10px;border-bottom:1px solid #eef1f4;vertical-align:top}.pt-gazelle-picker-table tbody tr:hover{background:#f5faff}.pt-gazelle-picker-wrap{white-space:normal;word-break:break-word}.pt-gazelle-picker-action{background:#2775b6;color:#fff;border:0;border-radius:4px;padding:6px 10px;cursor:pointer;white-space:nowrap}.pt-gazelle-picker-action:hover{background:#1f669f}',
            ensureStyle() {
                const id = `${NS}-gazelle-picker-style`;
                let style = document.getElementById(id);
                if (!style) {
                    style = document.createElement('style');
                    style.id = id;
                    style.textContent = this.style;
                    document.head.appendChild(style);
                }
            },
            buildPanel({ title = '选择种子', rows = [], actionLabel = '选择', onAction = () => {} } = {}) {
                this.ensureStyle();
                const overlay = document.createElement('div');
                overlay.className = 'pt-gazelle-picker';
                const panel = document.createElement('div');
                panel.className = 'pt-gazelle-picker-panel';
                const head = document.createElement('div');
                head.className = 'pt-gazelle-picker-head';
                const caption = document.createElement('div');
                caption.className = 'pt-gazelle-picker-title';
                caption.textContent = title;
                const close = document.createElement('button');
                close.type = 'button';
                close.className = 'pt-gazelle-picker-close';
                close.textContent = '×';
                close.addEventListener('click', () => overlay.remove());
                head.append(caption, close);
                const table = document.createElement('table');
                table.className = 'pt-gazelle-picker-table';
                const thead = document.createElement('thead');
                const header = document.createElement('tr');
                this.COLUMNS.forEach(col => {
                    const th = document.createElement('th');
                    th.textContent = col.t;
                    th.style.textAlign = col.align || 'left';
                    header.appendChild(th);
                });
                const actionTh = document.createElement('th');
                actionTh.textContent = '操作';
                actionTh.style.textAlign = 'center';
                header.appendChild(actionTh);
                thead.appendChild(header);
                const tbody = document.createElement('tbody');
                rows.forEach(row => {
                    const tr = document.createElement('tr');
                    this.COLUMNS.forEach(col => {
                        const td = document.createElement('td');
                        td.textContent = row?.[col.k] == null ? '' : String(row[col.k]);
                        td.style.textAlign = col.align || 'left';
                        if (col.wrap) td.className = 'pt-gazelle-picker-wrap';
                        tr.appendChild(td);
                    });
                    const actionTd = document.createElement('td');
                    actionTd.style.textAlign = 'center';
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'pt-gazelle-picker-action';
                    btn.textContent = actionLabel;
                    btn.addEventListener('click', () => onAction(row, btn));
                    actionTd.appendChild(btn);
                    tr.appendChild(actionTd);
                    tbody.appendChild(tr);
                });
                table.append(thead, tbody);
                panel.append(head, table);
                overlay.appendChild(panel);
                return overlay;
            }
        };

        const AutoFeedAnchors = {
            actionLabels: new Set(['行为', '小货车', '行為', '种子认领', '簡介', '简介', '操作', 'Action', 'Tagline', 'Tools:', '设备']),
            nameLabels: new Set(['Name', 'Nombre', '名称', '标题']),
            cellText(cell) { return String(cell?.textContent || '').replace(/\s+/g, ' ').trim(); },
            rowByFirstCell(root, labels) {
                for (const tr of (root || document).querySelectorAll('tr')) {
                    if (labels.has(this.cellText(tr.cells?.[0]))) return tr;
                }
                return null;
            },
            domesticActionRow() {
                const descr = document.getElementById('kdescr') || document.getElementById('kdescription');
                const tbody = descr?.closest('tbody') || document.querySelector('#outer table tbody, table tbody');
                return this.rowByFirstCell(tbody, this.actionLabels) || descr?.closest('tr') || null;
            },
            rowAfterName(root) { return this.rowByFirstCell(root, this.nameLabels); },
            bhdNameRow() { return this.rowAfterName(document.querySelector('.table-details tbody')); },
            monikaNameRow() {
                const h4 = document.getElementsByTagName('h4')[0];
                const box = h4?.parentNode?.parentNode?.getElementsByClassName?.('table-responsive')?.[1];
                return this.rowAfterName(box?.getElementsByTagName('table')?.[0]) || null;
            },
            gpwTorrentRow() {
                const tid = new URLSearchParams(location.search).get('torrentid');
                if (!tid) return null;
                return document.querySelector(`#torrent${tid}, #torrent_${tid}, #torrent_detail_${tid}`)
                    || document.querySelector(`#torrent_details a[href*="id=${tid}"]`)?.closest('tr');
            },
            hhclubSubtitleValue() {
                let label = null;
                for (const el of document.querySelectorAll('div.font-bold.leading-6')) {
                    if (this.cellText(el) === '副标题') {
                        label = el;
                        break;
                    }
                }
                return label?.nextElementSibling || null;
            },
            fileListAnchor(id, labelText) {
                const descr = document.getElementById('descr');
                const parent = descr?.parentNode || document.querySelector('.cblock-innercontent,.cblock-content,#maincolumn');
                if (!parent) return null;
                const tableId = 'userscript-filelist-actions';
                let table = document.getElementById(tableId);
                if (!table) {
                    const wrap = document.createElement('div');
                    wrap.id = `${tableId}-wrap`;
                    wrap.style.cssText = 'margin:10px 0;';
                    table = document.createElement('table');
                    table.id = tableId;
                    table.style.cssText = 'width:100%;border-collapse:collapse;';
                    table.appendChild(document.createElement('tbody'));
                    wrap.appendChild(table);
                    const hr = document.createElement('hr');
                    hr.className = 'separator';
                    hr.style.marginTop = '15px';
                    hr.style.marginBottom = '15px';
                    wrap.appendChild(hr);
                    const before = descr ? (descr.previousElementSibling || descr) : parent.firstChild;
                    parent.insertBefore(wrap, before || null);
                }
                const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                const rowId = `${id}-filelist-action-row`;
                let row = document.getElementById(rowId);
                if (!row) {
                    row = document.createElement('tr');
                    row.id = rowId;
                    const label = document.createElement('td');
                    label.textContent = labelText || id;
                    label.align = 'right';
                    label.style.cssText = 'width:80px;font-weight:bold;border:0px solid #0D8ED9;vertical-align:top;';
                    const holder = document.createElement('td');
                    holder.id = `${id}-filelist-action-holder`;
                    holder.align = 'left';
                    holder.style.cssText = 'padding-top:10px;padding-bottom:10px;padding-left:12px;border:0px solid #0D8ED9;vertical-align:top;';
                    row.append(label, holder);
                    tbody.appendChild(row);
                }
                return document.getElementById(`${id}-filelist-action-holder`) || row.cells[1];
            },
            actionTableHolder(tableId, id, labelText, anchor, mode = 'after', padding = '55px') {
                if (!anchor?.parentNode) return null;
                const wrapStyle = `display:block;text-align:left;width:auto;margin:0;padding-left:${padding};padding-right:${padding};`;
                let table = document.getElementById(tableId);
                if (!table) {
                    const wrap = document.createElement('div');
                    wrap.id = `${tableId}-wrap`;
                    wrap.style.cssText = wrapStyle;
                    table = document.createElement('table');
                    table.id = tableId;
                    table.style.cssText = 'margin:0;text-align:left;width:auto;';
                    table.appendChild(document.createElement('tbody'));
                    wrap.appendChild(table);
                    if (mode === 'prepend') anchor.prepend(wrap);
                    else if (mode === 'before') anchor.parentNode.insertBefore(wrap, anchor);
                    else anchor.after(wrap);
                } else {
                    const wrap = document.getElementById(`${tableId}-wrap`);
                    if (wrap) wrap.style.cssText = wrapStyle;
                    table.style.cssText = 'margin:0;text-align:left;width:auto;';
                }
                const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                const rowId = `${id}-${tableId}-row`;
                let row = document.getElementById(rowId);
                if (!row) {
                    row = document.createElement('tr');
                    row.id = rowId;
                    const label = row.insertCell(0);
                    label.textContent = labelText || id;
                    label.align = 'left';
                    label.style.fontWeight = 'bold';
                    const holder = row.insertCell(1);
                    holder.id = `${id}-${tableId}-holder`;
                    holder.align = 'left';
                    tbody.appendChild(row);
                }
                return document.getElementById(`${id}-${tableId}-holder`) || row.cells[1];
            },
            unit3dActionHolder(id, labelText, anchor) {
                const tableId = 'userscript-unit3d-actions';
                const ref = firstOf(Array.from(document.querySelectorAll('tr')).reverse(), tr => ['转发种子', '豆瓣信息'].includes(this.cellText(tr.cells?.[0])));
                let table = ref?.closest('table');
                if (!table) {
                    const holder = this.actionTableHolder(tableId, id, labelText, anchor, 'after', '0');
                    const label = holder?.previousElementSibling;
                    if (label) {
                        label.align = 'left';
                        label.style.cssText = 'font-weight: bold;';
                    }
                    return holder;
                }
                if (!table.id) table.id = `${tableId}-table`;
                const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                const rowId = `${id}-${tableId}-row`;
                let row = document.getElementById(rowId);
                if (!row) {
                    row = document.createElement('tr');
                    row.id = rowId;
                    const label = (ref?.cells?.[0] || document.createElement('td')).cloneNode(false);
                    label.textContent = labelText || id;
                    const holder = (ref?.cells?.[1] || document.createElement('td')).cloneNode(false);
                    holder.id = `${id}-${tableId}-holder`;
                    row.append(label, holder);
                    const rows = Array.from(tbody.querySelectorAll(`tr[id$="-${tableId}-row"]`));
                    (rows.at(-1) || ref || tbody.lastElementChild)?.after(row);
                    if (!row.parentNode) tbody.appendChild(row);
                }
                return document.getElementById(`${id}-${tableId}-holder`) || row.cells[1];
            },
            mTeamActionHolder(id, labelText) {
                const subtitleLabel = firstOf(document.querySelectorAll('label'), el => this.cellText(el) === '字幕');
                const anchorRow = subtitleLabel?.parentElement?.parentElement;
                if (!anchorRow?.parentNode) return null;
                const tableId = 'userscript-mteam-actions';
                let table = document.getElementById(tableId);
                if (!table) {
                    const wrap = document.createElement('div');
                    wrap.id = `${tableId}-wrap`;
                    wrap.style.cssText = 'padding-right:55px;';
                    table = document.createElement('table');
                    table.id = tableId;
                    table.appendChild(document.createElement('tbody'));
                    wrap.appendChild(table);
                    anchorRow.before(wrap);
                }
                const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                const rowId = `${id}-${tableId}-row`;
                let row = document.getElementById(rowId);
                if (!row) {
                    row = tbody.insertRow(-1);
                    row.id = rowId;
                    row.className = 'ant-descriptions-row';
                    const label = row.insertCell(0);
                    label.className = 'ant-descriptions-item-label';
                    label.style.cssText = 'width:135px;text-align:right;';
                    label.textContent = labelText || id;
                    const holder = row.insertCell(1);
                    holder.id = `${id}-${tableId}-holder`;
                    holder.className = 'ant-descriptions-item-content';
                    holder.style.cssText = 'text-align:left;';
                }
                return document.getElementById(`${id}-${tableId}-holder`) || row.cells[1];
            },
            hdSpaceMediaInfoRow() {
                const detailLabels = new Set(['豆瓣 (NaN)', '评分', '类型', '国家/地区', '导演', '语言', '上映日期', '片长', '演员', 'Year', 'Runtime', 'Country', 'Genre', 'Rating', 'Votes', 'Tagline', 'Plot', 'Cast']);
                const scopes = ['#douban_info table', '#imdb table', '#douban_info', '#imdb'];
                for (const selector of scopes) {
                    const root = document.querySelector(selector);
                    if (!root) continue;
                    let lastDetail = null;
                    for (const tr of root.querySelectorAll('tr')) {
                        const label = this.cellText(tr.cells?.[0]).replace(/[：:]$/, '');
                        if (detailLabels.has(label)) lastDetail = tr;
                    }
                    if (lastDetail) return root.closest('#mcol tr') || lastDetail;
                }
                return null;
            },
            hdSpaceTorrentRow() {
                for (const tr of document.querySelectorAll('#mcol tr')) {
                    if (this.cellText(tr.cells?.[0]) === 'Torrent') return tr;
                }
                return null;
            },
            hdSpaceInfoHashRow() {
                const rows = Array.from(document.querySelectorAll('#mcol tr'));
                let infoHash = null;
                let torrent = null;
                for (const tr of rows) {
                    const label = this.cellText(tr.cells?.[0]);
                    if (!infoHash && label === 'Info Hash') infoHash = tr;
                    if (!torrent && label === 'Torrent') torrent = tr;
                }
                return infoHash || torrent || this.rowAfterName(document.querySelector('#mcol'));
            },
            iptMovieInfoRow() {
                const rows = Array.from(document.querySelectorAll('tr'));
                let plot = null;
                let genre = null;
                for (const tr of rows) {
                    const label = this.cellText(tr.cells?.[0]);
                    if (!plot && label === 'Plot') plot = tr;
                    if (!genre && label === 'Genre') genre = tr;
                }
                const table = plot?.closest('table');
                let existing = null;
                if (table) {
                    for (const tr of table.querySelectorAll('tr')) {
                        if (['IYUU', 'MoviePilot'].includes(this.cellText(tr.cells?.[0]))) existing = tr;
                    }
                }
                return existing || plot || genre;
            }
        };

        return { DOM, Mount, SITE_FAMILIES, TORRENT_LINK_SELECTORS, needsDownloadForHash, tableMount, AutoFeedAnchors, AdapterRuntime, GazelleSites, GazellePicker };
    };
    // <pt-common:end>

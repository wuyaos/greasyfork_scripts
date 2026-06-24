    // <pt-common:start>
    const createPTCommon = ({
        defaultLabel,
        productId,
        gridLabelClass,
        gridContentClass
    }) => {
        const NS = 'pt-helper';
        const Native = {
            querySelector: Document.prototype.querySelector,
            querySelectorAll: Document.prototype.querySelectorAll,
            closest: Element.prototype.closest
        };
        const DOM = {
            ns: NS,
            productId,
            qs(selector, root = document) {
                try { return Native.querySelector.call(root, selector); } catch (_) { return null; }
            },
            qsa(selector, root = document) {
                try { return Array.from(Native.querySelectorAll.call(root, selector)); } catch (_) { return []; }
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
                label.style.cssText = 'display:inline-block;min-width:72px;font-weight:700;margin-right:8px;vertical-align:middle;';
                label.textContent = `${labelOf(m)}：`;
                contentNode.style.display = 'inline-flex';
                contentNode.style.alignItems = 'center';
                contentNode.style.flexWrap = 'wrap';
                contentNode.style.gap = contentNode.style.gap || '6px';
                contentNode.style.verticalAlign = 'middle';
                td.colSpan = m.colspan || Math.max(1, ...[...(table?.rows || [])].map(r => r.cells.length));
                td.style.paddingLeft = '12px';
                td.style.paddingTop = '10px';
                td.style.paddingBottom = '10px';
                td.append(label, contentNode);
                tr.appendChild(td);
                if (before && ref?.before) ref.before(tr);
                else if (ref?.after) ref.after(tr);
                else (m.target || document.body).after(tr);
                return tr;
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
            'greatposterwall': 'custom-gpw',
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

        return { DOM, Mount, SITE_FAMILIES, tableMount, AutoFeedAnchors, AdapterRuntime };
    };
    // <pt-common:end>

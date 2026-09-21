import { COLORS, SCRIPT_NAME, log, normalizeSiteKey } from './config.js';
import { HTTP } from './http.js';

import { firstOf } from '../../common/first-match.js';

import { Config } from './settings.js';

import { UI } from './ui.js';

import { AdapterRuntime, GazellePicker, GazelleSites, PTDOM, SITE_FAMILIES } from './page-tools.js';

import { SiteIndex } from './site-index.js';

import { InfoHash } from './infohash.js';

import { IYUU } from './iyuu-api.js';

import { Fallback } from './fallback.js';

import { ResultCache } from './cache.js';

import { Helpers } from './torrent-fields.js';

import { ADAPTERS } from './adapters.js';



const Core = {
        adapter: null,
        async init() {
            this.adapter = firstOf(ADAPTERS, a => a.matches());
            if (this.adapter?.findMount) return this.injectLazy(this.adapter);
            const info = await this.adapter?.getInfo();
            if (info?.name) return this.inject(info);
            return false;
        },
        setQueryButton(btn, status, title = '') {
            btn.textContent = UI.actionText('查询', status);
            if (title) btn.title = title;
        },
        async checkOrPick(box, btn, info) {
            if (info.extra?.groupMode === false) {
                await this.check(box, btn, info);
                return;
            }
            const liveEntries = GazelleSites.gpwMatches() ? GazelleSites.gazelleEntries() : (GazelleSites.haidanMatches() ? GazelleSites.haidanEntries() : []);
            const liveInfo = liveEntries.length > 1
                ? { ...info, extra: { ...(info.extra || {}), groupMode: true, entries: liveEntries, groupTitle: info.extra?.groupTitle || info.name, currentTid: info.extra?.tid || '' } }
                : info;
            box._iyuuLastInfo = liveInfo;
            if (liveInfo.extra?.groupMode) {
                this.showPicker(box, btn, liveInfo);
                return;
            }
            await this.check(box, btn, liveInfo);
        },
        injectLazy(adapter) {
            const mount = adapter?.findMount?.();
            if (!mount?.target) return false;
            const siteId = AdapterRuntime.siteId(adapter);
            const existing = PTDOM.qs(PTDOM.productRootSelector(siteId)) || PTDOM.qs(PTDOM.productRootSelector(''));
            const box = existing || document.createElement('div');
            box.className = box.className || 'iyuu-row-box pt-helper-root pt-helper-root-iyuu';
            if (!box.classList.contains('pt-helper-root')) box.classList.add('pt-helper-root', 'pt-helper-root-iyuu');
            AdapterRuntime.mountRoot(adapter, mount, box, 'lazy-button');
            let btn = box.querySelector('.iyuu-check-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'iyuu-btn iyuu-check-btn';
                box.replaceChildren(btn);
            }
            if (!box.querySelector('.iyuu-multi-toggle')) {
                const multi = document.createElement('label');
                multi.className = 'iyuu-chip iyuu-site-choice';
                const multiInput = document.createElement('input');
                multiInput.type = 'checkbox';
                multiInput.className = 'iyuu-multi-toggle';
                multi.append(multiInput, document.createTextNode('多选'));
                multiInput.onchange = e => {
                    e.stopPropagation();
                    box.querySelectorAll('.iyuu-result').forEach(n => n.remove());
                    if (box._iyuuResult && box._iyuuLastInfo) this.render(box, btn, box._iyuuResult, box._iyuuLastInfo, box._iyuuCached);
                };
                box.appendChild(multi);
            }
            this.setQueryButton(btn, '未查询', '配置请从 Tampermonkey 菜单打开「配置 IYUU」');
            btn.onclick = async e => {
                e.preventDefault();
                e.stopPropagation();
                if (adapter.id === 'm-team' && !Config.mteamKey) {
                    this.setQueryButton(btn, '需配置 M-Team API Key', '请在 IYUU 配置中填写 M-Team API Key');
                    UI.toast('请先配置 M-Team API Key');
                    UI.showConfig();
                    return;
                }
                try {
                    if (box._iyuuLastInfo?.extra?.groupMode === false) {
                        await this.checkOrPick(box, btn, box._iyuuLastInfo);
                        return;
                    }
                    const info = await adapter.getInfo(mount);
                    if (!info?.name) {
                        this.setQueryButton(btn, '失败', '未能获取种子信息');
                        UI.toast('未能获取种子信息');
                        return;
                    }
                    await this.checkOrPick(box, btn, { ...info, mount });
                } catch (e) {
                    const message = e?.message || '查询失败';
                    this.setQueryButton(btn, '失败', message);
                    UI.toast(`查询失败：${message}`);
                }
            };
            this.restoreLazy(box, btn, adapter, mount);
            return true;
        },
        async restoreLazy(box, btn, adapter, mount) {
            try {
                const info = await adapter.getInfo(mount);
                if (!info?.name) return;
                box._iyuuLastInfo = { ...info, mount };
                if (info.extra?.groupMode) {
                    const entries = info.extra?.entries || [];
                    const params = new URLSearchParams(location.search);
                    const currentTid = info.extra?.currentTid || params.get('torrentid') || params.get('torrent_id') || '';
                    const candidates = currentTid ? entries.filter(e => String(e?.tid || '') === String(currentTid)) : [];
                    for (const entry of candidates) {
                        if (!entry?.downloadLink) continue;
                        const entryInfo = this.pickedInfoFromEntry(info, entry, mount);
                        const pageCached = ResultCache.getPage(entryInfo);
                        if (!pageCached) continue;
                        await this.injectCurrentSite(pageCached, entryInfo);
                        box._iyuuLastInfo = entryInfo;
                        btn.dataset.done = '1';
                        this.render(box, btn, pageCached, entryInfo, true);
                        return;
                    }
                    return;
                }
                await this.restore(box, btn, box._iyuuLastInfo, adapter.id === 'm-team' ? false : Config.autoQuery);
            } catch (e) {
                log('lazy restore skipped', e?.message || e);
            }
        },
        pickedInfoFromEntry(info, entry, mount) {
            const groupTitle = info.extra?.groupTitle || info.name;
            return {
                id: info.id,
                name: entry?.title || entry?.actualName || groupTitle || info?.name,
                description: entry?.detail || entry?.title || info.description || info.name,
                downloadLink: entry?.downloadLink || '',
                size: entry?.sizeBytes || Helpers.size(entry?.size || ''),
                mount: mount || info.mount,
                extra: { ...(info.extra || {}), groupMode: false, tid: entry?.tid, title: entry?.title || '', actualName: entry?.actualName || '', groupTitle, explicitHash: entry?.explicitHash || '', needsToken: entry?.needsToken === true, flLink: entry?.flLink || '', entries: info.extra?.entries || [] }
            };
        },
        async pickedInfoWithActualName(info, entry, mount) {
            const groupTitle = info.extra?.groupTitle || info.name;
            const actualName = entry?.actualName || (GazelleSites.isHaidanHost() ? await GazelleSites.haidanActualName(entry?.tid) : '');
            return {
                id: info.id,
                name: actualName || entry?.title || groupTitle || info?.name,
                description: entry?.detail || entry?.title || info.description || info.name,
                downloadLink: entry?.downloadLink || '',
                size: entry?.sizeBytes || Helpers.size(entry?.size || ''),
                mount: mount || info.mount,
                extra: { ...(info.extra || {}), groupMode: false, tid: entry?.tid, title: entry?.title || '', actualName, groupTitle, explicitHash: entry?.explicitHash || '', needsToken: entry?.needsToken === true, flLink: entry?.flLink || '', entries: info.extra?.entries || [] }
            };
        },
        inject(info) {
            const existing = PTDOM.qs(PTDOM.productRootSelector(info.id || '')) || PTDOM.qs(PTDOM.productRootSelector(''));
            if (existing) {
                AdapterRuntime.mountRoot({ id: info.id || '' }, info.mount, existing, info.mount?.type || '');
                return true;
            }
            const box = document.createElement('div'); box.className = 'iyuu-row-box pt-helper-root pt-helper-root-iyuu';
            const btn = document.createElement('button'); btn.className = 'iyuu-btn iyuu-check-btn'; this.setQueryButton(btn, '未查询', '配置请从 Tampermonkey 菜单打开「配置 IYUU」'); btn.onclick = async e => { e.preventDefault(); e.stopPropagation(); try { await this.checkOrPick(box, btn, box._iyuuLastInfo?.extra?.groupMode === false ? box._iyuuLastInfo : info); } catch (err) { const message = err?.message || '查询失败'; this.setQueryButton(btn, '失败', message); UI.toast(`查询失败：${message}`); } };
            const multi = document.createElement('label'); multi.className = 'iyuu-chip iyuu-site-choice'; const multiInput = document.createElement('input'); multiInput.type = 'checkbox'; multiInput.className = 'iyuu-multi-toggle'; multi.append(multiInput, document.createTextNode('多选'));
            multiInput.onchange = e => { e.stopPropagation(); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); if (box._iyuuResult) this.render(box, btn, box._iyuuResult, info, box._iyuuCached); };
            box.append(btn, multi); AdapterRuntime.mountRoot({ id: info.id || '' }, info.mount, box, info.mount?.type || '');
            this.restore(box, btn, info, Config.autoQuery);
            return true;
        },
        showPicker(box, btn, info) {
            const entries = info.extra?.entries || [];
            box.querySelectorAll('.iyuu-picker,.iyuu-result,.iyuu-error').forEach(n => n.remove());
            document.querySelectorAll('.pt-gazelle-picker').forEach(n => n.remove());
            if (!entries.length) { UI.toast('未找到可选择的种子条目'); return; }
            const panel = GazellePicker.buildPanel({
                title: `选择种子（共 ${entries.length} 个）`,
                rows: entries,
                actionLabel: '选择并查询',
                onAction: async (entry, actionBtn) => {
                    actionBtn.disabled = true;
                    actionBtn.textContent = '读取中…';
                    const pickedInfo = await this.pickedInfoWithActualName(info, entry, info.mount);
                    box._iyuuLastInfo = pickedInfo;
                    actionBtn.closest('.pt-gazelle-picker')?.remove();
                    this.check(box, btn, pickedInfo);
                }
            });
            document.body.appendChild(panel);
        },
        async restore(box, btn, info, auto = false) {
            if (info.extra?.groupMode) return;
            try {
                const pageCached = ResultCache.getPage(info);
                if (pageCached) {
                    await this.injectCurrentSite(pageCached, info);
                    btn.dataset.done = '1';
                    this.render(box, btn, pageCached, info, true);
                    return;
                }
                if (!auto) return;
                const hash = await InfoHash.extract(info);
                if (!hash) return;
                const cached = ResultCache.get(hash);
                if (cached) {
                    await this.injectCurrentSite(cached, info);
                    btn.dataset.done = '1';
                    this.render(box, btn, cached, info, true);
                    ResultCache.set(hash, cached, info);
                    return;
                }
                if (!btn.disabled) this.check(box, btn, info);
            } catch (e) {
                log('restore skipped', e?.message || e);
            }
        },
        openTab(url) { if (!url) { UI.toast('未找到链接'); return; } if (typeof GM_openInTab === 'function') GM_openInTab(url, { active: false, insert: true }); else window.open(url, '_blank', 'noopener'); },
        download(url) {
            if (!url) { UI.toast('未找到下载链接'); return; }
            if (url.startsWith('magnet:')) { UI.toast('磁力链接，已在新标签打开'); this.openTab(url); return; }
            if (SiteIndex.isLikelyDetailUrl(url)) { UI.toast('该站点缺少下载链接，已打开详情页'); this.openTab(url); return; }
            try { const a = document.createElement('a'); a.href = url; a.download = (url.split('/').pop() || 'download').split('?')[0] || 'download.torrent'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { UI.toast(`下载失败：${e.message}，改为打开链接`); this.openTab(url); }
        },
        async resolveDownloadUrl(site) {
            if (!SiteIndex.isMTeam(site)) return SiteIndex.bestDownloadUrl(site);
            if (!Config.mteamKey) throw new Error('未配置 M-Team API Key，无法下载馒头种子');
            const id = site.torrentId || String(site.url || '').match(/\/detail\/(\d+)/)?.[1] || String(site.downloadUrl || '').match(/[?&](?:id|tid)=(\d+)/)?.[1];
            if (!id) throw new Error(`${site.name || '馒头'} 缺少种子 ID`);
            const res = await HTTP.request({ method: 'POST', url: SiteIndex.mTeamApi(), data: `id=${encodeURIComponent(id)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-key': Config.mteamKey }, responseType: 'json' });
            const link = res?.data || res?.url || res?.download_url || '';
            if (!link) throw new Error(res?.message || res?.msg || '获取馒头下载链接失败');
            return SiteIndex.isLikelyDetailUrl(link) ? '' : link;
        },
        async downloadSelected(selected) {
            const sites = [...selected];
            if (!sites.length) { UI.toast('未勾选可下载站点'); return; }
            try {
                const urls = [];
                const missing = [];
                for (const site of sites) { const url = await this.resolveDownloadUrl(site); if (url) urls.push(url); else missing.push(SiteIndex.name(site)); }
                if (!urls.length) { UI.toast(missing.length ? `${missing.join('、')} 缺少下载链接` : '选中站点缺少下载链接'); return; }
                if (missing.length) UI.toast(`${missing.join('、')} 缺少下载链接，已跳过`);
                if (urls.length === 1) { this.download(urls[0]); UI.toast('已触发下载 1 个站点种子'); return; }
                urls.forEach((url, i) => setTimeout(() => this.openTab(url), i * 500)); UI.toast(`已分批打开 ${urls.length} 个站点下载链接`);
            } catch (e) { UI.toast(e?.message || '下载失败'); }
        },
        async check(box, btn, info) {
            const force = btn.dataset.done === '1';
            btn.disabled = true;
            this.setQueryButton(btn, '查询中');
            btn.dataset.done = '';
            box.querySelectorAll('.iyuu-result,.iyuu-error').forEach(n => n.remove());
            try {
                const pageCached = force ? null : ResultCache.getPage(info);
                if (pageCached) { await this.injectCurrentSite(pageCached, info); btn.dataset.done = '1'; this.render(box, btn, pageCached, info, true); return; }
                const hash = await InfoHash.extract(info);
                if (!hash) throw new Error(info.extra?.gazelleSkipped ? '需开启 FL（消耗令牌）' : '未找到 Hash');
                const cached = force ? null : ResultCache.get(hash);
                const result = cached || await this.fetch(hash);
                if (!cached && result?.sites?.length) await this.enrichHaidanGroupId(result.sites);
                this.injectCurrentSite(result, info);
                if (result?.sites?.length) ResultCache.set(hash, result, info);
                btn.dataset.done = '1';
                this.render(box, btn, result, info, Boolean(cached));
            } catch (e) {
                const gazelleSkipped = Boolean(info.extra?.gazelleSkipped);
                const message = e.message || '查询失败';
                console.warn(`[${SCRIPT_NAME}] 查询失败`, { message, gazelleSkipped, info: { id: info.id, name: info.name, extra: info.extra, downloadLink: info.downloadLink } });
                this.setQueryButton(btn, gazelleSkipped ? '需开启 FL（消耗令牌）' : '失败', message);
                const err = UI.tag(message, COLORS.warn);
                err.classList.add('iyuu-error');
                box.appendChild(err);
                UI.toast(`查询失败：${message}`);
            } finally { btn.disabled = false; }
        },
        siteKeys(s) {
            const keys = new Set();
            const add = (type, value) => { const v = String(value || '').trim().toLowerCase(); if (v) keys.add(`${type}:${v}`); };
            const sid = String(s.sid || '').trim();
            if (sid && !sid.startsWith('fallback-')) add('sid', sid);
            const hosts = [
                s.host,
                SiteIndex.host(s),
                SiteIndex.host({ url: s.url }),
                SiteIndex.host({ url: s.downloadUrl }),
                SiteIndex.host({ url: SiteIndex.autoFeedUrl(s) })
            ].filter(Boolean);
            hosts.forEach(host => add('host', host));
            const nameKey = normalizeSiteKey(s.name);
            if (nameKey) add('name', nameKey);
            if (!keys.size) add('url', s.url || s.downloadUrl);
            return [...keys];
        },
        mergeSites(list) {
            const items = [];
            const keyToIndex = new Map();
            (list || []).forEach(s => {
                const keys = this.siteKeys(s);
                if (!keys.length) return;
                const index = firstOf(keys.map(k => keyToIndex.get(k)), i => i !== undefined);
                if (index === undefined) {
                    const nextIndex = items.length;
                    items.push(s);
                    keys.forEach(k => keyToIndex.set(k, nextIndex));
                    return;
                }
                const old = items[index];
                old.count = Math.max(Number(old.count || 1), Number(s.count || 1));
                if (!old.host && s.host) old.host = s.host;
                if ((!old.url || SiteIndex.isHomepageUrl(old.url)) && s.url && !SiteIndex.isHomepageUrl(s.url)) old.url = s.url;
                if (!old.downloadUrl && s.downloadUrl) old.downloadUrl = s.downloadUrl;
                if (!old.torrentId && s.torrentId) old.torrentId = s.torrentId;
                if (!old.icon && s.icon) old.icon = s.icon;
                keys.forEach(k => keyToIndex.set(k, index));
            });
            return items;
        },
        async injectCurrentSite(result, info) {
            if (!result || !Array.isArray(result.sites) || !info) return;
            const list = await SiteIndex.get(false).catch(() => []);
            const sid = SiteIndex.currentSid(list);
            const currentHost = location.hostname.replace(/^www\./, '').toLowerCase();
            const isCurrent = s => (sid && sid === String(s?.sid || '')) || (s?.host && SiteIndex.sameHost(currentHost, s.host));
            let matched = false;
            result.sites = result.sites.map(s => {
                if (s?.source === 'current' && !isCurrent(s)) return { ...s, source: (s._origSource || 'iyuu') };
                if (isCurrent(s)) { matched = true; return { ...s, _origSource: s._origSource || (s.source === 'current' ? 'iyuu' : s.source), source: 'current' }; }
                return s;
            });
            if (!matched) {
                result.sites = [...result.sites, {
                    source: 'current', _origSource: 'current',
                    sid: sid || 'current',
                    name: info.name || SiteIndex.name({ id: sid }) || location.hostname,
                    host: currentHost,
                    torrentId: info.extra?.tid || '',
                    icon: [], count: 1,
                    url: location.href,
                    downloadUrl: ''
                }];
            }
        },
        visibleSites(sites) {
            const currentHost = location.hostname.replace(/^www\./, '').toLowerCase();
            return (sites || []).filter(s => {
                if (s?.source === 'current') return false;
                if (s?.host && SiteIndex.sameHost(currentHost, s.host)) return false;
                return true;
            });
        },
        sourceLabel(result, cached) {
            const iyuuOk = (result.sources || []).some(s => s?.source === 'iyuu' && s?.ok !== false && (s?.sites || []).length);
            const zmptOk = (result.sources || []).some(s => s?.source === 'fallback' && s?.ok && (s?.sites || []).length);
            const srcLabel = iyuuOk ? 'IYUU' : (zmptOk ? 'ZMPT' : '');
            return srcLabel ? `${srcLabel}${cached ? ' 缓存' : ''}` : '';
        },
        sourceErrors(result) {
            const parts = (result.sources || []).filter(s => (s?.ok === false && s?.error) || (s?.source === 'fallback' && s?.ok === true && !(s?.sites || []).length))
                .map(s => s?.source === 'fallback' && s?.ok === true ? '无结果（ZMPT）' : `${s.error}（${s.source === 'iyuu' ? 'IYUU' : (s.source === 'fallback' ? 'ZMPT' : s.source)}）`);
            return parts.length ? [parts.join(' | ')] : [];
        },
        async fetch(hash) {
            log('fetch sources', { hash, iyuu: Boolean(Config.token), fallback: Config.zmpt });
            const sources = [];
            const iyuuResult = Config.token
                ? await IYUU.query(hash).catch(e => ({ ok: false, source: 'iyuu', error: e?.message || 'IYUU 查询失败', sites: [] }))
                : { ok: false, source: 'iyuu', error: '未配置 IYUU Token', sites: [] };
            sources.push(iyuuResult);
            if (iyuuResult.ok && (iyuuResult.sites || []).length) {
                return { hash, sources, sites: this.mergeSites(iyuuResult.sites), partial: false };
            }
            if (Config.zmpt) {
                const zmptResult = await Fallback.query(hash).catch(e => ({ ok: false, source: 'fallback', error: e?.message || 'ZMPT 查询失败', sites: [] }));
                sources.push(zmptResult);
            }
            const allSites = sources.flatMap(s => s.sites || []);
            const sites = this.mergeSites(allSites);
            const partial = Boolean(sites.length && iyuuResult.ok === false && iyuuResult.error);
            log('fetch result sources', sources);
            return { hash, sources, sites, partial };
        },
        async enrichHaidanGroupId(sites) {
            // haidan 辅种跳转链 group_id 常为空，跨站 fetch details.php?torrent_id={tid} 补全真实 group_id
            const targets = (sites || []).filter(s => {
                const host = SiteIndex.host(s) || '';
                if (!/(^|\.)haidan\.(cc|video)$/i.test(host)) return false;
                const u = String(s.url || '');
                return /\/details\.php/.test(u) && !/[?&]group_id=(\d+)/.test(u);
            });
            if (!targets.length) return;
            await Promise.all(targets.map(async s => {
                const tid = s.torrentId || String(s.url || '').match(/[?&](?:torrent_id|id)=(\d+)/)?.[1] || '';
                if (!tid) return;
                const gid = await GazelleSites.haidanResolveGroupId(tid, {
                    origin: 'https://www.haidan.cc',
                    fetcher: url => HTTP.request({ url, responseType: 'text' }).catch(() => '')
                });
                if (gid) s.url = GazelleSites.rebuildHaidanDetailUrl(s.url, gid, tid);
            }));
        },
        render(box, btn, result, info, cached = false) {
            if (box._iyuuResult !== result) box._iyuuSelected = new Set(result.sites);
            box._iyuuResult = result; box._iyuuCached = cached;
            box.querySelectorAll('.iyuu-result').forEach(n => n.remove());
            const wrap = document.createElement('span'); wrap.className = 'iyuu-result iyuu-row-box';
            const visible = this.visibleSites(result.sites);
            const selected = box._iyuuSelected || new Set(result.sites); const multi = Boolean(box.querySelector('.iyuu-multi-toggle')?.checked); const primary = firstOf(result.sources, s => s.source === 'iyuu'); const hasSites = Boolean(visible.length); const primaryError = primary?.ok === false && primary.error ? primary.error : ''; const srcErrors = this.sourceErrors(result);
            if (hasSites && primaryError) console.warn(`[${SCRIPT_NAME}] IYUU 主源失败（已用兜底结果）：${primaryError}`);
            this.setQueryButton(btn, hasSites ? `${visible.length}站${cached ? ' 缓存' : ''}` : '失败', srcErrors[0] || '重新查询');
            const srcLabel = this.sourceLabel(result, cached);
            if (srcLabel) wrap.append(UI.tag(srcLabel, COLORS.info));
            srcErrors.forEach(msg => wrap.append(UI.tag(msg, COLORS.warn)));
            if (!visible.length && !srcErrors.length) wrap.append(UI.tag('暂无辅种', COLORS.info));
            const isGazelleSite = ['greatposterwall', 'haidan'].includes(info.id) || /gazelle|gpw/i.test(SITE_FAMILIES[info.id] || SITE_FAMILIES[location.hostname.replace(/^www\./, '')] || '');
            const pickedLabel = isGazelleSite ? (info.extra?.actualName || info.extra?.title || info.name || (info.extra?.tid ? `tid=${info.extra?.tid}` : '')) : '';
            if (info.extra?.groupMode === false && (info.extra?.entries || []).length > 1) {
                const reselect = document.createElement('button');
                reselect.className = 'iyuu-btn';
                reselect.textContent = '重选种子';
                reselect.onclick = e => { e.preventDefault(); e.stopPropagation(); this.showPicker(box, btn, { ...info, extra: { ...(info.extra || {}), groupMode: true } }); };
                wrap.append(reselect);
            }
            visible.forEach(s => wrap.append(UI.siteChip(s, selected, multi)));
            this.renderMultiActions(wrap, box, btn, result, info, cached, selected, visible);
            box.appendChild(wrap);
            if (pickedLabel) {
                const entries = info.extra?.entries || [];
                const entryIdx = entries.length > 1 ? (entries.findIndex(e => String(e?.tid) === String(info.extra?.tid)) + 1) : 0;
                const seedDiv = document.createElement('div');
                seedDiv.style.cssText = 'flex-basis:100%;width:100%;margin-top:6px;padding-top:4px;border-top:1px dashed #dfe4ea;font-size:11px;color:#94a3b8;line-height:1.4;text-align:left;';
                seedDiv.textContent = entryIdx > 0 ? `第 ${entryIdx} 个种子：${pickedLabel}` : `种子：${pickedLabel}`;
                seedDiv.title = `当前缓存对应的种子：${pickedLabel}`;
                box.appendChild(seedDiv);
            }
        },
        renderMultiActions(wrap, box, btn, result, info, cached, selected, visible) {
            if (!box.querySelector('.iyuu-multi-toggle')?.checked || !visible.length) return;
            const all = document.createElement('button'); all.className = 'iyuu-btn'; all.textContent = '全选';
            all.onclick = e => { e.preventDefault(); e.stopPropagation(); visible.forEach(s => selected.add(s)); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); this.render(box, btn, result, info, cached); };
            const none = document.createElement('button'); none.className = 'iyuu-btn'; none.textContent = '清空';
            none.onclick = e => { e.preventDefault(); e.stopPropagation(); selected.clear(); box.querySelectorAll('.iyuu-result').forEach(n => n.remove()); this.render(box, btn, result, info, cached); };
            const dl = document.createElement('button'); dl.className = 'iyuu-btn'; dl.textContent = '下载种子';
            dl.onclick = e => { e.preventDefault(); e.stopPropagation(); this.downloadSelected(selected); };
            const open = document.createElement('button'); open.className = 'iyuu-btn'; open.textContent = '打开选中';
            open.onclick = e => { e.preventDefault(); e.stopPropagation(); const urls = [...selected].filter(s => s.url); if (!urls.length) { UI.toast('未勾选可跳转站点'); return; } urls.forEach(s => this.openTab(s.url)); UI.toast(`已打开 ${urls.length} 个站点`); };
            wrap.append(all, none, dl, open);
        }
    };



export { Core };

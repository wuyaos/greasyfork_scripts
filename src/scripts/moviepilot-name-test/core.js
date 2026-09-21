import { CONSTANTS, SCRIPT_NAME } from './config.js';

import { CONFIG } from './settings.js';

import { UI } from './ui.js';

import { AdapterRuntime, GazellePicker, GazelleSites, Mount, PTDOM, SITE_FAMILIES } from './page-tools.js';

import { API } from './api.js';

import { BT_SITE_HELPERS } from './bt-pages.js';

import { Site } from './site.js';

import { UTILS } from './media-formatting.js';

import { Cache } from './cache.js';



const Core = {
        async handlePage() {
            try {
                if (Site.adapter?.findMount && this.renderLazyEntry(Site.adapter)) {
                    return true;
                }
                const torrentInfoList = await Site.getTorrentInfo();
                if (!torrentInfoList || torrentInfoList.length === 0) {
                    GM_log(`[${SCRIPT_NAME}] Could not extract torrent info.`);
                    return false;
                }
                GM_log(`[${SCRIPT_NAME}] 匹配到 ${torrentInfoList.length} 条种子信息`);
                for (const torrentInfo of torrentInfoList) {
                    if (!torrentInfo || !torrentInfo.name) continue;
                    this._processOneTorrent(torrentInfo);
                }
                return Boolean(document.querySelector('.mp-recognize-trigger'));
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Core handlePage failed`, error?.stack || error?.message || error);
                return false;
            }
        },

        renderLazyEntry(adapter) {
            const mount = adapter?.findMount?.();
            if (!mount?.target) return false;
            const siteId = AdapterRuntime.siteId(adapter);
            const existing = PTDOM.qs(PTDOM.productRootSelector(siteId)) || PTDOM.qs(PTDOM.productRootSelector(''));
            const container = existing || document.createElement('div');
            container.className = container.className || 'mp-row-box pt-helper-root pt-helper-root-mp';
            if (!container.classList.contains('pt-helper-root')) container.classList.add('pt-helper-root', 'pt-helper-root-mp');
            AdapterRuntime.mountRoot(adapter, mount, container, 'lazy-button');
            const button = UI.renderActionButton('识别', '待识别', CONSTANTS.COLORS.SECONDARY, 'idle');
            container.innerHTML = `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">${button}</div>`;
            const trigger = container.querySelector('.mp-recognize-trigger');
            if (trigger) {
                trigger.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (adapter.id === 'm-team' && !CONFIG.get('mteamApiKey')) {
                        trigger.textContent = '识别（需配置 M-Team API Key）';
                        trigger.setAttribute('data-state', 'error');
                        trigger.style.backgroundColor = CONSTANTS.COLORS.WARNING;
                        trigger.style.borderColor = CONSTANTS.COLORS.WARNING;
                        trigger.title = '请在 MoviePilot 配置中填写 M-Team API Key';
                        UI.showToast('请先配置 M-Team API Key');
                        UI.showConfigModal(false);
                        return;
                    }
                    try {
                        const torrentInfo = await adapter.getInfo(mount);
                        if (!torrentInfo?.name) throw new Error('未能获取种子信息');
                        this.startOrPick(container, torrentInfo);
                    } catch (error) {
                        trigger.textContent = `识别（${error?.message || '失败'}）`;
                        trigger.setAttribute('data-state', 'error');
                        trigger.style.backgroundColor = CONSTANTS.COLORS.WARNING;
                        trigger.style.borderColor = CONSTANTS.COLORS.WARNING;
                        UI.showToast(error?.message || '识别失败');
                    }
                };
            }
            this.restoreLazyEntry(container, adapter, mount);
            return true;
        },

        async restoreLazyEntry(container, adapter, mount) {
            if (adapter.id === 'm-team') return;
            try {
                const torrentInfo = await adapter.getInfo(mount);
                if (!torrentInfo?.name) return;
                if (torrentInfo.extra?.groupMode) {
                    const entries = torrentInfo.extra?.entries || [];
                    for (const entry of entries) {
                        const pickedInfo = this.pickedInfoFromEntry(torrentInfo, entry, mount);
                        const cached = Cache.get(pickedInfo);
                        if (!cached?.media_info) continue;
                        GM_log(`[${SCRIPT_NAME}] 命中识别缓存: ${pickedInfo.name}`);
                        this.renderSuccess(container, cached, pickedInfo);
                        return;
                    }
                    return;
                }
                const cached = Cache.get(torrentInfo);
                if (cached && cached.media_info) {
                    GM_log(`[${SCRIPT_NAME}] 命中识别缓存: ${torrentInfo.name}`);
                    this.renderSuccess(container, cached, torrentInfo);
                    return;
                }
                if (CONFIG.get('autoQuery')) {
                    setTimeout(() => {
                        const trigger = container.querySelector('.mp-recognize-trigger');
                        if (!trigger || trigger.getAttribute('data-state') === 'running') return;
                        if (container.querySelector('.mp-download-button')) return;
                        this.startRecognition(container, torrentInfo);
                    }, 300);
                }
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Lazy restore skipped: ${adapter.id}`, error?.stack || error?.message || error);
            }
        },

        pickedInfoFromEntry(torrentInfo, entry, mount) {
            const groupTitle = torrentInfo.extra?.groupTitle || torrentInfo.name;
            return {
                name: entry?.title || entry?.actualName || groupTitle || torrentInfo?.name,
                description: entry?.detail || entry?.title || entry?.format || torrentInfo.description || groupTitle,
                downloadLink: entry?.downloadLink || '',
                size: entry?.sizeBytes || BT_SITE_HELPERS.findSize(entry?.size || ''),
                mount: mount || torrentInfo.mount,
                extra: { ...(torrentInfo.extra || {}), groupMode: false, tid: entry?.tid, title: entry?.title || '', actualName: entry?.actualName || '', groupTitle, explicitHash: entry?.explicitHash || '', needsToken: entry?.needsToken === true, flLink: entry?.flLink || '', entries: torrentInfo.extra?.entries || [] }
            };
        },

        async pickedInfoWithActualName(torrentInfo, entry, mount) {
            const groupTitle = torrentInfo.extra?.groupTitle || torrentInfo.name;
            const actualName = entry?.actualName || (GazelleSites.isHaidanHost() ? await GazelleSites.haidanActualName(entry?.tid) : '');
            return {
                name: actualName || entry?.title || groupTitle || torrentInfo?.name,
                description: entry?.detail || entry?.title || entry?.format || torrentInfo.description || groupTitle,
                downloadLink: entry?.downloadLink || '',
                size: entry?.sizeBytes || BT_SITE_HELPERS.findSize(entry?.size || ''),
                mount: mount || torrentInfo.mount,
                extra: { ...(torrentInfo.extra || {}), groupMode: false, tid: entry?.tid, title: entry?.title || '', actualName, groupTitle, explicitHash: entry?.explicitHash || '', needsToken: entry?.needsToken === true, flLink: entry?.flLink || '', entries: torrentInfo.extra?.entries || [] }
            };
        },

        _processOneTorrent(torrentInfo) {
            try {
                const { name, description, downloadLink, size, extra = {} } = torrentInfo;
                const siteId = Site.adapter?.id || '';
                const existing = siteId === 'm-team' ? (PTDOM.qs(PTDOM.productRootSelector(siteId)) || PTDOM.qs(PTDOM.productRootSelector(''))) : null;
                const container = existing || document.createElement('div');
                container.className = container.className || 'mp-row-box pt-helper-root pt-helper-root-mp';
                if (!container.classList.contains('pt-helper-root')) container.classList.add('pt-helper-root', 'pt-helper-root-mp');
                AdapterRuntime.mountRoot({ id: siteId }, torrentInfo.mount || Mount.prepend(), container, torrentInfo.mount?.type || '');
                if (container.parentElement?.querySelectorAll?.('.mp-recognize-trigger').length > 1) { container.remove(); return; }

                const torrentData = {
                    name,
                    description,
                    downloadLink,
                    size,
                    _bangumiId: extra.bangumiId || torrentInfo._bangumiId,
                    extra
                };

                // 检查缓存：有则直接渲染成功结果，无则显示手动入口
                const cached = Cache.get(torrentData);
                if (cached && cached.media_info) {
                    GM_log(`[${SCRIPT_NAME}] 命中识别缓存: ${name}`);
                    this.renderSuccess(container, cached, torrentData);
                } else {
                    this.renderManualEntry(container, torrentData);
                    if (CONFIG.get('autoQuery')) setTimeout(() => this.startRecognition(container, torrentData), 300);
                }
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Process torrent failed: ${torrentInfo?.name || ''}`, error?.stack || error?.message || error);
            }
        },

        renderGroupPicker(container, torrentInfo) {
            const entries = torrentInfo.extra?.entries || [];
            if (!entries.length) {
                UI.showToast('未找到可选择的种子条目');
                return;
            }
            const title = torrentInfo.extra?.groupTitle || torrentInfo.name;
            const panel = GazellePicker.buildPanel({
                title: `选择种子（共 ${entries.length} 个）`,
                rows: entries,
                actionLabel: '选择并识别',
                onAction: async (entry, btn) => {
                    btn.disabled = true;
                    btn.textContent = '读取中…';
                    btn.closest('.pt-gazelle-picker')?.remove();
                    const pickedInfo = await this.pickedInfoWithActualName(torrentInfo, entry, torrentInfo.mount);
                    this.renderManualEntry(container, pickedInfo, 'running', '识别中');
                    this.startRecognition(container, pickedInfo);
                }
            });
            document.body.appendChild(panel);
        },

        renderManualEntry(container, torrentInfo, state = 'idle', message = '待识别') {
            const containerStyle = `display: flex; align-items: center; gap: 5px; flex-wrap: wrap;`;
            const isRunning = state === 'running';
            const tagColor = state === 'error' ? CONSTANTS.COLORS.WARNING : (isRunning ? CONSTANTS.COLORS.PRIMARY : CONSTANTS.COLORS.SECONDARY);
            const status = state === 'error' ? '失败' : (isRunning ? '识别中' : message);
            const title = state === 'error' ? message : '';
            const manualTag = UI.renderActionButton('识别', status, tagColor, state, title);
            const reselect = torrentInfo.extra?.groupMode === false && (torrentInfo.extra?.entries || []).length > 1
                ? `<button type="button" class="mp-reselect-torrent" style="background-color:${CONSTANTS.COLORS.SECONDARY}; color:white; border:none; border-radius:4px; font:inherit; line-height:1.45; font-weight:600; cursor:pointer; padding:.12em .6em;">重选种子</button>`
                : '';

            container.innerHTML = `<div style="${containerStyle}">${manualTag}${reselect}</div>`;
            this.attachRecognizeTrigger(container, torrentInfo);
            this.attachReselectTrigger(container, torrentInfo);
        },

        attachReselectTrigger(container, torrentInfo) {
            const trigger = container.querySelector('.mp-reselect-torrent');
            if (!trigger) return;
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.renderGroupPicker(container, { ...torrentInfo, extra: { ...(torrentInfo.extra || {}), groupMode: true } });
            });
        },

        startOrPick(container, torrentInfo) {
            if (torrentInfo.extra?.groupMode === false) {
                this.startRecognition(container, torrentInfo);
                return;
            }
            const liveEntries = GazelleSites.gpwMatches() ? GazelleSites.gazelleEntries() : (GazelleSites.haidanMatches() ? GazelleSites.haidanEntries() : []);
            const liveTorrentInfo = liveEntries.length > 1
                ? { ...torrentInfo, extra: { ...(torrentInfo.extra || {}), groupMode: true, entries: liveEntries, groupTitle: torrentInfo.extra?.groupTitle || torrentInfo.name, currentTid: torrentInfo.extra?.tid || '' } }
                : torrentInfo;
            if (liveTorrentInfo.extra?.groupMode) {
                this.renderGroupPicker(container, liveTorrentInfo);
                return;
            }
            this.startRecognition(container, liveTorrentInfo);
        },

        attachRecognizeTrigger(container, torrentInfo) {
            const trigger = container.querySelector('.mp-recognize-trigger');
            if (!trigger) return;
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const state = trigger.getAttribute('data-state');
                if (state === 'running') return;
                this.startOrPick(container, torrentInfo);
            });
        },

        async startRecognition(container, torrentInfo) {
            const setRunning = (msg) => {
                const trigger = container.querySelector('.mp-recognize-trigger');
                if (trigger) {
                    trigger.setAttribute('data-state', 'running');
                    trigger.textContent = `识别（${msg}）`;
                    trigger.disabled = true;
                    trigger.style.backgroundColor = CONSTANTS.COLORS.PRIMARY;
                    trigger.style.borderColor = CONSTANTS.COLORS.PRIMARY;
                    trigger.style.cursor = 'not-allowed';
                }
            };
            setRunning('识别中');

            try {
                const candidates = UTILS.getRecognitionCandidates(torrentInfo.name, torrentInfo.description);
                GM_log(`[${SCRIPT_NAME}] 识别候选词:`, candidates);

                for (let i = 0; i < candidates.length; i++) {
                    if (i > 0) setRunning(`重试${i + 1}/${candidates.length}`);
                    const subtitle = i === 0 ? torrentInfo.description : '';
                    try {
                        const data = await API.recognize(candidates[i], subtitle);
                        if (data && data.media_info) {
                            Cache.set(torrentInfo, data);
                            this.renderSuccess(container, data, torrentInfo);
                            return;
                        }
                    } catch (e) {
                        if ((e.message || '').includes('配置不完整') || (e.message || '').includes('API Key')) {
                            this.renderManualEntry(container, torrentInfo, 'error', '配置异常，重试');
                            return;
                        }
                        GM_log(`[${SCRIPT_NAME}] 候选词识别失败: ${candidates[i]}`, e);
                    }
                }

                if (CONFIG.get('tmdbKey')) {
                    setRunning('匹配中');
                    const mediaInfo = await this.tmdbFallback(candidates, torrentInfo.description);
                    if (mediaInfo && mediaInfo.tmdb_id) {
                        const data = { media_info: mediaInfo, meta_info: {} };
                        Cache.set(torrentInfo, data);
                        this.renderSuccess(container, data, torrentInfo);
                        return;
                    }
                }

                this.renderManualEntry(container, torrentInfo, 'error', '识别失败，重试');
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Recognition failed:`, error);
                const message = (error.message || '').includes('配置不完整') ? '配置异常，重试' : '识别失败，重试';
                this.renderManualEntry(container, torrentInfo, 'error', message);
            }
        },

        async tmdbFallback(candidates, subtitle) {
            try {
                const uniqueQueries = [];
                const addQuery = (q) => {
                    const val = String(q || '').trim();
                    if (val && !uniqueQueries.includes(val)) uniqueQueries.push(val);
                };
                candidates.forEach(addQuery);
                UTILS.extractSubtitleCandidates(subtitle).forEach(addQuery);

                const yearHints = UTILS.extractYearHintsFromText(`${candidates.join(' ')} ${subtitle || ''}`);
                const preferType = UTILS.inferTmdbSearchTypeFromText(`${candidates.join(' ')} ${subtitle || ''}`);
                const topQueries = uniqueQueries.slice(0, 6);
                const scored = [];
                const dedup = new Set();

                for (const q of topQueries) {
                    const modes = preferType ? [preferType, ''] : [''];
                    for (const mode of modes) {
                        const results = await API.searchTmdb(q, mode);
                        (results || []).slice(0, 12).forEach((item) => {
                            const key = `${item?.media_type || mode || ''}:${item?.id || ''}`;
                            if (!item?.id || dedup.has(key)) return;
                            dedup.add(key);
                            const mediaType = item?.media_type || (mode || 'movie');
                            const effectiveType = mediaType === 'tv' ? 'tv' : 'movie';
                            const score = UTILS.scoreTmdbResult({ ...item, media_type: effectiveType }, q, yearHints, preferType);
                            scored.push({ id: item.id, mediaType: effectiveType, score });
                        });
                    }
                }

                scored.sort((a, b) => b.score - a.score);
                const best = scored[0];
                GM_log(`[${SCRIPT_NAME}] TMDB 兜底结果 (top 5):`, scored.slice(0, 5));
                if (!best || best.score < 6) return null;

                const typeName = best.mediaType === 'tv' ? '电视剧' : '电影';
                return await API.recognizeById(best.id, typeName);
            } catch (e) {
                GM_log(`[${SCRIPT_NAME}] TMDB 兜底失败:`, e);
                return null;
            }
        },

        renderSuccess(container, data, torrentInfo) {
            const { media_info, meta_info } = data;
            const containerStyle = `display: flex; align-items: center; gap: 5px; flex-wrap: wrap;`;
            let finalHtml = `<div style="${containerStyle}">`;

            // Manual trigger + Download Button
            finalHtml += UI.renderActionButton('识别', '成功', CONSTANTS.COLORS.SECONDARY, 'idle', '重新识别');
            const buttonStyle = `background-color:${CONSTANTS.COLORS.BTN_SAVE}; color:white; border:none; border-radius:4px; font:inherit; line-height:1.45; font-weight:600; cursor:pointer; padding:.12em .6em;`;
            finalHtml += `<button class="mp-download-button" style="${buttonStyle}">推送到MP</button>`;
            const isGazelleSite = /greatposterwall\.com|haidan\.(cc|video)/i.test(location.hostname) || /gazelle|gpw/i.test(SITE_FAMILIES[location.hostname.replace(/^www\./, '')] || '');
            const pickedLabel = isGazelleSite ? (torrentInfo.extra?.actualName || torrentInfo.extra?.title || torrentInfo.name || torrentInfo.extra?.tid || '') : '';
            if (torrentInfo.extra?.groupMode === false && (torrentInfo.extra?.entries || []).length > 1) {
                finalHtml += `<button type="button" class="mp-reselect-torrent" style="background-color:${CONSTANTS.COLORS.SECONDARY}; color:white; border:none; border-radius:4px; font:inherit; line-height:1.45; font-weight:600; cursor:pointer; padding:.12em .6em;">重选种子</button>`;
            }

            // Tags
            finalHtml += media_info.type ? UI.renderTag(media_info.type, CONSTANTS.COLORS.PRIMARY) : '';
            finalHtml += media_info.category ? UI.renderTag(media_info.category, CONSTANTS.COLORS.PRIMARY) : '';
            if (media_info.title) {
                const titleStyle = `cursor: pointer; -webkit-user-select: none; user-select: none;`;
                finalHtml += `<span class="mp-clickable-title" style="${titleStyle}">${UI.renderTag(media_info.title, CONSTANTS.COLORS.WARNING)}</span>`;
            }
            finalHtml += meta_info.season_episode ? UI.renderTag(meta_info.season_episode, CONSTANTS.COLORS.SECONDARY) : '';
            finalHtml += meta_info.year ? UI.renderTag(meta_info.year, CONSTANTS.COLORS.SECONDARY) : '';
            finalHtml += media_info.tmdb_id ? `<a href="${media_info.detail_link}" target="_blank">${UI.renderTag(media_info.tmdb_id, CONSTANTS.COLORS.SUCCESS)}</a>` : '';
            finalHtml += meta_info.resource_type ? UI.renderTag(meta_info.resource_type, CONSTANTS.COLORS.INFO) : '';
            finalHtml += meta_info.resource_pix ? UI.renderTag(meta_info.resource_pix, CONSTANTS.COLORS.INFO) : '';
            finalHtml += meta_info.video_encode ? UI.renderTag(meta_info.video_encode, CONSTANTS.COLORS.INFO) : '';
            finalHtml += meta_info.audio_encode ? UI.renderTag(meta_info.audio_encode, CONSTANTS.COLORS.INFO) : '';
            finalHtml += meta_info.resource_team ? UI.renderTag(meta_info.resource_team, CONSTANTS.COLORS.PURPLE) : '';
            if (pickedLabel) {
                const entries = torrentInfo.extra?.entries || [];
                const entryIdx = entries.length > 1 ? (entries.findIndex(e => String(e?.tid) === String(torrentInfo.extra?.tid)) + 1) : 0;
                const label = entryIdx > 0 ? `第 ${entryIdx} 个种子：${pickedLabel}` : `种子：${pickedLabel}`;
                finalHtml += `<div style="width:100%;margin-top:6px;padding-top:4px;border-top:1px dashed #dfe4ea;font-size:11px;color:#94a3b8;line-height:1.4;text-align:left;">${UTILS.escapeHtml(label)}</div>`;
            }

            finalHtml += `</div>`;
            container.innerHTML = finalHtml;

            // Add event listeners
            this.addSuccessListeners(container, data, torrentInfo);
            this.attachRecognizeTrigger(container, torrentInfo);
            this.attachReselectTrigger(container, torrentInfo);
        },

        addSuccessListeners(row, data, torrentInfo) {
            const titleElement = row.querySelector('.mp-clickable-title');
            if (titleElement) {
                titleElement.addEventListener('click', () => {
                    GM_setClipboard(data.media_info.title);
                    const originalContent = titleElement.innerHTML;
                    titleElement.innerHTML = UI.renderTag('已复制!', CONSTANTS.COLORS.SUCCESS);
                    setTimeout(() => { titleElement.innerHTML = originalContent; }, 1500);
                });
            }

            const downloadButton = row.querySelector('.mp-download-button');
            if (downloadButton) {
                downloadButton.addEventListener("click", (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.handleDownload(downloadButton, data.media_info, torrentInfo);
                });
            }
        },

        async handleDownload(button, media_info, torrentInfo) {
            button.disabled = true;
            const originalText = "推送到MP";
            const log = (msg, ...args) => GM_log(`[${SCRIPT_NAME}] [Download] ${msg}`, ...args);
            const setStatus = (text) => { button.textContent = text; UI.showToast(text, 2000); log(text); };

            try {
                // bangumi.moe 列表项：通过 API 获取真实 magnet
                if (torrentInfo._bangumiId && !torrentInfo.downloadLink) {
                    setStatus("获取 bangumi.moe 磁力链接...");
                    try {
                        const apiRes = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                            method: 'GET',
                            url: `https://bangumi.moe/api/v2/torrent/${torrentInfo._bangumiId}`,
                            responseType: 'json',
                            onload: (r) => r.status === 200 ? resolve(r.response) : reject(new Error(`API ${r.status}`)),
                            onerror: reject
                        }));
                        if (apiRes?.magnet) {
                            // 从页面已有 magnet 链接提取 tracker，提取不到用硬编码兜底
                            let trackerParams = '';
                            const existingMagnet = document.querySelector('a[href^="magnet:"]')?.href || '';
                            const extractedTrs = existingMagnet.split('&tr=').slice(1).map(t => '&tr=' + t.split('&')[0]);
                            if (extractedTrs.length > 0) {
                                trackerParams = extractedTrs.join('');
                                log(`从页面提取到 ${extractedTrs.length} 个 tracker`);
                            } else {
                                trackerParams = [
                                    'https://tr.bangumi.moe:9696/announce',
                                    'http://tr.bangumi.moe:6969/announce',
                                    'udp://tr.bangumi.moe:6969/announce',
                                    'http://open.acgtracker.com:1096/announce',
                                    'http://share.camoe.cn:8080/announce',
                                    'http://opentracker.acgnx.se/announce',
                                    'http://t.nyaatracker.com/announce',
                                ].map(t => `&tr=${encodeURIComponent(t)}`).join('');
                                log('使用硬编码 tracker 兜底');
                            }
                            torrentInfo.downloadLink = apiRes.magnet + trackerParams;
                            if (apiRes.size) torrentInfo.size = UTILS.parseSize(apiRes.size);
                            log(`bangumi API 获取成功: ${torrentInfo.downloadLink.substring(0, 80)}...`);
                        }
                    } catch (e) {
                        log('bangumi API 获取失败:', e);
                    }
                }

                log('开始推送:', { name: torrentInfo.name, downloadLink: torrentInfo.downloadLink?.substring(0, 60), size: torrentInfo.size });

                // M-Team 链接获取
                if (Site.adapter.id === 'm-team') {
                    setStatus("M-Team: 获取下载链接...");
                    let link = '';
                    try {
                        link = await API.getMteamDownloadLink();
                    } catch (e) {
                        GM_log(`[${SCRIPT_NAME}] genDlToken 失败:`, e);
                        if (/未配置 M-Team API Key/.test(String(e?.message || ''))) {
                            setStatus("请先配置 M-Team API Key");
                            setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
                            return;
                        }
                    }
                    if (!link) {
                        setStatus("链接获取失败");
                        setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
                        return;
                    }
                    torrentInfo.downloadLink = link;
                }

                if (Site.adapter.id === 'greatposterwall' && /([?&])usetoken=1(?:&|$)/.test(torrentInfo.downloadLink || '') && !CONFIG.get('gazelleFlEnabled')) {
                    setStatus("需开启 FL（消耗令牌）");
                    setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 2000);
                    return;
                }

                // 1. 尝试完整推送（含站点+媒体信息）
                setStatus("查询站点信息...");
                let pushed = false;
                try {
                    const siteData = await API.getSite();
                    log(`站点匹配成功: id=${siteData.id}, name=${siteData.name}`);
                    setStatus(`站点: ${siteData.name}，推送中...`);
                    const torrentPayload = {
                        title: torrentInfo.name,
                        description: torrentInfo.description,
                        page_url: window.location.href,
                        enclosure: torrentInfo.downloadLink,
                        size: torrentInfo.size,
                        site: siteData.id,
                        site_name: siteData.name,
                        site_cookie: siteData.cookie,
                        proxy: siteData.proxy,
                        pubdate: UTILS.getFormattedDate(),
                        site_ua: navigator.userAgent
                    };
                    log('完整推送 payload:', torrentPayload);
                    const dlRes = await API.download(media_info, torrentPayload);
                    log('完整推送响应:', dlRes);
                    setStatus("MoviePilot 推送成功");
                    pushed = true;
                } catch (e) {
                    log('完整推送失败:', e);
                }

                // 2. 完整推送失败，尝试 downloadAdd（不含站点信息，走 MoviePilot 下载器）
                if (!pushed && torrentInfo.downloadLink) {
                    try {
                        setStatus("通过 MoviePilot 下载器直推...");
                        log('downloadAdd 参数:', { name: torrentInfo.name, enclosure: torrentInfo.downloadLink?.substring(0, 60) });
                        const addRes = await API.downloadAdd(torrentInfo);
                        log('downloadAdd 响应:', addRes);
                        setStatus("MoviePilot 下载器推送成功");
                        pushed = true;
                    } catch (e) {
                        log('downloadAdd 失败:', e);
                    }
                }

                if (!pushed) {
                    const reason = !torrentInfo.downloadLink ? '无下载链接（请到详情页操作）' : '所有推送方式均失败';
                    setStatus(reason);
                    setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
                    return;
                }
                button.disabled = false;
            } catch (outerErr) {
                GM_log(`[${SCRIPT_NAME}] handleDownload 异常:`, outerErr);
                setStatus(`异常: ${outerErr.message || '未知错误'}`);
                setTimeout(() => { button.textContent = originalText; button.disabled = false; }, 3000);
            }
        }
    };



export { Core };

import { CONFIG } from './settings.js';

import { firstOf } from '../../common/first-match.js';

import { AdapterRuntime, AutoFeedAnchors, GazelleSites, Mount, tableMount } from './page-tools.js';

import { API } from './api.js';

import { BT_SITE_HELPERS } from './bt-pages.js';

import { Core } from './core.js';

import { UTILS } from './media-formatting.js';



const SITE_ADAPTERS = [
        {
            id: 'totheglory',
            matches: () => window.location.href.includes('totheglory.im/t/'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = document.querySelectorAll('.rowhead, .heading');
                    if (rows.length < 2) return null;
                    return tableMount('totheglory', rows[1].parentElement, 'MoviePilot');
                },
                mount => {
                    const rows = document.querySelectorAll('.rowhead, .heading');
                    if (rows.length < 2) return null;
                    const nameLink = rows[0].nextElementSibling?.querySelector('a');
                    const sizeString = firstOf(rows, row => row.textContent.includes('尺寸'))
                        ?.nextElementSibling?.innerText || '';
                    const description = document.querySelector("h1")?.textContent.replace(/.*?\[/, '[').trim() || '';
                    return {
                        name: nameLink?.textContent.replace(/^\[TTG\]\s*|\s*\.torrent$/g, '') || '',
                        downloadLink: document.querySelector("td[valign='top'] a")?.getAttribute("href") || '',
                        description: description,
                        size: UTILS.parseSize(sizeString || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'hdsky',
            matches: () => window.location.href.includes('hdsky.me/details.php'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = document.querySelectorAll('.rowhead');
                    if (rows.length < 4) return null;
                    return tableMount('hdsky', rows[1].parentElement, 'MoviePilot');
                },
                mount => {
                    const rows = document.querySelectorAll('.rowhead');
                    if (rows.length < 4) return null;
                    const nameRow = rows[0], downloadLinkRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                    const nameLink = nameRow.parentElement.querySelector('.rowfollow input[type="submit"]')?.value.replace(/^\[HDSky\]\s*|\s*\.torrent$/g, '') || '';
                    const downloadLink = downloadLinkRow.parentElement.querySelector('.rowfollow a')?.href || '';
                    const description = descRow.parentElement.querySelector('.rowfollow')?.textContent.trim() || '';
                    const sizeString = sizeRow.parentElement.querySelector('.rowfollow')?.textContent.trim() || '';
                    return {
                        name: nameLink,
                        downloadLink: downloadLink,
                        description: description,
                        size: UTILS.parseSize(sizeString || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'sjtu',
            matches: () => window.location.href.includes('pt.sjtu.edu.cn/details.php'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = document.querySelectorAll('.rowhead, .heading');
                    if (rows.length < 4) return null;
                    return tableMount('sjtu', rows[1].parentElement, 'MoviePilot');
                },
                mount => {
                    const rows = document.querySelectorAll('.rowhead, .heading');
                    if (rows.length < 4) return null;
                    const nameRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                    const nameLink = nameRow.nextElementSibling?.querySelector('a')?.textContent.replace(/^\[PT\]\.\s*|\s*\.torrent$/g, '') || '';
                    const downloadLink = nameRow.nextElementSibling?.querySelector('a')?.href || '';
                    const description = descRow.parentElement.querySelector('.rowfollow').textContent.trim() || '';
                    const sizeString = sizeRow.parentElement.querySelector('.rowfollow').textContent.trim();
                    return {
                        name: nameLink,
                        downloadLink: downloadLink,
                        description: description,
                        size: UTILS.parseSize(sizeString || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'hdcity',
            matches: () => window.location.href.includes('hdcity.city/t-'),
            ...AdapterRuntime.withMount(
                () => Mount.blockAfter(document.querySelector('div.block') || document.body),
                mount => {
                    const rows = document.querySelectorAll('.blocktitle');
                    if (rows.length < 4) return null;
                    const nameLink = rows[0].textContent;
                    const infoBlock = firstOf(rows, row => row.textContent.includes('基本信息'))?.nextElementSibling;
                    const sizeblock = infoBlock?.textContent || rows[1].nextElementSibling?.textContent || '';
                    const description = rows[0].parentElement?.querySelector('.blockcontent')?.textContent.trim() || "";
                    const downloadLink = rows[3].nextElementSibling?.querySelector('input[type="text"][title="DirectLink"]')?.value || document.querySelector('a[href*="download?id="]')?.href || "";

                    return {
                        name: nameLink,
                        downloadLink: downloadLink,
                        description: description,
                        size: UTILS.parseSize(sizeblock || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'monikadesign',
            matches: () => window.location.hostname === 'monikadesign.uk' && /^\/torrents\/\d+\/?$/.test(window.location.pathname),
            ...AdapterRuntime.withMount(
                () => {
                    const target = AutoFeedAnchors.monikaNameRow();
                    return target ? tableMount('monikadesign', target, 'MoviePilot') : Mount.prepend();
                },
                mount => {
                    const nameElement = document.querySelector('h1.text-center');
                    const descriptionElement = document.querySelector('h2.text-center');
                    const downloadLinkElement = document.querySelector('a.down[href*="/download/"]');
                    const size = document.querySelector('.torrent-size td:nth-child(2)')?.textContent?.trim() || '';
                    if (!nameElement) return null;

                    return {
                        name: nameElement.textContent.trim(),
                        description: descriptionElement ? descriptionElement.textContent.trim() : '',
                        downloadLink: downloadLinkElement ? downloadLinkElement.href : '',
                        size: UTILS.parseSize(size.replace(/iB/gi, 'B') || ''),
                        mount
                    };
                }
            )
        },
        {
            id: 'bangumi-moe',
            matches: () => window.location.hostname === 'bangumi.moe',
            ...AdapterRuntime.withMount(
                () => {
                    const modal = document.querySelector('.torrent-details-content');
                    const isDetailUrl = /^\/torrent\/[a-f0-9]+$/i.test(window.location.pathname);
                    if (!isDetailUrl && !modal) return null;
                    const root = modal || document;
                    const titleEl = root.querySelector('a.title-link b') || root.querySelector('a[href*="/torrent/"]');
                    const target = titleEl?.closest('.torrent-info') || root.querySelector('.torrent-info, .torrent-title') || document.body;
                    return Mount.afterNode(target);
                },
                mount => {
                    const modal = document.querySelector('.torrent-details-content');
                    const root = modal || document;
                    const titleEl = root.querySelector('a.title-link b') || root.querySelector('a[href*="/torrent/"]');
                    const title = titleEl?.textContent?.trim()
                        || BT_SITE_HELPERS.text('.torrent-title, .subject-title, .title')
                        || document.title.replace(/\s*[-|_].*$/, '').trim();
                    const downloadLink = (root.querySelector('a[href^="magnet:"]')?.href)
                        || BT_SITE_HELPERS.findDownloadLink(['a[href^="magnet:"]', 'a[href*="/download/"]', 'a[href*=".torrent"]']);
                    const sizeText = root.querySelector('.filesize')?.textContent || root.textContent || '';
                    return BT_SITE_HELPERS.info({ name: title, description: title, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                if (/^\/torrent\/[a-f0-9]+$/i.test(window.location.pathname)) return null;
                const items = document.querySelectorAll('div.torrent-title');
                return Array.from(items).map(item => {
                    const h3 = item.querySelector('h3');
                    const name = h3?.textContent?.trim();
                    if (!name) return null;
                    const torrentLink = item.querySelector('a[href*="/torrent/"]');
                    const torrentId = torrentLink?.href?.match(/\/torrent\/([a-f0-9]+)/i)?.[1] || '';
                    const info = BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: '',
                        sizeText: '',
                        target: item.closest('md-item, .torrent-row') || item.parentElement || item
                    });
                    if (info && torrentId) info._bangumiId = torrentId;
                    return info;
                }).filter(Boolean);
            }
        },
        {
            id: 'mikanani',
            matches: () => window.location.hostname === 'mikanani.me' && window.location.pathname.startsWith('/Home/'),
            ...AdapterRuntime.withMount(
                () => {
                    if (!window.location.pathname.includes('/Home/Episode/')) return null;
                    return Mount.afterNode(document.querySelector('.episode-title, h1, h2, .an-text') || document.body);
                },
                mount => {
                    const rawTitle = BT_SITE_HELPERS.text('.episode-title, h1, h2, .an-text')
                        || document.title.replace(/\s*-\s*Mikan Project\s*$/, '').trim();
                    const title = rawTitle.replace(/\s*\[\d+(?:\.\d+)?\s*(?:GB|MB|GiB|MiB)\]\s*$/i, '').trim();
                    const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                        'a[href^="magnet:"]',
                        'a[href*="/Download/"]',
                        'a[href*="/download/"]',
                        'a[href*=".torrent"]'
                    ]);
                    const description = BT_SITE_HELPERS.text('.episode-desc, .bangumi-desc, .content, .panel-body') || title;
                    const sizeText = (document.querySelector('.episode-title, h1, h2, .an-text')?.parentElement?.innerText) || '';
                    return BT_SITE_HELPERS.info({ name: title, description, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                if (!window.location.pathname.includes('/Home/Bangumi/')) return null;
                const rows = document.querySelectorAll('table tbody tr');
                return Array.from(rows).map(row => {
                    const titleEl = row.querySelector('a[href*="/Home/Episode/"]') || row.querySelector('a');
                    const name = titleEl?.textContent?.trim()?.replace(/\s*\[\d+(?:\.\d+)?\s*(?:GB|MB|GiB|MiB)\]\s*$/i, '').trim();
                    if (!name) return null;
                    const magnet = row.querySelector('input[data-magnet]')?.getAttribute('data-magnet') || '';
                    const tds = row.querySelectorAll('td');
                    const sizeText = tds[2]?.textContent?.trim() || '';
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: magnet,
                        sizeText,
                        target: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'comicat-kisssub',
            matches: () => /(^|\.)(comicat|kisssub)\.org$/i.test(window.location.hostname),
            ...AdapterRuntime.withMount(
                () => {
                    if (!/\/show-[a-f0-9]{40}\.html$/i.test(window.location.pathname)) return null;
                    return Mount.afterNode(document.querySelector('.c2 > .box > .intro') || document.querySelector('.intro, .basic_info') || document.body);
                },
                mount => {
                    const title = document.title.replace(/\s*-\s*(?:漫猫动漫|爱恋动漫)\s+[a-f0-9]{40}\s*$/i, '').trim();
                    const hash = window.location.pathname.match(/show-([a-f0-9]{40})\.html/i)?.[1] || '';
                    const encodedMagnet = Array.from(document.querySelectorAll('a[href*="magnet%3A"], a[href*="magnet%3a"]'))
                        .map(el => el.href.match(/magnet%3A.*$/i)?.[0])
                        .filter(Boolean)[0];
                    const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                        'a[href^="magnet:"]',
                        'a[href*=".torrent"]'
                    ]) || (encodedMagnet ? decodeURIComponent(encodedMagnet) : '') || (hash ? `magnet:?xt=urn:btih:${hash}` : '');
                    const description = BT_SITE_HELPERS.text('.intro, .entry-content, .content, .description, .panel-body, article') || title;
                    const sizeText = (document.querySelector('.torrent_files, .basic_info, .c2')?.innerText) || '';
                    return BT_SITE_HELPERS.info({ name: title, description, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                if (/\/show-[a-f0-9]{40}\.html$/i.test(window.location.pathname)) return null;
                const rows = document.querySelectorAll('tr.alt1, tr.alt2');
                return Array.from(rows).map(row => {
                    const titleEl = row.querySelector('a[href*="show-"]');
                    const name = titleEl?.textContent?.trim();
                    if (!name) return null;
                    const hash = titleEl.href.match(/show-([a-f0-9]{40})/i)?.[1] || '';
                    const downloadLink = hash ? `magnet:?xt=urn:btih:${hash}` : '';
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink,
                        sizeText: row.textContent,
                        target: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'acg-rip',
            matches: () => window.location.hostname === 'acg.rip',
            ...AdapterRuntime.withMount(
                () => {
                    if (!/^\/t\/\d+$/.test(window.location.pathname)) return null;
                    const panelContent = document.querySelector('.panel-body.post-content');
                    const heading = panelContent?.parentElement?.querySelector('.panel-heading');
                    return Mount.afterNode(heading || panelContent || document.body);
                },
                mount => {
                    const panelContent = document.querySelector('.panel-body.post-content');
                    const heading = panelContent?.parentElement?.querySelector('.panel-heading');
                    const title = heading?.textContent?.trim() || document.title.replace(/\s*-\s*ACG\.RIP\s*$/i, '').trim();
                    const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                        'a[href^="magnet:"]',
                        'a[href*=".torrent"]'
                    ]);
                    const description = BT_SITE_HELPERS.text('.panel-body.post-content') || title;
                    const sizeText = (panelContent?.innerText) || '';
                    return BT_SITE_HELPERS.info({ name: title, description, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                const rows = document.querySelectorAll('table tbody tr');
                return Array.from(rows).map(row => {
                    const titleEl = row.querySelector('a[href*="/t/"]');
                    const name = titleEl?.textContent?.trim();
                    if (!name || titleEl.href.includes('.torrent')) return null;
                    const torrent = row.querySelector('a[href*=".torrent"]')?.href || '';
                    const tds = row.querySelectorAll('td');
                    const sizeText = tds[tds.length - 1]?.textContent?.trim() || '';
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: torrent,
                        sizeText,
                        target: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'nyaa',
            matches: () => window.location.hostname === 'nyaa.si',
            ...AdapterRuntime.withMount(
                () => /^\/view\/\d+$/.test(window.location.pathname) ? Mount.afterNode(document.querySelector('.panel-heading') || document.body) : null,
                mount => {
                    const title = BT_SITE_HELPERS.text('h3.panel-title')
                        || document.title.replace(/\s*::\s*Nyaa\s*$/i, '').trim();
                    const downloadLink = BT_SITE_HELPERS.findDownloadLink([
                        'a[href^="magnet:"]',
                        'a[href*="/download/"]',
                        'a[href*=".torrent"]'
                    ]);
                    const description = BT_SITE_HELPERS.text('#torrent-description') || title;
                    const sizeText = (document.querySelector('.panel-body .row, .torrent-file-list')?.parentElement?.innerText) || '';
                    return BT_SITE_HELPERS.info({ name: title, description, downloadLink, sizeText, mount });
                }
            ),
            getListInfo: () => {
                const rows = document.querySelectorAll('table.torrent-list tbody tr');
                return Array.from(rows).map(row => {
                    const titleEl = row.querySelector('td:nth-child(2) a:not(.comments)');
                    const name = titleEl?.textContent?.trim();
                    if (!name) return null;
                    const magnet = row.querySelector('a[href^="magnet:"]')?.href || '';
                    const torrent = row.querySelector('a[href*="/download/"]')?.href || '';
                    const size = row.querySelector('td:nth-child(4)')?.textContent?.trim() || '';
                    return BT_SITE_HELPERS.simpleDivInfo({
                        name, description: name,
                        downloadLink: magnet || torrent,
                        sizeText: size,
                        target: titleEl
                    });
                }).filter(Boolean);
            }
        },
        {
            id: 'beyond-hd',
            matches: () => window.location.hostname === 'beyond-hd.me' && window.location.pathname.startsWith('/torrents/'),
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.bhd-fl-button[href*="/download/"]');
                    const row = AutoFeedAnchors.bhdNameRow();
                    const target = row || document.querySelector('table.table-details') || dl?.closest('.text-center') || dl?.parentElement || document.querySelector('.panel-title')?.closest('.panel') || document.querySelector('h1') || document.body;
                    return row ? tableMount('beyond-hd', row, 'MoviePilot') : Mount.afterNode(target);
                },
                mount => {
                    const dl = document.querySelector('a.bhd-fl-button[href*="/download/"]');
                    return BT_SITE_HELPERS.info({
                        name: document.title.replace(/\s*\|\s*Torrents\s*\|\s*BeyondHD.*/i, '').trim(),
                        description: BT_SITE_HELPERS.text('.panel-body'),
                        downloadLink: dl?.href || '',
                        sizeText: BT_SITE_HELPERS.text('.panel-body'),
                        mount
                    });
                }
            )
        },
        {
            id: 'eiga',
            matches: () => window.location.hostname === 'eiga.moi' && window.location.pathname.startsWith('/torrents/'),
            ...AdapterRuntime.withMount(
                () => {
                    const holder = AutoFeedAnchors.unit3dActionHolder('mp', 'MoviePilot', document.querySelector('menu.torrent__buttons') || document.querySelector('article'));
                    return holder ? Mount.append(holder) : Mount.afterNode(document.querySelector('menu.torrent__buttons') || document.querySelector('article') || document.body);
                },
                mount => {
                    const dl = document.querySelector('a[href*="/torrents/download/"]');
                    return BT_SITE_HELPERS.info({
                        name: BT_SITE_HELPERS.text('h1.meta__title') || document.title.replace(/\s+-\s+Torrents.*/i, '').trim(),
                        description: BT_SITE_HELPERS.text('.meta__description,.bbcode-rendered'),
                        downloadLink: dl?.href || '',
                        sizeText: document.body.innerText,
                        mount
                    });
                }
            )
        },
        {
            id: 'hd-space',
            matches: () => window.location.hostname === 'hd-space.org' && window.location.search.includes('page=torrent-details'),
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.hdSpaceTorrentRow() || AutoFeedAnchors.hdSpaceInfoHashRow();
                    return row ? tableMount('hd-space', row, 'MoviePilot') : Mount.afterNode(document.querySelector('#mcol') || document.body);
                },
                mount => {
                    const dl = document.querySelector('a[href*="download.php"]');
                    const nameRow = AutoFeedAnchors.rowAfterName(document.querySelector('#mcol'));
                    return BT_SITE_HELPERS.info({
                        name: nameRow?.cells?.[1]?.textContent?.trim() || document.title,
                        description: document.body.innerText,
                        downloadLink: dl?.href || '',
                        sizeText: document.body.innerText,
                        mount
                    });
                }
            )
        },
        {
            id: 'iptorrents',
            matches: () => window.location.hostname === 'iptorrents.com' && window.location.pathname === '/torrent.php',
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.iptMovieInfoRow();
                    return row ? tableMount('iptorrents', row, 'MoviePilot') : Mount.afterNode(document.querySelector('h2') || document.body);
                },
                mount => {
                    const id = new URLSearchParams(window.location.search).get('id') || '';
                    const dl = firstOf(document.querySelectorAll('a[href*="download.php"]'), a => a.href.includes(`/${id}/`) || a.href.includes(`id=${id}`)) || document.querySelector('a[href*="download.php"][href$=".torrent"]');
                    const row = AutoFeedAnchors.iptMovieInfoRow();
                    const target = row || dl?.closest('.info,.dBox') || dl?.parentElement || dl || document.querySelector('h2') || document.body;
                    return BT_SITE_HELPERS.info({
                        name: BT_SITE_HELPERS.text('h2') || document.title.replace(/\s*-\s*IPTorrents.*/i, '').trim(),
                        description: '',
                        downloadLink: dl?.href || '',
                        sizeText: target?.textContent || '',
                        mount
                    });
                }
            )
        },
        {
            id: 'filelist',
            matches: () => window.location.hostname === 'filelist.io' && window.location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const row = dl?.closest('tr');
                    const target = AutoFeedAnchors.fileListAnchor('mp', 'MoviePilot') || row || dl?.closest('.cblock-innercontent') || dl?.parentElement || dl || document.querySelector('.cblock-content,.cblock,#maincolumn,#container,table') || document.body;
                    return Mount.append(target);
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    return BT_SITE_HELPERS.info({
                        name: BT_SITE_HELPERS.titleFromDownload(dl) || document.title.split(' :: ')[0].trim(),
                        description: document.title.split(' :: ')[0].trim(),
                        downloadLink: dl?.href || '',
                        sizeText: mount?.target?.textContent || '',
                        mount
                    });
                }
            )
        },
        {
            id: 'hudbt',
            matches: () => window.location.hostname === 'hudbt.hust.edu.cn' && window.location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const dts = Array.from(document.querySelectorAll('#outer dl.table > dt'));
                    const byLabel = label => firstOf(dts, dt => dt.textContent.includes(label))?.nextElementSibling;
                    const target = byLabel('下载') || dl?.parentElement || document.querySelector('#outer dl.table');
                    return target ? Mount.definitionAfter(target) : Mount.prepend();
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const dts = Array.from(document.querySelectorAll('#outer dl.table > dt'));
                    const byLabel = label => firstOf(dts, dt => dt.textContent.includes(label))?.nextElementSibling;
                    const title = BT_SITE_HELPERS.text('#page-title') || BT_SITE_HELPERS.titleFromDownload(dl) || document.title.match(/"([^"]+)"/)?.[1] || document.title;
                    const sub = byLabel('副标题')?.textContent || '';
                    const info = byLabel('基本信息')?.textContent || '';
                    const intro = byLabel('简介')?.textContent || '';
                    return BT_SITE_HELPERS.info({ name: title, description: sub || intro || title, downloadLink: dl?.href || '', sizeText: info || document.body.innerText, mount });
                }
            )
        },
        {
            id: 'greatposterwall',
            matches: () => GazelleSites.gpwMatches(),
            ...AdapterRuntime.withMount(
                () => GazelleSites.gpwMount('MoviePilot'),
                async mount => {
                    const tid = new URLSearchParams(window.location.search).get('torrentid');
                    const name = document.title.replace(/\s*::\s*Great Poster Wall.*/i, '').trim();
                    const entries = GazelleSites.gazelleEntries();
                    const groupInfo = BT_SITE_HELPERS.info({ name, description: document.title, mount, extra: { groupMode: true, entries, groupTitle: name, currentTid: tid || '' } });
                    if (entries.length > 1) return groupInfo;
                    const entry = entries.find(item => item.tid === tid) || entries[0];
                    if (entry) return await Core.pickedInfoWithActualName(groupInfo, entry, mount);
                    const dl = document.querySelector(`a[href*="action=download"][href*="id=${tid}"]`);
                    const row = GazelleSites.gpwTorrentRow(tid) || dl?.closest('tr');
                    return BT_SITE_HELPERS.info({ name, description: document.title, downloadLink: dl?.href || '', sizeText: row?.textContent || '', mount, extra: { tid: tid || '', actualName: '', title: '', groupTitle: name, needsToken: false, flLink: '' } });
                }
            )
        },
        {
            id: 'haidan',
            matches: () => GazelleSites.haidanMatches(),
            ...AdapterRuntime.withMount(
                () => GazelleSites.haidanMount('MoviePilot'),
                async mount => {
                    const tid = new URLSearchParams(window.location.search).get('torrent_id');
                    const title = BT_SITE_HELPERS.text('.detail-info-title') || document.title.trim();
                    let groupId = GazelleSites.haidanGroupIdFromDom();
                    if (!groupId && tid) groupId = await GazelleSites.haidanResolveGroupId(tid);
                    const entries = GazelleSites.haidanEntries();
                    const groupInfo = BT_SITE_HELPERS.info({ name: title, description: document.title, mount, extra: { groupMode: true, entries, groupTitle: title, currentTid: tid || '', groupId: groupId || '' } });
                    if (entries.length > 1) return groupInfo;
                    const entry = entries.find(e => e.tid === tid) || entries[0];
                    if (entry) return await Core.pickedInfoWithActualName(groupInfo, entry, mount);
                    const dl = document.querySelector(`a[href*="download.php"][href*="id=${tid}"]`);
                    const row = dl?.closest('.torrent-wrap') || dl?.closest('tr') || dl?.closest('.torrent,.torrent-row') || dl?.parentElement;
                    const explicitHash = GazelleSites.extractExplicitHash(row);
                    const actualName = GazelleSites.isHaidanHost() ? await GazelleSites.haidanActualName(tid) : '';
                    const name = actualName || title;
                    return BT_SITE_HELPERS.info({ name, description: document.title, downloadLink: dl?.href || '', sizeText: row?.textContent || '', mount, extra: { tid: tid || '', actualName, title: '', groupTitle: title, explicitHash: explicitHash || '', groupId: groupId || '' } });
                }
            )
        },
        {
            id: 'hhclub',
            matches: () => window.location.hostname === 'hhanclub.net' && window.location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const row = dl?.closest('tr');
                    const grid = dl?.closest('.grid');
                    const gridCell = AutoFeedAnchors.hhclubSubtitleValue() || (grid ? firstOf(grid.children, el => el.contains(dl)) : null);
                    const target = row || gridCell || dl?.parentElement || dl || document.body;
                    return row ? tableMount('hhclub', row, 'MoviePilot') : (gridCell ? Mount.gridPairAfter(gridCell) : Mount.afterNode(target));
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const title = BT_SITE_HELPERS.titleFromDownload(dl) || document.title.match(/"([^"]+)"/)?.[1] || document.title;
                    return BT_SITE_HELPERS.info({ name: title, description: title, downloadLink: dl?.href || '', sizeText: mount?.target?.textContent || '', mount });
                }
            )
        },
        {
            id: 'generic-nexusphp',
            matches: () => document.querySelector('.rowhead') && !window.location.href.includes('totheglory.im') && !window.location.href.includes('hdsky.me') && !window.location.href.includes('hdcity.city'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = document.querySelectorAll('.rowhead');
                    const nameRow = rows[0];
                    return tableMount('generic-nexusphp', AutoFeedAnchors.domesticActionRow() || nameRow?.parentElement, 'MoviePilot');
                },
                mount => {
                    const rows = document.querySelectorAll('.rowhead');
                    if (rows.length < 3) return null;
                    const nameRow = rows[0], descRow = rows[1], sizeRow = rows[2];
                    if (!nameRow.nextElementSibling || !descRow.nextElementSibling || !sizeRow.nextElementSibling) return null;
                    const nameLink = nameRow.nextElementSibling.querySelector('a');
                    let description;
                    description = descRow.nextElementSibling.innerText || '';
                    if ( descRow.nextElementSibling.innerText.includes('https://')) {
                        description = '';
                    }
                    return {
                        name: nameLink?.textContent || '',
                        downloadLink: nameLink?.href || '',
                        description: description,
                        size: UTILS.parseSize(sizeRow.nextElementSibling.innerText),
                        mount
                    };
                }
            )
        },
        {
            id: 'm-team',
            matches: () => /m-team\.(cc|io|vip)\/detail\//.test(window.location.href),
            findMount: () => {
                const holder = AutoFeedAnchors.mTeamActionHolder('mp', 'MoviePilot');
                return holder ? Mount.append(holder) : null;
            },
            getInfo: async () => {
                const tid = window.location.pathname.match(/\/detail\/(\d+)/)?.[1] || '';
                if (!CONFIG.get('mteamApiKey')) throw new Error('未配置 M-Team API Key');
                const res = await API.getMteamTorrentDetail(tid);
                const data = res?.data || res?.result || res;
                const name = data?.name || data?.title || data?.smallDescr || (tid ? `M-Team ${tid}` : 'M-Team');
                return {
                    name,
                    description: data?.smallDescr || data?.descr || data?.description || name,
                    size: Number(data?.size || data?.fileSize || data?.torrentSize || 0) || UTILS.parseSize(String(data?.sizeText || '')),
                    downloadLink: '',
                    extra: { mteamTid: tid }
                };
            }
        }
    ];



export { SITE_ADAPTERS };

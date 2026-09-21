import { firstOf } from '../../common/first-match.js';

import { AdapterRuntime, AutoFeedAnchors, GazelleSites, Mount, TORRENT_LINK_SELECTORS, tableMount } from './page-tools.js';

import { Helpers } from './torrent-fields.js';

import { Core } from './core.js';



const ADAPTERS = [
        {
            id: 'totheglory',
            matches: () => location.hostname === 'totheglory.im' && location.pathname.startsWith('/t/'),
            ...AdapterRuntime.withMount(
                () => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[0];
                    const row = rows[1]?.parentElement || nameRow?.parentElement;
                    return row ? tableMount('totheglory', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[0];
                    const nameLink = nameRow?.nextElementSibling?.querySelector('a');
                    const sizeRow = firstOf(rows, r => /尺寸|大小/.test(r.textContent));
                    return Helpers.info({ id: 'totheglory', name: nameLink?.textContent?.replace(/^\[TTG\]\s*|\s*\.torrent$/g, '') || document.title, description: Helpers.text('h1'), downloadLink: nameLink?.href || '', sizeText: sizeRow?.nextElementSibling?.innerText || '', mount });
                }
            )
        },
        {
            id: 'hdsky',
            matches: () => location.hostname === 'hdsky.me' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const rows = [...document.querySelectorAll('.rowhead')];
                    const row = rows[1]?.parentElement || rows[0]?.parentElement;
                    return row ? tableMount('hdsky', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const rows = [...document.querySelectorAll('.rowhead')];
                    const nameRow = rows[0], dlRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                    return Helpers.info({ id: 'hdsky', name: nameRow?.parentElement?.querySelector('.rowfollow input[type="submit"]')?.value?.replace(/^\[HDSky\]\s*|\s*\.torrent$/g, '') || '', description: descRow?.parentElement?.querySelector('.rowfollow')?.textContent || '', downloadLink: dlRow?.parentElement?.querySelector('.rowfollow a')?.href || '', sizeText: sizeRow?.parentElement?.querySelector('.rowfollow')?.textContent || '', mount });
                }
            )
        },
        {
            id: 'sjtu',
            matches: () => location.hostname === 'pt.sjtu.edu.cn' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const row = rows[1]?.parentElement;
                    return row ? tableMount('sjtu', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[1], descRow = rows[2], sizeRow = rows[3];
                    const nameLink = nameRow?.nextElementSibling?.querySelector('a');
                    return Helpers.info({ id: 'sjtu', name: nameLink?.textContent?.replace(/^\[PT\]\.\s*|\s*\.torrent$/g, '') || '', description: descRow?.nextElementSibling?.textContent || '', downloadLink: nameLink?.href || '', sizeText: sizeRow?.nextElementSibling?.textContent || '', mount });
                }
            )
        },
        {
            id: 'bangumi',
            matches: () => location.hostname === 'bangumi.moe',
            ...AdapterRuntime.withMount(
                () => {
                    const modal = document.querySelector('.torrent-details-content');
                    const root = modal || document;
                    const isDetail = /^\/torrent\/[a-f0-9]+$/i.test(location.pathname) || modal;
                    if (!isDetail) return null;
                    return Mount.afterNode(root.querySelector('.torrent-info,.torrent-title') || document.body);
                },
                mount => {
                    const modal = document.querySelector('.torrent-details-content');
                    const root = modal || document;
                    const title = root.querySelector('a.title-link b, a[href*="/torrent/"]')?.textContent?.trim() || document.title.split(/[-|_]/)[0].trim();
                    const link = root.querySelector('a[href^="magnet:"]')?.href || '';
                    const bangumiId = root.querySelector('a[href*="/torrent/"]')?.href?.match(/\/torrent\/([a-f0-9]+)/i)?.[1] || location.pathname.match(/\/torrent\/([a-f0-9]+)/i)?.[1];
                    const info = Helpers.info({ id: 'bangumi', name: title, description: title, downloadLink: link, sizeText: root.textContent, mount, extra: { bangumiId } });
                    if (info) info._bangumiId = bangumiId;
                    return info;
                }
            )
        },
        {
            id: 'mikanani',
            matches: () => location.hostname === 'mikanani.me' && location.pathname.includes('/Home/Episode/'),
            ...AdapterRuntime.withMount(
                () => Mount.afterNode(document.querySelector('.episode-title, h1, h2, .an-text') || document.body),
                mount => {
                    const raw = Helpers.text('.episode-title, h1, h2, .an-text') || document.title;
                    const name = raw.replace(/\s*\[\d+(?:\.\d+)?\s*(?:GB|MB|GiB|MiB)\]\s*$/i, '').trim();
                    return Helpers.info({ id: 'mikanani', name, description: Helpers.text('.episode-desc,.bangumi-desc,.content,.panel-body') || name, downloadLink: Helpers.findDownload(['a[href^="magnet:"]', 'a[href*="/Download/"]', 'a[href*="/download/"]', 'a[href*=".torrent"]']), sizeText: document.body.innerText, mount });
                }
            )
        },
        {
            id: 'm-team',
            matches: () => /m-team\.(cc|io|vip)\/detail\//.test(location.href),
            findMount: () => {
                const holder = AutoFeedAnchors.mTeamActionHolder('iyuu', 'IYUU');
                return holder ? Mount.append(holder) : null;
            },
            getInfo: async () => {
                const tid = location.pathname.match(/\/detail\/(\d+)/)?.[1] || '';
                const name = tid ? `M-Team ${tid}` : 'M-Team';
                return { id: 'm-team', name, description: name, downloadLink: '', size: 0, extra: { mteamTid: tid } };
            }
        },
        {
            id: 'hdcity',
            matches: () => location.hostname === 'hdcity.city' && /^\/t-/.test(location.pathname),
            ...AdapterRuntime.withMount(
                () => {
                    const blocks = [...document.querySelectorAll('.blocktitle')];
                    const info = firstOf(blocks, b => b.textContent.includes('基本信息'));
                    const op = firstOf(blocks, b => b.textContent.includes('种子操作'));
                    return Mount.blockAfter(document.querySelector('div.block') || op?.parentElement || info?.parentElement || document.body);
                },
                mount => {
                    const blocks = [...document.querySelectorAll('.blocktitle')];
                    const info = firstOf(blocks, b => b.textContent.includes('基本信息'));
                    const op = firstOf(blocks, b => b.textContent.includes('种子操作'));
                    return Helpers.info({ id: 'hdcity', name: Helpers.text('.blocktitle') || document.title, description: op?.parentElement?.querySelector('.blockcontent')?.textContent || '', downloadLink: document.querySelector('input[title="DirectLink"]')?.value || document.querySelector('a[href*="download?id="]')?.href || '', sizeText: info?.nextElementSibling?.textContent || '', mount });
                }
            )
        },
        {
            id: 'monikadesign',
            matches: () => location.hostname === 'monikadesign.uk' && /^\/torrents\/\d+\/?$/.test(location.pathname),
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.monikaNameRow();
                    return row ? tableMount('monikadesign', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const title = document.querySelector('h1.text-center');
                    const sub = document.querySelector('h2.text-center');
                    const dl = document.querySelector('a.down[href*="/download/"]');
                    return Helpers.info({ id: 'monikadesign', name: title?.textContent || document.title, description: sub?.textContent || '', downloadLink: dl?.href || '', sizeText: document.querySelector('.torrent-size td:nth-child(2)')?.textContent || '', mount });
                }
            )
        },
        {
            id: 'beyond-hd',
            matches: () => location.hostname === 'beyond-hd.me' && location.pathname.startsWith('/torrents/'),
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.bhd-fl-button[href*="/download/"]');
                    const row = AutoFeedAnchors.bhdNameRow();
                    const target = row || document.querySelector('table.table-details') || dl?.closest('.text-center') || dl?.parentElement || document.querySelector('.panel-title')?.closest('.panel') || document.querySelector('h1') || document.body;
                    return row ? tableMount('beyond-hd', row, 'IYUU') : Mount.afterNode(target);
                },
                mount => {
                    const dl = document.querySelector('a.bhd-fl-button[href*="/download/"]');
                    return Helpers.info({ id: 'beyond-hd', name: document.title.replace(/\s*\|\s*Torrents\s*\|\s*BeyondHD.*/i, '').trim(), description: Helpers.text('.panel-body'), downloadLink: dl?.href || '', sizeText: Helpers.text('.panel-body'), mount });
                }
            )
        },
        {
            id: 'eiga',
            matches: () => location.hostname === 'eiga.moi' && location.pathname.startsWith('/torrents/'),
            ...AdapterRuntime.withMount(
                () => {
                    const holder = AutoFeedAnchors.unit3dActionHolder('iyuu', 'IYUU', document.querySelector('menu.torrent__buttons') || document.querySelector('article'));
                    return holder ? Mount.append(holder) : Mount.afterNode(document.querySelector('menu.torrent__buttons') || document.querySelector('article') || document.body);
                },
                mount => {
                    const dl = document.querySelector('a[href*="/torrents/download/"]');
                    return Helpers.info({ id: 'eiga', name: Helpers.text('h1.meta__title') || document.title.replace(/\s+-\s+Torrents.*/i, '').trim(), description: Helpers.text('.meta__description,.bbcode-rendered'), downloadLink: dl?.href || '', sizeText: document.body.innerText, mount });
                }
            )
        },
        {
            id: 'hd-space',
            matches: () => location.hostname === 'hd-space.org' && location.search.includes('page=torrent-details'),
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.hdSpaceTorrentRow() || AutoFeedAnchors.hdSpaceInfoHashRow();
                    return row ? tableMount('hd-space', row, 'IYUU') : Mount.afterNode(document.querySelector('#mcol') || document.body);
                },
                mount => {
                    const dl = document.querySelector('a[href*="download.php"]');
                    const nameRow = AutoFeedAnchors.rowAfterName(document.querySelector('#mcol'));
                    return Helpers.info({ id: 'hd-space', name: nameRow?.cells?.[1]?.textContent?.trim() || document.title, description: document.body.innerText, downloadLink: dl?.href || '', sizeText: document.body.innerText, mount });
                }
            )
        },
        {
            id: 'iptorrents',
            matches: () => location.hostname === 'iptorrents.com' && location.pathname === '/torrent.php',
            ...AdapterRuntime.withMount(
                () => {
                    const row = AutoFeedAnchors.iptMovieInfoRow();
                    return row ? tableMount('iptorrents', row, 'IYUU') : Mount.afterNode(document.querySelector('h2') || document.body);
                },
                mount => {
                    const id = new URLSearchParams(location.search).get('id') || '';
                    const dl = firstOf(document.querySelectorAll('a[href*="download.php"]'), a => a.href.includes(`/${id}/`) || a.href.includes(`id=${id}`)) || document.querySelector('a[href*="download.php"][href$=".torrent"]');
                    const row = AutoFeedAnchors.iptMovieInfoRow();
                    const target = row || dl?.closest('.info,.dBox') || dl?.parentElement || dl || document.querySelector('h2') || document.body;
                    return Helpers.info({ id: 'iptorrents', name: Helpers.text('h2') || document.title.replace(/\s*-\s*IPTorrents.*/i, '').trim(), downloadLink: dl?.href || '', sizeText: target?.textContent || '', mount });
                }
            )
        },
        {
            id: 'filelist',
            matches: () => location.hostname === 'filelist.io' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const row = dl?.closest('tr');
                    const target = AutoFeedAnchors.fileListAnchor('iyuu', 'IYUU') || row || dl?.closest('.cblock-innercontent') || dl?.parentElement || dl || document.querySelector('.cblock-content,.cblock,#maincolumn,#container,table') || document.body;
                    return Mount.append(target);
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    return Helpers.info({ id: 'filelist', name: Helpers.titleFromDownload(dl) || document.title.split(' :: ')[0].trim(), description: document.title.split(' :: ')[0].trim(), downloadLink: dl?.href || '', sizeText: mount?.target?.textContent || '', mount });
                }
            )
        },
        {
            id: 'hudbt',
            matches: () => location.hostname === 'hudbt.hust.edu.cn' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const table = document.querySelector('#outer dl.table');
                    const dts = [...document.querySelectorAll('#outer dl.table > dt')];
                    const byLabel = label => firstOf(dts, dt => dt.textContent.includes(label))?.nextElementSibling;
                    const target = byLabel('下载') || dl?.parentElement || table;
                    return target ? Mount.definitionAfter(target) : Mount.prepend();
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const dts = [...document.querySelectorAll('#outer dl.table > dt')];
                    const byLabel = label => firstOf(dts, dt => dt.textContent.includes(label))?.nextElementSibling;
                    const title = Helpers.text('#page-title') || Helpers.titleFromDownload(dl) || document.title.match(/"([^"]+)"/)?.[1] || document.title;
                    const sub = byLabel('副标题')?.textContent || '';
                    const info = byLabel('基本信息')?.textContent || '';
                    const intro = byLabel('简介')?.textContent || '';
                    return Helpers.info({ id: 'hudbt', name: title, description: sub || intro || title, downloadLink: dl?.href || '', sizeText: info || document.body.innerText, mount });
                }
            )
        },
        {
            id: 'greatposterwall',
            matches: () => GazelleSites.gpwMatches(),
            ...AdapterRuntime.withMount(
                () => GazelleSites.gpwMount('IYUU'),
                async mount => {
                    const tid = new URLSearchParams(location.search).get('torrentid');
                    const name = document.title.replace(/\s*::\s*Great Poster Wall.*/i, '').trim();
                    const entries = GazelleSites.gazelleEntries();
                    const groupInfo = Helpers.info({ id: 'greatposterwall', name, description: document.title, mount, extra: { groupMode: true, entries, groupTitle: name, currentTid: tid || '' } });
                    if (entries.length > 1) return groupInfo;
                    const entry = entries.find(item => item.tid === tid) || entries[0];
                    if (entry) return await Core.pickedInfoWithActualName(groupInfo, entry, mount);
                    const dl = document.querySelector(`a[href*="action=download"][href*="id=${tid}"]`);
                    const row = GazelleSites.gpwTorrentRow(tid) || dl?.closest('tr');
                    return Helpers.info({ id: 'greatposterwall', name, description: document.title, downloadLink: dl?.href || '', sizeText: row?.textContent || '', mount, extra: { tid: tid || '', actualName: '', title: '', groupTitle: name, needsToken: false, flLink: '' } });
                }
            )
        },
        {
            id: 'haidan',
            matches: () => GazelleSites.haidanMatches(),
            ...AdapterRuntime.withMount(
                () => GazelleSites.haidanMount('IYUU'),
                async mount => {
                    const tid = new URLSearchParams(location.search).get('torrent_id');
                    const title = Helpers.text('.detail-info-title') || document.title.trim();
                    let groupId = GazelleSites.haidanGroupIdFromDom();
                    if (!groupId && tid) groupId = await GazelleSites.haidanResolveGroupId(tid);
                    const entries = GazelleSites.haidanEntries();
                    const groupInfo = Helpers.info({ id: 'haidan', name: title, description: document.title, mount, extra: { groupMode: true, entries, groupTitle: title, currentTid: tid || '', groupId: groupId || '' } });
                    if (entries.length > 1) return groupInfo;
                    const entry = entries.find(e => e.tid === tid) || entries[0];
                    if (entry) return await Core.pickedInfoWithActualName(groupInfo, entry, mount);
                    const dl = document.querySelector(`a[href*="download.php"][href*="id=${tid}"]`);
                    const row = dl?.closest('.torrent-wrap') || dl?.closest('tr') || dl?.closest('.torrent,.torrent-row') || dl?.parentElement;
                    const explicitHash = GazelleSites.extractExplicitHash(row);
                    const actualName = GazelleSites.isHaidanHost() ? await GazelleSites.haidanActualName(tid) : '';
                    const name = actualName || title;
                    return Helpers.info({ id: 'haidan', name, description: document.title, downloadLink: dl?.href || '', sizeText: row?.textContent || '', mount, extra: { tid: tid || '', actualName, title: '', groupTitle: title, explicitHash: explicitHash || '', groupId: groupId || '' } });
                }
            )
        },
        {
            id: 'hhclub',
            matches: () => location.hostname === 'hhanclub.net' && location.pathname === '/details.php',
            ...AdapterRuntime.withMount(
                () => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    const row = dl?.closest('tr');
                    const grid = dl?.closest('.grid');
                    const gridCell = AutoFeedAnchors.hhclubSubtitleValue() || (grid ? firstOf(grid.children, el => el.contains(dl)) : null);
                    const target = row || gridCell || dl?.parentElement || dl || document.body;
                    return row ? tableMount('hhclub', row, 'IYUU') : (gridCell ? Mount.gridPairAfter(gridCell) : Mount.afterNode(target));
                },
                mount => {
                    const dl = document.querySelector('a.index[href*="download.php?id="]') || document.querySelector('a[href*="download.php?id="]');
                    return Helpers.info({ id: 'hhclub', name: Helpers.titleFromDownload(dl) || document.title.match(/"([^"]+)"/)?.[1] || document.title, description: document.title, downloadLink: dl?.href || '', sizeText: mount?.target?.textContent || '', mount });
                }
            )
        },
        {
            id: 'nyaa',
            matches: () => location.hostname === 'nyaa.si',
            ...AdapterRuntime.withMount(
                () => /^\/view\/\d+$/.test(location.pathname) ? Mount.afterNode(document.querySelector('.panel-heading') || document.body) : null,
                mount => Helpers.info({ id: 'nyaa', name: Helpers.text('h3.panel-title') || document.title.replace(/::.*$/, '').trim(), description: Helpers.text('#torrent-description') || document.title, downloadLink: document.querySelector('a[href^="magnet:"],a[href*="/download/"]')?.href || '', sizeText: document.body.innerText, mount })
            )
        },
        {
            id: 'acg-rip',
            matches: () => location.hostname === 'acg.rip',
            ...AdapterRuntime.withMount(
                () => /^\/t\/\d+$/.test(location.pathname) ? Mount.afterNode(document.querySelector('.panel-heading') || document.body) : null,
                mount => Helpers.info({ id: 'acg-rip', name: Helpers.text('.panel-heading') || document.title.replace(/-\s*ACG\.RIP.*/i, '').trim(), description: Helpers.text('.panel-body.post-content') || document.title, downloadLink: document.querySelector('a[href^="magnet:"],a[href*=".torrent"]')?.href || '', sizeText: document.body.innerText, mount })
            )
        },
        {
            id: 'comicat-kisssub',
            matches: () => /(^|\.)(comicat|kisssub)\.org$/i.test(location.hostname),
            ...AdapterRuntime.withMount(
                () => /\/show-[a-f0-9]{40}\.html$/i.test(location.pathname) ? Mount.afterNode(document.querySelector('.intro,.basic_info') || document.body) : null,
                mount => {
                    const hash = location.pathname.match(/show-([a-f0-9]{40})\.html/i)?.[1] || '';
                    const title = document.title.replace(/\s*-\s*.*/, '').trim();
                    return Helpers.info({ id: 'comicat-kisssub', name: title, description: Helpers.text('.intro,.entry-content,.content,.description,.panel-body,article') || title, downloadLink: document.querySelector('a[href^="magnet:"]')?.href || (hash ? `magnet:?xt=urn:btih:${hash}` : ''), sizeText: document.body.innerText, mount });
                }
            )
        },
        {
            id: 'generic',
            matches: () => true,
            ...AdapterRuntime.withMount(
                () => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[0];
                    const row = AutoFeedAnchors.domesticActionRow() || nameRow?.parentElement;
                    return row ? tableMount('generic', row, 'IYUU') : Mount.prepend();
                },
                mount => {
                    const rows = [...document.querySelectorAll('.rowhead,.heading')];
                    const nameRow = rows[0];
                    const selectors = [...TORRENT_LINK_SELECTORS, 'a[href^="magnet:"]'].join(',');
                    const candidates = [...document.querySelectorAll(selectors)];
                    const nameLink = nameRow?.nextElementSibling?.querySelector('a') || candidates.map(a => ({ a, s: Helpers.scoreTorrentLink(a, { rewardDownloadPath: true, allowMagnet: true }) })).filter(x => x.s >= 0).sort((x, y) => y.s - x.s)[0]?.a || null;
                    return Helpers.info({ id: 'generic', name: nameLink?.textContent?.replace(/\.torrent$/i, '').trim() || document.title, downloadLink: nameLink?.href || '', sizeText: document.body.innerText, mount });
                }
            )
        }
    ];



export { ADAPTERS };

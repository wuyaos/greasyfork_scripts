import { KEYS, log } from './config.js';

import { Store } from './settings.js';

import { SiteIndex } from './site-index.js';



const isCurrentHostInCachedIndex = () => {
        const indexedSites = SiteIndex.applyOverrides(Store.json(KEYS.sites, []));
        if (!indexedSites.length) return true;
        const matched = SiteIndex.hasCurrent(indexedSites);
        if (!matched) log('当前站点不在 IYUU 站点索引缓存中，跳过 IYUU 入口', location.hostname);
        return matched;
    };

const isMTeamHost = () => /(^|\.)m-team\.(cc|io|vip)$/.test(location.hostname);

const isMTeamDetail = () => isMTeamHost() && location.pathname.startsWith('/detail/');



export { isCurrentHostInCachedIndex, isMTeamDetail, isMTeamHost };

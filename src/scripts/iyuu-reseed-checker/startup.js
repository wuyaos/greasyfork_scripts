import { KEYS } from './config.js';

import { Config, Store } from './settings.js';

import { UI } from './ui.js';

import { isCurrentHostInCachedIndex, isMTeamDetail, isMTeamHost } from './routing.js';

import { Core } from './core.js';



function main() {
        Config.load();
        UI.initStyle();
        if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('配置 IYUU', () => UI.showConfig());
        const boot = async () => {
            if (isMTeamHost() && !isMTeamDetail()) return;
            if (!isCurrentHostInCachedIndex()) return;
            const ok = await Core.init();
            if (!ok && !document.querySelector('.iyuu-check-btn')) {
                let tries = 0;
                const retry = async () => {
                    if (!isCurrentHostInCachedIndex() || (!isMTeamHost() && document.querySelector('.iyuu-check-btn')) || await Core.init() || ++tries > 40) return;
                    setTimeout(retry, 500);
                };
                setTimeout(retry, 500);
            }
            if (!Store.get(KEYS.configured, false) && !document.querySelector('.iyuu-modal-bg')) UI.showConfig();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
        if (location.hostname === 'bangumi.moe' || isMTeamHost()) {
            let mteamBootedFor = '';
            new MutationObserver(() => {
                if (!isMTeamHost()) {
                    if (!document.querySelector('.iyuu-check-btn')) setTimeout(boot, 300);
                    return;
                }
                const tid = location.pathname.match(/\/detail\/(\d+)/)?.[1] || location.href;
                if (mteamBootedFor === tid && document.querySelector('.iyuu-check-btn')) return;
                if (!document.querySelector('label') || !document.querySelector('label')?.textContent) return;
                if (!Array.from(document.querySelectorAll('label')).some(label => label.textContent.trim() === '字幕')) return;
                mteamBootedFor = tid;
                setTimeout(boot, 300);
            }).observe(document.body, { childList: true, subtree: true });
        }
        if (isMTeamHost()) {
            let lastUrl = location.href;
            setInterval(() => {
                if (location.href === lastUrl) return;
                lastUrl = location.href;
                setTimeout(boot, 300);
            }, 500);
        }
    }

function bootstrap() {
main();
}



export { bootstrap };

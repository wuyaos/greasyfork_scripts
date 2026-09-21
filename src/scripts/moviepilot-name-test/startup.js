import { CONFIG } from './settings.js';

import { UI } from './ui.js';

import { Site } from './site.js';

import { Core } from './core.js';

import { Cache } from './cache.js';

import { isMTeamDetail, isMTeamHost } from './routing.js';



function main() {
        // 1. 加载配置
        CONFIG.load();

        // 2. 注册菜单命令
        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand("配置Moviepilot参数", () => UI.showConfigModal(false), "c");
            GM_registerMenuCommand("清除识别缓存", () => Cache.clear(), "x");
            GM_registerMenuCommand("重置所有配置", () => CONFIG.reset(), "r");
        }
    
        // 3. 确保配置存在，否则弹窗并终止
        if (!CONFIG.ensure()) {
            return;
        }
    
        let hasBooted = false;
        const bootCore = async (options = {}) => {
            if (hasBooted && !options.force) return true;
            hasBooted = true;
            const ok = await Core.handlePage();
            if (!ok) hasBooted = false;
            return ok;
        };

        const installMTeamDynamicBoot = () => {
            let bootedTorrentId = '';
            let booting = false;
            let bootTimer = null;
            const currentTorrentId = () => window.location.pathname.match(/\/detail\/(\d+)/)?.[1] || '';
            const hasMTeamAnchor = () => Array.from(document.querySelectorAll('label')).some(label => label.textContent.trim() === '字幕');
            const requestBoot = (delay = 300) => {
                clearTimeout(bootTimer);
                bootTimer = setTimeout(tryBoot, delay);
            };

            let attempts = 0;
            const tryBoot = async () => {
                if (!isMTeamDetail()) return;
                const tid = currentTorrentId();
                if (!tid || booting || (bootedTorrentId === tid && document.querySelector('.mp-recognize-trigger'))) return;
                if (!hasMTeamAnchor()) {
                    if (attempts++ < 30) requestBoot(500);
                    return;
                }
                booting = true;
                Site.init();
                const ok = Site.adapter ? await bootCore({ force: true }) : false;
                booting = false;
                if (ok) {
                    bootedTorrentId = tid;
                    attempts = 0;
                    return;
                }
                if (attempts++ < 30) requestBoot(500);
            };
            requestBoot(300);

            new MutationObserver(() => {
                if (!isMTeamDetail()) return;
                requestBoot(300);
            }).observe(document.body, { childList: true, subtree: true });
        };

        // 4. 初始化站点适配器
        if (isMTeamHost() && !isMTeamDetail()) return;
        Site.init();
        if (!Site.adapter) {
            return; // 如果没有适配器，则不执行页面注入
        }

        // 5. 处理 M-Team 的动态加载，等待详细信息出现后再渲染入口
        if (Site.adapter.id === 'm-team') {
            installMTeamDynamicBoot();
        } else if (window.location.hostname === 'bangumi.moe') {
            // bangumi.moe 是 SPA，内容异步渲染，需要轮询等待 DOM 就绪
            const spaBoot = () => {
                let attempts = 0;
                const tryBoot = () => {
                    if (attempts++ > 15 || document.querySelector('.mp-recognize-trigger')) return;
                    hasBooted = false;
                    Site.init();
                    if (Site.adapter) bootCore();
                    if (!document.querySelector('.mp-recognize-trigger')) {
                        setTimeout(tryBoot, 500);
                    }
                };
                setTimeout(tryBoot, 300);
            };
            spaBoot();

            // 监听页内导航，URL 变化时清旧行、重新匹配
            let lastUrl = location.href;
            const onUrlChange = () => {
                if (location.href === lastUrl) return;
                lastUrl = location.href;
                document.querySelectorAll('.mp-recognize-trigger').forEach(el => {
                    const row = el.closest('tr, div');
                    if (row) row.remove();
                });
                spaBoot();
            };
            const origPush = history.pushState;
            const origReplace = history.replaceState;
            history.pushState = function(...args) { origPush.apply(this, args); onUrlChange(); };
            history.replaceState = function(...args) { origReplace.apply(this, args); onUrlChange(); };
            window.addEventListener('popstate', onUrlChange);

            // 监听弹窗：列表页点击种子后 DOM 插入 .torrent-details-content，URL 不变
            let modalProcessing = false;
            let modalDebounce = null;
            const modalObserver = new MutationObserver(() => {
                if (modalProcessing) return;
                clearTimeout(modalDebounce);
                modalDebounce = setTimeout(() => {
                    const modal = document.querySelector('.torrent-details-content');
                    if (modal && !modal.querySelector('.mp-recognize-trigger')) {
                        modalProcessing = true;
                        modalObserver.disconnect();
                        hasBooted = false;
                        bootCore();
                        setTimeout(() => {
                            modalProcessing = false;
                            modalObserver.observe(document.body, { childList: true, subtree: false });
                        }, 500);
                    }
                }, 300);
            });
            modalObserver.observe(document.body, { childList: true, subtree: false });
        } else {
            let attempts = 0;
            const tryBoot = async () => {
                if (document.querySelector('.mp-recognize-trigger')) return;
                Site.init();
                const ok = Site.adapter ? await bootCore() : false;
                if (!ok && attempts++ < 20) setTimeout(tryBoot, 500);
            };
            tryBoot();
        }
    }

function bootstrap() {
main();
}



export { bootstrap };

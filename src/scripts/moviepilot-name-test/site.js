import { SCRIPT_NAME } from './config.js';

import { SITE_ADAPTERS } from './adapters.js';



const Site = {
        adapter: null,
        init() {
            this.adapter = null;
            for (const adapter of SITE_ADAPTERS) {
                try {
                    if (adapter.matches()) {
                        this.adapter = adapter;
                        break;
                    }
                } catch (error) {
                    GM_log(`[${SCRIPT_NAME}] Adapter match failed: ${adapter.id}`, error?.stack || error?.message || error);
                }
            }
            if (this.adapter) {
                GM_log(`[${SCRIPT_NAME}] Matched site: ${this.adapter.id}`);
            } else {
                GM_log(`[${SCRIPT_NAME}] No matching site adapter found.`);
            }
        },
        async getTorrentInfo() {
            if (!this.adapter) return null;
            try {
                // 优先列表模式（多条）
                if (this.adapter.getListInfo) {
                    const list = await this.adapter.getListInfo();
                    if (list && list.length > 0) return list;
                }
                // 回退到详情页单条模式
                const single = await this.adapter.getInfo();
                return single ? [single] : null;
            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] Adapter getInfo failed: ${this.adapter.id}`, error?.stack || error?.message || error);
                return null;
            }
        }
    };



export { Site };

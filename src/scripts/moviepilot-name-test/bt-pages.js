import { Mount } from './page-tools.js';

import { UTILS } from './media-formatting.js';



const BT_SITE_HELPERS = {
        text(selector, root = document) {
            return root.querySelector(selector)?.textContent?.trim() || '';
        },

        attr(selector, attr, root = document) {
            return root.querySelector(selector)?.getAttribute(attr) || '';
        },

        absoluteUrl(rawUrl) {
            if (!rawUrl) return '';
            try {
                return new URL(rawUrl, window.location.origin).href;
            } catch (e) {
                return '';
            }
        },

        findSize(text) {
            return UTILS.parseSize(String(text || '').replace(/iB/gi, 'B'));
        },

        findDownloadLink(selectors) {
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                const href = el?.href || el?.getAttribute?.('href') || el?.value || '';
                const url = this.absoluteUrl(href);
                if (url) return url;
            }
            return '';
        },

        info({ name, description = '', downloadLink = '', sizeText = '', mount, extra = {} }) {
            return name && mount?.target ? { name, description, downloadLink, size: this.findSize(sizeText), mount, extra } : null;
        },

        simpleDivInfo({ name, description, downloadLink, sizeText, target }) {
            return this.info({ name, description, downloadLink, sizeText, mount: Mount.afterNode(target) });
        },

        titleFromDownload(link) {
            return String(link?.textContent || link?.href?.split('/').pop() || '').replace(/\.torrent$/i, '').trim();
        }
    };



export { BT_SITE_HELPERS };

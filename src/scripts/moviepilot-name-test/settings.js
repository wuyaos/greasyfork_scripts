import { CONSTANTS, SCRIPT_NAME } from './config.js';

import { UI } from './ui.js';



const CONFIG = {
        _values: {},

        load() {
            this._values.url = GM_getValue('moviepilotUrl', CONSTANTS.DEFAULT_CONFIG.moviepilotUrl);
            this._values.user = GM_getValue('moviepilotUser', CONSTANTS.DEFAULT_CONFIG.moviepilotUser);
            this._values.pass = GM_getValue('moviepilotPassword', CONSTANTS.DEFAULT_CONFIG.moviepilotPassword);
            this._values.authMode = GM_getValue('moviepilotAuthMode', CONSTANTS.DEFAULT_CONFIG.moviepilotAuthMode);
            this._values.apiKey = GM_getValue('moviepilotApiKey', CONSTANTS.DEFAULT_CONFIG.moviepilotApiKey);
            this._values.tmdbKey = GM_getValue('moviepilotTmdbKey', CONSTANTS.DEFAULT_CONFIG.moviepilotTmdbKey);
            this._values.mteamApiKey = GM_getValue('moviepilotMteamApiKey', CONSTANTS.DEFAULT_CONFIG.moviepilotMteamApiKey);
            this._values.autoQuery = Boolean(GM_getValue('moviepilotAutoQuery', CONSTANTS.DEFAULT_CONFIG.moviepilotAutoQuery));
            this._values.gazelleFlEnabled = Boolean(GM_getValue('moviepilotGazelleFlEnabled', CONSTANTS.DEFAULT_CONFIG.moviepilotGazelleFlEnabled));
            GM_log(`[${SCRIPT_NAME}] 配置已加载。`);
        },

        save({ url, user, pass, authMode, apiKey, tmdbKey, mteamApiKey, autoQuery, gazelleFlEnabled }) {
            GM_setValue('moviepilotUrl', url);
            GM_setValue('moviepilotUser', user);
            GM_setValue('moviepilotPassword', pass);
            GM_setValue('moviepilotAuthMode', authMode || 'password');
            GM_setValue('moviepilotApiKey', apiKey || '');
            GM_setValue('moviepilotTmdbKey', tmdbKey || '');
            GM_setValue('moviepilotMteamApiKey', mteamApiKey || '');
            GM_setValue('moviepilotAutoQuery', Boolean(autoQuery));
            GM_setValue('moviepilotGazelleFlEnabled', Boolean(gazelleFlEnabled));
            this.load();
            GM_log(`[${SCRIPT_NAME}] 配置已保存。`);
            UI.showToast(`[${SCRIPT_NAME}] 配置已保存。部分更改可能需要刷新页面生效。`);
        },

        reset() {
            if (confirm(`[${SCRIPT_NAME}]\n\n确定要重置所有配置吗？\n\n这将清除所有存储的 Moviepilot 设置并刷新页面。`)) {
                GM_deleteValue('moviepilotUrl');
                GM_deleteValue('moviepilotUser');
                GM_deleteValue('moviepilotPassword');
                GM_deleteValue('moviepilotAuthMode');
                GM_deleteValue('moviepilotApiKey');
                GM_deleteValue('moviepilotTmdbKey');
                GM_deleteValue('moviepilotMteamApiKey');
                GM_deleteValue('moviepilotAutoQuery');
                GM_deleteValue('moviepilotGazelleFlEnabled');
                try { GM_deleteValue(CONSTANTS.RECOGNIZE_CACHE.KEY); } catch (e) {}
                GM_log(`[${SCRIPT_NAME}] 所有配置已重置。正在刷新页面...`);
                location.reload();
            }
        },

        get(key) {
            return this._values[key];
        },

        ensure() {
            if (!this.get('url')) {
                GM_log(`[${SCRIPT_NAME}] 配置不完整，显示配置弹窗。`);
                UI.showConfigModal(true);
                return false;
            }
            const mode = this.get('authMode') || 'password';
            if (mode === 'password' && (!this.get('user') || !this.get('pass'))) {
                GM_log(`[${SCRIPT_NAME}] 密码模式配置不完整，显示配置弹窗。`);
                UI.showConfigModal(true);
                return false;
            }
            if (mode === 'apikey' && !this.get('apiKey')) {
                GM_log(`[${SCRIPT_NAME}] API Key 模式配置不完整，显示配置弹窗。`);
                UI.showConfigModal(true);
                return false;
            }
            GM_log(`[${SCRIPT_NAME}] 配置完整。URL: ${this.get('url')}, AuthMode: ${mode}`);
            return true;
        }
    };



export { CONFIG };

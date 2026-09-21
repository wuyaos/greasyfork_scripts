const SCRIPT_NAME = 'IYUU 辅种检测助手';

const API_BASE = 'https://2025.iyuu.cn';

const ZMPT_API = 'https://zmpt.cc/nodeapi/iyuu/getIyuuByInfoHash';

const MTEAM_API_BASE = 'https://api.m-team.cc/api';

const KEYS = {
        token: 'iyuu_reseed_token', owned: 'iyuu_reseed_owned_sites', zmpt: 'iyuu_reseed_zmpt_enabled',
        sites: 'iyuu_reseed_sites_index', sitesTime: 'iyuu_reseed_sites_index_time', sid: 'iyuu_reseed_sid_sha1',
        sidTime: 'iyuu_reseed_sid_sha1_time', sidKey: 'iyuu_reseed_sid_sha1_key', result: 'iyuu_reseed_result_cache',
        mteamKey: 'iyuu_reseed_mteam_api_key', configured: 'iyuu_reseed_configured_once', autoQuery: 'iyuu_reseed_auto_query',
        gazelleDl: 'iyuu_reseed_gazelle_download_enabled',
        mpUrl: 'moviepilotUrl', mpUser: 'moviepilotUser', mpPass: 'moviepilotPassword', mpAuthMode: 'moviepilotAuthMode', mpApiKey: 'moviepilotApiKey'
    };

const COLORS = { primary: '#2775b6', secondary: '#e6702e', success: '#5bb053', warn: '#c54640', info: '#677489' };

const safeJson = v => { try { return JSON.stringify(v, (k, val) => val instanceof ArrayBuffer ? `ArrayBuffer(${val.byteLength})` : val, 2); } catch (_) { return String(v); } };

const log = (label, value = '') => { GM_log(`[${SCRIPT_NAME}] ${label}`, value && typeof value === 'object' ? safeJson(value) : value); };

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const normalizeSiteKey = value => String(value || '').toLowerCase().replace(/[\s._-]+/g, '');

export { API_BASE, COLORS, KEYS, MTEAM_API_BASE, SCRIPT_NAME, ZMPT_API, log, normalizeSiteKey, wait };

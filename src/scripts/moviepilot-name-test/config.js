

const SCRIPT_NAME = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';

const MTEAM_API_BASE = 'https://api.m-team.cc/api';

const MTEAM_DETAIL_TTL = 5 * 60 * 1000;

const mteamDetailCache = new Map();

const mteamDetailPending = new Map();

const CONSTANTS = {
        API_ENDPOINTS: {
            LOGIN: '/api/v1/login/access-token',
            RECOGNIZE: '/api/v1/media/recognize',
            RECOGNIZE_BY_ID: '/api/v1/media/tmdb:',
            GET_SITE: '/api/v1/site/domain/',
            DOWNLOAD: '/api/v1/download/',
            DOWNLOAD_ADD: '/api/v1/download/add',
            GET_CLIENTS: '/api/v1/download/clients',
        },
        ALLOWED_HOSTS: ['api.themoviedb.org', 'api.m-team.cc'],
        RECOGNIZE_CACHE: {
            KEY: 'mp_recognize_cache',
            TTL_MS: 24 * 60 * 60 * 1000,  // 24 小时
            MAX_ENTRIES: 200
        },
        COLORS: {
            PRIMARY: '#2775b6',
            SECONDARY: '#e6702e',
            SUCCESS: '#5bb053',
            WARNING: '#c54640',
            INFO: '#677489',
            PURPLE: '#701eeb',
            BTN_SAVE: '#27ae60',
            BTN_SAVE_HOVER: '#229954',
            BTN_CANCEL: '#e74c3c',
            BTN_CANCEL_HOVER: '#c0392b',
        },
        DEFAULT_CONFIG: {
            moviepilotUrl: 'http://127.0.0.1:3000',
            moviepilotUser: 'admin',
            moviepilotPassword: '',
            moviepilotAuthMode: 'password',
            moviepilotApiKey: '',
            moviepilotTmdbKey: '',
            moviepilotMteamApiKey: '',
            moviepilotAutoQuery: false,
            moviepilotGazelleFlEnabled: false
        }
    };



export { CONSTANTS, MTEAM_API_BASE, MTEAM_DETAIL_TTL, SCRIPT_NAME, mteamDetailCache, mteamDetailPending };



const IYUU_SCRIPT_URL = 'http://127.0.0.1:8787/dist/IYUU_Reseed_Checker.user.js';

const MP_SCRIPT_URL = 'http://127.0.0.1:8787/dist/Moviepilot_NameTest.user.js';

const log = (message, extra = '') => {
        const text = `[Local Debug Loader] ${message}`;
        if (typeof GM_log === 'function') GM_log(text, extra);
        else console.log(text, extra);
    };



export { IYUU_SCRIPT_URL, MP_SCRIPT_URL, log };

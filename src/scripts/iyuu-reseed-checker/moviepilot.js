import { KEYS, log } from './config.js';
import { HTTP } from './http.js';

import { Store } from './settings.js';



const MoviePilot = {
        cfg() { return { url: String(Store.get(KEYS.mpUrl, '') || '').replace(/\/$/, ''), user: Store.get(KEYS.mpUser, ''), pass: Store.get(KEYS.mpPass, ''), auth: Store.get(KEYS.mpAuthMode, 'password'), key: Store.get(KEYS.mpApiKey, '') }; },
        save(modal) { Store.set(KEYS.mpUrl, modal.querySelector('#iyuuMpUrl').value.trim().replace(/\/$/, '')); Store.set(KEYS.mpAuthMode, modal.querySelector('#iyuuMpAuth').value); Store.set(KEYS.mpUser, modal.querySelector('#iyuuMpUser').value.trim()); Store.set(KEYS.mpPass, modal.querySelector('#iyuuMpPass').value); Store.set(KEYS.mpApiKey, modal.querySelector('#iyuuMpApiKey').value.trim()); },
        async headers() { const c = this.cfg(); if (!c.url) throw new Error('请先配置 MoviePilot 地址'); if (c.auth === 'apikey') return { 'X-API-KEY': c.key, Accept: 'application/json' }; const res = await HTTP.request({ method: 'POST', url: `${c.url}/api/v1/login/access-token`, data: `username=${encodeURIComponent(c.user)}&password=${encodeURIComponent(c.pass)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (!res?.access_token) throw new Error('MoviePilot 登录失败'); return { Authorization: `bearer ${res.access_token}`, Accept: 'application/json' }; },
        async sites() { const c = this.cfg(); const headers = await this.headers(); const res = await HTTP.request({ url: `${c.url}/api/v1/site`, headers }); log('MoviePilot sites response', res); const raw = res?.data || res?.items || res?.list || res; return Array.isArray(raw) ? raw : Object.values(raw || {}); }
    };



export { MoviePilot };

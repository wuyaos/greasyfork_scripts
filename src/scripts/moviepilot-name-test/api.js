import { CONSTANTS, MTEAM_API_BASE, MTEAM_DETAIL_TTL, SCRIPT_NAME, mteamDetailCache, mteamDetailPending } from './config.js';

import { CONFIG } from './settings.js';

import { UI } from './ui.js';



const API = {
        _sessionToken: null,

        _isAllowedRequestUrl(rawUrl) {
            try {
                const host = new URL(rawUrl, window.location.origin).hostname.toLowerCase();
                if (CONSTANTS.ALLOWED_HOSTS.includes(host)) return true;
                const mpUrl = CONFIG.get('url');
                if (!mpUrl) return false;
                const mpHost = new URL(mpUrl).hostname.toLowerCase();
                return host === mpHost;
            } catch (e) {
                return false;
            }
        },

        _buildAuthHeaders(token) {
            const mode = CONFIG.get('authMode') || 'password';
            if (mode === 'apikey') {
                return {
                    "user-agent": navigator.userAgent,
                    "X-API-KEY": CONFIG.get('apiKey') || ''
                };
            }
            return {
                "user-agent": navigator.userAgent,
                "Authorization": token ? `bearer ${token}` : ''
            };
        },

        _request(options) {
            return new Promise((resolve, reject) => {
                const { method, url, data, headers, responseType, token, absolute = false } = options;
                const fullUrl = absolute || /^https?:\/\//i.test(url) ? url : (CONFIG.get('url') + url);

                if (!this._isAllowedRequestUrl(fullUrl)) {
                    GM_log(`[${SCRIPT_NAME}] 请求被白名单守卫拦截: ${fullUrl}`);
                    reject({ status: 0, message: 'Blocked by host guard' });
                    return;
                }

                const finalHeaders = {
                    "accept": "application/json",
                    "user-agent": navigator.userAgent,
                    ...headers
                };

                if (token && !finalHeaders["Authorization"] && !finalHeaders["X-API-KEY"]) {
                    finalHeaders["Authorization"] = `bearer ${token}`;
                }

                GM_xmlhttpRequest({
                    method,
                    url: fullUrl,
                    data,
                    headers: finalHeaders,
                    responseType,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) {
                            resolve(res.response);
                        } else {
                            reject({ status: res.status, response: res.response, message: `HTTP Error ${res.status}` });
                        }
                    },
                    onerror: (err) => {
                        GM_log(`[${SCRIPT_NAME}] API Request Error:`, err);
                        reject({ message: 'Network or request error', error: err });
                    }
                });
            });
        },

        async login(retryCount = 0) {
            const MAX_RETRIES = 3;
            const RETRY_INTERVAL = 1000;

            if (!CONFIG.get('url') || !CONFIG.get('user') || !CONFIG.get('pass')) {
                throw new Error('配置不完整');
            }

            try {
                const res = await this._request({
                    method: 'POST',
                    url: CONSTANTS.API_ENDPOINTS.LOGIN,
                    data: `username=${encodeURIComponent(CONFIG.get('user'))}&password=${encodeURIComponent(CONFIG.get('pass'))}`,
                    headers: { "content-type": "application/x-www-form-urlencoded" },
                    responseType: 'json'
                });

                if (res && res.access_token) {
                    this._sessionToken = res.access_token;
                    return res.access_token;
                }
                throw new Error('无效的登录响应');

            } catch (error) {
                GM_log(`[${SCRIPT_NAME}] 登录失败 (尝试 ${retryCount + 1}/${MAX_RETRIES})`, error);
                this._sessionToken = null;
                if (retryCount < MAX_RETRIES - 1) {
                    await new Promise(res => setTimeout(res, RETRY_INTERVAL));
                    return this.login(retryCount + 1);
                } else {
                    const status = error.status || 'N/A';
                    UI.showToast(`[${SCRIPT_NAME}] 登录 Moviepilot 失败！已尝试 ${MAX_RETRIES} 次，状态: ${status}`);
                    throw new Error(`登录失败，已达最大重试次数`);
                }
            }
        },

        async getAuthenticatedToken() {
            const mode = CONFIG.get('authMode') || 'password';
            if (mode === 'apikey') {
                if (!CONFIG.get('apiKey')) throw new Error('API Key 未配置');
                return CONFIG.get('apiKey');
            }
            if (this._sessionToken) {
                return this._sessionToken;
            }
            return await this.login();
        },

        async recognize(title, subtitle) {
            const token = await this.getAuthenticatedToken();
            const url = `${CONSTANTS.API_ENDPOINTS.RECOGNIZE}?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle || '')}`;
            return this._request({ method: 'GET', url, headers: this._buildAuthHeaders(token), responseType: 'json' });
        },

        async recognizeById(tmdbId, typeName) {
            const token = await this.getAuthenticatedToken();
            const url = `${CONSTANTS.API_ENDPOINTS.RECOGNIZE_BY_ID}${tmdbId}?type_name=${encodeURIComponent(typeName)}`;
            return this._request({ method: 'GET', url, headers: this._buildAuthHeaders(token), responseType: 'json' });
        },

        async searchTmdb(query, type = '') {
            const key = (CONFIG.get('tmdbKey') || '').trim();
            if (!key) return [];
            const path = type ? `search/${type}` : 'search/multi';
            const url = `https://api.themoviedb.org/3/${path}?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&language=zh-CN`;
            try {
                const res = await this._request({ method: 'GET', url, responseType: 'json', absolute: true });
                return res?.results || [];
            } catch (e) {
                GM_log(`[${SCRIPT_NAME}] TMDB 搜索失败:`, e);
                return [];
            }
        },

        async getSite() {
            const token = await this.getAuthenticatedToken();
            const url = `${CONSTANTS.API_ENDPOINTS.GET_SITE}${window.location.hostname}`;
            return this._request({ method: 'GET', url, headers: this._buildAuthHeaders(token), responseType: 'json' });
        },

        async download(media_info, torrent_info) {
            const token = await this.getAuthenticatedToken();
            // 修复 media_info 中字符串化的数组/对象字段
            const fixedMedia = { ...media_info };
            for (const [k, v] of Object.entries(fixedMedia)) {
                if (typeof v === 'string' && v.startsWith('[')) {
                    try { fixedMedia[k] = JSON.parse(v); } catch (_) {}
                }
            }
            const download_info = { media_in: fixedMedia, torrent_in: torrent_info };
            const res = await this._request({
                method: 'POST',
                url: CONSTANTS.API_ENDPOINTS.DOWNLOAD,
                data: JSON.stringify(download_info),
                headers: { ...this._buildAuthHeaders(token), "content-type": "application/json" },
                responseType: 'json'
            });
            // MoviePilot 可能返回 200 但 success=false
            if (res && res.success === false) {
                throw { status: 200, message: res.message || '推送被 MoviePilot 拒绝', response: res };
            }
            return res;
        },

        async getClients() {
            const token = await this.getAuthenticatedToken();
            return this._request({ method: 'GET', url: CONSTANTS.API_ENDPOINTS.GET_CLIENTS, headers: this._buildAuthHeaders(token), responseType: 'json' });
        },

        async downloadAdd(torrentInfo, downloader) {
            const token = await this.getAuthenticatedToken();
            const payload = {
                torrent_in: {
                    title: torrentInfo.name,
                    description: torrentInfo.description,
                    page_url: window.location.href,
                    enclosure: torrentInfo.downloadLink,
                    size: torrentInfo.size,
                },
                downloader: downloader || null
            };
            const res = await this._request({
                method: 'POST',
                url: CONSTANTS.API_ENDPOINTS.DOWNLOAD_ADD,
                data: JSON.stringify(payload),
                headers: { ...this._buildAuthHeaders(token), "content-type": "application/json" },
                responseType: 'json'
            });
            if (res && res.success === false) {
                throw { status: 200, message: res.message || '推送被 MoviePilot 拒绝', response: res };
            }
            return res;
        },

        async getMteamDownloadLink() {
            try {
                const torrentId = window.location.pathname.split('/').pop();
                if (!torrentId) throw new Error("在URL中未找到种子ID");
                const apiKey = String(CONFIG.get('mteamApiKey') || '').trim();
                if (!apiKey) throw new Error("未配置 M-Team API Key");

                const tokenResponse = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: `${MTEAM_API_BASE}/torrent/genDlToken`,
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "x-api-key": apiKey
                        },
                        data: `id=${torrentId}`,
                        responseType: 'json',
                        onload: (res) => {
                            if (res.status === 200 && (res.response?.code === "0" || res.response?.code === 0)) {
                                resolve(res.response);
                            } else {
                                const errorMsg = res.response?.message || `HTTP ${res.status}`;
                                reject(new Error(`生成下载令牌失败: ${errorMsg}`));
                            }
                        },
                        onerror: (err) => reject(new Error('生成下载令牌时发生网络错误'))
                    });
                });

                if (tokenResponse && tokenResponse.data) {
                    return tokenResponse.data;
                } else {
                    throw new Error("下载令牌响应无效");
                }
            } catch (error) {
                GM_log(`[Moviepilot] M-Team adapter: 获取下载链接失败. ${error.message}`);
                throw error; // 将错误向上抛出
            }
        },

        async getMteamTorrentDetail(id) {
            const torrentId = id || window.location.pathname.match(/\/detail\/(\d+)/)?.[1] || '';
            if (!torrentId) throw new Error("在URL中未找到种子ID");
            const apiKey = String(CONFIG.get('mteamApiKey') || '').trim();
            if (!apiKey) throw new Error("未配置 M-Team API Key");
            const cached = mteamDetailCache.get(torrentId);
            if (cached && Date.now() - cached.ts < MTEAM_DETAIL_TTL) return cached.res;
            if (mteamDetailPending.has(torrentId)) return mteamDetailPending.get(torrentId);
            const pending = this._request({
                method: 'POST',
                url: `${MTEAM_API_BASE}/torrent/detail?id=${encodeURIComponent(torrentId)}&origin=1`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "x-api-key": apiKey
                },
                responseType: 'json',
                absolute: true
            }).then(res => {
                mteamDetailCache.set(torrentId, { res, ts: Date.now() });
                return res;
            }).finally(() => mteamDetailPending.delete(torrentId));
            mteamDetailPending.set(torrentId, pending);
            return pending;
        }
    };



export { API };

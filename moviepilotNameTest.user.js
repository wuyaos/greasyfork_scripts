// ==UserScript==
// @name         moviepilotNameTest(自用)
// @namespace    http://tampermonkey.net/
// @version      2.3.7
// @description  moviepilots名称测试
// @author       yubanmeiqin9048, benz1(modify by ffwu)
// @match        https://*/details.php?id=*
// @match        https://*/details_movie.php?id=*
// @match        https://*/details_tv.php?id=*
// @match        https://*/details_animate.php?id=*
// @match        https://totheglory.im/t/*
// @match        https://bangumi.moe/*
// @match        https://*.acgnx.se/*
// @match        https://*.dmhy.org/*
// @match        https://nyaa.si/*
// @match        https://mikanani.me/*
// @match        https://*.skyey2.com/*
// @match        https://*.m-team.cc/detail/*
// @grant        GM_log
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_setClipboard
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @connect      *
// @license      MIT
// @icon         https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/icon/moviepilot.png
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/moviepilotNameTest.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/moviepilotNameTest.user.js
// ==/UserScript==

// 函数：获取配置值，如果不存在则提示用户输入或使用默认值
function getConfigValueOrDefault(key, defaultValue, promptMessage) {
    let value = GM_getValue(key);
    if (value === undefined || value === null || value === '') { // 检查空字符串以强制用户输入
        if (promptMessage) {
            // 对于布尔值，确保 prompt 的默认值是字符串
            const promptDefault = typeof defaultValue === 'boolean' ? String(defaultValue) : defaultValue;
            value = prompt(promptMessage, promptDefault);
            if (value === null) { // 用户点击了取消
                value = defaultValue;
            }
        } else {
            value = defaultValue;
        }
        GM_setValue(key, value);
    }
    // 对于布尔值，确保 prompt 返回的是字符串 "true" 或 "false" 被正确转换为布尔类型
    if (typeof defaultValue === 'boolean') {
        // 如果 value 本身已经是布尔值了（比如从 GM_getValue 直接获取到的），就不需要转换
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }
        return Boolean(value); // 确保返回的是布尔值
    }
    return value;
}

// --- BEGIN NEW CONFIGURATION LOGIC ---

let configModalElement = null;
let configModalBackdrop = null;

function showConfigModal(isInitialSetup = false) {
    const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';

    if (configModalElement) {
        // Modal already exists, perhaps bring to front or simply return
        return;
    }

    // Create CSS for the modal
    const styleId = 'mp-config-modal-style';
    if (!document.getElementById(styleId)) {
        const css = `
            #mpConfigModalBackdrop {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0,0,0,0.6); z-index: 2147483646; display: flex;
                align-items: center; justify-content: center;
            }
            #mpConfigModal {
                background-color: #f9f9f9; padding: 25px; border-radius: 8px;
                box-shadow: 0 6px 18px rgba(0,0,0,0.25); z-index: 2147483647;
                width: 420px; font-family: "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
                color: #333;
            }
            #mpConfigModal h2 {
                margin-top: 0; margin-bottom: 20px; font-size: 20px; color: #2c3e50;
                border-bottom: 1px solid #eee; padding-bottom: 10px;
            }
            #mpConfigModal label {
                display: block; margin-bottom: 6px; font-weight: 600; color: #555; font-size: 14px;
            }
            #mpConfigModal input[type="text"], #mpConfigModal input[type="password"] {
                width: calc(100% - 24px); padding: 10px; margin-bottom: 18px;
                border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;
                font-size: 14px; transition: border-color 0.2s;
            }
            #mpConfigModal input[type="text"]:focus, #mpConfigModal input[type="password"]:focus {
                border-color: #3498db; outline: none;
            }
            #mpConfigModal .mp-checkbox-container { display: flex; align-items: center; margin-bottom: 20px;}
            #mpConfigModal input[type="checkbox"] { margin-right: 8px; width:auto; height:auto; transform: scale(1.1); }
            #mpConfigModal .mp-checkbox-label { font-weight: normal; margin-bottom:0; font-size: 14px; }
            #mpConfigModal .mp-modal-buttons { text-align: right; margin-top: 25px; }
            #mpConfigModal button {
                padding: 10px 18px; margin-left: 12px; border: none; border-radius: 4px;
                cursor: pointer; font-weight: 600; font-size: 14px; transition: background-color 0.2s;
            }
            #mpConfigModal button.mp-save-btn { background-color: #27ae60; color: white; }
            #mpConfigModal button.mp-save-btn:hover { background-color: #229954; }
            #mpConfigModal button.mp-cancel-btn { background-color: #e74c3c; color: white; }
            #mpConfigModal button.mp-cancel-btn:hover { background-color: #c0392b; }
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Create backdrop
    configModalBackdrop = document.createElement('div');
    configModalBackdrop.id = 'mpConfigModalBackdrop';

    // Create modal
    configModalElement = document.createElement('div');
    configModalElement.id = 'mpConfigModal';

    configModalElement.innerHTML = `
        <h2>配置 Moviepilot 参数</h2>
        <div>
            <label for="mpUrl">Moviepilot 服务器 URL:</label>
            <input type="text" id="mpUrl" value="${GM_getValue('moviepilotUrl', 'http://127.0.0.1:3000')}">
        </div>
        <div>
            <label for="mpUser">用户名:</label>
            <input type="text" id="mpUser" value="${GM_getValue('moviepilotUser', 'admin')}">
        </div>
        <div>
            <label for="mpPass">密码:</label>
            <input type="password" id="mpPass" value="${GM_getValue('moviepilotPassword', '')}">
        </div>
        <div class="mp-checkbox-container">
            <input type="checkbox" id="mpIsTip" ${GM_getValue('isTip', false) ? 'checked' : ''}>
            <label for="mpIsTip" class="mp-checkbox-label">启用划词识别</label>
        </div>
        <div class="mp-modal-buttons">
            <button class="mp-cancel-btn">取消</button>
            <button class="mp-save-btn">保存</button>
        </div>
    `;

    configModalBackdrop.appendChild(configModalElement);
    document.body.appendChild(configModalBackdrop);

    const closeModal = () => {
        if (configModalBackdrop) {
            configModalBackdrop.remove();
        }
        configModalElement = null;
        configModalBackdrop = null;
    };

    configModalElement.querySelector('.mp-save-btn').addEventListener('click', () => {
        GM_setValue('moviepilotUrl', document.getElementById('mpUrl').value.trim());
        GM_setValue('moviepilotUser', document.getElementById('mpUser').value.trim());
        GM_setValue('moviepilotPassword', document.getElementById('mpPass').value); // Passwords might be intentionally empty
        GM_setValue('isTip', document.getElementById('mpIsTip').checked);
        GM_log(`[${scriptName}] 配置已保存。`);
        closeModal();
        alert(`[${scriptName}] 配置已保存。部分更改可能需要刷新页面生效。`);
    });

    configModalElement.querySelector('.mp-cancel-btn').addEventListener('click', () => {
        if (isInitialSetup) {
            alert(`[${scriptName}] 首次配置是必需的。请填写并保存配置。`);
        }
        closeModal();
    });
    
    // Close modal if backdrop is clicked
    configModalBackdrop.addEventListener('click', function(event) {
        if (event.target === configModalBackdrop) {
            if (isInitialSetup) {
                 alert(`[${scriptName}] 首次配置是必需的。请填写并保存配置。`);
            } else {
                closeModal();
            }
        }
    });
}

function resetConfig() {
    const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';
    if (confirm(`[${scriptName}]\n\n确定要重置所有配置吗？\n\n这将清除所有存储的 Moviepilot 设置（包括服务器URL、用户名、密码、划词功能状态和登录Token），并刷新页面。`)) {
        GM_deleteValue('moviepilotUrl');
        GM_deleteValue('moviepilotUser');
        GM_deleteValue('moviepilotPassword');
        GM_deleteValue('isTip');
        GM_deleteValue('moviepilot_token');
        GM_log(`[${scriptName}] 所有配置已重置。正在刷新页面...`);
        alert(`[${scriptName}] 所有配置已重置。页面将刷新。`);
        location.reload();
    }
}

function ensureConfiguration() {
    const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';
    let configInitialized = GM_getValue('config_initialized', true); // 默认设为 true
    let url = GM_getValue('moviepilotUrl');
    let user = GM_getValue('moviepilotUser');

    if (!configInitialized || !url || url.trim() === '' || !user || user.trim() === '') {
        GM_log(`[${scriptName}] 配置未初始化或关键信息缺失，将显示配置弹窗。`);
        showConfigModal(true); // true indicates it's an initial/mandatory setup
    } else {
        GM_log(`[${scriptName}] 配置已加载。Moviepilot URL: ${url}, User: ${user}, 划词识别: ${GM_getValue('isTip', false)}.`);
        GM_log(`[${scriptName}] 如需修改配置，请使用油猴脚本菜单（通常在浏览器右上角的Tampermonkey图标下）。`);
    }
}

// 注册油猴菜单命令
if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand("配置Moviepilot参数", () => showConfigModal(false), "c");
    GM_registerMenuCommand("重置所有配置", resetConfig, "r");
    // You can add GM_unregisterMenuCommand in a cleanup function if needed, e.g. on script unload
} else {
    GM_log("GM_registerMenuCommand is not available in this environment. Menu commands won't be created.");
}

// 脚本启动时检查并确保配置
ensureConfiguration();

// --- END NEW CONFIGURATION LOGIC ---

let type = '';
let torrent_info = { "site": 0, "site_name": "", "site_cookie": "", "site_ua": "", "site_proxy": null, "site_order": null, "title": "", "description": "", "imdbid": null, "enclosure": "", "page_url": "", "size": 0, "seeders": 0, "peers": 0, "grabs": 0, "pubdate": "", "date_elapsed": null, "uploadvolumefactor": 1, "downloadvolumefactor": 0, "hit_and_run": false, "labels": [], "pri_order": 0, "volume_factor": "普通" }

function renderTag(type, string, background_color) {
    if (type == 'common') {
        return `<span style=\"background-color:${background_color};color:#ffffff;border-radius:0;font-size:12px;margin:0 4px 0 0;padding:1px 2px\">${string}</span>`
    } else {
        return `<span class="flex justify-center items-center rounded-md text-[12px] h-[18px] mr-2 px-[5px]  font-bold" style="background-color:${background_color};color:#ffffff;">${string}</span>`
    }
}


function renderMoviepilotTag(type, tag) {
    if (type == "common") {
        if (window.location.href.includes("m-team")){
            return `<th class="ant-descriptions-item-label" colspan="1" style="width: 135px; text-align: right;"><span>MoviePilot</span></th><td class="ant-descriptions-item-content" colspan="1">${tag}</td>`
        }
        return `<td class="rowhead nowrap" valign="top" align="right">MoviePilot</td><td class="rowfollow" valign="top" align="left">${tag}</td>`;
    
    } else {
        return tag
    }
}

function getSize(sizeStr) {
    let match = sizeStr.match(/(\d+\.\d+) (GB|MB|KB)/);
    if (!match) return 0;
    let size = parseFloat(match[1]);
    let unit = match[2].toLowerCase();
    switch (unit) {
        case 'mb':
            return size * 1024 ** 2;
        case 'gb':
            return size * 1024 ** 3;
        case 'tb':
            return size * 1024 ** 4;
        default:
            return 0;
    }
}

function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function login(retryCount = 0) {
    return new Promise(function (resolve, reject) {
        // 每次都重新获取 token，避免 token 失效问题
        const currentMoviepilotUrl = GM_getValue('moviepilotUrl');
        const currentMoviepilotUser = GM_getValue('moviepilotUser');
        const currentMoviepilotPassword = GM_getValue('moviepilotPassword');
        const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';
        const MAX_RETRIES = 3;
        const RETRY_INTERVAL = 1000; // 1秒

        if (!currentMoviepilotUrl || currentMoviepilotUrl.trim() === '' ||
            !currentMoviepilotUser || currentMoviepilotUser.trim() === '' ||
            !currentMoviepilotPassword || currentMoviepilotPassword.trim() === '') {
            alert(`[${scriptName}] Moviepilot 配置不完整！\n\n请确保已正确设置 Moviepilot URL、用户名和密码。\n您可以在油猴脚本的管理界面中找到此脚本，并通过其“存储”标签页进行修改。\n\n如果这是您首次运行该脚本，它会尝试提示您输入这些信息。请刷新页面重试或检查脚本存储。`);
            GM_deleteValue('moviepilot_token');
            reject(new Error('配置不完整或用户未输入'));
            return;
        }

        GM_xmlhttpRequest({
            method: 'POST',
            responseType: 'json',
            url: currentMoviepilotUrl + '/api/v1/login/access-token',
            data: `username=${currentMoviepilotUser}&password=${currentMoviepilotPassword}`,
            headers: {
                "accept": "application/json",
                "content-type": "application/x-www-form-urlencoded"
            },
            onload: (res) => {
                if (res.status === 200 && res.response && res.response.access_token) {
                    GM_setValue('moviepilot_token', res.response.access_token);
                    resolve(res.response.access_token);
                } else {
                    GM_log(`[${scriptName}] 登录失败 (尝试 ${retryCount + 1}/${MAX_RETRIES})，状态码: ${res.status}, 响应: ${JSON.stringify(res.response)}`);
                    GM_deleteValue('moviepilot_token');
                    if (retryCount < MAX_RETRIES - 1) {
                        setTimeout(() => {
                            login(retryCount + 1).then(resolve).catch(reject);
                        }, RETRY_INTERVAL);
                    } else {
                        alert(`[${scriptName}] 登录 Moviepilot 失败！\n\n已尝试 ${MAX_RETRIES} 次。\n请检查您的 Moviepilot URL、用户名和密码配置是否正确。\n服务器返回状态: ${res.status}\nURL: ${currentMoviepilotUrl}`);
                        reject(new Error(`登录失败 (状态 ${res.status})，已达最大重试次数`));
                    }
                }
            },
            onerror: (err) => {
                GM_log(`[${scriptName}] 登录请求错误 (尝试 ${retryCount + 1}/${MAX_RETRIES}):`, err);
                GM_deleteValue('moviepilot_token');
                if (retryCount < MAX_RETRIES - 1) {
                    setTimeout(() => {
                        login(retryCount + 1).then(resolve).catch(reject);
                    }, RETRY_INTERVAL);
                } else {
                    alert(`[${scriptName}] 无法连接到 Moviepilot 服务！\n\n已尝试 ${MAX_RETRIES} 次。\n请检查您的网络连接以及 Moviepilot URL (${currentMoviepilotUrl}) 是否正确且服务正在运行。\n错误详情: ${err.error || '未知网络错误'}`);
                    reject(new Error(`登录请求错误，已达最大重试次数: ${err.error || '未知网络错误'}`));
                }
            }
        });
    });
}

function recognize(token, title, subtitle) {
    return new Promise(function (resolve, reject) {
        const currentMoviepilotUrl = GM_getValue('moviepilotUrl');
        if (!currentMoviepilotUrl || currentMoviepilotUrl.trim() === '') {
             const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';
             GM_log(`[${scriptName}] 识别错误: Moviepilot URL 未配置。`);
             reject(new Error('Moviepilot URL未配置'));
             return;
        }
        GM_xmlhttpRequest({
            url: currentMoviepilotUrl + `/api/v1/media/recognize?title=${title}&subtitle=${subtitle}`,
            method: "GET",
            headers: {
                "user-agent": navigator.userAgent,
                "content-type": "application/json",
                "Authorization": `bearer ${token}`
            },
            responseType: "json",
            onload: (res) => {
                resolve(res.response);
            },
            onerror: (err) => {
                reject(err);
            }
        });
    });
}

function getSite(token) {
    let site_domain = window.location.hostname
    return new Promise(function (resolve, reject) {
        const currentMoviepilotUrl = GM_getValue('moviepilotUrl');
        if (!currentMoviepilotUrl || currentMoviepilotUrl.trim() === '') {
            const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';
            GM_log(`[${scriptName}] 获取站点信息错误: Moviepilot URL 未配置。`);
            reject(new Error('Moviepilot URL未配置'));
            return;
        }
        GM_xmlhttpRequest({
            url: currentMoviepilotUrl + `/api/v1/site/domain/${site_domain}`,
            method: "GET",
            headers: {
                "user-agent": navigator.userAgent,
                "content-type": "application/json",
                "Authorization": `bearer ${token}`
            },
            responseType: "json",
            onload: (res) => {
                if (res.status === 200) {
                    resolve(res.response);
                } else if (res.status === 404) {
                    reject(new Error('站点不存在'));
                } else {
                    reject(new Error('Unexpected status code: ' + res.status));
                }
            },
            onerror: (err) => {
                reject(err);
            }
        });
    });
}


function downloadTorrent(downloadButton, token, media_info, torrent_name, torrent_description, download_link, torrent_size) {
    downloadButton.disabled = true;
    const currentMoviepilotUrl = GM_getValue('moviepilotUrl');
    const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';

    if (!currentMoviepilotUrl || currentMoviepilotUrl.trim() === '') {
        downloadButton.textContent = "Moviepilot URL未配置";
        downloadButton.disabled = false;
        GM_log(`[${scriptName}] 下载错误: Moviepilot URL 未配置。`);
        alert(`[${scriptName}] 无法下载: Moviepilot URL 未配置。\n请检查脚本存储。`);
        return;
    }
    getSite(token).then(data => {
        torrent_info.title = torrent_name
        torrent_info.description = torrent_description
        torrent_info.page_url = window.location.href
        torrent_info.enclosure = download_link
        torrent_info.size = torrent_size
        torrent_info.site = data.id
        torrent_info.site_name = data.name
        torrent_info.site_cookie = data.cookie
        torrent_info.proxy = data.proxy
        // torrent_info.pri_order=data.pri
        torrent_info.pubdate = getFormattedDate()
        torrent_info.site_ua = navigator.userAgent
        let download_info = {
            media_in: media_info,
            torrent_in: torrent_info
        }
        GM_xmlhttpRequest({
            method: 'POST',
            responseType: 'json',
            url: currentMoviepilotUrl + `/api/v1/download/`,
            data: JSON.stringify(download_info),
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "Authorization": `bearer ${token}`
            },
            onload: (res) => {
                GM_log(res.response.data)
                downloadButton.disabled = false;
                if (res.status == 200) {
                    if (res.response.success) {
                        downloadButton.textContent = "下载完成";
                    } else {
                        downloadButton.textContent = "下载失败";
                    }
                } else {
                    downloadButton.textContent = "下载失败";
                }
            }
        })
    }).catch(error => {
        downloadButton.textContent = `站点不存在`;
    });
}

function creatRecognizeRow(row, type, torrent_name, torrent_description, download_link, torrent_size) {
    row.innerHTML = renderMoviepilotTag(type, "识别中");
    if (window.location.href.includes("m-team")){
        row.setAttribute("class", "ant-descriptions-row")
    }
    login().then(token => {
        recognize(token, torrent_name, torrent_description).then(data => {
            GM_log(data.status)
            if (data.media_info) {
                let prefixHtml = '';
                prefixHtml += data.media_info.type ? renderTag(type, data.media_info.type, '#2775b6') : '';
                prefixHtml += data.media_info.category ? renderTag(type, data.media_info.category, '#2775b6') : '';

                // const controlsFlexContainerStart = '<div class="mp-controls-container" style="display: flex; align-items: center; gap: 5px;">'; // Flex container removed
                let titleHtml = '';
                if (data.media_info.title) {
                    const titleText = data.media_info.title;
                    const titleBgColor = '#c54640';
                    // Added user-select: none to prevent text selection on click
                    const commonStyle = `background-color:${titleBgColor};color:#ffffff;border-radius:0;font-size:12px;margin:0 4px 0 0;padding:1px 2px; cursor: pointer; text-decoration: underline; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; display: inline-block; vertical-align: top; margin-right: 5px;`; // Added display, vertical-align, and margin-right for spacing
                    const flexStyleBase = `background-color:${titleBgColor};color:#ffffff; cursor: pointer; text-decoration: underline; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; display: inline-block; vertical-align: top;`; // Added display, vertical-align. Margin is handled by existing 'mr-2' class on the span.

                    if (type === 'common') {
                        titleHtml = `<span class="mp-clickable-title" style="${commonStyle}">${titleText}</span>`;
                    } else {
                        titleHtml = `<span class="mp-clickable-title flex justify-center items-center rounded-md text-[12px] h-[18px] mr-2 px-[5px] font-bold" style="${flexStyleBase}">${titleText}</span>`;
                    }
                }

                let downloadButtonHtml = '';
                if (!window.location.href.includes("m-team")) {
                    if (type === 'common') { // Matches original logic for button styling based on 'type'
                        downloadButtonHtml = '<button id="download-button" style="display: inline-block; vertical-align: top;">下载种子</button>';
                    } else {
                        // Ensure button itself is inline-block. Removed "flex" from class.
                        downloadButtonHtml = '<button id="download-button" class="justify-center items-center rounded-md text-[12px] h-[18px] mr-2 px-[5px] font-bold" style="background-color:#cdae9c;color:#ffffff; display: inline-block; vertical-align: top;">下载种子</button>';
                    }
                }
                // const controlsFlexContainerEnd = '</div>'; // Flex container removed

                let suffixHtml = '';
                suffixHtml += data.meta_info.season_episode ? renderTag(type, data.meta_info.season_episode, '#e6702e') : '';
                suffixHtml += data.meta_info.year ? renderTag(type, data.meta_info.year, '#e6702e') : '';
                suffixHtml += data.media_info.tmdb_id ? '<a href="' + data.media_info.detail_link + '" target="_blank">' + renderTag(type, data.media_info.tmdb_id, '#5bb053') + '</a>' : '';
                suffixHtml += data.meta_info.resource_type ? renderTag(type, data.meta_info.resource_type, '#677489') : '';
                suffixHtml += data.meta_info.resource_pix ? renderTag(type, data.meta_info.resource_pix, '#677489') : '';
                suffixHtml += data.meta_info.video_encode ? renderTag(type, data.meta_info.video_encode, '#677489') : '';
                suffixHtml += data.meta_info.audio_encode ? renderTag(type, data.meta_info.audio_encode, '#677489') : '';
                suffixHtml += data.meta_info.resource_team ? renderTag(type, data.meta_info.resource_team, '#701eeb') : '';
                
                const finalHtml = downloadButtonHtml + prefixHtml + titleHtml + suffixHtml; // Removed flex container variables
                row.innerHTML = renderMoviepilotTag(type, finalHtml);

                // Event Listeners
                const titleElement = row.querySelector('.mp-clickable-title');
                if (titleElement && data.media_info.title) { // Ensure title and its data exist
                    titleElement.addEventListener('click', function(event) {
                        event.stopPropagation(); // Prevent potential parent handlers
                        GM_setClipboard(data.media_info.title);
                        
                        // Visual feedback
                        const originalDisplayTitle = titleElement.textContent; // Store current text for restoration
                        titleElement.textContent = '已复制!';
                        setTimeout(() => {
                            titleElement.textContent = data.media_info.title; // Restore original title from data
                        }, 1500);
                    });
                }

                // Safely attach download button listener if it exists
                if (!window.location.href.includes("m-team")) {
                    const downloadButton = row.querySelector('#download-button');
                    if (downloadButton) { // Check if the button was actually found in the row
                        downloadButton.addEventListener("click", function () {
                            downloadTorrent(downloadButton, token, data.media_info, torrent_name, torrent_description, download_link, torrent_size);
                        });
                    }
                }
            } else {
                row.innerHTML = renderMoviepilotTag(type, `识别失败`);
            }
        }).catch(error => {
            row.innerHTML = renderMoviepilotTag(type, `识别失败`);
        });
    }).catch(error => {
        GM_deleteValue('moviepilot_token');
        const currentMoviepilotUrl = GM_getValue('moviepilotUrl');
        const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';
        GM_log(`[${scriptName}] 渲染行时登录失败:`, error);
        row.innerHTML = renderMoviepilotTag(type, `登录 ${currentMoviepilotUrl || 'Moviepilot'} 失败. Error: ${error.message}`);
    });
}

function creatRecognizeTip(tip, text) {
    tip.showText(`识别中`);
    login().then(token => {
        GM_log(text);
        recognize(token, encodeURIComponent(text), '').then(data => {
            GM_log(data.status)
            if (data.media_info) {
                let html = '';
                html += data.media_info.type ? `类型：${data.media_info.type}<br>` : '';
                html += data.media_info.category ? `分类：${data.media_info.category}<br>` : '';
                html += data.media_info.title ? `标题：${data.media_info.title}<br>` : '';
                html += data.meta_info.season_episode ? `季集：${data.meta_info.season_episode}<br>` : '';
                html += data.meta_info.year ? `年份：${data.media_info.year}<br>` : '';
                html += data.meta_info.resource_team ? `制作：${data.meta_info.resource_team}<br>` : '';
                html += data.media_info.tmdb_id ? 'tmdb：<a href="' + data.media_info.detail_link + '" target="_blank">' + data.media_info.tmdb_id + '</a>' : 'tmdb：未识别';
                tip.showText(html);
            } else {
                tip.showText(`识别失败`);
            }
        }).catch(error => {
            tip.showText(`识别失败`);
        });
    }).catch(error => {
        const currentMoviepilotUrl = GM_getValue('moviepilotUrl');
        const scriptName = (GM_info && GM_info.script) ? GM_info.script.name : 'Moviepilot Script';
        GM_log(`[${scriptName}] 渲染提示时登录失败:`, error);
        tip.showText(`登录 ${currentMoviepilotUrl || 'Moviepilot'} 失败. Error: ${error.message}`);
    });
}

function mutation_observer(target, className ,func ) {
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    const observer = new MutationObserver((mutationList) => {
        mutationList.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node && node.classList && node.classList.contains(className)) {
                        func();
                        observer.disconnect();
                    }
                });
            }
        });
    });
    
    observer.observe(target, { childList: true, subtree: true });
}

function insertMpRow(){
    let rows = document.querySelectorAll('.rowhead, .ant-descriptions-item-label');
    let divs = document.getElementsByClassName('font-bold leading-6');
    if (rows.length) {
        let type = 'common'
        let torrent_name = ''
        let download_link = ''
        let torrent_description = ''
        let torrent_size = ''
        if (window.location.href.includes('hdsky')) {
            torrent_name = rows[0].nextElementSibling.firstElementChild.firstElementChild.value;
            download_link = rows[1].nextElementSibling.firstElementChild.href;
            torrent_description = rows[2].nextElementSibling.innerText;
            torrent_size = getSize(rows[3].nextElementSibling.innerText);
        } else if (window.location.href.includes('totheglory')) {
            torrent_name = rows[0].nextElementSibling.firstElementChild.nextElementSibling.text;
            let tds = document.getElementsByClassName('heading');
            download_link = tds[0].nextElementSibling.firstElementChild.href
            torrent_size = getSize(tds[5].nextElementSibling.innerText);
        } else if (window.location.href.includes('m-team')) {
            torrent_name = rows[0].nextElementSibling.firstElementChild.firstElementChild.firstElementChild.firstElementChild.text.replace(/\.torrent$/, '');;
            download_link = rows[1].nextElementSibling.firstElementChild.href;
            torrent_description = rows[1].nextElementSibling.innerText;
            torrent_size = getSize(rows[2].nextElementSibling.innerText);
        } 
        else {
            torrent_name = rows[0].nextElementSibling.firstElementChild.text;
            download_link = rows[0].nextElementSibling.firstElementChild.href;
            torrent_description = rows[1].nextElementSibling.innerText;
            torrent_size = getSize(rows[2].nextElementSibling.innerText);
        }
        GM_log(torrent_name);
        GM_log(download_link);
        GM_log(torrent_description);
        GM_log(torrent_size);
        let table = rows[0].parentNode.parentNode.parentNode;
        let row = table.insertRow(2);
        if (torrent_name) {
            creatRecognizeRow(row, type, torrent_name, torrent_description, download_link, torrent_size)
        }
    } else if (divs.length) {
        let torrent_index_div = document.querySelector('a.index');
        let torrent_name = torrent_index_div.textContent;
        let torrent_description = divs[3].innerText;
        let download_link = torrent_index_div.href;
        let torrent_size = getSize(divs[5].nextElementSibling.innerText);
        if (torrent_name) {
            divs[3].insertAdjacentHTML('afterend', '<div class="font-bold leading-6">moviepilot</div><div class="font-light leading-6 flex flex-wrap"><div id="moviepilot" class="font-light leading-6 flex"></div></div>');
            let row = document.getElementById("moviepilot");
            creatRecognizeRow(row, type, torrent_name, torrent_description, download_link, torrent_size)
        }
    }
}

(function () {
    'use strict';
    const enableTipFeature = GM_getValue('isTip'); // 获取配置
    // 结果面板
    if (enableTipFeature) {
        class RecognizeTip {
            constructor() {
                const div = document.createElement('div');
                div.hidden = true;
                div.setAttribute('style',
                    `position:absolute!important;
                font-size:13px!important;
                overflow:auto!important;
                background:#fff!important;
                font-family:sans-serif,Arial!important;
                font-weight:normal!important;
                text-align:left!important;
                color:#000!important;
                padding:0.5em 1em!important;
                line-height:1.5em!important;
                border-radius:5px!important;
                border:1px solid #ccc!important;
                box-shadow:4px 4px 8px #888!important;
                max-width:350px!important;
                max-height:216px!important;
                z-index:2147483647!important;`
                );
                document.documentElement.appendChild(div);
                //点击了内容面板，不再创建图标
                div.addEventListener('mouseup', e => e.stopPropagation());
                this._tip = div;
            }
            showText(text) { //显示测试结果
                this._tip.innerHTML = text;
                this._tip.hidden = !1;
            }
            hide() {
                this._tip.innerHTML = '';
                this._tip.hidden = true;
            }
            pop(ev) {
                this._tip.style.top = ev.pageY + 'px';
                //面板最大宽度为350px
                this._tip.style.left = (ev.pageX + 350 <= document.body.clientWidth ?
                    ev.pageX : document.body.clientWidth - 350) + 'px';
            }
        }
        const tip = new RecognizeTip();

        class Icon {
            constructor() {
                const icon = document.createElement('span');
                icon.hidden = true;
                icon.innerHTML = `<svg style="margin:4px !important;" width="16" height="16" viewBox="0 0 24 24">
                            <path d="M12 2L22 12L12 22L2 12Z" style="fill:none;stroke:#3e84f4;stroke-width:2;"></path></svg>`;
                icon.setAttribute('style',
                    `width:24px!important;
                height:24px!important;
                background:#fff!important;
                border-radius:50%!important;
                box-shadow:4px 4px 8px #888!important;
                position:absolute!important;
                z-index:2147483647!important;`
                );
                document.documentElement.appendChild(icon);
                //拦截二个鼠标事件，以防止选中的文本消失
                icon.addEventListener('mousedown', e => e.preventDefault(), true);
                icon.addEventListener('mouseup', ev => ev.preventDefault(), true);
                icon.addEventListener('click', ev => {
                    if (ev.ctrlKey) navigator.clipboard.readText()
                        .then(text => {
                            this.queryText(text.trim(), ev);
                        })
                        .catch(err => {
                            console.error('Failed to read contents: ', err);
                        });
                    else {
                        const text = window.getSelection().toString().trim().replace(/\s{2,}/g, ' ');
                        this.queryText(text, ev);
                    }
                });
                this._icon = icon;
            }
            pop(ev) {
                const icon = this._icon;
                icon.style.top = ev.pageY + 9 + 'px';
                icon.style.left = ev.pageX + -18 + 'px';
                icon.hidden = !1;
                setTimeout(this.hide.bind(this), 2e3);
            }
            hide() {
                this._icon.hidden = true;
            }
            queryText(text, ev) {
                if (text) {
                    this._icon.hidden = true;
                    tip.pop(ev);
                    creatRecognizeTip(tip, text);
                }
            }
        }

        const icon = new Icon();
        document.addEventListener('mouseup', function (e) {
            var text = window.getSelection().toString().trim();
            GM_log(text);
            if (!text) {
                icon.hide();
                tip.hide();
            }
            else icon.pop(e);
        });
    }
    if (window.location.href.includes('m-team')) {
        mutation_observer(document.body, 'ant-descriptions-row', function() {
            insertMpRow();
        });
    } else{
        insertMpRow();
    }

})();

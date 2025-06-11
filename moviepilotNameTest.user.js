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
// @icon         data:image/png;base64,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
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
        // Optionally, re-run checks or re-initialize parts of the script if needed immediately
        // For example, re-check login if URL/credentials changed.
    });

    configModalElement.querySelector('.mp-cancel-btn').addEventListener('click', () => {
        if (isInitialSetup) {
            alert(`[${scriptName}] 首次配置是必需的。请填写并保存配置。`);
            // For initial setup, "Cancel" might not be truly allowed or should warn sternly.
            // Or, keep the modal open. For now, it will close.
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
    // Password check is tricky as it can be empty. URL and User are more critical for "initialized" state.

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
        const storedToken = GM_getValue('moviepilot_token');
        if (storedToken) {
            resolve(storedToken);
            return;
        }

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
                
                const finalHtml = prefixHtml + titleHtml + downloadButtonHtml + suffixHtml; // Removed flex container variables
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

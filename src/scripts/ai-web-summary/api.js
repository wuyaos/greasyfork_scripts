import { CONFIG } from './config.js';



function getFullEndpoint(baseUrl) {
        if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
            console.error("Base URL is not configured or invalid.");
            return null;
        }
        const trimmedBaseUrl = baseUrl.trim();
        if (trimmedBaseUrl.includes('#')) {
            return trimmedBaseUrl.replace('#', '');
        } else if (trimmedBaseUrl.endsWith('/')) {
            return trimmedBaseUrl + 'v1/chat/completions';
        } else {
            return trimmedBaseUrl + '/v1/chat/completions';
        }
    }

function getPageContent() {
        const title = document.title;
        const content = document.body.innerText;
        return { title, content };
    }

async function fetchModels() {
        if (!CONFIG.BASE_URL) {
            console.error("BASE_URL is not configured. Cannot fetch models.");
            throw new Error('BASE_URL 未配置，无法获取模型列表');
        }
        if (!CONFIG.API_KEY) {
            console.error('API Key is not configured. Cannot fetch models.');
            throw new Error('API Key未配置，无法获取模型列表');
        }

    let chatCompletionsUrl = getFullEndpoint(CONFIG.BASE_URL);
    if (!chatCompletionsUrl) {
        throw new Error('无法构造有效的API端点路径 (Base URL可能配置错误)');
    }

    const endpoint = chatCompletionsUrl.replace('/v1/chat/completions', '/v1/models');

    try {
        const response = await GM.xmlHttpRequest({
            method: 'GET',
            url: endpoint,
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        if (response.status === 200) {
            const responseData = JSON.parse(response.responseText);
            if (responseData.data && Array.isArray(responseData.data)) {
            return responseData.data.filter(m => m.id && typeof m.id === 'string');
            } else if (Array.isArray(responseData) && responseData.every(item => item && typeof item.id === 'string')) {
                return responseData.filter(m => m.id && typeof m.id === 'string');
            }
            else {
                console.error('模型加载失败: 响应数据格式不符合预期', responseData);
                throw new Error('API返回的模型列表数据格式不正确');
            }
            } else {
            let errorDetail = `HTTP状态码 ${response.status}: ${response.statusText}`;
            try {
                const errorResponse = JSON.parse(response.responseText);
                if (errorResponse.error && errorResponse.error.message) {
                errorDetail = `API错误 (${response.status}): ${errorResponse.error.message}`;
                } else if (typeof errorResponse === 'string') {
                errorDetail = `API错误 (${response.status}): ${errorResponse}`;
                }
            } catch (parseError) {
                console.error('解析获取模型列表的错误响应失败:', parseError);
            }
            console.error('模型加载失败:', errorDetail);
            throw new Error(errorDetail);
        }
    } catch (error) {
        console.error('Detailed fetch error:', {
            message: error.message,
            stack: error.stack,
            config: {
                BASE_URL: CONFIG.BASE_URL,
                endpoint: endpoint
            }
        });
        throw error;
    }
    }



export { fetchModels, getFullEndpoint, getPageContent };

// V2 返回业务对象；V3 业务接口多包裹一层 { success, message, data }。
// 登录仍可能返回裸 Token。只拆明确的 envelope，保留数组、null 和业务对象中的 data 字段。
function readMoviePilotResponse(payload, status = 200) {
    const httpSuccess = status >= 200 && status < 300;
    if (!httpSuccess || payload?.success === false) {
        const message = typeof payload?.message === 'string' && payload.message
            ? payload.message
            : (typeof payload?.detail === 'string' ? payload.detail : '');
        const error = new Error(message || (httpSuccess ? 'MoviePilot 请求失败' : `HTTP Error ${status}`));
        error.status = status;
        throw error;
    }
    if (payload?.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
        return payload.data;
    }
    return payload;
}

export { readMoviePilotResponse };

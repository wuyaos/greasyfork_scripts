

function requestText(url) {
        const fullUrl = `${url}?_local_debug_ts=${Date.now()}`;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: fullUrl,
                headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
                responseType: 'text',
                onload: response => {
                    if (response.status >= 200 && response.status < 300) resolve(String(response.responseText || response.response || ''));
                    else reject(new Error(`HTTP ${response.status}`));
                },
                onerror: reject,
                ontimeout: () => reject(new Error('timeout'))
            });
        });
    }



export { requestText };

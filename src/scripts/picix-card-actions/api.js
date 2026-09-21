

function getPageApi() {
    try {
      const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      return win.document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$api || null;
    } catch (_) { return null; }
  }

async function callApi(path, body) {
    const api = getPageApi();
    if (!api) return { success: false, msg: '页面未就绪，请刷新后重试' };
    try {
      const res = await api.post(path, body); // axios baseURL=/api
      return res?.data ?? { success: true }; // 成功 res 可能 null
    } catch (e) {
      return e?.response?.data || { success: false, msg: e?.message || '请求失败' };
    }
  }

const detailCache = new Map();

async function fetchDetail(movieId) {
    if (detailCache.has(movieId)) return detailCache.get(movieId);
    const api = getPageApi();
    const empty = { tags: [], isUnlock: null, isFavorite: null };
    if (!api) { detailCache.set(movieId, empty); return empty; }
    try {
      const res = await api.get(`Movies/detail?movieId=${movieId}`, { timeout: 30000 });
      const d = res?.data ?? res; // 兼容 res 为 axios response 或直接为 data
      const info = {
        tags: (d?.tags || []).map(t => ({ id: t.id, name: t.zhName || t.jaName })).filter(t => t.name),
        isUnlock: d?.isUnlock ?? null,
        isFavorite: d?.isFavorite ?? null
      };
      detailCache.set(movieId, info);
      return info;
    } catch (_) { detailCache.set(movieId, empty); return empty; }
  }



export { callApi, fetchDetail };

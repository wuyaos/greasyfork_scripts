import { getTorrentId, gmRequest } from './page.js';

import { ApprovalRegistry } from './registries.js';



function registerApprovalRegistration() {
ApprovalRegistry.register('nexusPhpTokenPost', {
    async run(ctx, site) {
      const id = getTorrentId();
      if (!id) return { ok: false, message: '无法获取种子 ID' };
      const origin = location.origin;
      const pageUrl = site.approval.pageUrl ? site.approval.pageUrl(id, origin) : `${origin}/web/torrent-approval-page?torrent_id=${encodeURIComponent(id)}`;
      const submitUrl = site.approval.submitUrl ? site.approval.submitUrl(id, origin) : `${origin}/web/torrent-approval`;
      const page = await gmRequest({ method: 'GET', url: pageUrl, timeout: 15000 });
      if (page.status < 200 || page.status >= 300) return { ok: false, message: `审批页请求失败（HTTP ${page.status}）` };
      const doc = new DOMParser().parseFromString(page.responseText || '', 'text/html');
      const token = doc.querySelector('input[name="_token"]')?.getAttribute('value') || '';
      if (!token) return { ok: false, message: '审批页未找到 CSRF token' };
      const body = `_token=${encodeURIComponent(token)}&torrent_id=${encodeURIComponent(id)}&approval_status=1&comment=${encodeURIComponent('PT_AuditAssistant local check passed')}`;
      const res = await gmRequest({ method: 'POST', url: submitUrl, data: body, headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Accept': 'application/json, text/plain, */*' }, timeout: 15000 });
      if (res.status < 200 || res.status >= 300) return { ok: false, message: `审批提交失败（HTTP ${res.status}）` };
      try {
        const data = JSON.parse(res.responseText || '{}');
        if (data && (data.success === true || data.status === true || data.code === 0 || data.ret === 0)) return true;
        return { ok: false, message: data?.message || data?.msg || data?.error || '审批接口未返回成功状态' };
      } catch (err) {
        return { ok: false, message: '审批接口返回非 JSON 响应' };
      }
    }
  });
}



export { registerApprovalRegistration };

import { AUTO_APPROVAL_KEY, AUTO_CLOSE_KEY } from './config.js';

import { getValue } from './page.js';

import { ApprovalRegistry } from './registries.js';



const ApprovalGate = {
    async handle(ctx, site) {
      const errors = ctx.findings.filter(f => f.severity === 'error');
      const warnings = ctx.findings.filter(f => f.severity === 'warning');
      if (errors.length) {
        alert(`本地检查发现 ${errors.length} 个错误，已阻止一键通过。`);
        return false;
      }
      if (warnings.length && !confirm(`本地检查发现 ${warnings.length} 个警告，是否继续放行？`)) return false;
      if (!site.approval?.enabled || !getValue(site.approval.modeStorageKey || AUTO_APPROVAL_KEY, false)) {
        alert('本地检查通过，请人工在审核页确认');
        return true;
      }
      const adapter = ApprovalRegistry.get(site.approval.adapter || 'nexusPhpTokenPost');
      if (!adapter) {
        alert('本地检查通过，但未找到自动审批适配器，请人工在审核页确认');
        return false;
      }
      try {
        const result = await adapter.run(ctx, site);
        const ok = result === true || result?.ok === true;
        alert(ok ? '自动审批已提交' : `自动审批失败：${result?.message || '请人工在审核页确认'}`);
        if (ok && getValue(AUTO_CLOSE_KEY, false)) window.close();
        return ok;
      } catch (err) {
        console.warn('PT_AuditAssistant approval failed', err);
        alert(`自动审批失败：${err && err.message ? err.message : '请人工在审核页确认'}`);
        return false;
      }
    }
  };



export { ApprovalGate };

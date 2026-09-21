import { AUTO_APPROVAL_KEY, AUTO_CLOSE_KEY, DEBUG_KEY, DEFAULT_COLLECTORS, DEFAULT_PARSERS } from './config.js';

import { getValue, lower, setValue } from './page.js';

import { CollectorRegistry, ParserRegistry, RuleRegistry, SiteRegistry, createContext } from './registries.js';

import { Renderer } from './renderer.js';

import { registerAllSites } from './sites.js';

import { registerCollectors } from './collectors.js';

import { registerParsers } from './parsers.js';

import { registerRules } from './rules.js';

import { registerApprovalRegistration } from './approval-registration.js';



function registerMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    GM_registerMenuCommand(`${getValue(AUTO_APPROVAL_KEY, false) ? '关闭' : '开启'}自动审批（默认关）`, () => { setValue(AUTO_APPROVAL_KEY, !getValue(AUTO_APPROVAL_KEY, false)); location.reload(); });
    GM_registerMenuCommand(`${getValue(AUTO_CLOSE_KEY, false) ? '关闭' : '开启'}自动关闭页面`, () => { setValue(AUTO_CLOSE_KEY, !getValue(AUTO_CLOSE_KEY, false)); location.reload(); });
    GM_registerMenuCommand(`${getValue(DEBUG_KEY, false) ? '关闭' : '开启'}显示调试信息(ctx 快照)`, () => { setValue(DEBUG_KEY, !getValue(DEBUG_KEY, false)); location.reload(); });
  }

async function boot() {
    registerAllSites();
    registerMenu();
    const site = SiteRegistry.detect();
    if (!site) return;
    Renderer.init();
    const ctx = createContext();
    try {
      await CollectorRegistry.run(site.collectors || DEFAULT_COLLECTORS, ctx, site);
      ParserRegistry.run(site.parsers || DEFAULT_PARSERS, ctx, site);
      ctx.findings = RuleRegistry.run(site.rules || [], ctx, site);
      Renderer.render(ctx, site);
      Renderer.injectApprovalButtons(ctx, site);
    } catch (err) {
      console.warn('PT_AuditAssistant boot failed', err);
      ctx.findings = [{ severity: 'warning', code: 'BOOT_FAILED', message: `脚本执行失败：${err && err.message ? err.message : err}` }];
      Renderer.render(ctx, site);
    }
  }

function bootstrap() {
SiteRegistry.detect = function detect() {
    const host = location.hostname.toLowerCase();
    const path = location.pathname.toLowerCase();
    return this.list().map(id => this.get(id)).find(site => site.hosts.some(h => host === h || host.endsWith(`.${h}`)) && site.paths.some(p => p.test(path)));
  };

CollectorRegistry.run = async function runCollectors(ids, ctx, site) {
    const results = [];
    for (const id of (ids || this.list())) {
      const item = this.get(id);
      if (!item) continue;
      const out = await (item.run ? item.run(ctx, site) : item(ctx, site));
      if (Array.isArray(out)) results.push(...out);
    }
    return results;
  };

RuleRegistry.run = function runRules(bindings, ctx, site) {
    const findings = [];
    const suppressed = new Set();
    (site.suppressions || []).forEach(s => {
      const ids = s.when?.categoryIds || [];
      const texts = s.when?.categoryTexts || [];
      const categoryId = ctx.siteMeta.categoryId;
      const categoryText = ctx.siteMeta.categorySelected;
      if ((ids.length && categoryId && ids.includes(categoryId)) || (texts.length && categoryText && texts.some(v => lower(categoryText).includes(lower(v))))) {
        (bindings || []).forEach(b => { if (!(s.exceptRules || []).includes(b.id)) suppressed.add(b.id); });
      }
    });
    (bindings || []).forEach(binding => {
      if (!binding || binding.enabled === false || suppressed.has(binding.id)) return;
      const rule = this.get(binding.id);
      if (!rule) {
        findings.push({ severity: 'warning', code: 'RULE_UNKNOWN', message: `未知规则：${binding.id}` });
        return;
      }
      const out = rule.run(ctx, site, binding.params || {}, binding) || [];
      findings.push(...out.map(f => Object.assign({}, f, { severity: binding.severity || f.severity || 'error' })));
    });
    return findings;
  };

registerCollectors();

registerParsers();

registerRules();

registerApprovalRegistration();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}



export { bootstrap };

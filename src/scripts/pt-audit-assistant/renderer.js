import { DEBUG_KEY, ID } from './config.js';

import { $, addStyle, el, getValue } from './page.js';

import { ApprovalGate } from './approval.js';



const Renderer = {
    init() {
      addStyle(`
#${ID}-panel{font-size:13px;line-height:1.55;border-radius:6px;box-shadow:0 0 10px rgba(0,0,0,.35);padding:10px 14px;margin:8px 0;border:1px solid rgba(0,0,0,.18);background:#f6fff6;color:#1b5e20;z-index:9999;max-width:980px}
#${ID}-panel.ptaa-error{background:#ffebee;color:#8a1111;border-color:#f44336}#${ID}-panel.ptaa-warning{background:#fff8db;color:#5f4300;border-color:#ffca28}#${ID}-panel .ptaa-title{font-weight:700;margin-bottom:6px}#${ID}-panel ul{margin:6px 0 6px 20px;padding:0}#${ID}-panel li{margin:2px 0}#${ID}-panel .ptaa-disclaimer{font-size:12px;opacity:.78;margin-top:6px}.ptaa-debug{white-space:pre-wrap;max-height:280px;overflow:auto;background:rgba(0,0,0,.06);padding:8px;border-radius:4px;margin-top:8px}`);
    },
    render(ctx, site) {
      const errors = ctx.findings.filter(f => f.severity === 'error');
      const warnings = ctx.findings.filter(f => f.severity === 'warning');
      const cls = errors.length ? 'ptaa-error' : (warnings.length ? 'ptaa-warning' : 'ptaa-ok');
      const title = errors.length ? `检测到 ${errors.length} 个错误` : (warnings.length ? `检测到 ${warnings.length} 个警告` : '此种子未检测到错误');
      const panel = el('div', { id: `${ID}-panel`, class: cls }, el('div', { class: 'ptaa-title', text: `PT_AuditAssistant：${title}` }));
      if (ctx.findings.length) {
        const ul = el('ul');
        ctx.findings.forEach(f => ul.appendChild(el('li', { text: `[${f.severity}] ${f.code}：${f.message}` })));
        panel.appendChild(ul);
      }
      panel.appendChild(el('div', { class: 'ptaa-disclaimer', text: '非站点官方工具，检测结果仅作辅助参考，请以站点规则与人工判断为准。' }));
      if (getValue(DEBUG_KEY, false)) panel.appendChild(el('pre', { class: 'ptaa-debug', text: JSON.stringify(snapshotContext(ctx), null, 2) }));
      const old = $(`#${ID}-panel`);
      if (old) old.remove();
      const top = $('#top');
      const outer = $('#outer');
      if (site.reviewInfoPosition === 1 && outer) outer.prepend(panel);
      else if (site.reviewInfoPosition === 2 && top) top.insertAdjacentElement('afterend', panel);
      else if (site.reviewInfoPosition === 3 && top) top.insertAdjacentElement('beforebegin', panel);
      else (outer || document.body).prepend(panel);
    },
    injectApprovalButtons(ctx, site) {
      // 不主动注入「一键通过」按钮，只对原生审核链接绑定拦截门（若存在）。
      if (ctx.approval.nativeReviewLink) {
        ctx.approval.nativeReviewLink.addEventListener('click', ev => {
          ev.preventDefault();
          ApprovalGate.handle(ctx, site).then(ok => {
            if (ok && !site.approval?.enabled && ctx.approval.nativeReviewLink.href) location.href = ctx.approval.nativeReviewLink.href;
          });
        }, true);
      }
    }
  };

function snapshotContext(ctx) {
    const copy = JSON.parse(JSON.stringify(ctx, (key, value) => key === 'actionContainer' || key === 'nativeReviewLink' || key === 'images' ? undefined : value));
    copy.tags.normalized = Array.from(ctx.tags.normalized || []);
    return copy;
  }



export { Renderer };

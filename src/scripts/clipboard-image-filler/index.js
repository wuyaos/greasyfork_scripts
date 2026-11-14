'use strict';

const ADD_BTN_WAIT_MS = 80;
const MAX_ADD_CLICKS = 50;
const PANEL_ID = 'cbif-panel';

function parseImageUrls(text) {
  if (!text) return [];
  const found = [];
  const seen = new Set();
  const push = (url) => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return;
    const key = u.replace(/\/$/, '');
    if (seen.has(key)) return;
    seen.add(key);
    found.push(u);
  };
  // 1) [url=..][img]URL[/img][/url] / [img=..]URL[/img]
  const bbcode = /(?:\[url=([^\]]+)\]\s*)?\[img(?:=[^\]]*)?\]([^\[\]]+?)\[\/img\](?:\s*\[\/url\])?/gi;
  let m;
  while ((m = bbcode.exec(text)) !== null) {
    const inner = (m[2] || '').trim();
    if (inner) push(inner);
  }
  // 2) 剩余文本中的裸 URL（任意域名，仅收图片扩展名，避免把普通链接当截图）
  const withoutBbcode = text.replace(bbcode, ' ');
  const bare = /https?:\/\/[^\s"'<>\[\]()]+/gi;
  while ((m = bare.exec(withoutBbcode)) !== null) {
    const url = m[0].replace(/[.,;:）]+$/, '');
    if (/\.(png|jpe?g|webp|gif|bmp|avif)(\?|#|$)/i.test(url)) push(url);
  }
  return found;
}

function setVueInputValue(el, val) {
  if (!el) return false;
  const proto = window.HTMLInputElement.prototype;
  const setter =
    Object.getOwnPropertyDescriptor(proto, 'value')?.set ||
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
  if (setter) setter.call(el, String(val));
  else el.value = String(val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getClipboardText() {
  if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    return (await navigator.clipboard.readText()) || '';
  }
  throw new Error('当前浏览器/环境不支持读取剪贴板');
}

async function getAddrContainer() {
  for (let i = 0; i < 20; i++) {
    const c = document.querySelector('.screenshot-addresses');
    if (c) return c;
    await sleep(200);
  }
  return null;
}

function findAddBtn(addrContainer) {
  return Array.from(addrContainer.querySelectorAll('button[type="button"]')).find((b) =>
    b.textContent.includes('添加截图地址'),
  );
}

function getAllInputs(addrContainer) {
  return Array.from(addrContainer.querySelectorAll('input[type="url"]'));
}

async function fillScreenshots(urls) {
  const addrContainer = await getAddrContainer();
  if (!addrContainer) throw new Error('未找到截图地址区域 (.screenshot-addresses)');

  // 覆盖模式：先清空所有已填的截图地址
  getAllInputs(addrContainer).forEach((inp) => setVueInputValue(inp, ''));

  // 按图片数量补足输入框：现有框不够时逐次点「添加截图地址」
  let addClicks = 0;
  while (getAllInputs(addrContainer).length < urls.length && addClicks < MAX_ADD_CLICKS) {
    const addBtn = findAddBtn(addrContainer);
    if (!addBtn) break;
    addBtn.click();
    addClicks++;
    await sleep(ADD_BTN_WAIT_MS);
  }

  const inputs = getAllInputs(addrContainer);
  urls.forEach((url, i) => {
    if (inputs[i]) setVueInputValue(inputs[i], url);
  });
  return inputs.length;
}

function toast(msg, ok = true) {
  const id = 'cbif-toast';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = ok ? 'rgba(30,160,90,.95)' : 'rgba(200,60,60,.95)';
  el.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.opacity = '0'), 3000);
}

async function runFill(text, sourceLabel) {
  const urls = parseImageUrls(text);
  if (!urls.length) {
    toast(`${sourceLabel}中未解析到图片地址`, false);
    return;
  }
  const total = await fillScreenshots(urls);
  toast(`已覆盖填入 ${urls.length} 张截图（截图输入框共 ${total} 个）`);
}

// —— 样式对齐页面：优先复用页面已有按钮/输入框的 class 与设计变量 ——
function pickPageButtonClass() {
  const addrContainer = document.querySelector('.screenshot-addresses');
  const addBtn = addrContainer ? findAddBtn(addrContainer) : null;
  if (addBtn && addBtn.className && !/cola-af/.test(addBtn.className)) return addBtn.className;
  // Cola 转种助手存在时复用其 mini 按钮 class
  const mini = document.querySelector('.cola-af-mini-btn');
  if (mini) return mini.className;
  return '';
}

function pickPageInputClass() {
  const input = document.querySelector('.screenshot-addresses input[type="url"]');
  return input ? input.className || '' : '';
}

function pickPageColors() {
  const cs = getComputedStyle(document.body);
  const addrContainer = document.querySelector('.screenshot-addresses');
  const addBtn = addrContainer ? addrContainer.querySelector('button[type="button"]') : null;
  const input = addrContainer ? addrContainer.querySelector('input[type="url"]') : null;
  const btnCs = addBtn ? getComputedStyle(addBtn) : null;
  const inputCs = input ? getComputedStyle(input) : null;
  const solid = (c) => c && c !== 'rgba(0, 0, 0, 0)';
  return {
    accent: btnCs ? btnCs.color || '' : '',
    text: solid(inputCs && inputCs.color) ? inputCs.color : cs.color || '',
    border: inputCs
      ? `${inputCs.borderWidth || '1px'} ${inputCs.borderStyle || 'solid'} ${inputCs.borderColor || 'rgba(0,0,0,.15)'}`
      : '1px solid rgba(0,0,0,.15)',
    radius: btnCs ? btnCs.borderRadius || '6px' : '6px',
    btnBg: btnCs && solid(btnCs.backgroundColor) ? btnCs.backgroundColor : '',
    btnText: btnCs ? btnCs.color || '' : '',
    pageBg: inputCs && solid(inputCs.backgroundColor) ? inputCs.backgroundColor : solid(cs.backgroundColor) ? cs.backgroundColor : '#fff',
  };
}

// 主题自适应：运行时从页面元素重新取色（供主题切换后重放）
function applyStyles(panel) {
  if (!panel) return;
  const colors = pickPageColors();
  const ta = panel.querySelector('#cbif-text');
  if (ta) {
    ta.style.border = colors.border;
    ta.style.borderRadius = colors.radius;
    ta.style.background = colors.pageBg;
    ta.style.color = colors.text;
  }
  panel.querySelectorAll('button[id^="cbif-btn-"]').forEach((btn) => {
    btn.style.border = colors.btnBg ? 'none' : colors.border;
    btn.style.borderRadius = colors.radius;
    btn.style.background = colors.btnBg || colors.pageBg;
    btn.style.color = colors.btnText || colors.accent || colors.text;
  });
  const frame = panel.querySelector('.cbif-frame');
  if (frame) {
    const dz = document.querySelector('.screenshot-upload-panel .drop-zone');
    if (dz) {
      const d = getComputedStyle(dz);
      frame.style.border = d.borderStyle !== 'none' ? d.border : `1px dashed ${colors.text === 'rgb(240, 242, 246)' ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.25)'}`;
      frame.style.borderRadius = d.borderRadius || colors.radius;
      frame.style.background = d.backgroundColor && d.backgroundColor !== 'rgba(0, 0, 0, 0)' ? d.backgroundColor : 'transparent';
    } else {
      frame.style.border = colors.border;
      frame.style.borderRadius = colors.radius;
      frame.style.background = 'transparent';
    }
  }
}

// 监听主题切换（html/body 的 class、style、data-* 变化）自动重新取色
function watchTheme() {
  if (watchTheme._observer) return;
  let raf = 0;
  const reapply = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => applyStyles(document.getElementById(PANEL_ID)));
  };
  const observer = new MutationObserver(reapply);
  const opts = { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-mode'] };
  observer.observe(document.documentElement, opts);
  if (document.body) observer.observe(document.body, opts);
  watchTheme._observer = observer;
}

function buildPanel() {
  if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);

  const addrContainer = document.querySelector('.screenshot-addresses');
  // 左右布局：左栏 .screenshot-upload-panel（拖拽/粘贴区），右栏 .screenshot-addresses
  // 面板放左栏底部，「粘贴剪贴板图片」按钮下方
  const leftPanel = document.querySelector('.screenshot-upload-panel');
  const section =
    leftPanel || (addrContainer ? addrContainer.closest('section.panel') || addrContainer.parentElement : null);
  if (!section) return null;

  const btnClass = pickPageButtonClass();
  const inputClass = pickPageInputClass();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:6px;';

  // 带边框的容器，样式与左栏拖拽区（drop-zone）对应
  const frame = document.createElement('div');
  frame.className = 'cbif-frame';
  frame.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:10px;';
  const frameTitle = document.createElement('div');
  frameTitle.className = 'cbif-frame-title';
  frameTitle.textContent = '粘贴图片地址';
  frameTitle.style.cssText = 'font-weight:600;';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:stretch;';

  const textarea = document.createElement('textarea');
  textarea.id = 'cbif-text';
  textarea.rows = 3;
  textarea.placeholder = '粘贴图片地址（任意域名）：每行一个裸 URL，或 [img]URL[/img]、[url=..][img]URL[/img][/url]，可混合';
  if (inputClass) textarea.className = inputClass;
  if (inputClass) textarea.className = inputClass;
  textarea.style.cssText =
    'flex:1;resize:vertical;min-height:56px;font-size:12px;line-height:1.5;padding:6px 8px;';

  const btnWrap = document.createElement('div');
  btnWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;justify-content:center;';

  const makeBtn = (id, label, title, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.textContent = label;
    btn.title = title;
    if (btnClass) {
      btn.className = btnClass;
    } else {
      btn.style.cssText = 'padding:4px 10px;font-size:12px;cursor:pointer;';
    }
    btn.addEventListener('click', async () => {
      try {
        btn.disabled = true;
        await onClick();
      } catch (e) {
        toast(`解析失败：${e && e.message ? e.message : e}`, false);
      } finally {
        btn.disabled = false;
      }
    });
    return btn;
  };

  btnWrap.appendChild(
    makeBtn('cbif-btn-text', '📋 解析填写框', '解析左侧填写框内容并覆盖填入截图（清空已填地址后按数量填入）', async () => {
      const text = textarea.value || '';
      if (!text.trim()) {
        toast('填写框为空，请先粘贴图片地址', false);
        return;
      }
      await runFill(text, '填写框');
    }),
  );
  btnWrap.appendChild(
    makeBtn('cbif-btn-clip', '📎 解析剪贴板', '读取剪贴板内容并覆盖填入截图（清空已填地址后按数量填入）', async () => {
      await runFill(await getClipboardText(), '剪贴板');
    }),
  );
  btnWrap.appendChild(
    makeBtn('cbif-btn-reset', '↺ 重置', '清空填写框内容和所有已填的截图地址', async () => {
      textarea.value = '';
      const addrContainer = await getAddrContainer();
      if (!addrContainer) throw new Error('未找到截图地址区域 (.screenshot-addresses)');
      getAllInputs(addrContainer).forEach((inp) => setVueInputValue(inp, ''));
      toast('已重置填写框和截图地址');
    }),
  );

  frame.appendChild(frameTitle);
  row.appendChild(textarea);
  row.appendChild(btnWrap);
  frame.appendChild(row);
  panel.appendChild(frame);
  section.appendChild(panel);
  applyStyles(panel);
}

function inject() {
  const ok = !!buildPanel();
  if (ok) {
    const fab = document.getElementById('cbif-fab');
    if (fab) fab.remove();
    return;
  }
  // 截图区块未渲染：右下角悬浮按钮兜底（仅剪贴板入口）
  if (!document.getElementById('cbif-fab')) {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'cbif-fab';
    fab.textContent = '📋 解析剪贴板图片';
    fab.addEventListener('click', async () => {
      try {
        fab.disabled = true;
        await runFill(await getClipboardText(), '剪贴板');
      } catch (e) {
        toast(`解析失败：${e && e.message ? e.message : e}`, false);
      } finally {
        fab.disabled = false;
      }
    });
    document.body.appendChild(fab);
  }
}

function main() {
  const style = document.createElement('style');
  style.textContent = [
    '#cbif-fab { position: fixed; right: 16px; bottom: 72px; z-index: 9999;',
    '  border: 1px solid rgba(0,0,0,.15); border-radius: 8px; background: #fff; color: #b3261e;',
    '  box-shadow: 0 2px 8px rgba(0,0,0,.18); padding: 8px 14px; font-size: 13px; cursor: pointer; }',
    '#cbif-fab:disabled { opacity: .5; cursor: wait; }',
    '#cbif-toast { position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);',
    '  z-index: 10000; color: #fff; padding: 8px 16px; border-radius: 8px;',
    '  font-size: 13px; opacity: 0; transition: opacity .3s; pointer-events: none; }',
    '#cbif-panel textarea:focus { outline: 2px solid rgba(179,38,30,.35); outline-offset: 0; }',
  ].join('\n');
  document.head.appendChild(style);
  watchTheme();

  inject();
  // Vue 重渲染会清掉外挂 DOM：常驻低频轮询，面板丢失就补挂（buildPanel 内部有幂等保护）
  setInterval(() => {
    const fab = document.getElementById('cbif-fab');
    if (document.getElementById(PANEL_ID)) {
      if (fab) fab.remove();
      return;
    }
    if (document.querySelector('.screenshot-upload-panel')) inject();
  }, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

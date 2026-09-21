import { CFG_OPENAI_KEY, CFG_TRANS_ON_KEY, CFG_TRANS_SRC_KEY, CFG_URL_KEY, NS } from './config.js';



function cfgDeeplxUrl() { return String(GM_getValue(CFG_URL_KEY, '') || '').trim(); }

function cfgOpenaiKey() { return String(GM_getValue(CFG_OPENAI_KEY, '') || '').trim(); }

function cfgTransOn() { return GM_getValue(CFG_TRANS_ON_KEY, true) !== false; }

function cfgTransSrc() { return String(GM_getValue(CFG_TRANS_SRC_KEY, 'google')) || 'google'; }

function openSettings() {
    const bg = document.createElement('div');
    bg.className = `${NS}-modal-bg`;
    const m = document.createElement('div');
    m.className = `${NS}-modal`;
    m.innerHTML = `<h3>Picix 设置</h3>` +
      `<label>翻译源<select id="${NS}-cfg-src"><option value="google" ${cfgTransSrc()==='google'?'selected':''}>Google（免费，易限流）</option><option value="deeplx" ${cfgTransSrc()==='deeplx'?'selected':''}>DeepLX（需URL）</option><option value="openai" ${cfgTransSrc()==='openai'?'selected':''}>OpenAI（需key）</option></select></label>` +
      `<label>DeepLX 翻译 URL（含 token，DeepLX 源时必填）<input type="text" id="${NS}-cfg-url" value="${cfgDeeplxUrl()}"></label>` +
      `<label>OpenAI API Key（OpenAI 源时必填，https://platform.openai.com/api-keys）<input type="text" id="${NS}-cfg-openai" value="${cfgOpenaiKey()}"></label>` +
      `<label><input type="checkbox" id="${NS}-cfg-on" ${cfgTransOn() ? 'checked' : ''}> 启用标题翻译</label>` +
      `<div class="${NS}-modal-btns"><button id="${NS}-cfg-save">保存并刷新</button><button id="${NS}-cfg-close">取消</button></div>`;
    bg.append(m); document.body.append(bg);
    bg.onclick = e => { if (e.target === bg) bg.remove(); };
    m.querySelector(`#${NS}-cfg-close`).onclick = () => bg.remove();
    m.querySelector(`#${NS}-cfg-save`).onclick = () => {
      GM_setValue(CFG_URL_KEY, m.querySelector(`#${NS}-cfg-url`).value.trim());
      GM_setValue(CFG_OPENAI_KEY, m.querySelector(`#${NS}-cfg-openai`).value.trim());
      GM_setValue(CFG_TRANS_ON_KEY, m.querySelector(`#${NS}-cfg-on`).checked);
      GM_setValue(CFG_TRANS_SRC_KEY, m.querySelector(`#${NS}-cfg-src`).value);
      bg.remove();
      location.reload();
    };
  }



export { cfgDeeplxUrl, cfgOpenaiKey, cfgTransOn, cfgTransSrc, openSettings };

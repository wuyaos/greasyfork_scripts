import { NS } from './config.js';



function toast(msg) {
    const t = document.createElement('div');
    t.className = `${NS}-toast`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

function makeButton(kind, html, onClick) {
    const btn = document.createElement('button');
    btn.className = `${NS}-btn`;
    btn.dataset.kind = kind;
    btn.type = 'button';
    btn.innerHTML = html;
    btn.onclick = e => { e.preventDefault(); e.stopPropagation(); onClick(btn); };
    return btn;
  }



export { makeButton, toast };

import { NS } from './config.js';

import { openSettings } from './settings.js';

import { start } from './cards.js';



function bootstrap() {
GM_registerMenuCommand('Picix 设置', openSettings);

GM_addStyle(`
    .${NS}-box { display:flex; flex-direction:column; gap:3px; z-index:10; pointer-events:none; padding:2px 4px; }
    .${NS}-top { display:flex; gap:4px; align-items:center; }
    .${NS}-overlay { display:flex; gap:8px; margin-left:auto; flex-shrink:0; opacity:1; pointer-events:auto; }
    a.movie-card:hover .${NS}-overlay { filter:brightness(1.15); }
    .${NS}-btn { margin:0; padding:4px 7px; font-size:16px; line-height:1; cursor:pointer; border:0; border-radius:4px; background:rgba(0,0,0,.62); color:#fff; display:flex; align-items:center; }
    .${NS}-btn:hover:not(:disabled) { background:rgba(0,0,0,.85); }
    .${NS}-btn[data-kind=unlock].is-active { background:rgba(34,139,34,.92); }
    .${NS}-btn[data-kind=fav].is-active { background:rgba(255,193,7,.92); color:#3a2a00; }
    .${NS}-btn:disabled { opacity:.6; cursor:default; }
    .${NS}-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.82); color:#fff; padding:8px 16px; border-radius:4px; z-index:99999; font:13px/1.5 Arial,'Microsoft YaHei',sans-serif; }
    .${NS}-code, .${NS}-date { font-weight:700; background:rgba(0,0,0,.55); padding:1px 5px; border-radius:3px; color:#fff; }
    .${NS}-tags { display:flex; flex-wrap:wrap; gap:3px; }
    .${NS}-tag { padding:0 4px; border-radius:3px; font-size:10px; line-height:1.4; cursor:pointer; pointer-events:auto; white-space:nowrap; color:#fff; }
    .${NS}-tag:nth-child(7n+1) { background:rgba(244,67,54,.78); }
    .${NS}-tag:nth-child(7n+2) { background:rgba(33,150,243,.78); }
    .${NS}-tag:nth-child(7n+3) { background:rgba(76,175,80,.78); }
    .${NS}-tag:nth-child(7n+4) { background:rgba(255,152,0,.85); color:#3a2a00; }
    .${NS}-tag:nth-child(7n+5) { background:rgba(156,39,176,.78); }
    .${NS}-tag:nth-child(7n+6) { background:rgba(0,188,212,.78); }
    .${NS}-tag:nth-child(7n+7) { background:rgba(121,85,72,.78); }
    .${NS}-tag:hover { filter:brightness(1.15); }
    a.movie-card .movie-date { display:none; }
    .${NS}-trans { font:11px/1.3 Arial,'Microsoft YaHei',sans-serif; color:rgb(229,234,243); margin-top:2px; word-break:break-word; white-space:normal; }
    .${NS}-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:99999; display:flex; align-items:center; justify-content:center; }
    .${NS}-modal { background:#fff; padding:16px 20px; border-radius:8px; width:440px; max-width:90vw; font:13px/1.5 Arial,'Microsoft YaHei',sans-serif; color:#333; }
    .${NS}-modal h3 { margin:0 0 12px; }
    .${NS}-modal label { display:block; margin:10px 0; }
    .${NS}-modal input[type=text] { width:100%; padding:5px; box-sizing:border-box; margin-top:4px; }
    .${NS}-modal-btns { margin-top:14px; text-align:right; }
    .${NS}-modal-btns button { padding:5px 14px; margin-left:8px; cursor:pointer; border:0; border-radius:4px; }
    .${NS}-modal-btns button:first-child { background:#409eff; color:#fff; }
    .${NS}-modal-btns button:last-child { background:#eee; }
  `);

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}



export { bootstrap };

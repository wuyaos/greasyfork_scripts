import { ID } from './config.js';



function ensureStyle() {
    if (document.querySelector('#zq-batch-dl-style')) return;
    GM_addStyle(`
#${ID}.zq-theme-dark{--zq-panel-bg:linear-gradient(180deg,#162234,#101928);--zq-head-bg:rgba(21,35,55,.86);--zq-text:#c9d7ea;--zq-title:#e8f1ff;--zq-label:#dbeafe;--zq-muted:#a9bdd5;--zq-border:#2b4565;--zq-border-strong:#385a82;--zq-input-bg:#0f1b2b;--zq-input-text:#e5eefb;--zq-menu-hover:#17304d;--zq-btn-bg:#17263a;--zq-btn-text:#dbeafe;--zq-primary-bg:#173f35;--zq-primary-border:#2f7d5d;--zq-primary-text:#b9f6d3;--zq-check-bg:#15304c;--zq-status-bg:#101b2b;--zq-shadow:0 8px 24px rgba(0,0,0,.28)}
#${ID}.zq-theme-light{--zq-panel-bg:linear-gradient(180deg,#fbfcfe,#f4f7fb);--zq-head-bg:rgba(238,243,248,.72);--zq-text:#2f3742;--zq-title:#253044;--zq-label:#3a4757;--zq-muted:#536071;--zq-border:#d8dee8;--zq-border-strong:#c8d1dd;--zq-input-bg:#fff;--zq-input-text:#243044;--zq-menu-hover:#f2f6fb;--zq-btn-bg:#f3f5f8;--zq-btn-text:#2f3b4d;--zq-primary-bg:#e6f3ed;--zq-primary-border:#a8d0bc;--zq-primary-text:#1f6041;--zq-check-bg:#e8f1fb;--zq-status-bg:#eef3f8;--zq-shadow:0 2px 8px rgba(20,35,60,.08)}
#${ID}{font:12px/1.5 Arial,Helvetica,sans-serif;color:var(--zq-text);background:var(--zq-panel-bg);border:1px solid var(--zq-border);border-radius:8px;box-shadow:var(--zq-shadow);padding:0;margin:10px 12px;box-sizing:border-box}
#${ID} .zq-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border-bottom:1px solid var(--zq-border);background:var(--zq-head-bg);border-radius:8px 8px 0 0}
#${ID} .zq-title{font-weight:700;color:var(--zq-title);display:flex;align-items:center;gap:6px;white-space:nowrap}
#${ID} .zq-title img{width:18px;height:18px;border-radius:4px;display:block}
#${ID} .zq-body{padding:10px 12px;display:flex;flex-direction:column;gap:8px}
#${ID} .zq-filter-line{--zq-gap:8px;display:grid;grid-template-columns:repeat(4,minmax(282px,1fr));gap:var(--zq-gap);align-items:center}
#${ID} .zq-card{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;padding:8px 9px;background:var(--zq-input-bg);border:1px solid var(--zq-border);border-radius:6px}
#${ID} .zq-card-size{align-items:flex-start;flex-direction:column;gap:6px}
#${ID} .zq-card-title{font-weight:700;color:var(--zq-label);margin-right:2px;white-space:nowrap}
#${ID} .zq-row{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center}
#${ID} .zq-field{display:grid;grid-template-columns:36px minmax(0,1fr);align-items:center;gap:var(--zq-gap);color:var(--zq-muted);white-space:nowrap;min-width:0}
#${ID} .zq-keyword-field{grid-column:1/-1}
#${ID} .zq-size-field,#${ID} .zq-range-field,#${ID} .zq-select-field{grid-column:span 1}
#${ID} .zq-select-field details{width:100%;min-width:0}
#${ID} .zq-field>label{color:var(--zq-label);font-weight:600;flex:0 0 auto}
#${ID} input[type=text],#${ID} input[type=number],#${ID} select{height:26px;border:1px solid var(--zq-border-strong);border-radius:4px;background:var(--zq-input-bg);color:var(--zq-input-text);padding:2px 6px;box-sizing:border-box}
#${ID} input::placeholder{color:var(--zq-muted)}
#${ID} .zq-keyword{width:100%;min-width:0}
#${ID} .zq-size{width:100%;min-width:0}
#${ID} .zq-range{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:var(--zq-gap);width:100%;min-width:0}
#${ID} .zq-range-box{display:grid;align-items:center;min-width:0;width:100%}
#${ID} .zq-num-box{grid-template-columns:1fr}
#${ID} .zq-size-box{grid-template-columns:minmax(0,1fr) 46px;gap:var(--zq-gap)}
#${ID} .zq-size-num{width:100%;min-width:0}
#${ID} .zq-unit{width:46px;padding:2px 0 2px 2px}
#${ID} .zq-range-sep{color:var(--zq-muted);text-align:center}
#${ID} details{position:relative}
#${ID} summary{list-style:none;cursor:pointer;border:1px solid var(--zq-border-strong);background:var(--zq-input-bg);border-radius:4px;padding:4px 10px;color:var(--zq-input-text);min-width:110px;text-align:center}
#${ID} summary::-webkit-details-marker{display:none}
#${ID} details[open] summary{background:var(--zq-check-bg);border-color:var(--zq-border-strong)}
#${ID} .zq-menu{position:absolute;z-index:99999;top:30px;left:0;max-height:200px;overflow:auto;min-width:170px;padding:5px;border:1px solid var(--zq-border-strong);background:var(--zq-input-bg);color:var(--zq-input-text);border-radius:6px;box-shadow:var(--zq-shadow)}
#${ID} .zq-menu label{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;white-space:nowrap;cursor:pointer}
#${ID} .zq-menu label:hover{background:var(--zq-menu-hover)}
#${ID} .zq-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#${ID} .zq-btn{height:28px;border:1px solid var(--zq-border-strong);border-radius:4px;background:var(--zq-btn-bg);color:var(--zq-btn-text);padding:0 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
#${ID} .zq-btn:hover{filter:brightness(1.08)}
#${ID} .zq-btn:disabled{opacity:.55;cursor:not-allowed}
#${ID} .zq-btn-primary{background:var(--zq-primary-bg);border-color:var(--zq-primary-border);color:var(--zq-primary-text);font-weight:700}
#${ID} .zq-btn-check{background:var(--zq-check-bg);border-color:var(--zq-border-strong)}
#${ID} #zq-batch-status{margin-left:auto;color:var(--zq-muted);background:var(--zq-status-bg);border:1px solid var(--zq-border);border-radius:5px;padding:4px 8px;min-width:200px;text-align:right}
#${ID} .zq-hint{color:var(--zq-muted);font-size:11px}
#${ID} .zq-collapse{cursor:pointer;color:var(--zq-muted);border:1px solid var(--zq-border);border-radius:4px;padding:2px 8px;background:var(--zq-input-bg)}
.zq-row-check{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin:0 4px}.zq-row-check input{cursor:pointer}
@media(max-width:1280px){#${ID} .zq-filter-line{grid-template-columns:repeat(2,minmax(282px,1fr));align-items:stretch}}
@media(max-width:760px){#${ID} .zq-filter-line{grid-template-columns:1fr}#${ID} #zq-batch-status{margin-left:0;text-align:left;flex-basis:100%}}
    `);
  }



export { ensureStyle };

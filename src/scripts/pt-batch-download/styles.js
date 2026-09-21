import { ID, TOGGLE_ID } from './config.js';



function ensureStyle() {
    if (document.querySelector('#ptbd-style')) return
    GM_addStyle(`
#${ID}.ptbd-theme-dark{--ptbd-panel-bg:linear-gradient(180deg,#162234,#101928);--ptbd-head-bg:rgba(21,35,55,.92);--ptbd-text:#c9d7ea;--ptbd-title:#e8f1ff;--ptbd-label:#dbeafe;--ptbd-muted:#a9bdd5;--ptbd-border:#2b4565;--ptbd-border-strong:#385a82;--ptbd-input-bg:#0f1b2b;--ptbd-input-text:#e5eefb;--ptbd-menu-hover:#17304d;--ptbd-btn-bg:#17263a;--ptbd-btn-text:#dbeafe;--ptbd-primary-bg:#173f35;--ptbd-primary-border:#2f7d5d;--ptbd-primary-text:#b9f6d3;--ptbd-check-bg:#15304c;--ptbd-status-bg:#101b2b;--ptbd-shadow:0 8px 24px rgba(0,0,0,.28)}
#${ID}.ptbd-theme-light{--ptbd-panel-bg:linear-gradient(180deg,#fbfcfe,#f4f7fb);--ptbd-head-bg:rgba(238,243,248,.92);--ptbd-text:#2f3742;--ptbd-title:#253044;--ptbd-label:#3a4757;--ptbd-muted:#536071;--ptbd-border:#d8dee8;--ptbd-border-strong:#c8d1dd;--ptbd-input-bg:#fff;--ptbd-input-text:#243044;--ptbd-menu-hover:#f2f6fb;--ptbd-btn-bg:#f3f5f8;--ptbd-btn-text:#2f3b4d;--ptbd-primary-bg:#e6f3ed;--ptbd-primary-border:#a8d0bc;--ptbd-primary-text:#1f6041;--ptbd-check-bg:#e8f1fb;--ptbd-status-bg:#eef3f8;--ptbd-shadow:0 2px 8px rgba(20,35,60,.12)}
#${TOGGLE_ID}{position:fixed;right:18px;bottom:18px;z-index:999999;border:0;border-radius:999px;padding:10px 16px;background:#2563eb;color:#fff;font:700 13px/1 Arial,Helvetica,sans-serif;cursor:pointer;box-shadow:0 10px 28px rgba(37,99,235,.35),0 4px 14px rgba(0,0,0,.25)}
#${TOGGLE_ID}:hover{filter:brightness(1.08)}
#${ID}{position:fixed;right:18px;bottom:66px;z-index:999998;width:min(1180px,calc(100vw - 36px));max-height:82vh;overflow:auto;box-sizing:border-box;color:var(--ptbd-text);background:var(--ptbd-panel-bg);border:1px solid var(--ptbd-border);border-radius:10px;box-shadow:var(--ptbd-shadow);font:12px/1.5 Arial,Helvetica,'Microsoft YaHei',sans-serif}
#${ID}.ptbd-hidden{display:none}
#${ID} .ptbd-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px solid var(--ptbd-border);background:var(--ptbd-head-bg);border-radius:10px 10px 0 0}
#${ID} .ptbd-title{font-weight:700;color:var(--ptbd-title);white-space:nowrap}
#${ID} .ptbd-head-actions{display:flex;align-items:center;gap:8px}
#${ID} .ptbd-body{padding:10px 12px;display:flex;flex-direction:column;gap:10px}
#${ID} .ptbd-body.ptbd-collapsed{display:none}
#${ID} .ptbd-filter-groups{display:flex;flex-direction:column;gap:10px}
#${ID} .ptbd-filter-row{display:grid;gap:10px;align-items:center}
#${ID} .ptbd-filter-row-main{grid-template-columns:minmax(260px,1.2fr) minmax(420px,1.8fr) minmax(180px,.7fr)}
#${ID} .ptbd-filter-row-extra{grid-template-columns:minmax(220px,.8fr) minmax(320px,1.3fr) minmax(260px,1fr)}
#${ID} .ptbd-field{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:8px;color:var(--ptbd-muted);min-width:0}
#${ID} .ptbd-field>label{color:var(--ptbd-label);font-weight:600;white-space:nowrap;text-align:right;min-width:72px}
#${ID} input,#${ID} select{height:28px;width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--ptbd-border-strong);border-radius:5px;background:var(--ptbd-input-bg);color:var(--ptbd-input-text);padding:2px 7px}
#${ID} input::placeholder{color:var(--ptbd-muted)}
#${ID} .ptbd-range{display:grid;grid-template-columns:minmax(96px,1fr) auto minmax(96px,1fr);align-items:center;gap:8px;min-width:0}
#${ID} .ptbd-size-range-field .ptbd-range{grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr)}
#${ID} .ptbd-size-box{display:grid;grid-template-columns:minmax(92px,1fr) 54px;gap:6px;min-width:0}
#${ID} .ptbd-unit{width:50px;padding-left:2px;padding-right:0}
#${ID} details{position:relative;min-width:0}
#${ID} summary{list-style:none;cursor:pointer;height:28px;box-sizing:border-box;border:1px solid var(--ptbd-border-strong);background:var(--ptbd-input-bg);border-radius:5px;padding:2px 7px;color:var(--ptbd-input-text);min-width:110px;text-align:center;line-height:22px}
#${ID} .ptbd-select-field summary{text-align:left;padding:2px 28px 2px 10px;position:relative}
#${ID} .ptbd-select-field summary::after{content:'▾';position:absolute;right:10px;top:50%;transform:translateY(-50%)}
#${ID} summary::-webkit-details-marker{display:none}
#${ID} details[open] summary{background:var(--ptbd-input-bg)}
#${ID} .ptbd-menu{position:absolute;z-index:999999;top:32px;left:0;max-height:220px;overflow:auto;min-width:170px;padding:5px;border:1px solid var(--ptbd-border-strong);background:var(--ptbd-input-bg);color:var(--ptbd-input-text);border-radius:6px;box-shadow:var(--ptbd-shadow)}
#${ID} .ptbd-menu label{display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;white-space:nowrap;cursor:pointer}
#${ID} .ptbd-menu label:hover{background:var(--ptbd-menu-hover)}
#${ID} .ptbd-menu input{width:auto;height:auto}
#${ID} .ptbd-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
#${ID} .ptbd-btn,#${ID} .ptbd-mini,#${ID} .ptbd-collapse{height:28px;border:1px solid var(--ptbd-border-strong);border-radius:5px;background:var(--ptbd-btn-bg);color:var(--ptbd-btn-text);padding:0 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
#${ID} .ptbd-close{height:28px;min-width:28px;border:1px solid var(--ptbd-border);border-radius:5px;background:var(--ptbd-input-bg);color:var(--ptbd-muted);font-size:18px;line-height:1;cursor:pointer}
#${ID} .ptbd-btn:hover,#${ID} .ptbd-mini:hover,#${ID} .ptbd-collapse:hover,#${ID} .ptbd-close:hover{filter:brightness(1.08)}
#${ID} .ptbd-btn-primary{background:var(--ptbd-primary-bg);border-color:var(--ptbd-primary-border);color:var(--ptbd-primary-text);font-weight:700}
#${ID} .ptbd-btn-check{background:var(--ptbd-check-bg)}
#${ID} .ptbd-status{margin-left:auto;color:var(--ptbd-muted);background:var(--ptbd-status-bg);border:1px solid var(--ptbd-border);border-radius:5px;padding:4px 8px;min-width:220px;text-align:right}
#${ID} .ptbd-dl-status{color:var(--ptbd-label);background:var(--ptbd-status-bg);border:1px solid var(--ptbd-border);border-radius:999px;padding:4px 9px;white-space:nowrap}
#${ID} .ptbd-dl-select{width:auto;min-width:150px}
#${ID} .ptbd-section-title{font-weight:700;color:var(--ptbd-label);margin:8px 0}
#${ID} .ptbd-table-wrap{overflow:auto;border:1px solid var(--ptbd-border);border-radius:8px}
#${ID} .ptbd-table{width:100%;border-collapse:collapse;background:var(--ptbd-input-bg);color:var(--ptbd-text)}
#${ID} .ptbd-table th,#${ID} .ptbd-table td{border-top:1px solid var(--ptbd-border);padding:7px 8px;text-align:left;vertical-align:top}
#${ID} .ptbd-table th:nth-child(3),#${ID} .ptbd-table td:nth-child(3){min-width:86px;white-space:nowrap}
#${ID} .ptbd-table th:nth-child(4),#${ID} .ptbd-table td:nth-child(4){min-width:58px;white-space:nowrap}
#${ID} .ptbd-table th{position:sticky;top:0;background:var(--ptbd-head-bg);z-index:1;color:var(--ptbd-label)}
#${ID} .ptbd-table a{color:#60a5fa;text-decoration:none}
#${ID} .ptbd-table tbody tr:hover{background:var(--ptbd-menu-hover)}
.ptbd-modal{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#f5f7fa;font:13px/1.5 Arial,Helvetica,'Microsoft YaHei',sans-serif}
.ptbd-modal-box{width:min(720px,calc(100vw - 36px));max-height:80vh;overflow:auto;background:#1f2933;border:1px solid #374151;border-radius:10px;box-shadow:0 18px 54px rgba(0,0,0,.45)}
.ptbd-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #374151;background:#243041}
.ptbd-site-list,.ptbd-dl-modal-body{padding:12px}.ptbd-site-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #374151}.ptbd-site-item span{word-break:break-all}.ptbd-dl-modal-body,.ptbd-dl-form{display:grid;grid-template-columns:1fr;gap:8px}.ptbd-modal .ptbd-field{display:grid;grid-template-columns:minmax(96px,auto) minmax(0,1fr);align-items:center;gap:8px;color:#cbd5e1}.ptbd-modal .ptbd-field>label{font-weight:600;white-space:nowrap;text-align:right}.ptbd-modal input,.ptbd-modal select{height:30px;width:100%;min-width:0;box-sizing:border-box;border:1px solid #475569;border-radius:5px;background:#111827;color:#f8fafc;padding:2px 8px}.ptbd-modal .ptbd-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.ptbd-modal .ptbd-btn,.ptbd-modal .ptbd-close{height:28px;border:1px solid #475569;border-radius:5px;background:#334155;color:#f8fafc;padding:0 12px;cursor:pointer}.ptbd-modal .ptbd-close{min-width:28px;font-size:18px;line-height:1}.ptbd-form-errors{color:#fecaca;min-height:18px}.ptbd-test-status{color:#bbf7d0;margin-right:auto}.ptbd-empty{text-align:center;color:#94a3b8;padding:14px!important}.ptbd-danger{background:#7f1d1d!important;border-color:#991b1b!important;color:#fff!important}
@media(max-width:1100px){#${ID} .ptbd-filter-row-main,#${ID} .ptbd-filter-row-extra{grid-template-columns:1fr}}
@media(max-width:680px){#${ID} .ptbd-status{margin-left:0;text-align:left;flex-basis:100%}#${ID} .ptbd-field{grid-template-columns:minmax(70px,auto) minmax(0,1fr)}}
    `)
    const style = document.createElement('style')
    style.id = 'ptbd-style'
    style.textContent = ''
    document.documentElement.append(style)
  }



export { ensureStyle };

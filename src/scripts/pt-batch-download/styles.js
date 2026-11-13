import { ID, TOGGLE_ID } from './config.js';



function ensureStyle() {
    if (document.querySelector('#ptbd-style')) return
    GM_addStyle(`
#${ID}.ptbd-theme-dark,.ptbd-modal:not(.ptbd-theme-light){--ptbd-panel-bg:linear-gradient(180deg,#162234,#101928);--ptbd-head-bg:rgba(21,35,55,.92);--ptbd-text:#c9d7ea;--ptbd-title:#e8f1ff;--ptbd-label:#dbeafe;--ptbd-muted:#a9bdd5;--ptbd-border:#2b4565;--ptbd-border-strong:#385a82;--ptbd-input-bg:#0f1b2b;--ptbd-input-text:#e5eefb;--ptbd-menu-hover:#17304d;--ptbd-btn-bg:#17263a;--ptbd-btn-text:#dbeafe;--ptbd-primary-bg:#173f35;--ptbd-primary-border:#2f7d5d;--ptbd-primary-text:#b9f6d3;--ptbd-check-bg:#15304c;--ptbd-status-bg:#101b2b;--ptbd-shadow:0 8px 24px rgba(0,0,0,.28)}
#${ID}.ptbd-theme-light,.ptbd-modal.ptbd-theme-light{--ptbd-panel-bg:linear-gradient(180deg,#fbfcfe,#f4f7fb);--ptbd-head-bg:rgba(238,243,248,.92);--ptbd-text:#2f3742;--ptbd-title:#253044;--ptbd-label:#3a4757;--ptbd-muted:#536071;--ptbd-border:#d8dee8;--ptbd-border-strong:#c8d1dd;--ptbd-input-bg:#fff;--ptbd-input-text:#243044;--ptbd-menu-hover:#f2f6fb;--ptbd-btn-bg:#f3f5f8;--ptbd-btn-text:#2f3b4d;--ptbd-primary-bg:#e6f3ed;--ptbd-primary-border:#a8d0bc;--ptbd-primary-text:#1f6041;--ptbd-check-bg:#e8f1fb;--ptbd-status-bg:#eef3f8;--ptbd-shadow:0 2px 8px rgba(20,35,60,.12)}
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
:is(#${ID},.ptbd-modal) .ptbd-field{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:8px;color:var(--ptbd-muted);min-width:0}
:is(#${ID},.ptbd-modal) .ptbd-field>label{color:var(--ptbd-label);font-weight:600;white-space:nowrap;text-align:right;min-width:72px}
:is(#${ID},.ptbd-modal) input,:is(#${ID},.ptbd-modal) select{height:28px;width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--ptbd-border-strong);border-radius:5px;background:var(--ptbd-input-bg);color:var(--ptbd-input-text);padding:2px 7px}
:is(#${ID},.ptbd-modal) input::placeholder{color:var(--ptbd-muted)}
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
:is(#${ID},.ptbd-modal) .ptbd-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
:is(#${ID},.ptbd-modal) .ptbd-btn,:is(#${ID},.ptbd-modal) .ptbd-mini,:is(#${ID},.ptbd-modal) .ptbd-collapse{height:28px;border:1px solid var(--ptbd-border-strong);border-radius:5px;background:var(--ptbd-btn-bg);color:var(--ptbd-btn-text);padding:0 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
:is(#${ID},.ptbd-modal) .ptbd-close,:is(#${ID},.ptbd-modal) .ptbd-settings{height:28px;min-width:28px;border:1px solid var(--ptbd-border);border-radius:5px;background:var(--ptbd-input-bg);color:var(--ptbd-muted);font-size:18px;line-height:1;cursor:pointer}
:is(#${ID},.ptbd-modal) .ptbd-btn:hover,:is(#${ID},.ptbd-modal) .ptbd-mini:hover,:is(#${ID},.ptbd-modal) .ptbd-collapse:hover,:is(#${ID},.ptbd-modal) .ptbd-close:hover,:is(#${ID},.ptbd-modal) .ptbd-settings:hover{filter:brightness(1.08)}
:is(#${ID},.ptbd-modal) .ptbd-btn-primary{background:var(--ptbd-primary-bg);border-color:var(--ptbd-primary-border);color:var(--ptbd-primary-text);font-weight:700}
:is(#${ID},.ptbd-modal) .ptbd-btn-check{background:var(--ptbd-check-bg)}
#${ID} .ptbd-status{margin-left:auto;color:var(--ptbd-muted);background:var(--ptbd-status-bg);border:1px solid var(--ptbd-border);border-radius:5px;padding:4px 8px;min-width:220px;text-align:right}
#${ID} .ptbd-dl-status{color:var(--ptbd-label);background:var(--ptbd-status-bg);border:1px solid var(--ptbd-border);border-radius:999px;padding:4px 9px;white-space:nowrap}
#${ID} .ptbd-dl-select{width:auto;min-width:150px}
:is(#${ID},.ptbd-modal) .ptbd-section-title{font-weight:700;color:var(--ptbd-label);margin:8px 0}
#${ID} .ptbd-table-wrap{overflow:auto;border:1px solid var(--ptbd-border);border-radius:8px}
#${ID} .ptbd-table{width:100%;border-collapse:collapse;background:var(--ptbd-input-bg);color:var(--ptbd-text)}
#${ID} .ptbd-table th,#${ID} .ptbd-table td{border-top:1px solid var(--ptbd-border);padding:7px 8px;text-align:left;vertical-align:top}
#${ID} .ptbd-table th:nth-child(3),#${ID} .ptbd-table td:nth-child(3){min-width:86px;white-space:nowrap}
#${ID} .ptbd-table th:nth-child(4),#${ID} .ptbd-table td:nth-child(4){min-width:58px;white-space:nowrap}
#${ID} .ptbd-table th{position:sticky;top:0;background:var(--ptbd-head-bg);z-index:1;color:var(--ptbd-label)}
#${ID} .ptbd-table a{color:#60a5fa;text-decoration:none}
#${ID} .ptbd-table tbody tr:hover{background:var(--ptbd-menu-hover)}
.ptbd-modal{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:var(--ptbd-text,#c9d7ea);font:13px/1.5 Arial,Helvetica,'Microsoft YaHei',sans-serif}
.ptbd-modal-box{width:min(760px,calc(100vw - 32px));max-height:85vh;overflow:auto;background:var(--ptbd-panel-bg,#162234);border:1px solid var(--ptbd-border,#2b4565);border-radius:10px;box-shadow:var(--ptbd-shadow)}
.ptbd-modal-head{position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--ptbd-border);background:var(--ptbd-head-bg)}
.ptbd-site-list,.ptbd-dl-modal-body{padding:14px}
.ptbd-site-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid var(--ptbd-border)}
.ptbd-dl-modal-body,.ptbd-dl-form{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
.ptbd-modal .ptbd-field{grid-template-columns:96px minmax(0,1fr)}
.ptbd-modal .ptbd-close{padding:0 7px}
.ptbd-modal .ptbd-config-card{border:1px solid var(--ptbd-border);border-radius:8px;padding:12px;background:var(--ptbd-input-bg);min-width:0}
.ptbd-modal .ptbd-card-head,.ptbd-modal .ptbd-push-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.ptbd-modal .ptbd-config-info{flex:1;min-width:150px;overflow-wrap:anywhere}
.ptbd-modal .ptbd-muted{color:var(--ptbd-muted);overflow-wrap:anywhere}
.ptbd-modal .ptbd-badge{display:inline-block;margin-left:8px;border:1px solid var(--ptbd-border);border-radius:999px;padding:1px 8px;color:var(--ptbd-muted);font-size:11px}
.ptbd-modal .ptbd-push-group{margin-top:12px;padding:12px;border-left:3px solid var(--ptbd-border-strong);border-radius:4px;background:var(--ptbd-status-bg)}
.ptbd-modal .ptbd-push-row{padding:10px 0;border-top:1px solid var(--ptbd-border);margin-top:8px}
.ptbd-modal .ptbd-owner{display:grid;gap:4px;padding:10px 12px;border:1px solid var(--ptbd-border-strong);border-radius:6px;background:var(--ptbd-check-bg);overflow-wrap:anywhere}
.ptbd-modal input[type=checkbox]{width:16px;height:16px;flex-shrink:0}
.ptbd-modal .ptbd-field>.ptbd-check-label{display:flex;align-items:center;gap:6px;text-align:left;white-space:normal}
.ptbd-form-errors{color:#dc2626;min-height:18px}
.ptbd-test-status{color:var(--ptbd-muted);overflow-wrap:anywhere}
.ptbd-test-status:empty{display:none}
.ptbd-empty{text-align:center;color:var(--ptbd-muted);padding:14px}
:is(#${ID},.ptbd-modal) .ptbd-danger{background:var(--ptbd-input-bg);border-color:#b91c1c;color:#dc2626}
:is(#${ID},.ptbd-modal) button:disabled,:is(#${ID},.ptbd-modal) select:disabled{opacity:.55;cursor:not-allowed}
:is(#${ID},.ptbd-modal) :is(button,input,select):focus-visible{outline:2px solid #3b82f6;outline-offset:2px}
@media(max-width:480px){.ptbd-modal .ptbd-field{grid-template-columns:minmax(0,1fr)}.ptbd-modal .ptbd-field>label{text-align:left}.ptbd-modal .ptbd-push-group{padding:8px}}
@media(max-width:1100px){#${ID} .ptbd-filter-row-main,#${ID} .ptbd-filter-row-extra{grid-template-columns:1fr}}
@media(max-width:680px){#${ID} .ptbd-status{margin-left:0;text-align:left;flex-basis:100%}#${ID} .ptbd-field{grid-template-columns:minmax(70px,auto) minmax(0,1fr)}}
    `)
    const style = document.createElement('style')
    style.id = 'ptbd-style'
    style.textContent = ''
    document.documentElement.append(style)
  }



export { ensureStyle };

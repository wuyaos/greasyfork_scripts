import { NS } from './config.js';



function ensureStyle() {
    if (document.querySelector(`#${NS}-style`)) return;
    GM_addStyle(`
#${NS}-overlay{position:static;order:-1;flex:0 0 100%;box-sizing:border-box;margin-bottom:6px;background:#1e2127;border:1px solid #3a4150;border-radius:8px;color:#d6dde8;font:13px/1.5 "Segoe UI",Arial,Helvetica,sans-serif}
#${NS}-overlay.${NS}-hidden{display:none}
#${NS}-overlay .lit-panel-sec-head{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;color:#9fd0ff;font-size:12px;font-weight:700}
#${NS}-overlay .lit-icon{background:none;border:0;color:#8b95a5;font-size:14px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}
#${NS}-overlay .lit-icon:hover{background:#2d3542;color:#fff}
#${NS}-overlay .lit-preview-body{padding:8px 12px;max-height:150px;overflow:auto}
#${NS}-overlay .lit-translated{word-break:break-word;color:#e8eef7;white-space:pre-wrap}
#${NS}-overlay .lit-panel-hint{padding:4px 12px 8px;color:#7f8ba0;font-size:12px}
#${NS}-overlay .lit-panel-hint.lit-error{color:#ff9d9d}
#${NS}-panel{position:fixed;top:56px;right:10px;width:340px;max-height:calc(100vh - 72px);display:flex;flex-direction:column;z-index:99999;background:#1e2127;border:1px solid #3a4150;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.45);color:#d6dde8;font:13px/1.5 "Segoe UI",Arial,Helvetica,sans-serif}
#${NS}-panel .lit-panel-head{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #2c3340;background:#242933;border-radius:10px 10px 0 0;font-weight:700;color:#9fd0ff;font-size:13px}
#${NS}-panel .lit-panel-head img{width:18px;height:18px;border-radius:4px;margin-right:6px;vertical-align:-3px}
#${NS}-panel .lit-panel-sec{border-top:1px solid #2c3340}
#${NS}-panel .lit-panel-sec-head{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;color:#9fd0ff;font-size:12px;font-weight:700}
#${NS}-panel .lit-icon{background:none;border:0;color:#8b95a5;font-size:14px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}
#${NS}-panel .lit-icon:hover{background:#2d3542;color:#fff}
#${NS}-panel .lit-suggest-body{padding:4px 10px 8px;max-height:200px;overflow:auto}
#${NS}-panel .lit-suggest-body.lit-panel-empty{color:#7f8ba0;font-size:12px}
#${NS}-panel .lit-suggest-body.lit-error{color:#ff9d9d;font-size:12px}
#${NS}-panel .lit-panel-hint{padding:2px 0 6px;color:#7f8ba0;font-size:12px}
#${NS}-panel .lit-cand{display:flex;align-items:flex-start;padding:5px 8px;margin-bottom:5px;background:#262c36;border:1px solid #343c4a;border-radius:6px;cursor:pointer;color:#dbe4f0;font-size:12px;line-height:1.5}
#${NS}-panel .lit-cand:last-child{margin-bottom:0}
#${NS}-panel .lit-cand:hover{background:#2d3542;border-color:#4a5568}
#${NS}-panel .lit-cand-num{display:inline-block;min-width:16px;margin-right:6px;color:#7f8ba0;font-weight:700;font-size:11px}
#${NS}-panel .lit-cand-col{flex:1;min-width:0}
#${NS}-panel .lit-cand-en{word-break:break-word}
#${NS}-panel .lit-cand-zh{margin-top:1px;color:#7f8ba0;font-size:11px}
#${NS}-panel .lit-panel-phrases-sec{flex:1 1 auto;min-height:140px;overflow:auto;padding-bottom:8px}
#${NS}-panel .lit-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px}
#${NS}-panel .lit-chip-group{margin:6px 0 4px;color:#9fb0c5;font-size:11px;font-weight:700;letter-spacing:.5px;padding:0 2px}
#${NS}-panel .lit-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:#262c36;border:1px solid #343c4a;border-radius:6px;font-size:12px;color:#dbe4f0;cursor:pointer;line-height:1.6}
#${NS}-panel .lit-chip:hover{background:#2d3542;border-color:#4a5568}
#${NS}-panel .lit-chip-x{color:#8b95a5;font-size:12px}
#${NS}-panel .lit-chip-x:hover{color:#ff9d9d}
#${NS}-panel .lit-phrase-add{display:flex;gap:6px;margin-top:8px;padding:0 10px}
#${NS}-panel .lit-phrase-add input{flex:1;min-width:0;height:26px;box-sizing:border-box;border:1px solid #3a4150;border-radius:5px;background:#15171c;color:#e6edf6;padding:2px 8px;font-size:12px}
#${NS}-panel .lit-phrase-add .lit-btn{height:26px;padding:0 10px}
.lit-modal{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:13px/1.5 "Segoe UI",Arial,Helvetica,sans-serif}
.lit-modal-box{width:min(480px,calc(100vw - 32px));background:#1e2127;border:1px solid #3a4150;border-radius:10px;color:#d6dde8;box-shadow:0 18px 54px rgba(0,0,0,.5)}
.lit-modal-head{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #2c3340;background:#242933;border-radius:10px 10px 0 0}
.lit-modal-head .lit-icon{background:none;border:0;color:#8b95a5;font-size:18px;cursor:pointer;padding:0 6px}
.lit-modal-body{display:grid;grid-template-columns:1fr;gap:9px;padding:14px}
.lit-field{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:center;gap:8px}
.lit-field label{color:#9fb0c5;text-align:right;white-space:nowrap}
.lit-field input,.lit-field select{height:29px;box-sizing:border-box;border:1px solid #3a4150;border-radius:5px;background:#15171c;color:#e6edf6;padding:2px 8px}
.lit-advanced summary{cursor:pointer;color:#9fb0c5;padding:4px 0;user-select:none}
.lit-advanced[open] summary{margin-bottom:4px}
.lit-actions{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:6px}
.lit-btn{height:28px;border:1px solid #3a4150;border-radius:5px;background:#2a303b;color:#d6dde8;padding:0 14px;cursor:pointer}
.lit-btn-primary{background:#1d4a3a;border-color:#2f7d5d;color:#b9f6d3;font-weight:700}
.lit-btn:hover{filter:brightness(1.1)}
.lit-status{color:#7f8ba0;margin-right:auto;font-size:12px}
.lit-msg-trans{margin-left:6px;color:#8b95a5;font-size:12px;line-height:1.6;word-break:break-word;border-bottom:1px dashed #4a5568;padding-bottom:1px}
    `);
    const style = document.createElement("style");
    style.id = `${NS}-style`;
    style.textContent = "";
    document.documentElement.append(style);
  }



export { ensureStyle };

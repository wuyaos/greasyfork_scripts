import stylesheet1 from './styles/popup-template.css';


const POPUP_STYLE = stylesheet1;

const POPUP_HTML = `
        <button id="btn_close_popup">&times;</button>
        <h2>MoviePilot 登录配置</h2>
        <div class="form-group">
            <label for="config_select">选择配置</label>
            <select id="config_select">
                <option value="new">-- 新建配置 --</option>
            </select>
        </div>
        <div class="form-group">
            <label for="config_name">配置名称 (自动生成)</label>
            <input type="text" id="config_name" readonly placeholder="由下方URL自动生成">
        </div>
        <div class="form-group">
            <div style="display: flex; gap: 5px; align-items: center; margin-bottom: 5px;">
                <label for="config_url">MoviePilot URL</label>
                <button type="button" id="btn_get_current_url" title="自动获取当前网址" style="flex-shrink: 0; padding: 4px; line-height: 0; border-radius: 4px; margin-left: 5px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
                </button>
            </div>
            <input type="text" id="config_url" placeholder="例如：http://192.168.1.10:3000" style="width: 100%;">
        </div>
        <div class="form-group">
            <label for="config_username">账号</label>
            <input type="text" id="config_username">
        </div>
        <div class="form-group">
            <label for="config_password">密码</label>
            <input type="password" id="config_password">
        </div>
        <div class="button-group">
            <button id="btn_delete">删除</button>
            <button id="btn_save">保存</button>
        </div>
    `;



export { POPUP_HTML, POPUP_STYLE };

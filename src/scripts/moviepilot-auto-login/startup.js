import { initialize } from './login.js';

import { showConfigPopup } from './settings.js';



function bootstrap() {
GM_registerMenuCommand("⚙️ 配置 MoviePilot 登录", showConfigPopup);

initialize();
}



export { bootstrap };

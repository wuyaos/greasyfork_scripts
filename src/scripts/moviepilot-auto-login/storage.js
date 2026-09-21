import { CONFIG_KEY } from './config.js';



function getConfigs() {
        return JSON.parse(GM_getValue(CONFIG_KEY, '[]'));
    }

function saveConfigs(configs) {
        GM_setValue(CONFIG_KEY, JSON.stringify(configs));
    }



export { getConfigs, saveConfigs };

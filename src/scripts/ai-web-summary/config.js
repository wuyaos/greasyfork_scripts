import { DEFAULT_CONFIG, PROMPT_TEMPLATES } from './prompts.js';



let CONFIG = {};

function loadConfig() {
        CONFIG = {
            BASE_URL: GM_getValue('BASE_URL', DEFAULT_CONFIG.BASE_URL),
            API_KEY: GM_getValue('API_KEY', DEFAULT_CONFIG.API_KEY),
            MAX_TOKENS: GM_getValue('MAX_TOKENS', DEFAULT_CONFIG.MAX_TOKENS),
            SHORTCUT: GM_getValue('SHORTCUT', DEFAULT_CONFIG.SHORTCUT),
            MODEL: GM_getValue('MODEL', DEFAULT_CONFIG.MODEL),
            CURRENT_PROMPT_IDENTIFIER: GM_getValue('CURRENT_PROMPT_IDENTIFIER', DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER),
            SAVED_MODELS: GM_getValue('SAVED_MODELS', DEFAULT_CONFIG.SAVED_MODELS),
            containerPosition: GM_getValue('containerPosition')
        };
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === CONFIG.CURRENT_PROMPT_IDENTIFIER);
        if (!selectedTemplate) {
            CONFIG.CURRENT_PROMPT_IDENTIFIER = DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER;
        }
        return CONFIG;
    }

function getCurrentPromptContent() {
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === CONFIG.CURRENT_PROMPT_IDENTIFIER);
        if (selectedTemplate) {
            return selectedTemplate.content;
        }

        const defaultTemplate = PROMPT_TEMPLATES.find(t => t.identifier === DEFAULT_CONFIG.CURRENT_PROMPT_IDENTIFIER);
        return defaultTemplate.content; // DEFAULT_CONFIG 指向 PROMPT_TEMPLATES[0]，find 必命中
    }



export { CONFIG, getCurrentPromptContent, loadConfig };

import { PROMPT_TEMPLATES } from './prompts.js';

import { CONFIG } from './config.js';



function populateModalModelSelector(modalElement) {
        if (!modalElement) {
            console.error("populateModalModelSelector: modalElement is undefined");
            return;
        }
        const modelSelectInModal = modalElement.querySelector('#ai-model-select-modal');
        if (modelSelectInModal) {
            modelSelectInModal.innerHTML = CONFIG.SAVED_MODELS.map(modelId => `<option value="${modelId}" ${modelId === CONFIG.MODEL ? 'selected' : ''}>${modelId}</option>`).join('');
        } else {
            console.error("populateModalModelSelector: #ai-model-select-modal not found in modalElement");
        }
    }

function updateAllPromptSelectors(elements) {
        if (!elements || !elements.shadow) {
            console.error('Elements or shadow root not initialized for updateAllPromptSelectors');
            return;
        }
        const currentIdentifier = CONFIG.CURRENT_PROMPT_IDENTIFIER || PROMPT_TEMPLATES[0].identifier;
        const optionsHTML = PROMPT_TEMPLATES.map(template =>
            `<option value="${template.identifier}" ${template.identifier === currentIdentifier ? 'selected' : ''}>${template.title}</option>`
        ).join('');

        const mainSelector = elements.shadow.querySelector('.ai-main-prompt-selector');
        if (mainSelector) mainSelector.innerHTML = optionsHTML;

        const modalSelector = elements.shadow.querySelector('#ai-prompt-select-modal');
        if (modalSelector) modalSelector.innerHTML = optionsHTML;

        const settingsSelector = elements.settingsPanel.querySelector('#config-select');
        if (settingsSelector) settingsSelector.innerHTML = PROMPT_TEMPLATES.map(template => `<option value="${template.identifier}" ${template.identifier === currentIdentifier ? 'selected' : ''}>${template.title} (预设)</option>`).join('');

        const promptTextarea = elements.settingsPanel.querySelector('#prompt');
        const selectedTemplate = PROMPT_TEMPLATES.find(t => t.identifier === currentIdentifier);
        if (promptTextarea && selectedTemplate) {
            promptTextarea.value = selectedTemplate.content;
        }
    }



export { populateModalModelSelector, updateAllPromptSelectors };

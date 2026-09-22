import { GithubReleaseEnhancer } from './enhancer.js';



const formatHiddenKeywords = keywords => keywords.map(k => k.includes(' ') ? `'${k}'` : k).join(', ');

const releaseSettings = {
            parseHiddenKeywords(input) {
                if (!input || typeof input !== 'string') return [];
                const patterns = [];
                const regex = /'([^']*)'|([^,]+)/g;
                let match;
                while ((match = regex.exec(input)) !== null) {
                    const pattern = (match[1] !== undefined ? match[1] : match[2]).trim();
                    if (pattern) {
                        patterns.push(pattern);
                    }
                }
                return patterns;
            },
            loadUserSettings() {
                const GRE = GithubReleaseEnhancer;
                const C = GRE.config;
                const defaults = {
                    releaseNotesMaxHeight: C.RELEASE_NOTES_MAX_HEIGHT_DEFAULT,
                    hiddenKeywords: [...C.HIDDEN_KEYWORDS_DEFAULT],
                    clickOutsideToCollapse: true,
                    filterMode: 'smart',
                    preferredFilters: {},
                };

                const storedSettings = GM_getValue(C.STORAGE_KEY_SETTINGS, {});

                if (storedSettings.preferredFilters) {
                    if (Array.isArray(storedSettings.preferredFilters.selectedPlatforms)) {
                       storedSettings.preferredFilters.selectedPlatforms = new Set(storedSettings.preferredFilters.selectedPlatforms);
                    }
                     if (Array.isArray(storedSettings.preferredFilters.selectedArchs)) {
                       storedSettings.preferredFilters.selectedArchs = new Set(storedSettings.preferredFilters.selectedArchs);
                    }
                }

                const loadedSettings = { ...defaults, ...storedSettings };
                GRE.store.setState(loadedSettings);
            },
            saveUserSettings(settingsToSave) {
                const GRE = GithubReleaseEnhancer;
                const C = GRE.config;

                GRE.store.setState(settingsToSave);

                const currentSettings = GM_getValue(C.STORAGE_KEY_SETTINGS, {});

                let processedSettings = {...settingsToSave};
                if (processedSettings.preferredFilters) {
                    const prefsToSave = { ...processedSettings.preferredFilters };
                    if (prefsToSave.selectedPlatforms instanceof Set) {
                        prefsToSave.selectedPlatforms = Array.from(prefsToSave.selectedPlatforms);
                    }
                    if (prefsToSave.selectedArchs instanceof Set) {
                        prefsToSave.selectedArchs = Array.from(prefsToSave.selectedArchs);
                    }
                    processedSettings.preferredFilters = prefsToSave;
                }

                const newSettings = { ...currentSettings, ...processedSettings };
                GM_setValue(C.STORAGE_KEY_SETTINGS, newSettings);
                console.log('[GitHub Filter] Settings saved.', newSettings);
            },
            resetAllSettings() {
                const GRE = GithubReleaseEnhancer;
                GM_deleteValue(GRE.config.STORAGE_KEY_SETTINGS);
                location.reload();
            },
            showResetConfirmation(overlay) {
                const GRE = GithubReleaseEnhancer;
                const { createElement, getText } = GRE.utils;
                const { CLASS_NAMES: CN } = GRE.config;

                overlay.querySelector(`.${CN.RESET_CONFIRM_DIALOG}`)?.remove();

                const dialog = createElement('div', { className: CN.RESET_CONFIRM_DIALOG });
                dialog.innerHTML = `
                    <div class="ghre-confirm-title">${getText('resetConfirmationTitle')}</div>
                    <div class="ghre-confirm-message">${getText('resetConfirmationMessage')}</div>
                    <div class="ghre-confirm-actions">
                        <button class="btn btn-sm" data-action="cancel-reset">${getText('settingsCancelButton')}</button>
                        <button class="btn btn-sm btn-danger" data-action="confirm-reset">${getText('resetConfirmButton')}</button>
                    </div>
                `;

                dialog.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = e.target.dataset.action;
                    if (action === 'cancel-reset') {
                        dialog.remove();
                    } else if (action === 'confirm-reset') {
                        this.resetAllSettings();
                    }
                });

                overlay.appendChild(dialog);
            },
            createSettingsPanel() {
                try {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN, SELECTORS: S } = GRE.config;
                    const { createElement } = GRE.utils;
                    const state = GRE.store.state;

                    if (document.querySelector(`.${CN.SETTINGS_OVERLAY}`)) {
                        return;
                    }

                    const settingsOverlayElement = createElement('div', {
                        className: CN.SETTINGS_OVERLAY,
                        style: { display: 'none' }
                    });

                    const settingsPanelElement = createElement('div', {
                        className: CN.SETTINGS_PANEL,
                        role: 'dialog',
                        'aria-modal': 'true',
                        'aria-labelledby': 'ghre-settings-title-id'
                    });

                    const createCheckboxGroup = (id, labelKey, checked) => {
                         return `<div class="ghre-checkbox-group ${CN.SETTINGS_FORM_GROUP}"><input type="checkbox" id="${id}"${checked ? ' checked' : ''}><label for="${id}" class="${CN.SETTINGS_LABEL}" style="margin-bottom:0;">${GRE.utils.getText(labelKey)}</label></div>`;
                    };

                    const createRadioGroup = (name, value, labelKey, checked) => {
                        const id = `ghre-radio-${value}`;
                        return `<div class="ghre-radio-group"><input type="radio" id="${id}" name="${name}" value="${value}"${checked ? ' checked' : ''}><label for="${id}" class="${CN.SETTINGS_LABEL}" style="margin-bottom:0;">${GRE.utils.getText(labelKey)}</label></div>`;
                    };

                    let panelHTML = `<div id="ghre-settings-title-id" class="${CN.SETTINGS_TITLE}">${GRE.utils.getText('settingsPanelTitle')}</div>`;

                    panelHTML += `<div class="${CN.SETTINGS_FORM_GROUP}">
                        <label class="${CN.SETTINGS_LABEL}">${GRE.utils.getText('filterModeLabel')}</label>
                        <div class="ghre-radio-group-container">
                            ${createRadioGroup('filterMode', 'smart', 'intelligentFilterLabel', state.filterMode === 'smart')}
                            <div class="ghre-pref-group">
                                ${createRadioGroup('filterMode', 'preferred', 'preferredFilterLabel', state.filterMode === 'preferred')}
                                <button class="btn btn-sm" id="ghreSavePrefsBtn" style="margin-left: 4px;">${GRE.utils.getText('savePrefsButton')}</button>
                            </div>
                        </div>
                    </div>`;

                    panelHTML += `<div class="${CN.SETTINGS_FORM_GROUP}"><label for="${S.SETTINGS_MAX_HEIGHT_INPUT.substring(1)}" class="${CN.SETTINGS_LABEL}">${GRE.utils.getText('settingsMaxHeightLabel')}</label><input type="number" id="${S.SETTINGS_MAX_HEIGHT_INPUT.substring(1)}" class="${CN.SETTINGS_INPUT}" value="${state.releaseNotesMaxHeight}" min="50" step="10"></div>`;
                    panelHTML += `<div class="${CN.SETTINGS_FORM_GROUP}"><label for="${S.SETTINGS_HIDDEN_RULES_TEXTAREA.substring(1)}" class="${CN.SETTINGS_LABEL}">${GRE.utils.getText('settingsHiddenRuleLabel')}</label><textarea id="${S.SETTINGS_HIDDEN_RULES_TEXTAREA.substring(1)}" class="${CN.SETTINGS_TEXTAREA}" placeholder="${GRE.utils.getText('settingsHiddenRulePlaceholder')}">${formatHiddenKeywords(state.hiddenKeywords)}</textarea></div>`;

                    panelHTML += createCheckboxGroup(S.SETTINGS_CLICK_OUTSIDE_CHECKBOX.substring(1), 'settingsClickOutsideLabel', state.clickOutsideToCollapse);

                    const actionsContainer = createElement('div', { className: CN.SETTINGS_ACTIONS });
                    const resetButton = createElement('button', { className: `btn btn-danger ${CN.SETTINGS_BUTTON}`, dataset: { action: 'reset' }, textContent: GRE.utils.getText('settingsResetButton') });
                    const spacer = createElement('div', { style: { flexGrow: '1' } });
                    const cancelButton = createElement('button', { className: `btn ${CN.SETTINGS_BUTTON}`, dataset: { action: 'cancel' }, textContent: GRE.utils.getText('settingsCancelButton') });
                    const saveButton = createElement('button', { className: `btn btn-primary ${CN.SETTINGS_BUTTON}`, dataset: { action: 'save' }, textContent: GRE.utils.getText('settingsSaveButton') });

                    actionsContainer.append(resetButton, spacer, cancelButton, saveButton);
                    settingsPanelElement.innerHTML = panelHTML;
                    settingsPanelElement.appendChild(actionsContainer);

                    settingsOverlayElement.appendChild(settingsPanelElement);
                    document.body.appendChild(settingsOverlayElement);

                    const savePrefsBtn = settingsPanelElement.querySelector('#ghreSavePrefsBtn');
                    const preferredRadio = settingsPanelElement.querySelector('input[name="filterMode"][value="preferred"]');
                    const smartRadio = settingsPanelElement.querySelector('input[name="filterMode"][value="smart"]');

                    const updateSavePrefsBtnState = () => {
                        savePrefsBtn.disabled = !preferredRadio.checked;
                    };

                    preferredRadio.addEventListener('change', updateSavePrefsBtnState);
                    smartRadio.addEventListener('change', updateSavePrefsBtnState);
                    updateSavePrefsBtnState();

                    savePrefsBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const currentFilters = GRE.utils.snapshotFilters(GRE.store.state);
                        this.saveUserSettings({ preferredFilters: currentFilters });
                        const btn = e.target;
                        const originalText = btn.textContent;
                        btn.textContent = GRE.utils.getText('prefsSavedAlert');
                        btn.disabled = true;
                        setTimeout(() => {
                           btn.textContent = originalText;
                           updateSavePrefsBtnState();
                        }, 2000);
                    });

                    settingsPanelElement.querySelector(S.SETTINGS_RESET_BUTTON).addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showResetConfirmation(settingsOverlayElement);
                    });

                    settingsPanelElement.querySelector(S.SETTINGS_SAVE_BUTTON).addEventListener('click', (e) => {
                        e.preventDefault();
                        const maxHeight = parseInt(settingsPanelElement.querySelector(S.SETTINGS_MAX_HEIGHT_INPUT).value, 10);
                        const hiddenRulesInput = settingsPanelElement.querySelector(S.SETTINGS_HIDDEN_RULES_TEXTAREA).value;
                        const hiddenKeywords = this.parseHiddenKeywords(hiddenRulesInput);
                        const clickOutside = settingsPanelElement.querySelector(S.SETTINGS_CLICK_OUTSIDE_CHECKBOX).checked;
                        const filterMode = settingsPanelElement.querySelector('input[name="filterMode"]:checked').value;

                        this.saveUserSettings({
                            releaseNotesMaxHeight: (!isNaN(maxHeight) && maxHeight >= 50) ? maxHeight : GRE.config.RELEASE_NOTES_MAX_HEIGHT_DEFAULT,
                            hiddenKeywords: hiddenKeywords.length > 0 ? hiddenKeywords : [...GRE.config.HIDDEN_KEYWORDS_DEFAULT],
                            clickOutsideToCollapse: clickOutside,
                            filterMode: filterMode,
                        });
                        this.hideSettingsPanel();
                        GRE.actions.initializeFilterStates();
                    });

                    settingsPanelElement.querySelector(S.SETTINGS_CANCEL_BUTTON).addEventListener('click', (e) => {
                        e.preventDefault();
                        this.hideSettingsPanel();
                    });
                    settingsOverlayElement.addEventListener('click', (e) => {
                        if (e.target === settingsOverlayElement) {
                            if (!settingsOverlayElement.querySelector(`.${CN.RESET_CONFIRM_DIALOG}`)) {
                                this.hideSettingsPanel();
                            }
                        }
                    });

                    GRE.store.setState({ settingsOverlayElement });
                } catch (error) {
                    console.error(`[GitHub Filter@${location.pathname}] Failed to create settings panel:`, error);
                }
            },
            showSettingsPanel() {
                const GRE = GithubReleaseEnhancer;
                const S = GRE.config.SELECTORS;
                let { settingsOverlayElement } = GRE.store.state;

                if (!settingsOverlayElement || !document.body.contains(settingsOverlayElement)) {
                    this.createSettingsPanel();
                    settingsOverlayElement = GRE.store.state.settingsOverlayElement;
                }

                if (settingsOverlayElement) {
                   const panel = settingsOverlayElement.querySelector(`.${GRE.config.CLASS_NAMES.SETTINGS_PANEL}`);
                   panel.querySelector(`input[name="filterMode"][value="${GRE.store.state.filterMode}"]`).checked = true;
                   panel.querySelector('#ghreSavePrefsBtn').disabled = GRE.store.state.filterMode !== 'preferred';
                   panel.querySelector(S.SETTINGS_MAX_HEIGHT_INPUT).value = GRE.store.state.releaseNotesMaxHeight;
                   panel.querySelector(S.SETTINGS_HIDDEN_RULES_TEXTAREA).value = formatHiddenKeywords(GRE.store.state.hiddenKeywords);
                   panel.querySelector(S.SETTINGS_CLICK_OUTSIDE_CHECKBOX).checked = GRE.store.state.clickOutsideToCollapse;
                   settingsOverlayElement.style.display = 'flex';
                }
            },
            hideSettingsPanel() {
                const { settingsOverlayElement } = GithubReleaseEnhancer.store.state;
                if (settingsOverlayElement) {
                    settingsOverlayElement.style.display = 'none';
                    settingsOverlayElement.querySelector(`.${GithubReleaseEnhancer.config.CLASS_NAMES.RESET_CONFIRM_DIALOG}`)?.remove();
                }
            },
            registerMenu() {
                const menuText = GithubReleaseEnhancer.utils.getText('settingsMenuName');
                GM_registerMenuCommand(menuText, () => GithubReleaseEnhancer.settings.showSettingsPanel());
            }
        };



export { releaseSettings };

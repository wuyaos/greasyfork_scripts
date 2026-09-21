import { GithubReleaseEnhancer } from './enhancer.js';



const releaseCore = {
            releaseNotes: {
                initializeExpansion() {
                    const GRE = GithubReleaseEnhancer;
                    const { releaseNotesMaxHeight } = GRE.store.state;
                    document.querySelectorAll(`.${GRE.config.CLASS_NAMES.MARKDOWN_BODY}.${GRE.config.CLASS_NAMES.RELEASE_NOTES_PANEL}`).forEach(p => {
                        const b = p.querySelector(`.${GRE.config.CLASS_NAMES.TOGGLE_BUTTON}`);
                        if (b) b.remove();
                        if (p.offsetParent !== null && p.scrollHeight > (releaseNotesMaxHeight || GRE.config.RELEASE_NOTES_MAX_HEIGHT_DEFAULT) ) {
                            const tb = this.createToggleButton();
                            this.updateToggleButtonText(p, tb);
                            tb.addEventListener('click', this.handleToggleClick.bind(this));
                            p.appendChild(tb); p.style.position = 'relative';
                        } else {
                            p.classList.remove(GRE.config.CLASS_NAMES.EXPANDED);
                            if (p.style.position === 'relative') p.style.position = '';
                        }
                    });
                },
                handleToggleClick(e) {
                    const b = e.currentTarget;
                    const p = b.closest(`.${GithubReleaseEnhancer.config.CLASS_NAMES.MARKDOWN_BODY}.${GithubReleaseEnhancer.config.CLASS_NAMES.RELEASE_NOTES_PANEL}`);
                    if (p) {
                         p.classList.toggle(GithubReleaseEnhancer.config.CLASS_NAMES.EXPANDED);
                         this.updateToggleButtonText(p, b);
                         const isNowExpanded = p.classList.contains(GithubReleaseEnhancer.config.CLASS_NAMES.EXPANDED);
                         if (isNowExpanded) {
                             GithubReleaseEnhancer.notesCollapser.initForPanel(p);
                         } else {
                             GithubReleaseEnhancer.notesCollapser.cleanup();
                             const releaseContainer = p.closest('div.Box');
                             if(releaseContainer) {
                                releaseContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                             }
                         }
                    }
                },
                createToggleButton() {
                    return GithubReleaseEnhancer.utils.createElement('button', { type: 'button', className: GithubReleaseEnhancer.config.CLASS_NAMES.TOGGLE_BUTTON, 'aria-expanded': 'false' });
                },
                updateToggleButtonText(p, b) {
                    const GRE = GithubReleaseEnhancer;
                    const isExp = p.classList.contains(GRE.config.CLASS_NAMES.EXPANDED);
                    b.textContent = isExp ? GRE.utils.getText('collapseButton') : GRE.utils.getText('expandButton');
                    b.setAttribute('aria-expanded', isExp.toString());
                },
            },
            assetFilter: {
                getParsedAssets() {
                    const GRE = GithubReleaseEnhancer;
                    const cacheKey = window.location.pathname;
                    if (GRE.assetCache.has(cacheKey)) {
                        return GRE.assetCache.get(cacheKey);
                    }
                    try {
                        const S = GRE.config.SELECTORS;
                        const allAssetElements = Array.from(document.querySelectorAll(S.ASSET_ROW));
                        const parsedAssets = allAssetElements.map(assetElement => {
                            const assetLink = assetElement.querySelector(S.ASSET_DOWNLOAD_LINK);
                            let assetName;
                            if (assetLink) {
                                assetName = assetLink.textContent;
                            } else {
                                assetName = assetElement.querySelector('a')?.textContent || '';
                            }

                            if (!assetName) return { element: assetElement, name: null, info: {} };

                            const assetInfo = GRE.utils.parseAssetInfo(assetName);
                            return { element: assetElement, name: assetName, info: assetInfo };
                        });

                        GRE.assetCache.set(cacheKey, parsedAssets);
                        return parsedAssets;
                    } catch (error) {
                         console.error(`[GitHub Filter@${location.pathname}] Error in getParsedAssets:`, error);
                         return [];
                    }
                },
                isHiddenAsset(name, patterns) {
                    const lowerName = name.replace(/\s+/g, ' ').trim().toLowerCase();
                    return patterns.some(pattern => {
                        const lowerPattern = pattern.toLowerCase();
                        if (lowerPattern.startsWith('.')) {
                            return lowerName.endsWith(lowerPattern);
                        }
                        return lowerName.includes(lowerPattern);
                    });
                },
                preScanAssetsForAvailableFilters() {
                    const GRE = GithubReleaseEnhancer;
                    const parsedAssets = this.getParsedAssets();
                    const availableFilters = new Set();
                    const masterAvailableArchs = new Set();
                    let hasAssetsWithoutPlatform = false;

                    parsedAssets.forEach(({ name: assetName, info: assetInfo }) => {
                        if (!assetName) return;
                        if (assetInfo.isSourceCode) {
                             availableFilters.add('source');
                        } else if (this.isHiddenAsset(assetName, GRE.store.state.hiddenKeywords)) {
                            availableFilters.add('keyword');
                        } else if (assetInfo.platform) {
                            availableFilters.add(assetInfo.platform);
                        } else {
                            hasAssetsWithoutPlatform = true;
                        }
                        if (assetInfo.architecture) {
                            masterAvailableArchs.add(assetInfo.architecture);
                        }
                        if (assetInfo.language) availableFilters.add('language');
                        if (assetInfo.resolution) availableFilters.add('resolution');
                    });
                    if (hasAssetsWithoutPlatform) {
                        availableFilters.add('other_os');
                    }
                    GRE.store.setState({ availableFilters, availableArchs: masterAvailableArchs, masterAvailableArchs });
                },
                updateAvailabilityMarkers(state) {
                    const GRE = GithubReleaseEnhancer;
                    const optionsContainer = state.filterUIInstance?.querySelector(`.${GRE.config.CLASS_NAMES.PLATFORM_OPTIONS_GRID}`);
                    if (!optionsContainer) return;
                    optionsContainer.querySelectorAll(`[data-platform-id], [data-filter-type]`).forEach(el => {
                        const id = el.dataset.platformId || el.dataset.filterType;
                        const isAvailable = state.availableFilters.has(id);
                        el.setAttribute('data-available', isAvailable.toString());
                        let dot = el.querySelector(`.${GRE.config.CLASS_NAMES.AVAILABILITY_DOT}`);
                        if (!dot) {
                            dot = GRE.utils.createElement('span', { className: GRE.config.CLASS_NAMES.AVAILABILITY_DOT });
                            el.appendChild(dot);
                        }
                        dot.setAttribute('data-available', isAvailable.toString());
                        dot.title = isAvailable ? (state.isChinese ? "可用" : "Available") : (state.isChinese ? "不可用" : "Unavailable");
                    });
                },
                initialize() {
                    const GRE = GithubReleaseEnhancer;
                    this.ensureUIVisible();
                    const S = GRE.config.SELECTORS;
                    const el = document.querySelector(`${S.ASSET_LIST_CONTAINER}, ${S.ASSETS_SUMMARY}`);
                    if (el) {
                       const assetList = document.querySelector(S.ASSET_LIST_CONTAINER);
                       if (assetList) {
                           assetList.classList.add(GRE.config.CLASS_NAMES.ASSET_LIST_LOADING);
                       }
                       this.handleAssetLoad();
                    } else {
                        const o = new MutationObserver((_, obs) => {
                            if (document.querySelector(`${S.ASSET_LIST_CONTAINER}, ${S.ASSETS_SUMMARY}`)) {
                                this.handleAssetLoad();
                                obs.disconnect();
                            }
                        });
                        o.observe(document.body, { childList: true, subtree: true });
                    }
                },
                handleAssetLoad() {
                    const GRE = GithubReleaseEnhancer;
                    GRE.assetCache.delete(window.location.pathname);
                    this.preScanAssetsForAvailableFilters();
                    GRE.actions.initializeFilterStates();
                },
                ensureUIVisible() {
                    const GRE = GithubReleaseEnhancer;
                    if (GRE.store.state.isMainReleasesPage) return;
                    if (!GRE.store.state.filterUIInstance || !document.body.contains(GRE.store.state.filterUIInstance)) {
                        GRE.store.setState({ filterUIInstance: this.createUI() });
                    }
                },
                summaryCaptureListener: function(event) {
                    const GRE = GithubReleaseEnhancer;
                    if (event.target.closest(`.${GRE.config.CLASS_NAMES.FILTER_CONTAINER}`)) {
                        event.preventDefault();
                    }
                },
                closePopup() {
                    const GRE = GithubReleaseEnhancer;
                    if (!GRE.store.state.isDropdownOpen) return;
                    const wrapper = GRE.store.state.filterUIInstance;
                    if (wrapper) {
                        wrapper.classList.remove(GRE.config.CLASS_NAMES.PLATFORM_OPTIONS_OPEN);
                        const filterButton = wrapper.querySelector(`.${GRE.config.CLASS_NAMES.FILTER_BUTTON}`);
                        if (filterButton) {
                             filterButton.setAttribute('aria-expanded', 'false');
                             filterButton.focus();
                        }
                    }
                    GRE.store.setState({ isDropdownOpen: false });
                },
                handleGlobalClick(event) {
                    const GRE = GithubReleaseEnhancer;
                    if (GRE.store.state.isDropdownOpen && GRE.store.state.filterUIInstance && !GRE.store.state.filterUIInstance.contains(event.target)) {
                        this.closePopup();
                    }
                },
                createUI() {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN, SELECTORS: S } = GRE.config;
                    const { icons } = GRE;
                    const { createElement } = GRE.utils;
                    try {
                        let assetsSummary = document.querySelector(S.ASSETS_SUMMARY);
                        if (!assetsSummary) return null;
                        assetsSummary.querySelector(`.${CN.SUMMARY_MARKER_ICON}`)?.remove();
                        assetsSummary.querySelector(`.${CN.FILTER_CONTAINER}`)?.remove();
                        Object.assign(assetsSummary.style, { display: 'flex', alignItems: 'center' });
                        const newMarkerSvgSpan = createElement('span', { className: CN.SUMMARY_MARKER_ICON, innerHTML: icons.disclosure_triangle_right_svg });
                        assetsSummary.insertBefore(newMarkerSvgSpan, assetsSummary.firstChild);
                        const filterInteractionWrapper = createElement('div', { className: CN.FILTER_CONTAINER, style: { marginLeft: 'auto', display: 'inline-flex' } });
                        filterInteractionWrapper.appendChild(this.createFilterButton());
                        filterInteractionWrapper.appendChild(this.createPlatformOptions());
                        assetsSummary.appendChild(filterInteractionWrapper);
                        let hiddenCounterElement = assetsSummary.querySelector(S.HIDDEN_ASSET_COUNTER);
                        if (!hiddenCounterElement) {
                            hiddenCounterElement = createElement('span', { className: `Counter ml-1 ${CN.HIDDEN_ASSET_COUNTER}`, title: GRE.utils.getText('hiddenAssetCountTitle'), style: { display: 'none' } });
                            assetsSummary.insertBefore(hiddenCounterElement, filterInteractionWrapper);
                        }
                        assetsSummary.removeEventListener('click', GRE.core.assetFilter.summaryCaptureListener, true);
                        assetsSummary.addEventListener('click', GRE.core.assetFilter.summaryCaptureListener, true);
                        return filterInteractionWrapper;
                    } catch (e) { console.error(`[GitHub Filter@${location.pathname}] Error creating filter UI:`, e); return null; }
                },
                createFilterButton() {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN, SELECTORS: S } = GRE.config;
                    const { icons } = GRE;
                    const btn = GRE.utils.createElement('button', {
                        type: 'button', className: `btn btn-sm hx_rsm-trigger ${CN.FILTER_BUTTON}`,
                        style: { paddingLeft: '0.75rem', paddingRight: '0.75rem', marginRight: '0px', display: 'inline-flex', alignItems: 'center' },
                        'aria-haspopup': 'true', 'aria-expanded': 'false',
                        innerHTML: `${icons.filter}<span>${GRE.utils.getText('filterButton')}</span><span ${S.FILTER_COUNTER.slice(1, -1)} title="${GRE.utils.getText('activeFilterCountTitle')}" class="Counter ml-2">0</span>`
                    });
                    btn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        GRE.actions.toggleDropdown();
                    });
                    return btn;
                },
                updateFilterCounter(state) {
                    if (!state.filterUIInstance) return;
                    const counterElement = state.filterUIInstance.querySelector(GithubReleaseEnhancer.config.SELECTORS.FILTER_COUNTER);
                    if (counterElement) {
                        let count = 0;
                        state.selectedPlatforms.forEach(p => {
                            if(state.availableFilters.has(p)) count++;
                        });
                        state.selectedArchs.forEach(a => {
                            if (state.masterAvailableArchs.has(a)) count++;
                        });
                        if (state.filterMatchLanguage && state.availableFilters.has('language')) count++;
                        if (state.filterMatchResolution && state.availableFilters.has('resolution')) count++;
                        if (state.hideByKeyword && state.availableFilters.has('keyword')) count++;
                        if (state.hideSourceCode && state.availableFilters.has('source')) count++;
                        counterElement.textContent = count;
                    }
                },
                updateHiddenAssetsCounter(hiddenCount = 0) {
                    const counterEl = document.querySelector(GithubReleaseEnhancer.config.SELECTORS.HIDDEN_ASSET_COUNTER);
                    if (counterEl) {
                        if (hiddenCount > 0) {
                            counterEl.textContent = `(${hiddenCount} ${GithubReleaseEnhancer.store.state.isChinese ? '隐藏' : 'hidden'})`;
                            counterEl.style.display = '';
                        } else {
                            counterEl.style.display = 'none';
                        }
                    }
                },
                _updateOptionVisuals(element, isSelected, isAvailable) {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN } = GRE.config;
                    const { icons } = GRE;
                    element.setAttribute('data-available', isAvailable.toString());
                    const shouldBeSelected = isAvailable ? isSelected : false;
                    element.classList.toggle(CN.SELECTED, shouldBeSelected);
                    element.setAttribute('aria-checked', shouldBeSelected.toString());
                    const iconSpan = element.querySelector('span:first-child');
                    if (iconSpan) {
                        iconSpan.innerHTML = shouldBeSelected ? icons.checkbox_checked : icons.checkbox_unchecked;
                    }
                },
                createSpecificFilterToggle(type, stateKey, initialLabel) {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN } = GRE.config;
                    const { createElement } = GRE.utils;
                    const el = createElement('div', { className: CN.KEYWORD_TOGGLE_OPTION, role: 'menuitemcheckbox', dataset: { filterType: type }, tabindex: '-1' });
                    el.appendChild(createElement('span'));
                    el.appendChild(createElement('span', { textContent: initialLabel }));
                    this.updateSpecificFilterVisualState(type, GRE.store.state[stateKey], el);
                    return el;
                },
                updateSpecificFilterVisualState(type, isActive, elementOrContainer = document) {
                    const GRE = GithubReleaseEnhancer;
                    if (!elementOrContainer && GRE.store.state.filterUIInstance) {
                        elementOrContainer = GRE.store.state.filterUIInstance;
                    } else if (!elementOrContainer) {
                        return;
                    }

                    const selector = `[data-filter-type="${type}"]`;
                    let el = elementOrContainer.matches?.(selector) ? elementOrContainer : elementOrContainer.querySelector?.(selector);

                    if (el) {
                        const isAvailable = GRE.store.state.availableFilters.has(type);
                        this._updateOptionVisuals(el, isActive, isAvailable);
                    }
                },
                createPlatformOptions() {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN } = GRE.config;
                    const { createElement } = GRE.utils;
                    const state = GRE.store.state;
                    const optsCont = createElement('div', { className: `${CN.PLATFORM_OPTIONS}` });

                    if (!state.isTouchDevice) {
                        let popupCloseTimeout;
                        const clearCloseTimeout = () => clearTimeout(popupCloseTimeout);
                        optsCont.addEventListener('mouseleave', () => {
                            clearCloseTimeout();
                            popupCloseTimeout = setTimeout(() => this.closePopup(), GRE.config.POPUP_LEAVE_CLOSE_DELAY);
                        });
                        optsCont.addEventListener('mouseenter', clearCloseTimeout);
                    }

                    const innerCont = createElement('div', { className: CN.PLATFORM_OPTIONS_INNER });

                    const header = createElement('div', { className: CN.POPUP_HEADER });
                    const title = createElement('div', { className: CN.OPTIONS_TITLE, style: { padding: 0, gridColumn: 'auto' }, textContent: GRE.utils.getText('platformFilterTitle') });
                    const settingsBtn = createElement('button', {
                        className: CN.POPUP_SETTINGS_BTN,
                        title: GRE.utils.getText('settingsMenuName'),
                        innerHTML: GRE.icons.gear
                    });
                    settingsBtn.addEventListener('click', () => {
                        this.closePopup();
                        GRE.settings.showSettingsPanel();
                    });
                    header.appendChild(title);
                    header.appendChild(settingsBtn);
                    innerCont.appendChild(header);

                    const gridCont = createElement('div', { className: CN.PLATFORM_OPTIONS_GRID });
                    GRE.config.PLATFORMS.forEach(p => gridCont.appendChild(this.createPlatformOptionElement(p)));
                    gridCont.appendChild(createElement('div'));

                    gridCont.appendChild(this.createArchTagContainer());

                    gridCont.appendChild(createElement('div', { className: CN.OPTIONS_SEPARATOR }));
                    gridCont.appendChild(createElement('div', { className: CN.OPTIONS_TITLE, textContent: GRE.utils.getText('supplementaryFilterTitle') }));

                    gridCont.appendChild(this.createSpecificFilterToggle('language', 'filterMatchLanguage', `${GRE.utils.getText('langLabel')} (${GRE.config.LANGUAGES[state.currentUserLanguage]?.name || state.currentUserLanguage})`));
                    const resText = state.currentUserResolutionCategory === 'hd' ? 'HD' : (GRE.config.RESOLUTIONS['sd']?.name || 'SD');
                    gridCont.appendChild(this.createSpecificFilterToggle('resolution', 'filterMatchResolution', `${GRE.utils.getText('resLabel')} (${resText})`));

                    gridCont.appendChild(this.createSpecificFilterToggle('source', 'hideSourceCode', GRE.utils.getText('sourceCodeLabel')));
                    gridCont.appendChild(this.createSpecificFilterToggle('keyword', 'hideByKeyword', GRE.utils.getText('keywordLabel')));

                    const actionsContainer = createElement('div', { className: 'ghre-action-buttons-container' });
                    const selectAllBtn = createElement('button', { textContent: GRE.utils.getText('selectAllLabel'), className: `btn btn-sm ${CN.ACTION_BUTTON} ghre-select-all-btn` });
                    const deselectAllBtn = createElement('button', { textContent: GRE.utils.getText('deselectAllLabel'), className: `btn btn-sm ${CN.ACTION_BUTTON} ghre-deselect-all-btn` });
                    const restoreBtn = createElement('button', {
                        textContent: GRE.utils.getText('restoreLabel'),
                        className: `btn btn-sm btn-primary ${CN.ACTION_BUTTON} ghre-restore-btn`,
                        style: { display: 'none', width: '100%' }
                    });

                    selectAllBtn.addEventListener('click', () => this.toggleAllFilters(true));
                    deselectAllBtn.addEventListener('click', () => this.toggleAllFilters(false));
                    restoreBtn.addEventListener('click', () => GithubReleaseEnhancer.actions.restoreInitialFilters());

                    actionsContainer.appendChild(selectAllBtn);
                    actionsContainer.appendChild(deselectAllBtn);
                    actionsContainer.appendChild(restoreBtn);
                    gridCont.appendChild(actionsContainer);
                    innerCont.appendChild(gridCont);
                    optsCont.appendChild(innerCont);
                    optsCont.addEventListener('click', (e) => {
                        const interactiveTarget = e.target.closest(`.${CN.PLATFORM_OPTION}, .${CN.KEYWORD_TOGGLE_OPTION}, .${CN.ARCH_TAG}`);
                        if (interactiveTarget) {
                            e.stopPropagation();
                            this.handleMenuClick(e, interactiveTarget);
                        } else if (!e.target.closest(`.${CN.ACTION_BUTTON}, .${CN.POPUP_SETTINGS_BTN}`)) {
                            e.stopPropagation();
                        }
                    });
                    return optsCont;
                },
                createArchTagContainer() {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN, ARCH_TAGS_CONFIG } = GRE.config;
                    const { createElement } = GRE.utils;
                    const container = createElement('div', { className: CN.ARCH_TAG_CONTAINER });
                    ARCH_TAGS_CONFIG.forEach(arch => {
                        const tagEl = createElement('div', {
                            className: CN.ARCH_TAG,
                            textContent: arch.name,
                            dataset: { archId: arch.id }
                        });
                        container.appendChild(tagEl);
                    });
                    return container;
                },
                toggleAllFilters(select) {
                    GithubReleaseEnhancer.actions.updateAndSaveAllFilters(select);
                },
                updateActionButtons(state) {
                    const container = state.filterUIInstance;
                    if (!container) return;

                    const actionButtonsContainer = container.querySelector('.ghre-action-buttons-container');
                    if (!actionButtonsContainer) return;

                    const selectAllBtn = actionButtonsContainer.querySelector('.ghre-select-all-btn');
                    const deselectAllBtn = actionButtonsContainer.querySelector('.ghre-deselect-all-btn');
                    const restoreBtn = actionButtonsContainer.querySelector('.ghre-restore-btn');

                    if (selectAllBtn && deselectAllBtn && restoreBtn) {
                        const currentFilters = {
                             selectedPlatforms: state.selectedPlatforms,
                             selectedArchs: state.selectedArchs,
                             filterMatchLanguage: state.filterMatchLanguage,
                             filterMatchResolution: state.filterMatchResolution,
                             hideByKeyword: state.hideByKeyword,
                             hideSourceCode: state.hideSourceCode,
                        };

                        const isDifferentFromInitial = !this.areFiltersEqual(currentFilters, state.initialFilterState);

                        selectAllBtn.style.display = isDifferentFromInitial ? 'none' : '';
                        deselectAllBtn.style.display = isDifferentFromInitial ? 'none' : '';
                        restoreBtn.style.display = isDifferentFromInitial ? '' : 'none';
                    }
                },
                areFiltersEqual(filtersA, filtersB) {
                    if (!filtersA || !filtersB) return false;
                    const keys = ['filterMatchLanguage', 'filterMatchResolution', 'hideByKeyword', 'hideSourceCode'];
                    for (const key of keys) {
                        if (filtersA[key] !== filtersB[key]) return false;
                    }
                    const setKeys = ['selectedPlatforms', 'selectedArchs'];
                     for (const key of setKeys) {
                        const setA = filtersA[key];
                        const setB = filtersB[key];
                        if (setA.size !== setB.size) return false;
                        for (const item of setA) {
                            if (!setB.has(item)) return false;
                        }
                    }
                    return true;
                },
                handleMenuClick(event, target) {
                    const GRE = GithubReleaseEnhancer;
                    const { platformId, filterType, archId } = target.dataset;

                    if (platformId) {
                        GRE.actions.togglePlatform(platformId);
                    } else if (filterType) {
                        GRE.actions.toggleSupplementaryFilter(filterType);
                    } else if (archId) {
                        GRE.actions.toggleArch(archId);
                    }
                },
                createPlatformOptionElement(platform) {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN } = GRE.config;
                    const { createElement } = GRE.utils;
                    const el = createElement('div', {
                        className: CN.PLATFORM_OPTION, role: 'menuitemcheckbox',
                        dataset: { platformId: platform.id }, tabindex: '-1'
                    });
                    el.appendChild(createElement('span'));
                    el.appendChild(createElement('span', { textContent: platform.name }));
                    this.updatePlatformOptionVisualState(el, platform.id, GRE.store.state.selectedPlatforms.has(platform.id));
                    return el;
                },
                 updatePlatformOptionVisualState(el, pId, isSel) {
                    const isAvailable = GithubReleaseEnhancer.store.state.availableFilters.has(pId);
                    this._updateOptionVisuals(el, isSel, isAvailable);
                },
                updateAllPlatformOptionsVisualState(state) {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN } = GRE.config;
                    const container = state.filterUIInstance;
                    if (!container) return;

                    GRE.config.PLATFORMS.forEach(p => {
                        const opt = container.querySelector(`.${CN.PLATFORM_OPTION}[data-platform-id="${p.id}"]`);
                        if (opt) {
                            this.updatePlatformOptionVisualState(opt, p.id, state.selectedPlatforms.has(p.id));
                        }
                    });
                },
                updateAllArchTagsVisualState(state) {
                    const GRE = GithubReleaseEnhancer;
                    const { CLASS_NAMES: CN, ARCH_TAGS_CONFIG } = GRE.config;
                    const container = state.filterUIInstance;
                    if (!container) return;

                    const parsedAssets = this.getParsedAssets();
                    const availableArchsNow = new Set();
                    const assetsToConsider = state.selectedPlatforms.size > 0
                        ? parsedAssets.filter(asset => asset.info.platform && state.selectedPlatforms.has(asset.info.platform))
                        : parsedAssets;

                    assetsToConsider.forEach(asset => {
                        if (asset.info.architecture) {
                            availableArchsNow.add(asset.info.architecture);
                        }
                    });

                    ARCH_TAGS_CONFIG.forEach(arch => {
                        const tagEl = container.querySelector(`.${CN.ARCH_TAG}[data-arch-id="${arch.id}"]`);
                        if (tagEl) {
                            const isAvailable = availableArchsNow.has(arch.id);
                            const isSelected = state.selectedArchs.has(arch.id);
                            tagEl.setAttribute('data-available', isAvailable.toString());
                            tagEl.classList.toggle(CN.SELECTED, isSelected);
                        }
                    });

                    const setsAreEqual = (setA, setB) => setA.size === setB.size && [...setA].every(value => setB.has(value));
                    if (!setsAreEqual(state.availableArchs, availableArchsNow)) {
                        GRE.store.setState({ availableArchs: availableArchsNow });
                    }
                },
                rules: {
                    platform(assetInfo, state) {
                        const { selectedPlatforms } = state;
                        if (selectedPlatforms.size === 0) return true;
                        if (assetInfo.platform) return selectedPlatforms.has(assetInfo.platform);
                        return selectedPlatforms.has('other_os');
                    },
                    arch(assetInfo, state) {
                        const { selectedArchs } = state;
                        if (selectedArchs.size === 0) return true;
                        if (assetInfo.architecture === null) return true;
                        return selectedArchs.has(assetInfo.architecture);
                    },
                    language(assetInfo, state, context) {
                        if (!state.filterMatchLanguage || !context?.hasInfo.language) return true;
                        if (assetInfo.language === null) return !context.hasMatch.language;
                        return assetInfo.language === state.currentUserLanguage;
                    },
                    resolution(assetInfo, state, context) {
                        if (!state.filterMatchResolution || !context?.hasInfo.resolution) return true;
                        if (assetInfo.resolution === null) return !context.hasMatch.resolution;
                        return assetInfo.resolution === state.currentUserResolutionCategory;
                    },
                },
                filterAssets(state) {
                    const GRE = GithubReleaseEnhancer;
                    if (state.isMainReleasesPage) return;

                    const parsedAssets = this.getParsedAssets();
                    if (parsedAssets.length === 0) {
                        this.updateHiddenAssetsCounter(0);
                        return;
                    }

                    const platformScanResults = parsedAssets.reduce((acc, { info }) => {
                        const platformKey = info.platform || 'unknown';
                        if (!acc[platformKey]) {
                            acc[platformKey] = { hasInfo: { language: false, resolution: false }, hasMatch: { language: false, resolution: false } };
                        }
                        if (info.language) {
                            acc[platformKey].hasInfo.language = true;
                            if (info.language === state.currentUserLanguage) acc[platformKey].hasMatch.language = true;
                        }
                        if (info.resolution) {
                            acc[platformKey].hasInfo.resolution = true;
                            if (info.resolution === state.currentUserResolutionCategory) acc[platformKey].hasMatch.resolution = true;
                        }
                        return acc;
                    }, {});

                    let hiddenCount = 0;
                    const domUpdateTasks = [];

                    parsedAssets.forEach(asset => {
                        const { element: assetElement, name: assetName, info: assetInfo } = asset;
                        if (!assetName) {
                            domUpdateTasks.push({ element: assetElement, show: true });
                            return;
                        }

                        let shouldShow;

                        if (assetInfo.isSourceCode) {
                            shouldShow = !state.hideSourceCode;
                        } else if (assetInfo.isByKeyword) {
                            shouldShow = !state.hideByKeyword;
                        } else {
                            const context = platformScanResults[assetInfo.platform || 'unknown'];
                            const passesPlatform = this.rules.platform(assetInfo, state) && this.rules.arch(assetInfo, state);
                            const passesSupplementary = this.rules.language(assetInfo, state, context) &&
                                                        this.rules.resolution(assetInfo, state, context);
                            shouldShow = passesPlatform && passesSupplementary;
                        }

                        domUpdateTasks.push({ element: assetElement, show: shouldShow });
                        if (!shouldShow) {
                            hiddenCount++;
                        }
                    });

                    const assetList = document.querySelector(GRE.config.SELECTORS.ASSET_LIST_CONTAINER);
                    requestAnimationFrame(() => {
                        domUpdateTasks.forEach(task => {
                            task.element.classList.toggle(GRE.config.CLASS_NAMES.HIDDEN_ASSET, !task.show);
                        });
                        if (assetList) {
                            assetList.classList.remove(GRE.config.CLASS_NAMES.ASSET_LIST_LOADING);
                        }
                    });

                    this.updateHiddenAssetsCounter(hiddenCount);
                }
            }
        };



export { releaseCore };

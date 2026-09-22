import { ReleaseNotesCollapser } from './notes-collapser.js';

import { createStore } from './store.js';

import { releaseActions } from './release-actions.js';

import { releaseSettings } from './release-settings.js';

import { releasePage } from './release-page.js';

import { releaseCore } from './release-core.js';

import { releaseUi } from './release-ui.js';

import { releaseUtils } from './release-utils.js';

import { releasePlatformArchRules } from './release-platform-rules.js';

import { releaseIcons } from './release-icons.js';

import { releaseConfig } from './release-config.js';



const GithubReleaseEnhancer = {
        store: null,
        _observer: null,
        _globalClickHandler: null,
        _unsubscribe: null,
        _isInitialized: false,
        assetCache: new Map(),
        notesCollapser: null,

        // =================================================================================
        // [模块] 配置 (Config)
        // =================================================================================
        config: releaseConfig,

        // =================================================================================
        // [模块] 图标 (Icons)
        // =================================================================================
        icons: releaseIcons,

        // =================================================================================
        // [模块] 规则与定义 (Rules & Definitions)
        // =================================================================================
        platformArchRules: releasePlatformArchRules,

        // =================================================================================
        // [模块] 工具函数 (Utils)
        // =================================================================================
        utils: releaseUtils,

        // =================================================================================
        // [模块] UI 相关 (UI)
        // =================================================================================
        ui: releaseUi,

        // =================================================================================
        // [模块] 核心逻辑 (Core)
        // =================================================================================
        core: releaseCore,

        // =================================================================================
        // [模块] 页面与导航 (Page & Navigation)
        // =================================================================================
        page: releasePage,

        // =================================================================================
        // [模块] 设置 (Settings)
        // =================================================================================
        settings: releaseSettings,

        // =================================================================================
        // [模块] 用户操作 (Actions)
        // =================================================================================
        actions: releaseActions,

        // =================================================================================
        // [模块] 初始化与主函数 (Initialization & Main)
        // =================================================================================
        async init() {
            try {
                if (this._observer) {
                    this._observer.disconnect();
                    this._observer = null;
                }
                if (this._globalClickHandler) {
                    document.removeEventListener('click', this._globalClickHandler);
                    this._globalClickHandler = null;
                }
                if (this._unsubscribe) {
                    this._unsubscribe();
                    this._unsubscribe = null;
                }
                if (this.notesCollapser) {
                    this.notesCollapser.cleanup();
                }
                document.querySelector(`.${this.config.CLASS_NAMES.FILTER_CONTAINER}`)?.closest('summary')?.querySelector(`.${this.config.CLASS_NAMES.SUMMARY_MARKER_ICON}`)?.remove();
                document.querySelector(`.${this.config.CLASS_NAMES.FILTER_CONTAINER}`)?.remove();
                document.querySelector(`.${this.config.CLASS_NAMES.SETTINGS_OVERLAY}`)?.remove();


                this.store = createStore({
                    isChinese: false, isTouchDevice: false,
                    selectedPlatforms: new Set(), selectedArchs: new Set(),
                    masterAvailableArchs: new Set(), availableArchs: new Set(),
                    hideByKeyword: true, hideSourceCode: false,
                    currentUserPlatform: 'unknown',
                    currentUserArchitecture: 'unknown', currentUserLanguage: 'unknown',
                    currentUserResolutionCategory: 'unknown', filterMatchLanguage: false,
                    filterMatchResolution: false, isMainReleasesPage: false,
                    filterUIInstance: null, settingsOverlayElement: null,
                    isDropdownOpen: false, availableFilters: new Set(), releaseNotesMaxHeight: 0,
                    hiddenKeywords: [],
                    clickOutsideToCollapse: true,
                    initialFilterState: null,
                    filterMode: 'smart',
                    preferredFilters: {},
                });
                const { setState, subscribe } = this.store;
                this.notesCollapser = new ReleaseNotesCollapser();

                setState({
                    isChinese: (navigator.language || navigator.userLanguage).toLowerCase().includes('zh'),
                    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0,
                });

                this.settings.loadUserSettings();
                this.ui.styles.addGlobalStyles();
                this.utils.checkPageType();

                if (!this.store.state.isMainReleasesPage) {
                    setState({
                        currentUserPlatform: this.utils.getCurrentPlatform(),
                        currentUserArchitecture: await this.utils.getCurrentArchitecture(),
                        currentUserLanguage: this.utils.getCurrentLanguage(),
                        currentUserResolutionCategory: this.utils.getCurrentResolutionCategory()
                    });
                }

                this._unsubscribe = subscribe((currentState) => {
                    this.core.assetFilter.updateAllPlatformOptionsVisualState(currentState);
                    this.core.assetFilter.updateAllArchTagsVisualState(currentState);
                    ['language', 'resolution', 'keyword', 'source'].forEach(type => {
                        this.core.assetFilter.updateSpecificFilterVisualState(type, currentState[GithubReleaseEnhancer.config.FILTER_STATE_KEYS[type]], currentState.filterUIInstance);
                    });
                    this.core.assetFilter.updateActionButtons(currentState);
                    this.core.assetFilter.updateAvailabilityMarkers(currentState);
                    this.ui.styles.updateMaxHeightVar(currentState.releaseNotesMaxHeight);
                    this.core.releaseNotes.initializeExpansion();
                    this.core.assetFilter.filterAssets(currentState);
                    this.core.assetFilter.updateFilterCounter(currentState);
                });

                this.core.releaseNotes.initializeExpansion();

                if (!this.store.state.isMainReleasesPage) {
                    this.core.assetFilter.initialize();
                } else {
                    this.actions.initializeFilterStates();
                }

                this.page.observer.start();

                if (!this._isInitialized) {
                    this.page.navigation.setupListeners();
                    this.settings.registerMenu();
                    this._isInitialized = true;
                }

                this._globalClickHandler = this.core.assetFilter.handleGlobalClick.bind(this.core.assetFilter);
                document.addEventListener('click', this._globalClickHandler);

            } catch (error) {
                console.error(`[GitHub Filter@${location.pathname}] Script initialization error:`, error);
            }
        },
    };



export { GithubReleaseEnhancer };

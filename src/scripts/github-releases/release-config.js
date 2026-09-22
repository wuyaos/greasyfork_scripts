

const releaseConfig = {
            RELEASE_NOTES_MAX_HEIGHT_DEFAULT: 300,
            DEBOUNCE_DELAY: 200,
            POPUP_LEAVE_CLOSE_DELAY: 300,
            STORAGE_KEY_SETTINGS: 'ghre_user_settings_v3.8',
            REGEX_CACHE_SIZE: 100,
            FILTER_STATE_KEYS: { language: 'filterMatchLanguage', resolution: 'filterMatchResolution', keyword: 'hideByKeyword', source: 'hideSourceCode' },
            texts: {
                filterButton: { zh: '筛选', en: 'Filter' }, expandButton: { zh: '展开 ▾', en: 'Expand ▾' },
                collapseButton: { zh: '收起 ▴', en: 'Collapse ▴' }, settingsPanelTitle: { zh: '脚本设置 - GitHub Releases 优化', en: 'Settings - GitHub Releases Enhancer' },
                settingsSaveButton: { zh: '保存设置', en: 'Save Settings' }, settingsCancelButton: { zh: '取消', en: 'Cancel' },
                settingsMaxHeightLabel: { zh: '发布说明默认最大高度 (px):', en: 'Release Notes Default Max Height (px):' },
                settingsHiddenRuleLabel: { zh: "自定义隐藏关键字 (.开头为后缀, 否则为关键词, 词组需加''):", en: "Custom Hidden Keywords (. for suffix, keyword otherwise, use '' for phrases):" },
                settingsHiddenRulePlaceholder: { zh: "例如: .sig, debug, 'source code'", en: "e.g.: .sig, debug, 'source code'" },
                settingsClickOutsideLabel: { zh: '点击页面空白处收起发布说明', en: 'Click outside to collapse release notes' },
                platformFilterTitle: { zh: "平台筛选", en: "Platform Filters" },
                supplementaryFilterTitle: { zh: "补充筛选", en: "Supplementary Filters" }, selectAllLabel: { zh: '全选', en: 'Select All' },
                deselectAllLabel: { zh: '清空', en: 'Clear' }, restoreLabel: { zh: '恢复', en: 'Restore' },
                hiddenAssetCountTitle: { zh: "隐藏的资产数量", en: "Number of hidden assets" },
                activeFilterCountTitle: { zh: '已激活筛选规则数量', en: 'Number of active filters' },
                keywordLabel: { zh: '关键字', en: 'Keywords' },
                archLabel: { zh: '架构', en: 'Architecture' }, allArchLabel: { zh: '所有', en: 'all' },
                langLabel: { zh: '语言', en: 'Language' }, resLabel: { zh: '分辨率', en: 'Resolution' },
                sourceCodeLabel: { zh: '源码', en: 'Source Code' },
                settingsMenuName: { zh: 'GitHub Releases 优化设置', en: 'GitHub Releases Enhancer Settings' },
                filterModeLabel: { zh: '默认筛选模式', en: 'Default Filter Mode' },
                intelligentFilterLabel: { zh: '智能筛选', en: 'Intelligent Filter' },
                preferredFilterLabel: { zh: '偏好筛选', en: 'Preferred Filter' },
                savePrefsButton: { zh: '保存当前筛选为偏好', en: 'Save current filters as preference' },
                prefsSavedAlert: { zh: '偏好已保存！', en: 'Preferences saved!' },
                settingsResetButton: { zh: '重置设置', en: 'Reset Settings' },
                resetConfirmationTitle: { zh: '确认重置', en: 'Confirm Reset' },
                resetConfirmationMessage: { zh: '您确定要将所有设置恢复为默认值吗？此操作不可撤销，并将清空您保存的偏好筛选。', en: 'Are you sure you want to reset all settings to their default values? This action cannot be undone and will clear your saved filter preferences.' },
                resetConfirmButton: { zh: '确认重置', en: 'Confirm Reset' },
            },
            PLATFORMS: [
                { id: 'windows', name: 'Windows', exclusiveFormats: ['.exe', '.msi', '.msix'] }, { id: 'macos', name: 'MacOS', exclusiveFormats: ['.dmg', '.pkg'] },
                { id: 'linux', name: 'Linux', exclusiveFormats: ['.deb', '.rpm', '.appimage'] }, { id: 'android', name: 'Android', exclusiveFormats: ['.apk', '.aab'] },
                { id: 'ios', name: 'iOS', exclusiveFormats: ['.ipa'] }, { id: 'other_os', name: '未匹配', exclusiveFormats: [] }
            ],
            ARCH_TAGS_CONFIG: [
                { id: 'x64', name: 'x64' },
                { id: 'x86', name: 'x86' },
                { id: 'arm64', name: 'ARM64' },
                { id: 'arm', name: 'ARM' },
                { id: 'oth', name: 'OTH' }
            ],
            SOURCE_CODE_KEYWORDS: ['source code (zip)', 'source code (tar.gz)'],
            HIDDEN_KEYWORDS_DEFAULT: [
                '.blockmap', '.rmp', '.sig', '.asc', '.sha256', '.md5', 'sha1', 'sha512',
                '.pdb', '.sym', '.debug', '.map', '.symbols', '.dSYM'
            ],
            AGNOSTIC_CONTAINERS: ['.zip', '.7z', '.tar.gz', '.rar', '.tar', '.gz', '.bz2', '.xz', '.tar.xz', '.tar.bz2', '.tar.lz', '.pkg.zst', '.app.tar', '.flatpak'],
            LANGUAGES: {
                'zh-hans': { name: '简体中文', keywords: ['zh-cn', 'zh-hans', 'chinese simplified', 'chs', '简体', '简中'] },
                'zh-hant': { name: '繁體中文', keywords: ['zh-tw', 'zh-hk', 'zh-hant', 'chinese traditional', 'cht', '繁體', '正體', '繁中'] },
                'en': { name: 'English', keywords: ['en', 'english', 'eng'] }, 'fr': { name: 'Français', keywords: ['fr', 'french', 'français', 'fra'] },
                'de': { name: 'Deutsch', keywords: ['de', 'german', 'deutsch', 'ger', 'deu'] }, 'ru': { name: 'Русский', keywords: ['ru', 'russian', 'русский', 'rus'] },
                'ja': { name: '日本語', keywords: ['ja', 'japanese', '日本語', 'jpn', 'nihongo'] }, 'ko': { name: '한국어', keywords: ['ko', 'korean', '한국어', 'kor', 'hanguk'] },
                'it': { name: 'Italiano', keywords: ['it', 'italian', 'italiano', 'ita'] }, 'es': { name: 'Español', keywords: ['es', 'spanish', 'español', 'spa'] },
                'pt': { name: 'Português', keywords: ['pt', 'portuguese', 'português', 'por'] }, 'ar': { name: 'العربية', keywords: ['ar', 'arabic', 'العربية', 'ara'] }
            },
            RESOLUTIONS: {
                'hd': { name: 'HD', keywords: ['hd', '720p', '1080p', '1280x720', '1920x1080', 'fhd', '2k', '1440p', 'qhd', '4k', '2160p', 'uhd'] },
                'sd': { name: '常规', keywords: ['sd', '480p', '360p', 'standard definition'] }
            },
            CLASS_NAMES: {
                MARKDOWN_BODY: 'markdown-body', RELEASE_NOTES_PANEL: 'my-3', TOGGLE_BUTTON: 'toggle-button', EXPANDED: 'expanded', FILTER_CONTAINER: 'ghre-filter-interaction-wrapper',
                FILTER_BUTTON: 'ghre-filter-button', PLATFORM_OPTIONS: 'ghre-platform-options', PLATFORM_OPTIONS_INNER: 'ghre-platform-options-inner',
                PLATFORM_OPTIONS_GRID: 'ghre-options-grid', PLATFORM_OPTIONS_OPEN: 'ghre-dropdown-open', PLATFORM_OPTION: 'ghre-platform-option',
                ARCH_TAG_CONTAINER: 'ghre-arch-tag-container', ARCH_TAG: 'ghre-arch-tag',
                KEYWORD_TOGGLE_OPTION: 'ghre-keyword-toggle-option', OPTIONS_SEPARATOR: 'ghre-options-separator', OPTIONS_TITLE: 'ghre-options-title', SELECTED: 'selected',
                HIDDEN_ASSET: 'hidden-asset', HIDDEN_ASSET_COUNTER: 'ghre-hidden-asset-counter', SUMMARY_MARKER_ICON: 'ghre-summary-marker-icon',
                AVAILABILITY_DOT: 'ghre-availability-dot', ACTION_BUTTON: 'ghre-action-button', SETTINGS_PANEL: 'ghre-settings-panel',
                SETTINGS_OVERLAY: 'ghre-settings-overlay', SETTINGS_TITLE: 'ghre-settings-title', SETTINGS_FORM_GROUP: 'ghre-form-group',
                SETTINGS_LABEL: 'ghre-settings-label', SETTINGS_INPUT: 'ghre-settings-input', SETTINGS_TEXTAREA: 'ghre-settings-textarea',
                SETTINGS_ACTIONS: 'ghre-settings-actions', SETTINGS_BUTTON: 'ghre-settings-button',
                ASSET_LIST_LOADING: 'ghre-assets-loading', POPUP_HEADER: 'ghre-popup-header',
                POPUP_SETTINGS_BTN: 'ghre-popup-settings-btn',
                RESET_CONFIRM_DIALOG: 'ghre-reset-confirm-dialog',
            },
            SELECTORS: {
                ASSET_ROW: '.Box-row, li.Box-row, .release-asset', ASSET_LIST_CONTAINER: '.Box--condensed ul, .release-assets',
                MAIN_CONTENT: 'main#main-content, main', ASSETS_SUMMARY: 'summary[data-target="details-toggle.summaryTarget"]',
                ASSET_DOWNLOAD_LINK: 'a[href*="/download/"]',
                MAIN_REPO_CONTENT: 'main .repository-content', FILTER_COUNTER: '[data-ghre-filter-counter="true"]',
                HIDDEN_ASSET_COUNTER: '.ghre-hidden-asset-counter', MAIN_ASSET_COUNTER: 'span.Counter:not(.ghre-hidden-asset-counter):not([data-ghre-filter-counter="true"])',
                SETTINGS_MAX_HEIGHT_INPUT: '#ghreMaxHeightInput', SETTINGS_HIDDEN_RULES_TEXTAREA: '#ghreHiddenRulesTextarea',
                SETTINGS_CLICK_OUTSIDE_CHECKBOX: '#ghreClickOutsideCheckbox',
                SETTINGS_SAVE_BUTTON: 'button[data-action="save"]', SETTINGS_CANCEL_BUTTON: 'button[data-action="cancel"]',
                SETTINGS_RESET_BUTTON: 'button[data-action="reset"]',
                FIRST_FOCUSABLE_OPTION: '[role="menuitemcheckbox"]',
            },
        };



export { releaseConfig };
